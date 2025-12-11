"""Configuration loader for the application.

Loads all configuration files from the /config directory at startup.
Provides a centralized way to access app configuration, agents, and about page content.
"""

import json
import logging
from pathlib import Path
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)


class ConfigLoader:
  """Loads and caches application configuration from JSON files."""

  def __init__(self, config_dir: Optional[Path] = None):
    """Initialize the config loader.

    Args:
        config_dir: Path to config directory. Defaults to /config in project root.
    """
    if config_dir is None:
      # Default to /config directory at project root
      config_dir = Path(__file__).parent.parent / 'config'

    self.config_dir = config_dir
    self._app_config: Optional[Dict[str, Any]] = None
    self._agents_config: Optional[Dict[str, Any]] = None
    self._about_config: Optional[Dict[str, Any]] = None

    # Load all configs at initialization
    self._load_all()

  def _load_json_file(self, filename: str) -> Dict[str, Any]:
    """Load a JSON file from the config directory.

    Args:
        filename: Name of the JSON file to load

    Returns:
        Dictionary with file contents, or empty dict if file not found
    """
    file_path = self.config_dir / filename

    if not file_path.exists():
      logger.warning(f'Config file not found: {file_path}')
      return {}

    try:
      with open(file_path, 'r') as f:
        data = json.load(f)
        logger.info(f'✅ Loaded config: {filename}')
        return data
    except json.JSONDecodeError as e:
      logger.error(f'Failed to parse {filename}: {e}')
      return {}
    except Exception as e:
      logger.error(f'Error loading {filename}: {e}')
      return {}

  def _load_all(self):
    """Load all configuration files."""
    logger.info('Loading application configuration...')

    self._app_config = self._load_json_file('app.json')
    self._agents_config = self._load_json_file('agents.json')
    self._about_config = self._load_json_file('about.json')

    # Log summary
    agent_count = len(self._agents_config.get('agents', []))
    logger.info(f'✅ Configuration loaded: {agent_count} agents configured')

  @property
  def app_config(self) -> Dict[str, Any]:
    """Get application configuration (branding, dashboard, etc)."""
    if self._app_config is None:
      self._app_config = self._load_json_file('app.json')
    return self._app_config

  @property
  def agents_config(self) -> Dict[str, Any]:
    """Get agents configuration."""
    if self._agents_config is None:
      self._agents_config = self._load_json_file('agents.json')
    return self._agents_config

  @property
  def about_config(self) -> Dict[str, Any]:
    """Get about page configuration."""
    if self._about_config is None:
      self._about_config = self._load_json_file('about.json')
    return self._about_config

  def get_agent_by_id(self, agent_id: str) -> Optional[Dict[str, Any]]:
    """Get a specific agent configuration by ID or endpoint_name.

    Supports both formats:
    - New format: {"endpoint_name": "mas-xxx-endpoint", ...}
    - Legacy format: {"id": "agent-id", ...}

    Args:
        agent_id: The agent ID or endpoint_name to look up

    Returns:
        Agent configuration dict with endpoint_name, or None if not found
    """
    agents = self.agents_config.get('agents', [])
    for agent in agents:
      # Handle string format (legacy - just endpoint name)
      if isinstance(agent, str):
        if agent == agent_id:
          return {'endpoint_name': agent}
        continue

      # Handle object format
      # Match by endpoint_name (new format) or id (legacy)
      if agent.get('endpoint_name') == agent_id or agent.get('id') == agent_id:
        # Ensure endpoint_name is always set
        result = dict(agent)
        if 'endpoint_name' not in result and 'id' in result:
          result['endpoint_name'] = result['id']
        return result

    return None

  def reload(self):
    """Reload all configuration files from disk."""
    logger.info('Reloading configuration...')
    self._app_config = None
    self._agents_config = None
    self._about_config = None
    self._load_all()


# Global config loader instance
config_loader = ConfigLoader()
