"""Tests for Agent Bricks Service."""

import os

import pytest
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env.local')


@pytest.fixture(scope='module')
def service():
  """Get AgentBricksService instance."""
  from server.agents.agent_bricks_service import get_agent_bricks_service

  return get_agent_bricks_service()


class TestAgentBricksService:
  """Tests for AgentBricksService."""

  def test_environment_configured(self):
    """Test that environment variables are set."""
    assert os.getenv('DATABRICKS_HOST'), 'DATABRICKS_HOST not set'
    assert os.getenv('DATABRICKS_TOKEN'), 'DATABRICKS_TOKEN not set'

  def test_get_tile_id_from_endpoint_valid(self, service):
    """Test extracting tile_id from valid endpoint name."""
    endpoint = 'mas-209415fd-endpoint'
    tile_id = service.get_tile_id_from_endpoint(endpoint)

    assert tile_id is not None, f'Could not find tile_id for {endpoint}'
    assert tile_id.startswith('209415fd'), f'tile_id should start with 209415fd, got {tile_id}'
    # Full UUID format
    assert len(tile_id) == 36, f'tile_id should be UUID format, got {tile_id}'

  def test_get_tile_id_from_endpoint_invalid_pattern(self, service):
    """Test that invalid endpoint pattern returns None."""
    invalid_endpoints = [
      'not-a-mas-endpoint',
      'ka-12345-endpoint',
      'mas-endpoint',
      'random-string',
    ]
    for endpoint in invalid_endpoints:
      tile_id = service.get_tile_id_from_endpoint(endpoint)
      assert tile_id is None, f'Expected None for {endpoint}, got {tile_id}'

  def test_mas_get_valid(self, service):
    """Test getting MAS details."""
    # First get the tile_id
    tile_id = service.get_tile_id_from_endpoint('mas-209415fd-endpoint')
    assert tile_id is not None

    mas = service.mas_get(tile_id)
    assert mas is not None, f'MAS not found for tile_id {tile_id}'

    # Check required fields
    assert 'tile' in mas, 'MAS should have tile field'
    assert 'agents' in mas, 'MAS should have agents field'
    assert 'status' in mas, 'MAS should have status field'

    # Check tile fields
    tile = mas['tile']
    assert 'tile_id' in tile, 'tile should have tile_id'
    assert 'name' in tile, 'tile should have name'

    # Check agents
    agents = mas['agents']
    assert len(agents) > 0, 'MAS should have at least one agent'
    for agent in agents:
      assert 'name' in agent, 'agent should have name'
      assert 'agent_type' in agent, 'agent should have agent_type'

  def test_mas_get_invalid(self, service):
    """Test getting non-existent MAS returns None."""
    mas = service.mas_get('non-existent-tile-id')
    assert mas is None

  def test_mas_get_endpoint_status(self, service):
    """Test getting MAS endpoint status."""
    tile_id = service.get_tile_id_from_endpoint('mas-209415fd-endpoint')
    status = service.mas_get_endpoint_status(tile_id)

    assert status is not None
    assert status in ['ONLINE', 'OFFLINE', 'PROVISIONING', 'NOT_READY']

  def test_get_agent_details_from_endpoint(self, service):
    """Test getting full agent details from endpoint name."""
    endpoint = 'mas-209415fd-endpoint'
    details = service.get_agent_details_from_endpoint(endpoint)

    # Check required fields
    assert details['id'] == endpoint
    assert details['endpoint_name'] == endpoint
    assert 'tile_id' in details
    assert 'name' in details
    assert 'display_name' in details
    assert 'display_description' in details
    assert 'status' in details
    assert details['deployment_type'] == 'databricks-endpoint'

    # Check tools
    assert 'tools' in details
    tools = details['tools']
    assert len(tools) > 0, 'Should have at least one tool'

    for tool in tools:
      assert 'display_name' in tool
      assert 'type' in tool
      # Check for specific identifiers based on type
      if tool['type'] == 'genie-space' or tool['type'] == 'genie':
        assert 'genie_space_id' in tool, f'Genie tool should have genie_space_id: {tool}'
      elif tool['type'] == 'serving-endpoint' or tool['type'] == 'ka':
        assert 'serving_endpoint_name' in tool, f'KA tool should have serving_endpoint_name: {tool}'

  def test_get_agent_details_non_mas_raises(self, service):
    """Test that non-MAS endpoint raises ValueError."""
    with pytest.raises(ValueError) as exc_info:
      service.get_agent_details_from_endpoint('ka-12345-endpoint')

    assert 'Only MAS endpoints are supported' in str(exc_info.value)

  def test_get_agent_details_invalid_format_raises(self, service):
    """Test that invalid endpoint format raises ValueError."""
    with pytest.raises(ValueError) as exc_info:
      service.get_agent_details_from_endpoint('mas-invalid-format')

    assert 'Could not extract tile_id' in str(exc_info.value)


class TestConfigEndpoint:
  """Test the /api/config/agents endpoint integration."""

  def test_config_agents_returns_details(self, service):
    """Test that config endpoint returns enriched agent details."""
    from server.config_loader import config_loader

    # Get raw config
    agents_data = config_loader.agents_config
    endpoint_names = agents_data.get('agents', [])
    assert len(endpoint_names) > 0, 'No agents configured'

    # Get enriched details for first endpoint
    endpoint = endpoint_names[0]
    details = service.get_agent_details_from_endpoint(endpoint)

    # Verify it has all the fields the UI needs
    assert 'id' in details
    assert 'name' in details
    assert 'display_name' in details
    assert 'tools' in details
    assert 'status' in details


if __name__ == '__main__':
  pytest.main([__file__, '-v'])
