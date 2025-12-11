"""Test script for MAS endpoint and Agent Bricks Service."""

import asyncio
import json
import os

from dotenv import load_dotenv

# Load environment variables from .env.local
load_dotenv('.env.local')

# Verify environment is set
host = os.getenv('DATABRICKS_HOST')
token = os.getenv('DATABRICKS_TOKEN')
print(f'DATABRICKS_HOST: {host}')
print(f'DATABRICKS_TOKEN: {"*" * 10 if token else "NOT SET"}')

# Test 1: Agent Bricks Service
print(f'\n{"=" * 80}')
print('TEST 1: Agent Bricks Service')
print(f'{"=" * 80}\n')

from server.agents.agent_bricks_service import get_agent_bricks_service

service = get_agent_bricks_service()

ENDPOINT_NAME = 'mas-209415fd-endpoint'
print(f'Getting agent details for: {ENDPOINT_NAME}')

try:
  agent_details = service.get_agent_details_from_endpoint(ENDPOINT_NAME)
  print(f'\nAgent Details:\n{json.dumps(agent_details, indent=2)}')
except Exception as e:
  print(f'\n❌ Error: {e}')

# Test 2: Streaming
print(f'\n{"=" * 80}')
print('TEST 2: Streaming Response')
print(f'{"=" * 80}\n')

from server.agents.handlers.databricks_endpoint import DatabricksEndpointHandler

QUESTION = 'What tools do you have access to?'


async def test_streaming():
  """Test streaming mode."""
  agent_config = {'id': 'test-agent', 'endpoint_name': ENDPOINT_NAME}
  handler = DatabricksEndpointHandler(agent_config)

  messages = [{'role': 'user', 'content': QUESTION}]
  print(f'Question: {QUESTION}\n')

  chunk_count = 0
  trace_data = None

  async for sse_event in handler.predict_stream(messages, ENDPOINT_NAME):
    chunk_count += 1

    if sse_event.startswith('data: '):
      data_str = sse_event[6:].strip()

      if data_str == '[DONE]':
        print(f'\n--- [DONE] after {chunk_count} chunks ---')
        continue

      try:
        chunk = json.loads(data_str)

        # Look for trace data
        if 'databricks_output' in chunk:
          print('\n🔍 FOUND databricks_output!')
          trace_data = chunk.get('databricks_output')

        # Print text deltas
        if chunk.get('type') == 'response.output_text.delta':
          print(chunk.get('delta', ''), end='', flush=True)

      except json.JSONDecodeError:
        pass

  print(f'\n\nTotal chunks: {chunk_count}')

  if trace_data:
    trace_id = trace_data.get('trace', {}).get('info', {}).get('trace_id')
    print(f'Trace ID: {trace_id}')


if __name__ == '__main__':
  try:
    asyncio.run(test_streaming())
  except Exception as e:
    print(f'\n❌ Streaming error: {e}')
    import traceback

    traceback.print_exc()
