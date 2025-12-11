"""Handler for Databricks model serving endpoints.

Uses the MLflow deployments client to call endpoints with return_trace=True
to get full trace data from Databricks.
"""

import asyncio
import json
import logging
from typing import Any, AsyncGenerator, Dict, List

from mlflow.deployments import get_deploy_client

from .base import BaseDeploymentHandler

logger = logging.getLogger(__name__)


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

  async def predict_stream(
    self, messages: List[Dict[str, str]], endpoint_name: str
  ) -> AsyncGenerator[str, None]:
    """Stream response from Databricks endpoint using MLflow deployments client.

    Uses an async queue to bridge the synchronous MLflow generator with async streaming,
    preventing the event loop from being blocked during iteration.
    """
    logger.debug(f'Calling endpoint: {endpoint_name}')

    client = get_deploy_client('databricks')

    inputs = {
      'input': messages,
      'databricks_options': {
        'return_trace': True,
      },
    }

    # Use a queue to bridge sync generator -> async generator
    queue: asyncio.Queue = asyncio.Queue()
    loop = asyncio.get_event_loop()

    def consume_sync_generator():
      """Run in thread pool to consume sync generator without blocking event loop."""
      try:
        response = client.predict_stream(endpoint=endpoint_name, inputs=inputs)
        for chunk in response:
          logger.debug(f'Chunk: {chunk}')
          # Put chunk into queue (thread-safe with call_soon_threadsafe)
          loop.call_soon_threadsafe(queue.put_nowait, ('chunk', chunk))
        # Signal completion
        loop.call_soon_threadsafe(queue.put_nowait, ('done', None))
      except Exception as e:
        logger.error(f'Error calling endpoint {endpoint_name}: {e}')
        loop.call_soon_threadsafe(queue.put_nowait, ('error', str(e)))

    # Start consuming in thread pool (non-blocking)
    asyncio.get_event_loop().run_in_executor(None, consume_sync_generator)

    # Yield chunks as they arrive (non-blocking async iteration)
    try:
      while True:
        msg_type, data = await queue.get()

        if msg_type == 'chunk':
          yield f'data: {json.dumps(data)}\n\n'
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
