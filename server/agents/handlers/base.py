"""Base handler interface for different deployment types."""

from abc import ABC, abstractmethod
from typing import Any, AsyncGenerator, Dict, List


class BaseDeploymentHandler(ABC):
  """Abstract base class for deployment handlers.

  Each deployment type should implement this interface to handle
  streaming invocation of endpoints.
  """

  def __init__(self, agent_config: Dict[str, Any]):
    """Initialize handler with agent configuration.

    Args:
      agent_config: The agent configuration dict from agents.json
    """
    self.agent_config = agent_config

  @abstractmethod
  async def predict_stream(
    self, messages: List[Dict[str, str]], endpoint_name: str
  ) -> AsyncGenerator[str, None]:
    """Stream response from the endpoint.

    Args:
      messages: List of messages with 'role' and 'content' keys
      endpoint_name: Name of the endpoint to call

    Yields:
      Server-Sent Events (SSE) formatted strings with JSON data
    """
    pass
