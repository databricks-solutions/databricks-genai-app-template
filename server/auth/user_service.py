"""User service for getting the current authenticated user.

In production (Databricks Apps), the user email is available in the
x-forwarded-user header. In development, we fall back to calling
the WorkspaceClient /api/2.0/preview/scim/v2/Me endpoint.
"""

import asyncio
import logging
import os
from typing import Optional

from databricks.sdk import WorkspaceClient
from fastapi import Request

logger = logging.getLogger(__name__)

# Cache for dev user to avoid repeated API calls
_dev_user_cache: Optional[str] = None
_workspace_url_cache: Optional[str] = None


def _is_local_development() -> bool:
  """Check if running in local development mode."""
  return os.getenv('ENV', 'production') == 'development'


async def get_current_user(request: Request) -> str:
  """Get the current user's email from the request.

  In production (Databricks Apps), extracts user from x-forwarded-user header.
  In development, calls WorkspaceClient.current_user.me() and caches the result.

  Args:
    request: FastAPI Request object

  Returns:
    User's email address

  Raises:
    ValueError: If user cannot be determined
  """
  # Try to get user from header first (production mode)
  user = request.headers.get('x-forwarded-user')
  if user:
    logger.debug(f'Got user from x-forwarded-user header: {user}')
    return user

  # Fall back to WorkspaceClient for development
  if _is_local_development():
    return await _get_dev_user()

  # Production without header - this shouldn't happen
  raise ValueError(
    'No x-forwarded-user header found and not in development mode. '
    'Ensure the app is deployed with user authentication enabled.'
  )


async def _get_dev_user() -> str:
  """Get user email from WorkspaceClient in development mode."""
  global _dev_user_cache

  if _dev_user_cache is not None:
    logger.debug(f'Using cached dev user: {_dev_user_cache}')
    return _dev_user_cache

  logger.info('Fetching current user from WorkspaceClient')

  # Run the synchronous SDK call in a thread pool to avoid blocking
  user_email = await asyncio.to_thread(_fetch_user_from_workspace)

  _dev_user_cache = user_email
  logger.info(f'Cached dev user: {user_email}')

  return user_email


def _fetch_user_from_workspace() -> str:
  """Synchronous helper to fetch user from WorkspaceClient."""
  try:
    # WorkspaceClient will use DATABRICKS_HOST and DATABRICKS_TOKEN from env
    client = WorkspaceClient()
    me = client.current_user.me()

    if not me.user_name:
      raise ValueError('WorkspaceClient returned user without email/user_name')

    return me.user_name

  except Exception as e:
    logger.error(f'Failed to get current user from WorkspaceClient: {e}')
    raise ValueError(f'Could not determine current user: {e}') from e


def clear_dev_user_cache() -> None:
  """Clear the cached dev user. Useful for testing."""
  global _dev_user_cache
  _dev_user_cache = None
  logger.debug('Dev user cache cleared')


def get_workspace_url() -> str:
  """Get the Databricks workspace URL.

  Uses DATABRICKS_HOST env var, or fetches from WorkspaceClient config.
  Result is cached for subsequent calls.

  Returns:
    Workspace URL (e.g., https://e2-demo-field-eng.cloud.databricks.com)
  """
  global _workspace_url_cache

  if _workspace_url_cache is not None:
    return _workspace_url_cache

  # Try env var first
  host = os.getenv('DATABRICKS_HOST')
  if host:
    _workspace_url_cache = host.rstrip('/')
    logger.debug(f'Got workspace URL from env: {_workspace_url_cache}')
    return _workspace_url_cache

  # Fall back to WorkspaceClient config
  try:
    client = WorkspaceClient()
    _workspace_url_cache = client.config.host.rstrip('/')
    logger.debug(f'Got workspace URL from WorkspaceClient: {_workspace_url_cache}')
    return _workspace_url_cache
  except Exception as e:
    logger.error(f'Failed to get workspace URL: {e}')
    return ''
