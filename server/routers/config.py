"""Configuration endpoints for app, agents, about page, and user info."""

import asyncio
import logging
import time
from typing import Any, Dict, List, Optional, Tuple

from databricks.sdk import WorkspaceClient
from databricks.sdk.errors import ResourceDoesNotExist
from fastapi import APIRouter, Request

from ..config_loader import config_loader
from ..services.agents.agent_bricks_service import get_agent_bricks_service
from ..services.user import get_current_user, get_workspace_url

logger = logging.getLogger(__name__)
router = APIRouter()

# Cache for agents list (5 minute TTL)
_agents_cache: Optional[Dict[str, Any]] = None
_agents_cache_timestamp: float = 0
AGENTS_CACHE_TTL_SECONDS = 300


def is_mas_endpoint(endpoint_name: str) -> bool:
  """Check if an endpoint is a MAS (Multi-Agent Supervisor) endpoint."""
  return 'mas' in endpoint_name.lower()


def validate_agent_config(agent_config, index: int) -> Optional[dict]:
  """Validate agent configuration format.

  Returns None if valid, or an error agent dict if invalid.
  """
  if isinstance(agent_config, str):
    return {
      'id': f'agent-{index}',
      'name': agent_config,
      'endpoint_name': '',
      'display_name': f'Invalid Config #{index + 1}',
      'error': (
        f"Invalid agent format: got string '{agent_config}' but expected an object. "
        "Each agent must be an object with 'endpoint_name' or 'mas_id'. "
        "Example: {\"endpoint_name\": \"my-endpoint\"} or {\"mas_id\": \"uuid-here\"}"
      ),
      'status': 'CONFIG_ERROR',
    }

  if not isinstance(agent_config, dict):
    return {
      'id': f'agent-{index}',
      'name': f'agent-{index}',
      'endpoint_name': '',
      'display_name': f'Invalid Config #{index + 1}',
      'error': (
        f"Invalid agent format: expected an object but got {type(agent_config).__name__}. "
        "Each agent must be an object with 'endpoint_name' or 'mas_id'."
      ),
      'status': 'CONFIG_ERROR',
    }

  endpoint_name = agent_config.get('endpoint_name', '')
  mas_id = agent_config.get('mas_id', '')

  if not endpoint_name and not mas_id:
    return {
      'id': f'agent-{index}',
      'name': f'agent-{index}',
      'endpoint_name': '',
      'display_name': agent_config.get('display_name', f'Invalid Config #{index + 1}'),
      'error': (
        "Missing required field: agent must have either 'endpoint_name' or 'mas_id'. "
        "Example: {\"endpoint_name\": \"my-endpoint\"} or {\"mas_id\": \"uuid-here\"}"
      ),
      'status': 'CONFIG_ERROR',
    }

  return None  # Valid


def _validate_serving_endpoint_sync(endpoint_name: str) -> Tuple[bool, Optional[str], Optional[str]]:
  """Synchronous helper to validate serving endpoint."""
  try:
    client = WorkspaceClient()
    endpoint = client.serving_endpoints.get(endpoint_name)
    state = endpoint.state.ready if endpoint.state else 'UNKNOWN'
    return True, state, None
  except ResourceDoesNotExist:
    return False, None, f"Endpoint '{endpoint_name}' does not exist"
  except Exception as e:
    logger.warning(f'Could not validate endpoint {endpoint_name}: {e}')
    # Return True with UNKNOWN status - don't block if we can't validate
    return True, 'UNKNOWN', None


async def validate_serving_endpoint(endpoint_name: str) -> Tuple[bool, Optional[str], Optional[str]]:
  """Validate that a serving endpoint exists.

  Returns:
    Tuple of (exists, status, error_message)
    - exists: True if endpoint exists
    - status: Endpoint state if exists (e.g., "READY", "NOT_READY")
    - error_message: Error message if endpoint doesn't exist
  """
  return await asyncio.to_thread(_validate_serving_endpoint_sync, endpoint_name)


