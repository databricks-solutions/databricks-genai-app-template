"""FastAPI app for the Databricks Apps + Agents demo."""

import argparse
import logging
import os
from pathlib import Path
from typing import Any, Optional, Union

import httpx
import mlflow
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles
from mlflow import MlflowClient
from pydantic import BaseModel
from starlette.middleware.cors import CORSMiddleware
from starlette.requests import Request

from .agents.databricks_assistant import databricks_agent
from .agents.model_serving import model_serving_endpoint
from .brand_service import brand_service
from .chat_storage import storage, Chat, Message
from .tracing import (
  get_mlflow_experiment_id,
  setup_mlflow_tracing,
)

# Configure logging for Databricks Apps monitoring
# Logs written to stdout/stderr will be available in Databricks Apps UI and /logz endpoint
logging.basicConfig(
  level=logging.INFO,
  format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
  handlers=[
    logging.StreamHandler(),  # This ensures logs go to stdout for Databricks Apps monitoring
  ],
)

logger = logging.getLogger(__name__)

# Load .env.local if it exists, otherwise fall back to environment variables
# This allows running with either a local config file or system environment
env_file = Path('.env.local')
if env_file.exists():
  load_dotenv(dotenv_path='.env.local')
  logger.info('Loaded configuration from .env.local')
else:
  # Try loading from .env as fallback
  if Path('.env').exists():
    load_dotenv(dotenv_path='.env')
    logger.info('Loaded configuration from .env')
  else:
    logger.info('No .env file found, using environment variables')

app = FastAPI()

# Enable CORS for frontend to access backend APIs
app.add_middleware(
  CORSMiddleware,
  allow_origins=['*'],  # Change this to specific origins in production
  allow_credentials=True,
  allow_methods=['*'],
  allow_headers=['*'],
)

# We're in dev mode when the server has the reload bit.
IS_DEV = os.getenv('IS_DEV', 'false').lower() == 'true'
# Parse arguments at startup
parser = argparse.ArgumentParser()
# bool
parser.add_argument('--reload', action='store_true')
args, _ = parser.parse_known_args()  # Ignore unknown args
IS_DEV = args.reload


PORT = int(os.getenv('UVICORN_PORT', 8000))
HOST = os.getenv('UVICORN_HOST', '0.0.0.0')

API_PREFIX = '/api'


class ExperimentInfo(BaseModel):
  """Experiment info."""

  experiment_id: Optional[str]
  link: Optional[str]


# Experiment info to link to the MLFlow experiment where traces are logged.
@app.get(f'{API_PREFIX}/tracing_experiment')
async def experiment():
  """Get the MLFlow experiment info."""
  host = os.getenv('DATABRICKS_HOST', '')

  # In production, we might not have DATABRICKS_HOST, so get it from SDK
  if not host:
    try:
      from databricks.sdk import WorkspaceClient

      w = WorkspaceClient()
      host = w.config.host
    except Exception:
      # Fallback to a default or empty
      host = ''

  # Ensure the host has https:// prefix
  if host and not host.startswith('https://'):
    host = f'https://{host}'

  return ExperimentInfo(
    experiment_id=get_mlflow_experiment_id(),
    link=f'{host}/ml/experiments/{get_mlflow_experiment_id()}?compareRunsMode=TRACES'
    if host
    else None,
  )


setup_mlflow_tracing()


@app.get(f'{API_PREFIX}/health')
async def health_check():
  """Health check endpoint for monitoring app status."""
  import time

  try:
    # Test MLflow connection
    experiment_id = get_mlflow_experiment_id()

    # Test basic functionality
    health_status = {
      'status': 'healthy',
      'timestamp': int(time.time() * 1000),
      'mlflow_experiment_id': experiment_id,
      'environment': 'production' if not IS_DEV else 'development',
    }

    logger.info('Health check passed - all systems operational')
    return health_status

  except Exception as e:
    logger.error(f'Health check failed: {str(e)}')
    return {
      'status': 'unhealthy',
      'error': str(e),
      'timestamp': int(time.time() * 1000),
    }


class BrandConfigRequest(BaseModel):
  """Request options for fetching brand configuration."""

  brand_name: str


@app.post(f'{API_PREFIX}/brand_config')
async def get_brand_config(request: BrandConfigRequest):
  """Fetch brand configuration from brand.dev API.
  Extracts colors and logo URL to create a style configuration.
  Saves the configuration to brand_config.json file.
  """
  logger.info(f'Brand config requested for: {request.brand_name}')

  try:
    import json

    config = brand_service.get_brand_config(request.brand_name)

    # Save to client/public/brand_config.json
    brand_config_path = Path(__file__).parent.parent / 'client' / 'public' / 'brand_config.json'
    with open(brand_config_path, 'w') as f:
      json.dump(config, f, indent=2)

    logger.info(f'Brand config generated and saved for {request.brand_name}')
    return config
  except Exception as e:
    logger.error(f'Failed to generate brand config: {str(e)}')
    raise


class AgentRequestOptions(BaseModel):
  """Request options for the agent API."""

  # Kwargs to the agent function.
  inputs: dict[str, Any]


class QueryAgentResponse(BaseModel):
  """Response from the agent API."""

  # The response from the agent function.
  response: Any
  # The trace id of the last active trace.
  trace_id: Optional[str]


client = MlflowClient()


@app.post(f'{API_PREFIX}/agent')
async def agent(options: AgentRequestOptions) -> QueryAgentResponse:
  """Agent API."""
  # Log agent requests for monitoring (will appear in Databricks Apps logs)
  user_message = ''
  if options.inputs.get('messages'):
    user_message = options.inputs['messages'][-1].get('content', '')[:100]  # First 100 chars

  logger.info(f"Agent request received: '{user_message}...'")

  try:
    response = databricks_agent(**options.inputs)
    trace_id = mlflow.get_last_active_trace_id()

    # Log successful response
    logger.info(f'Agent response generated successfully. Trace ID: {trace_id}')

    return QueryAgentResponse(
      response=response,
      trace_id=trace_id,
    )
  except Exception as e:
    logger.error(f'Agent request failed: {str(e)}')
    raise


