"""Calls Databricks model serving endpoints."""

import logging
import os
from typing import Any, Dict, List, Tuple

import mlflow
import requests
from dotenv import load_dotenv

from .table_parser import extract_table_from_markdown

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


@mlflow.trace(span_type='LLM')
def model_serving_endpoint(
  endpoint_name: str,
  messages: List[Dict[str, str]],
  endpoint_type: str = 'databricks-agent',
) -> Dict[str, Any]:
  """Calls a Databricks model serving endpoint.

  Currently only supports 'databricks-agent' type endpoints.

  Args:
    endpoint_name: Name of the Databricks serving endpoint
    messages: List of messages with 'role' and 'content' keys
    endpoint_type: Type of endpoint (only 'databricks-agent' supported)

  Returns:
    OpenAI-compatible response format with choices, message, content
  """
  if endpoint_type != 'databricks-agent':
    raise ValueError(f"Only 'databricks-agent' endpoint type is supported, got: {endpoint_type}")

  # Create request preview for MLflow tracing
  user_messages = [msg for msg in messages if msg.get('role') == 'user']
  if user_messages:
    request_preview = user_messages[-1].get('content', 'No user message')
  else:
    request_preview = 'No user message'

  # Get Databricks credentials
  host, token = get_databricks_credentials()

  # Build request payload (Databricks Agent API format)
  payload = {'input': messages}
  url = f'{host}/serving-endpoints/{endpoint_name}/invocations'
  headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json',
  }

  logger.info(f'Calling Databricks endpoint: {endpoint_name}')

  # Make request to Databricks
  response = requests.post(url, json=payload, headers=headers)
  response.raise_for_status()
  result = response.json()

  logger.info(f'Raw response from {endpoint_name}: {result}')

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
    'model': endpoint_name,
    'object': 'chat.completion',
  }

  # Update MLflow trace with request/response previews
  try:
    response_preview = formatted_response['choices'][0]['message']['content']
    mlflow.update_current_trace(request_preview=request_preview, response_preview=response_preview)
  except Exception as e:
    logger.warning(f'Could not update trace previews: {e}')

  return formatted_response
