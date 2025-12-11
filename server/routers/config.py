"""Configuration endpoints for app, agents, about page, and user info."""

import asyncio
import logging

from fastapi import APIRouter, Request

from ..agents.agent_bricks_service import get_agent_bricks_service
from ..auth.user_service import get_current_user, get_workspace_url
from ..config_loader import config_loader

logger = logging.getLogger(__name__)
router = APIRouter()


def is_mas_endpoint(endpoint_name: str) -> bool:
  """Check if an endpoint is a MAS (Multi-Agent Supervisor) endpoint."""
  return 'mas' in endpoint_name.lower()


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
  """
  logger.info('Fetching available agents')

  try:
    agents_data = config_loader.agents_config
    agent_configs = agents_data.get('agents', [])
    logger.info(f'Found {len(agent_configs)} agent endpoints in configuration')

    service = get_agent_bricks_service()

    async def fetch_agent(agent_config):
      """Fetch or build agent details based on config type."""
      # Handle both string format (legacy) and object format
      if isinstance(agent_config, str):
        endpoint_name = agent_config
        manual_config = {}
      else:
        endpoint_name = agent_config.get('endpoint_name', '')
        manual_config = agent_config

      try:
        # Check if this is a MAS endpoint and has no manually defined tools
        has_manual_tools = manual_config.get('tools') and len(manual_config.get('tools', [])) > 0

        if is_mas_endpoint(endpoint_name) and not has_manual_tools:
          # Fetch full details from Agent Bricks API for MAS endpoints
          agent_details = await service.async_get_agent_details_from_endpoint(endpoint_name)
          logger.info(f'Loaded MAS agent details for {endpoint_name}')
          return agent_details
        else:
          # Use manual configuration for non-MAS endpoints or when tools are explicitly defined
          logger.info(f'Using manual config for non-MAS endpoint {endpoint_name}')
          return {
            'id': endpoint_name,
            'name': endpoint_name,
            'endpoint_name': endpoint_name,
            'display_name': manual_config.get('display_name', endpoint_name),
            'display_description': manual_config.get('display_description', ''),
            'status': 'UNKNOWN',  # We don't know the status for non-MAS endpoints
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
        logger.error(f'Failed to load agent {endpoint_name}: {e}')
        # Include a minimal entry for failed agents
        return {
          'id': endpoint_name,
          'name': endpoint_name,
          'endpoint_name': endpoint_name,
          'display_name': manual_config.get('display_name', endpoint_name),
          'error': str(e),
          'status': 'ERROR',
        }

    # Fetch all agents in parallel
    agents = await asyncio.gather(*[fetch_agent(config) for config in agent_configs])

    logger.info(f'Loaded {len(agents)} agents total')
    return {'agents': list(agents)}

  except Exception as e:
    logger.error(f'Error loading agents: {str(e)}')
    return {'agents': [], 'error': f'Failed to load agents: {str(e)}'}


@router.get('/config/app')
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


@router.get('/config/about')
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


@router.get('/me')
async def get_me(request: Request):
  """Get current user info and workspace URL.

  Returns:
  - user: Current user's email
  - workspace_url: Databricks workspace URL for building resource links
  """
  try:
    user = await get_current_user(request)
    workspace_url = get_workspace_url()

    return {
      'user': user,
      'workspace_url': workspace_url,
    }

  except Exception as e:
    logger.error(f'Error getting user info: {str(e)}')
    return {'error': f'Failed to get user info: {str(e)}'}
