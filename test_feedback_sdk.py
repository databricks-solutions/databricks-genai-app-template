#!/usr/bin/env env python
"""Test script to understand MLflow feedback SDK and trace ID handling.

This script tests:
1. How to get trace ID from agent invocation
2. How to log feedback with correct trace ID
3. How to search traces by request ID if needed
4. Verify feedback appears in MLflow
"""

import json

import mlflow
from dotenv import load_dotenv
from mlflow import MlflowClient

# Load environment
load_dotenv('.env.local')

# MLflow setup
mlflow.set_tracking_uri('databricks')
client = MlflowClient()

print('=' * 80)
print('MLflow Feedback SDK Test')
print('=' * 80)

# Step 1: Get experiment info from agents.json
with open('config/agents.json', 'r') as f:
  agents_config = json.load(f)

first_agent = agents_config['agents'][0]
experiment_id = first_agent.get('mlflow_experiment_id')

if not experiment_id:
  print('❌ mlflow_experiment_id not found in config/agents.json')
  exit(1)

print(f'\n1️⃣ Using experiment ID: {experiment_id}')
print(f'   Agent: {first_agent["display_name"]}')

try:
  experiment = mlflow.get_experiment(experiment_id)
  print(f'   Experiment name: {experiment.name}')
except Exception as e:
  print(f'   ❌ Failed to get experiment: {e}')
  exit(1)

# Step 2: Search for recent traces
print('\n2️⃣ Searching for recent traces in experiment...')

try:
  traces = client.search_traces(
    experiment_ids=[experiment_id], max_results=5, order_by=['timestamp_ms DESC']
  )

  print(f'   Found {len(traces)} recent traces')

  if len(traces) == 0:
    print('   ⚠️  No traces found. Run the agent first to create traces.')
    print('   Run: ./test_agent.sh')
    exit(0)

  # Show first trace
  first_trace = traces[0]
  print('\n   Example trace:')
  print(f'   - Trace ID: {first_trace.info.trace_id}')
  print(f'   - Request ID: {first_trace.info.request_id}')
  print(f'   - Status: {first_trace.info.status}')
  print(f'   - Timestamp: {first_trace.info.timestamp_ms}')

  # Check if trace has request metadata with client_request_id
  print(
    f'\n   Request metadata keys: {first_trace.info.request_metadata.keys() if first_trace.info.request_metadata else "None"}'
  )

except Exception as e:
  print(f'   ❌ Failed to search traces: {e}')
  import traceback

  traceback.print_exc()
  exit(1)

# Step 3: Check existing feedback on first trace
print(f'\n3️⃣ Checking existing feedback on trace {first_trace.info.trace_id}...')

try:
  trace_detail = client.get_trace(first_trace.info.trace_id)

  if trace_detail.data.assessments:
    print(f'   Found {len(trace_detail.data.assessments)} existing assessments:')
    for assessment in trace_detail.data.assessments:
      print(f'   - {assessment.name}: {assessment.value}')
      print(f'     Source: {assessment.source.source_type} ({assessment.source.source_id})')
      if assessment.rationale:
        print(f'     Rationale: {assessment.rationale}')
  else:
    print('   No existing assessments')

except Exception as e:
  print(f'   ❌ Failed to get trace details: {e}')
  import traceback

  traceback.print_exc()

# Step 4: Test logging feedback
print('\n4️⃣ Testing feedback logging...')

test_trace_id = first_trace.info.trace_id
print(f'   Using trace ID: {test_trace_id}')

try:
  # Test positive feedback with rationale
  mlflow.log_feedback(
    trace_id=test_trace_id,
    name='user_feedback_test',
    value=True,  # Thumbs up
    source=mlflow.entities.AssessmentSource(
      source_type=mlflow.entities.AssessmentSourceType.HUMAN, source_id='test_script'
    ),
    rationale='This is a test feedback from the SDK test script',
  )
  print('   ✅ Feedback logged successfully!')

except Exception as e:
  print(f'   ❌ Failed to log feedback: {e}')
  import traceback

  traceback.print_exc()
  exit(1)

# Step 5: Verify feedback was logged
print('\n5️⃣ Verifying feedback was logged...')

try:
  trace_detail = client.get_trace(test_trace_id)

  if trace_detail.data.assessments:
    print(f'   Found {len(trace_detail.data.assessments)} assessments:')
    for assessment in trace_detail.data.assessments:
      print(f'   - {assessment.name}: {assessment.value}')
      print(f'     Source: {assessment.source.source_type} ({assessment.source.source_id})')
      if assessment.rationale:
        print(f'     Rationale: {assessment.rationale}')
  else:
    print('   ⚠️  No assessments found - feedback may not have been logged')

except Exception as e:
  print(f'   ❌ Failed to verify feedback: {e}')

# Step 6: Test searching traces by request_id (if available)
print('\n6️⃣ Testing request_id search...')

# Our app stores UUID request IDs - let's see if we can search by them
example_request_id = first_trace.info.request_id
print(f'   Request ID format from MLflow: {example_request_id}')

if example_request_id:
  try:
    # Try searching by request_id
    search_traces = client.search_traces(
      experiment_ids=[experiment_id],
      filter_string=f"request_id = '{example_request_id}'",
      max_results=1,
    )

    if len(search_traces) > 0:
      print(f'   ✅ Found trace by request_id: {search_traces[0].info.trace_id}')
    else:
      print('   ❌ Could not find trace by request_id')

  except Exception as e:
    print(f'   ❌ Search by request_id failed: {e}')
    print('   This might not be supported in filter_string')

# Step 7: Check if we can use client_request_id (from docs)
print('\n7️⃣ Testing client_request_id search (from Databricks docs)...')

# The docs mention using attributes.client_request_id
# But this requires setting it explicitly during trace creation
# Let's see if any traces have it

try:
  # Try searching for traces with client_request_id set
  search_traces = client.search_traces(experiment_ids=[experiment_id], max_results=10)

  has_client_request_id = False
  for trace in search_traces:
    # Check trace attributes
    trace_detail = client.get_trace(trace.info.trace_id)
    if hasattr(trace_detail.info, 'tags'):
      print(f'   Trace {trace.info.trace_id} tags: {trace_detail.info.tags}')
      if 'client_request_id' in trace_detail.info.tags:
        has_client_request_id = True
        print(f'   ✅ Found client_request_id: {trace_detail.info.tags["client_request_id"]}')

  if not has_client_request_id:
    print('   ⚠️  No traces have client_request_id set')
    print('   We may need to set this during agent invocation')

except Exception as e:
  print(f'   ❌ Search failed: {e}')

print('\n' + '=' * 80)
print('Test complete!')
print('=' * 80)

# Summary
print(f"""
📋 Summary:
-----------
1. Trace ID format in MLflow: {first_trace.info.trace_id}
2. Request ID format in MLflow: {first_trace.info.request_id}
3. Can log feedback: ✅
4. Can search by request_id: Testing needed
5. Need to set client_request_id: Likely YES

🔑 Key Finding:
--------------
Our app stores UUID as 'traceId' but MLflow needs the tr-xxx format.

Options:
A) Store BOTH request_id AND mlflow trace_id in our messages
B) Search MLflow by request_id when user gives feedback
C) Use client_request_id pattern from docs (set during invocation, search later)
""")
