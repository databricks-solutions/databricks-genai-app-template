"""Agent invocation and feedback endpoints."""

import json
import logging
from typing import Type, Union

import mlflow
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from ..agents.handlers import BaseDeploymentHandler, DatabricksEndpointHandler
from ..config_loader import config_loader

logger = logging.getLogger(__name__)
router = APIRouter()

# Handler registry: maps deployment_type to handler class
DEPLOYMENT_HANDLERS: dict[str, Type[BaseDeploymentHandler]] = {
  'databricks-endpoint': DatabricksEndpointHandler,
  # Future handlers can be added here:
  # 'openai-compatible': OpenAIHandler,
  # 'local-model': LocalModelHandler,
  # 'custom-api': CustomAPIHandler,
}


class LogAssessmentRequest(BaseModel):
  """Request to log user feedback for a trace."""

  trace_id: str
  assessment_name: str
  assessment_value: Union[str, int, float, bool]


class InvokeEndpointRequest(BaseModel):
  """Request to invoke an agent endpoint."""

  agent_id: str
  messages: list[dict[str, str]]
  stream: bool = True  # Default to streaming


@router.post('/log_assessment')
async def log_feedback(options: LogAssessmentRequest):
  """Log user feedback (thumbs up/down) for an agent trace.

  Stores feedback in MLflow for model evaluation and improvement.
  """
  logger.info(
    f'User feedback - Trace: {options.trace_id}, '
    f'Assessment: {options.assessment_name}={options.assessment_value}'
  )

  try:
    # Log feedback to MLflow
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


@router.post('/invoke_endpoint')
async def invoke_endpoint(options: InvokeEndpointRequest):
  """Invoke an agent endpoint.

  Supports multiple deployment types via handler pattern.
  Each deployment type has its own handler for request/response formatting.
  Supports both streaming and non-streaming modes.
  """
  logger.info(f'🎯 Invoking agent: {options.agent_id} (stream={options.stream})')
  logger.info(f'📦 Request payload: agent_id={options.agent_id}, stream={options.stream}, messages={len(options.messages)}')

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

  # Get the appropriate handler for this deployment type
  handler_class = DEPLOYMENT_HANDLERS.get(deployment_type)

  if not handler_class:
    logger.error(f'Unsupported deployment_type: {deployment_type}')
    supported_types = ', '.join(DEPLOYMENT_HANDLERS.keys())
    return {
      'error': 'Unsupported deployment type',
      'message': f'Deployment type "{deployment_type}" is not supported. Supported types: {supported_types}',
    }

  try:
    # Instantiate the handler with agent configuration
    handler = handler_class(agent)

    # Use streaming or non-streaming based on request
    if options.stream:
      return StreamingResponse(
        handler.invoke_stream(messages=options.messages),
        media_type='text/event-stream',
        headers={
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no'  # Disable nginx buffering
        }
      )
    else:
      return handler.invoke(messages=options.messages)

  except Exception as e:
    logger.error(f'Error invoking agent {options.agent_id}: {str(e)}')
    raise
