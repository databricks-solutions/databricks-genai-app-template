"""Agent invocation and feedback endpoints."""

import json
import logging
import uuid
from datetime import datetime
from typing import Any, AsyncGenerator, Dict, List, Optional, Union

import mlflow
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from ..agents.handlers import DatabricksEndpointHandler
from ..auth.user_service import get_current_user
from ..chat_storage import Message, storage
from ..config_loader import config_loader

logger = logging.getLogger(__name__)
router = APIRouter()


class LogAssessmentRequest(BaseModel):
  """Request to log user feedback for a trace."""

  trace_id: str
  agent_id: str
  assessment_name: str
  assessment_value: Union[str, int, float, bool]
  rationale: Optional[str] = None
  source_id: Optional[str] = 'anonymous'


class InvokeEndpointRequest(BaseModel):
  """Request to invoke an agent endpoint."""

  agent_id: str
  messages: list[dict[str, str]]
  chat_id: Optional[str] = None  # Optional - will create new chat if not provided


@router.post('/log_assessment')
async def log_feedback(options: LogAssessmentRequest):
  """Log user feedback (thumbs up/down) for an agent trace."""
  logger.info(
    f'📝 User feedback - trace_id: {options.trace_id}, '
    f'Assessment: {options.assessment_name}={options.assessment_value}'
  )

  try:
    agent = config_loader.get_agent_by_id(options.agent_id)
    if not agent:
      raise HTTPException(status_code=404, detail=f'Agent {options.agent_id} not found')

    experiment_id = agent.get('mlflow_experiment_id')
    if not experiment_id:
      raise HTTPException(
        status_code=400,
        detail=f'Agent {options.agent_id} has no mlflow_experiment_id configured',
      )

    mlflow.log_feedback(
      trace_id=options.trace_id,
      name=options.assessment_name,
      value=options.assessment_value,
      source=mlflow.entities.AssessmentSource(
        source_type=mlflow.entities.AssessmentSourceType.HUMAN,
        source_id=options.source_id,
      ),
      rationale=options.rationale,
    )

    logger.info(f'✅ Feedback logged successfully to trace {options.trace_id}')
    return {'status': 'success', 'trace_id': options.trace_id}

  except HTTPException:
    raise
  except Exception as e:
    logger.error(f'❌ Failed to log feedback: {str(e)}')
    raise HTTPException(status_code=500, detail=f'Failed to log feedback: {str(e)}')


