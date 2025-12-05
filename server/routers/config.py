"""Configuration endpoints for app, agents, and about page."""

import logging

from fastapi import APIRouter

from ..config_loader import config_loader

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get('/config/agents')
async def get_agents():
  """Get list of available agents from configuration.

  Returns agent metadata including:
  - Agent IDs and display names
  - Deployment type (currently only databricks-endpoint is supported)
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
