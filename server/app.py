"""FastAPI app for the Databricks Apps + Agents demo."""

import argparse
import logging
import os
import uuid
from datetime import datetime
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

# LangChain agent import - commented out for now (not using it yet)
# from .agents.databricks_assistant import databricks_agent
from .agents.model_serving import model_serving_endpoint
from .brand_service import brand_service
from .chat_storage import Message, storage
from .config_loader import config_loader
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


@app.get(f'{API_PREFIX}/agents')
async def get_agents():
  """Get list of available agents from configuration.

  Returns agent metadata including:
  - Agent IDs and display names
  - Deployment types (databricks-endpoint or langchain-agent)
  - Endpoint names
  - Tool descriptions
  - MLflow experiment IDs
  """
  logger.info('Fetching available agents')

  try:
    agents_data = config_loader.agents_config
    agents = agents_data.get('agents', [])
    logger.info(f'Loaded {len(agents)} agents from configuration')

    return agents_data

  except Exception as e:
    logger.error(f'Error loading agents: {str(e)}')
    return {'agents': [], 'error': f'Failed to load agents: {str(e)}'}


@app.get(f'{API_PREFIX}/config/app')
async def get_app_config():
  """Get application configuration (branding, dashboard, etc).

  Returns:
  - Branding info (app name, logo, company name)
  - Dashboard configuration (iframe URL, title, subtitle)
  """
  logger.info('Fetching app configuration')

  try:
    app_config = config_loader.app_config
    logger.info('✅ App configuration loaded')
    return app_config

  except Exception as e:
    logger.error(f'Error loading app config: {str(e)}')
    return {'error': f'Failed to load app configuration: {str(e)}'}


@app.get(f'{API_PREFIX}/config/about')
async def get_about_config():
  """Get about page configuration.

  Returns:
  - About page title and content
  - Video URL
  - Section content
  - Images
  """
  logger.info('Fetching about page configuration')

  try:
    about_config = config_loader.about_config
    logger.info('✅ About page configuration loaded')
    return about_config

  except Exception as e:
    logger.error(f'Error loading about config: {str(e)}')
    return {'error': f'Failed to load about configuration: {str(e)}'}


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
  """Agent API - OLD ENDPOINT (not used, kept for backwards compatibility)."""
  # This endpoint uses the LangChain agent which is not configured yet
  # Use /api/invoke_endpoint instead
  logger.warning('Old /api/agent endpoint called - this is deprecated')

  return QueryAgentResponse(
    response={'error': 'This endpoint is deprecated. Use /api/invoke_endpoint instead.'},
    trace_id=None,
  )


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

  # Agent ID to invoke
  agent_id: str
  # Messages to send to the agent
  messages: list[dict[str, str]]


@app.post(f'{API_PREFIX}/invoke_endpoint')
async def invoke_endpoint(options: EndpointRequestOptions):
  """Invoke an agent endpoint based on agent configuration.

  Routes to the appropriate handler based on agent deployment_type:
  - databricks-endpoint: Calls external Databricks serving endpoint
  - langchain-agent: Calls built-in LangChain agent (not yet implemented)
  """
  logger.info(f'Invoking agent: {options.agent_id}')

  # Look up agent configuration
  agent = config_loader.get_agent_by_id(options.agent_id)

  if not agent:
    logger.error(f'Agent not found: {options.agent_id}')
    return {
      'error': f'Agent not found: {options.agent_id}',
      'message': 'Please check your agent configuration',
    }

  deployment_type = agent.get('deployment_type', 'databricks-endpoint')
  logger.info(f'Agent deployment type: {deployment_type}')

  try:
    if deployment_type == 'databricks-endpoint':
      # Call external Databricks serving endpoint
      endpoint_name = agent.get('endpoint_name')

      if not endpoint_name:
        logger.error(f'No endpoint_name configured for agent: {options.agent_id}')
        return {
          'error': 'Invalid agent configuration',
          'message': f'Agent {options.agent_id} has no endpoint_name configured',
        }

      logger.info(f'Calling Databricks endpoint: {endpoint_name}')
      return model_serving_endpoint(
        endpoint_name=endpoint_name, messages=options.messages, endpoint_type='databricks-agent'
      )

    elif deployment_type == 'langchain-agent':
      # Call built-in LangChain agent (for future use)
      logger.warning('LangChain agent type not yet implemented')
      return {
        'error': 'Not implemented',
        'message': 'LangChain agents are not yet supported. Please use databricks-endpoint type.',
      }

    else:
      logger.error(f'Unknown deployment_type: {deployment_type}')
      return {
        'error': 'Invalid deployment type',
        'message': f'Unknown deployment_type: {deployment_type}. Supported types: databricks-endpoint, langchain-agent',
      }

  except Exception as e:
    logger.error(f'Error invoking agent {options.agent_id}: {str(e)}')
    raise


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

  title: Optional[str] = 'New Chat'
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


@app.get(API_PREFIX + '/chats/{chat_id}')
async def get_chat_by_id(chat_id: str):
  """Get specific chat by ID with all messages."""
  logger.info(f'Fetching chat: {chat_id}')

  chat = storage.get(chat_id)
  if not chat:
    logger.warning(f'Chat not found: {chat_id}')
    return Response(content=f'Chat {chat_id} not found', status_code=404)

  logger.info(f'Retrieved chat {chat_id} with {len(chat.messages)} messages')
  return chat.dict()


class AddMessageRequest(BaseModel):
  """Request to add messages to a chat."""

  messages: list[dict]  # List of {role, content}


@app.post(API_PREFIX + '/chats/{chat_id}/messages')
async def add_messages_to_chat(chat_id: str, request: AddMessageRequest):
  """Add messages to an existing chat."""
  logger.info(f'Adding {len(request.messages)} messages to chat: {chat_id}')

  chat = storage.get(chat_id)
  if not chat:
    logger.warning(f'Chat not found: {chat_id}')
    return Response(content=f'Chat {chat_id} not found', status_code=404)

  # Add each message
  for msg_data in request.messages:
    message = Message(
      id=f'msg_{uuid.uuid4().hex[:12]}',
      role=msg_data['role'],
      content=msg_data['content'],
      timestamp=datetime.now(),
    )
    storage.add_message(chat_id, message)

  logger.info(f'Added messages to chat {chat_id}, now has {len(chat.messages)} total messages')
  return {'success': True, 'message_count': len(chat.messages)}


@app.delete(API_PREFIX + '/chats/{chat_id}')
async def delete_chat_by_id(chat_id: str):
  """Delete specific chat by ID."""
  logger.info(f'Deleting chat: {chat_id}')

  success = storage.delete(chat_id)
  if not success:
    logger.warning(f'Chat not found for deletion: {chat_id}')
    return Response(content=f'Chat {chat_id} not found', status_code=404)

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
