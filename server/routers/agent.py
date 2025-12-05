"""Agent invocation and feedback endpoints."""

import logging
from typing import Union

import mlflow
from fastapi import APIRouter
from pydantic import BaseModel

from ..agents.model_serving import model_serving_endpoint
from ..config_loader import config_loader

logger = logging.getLogger(__name__)
router = APIRouter()


class LogAssessmentRequest(BaseModel):
  """Request to log user feedback for a trace."""

  trace_id: str
  assessment_name: str
  assessment_value: Union[str, int, float, bool]


class InvokeEndpointRequest(BaseModel):
  """Request to invoke an agent endpoint."""

  agent_id: str
  messages: list[dict[str, str]]


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
  """Invoke a Databricks agent endpoint.

  Currently only supports 'databricks-endpoint' deployment type.
  Calls external Databricks model serving endpoints.
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

    else:
      # Only databricks-endpoint deployment type is supported for now
      logger.error(f'Unsupported deployment_type: {deployment_type}')
      return {
        'error': 'Unsupported deployment type',
        'message': f'Only "databricks-endpoint" deployment type is supported. Got: {deployment_type}',
      }

  except Exception as e:
    logger.error(f'Error invoking agent {options.agent_id}: {str(e)}')
    raise