@router.get('/config/agents')
async def get_agents():
  """Get list of available agents with full details.

  Supports two types of agent configurations:
  1. MAS endpoints: Auto-detects tools from the Agent Bricks API
     - Config: {"endpoint_name": "mas-xxx-endpoint"}
  2. Non-MAS endpoints: Uses manually defined tools from config
     - Config: {"endpoint_name": "my-endpoint", "display_name": "...", "tools": [...]}

  For MAS endpoints, fetches full details (tools, status, etc.) from the Databricks
  Agent Bricks API. For non-MAS endpoints, uses the tools defined in the config.

  Results are cached for 5 minutes to avoid repeated API calls.
  """
  global _agents_cache, _agents_cache_timestamp

  # Check cache first
  cache_age = time.time() - _agents_cache_timestamp
  if _agents_cache is not None and cache_age < AGENTS_CACHE_TTL_SECONDS:
    logger.info(f'Returning cached agents (age: {cache_age:.1f}s)')
    return _agents_cache

  logger.info('Fetching available agents (cache miss or expired)')

  try:
    agents_data = config_loader.agents_config
    agent_configs = agents_data.get('agents', [])
    logger.info(f'Found {len(agent_configs)} agent endpoints in configuration')

    service = get_agent_bricks_service()

    async def fetch_agent(agent_config, index: int):
      """Fetch or build agent details based on config type."""
      # Validate config format first
      validation_error = validate_agent_config(agent_config, index)
      if validation_error:
        return validation_error

      endpoint_name = agent_config.get('endpoint_name', '')
      mas_id = agent_config.get('mas_id')
      manual_config = agent_config

      try:
        # Check if this is a MAS endpoint and has no manually defined tools
        has_manual_tools = manual_config.get('tools') and len(manual_config.get('tools', [])) > 0

        # Determine if this is a MAS agent (either by endpoint_name pattern or mas_id)
        is_mas = is_mas_endpoint(endpoint_name) or mas_id

        if is_mas and not has_manual_tools:
          # If we have mas_id but no endpoint_name, resolve it now
          if mas_id and not endpoint_name:
            endpoint_name = await service.async_get_endpoint_name_from_mas_id(mas_id)
            logger.info(f'Resolved mas_id {mas_id} -> {endpoint_name}')

          # Fetch full details from Agent Bricks API for MAS endpoints
          agent_details = await service.async_get_agent_details_from_endpoint(endpoint_name)
          # Preserve mas_id in the response for frontend reference
          if mas_id:
            agent_details['mas_id'] = mas_id
          # Merge in manual config properties (like question_examples)
          if manual_config.get('question_examples'):
            agent_details['question_examples'] = manual_config['question_examples']
          logger.info(f'Loaded MAS agent details for {endpoint_name}')
          return agent_details
        else:
          # Use manual configuration for non-MAS endpoints or when tools are explicitly defined
          logger.info(f'Using manual config for non-MAS endpoint {endpoint_name}')

          # Validate endpoint exists
          exists, status, error = await validate_serving_endpoint(endpoint_name)
          if not exists:
            logger.error(f'Endpoint validation failed: {error}')
            return {
              'id': endpoint_name,
              'name': endpoint_name,
              'endpoint_name': endpoint_name,
              'display_name': manual_config.get('display_name', endpoint_name),
              'error': error,
              'status': 'ERROR',
            }

          return {
            'id': endpoint_name,
            'name': endpoint_name,
            'endpoint_name': endpoint_name,
            'display_name': manual_config.get('display_name', endpoint_name),
            'display_description': manual_config.get('display_description', ''),
            'status': status,
            'mlflow_experiment_id': manual_config.get('mlflow_experiment_id'),
            'question_examples': manual_config.get('question_examples', []),
            'tools': [
              {
                'name': tool.get('name', ''),
                'display_name': tool.get('display_name', tool.get('name', '')),
                'description': tool.get('description', ''),
                'type': tool.get('type', 'function'),
              }
              for tool in manual_config.get('tools', [])
            ],
          }

      except ValueError as e:
        # Use mas_id as identifier if endpoint_name is not available
        agent_id = endpoint_name or mas_id or 'unknown'
        logger.error(f'Failed to load agent {agent_id}: {e}')

        # Determine display name based on what failed
        if mas_id and not endpoint_name:
          display_name = 'MAS Unavailable'
        else:
          display_name = manual_config.get('display_name', agent_id)

        return {
          'id': agent_id,
          'name': agent_id,
          'endpoint_name': agent_id,
          'display_name': display_name,
          'error': str(e),
          'status': 'ERROR',
        }

    # Fetch all agents in parallel
    agents = await asyncio.gather(*[fetch_agent(config, i) for i, config in enumerate(agent_configs)])

    logger.info(f'Loaded {len(agents)} agents total')
    result = {'agents': list(agents)}

    # Cache the result
    _agents_cache = result
    _agents_cache_timestamp = time.time()

    return result

  except Exception as e:
    logger.error(f'Error loading agents: {str(e)}')
    return {'agents': [], 'error': f'Failed to load agents: {str(e)}'}


@router.get('/config/app')
async def get_app_config():
  """Get unified application configuration.

  Returns all app config from config/app.json:
  - branding: App name, logo, company name, description
  - home: Home page title and description
  - dashboard: Dashboard iframe URL, title, subtitle
  - about: About page hero, sections, and CTA
  """
  logger.info('Fetching app configuration')

  try:
    app_config = config_loader.app_config
    logger.info('✅ App configuration loaded')
    return app_config

  except Exception as e:
    logger.error(f'Error loading app config: {str(e)}')
    return {'error': f'Failed to load app configuration: {str(e)}'}


@router.get('/me')
async def get_me(request: Request):
  """Get current user info, workspace URL, and Lakebase status.

  Returns:
  - user: Current user's email
  - workspace_url: Databricks workspace URL for building resource links
  - lakebase_configured: Whether Lakebase PostgreSQL is configured
  - lakebase_project_id: Lakebase project ID (if configured)
  - lakebase_error: Connection error message (empty if working)
  """
  from ..db import get_lakebase_project_id, is_postgres_configured, test_database_connection

  try:
    user = await get_current_user(request)
    workspace_url = get_workspace_url()

    # Get Lakebase status
    lakebase_configured = is_postgres_configured()
    lakebase_project_id = get_lakebase_project_id()
    lakebase_error = await test_database_connection() if lakebase_configured else None

    return {
      'user': user,
      'workspace_url': workspace_url,
      'lakebase_configured': lakebase_configured,
      'lakebase_project_id': lakebase_project_id,
      'lakebase_error': lakebase_error,
    }

  except Exception as e:
    logger.error(f'Error getting user info: {str(e)}')
    return {'error': f'Failed to get user info: {str(e)}'}
