"""Handler for Databricks model serving endpoints."""

import json
import logging
import os
from typing import Any, AsyncGenerator, Dict, List, Tuple

import httpx
import mlflow
import requests
from dotenv import load_dotenv

from .base import BaseDeploymentHandler
from ..table_parser import extract_table_from_markdown

load_dotenv(dotenv_path='.env.local')

logger = logging.getLogger(__name__)


def get_databricks_credentials() -> Tuple[str, str]:
  """Get Databricks host and authentication token.

  Tries WorkspaceClient first (handles OAuth in production),
  falls back to environment variables for local development.

  Returns:
    Tuple of (host, token)
  """
  try:
    # Try using Databricks SDK (works in production with OAuth and local with PAT)
    from databricks.sdk import WorkspaceClient

    w = WorkspaceClient()
    host = w.config.host
    token = w.config.token

    # In OAuth scenarios, token might not be directly available
    if not token:
      auth = w.config.authenticate()
      token = auth.get('access_token', '')

    if not host or not token:
      raise ValueError('WorkspaceClient did not provide host or token')

    # Ensure host has https:// prefix
    if not host.startswith('https://'):
      host = f'https://{host}'

    logger.info(f'Using Databricks credentials from WorkspaceClient: {host}')
    return host, token

  except Exception as e:
    # Fallback to environment variables for local development
    logger.info(f'WorkspaceClient failed ({e}), falling back to environment variables')

    host = os.getenv('DATABRICKS_HOST', '')
    token = os.getenv('DATABRICKS_TOKEN', '')

    if not host or not token:
      raise ValueError(
        'Unable to get Databricks credentials. '
        'Set DATABRICKS_HOST and DATABRICKS_TOKEN in .env.local, '
        'or ensure WorkspaceClient can authenticate.'
      )

    # Ensure host has https:// prefix
    if not host.startswith('https://'):
      host = f'https://{host}'

    logger.info(f'Using Databricks credentials from environment: {host}')
    return host, token


class DatabricksEndpointHandler(BaseDeploymentHandler):
  """Handler for Databricks model serving endpoints.

  Handles both streaming and non-streaming invocations of Databricks
  serving endpoints using the Agent API format.
  """

  def __init__(self, agent_config: Dict[str, Any]):
    """Initialize handler with agent configuration.

    Args:
      agent_config: Agent config containing 'endpoint_name'
    """
    super().__init__(agent_config)
    self.endpoint_name = agent_config.get('endpoint_name')

    if not self.endpoint_name:
      raise ValueError(
        f"Agent {agent_config.get('id')} has no endpoint_name configured"
      )

  async def invoke_stream(
    self, messages: List[Dict[str, str]]
  ) -> AsyncGenerator[str, None]:
    """Stream response from Databricks serving endpoint.

    Args:
      messages: List of messages with 'role' and 'content' keys

    Yields:
      Server-Sent Events (SSE) formatted strings with JSON data
    """

    # Get Databricks credentials
    host, token = get_databricks_credentials()

    # Build request payload (Databricks Agent API format with streaming enabled)
    payload = {
      'input': messages,
      'stream': True  # CRITICAL: Tell Databricks to stream the response
    }
    url = f'{host}/serving-endpoints/{self.endpoint_name}/invocations'
    headers = {
      'Authorization': f'Bearer {token}',
      'Content-Type': 'application/json',
    }

    logger.info(f'Calling Databricks endpoint (streaming): {self.endpoint_name}')

    # Use async httpx client for proper async streaming
    async with httpx.AsyncClient(timeout=300.0) as client:
      async with client.stream('POST', url, json=payload, headers=headers) as response:
        response.raise_for_status()

        # Stream response chunks line by line
        async for line in response.aiter_lines():
          if not line:
            continue

          # Skip empty lines
          if not line.strip():
            continue

          # Handle [DONE] marker
          if line.strip() == 'data: [DONE]' or line.strip() == '[DONE]':
            yield 'data: [DONE]\n\n'
            continue

          # Extract JSON from SSE format
          json_str = line.strip()
          if json_str.startswith('data: '):
            json_str = json_str[6:].strip()
          elif json_str.startswith('data:'):
            json_str = json_str[5:].strip()

          if not json_str:
            continue

          try:
            # Parse the JSON event to validate it
            event = json.loads(json_str)

            # Extract trace ID if available for logging
            if event.get('id'):
              logger.debug(f'Trace ID in stream: {event["id"]}')

            # Forward the event to the client
            yield f'data: {json_str}\n\n'

          except json.JSONDecodeError as e:
            logger.warning(f'Failed to parse JSON from stream: {e}, line: {json_str[:200]}')
            continue

  def invoke(self, messages: List[Dict[str, str]]) -> Dict[str, Any]:
    """Non-streaming invocation of Databricks serving endpoint.

    Args:
      messages: List of messages with 'role' and 'content' keys

    Returns:
      OpenAI-compatible response format with choices, message, content
    """

    # Get Databricks credentials
    host, token = get_databricks_credentials()

    # Build request payload (Databricks Agent API format)
    payload = {'input': messages}
    url = f'{host}/serving-endpoints/{self.endpoint_name}/invocations'
    headers = {
      'Authorization': f'Bearer {token}',
      'Content-Type': 'application/json',
    }

    logger.info(f'Calling Databricks endpoint: {self.endpoint_name}')

    # Make request to Databricks
    response = requests.post(url, json=payload, headers=headers)
    response.raise_for_status()
    result = response.json()

    logger.info(f'Raw response from {self.endpoint_name}: {result}')

    # Extract text from nested response structure
    # Response format: {'output': [{'content': [{'text': '...', 'type': 'output_text'}]}]}
    try:
      text_content = result.get('output', [{}])[0].get('content', [{}])[0].get('text', '')
      # Fallback to older format if needed
      if not text_content:
        text_content = result.get('predictions', [{}])[0].get('candidates', [{}])[0].get('text', str(result))
    except (IndexError, KeyError, TypeError, AttributeError):
      # Last resort: stringify the whole result
      text_content = str(result)

    # Extract structured data from markdown tables
    structured_data = extract_table_from_markdown(text_content)

    # Build response message
    message_content = {
      'role': 'assistant',
      'content': text_content,
    }

    # Add structured data if table was found
    if structured_data:
      message_content['structured_data'] = structured_data
      logger.info(
        f'✅ Extracted table with {len(structured_data["rows"])} rows, '
        f'chart type: {structured_data["chart_config"]["type"]}'
      )
    else:
      logger.info('No table found in response')

    # Format as OpenAI-compatible response for frontend
    formatted_response = {
      'choices': [
        {
          'message': message_content,
          'index': 0,
          'finish_reason': 'stop',
        }
      ],
      'usage': {},
      'model': self.endpoint_name,
      'object': 'chat.completion',
    }

    return formatted_response