# Log feedback with traceId, assessmentName, and assessmentValue


class LogAssessmentRequestOptions(BaseModel):
  """Request options for the agent API."""

  # Kwargs to the agent function.
  trace_id: str
  assessment_name: str
  assessment_value: Union[str, int, float, bool]


@app.post(f'{API_PREFIX}/log_assessment')
async def log_feedback(options: LogAssessmentRequestOptions):
  """Log assessment for the agent API."""
  logger.info(
    f'User feedback - Trace: {options.trace_id}, '
    f'Assessment: {options.assessment_name}={options.assessment_value}'
  )

  try:
    # Log the assessment
    mlflow.log_feedback(
      trace_id=options.trace_id,
      name=options.assessment_name,
      value=options.assessment_value,
      source=mlflow.entities.AssessmentSource(
        source_type=mlflow.entities.AssessmentSourceType.LLM_JUDGE,
        source_id='user_feedback',
      ),
    )
    logger.info(f'Feedback logged to MLflow successfully for trace {options.trace_id}')
    return {'status': 'success'}
  except Exception as e:
    logger.error(f'Failed to log feedback: {str(e)}')
    raise


class EndpointRequestOptions(BaseModel):
  """Request options for the agent API."""

  # Kwargs to the agent function.
  endpoint_name: str
  messages: list[dict[str, str]]
  endpoint_type: str = 'openai-chat'  # Default to OpenAI format


@app.post(f'{API_PREFIX}/invoke_endpoint')
async def invoke_endpoint(options: EndpointRequestOptions):
  """Agent API."""
  return model_serving_endpoint(options.endpoint_name, options.messages, options.endpoint_type)


# ============================================================================
# CHAT MANAGEMENT ENDPOINTS
# In-memory chat storage with max 10 chats limit
# ============================================================================


@app.get(f'{API_PREFIX}/chats')
async def get_all_chats():
  """Get all chats sorted by updated_at (newest first).

  Returns list of chat objects with messages.
  """
  logger.info('Fetching all chats')
  chats = storage.get_all()
  logger.info(f'Retrieved {len(chats)} chats')

  # Convert to dict for JSON serialization
  return [chat.dict() for chat in chats]


class CreateChatRequest(BaseModel):
  """Request to create a new chat."""

  title: Optional[str] = "New Chat"
  agent_id: Optional[str] = None


@app.post(f'{API_PREFIX}/chats')
async def create_new_chat(request: CreateChatRequest):
  """Create a new chat session.

  If 10 chats already exist, deletes the oldest chat.
  """
  logger.info(f'Creating new chat: title="{request.title}", agent_id={request.agent_id}')

  chat = storage.create(title=request.title, agent_id=request.agent_id)

  logger.info(f'Chat created: {chat.id}')
  return chat.dict()


@app.get(f'{API_PREFIX}/chats/{chat_id}')
async def get_chat_by_id(chat_id: str):
  """Get specific chat by ID with all messages."""
  logger.info(f'Fetching chat: {chat_id}')

  chat = storage.get(chat_id)
  if not chat:
    logger.warning(f'Chat not found: {chat_id}')
    return Response(
      content=f'Chat {chat_id} not found',
      status_code=404
    )

  logger.info(f'Retrieved chat {chat_id} with {len(chat.messages)} messages')
  return chat.dict()


@app.delete(f'{API_PREFIX}/chats/{chat_id}')
async def delete_chat_by_id(chat_id: str):
  """Delete specific chat by ID."""
  logger.info(f'Deleting chat: {chat_id}')

  success = storage.delete(chat_id)
  if not success:
    logger.warning(f'Chat not found for deletion: {chat_id}')
    return Response(
      content=f'Chat {chat_id} not found',
      status_code=404
    )

  logger.info(f'Chat deleted: {chat_id}')
  return {'success': True, 'deleted_chat_id': chat_id}


@app.delete(f'{API_PREFIX}/chats')
async def clear_all_chats():
  """Delete all chats."""
  logger.info('Clearing all chats')

  count = storage.clear_all()

  logger.info(f'Cleared {count} chats')
  return {'success': True, 'deleted_count': count}


# ============================================================================
# END CHAT MANAGEMENT ENDPOINTS
# ============================================================================


if not IS_DEV:
  # Production: Serve the built React files
  build_path = Path('.') / 'client/build'
  if build_path.exists():
    app.mount('/', StaticFiles(directory=build_path, html=True), name='static')
  else:
    raise RuntimeError(f'Build directory {build_path} not found. Run `bun run build` in client/')


if IS_DEV:

  @app.api_route('/{full_path:path}', methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'])
  async def proxy_to_dev_server(request: Request, full_path: str):
    """Proxy all non-API requests to the Vite dev server."""
    dev_server_url = f'http://localhost:3000/{full_path}'

    async with httpx.AsyncClient() as client:
      try:
        # Forward request to Vite dev server
        response = await client.request(
          method=request.method,
          url=dev_server_url,
          headers=request.headers.raw,
          content=await request.body(),
        )

        # Return the actual response from Vite dev server
        return Response(
          content=response.content,
          status_code=response.status_code,
          headers=dict(response.headers),
        )
      except httpx.RequestError:
        return Response(
          content='Vite dev server not running.',
          status_code=502,
        )


if __name__ == '__main__':
  uvicorn.run(app, host=HOST, port=PORT)
