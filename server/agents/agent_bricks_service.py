"""Agent Bricks Service - Read details for MAS, KA, and Genie Spaces.

Provides async functions to fetch metadata from Databricks Agent Bricks API
for Multi-Agent Supervisors, Knowledge Assistants, and Genie Spaces.
Uses parallel requests for better performance.

Includes caching layer with background refresh for MAS agent details.
"""

import asyncio
import logging
import re
import threading
import time
from typing import Any, Dict, List, Optional, TypedDict

import httpx
from databricks.sdk import WorkspaceClient

logger = logging.getLogger(__name__)

# Cache TTL in seconds (5 minutes)
CACHE_TTL_SECONDS = 300


# ============================================================================
# Type Definitions
# ============================================================================


class TileDict(TypedDict, total=False):
  """Tile metadata common to KA and MAS."""

  tile_id: str
  name: str
  description: Optional[str]
  instructions: Optional[str]
  tile_type: str
  created_timestamp_ms: int
  last_updated_timestamp_ms: int
  user_id: str


class KnowledgeSourceDict(TypedDict, total=False):
  """Knowledge source configuration for KA."""

  knowledge_source_id: str
  files_source: Dict[str, Any]


class KnowledgeAssistantStatusDict(TypedDict):
  """KA endpoint status."""

  endpoint_status: str  # ONLINE, OFFLINE, PROVISIONING, NOT_READY


class KnowledgeAssistantDict(TypedDict, total=False):
  """Complete Knowledge Assistant response."""

  tile: TileDict
  knowledge_sources: List[KnowledgeSourceDict]
  status: KnowledgeAssistantStatusDict


class BaseAgentDict(TypedDict, total=False):
  """Agent configuration for MAS."""

  name: str
  description: str
  agent_type: str  # genie, ka, app, etc.
  genie_space: Optional[Dict[str, str]]
  serving_endpoint: Optional[Dict[str, str]]
  app: Optional[Dict[str, str]]
  unity_catalog_function: Optional[Dict[str, Any]]


class MultiAgentSupervisorStatusDict(TypedDict):
  """MAS endpoint status."""

  endpoint_status: str  # ONLINE, OFFLINE, PROVISIONING, NOT_READY


class MultiAgentSupervisorDict(TypedDict, total=False):
  """Complete Multi-Agent Supervisor response."""

  tile: TileDict
  agents: List[BaseAgentDict]
  status: MultiAgentSupervisorStatusDict


class GenieSpaceDict(TypedDict, total=False):
  """Genie Space (Data Room) response."""

  space_id: str
  id: str
  display_name: str
  description: Optional[str]
  warehouse_id: str
  table_identifiers: List[str]
  run_as_type: str
  created_timestamp: int
  last_updated_timestamp: int
  user_id: str
  sample_questions: Optional[List[str]]


class CacheEntry(TypedDict):
  """Cache entry with data and timestamp."""

  data: Dict[str, Any]
  timestamp: float
  refreshing: bool


# ============================================================================
# Agent Bricks Service
# ============================================================================


