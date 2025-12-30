"""Handler for Databricks model serving endpoints.

Uses the MLflow deployments client to call endpoints with return_trace=True
to get full trace data from Databricks.

Supports two endpoint formats:
1. Agent format: {"input": messages} - for MAS and Agent Framework endpoints
2. Chat completion format: {"messages": [...]} - for foundation model endpoints

The format is auto-detected on first call and cached per endpoint.
Chat completion responses are converted to agent format for unified frontend handling.
"""

import asyncio
import json
import logging
from typing import Any, AsyncGenerator, Dict, List, Optional

from mlflow.deployments import get_deploy_client

from .base import BaseDeploymentHandler

logger = logging.getLogger(__name__)

# Cache endpoint format: endpoint_name -> "agent" | "chat_completion"
_endpoint_format_cache: Dict[str, str] = {}


# =============================================================================
# Response Format Converters
# =============================================================================


def fix_mojibake(text: str) -> str:
  """Fix UTF-8 content that was incorrectly decoded as Latin-1.

  Some endpoints return UTF-8 bytes interpreted as Latin-1 characters.
  Example: "â€"" (3 Latin-1 chars) should be "—" (em dash in UTF-8).

  Handles mixed content (mojibake + emojis) by fixing only the broken parts.
  """
  if not text:
    return text

  # Try the simple approach first (works if no high Unicode chars like emojis)
  try:
    return text.encode('latin-1').decode('utf-8')
  except (UnicodeDecodeError, UnicodeEncodeError):
    pass

  # Fallback: fix mojibake patterns while preserving high Unicode chars (emojis etc)
  # Mojibake chars are in the 0x80-0xFF range (Latin-1 extended)
  import re

  def fix_segment(match: re.Match) -> str:
    segment = match.group(0)
    try:
      return segment.encode('latin-1').decode('utf-8')
    except (UnicodeDecodeError, UnicodeEncodeError):
      return segment

  # Match sequences of chars in Latin-1 extended range (likely mojibake)
  return re.sub(r'[\u0080-\u00ff]+', fix_segment, text)


def convert_chat_completion_chunk(chunk: Dict[str, Any]) -> Optional[Dict[str, Any]]:
  """Convert OpenAI chat completion chunk to agent format.

  OpenAI format:
    {"id": "...", "object": "chat.completion.chunk",
     "choices": [{"delta": {"content": "text"}, "finish_reason": null}]}

  Gemini format (content is a list):
    {"choices": [{"delta": {"content": [{"type": "text", "text": "..."}]}}]}

  Agent format:
    {"type": "response.output_text.delta", "delta": "text"}

  Returns None if chunk should be skipped (no content).
  """
  # Skip non-chunk objects (e.g., final usage stats)
  if chunk.get('object') != 'chat.completion.chunk':
    return None

  choices = chunk.get('choices', [])
  if not choices:
    return None

  delta = choices[0].get('delta', {})
  content = delta.get('content')

  # Skip empty content (role-only chunks, finish chunks)
  if not content:
    return None

  # Handle different content formats
  if isinstance(content, list):
    # Gemini format: [{"type": "text", "text": "..."}]
    text_parts = []
    for item in content:
      if isinstance(item, dict) and item.get('type') == 'text':
        text_parts.append(item.get('text', ''))
      elif isinstance(item, str):
        text_parts.append(item)
    content = ''.join(text_parts)

  if not content:
    return None

  return {
    'type': 'response.output_text.delta',
    'delta': fix_mojibake(content),
  }


def format_chunk_for_sse(chunk: Dict[str, Any], endpoint_format: str) -> Optional[str]:
  """Format a chunk for SSE output, converting if needed.

  Args:
    chunk: Raw chunk from endpoint
    endpoint_format: "agent" or "chat_completion"

  Returns:
    SSE-formatted string or None if chunk should be skipped
  """
  if endpoint_format == 'chat_completion':
    converted = convert_chat_completion_chunk(chunk)
    if converted is None:
      return None
    return f'data: {json.dumps(converted)}\n\n'
  else:
    # Agent format: passthrough
    return f'data: {json.dumps(chunk)}\n\n'


# =============================================================================
# Handler
# =============================================================================


