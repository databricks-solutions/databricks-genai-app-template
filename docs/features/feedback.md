# User Feedback Implementation

## Overview

This document describes how user feedback (thumbs up/down with optional comments) is collected and logged to MLflow traces for model evaluation and improvement.

## Architecture

### The Challenge: Two Separate Traces

When using **Databricks Model Serving endpoints** (deployment type: `databricks-endpoint`), the system creates **two separate MLflow traces**:

1. **Router Trace** (created by our FastAPI endpoint)
   - Created locally in our application
   - Tagged with `client_request_id` for searchability
   - Contains minimal information (HTTP call to agent)
   - **Does NOT contain conversation content**

2. **Agent Trace** (created by Databricks server-side)
   - Created automatically by the Databricks agent endpoint
   - Contains the full conversation history, tool calls, and LLM responses
   - **Contains all the actual content we care about**
   - NOT tagged with our `client_request_id` (we don't have access to tag it)

**Why?** The Databricks agent runs on remote servers. When we call it via HTTP, it creates its own MLflow trace server-side using `mlflow.langchain.autolog()`. Our local router also creates a trace when decorated with `@mlflow.trace`. These are separate processes, so they create separate traces.

### The Solution: Time-Proximity Linking

Since we cannot merge the two traces, we use a **time-based linking strategy** to find the agent's trace when logging feedback:

1. **During agent invocation**:
   - Router creates a trace with `@mlflow.trace` decorator
   - Tags it with `client_request_id` (searchable via `tags.client_request_id`)
   - Records the experiment ID from agent config
   - Calls the Databricks agent endpoint
   - Returns `client_request_id` to frontend

2. **During feedback submission**:
   - Frontend sends feedback with the `client_request_id`
   - Backend finds the **router trace** by searching `tags.client_request_id`
   - Extracts the timestamp from the router trace
   - Searches for the **agent trace** within ±2 seconds of that timestamp
   - Logs feedback to the **agent trace** (the one with conversation content)

## Implementation Details

### Router Trace Creation

File: `server/routers/agent.py`

```python
@mlflow.trace(name='invoke_endpoint', span_type='AGENT')
async def invoke_endpoint(options: InvokeEndpointRequest):
    client_request_id = f'req-{uuid.uuid4().hex[:16]}'

    # Tag trace for searchability
    active_span = mlflow.get_current_active_span()
    if active_span:
        trace_id = active_span.request_id
        mlflow.update_current_trace(client_request_id=client_request_id)
        mlflow_client.set_trace_tag(trace_id, 'client_request_id', client_request_id)

    # Call agent handler...
```

### Feedback Linking Logic

File: `server/routers/agent.py`

The feedback endpoint uses deployment-aware trace linking:

```python
def find_trace_for_feedback(client_request_id: str, agent_config: dict) -> str:
    """Find the appropriate trace for logging feedback.

    Strategy depends on deployment type:
    - databricks-endpoint: Time-proximity linking (2 separate traces)
    - Future types: May use direct trace linking
    """
    deployment_type = agent_config.get('deployment_type', 'databricks-endpoint')

    if deployment_type == 'databricks-endpoint':
        # Find router trace by tag
        # Find agent trace by timestamp proximity
        # Return agent trace ID
    else:
        # Future: direct trace lookup for local/other deployments
```

### Time Window Configuration

- **Tolerance**: ±2 seconds from router trace timestamp
- **Experiment scope**: Only searches within the agent's MLflow experiment
- **Fallback**: If agent trace not found, logs feedback to router trace (ensures feedback is not lost)

## Pros and Cons

### ✅ Advantages

1. **Feedback on the right trace**: Users see feedback alongside actual conversation content in MLflow
2. **No agent code changes**: Works with existing Databricks agents without redeployment
3. **Searchable**: Router trace is easily found via `tags.client_request_id`
4. **Reliable fallback**: Even if linking fails, feedback is logged somewhere
5. **Future-proof**: Pattern easily extends to other deployment types

### ⚠️ Limitations

1. **Two traces exist**: Router trace (empty) + Agent trace (with content) - slight storage overhead
2. **Timing dependency**: Relies on traces being created close in time (~2 seconds)
3. **Clock skew**: If Databricks server clock differs significantly from local clock, linking may fail
4. **Multiple agents**: If multiple agent calls happen within 2 seconds, could match wrong trace (mitigated by experiment ID scoping)

## Future Extensibility

This implementation is designed to evolve as we support additional deployment types:

### Databricks Model Serving (`databricks-endpoint`)
- **Current**: Time-proximity linking (two separate traces)
- **Why**: Remote execution, autolog creates server-side trace

### Agent Framework / Local Agents (future)
- **Future**: Direct trace linking (single trace)
- **Why**: Local execution, our decorator captures everything
- **Implementation**: Same `@mlflow.trace` decorator, but agent runs as child span

### Custom API Endpoints (future)
- **Future**: Hybrid approach depending on whether they support trace propagation
- **Implementation**: Configurable per agent in `agents.json`

## Configuration

Feedback linking behavior is automatically determined by the `deployment_type` field in `config/agents.json`:

```json
{
  "agents": [
    {
      "id": "my-agent",
      "deployment_type": "databricks-endpoint",  // ← Determines linking strategy
      "mlflow_experiment_id": "123456789",
      "endpoint_name": "my-agent-endpoint"
    }
  ]
}
```

## Debugging

### Check Router Trace
```python
from mlflow import MlflowClient
client = MlflowClient()

traces = client.search_traces(
    experiment_ids=["your-experiment-id"],
    filter_string="tags.client_request_id = 'req-abc123'",
    max_results=1
)
```

### Check Agent Trace (Time-Based)
```python
router_trace = traces[0]
router_time = router_trace.info.timestamp_ms

# Search within ±2 seconds
agent_traces = client.search_traces(
    experiment_ids=["your-experiment-id"],
    filter_string=f"timestamp_ms >= {router_time - 2000} AND timestamp_ms <= {router_time + 2000}",
    max_results=10
)

# Filter for traces WITHOUT our tag (those are agent traces)
agent_traces = [t for t in agent_traces if not t.info.tags.get('client_request_id')]
```

## Known Issues

### MLflow Documentation Discrepancy
The Databricks MLflow documentation shows searching by `attributes.client_request_id`:

```python
# Documentation example (DOES NOT WORK)
traces = client.search_traces(
    filter_string=f"attributes.client_request_id = '{client_request_id}'"
)
```

**This is incorrect or outdated.** The `client_request_id` field set by `mlflow.update_current_trace()` is:
- ✅ Stored in `trace.info.client_request_id` (accessible)
- ❌ NOT searchable via `filter_string`

**Our solution** uses tags instead:
```python
# Working approach
client.set_trace_tag(trace_id, 'client_request_id', client_request_id)
traces = client.search_traces(
    filter_string=f"tags.client_request_id = '{client_request_id}'"
)
```

## Testing

To test the feedback flow:

1. **Invoke agent** via UI or API - note the `client_request_id` from response
2. **Wait 3-5 seconds** for traces to be exported to MLflow
3. **Submit feedback** via UI thumbs up/down
4. **Check MLflow UI**:
   - Find agent trace (has conversation content)
   - Verify feedback appears in the Assessments tab
   - Confirm the feedback value and rationale are logged correctly

## Related Files

- `server/routers/agent.py` - Router trace creation and feedback endpoint
- `server/agents/handlers/databricks_endpoint.py` - Databricks agent handler
- `client/components/chat/ChatView.tsx` - Frontend feedback UI
- `config/agents.json` - Agent configuration including deployment type
