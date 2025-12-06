#!/usr/bin/env python
"""Test what events the Databricks agent actually emits during streaming.

This helps us identify where the MLflow trace ID (tr-xxx) appears in the stream.
"""

import asyncio
import json

from server.agents.handlers.databricks_endpoint import DatabricksEndpointHandler
from server.config_loader import config_loader


async def main():
  print('=' * 80)
  print('Testing Databricks Agent Stream Events')
  print('=' * 80)

  # Load agent config
  agents_config = config_loader.agents_config
  agent_data = agents_config['agents'][0]
  agent_id = agent_data['id']
  agent = config_loader.get_agent_by_id(agent_id)

  print(f'\nAgent: {agent_data["display_name"]}')
  print(f'Endpoint: {agent_data["endpoint_name"]}')

  # Create handler
  handler = DatabricksEndpointHandler(agent)

  # Test message
  messages = [{'role': 'user', 'content': 'What are the latest metrics?'}]

  print('\n📡 Streaming events from agent...')
  print('-' * 80)

  event_count = 0
  seen_event_types = set()
  trace_ids_found = {}

  async for event_str in handler.invoke_stream(messages):
    event_count += 1

    # Parse event
    if event_str.startswith('data: '):
      json_str = event_str[6:].strip()

      if json_str == '[DONE]':
        print('\n[DONE] signal received')
        continue

      try:
        event = json.loads(json_str)
        event_type = event.get('type', 'unknown')
        seen_event_types.add(event_type)

        # Look for any trace-related fields
        for key, value in event.items():
          if 'trace' in key.lower() or 'id' in key.lower():
            if key not in trace_ids_found:
              trace_ids_found[key] = []
            if value not in trace_ids_found[key]:
              trace_ids_found[key].append(value)
              print(f'\n🔍 Found {key}: {value}')

        # Print full event for specific types
        if event_type in ['trace', 'trace.summary', 'done']:
          print(f'\n📦 {event_type} event:')
          print(json.dumps(event, indent=2))

      except json.JSONDecodeError:
        pass

  print('\n' + '=' * 80)
  print('Summary')
  print('=' * 80)
  print(f'Total events: {event_count}')
  print(f'\nEvent types seen: {sorted(seen_event_types)}')
  print('\nTrace-related fields found:')
  for key, values in trace_ids_found.items():
    print(f'  {key}: {values}')


if __name__ == '__main__':
  asyncio.run(main())
