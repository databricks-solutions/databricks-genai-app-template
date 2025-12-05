"""Health check and tracing endpoints."""

import logging
import os
import time
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter()


class ExperimentInfo(BaseModel):
  """MLflow experiment information."""

  experiment_id: Optional[str]
  link: Optional[str]


@router.get('/tracing_experiment')
async def get_tracing_experiment():
  """Get MLflow experiment info for trace viewing.

  Returns experiment ID and web link to view traces in Databricks.
  """
  host = os.getenv('DATABRICKS_HOST', '')

  # In production (Databricks Apps), get host from SDK if not in env
  if not host:
    try:
      from databricks.sdk import WorkspaceClient

      w = WorkspaceClient()
      host = w.config.host
    except Exception:
      host = ''

  # Ensure host has https:// prefix
  if host and not host.startswith('https://'):
    host = f'https://{host}'

  # Note: App-level experiment ID not used anymore
  # Agents have their own experiment IDs in agents.json
  experiment_id = None

  return ExperimentInfo(
    experiment_id=experiment_id,
    link=f'{host}/ml/experiments/{experiment_id}?compareRunsMode=TRACES' if (host and experiment_id) else None,
  )


@router.get('/health')
async def health_check(is_dev: bool = False):
  """Health check endpoint for monitoring app status.

  Returns application health status.
  """
  try:
    health_status = {
      'status': 'healthy',
      'timestamp': int(time.time() * 1000),
      'environment': 'development' if is_dev else 'production',
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
