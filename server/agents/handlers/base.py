"""Base handler interface for different deployment types."""

from abc import ABC, abstractmethod
from typing import Any, AsyncGenerator, Dict, List


class BaseDeploymentHandler(ABC):
  """Abstract base class for deployment handlers.

  Each deployment type (databricks-endpoint, openai-compatible, local, etc.)
  should implement this interface to handle invocation and streaming.

  The handler focuses on:
  - Request payload formatting
  - Response parsing
  - Streaming implementation
  - Authentication (if type-specific)

  The handler does NOT:
  - Log to MLflow (that stays in the router)
  - Handle feedback (that's centralized)
  """

  def __init__(self, agent_config: Dict[str, Any]):
    """Initialize handler with agent configuration.

    Args:
      agent_config: The agent configuration dict from agents.json
    """
    self.agent_config = agent_config

  @abstractmethod
  async def invoke_stream(
    self, messages: List[Dict[str, str]]
  ) -> AsyncGenerator[str, None]:
    """Stream response from the endpoint.

    Args:
      messages: List of messages with 'role' and 'content' keys

    Yields:
      Server-Sent Events (SSE) formatted strings with JSON data
    """
    pass

  @abstractmethod
  def invoke(self, messages: List[Dict[str, str]]) -> Dict[str, Any]:
    """Non-streaming invocation.

    Args:
      messages: List of messages with 'role' and 'content' keys

    Returns:
      Response dict (format may vary by handler type)
    """
    pass