class AgentBricksService:
  """Service to read details from Agent Bricks (MAS, KA, Genie).

  Includes caching layer with TTL and background refresh for MAS agent details.
  """

  def __init__(self, w: Optional[WorkspaceClient] = None):
    """Initialize service with optional WorkspaceClient.

    Args:
      w: WorkspaceClient instance. If None, creates one using env vars.
    """
    self.w = w or WorkspaceClient()
    self._ka_tiles_cache: Optional[List[Dict[str, Any]]] = None
    # Cache for MAS agent details: endpoint_name -> CacheEntry
    self._agent_cache: Dict[str, CacheEntry] = {}
    self._cache_lock = threading.Lock()

  def _get_headers(self) -> Dict[str, str]:
    """Get authentication headers."""
    return self.w.config.authenticate()

  def _get_base_url(self) -> str:
    """Get base URL for API calls."""
    return self.w.config.host

  # ---------- Cache management ----------

  def _get_from_cache(self, endpoint_name: str) -> Optional[Dict[str, Any]]:
    """Get agent details from cache if valid.

    Returns cached data if:
    - Entry exists
    - Entry is not expired (< TTL seconds old)

    If entry is expired but exists, returns stale data and triggers background refresh.

    Args:
      endpoint_name: The endpoint name to look up

    Returns:
      Cached agent details or None if not in cache
    """
    with self._cache_lock:
      entry = self._agent_cache.get(endpoint_name)
      if entry is None:
        return None

      age = time.time() - entry['timestamp']

      if age < CACHE_TTL_SECONDS:
        # Fresh data, return it
        logger.debug(f'Cache hit for {endpoint_name} (age: {age:.1f}s)')
        return entry['data']
      else:
        # Stale data - trigger background refresh if not already refreshing
        if not entry['refreshing']:
          logger.info(f'Cache stale for {endpoint_name} (age: {age:.1f}s), triggering background refresh')
          entry['refreshing'] = True
          self._trigger_background_refresh(endpoint_name)

        # Return stale data while refresh happens
        logger.debug(f'Returning stale cache for {endpoint_name} while refreshing')
        return entry['data']

  def _set_cache(self, endpoint_name: str, data: Dict[str, Any]):
    """Store agent details in cache.

    Args:
      endpoint_name: The endpoint name key
      data: Agent details to cache
    """
    with self._cache_lock:
      self._agent_cache[endpoint_name] = {
        'data': data,
        'timestamp': time.time(),
        'refreshing': False,
      }
      logger.info(f'Cached agent details for {endpoint_name}')

  def _trigger_background_refresh(self, endpoint_name: str):
    """Start a background thread to refresh the cache.

    Args:
      endpoint_name: The endpoint to refresh
    """

    def refresh_task():
      try:
        logger.info(f'Background refresh started for {endpoint_name}')
        # Create a new event loop for this thread
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
          data = loop.run_until_complete(self._fetch_agent_details(endpoint_name))
          self._set_cache(endpoint_name, data)
          logger.info(f'Background refresh completed for {endpoint_name}')
        finally:
          loop.close()
      except Exception as e:
        logger.error(f'Background refresh failed for {endpoint_name}: {e}')
        # Mark as not refreshing so next request can try again
        with self._cache_lock:
          entry = self._agent_cache.get(endpoint_name)
          if entry:
            entry['refreshing'] = False

    thread = threading.Thread(target=refresh_task, daemon=True)
    thread.start()

  # ---------- Async HTTP helpers ----------

  async def _async_get(
    self,
    client: httpx.AsyncClient,
    path: str,
    params: Optional[Dict[str, Any]] = None,
  ) -> Dict[str, Any]:
    """Make async GET request to Databricks API."""
    url = f'{self._get_base_url()}{path}'
    response = await client.get(url, params=params or {}, timeout=20.0)
    if response.status_code >= 400:
      self._handle_response_error(response, 'GET', path)
    return response.json()

  def _handle_response_error(self, response: httpx.Response, method: str, path: str):
    """Handle HTTP error response."""
    try:
      error_data = response.json()
      error_msg = error_data.get('message', error_data.get('error', str(error_data)))
      raise Exception(f'{method} {path} failed: {error_msg}')
    except ValueError:
      raise Exception(f'{method} {path} failed with status {response.status_code}: {response.text}')

  # ---------- Async API operations ----------

  async def _async_mas_get(
    self, client: httpx.AsyncClient, tile_id: str
  ) -> Optional[MultiAgentSupervisorDict]:
    """Get MAS by tile_id asynchronously."""
    try:
      result = await self._async_get(client, f'/api/2.0/multi-agent-supervisors/{tile_id}')
      return result.get('multi_agent_supervisor')
    except Exception as e:
      if 'does not exist' in str(e).lower() or 'not found' in str(e).lower():
        return None
      raise

  async def _async_ka_get(
    self, client: httpx.AsyncClient, tile_id: str
  ) -> Optional[KnowledgeAssistantDict]:
    """Get KA by tile_id asynchronously."""
    try:
      result = await self._async_get(client, f'/api/2.0/knowledge-assistants/{tile_id}')
      return result.get('knowledge_assistant')
    except Exception as e:
      if 'does not exist' in str(e).lower() or 'not found' in str(e).lower():
        return None
      raise

  async def _async_genie_get(
    self, client: httpx.AsyncClient, space_id: str
  ) -> Optional[GenieSpaceDict]:
    """Get Genie space by ID asynchronously."""
    try:
      return await self._async_get(client, f'/api/2.0/data-rooms/{space_id}')
    except Exception as e:
      if 'does not exist' in str(e).lower() or 'not found' in str(e).lower():
        return None
      raise

  async def _async_get_tiles(
    self, client: httpx.AsyncClient, tile_type: str
  ) -> List[Dict[str, Any]]:
    """Get tiles of a specific type asynchronously."""
    result = await self._async_get(
      client, '/api/2.0/tiles', params={'filter': f'tile_type={tile_type}', 'page_size': 100}
    )
    return result.get('tiles', [])

  # ---------- Tile ID resolution ----------

  async def _async_get_tile_id_from_endpoint(
    self, client: httpx.AsyncClient, endpoint_name: str
  ) -> Optional[str]:
    """Extract tile_id from endpoint name by searching MAS tiles."""
    match = re.match(r'mas-([a-f0-9]+)-endpoint', endpoint_name)
    if not match:
      return None

    short_id = match.group(1)

    try:
      tiles = await self._async_get_tiles(client, 'MAS')
      for tile in tiles:
        tile_id = tile.get('tile_id', '')
        if tile_id.startswith(short_id):
          logger.debug(f'Found tile_id {tile_id} for endpoint {endpoint_name}')
          return tile_id
    except Exception as e:
      logger.error(f'Failed to search for tile: {e}')

    return None

  async def _async_get_ka_tile_id(
    self, client: httpx.AsyncClient, endpoint_name: str
  ) -> Optional[str]:
    """Get KA tile_id from endpoint name by searching KA tiles."""
    match = re.match(r'ka-([a-f0-9]+)-endpoint', endpoint_name)
    if not match:
      return None

    short_id = match.group(1)

    try:
      # Use cached tiles if available
      if self._ka_tiles_cache is None:
        self._ka_tiles_cache = await self._async_get_tiles(client, 'KA')

      for tile in self._ka_tiles_cache:
        tile_id = tile.get('tile_id', '')
        if tile_id.startswith(short_id):
          return tile_id
    except Exception as e:
      logger.error(f'Failed to search for KA tile: {e}')

    return None

  # ---------- Tool enrichment (parallel) ----------

  async def _async_enrich_genie_tool(
    self, client: httpx.AsyncClient, tool: Dict[str, Any]
  ) -> Dict[str, Any]:
    """Enrich a Genie tool with table list."""
    if not tool.get('genie_space_id'):
      return tool

    try:
      genie = await self._async_genie_get(client, tool['genie_space_id'])
      if genie:
        tool['tables'] = genie.get('table_identifiers', [])
        tool['genie_display_name'] = genie.get('display_name')
        tool['warehouse_id'] = genie.get('warehouse_id')
    except Exception as e:
      logger.warning(f"Failed to get Genie details: {e}")

    return tool

  async def _async_enrich_ka_tool(
    self, client: httpx.AsyncClient, tool: Dict[str, Any]
  ) -> Dict[str, Any]:
    """Enrich a KA tool with volume paths."""
    endpoint_name = tool.get('serving_endpoint_name')
    if not endpoint_name or 'ka-' not in endpoint_name:
      return tool

    try:
      ka_tile_id = await self._async_get_ka_tile_id(client, endpoint_name)
      if ka_tile_id:
        ka = await self._async_ka_get(client, ka_tile_id)
        if ka:
          # Extract volume paths from knowledge sources
          volumes = []
          for ks in ka.get('knowledge_sources', []):
            files_source = ks.get('files_source', {})
            if files_source:
              volume_info = {
                'name': files_source.get('name', ''),
                'path': files_source.get('files', {}).get('path', ''),
                'indexed_rows': ks.get('indexed_row_count'),
                'state': ks.get('state'),
              }
              volumes.append(volume_info)
          tool['volumes'] = volumes
          tool['ka_display_name'] = ka.get('tile', {}).get('name')
    except Exception as e:
      logger.warning(f"Failed to get KA details: {e}")

    return tool

  async def _async_enrich_tool(
    self, client: httpx.AsyncClient, tool: Dict[str, Any]
  ) -> Dict[str, Any]:
    """Enrich a single tool with details (Genie tables or KA volumes)."""
    if tool.get('genie_space_id'):
      return await self._async_enrich_genie_tool(client, tool)
    elif tool.get('serving_endpoint_name') and 'ka-' in tool.get('serving_endpoint_name', ''):
      return await self._async_enrich_ka_tool(client, tool)
    return tool

  # ---------- Main fetch method (no cache) ----------

  async def _fetch_agent_details(self, endpoint_name: str) -> Dict[str, Any]:
    """Fetch agent details from API (bypassing cache).

    Args:
      endpoint_name: The model serving endpoint name

    Returns:
      Agent configuration dict with tools, status, etc.

    Raises:
      ValueError: If endpoint is not a MAS endpoint
    """
    if 'mas' not in endpoint_name.lower():
      raise ValueError(
        f"Only MAS endpoints are supported. "
        f"Endpoint '{endpoint_name}' must contain 'mas' in the name."
      )

    headers = self._get_headers()

    async with httpx.AsyncClient(headers=headers) as client:
      # Get tile_id from endpoint name
      tile_id = await self._async_get_tile_id_from_endpoint(client, endpoint_name)
      if not tile_id:
        raise ValueError(
          f"Could not extract tile_id from endpoint name '{endpoint_name}'. "
          f"Expected format: mas-{{tile_id}}-endpoint"
        )

      # Fetch MAS details and KA tiles in parallel (KA tiles needed for tool enrichment)
      mas_task = self._async_mas_get(client, tile_id)
      ka_tiles_task = self._async_get_tiles(client, 'KA')

      mas, ka_tiles = await asyncio.gather(mas_task, ka_tiles_task)

      if not mas:
        raise ValueError(f"MAS with tile_id '{tile_id}' not found")

      # Cache KA tiles for tool enrichment
      self._ka_tiles_cache = ka_tiles

      tile = mas.get('tile', {})
      agents = mas.get('agents', [])
      status = mas.get('status', {})

      # Build basic tools list from MAS agents
      tools = []
      for agent in agents:
        tool = {
          'display_name': agent.get('name', 'Unknown'),
          'description': agent.get('description', ''),
          'type': agent.get('agent_type', 'unknown'),
        }

        # Add specific identifiers based on agent type
        if agent.get('genie_space'):
          tool['genie_space_id'] = agent['genie_space'].get('id')
        if agent.get('serving_endpoint'):
          tool['serving_endpoint_name'] = agent['serving_endpoint'].get('name')
        if agent.get('app'):
          tool['app_name'] = agent['app'].get('name')

        tools.append(tool)

      # Enrich all tools in parallel (Genie + KA calls happen concurrently)
      enriched_tools = await asyncio.gather(
        *[self._async_enrich_tool(client, tool) for tool in tools]
      )

      # Clear the KA tiles cache after use
      self._ka_tiles_cache = None

      return {
        'id': endpoint_name,
        'name': tile.get('name', endpoint_name),
        'endpoint_name': endpoint_name,
        'tile_id': tile_id,
        'display_name': tile.get('name', endpoint_name),
        'display_description': tile.get('description', ''),
        'instructions': tile.get('instructions', ''),
        'status': status.get('endpoint_status', 'UNKNOWN'),
        'tools': enriched_tools,
        'deployment_type': 'databricks-endpoint',
      }

  # ---------- Main async method (with cache) ----------

  async def async_get_agent_details_from_endpoint(self, endpoint_name: str) -> Dict[str, Any]:
    """Get full agent details from an endpoint name asynchronously.

    Uses cache with TTL and background refresh:
    - If cached and fresh (< 5 min), returns immediately
    - If cached but stale, returns stale data and triggers background refresh
    - If not cached, fetches from API

    Args:
      endpoint_name: The model serving endpoint name

    Returns:
      Agent configuration dict with tools, status, etc.

    Raises:
      ValueError: If endpoint is not a MAS endpoint
    """
    # Check cache first
    cached = self._get_from_cache(endpoint_name)
    if cached is not None:
      return cached

    # Not in cache, fetch from API
    logger.info(f'Cache miss for {endpoint_name}, fetching from API')
    data = await self._fetch_agent_details(endpoint_name)

    # Store in cache
    self._set_cache(endpoint_name, data)

    return data

  # ---------- Sync wrappers for backward compatibility ----------

  def get_agent_details_from_endpoint(self, endpoint_name: str) -> Dict[str, Any]:
    """Sync wrapper for async_get_agent_details_from_endpoint."""
    return asyncio.run(self.async_get_agent_details_from_endpoint(endpoint_name))


# Global singleton instance
_service: Optional[AgentBricksService] = None


def get_agent_bricks_service() -> AgentBricksService:
  """Get or create the global AgentBricksService instance."""
  global _service
  if _service is None:
    _service = AgentBricksService()
  return _service