@router.post('/invoke_endpoint')
async def invoke_endpoint(request: Request, options: InvokeEndpointRequest):
  """Invoke an agent endpoint with streaming response.

  Handles chat creation and message storage automatically:
  - If chat_id is None, creates a new chat
  - Collects all streaming events (function calls, outputs, trace data)
  - Saves user message and assistant response to chat storage after stream completes
  - Sends chat_id as first SSE event so frontend knows which chat to fetch
  """
  logger.info(f'🎯 Invoking agent: {options.agent_id}, chat_id: {options.chat_id}')

  # Get current user for storage
  user_email = await get_current_user(request)
  user_storage = storage.get_storage_for_user(user_email)

  agent = config_loader.get_agent_by_id(options.agent_id)

  if not agent:
    logger.error(f'Agent not found: {options.agent_id}')
    return {
      'error': f'Agent not found: {options.agent_id}',
      'message': 'Please check your agent configuration',
    }

  endpoint_name = agent.get('endpoint_name')
  if not endpoint_name:
    logger.error(f'Agent {options.agent_id} has no endpoint_name configured')
    return {
      'error': 'No endpoint configured',
      'message': f'Agent {options.agent_id} has no endpoint_name',
    }

  # Create or get chat
  chat_id = options.chat_id
  if not chat_id:
    # Extract title from first user message
    user_content = options.messages[-1].get('content', '') if options.messages else ''
    title = user_content[:50] + ('...' if len(user_content) > 50 else '')
    title = title if user_content else 'New Chat'
    chat = user_storage.create(title=title, agent_id=options.agent_id)
    chat_id = chat.id
    logger.info(f'✅ Created new chat: {chat_id} for user: {user_email}')
  else:
    # Verify chat exists
    chat = user_storage.get(chat_id)
    if not chat:
      logger.error(f'Chat not found: {chat_id}')
      return {'error': f'Chat not found: {chat_id}'}

  try:
    handler = DatabricksEndpointHandler(agent)

    # Create wrapper that collects data and saves to storage
    async def stream_and_store() -> AsyncGenerator[str, None]:
      """Wrap the handler stream to collect data and save messages after completion."""
      # First, emit the chat_id so frontend knows which chat this belongs to
      yield f'data: {json.dumps({"type": "chat.created", "chat_id": chat_id})}\n\n'

      # Collect streaming data
      final_text = ''
      function_calls: List[Dict[str, Any]] = []
      trace_id: Optional[str] = None
      databricks_output: Optional[Dict[str, Any]] = None

      try:
        stream = handler.predict_stream(
          messages=options.messages, endpoint_name=endpoint_name
        )
        async for chunk in stream:
          # Forward the chunk to frontend
          yield chunk

          # Parse the chunk to collect data (skip non-data lines)
          if not chunk.startswith('data: '):
            continue

          data_str = chunk[6:].strip()
          if not data_str or data_str == '[DONE]':
            continue

          try:
            event = json.loads(data_str)
            event_type = event.get('type', '')

            # Only process response.output_item.done events
            if event_type == 'response.output_item.done':
              item = event.get('item', {})
              item_type = item.get('type', '')

              # Extract final text from message item
              if item_type == 'message':
                content_list = item.get('content', [])
                for content_item in content_list:
                  if content_item.get('type') == 'output_text':
                    final_text = content_item.get('text', '')
                    break

              # Collect function calls
              elif item_type == 'function_call':
                function_calls.append({
                  'call_id': item.get('call_id', ''),
                  'name': item.get('name', ''),
                  'arguments': _parse_json_field(item.get('arguments', {})),
                })

              elif item_type == 'function_call_output':
                # Find matching function call and add output
                call_id = item.get('call_id', '')
                for fc in function_calls:
                  if fc['call_id'] == call_id:
                    fc['output'] = _parse_json_field(item.get('output', {}))
                    break

              # Extract trace_id from databricks_output (present in final message)
              db_output = item.get('databricks_output', {})
              if db_output:
                databricks_output = db_output
                trace_info = db_output.get('trace', {}).get('info', {})
                if trace_info.get('trace_id'):
                  trace_id = trace_info['trace_id']
                  logger.info(f'📋 Extracted trace_id: {trace_id}')

          except json.JSONDecodeError:
            # Skip non-JSON lines
            pass

      except Exception as e:
        logger.error(f'Error during streaming: {e}')
        yield f'data: {json.dumps({"type": "error", "error": str(e)})}\n\n'

      # After stream completes, save messages to storage
      try:
        # Save user message (the last one in the input)
        if options.messages:
          last_user_msg = options.messages[-1]
          user_message = Message(
            id=f'msg_{uuid.uuid4().hex[:12]}',
            role=last_user_msg.get('role', 'user'),
            content=last_user_msg.get('content', ''),
            timestamp=datetime.now(),
          )
          user_storage.add_message(chat_id, user_message)

        # Build trace summary matching frontend TraceSummary type
        trace_summary = None
        if function_calls or trace_id:
          # Convert function_calls to tools_called format expected by frontend
          tools_called = [
            {
              'name': fc.get('name', ''),
              'duration_ms': 0,  # Not available from stream
              'inputs': fc.get('arguments'),
              'outputs': fc.get('output'),
              'status': 'OK' if fc.get('output') else 'UNKNOWN',
            }
            for fc in function_calls
          ]
          trace_summary = {
            'trace_id': trace_id,
            'duration_ms': 0,
            'status': 'OK',
            'tools_called': tools_called,
            'retrieval_calls': [],
            'llm_calls': [],
            'total_tokens': 0,
            'spans_count': len(function_calls),
            'function_calls': function_calls,  # Keep original for TraceModal
            'databricks_output': databricks_output,
          }

        # Save assistant message with trace data
        if final_text or function_calls:
          assistant_message = Message(
            id=f'msg_{uuid.uuid4().hex[:12]}',
            role='assistant',
            content=final_text,
            timestamp=datetime.now(),
            trace_id=trace_id,
            trace_summary=trace_summary,
          )
          user_storage.add_message(chat_id, assistant_message)

        logger.info(
          f'💾 Saved messages to chat {chat_id}: '
          f'text={len(final_text)} chars, '
          f'tools={len(function_calls)}, '
          f'trace_id={trace_id}'
        )

      except Exception as e:
        logger.error(f'Failed to save messages to storage: {e}')

    return StreamingResponse(
      stream_and_store(),
      media_type='text/event-stream',
      headers={
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    )

  except Exception as e:
    logger.error(f'❌ Error invoking agent {options.agent_id}: {str(e)}')
    raise


def _parse_json_field(value: Any) -> Any:
  """Parse a field that might be a JSON string or already an object."""
  if isinstance(value, str):
    trimmed = value.strip()
    if trimmed.startswith('{') or trimmed.startswith('['):
      try:
        return json.loads(value)
      except json.JSONDecodeError:
        pass
  return value