class DatabricksEndpointHandler(BaseDeploymentHandler):
  """Handler for Databricks model serving endpoints.

  Uses MLflow deployments client with return_trace=True for full trace support.
  """

  def __init__(self, agent_config: Dict[str, Any]):
    """Initialize handler with agent configuration."""
    super().__init__(agent_config)
    self.endpoint_name = agent_config.get('endpoint_name')

    if not self.endpoint_name:
      raise ValueError(f'Agent {agent_config.get("id")} has no endpoint_name configured')

  def _build_agent_inputs(self, messages: List[Dict[str, str]]) -> Dict[str, Any]:
    """Build payload for agent endpoints (MAS, Agent Framework)."""
    return {
      'input': messages,
      'databricks_options': {
        'return_trace': True,
      },
    }

  def _build_chat_completion_inputs(self, messages: List[Dict[str, str]]) -> Dict[str, Any]:
    """Build payload for chat completion endpoints (foundation models)."""
    return {
      'messages': messages,
      'stream': True,
    }

  def _get_inputs(self, messages: List[Dict[str, str]], endpoint_name: str) -> Dict[str, Any]:
    """Get the appropriate input payload based on cached endpoint format."""
    if _endpoint_format_cache.get(endpoint_name) == 'chat_completion':
      return self._build_chat_completion_inputs(messages)
    return self._build_agent_inputs(messages)

  async def predict_stream(
    self, messages: List[Dict[str, str]], endpoint_name: str
  ) -> AsyncGenerator[str, None]:
    """Stream response from Databricks endpoint.

    Auto-detects endpoint format on first call:
    - Tries agent format first
    - Falls back to chat_completion if agent format fails
    - Caches the result for subsequent calls

    Chat completion responses are converted to agent format for unified handling.
    """
    logger.debug(f'Calling endpoint: {endpoint_name}')

    client = get_deploy_client('databricks')
    queue: asyncio.Queue = asyncio.Queue()
    loop = asyncio.get_event_loop()

    def stream_with_format(inputs: Dict[str, Any], fmt: str):
      """Stream chunks from endpoint and put them in queue."""
      response = client.predict_stream(endpoint=endpoint_name, inputs=inputs)
      for chunk in response:
        logger.debug(f'Chunk ({fmt}): {chunk}')
        loop.call_soon_threadsafe(queue.put_nowait, ('chunk', chunk, fmt))
      loop.call_soon_threadsafe(queue.put_nowait, ('done', None, fmt))

    def consume_sync_generator():
      """Try agent format first, fall back to chat_completion if needed."""
      cached_format = _endpoint_format_cache.get(endpoint_name)

      # If format is known, use it directly
      if cached_format:
        inputs = self._get_inputs(messages, endpoint_name)
        try:
          stream_with_format(inputs, cached_format)
        except Exception as e:
          logger.error(f'Error calling {endpoint_name}: {e}')
          loop.call_soon_threadsafe(queue.put_nowait, ('error', str(e), cached_format))
        return

      # Format unknown: try agent format first
      try:
        inputs = self._build_agent_inputs(messages)
        stream_with_format(inputs, 'agent')
        _endpoint_format_cache[endpoint_name] = 'agent'
        logger.info(f'Cached endpoint format for {endpoint_name}: agent')
      except Exception as e:
        error_str = str(e)

        # Check if this is a format mismatch error (multiple error formats exist)
        needs_chat_format = (
          "Missing required Chat parameter: 'messages'" in error_str
          or "Model is missing inputs ['messages']" in error_str
          or ("extra inputs: ['input']" in error_str and 'messages' in error_str)
        )
        if needs_chat_format:
          logger.info(f'Endpoint {endpoint_name} requires chat_completion format, retrying...')

          try:
            inputs = self._build_chat_completion_inputs(messages)
            stream_with_format(inputs, 'chat_completion')
            _endpoint_format_cache[endpoint_name] = 'chat_completion'
            logger.info(f'Cached endpoint format for {endpoint_name}: chat_completion')
          except Exception as retry_e:
            logger.error(f'Retry failed for {endpoint_name}: {retry_e}')
            loop.call_soon_threadsafe(queue.put_nowait, ('error', str(retry_e), 'chat_completion'))
        else:
          logger.error(f'Error calling {endpoint_name}: {e}')
          loop.call_soon_threadsafe(queue.put_nowait, ('error', error_str, 'agent'))

    # Start streaming in thread pool
    loop.run_in_executor(None, consume_sync_generator)

    # Yield formatted chunks
    try:
      while True:
        msg_type, data, fmt = await queue.get()

        if msg_type == 'chunk':
          formatted = format_chunk_for_sse(data, fmt)
          if formatted:
            yield formatted

        elif msg_type == 'error':
          yield f'data: {json.dumps({"type": "error", "error": data})}\n\n'
          yield 'data: [DONE]\n\n'
          break

        elif msg_type == 'done':
          yield 'data: [DONE]\n\n'
          break

    except Exception as e:
      logger.error(f'Error in async stream: {e}')
      yield f'data: {json.dumps({"type": "error", "error": str(e)})}\n\n'
      yield 'data: [DONE]\n\n'
