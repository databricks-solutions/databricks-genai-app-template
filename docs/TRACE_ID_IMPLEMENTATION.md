# Trace ID Implementation - Phase 1 Complete

## What We Changed

### Backend (`server/agents/handlers/databricks_endpoint.py`)

**Line 104-111**: Generate and emit `client_request_id`
```python
import uuid

client_request_id = f'req-{uuid.uuid4().hex[:16]}'
logger.info(f'Generated client_request_id: {client_request_id}')

# Emit as first event in stream
trace_event = {'type': 'trace.client_request_id', 'client_request_id': client_request_id}
yield f'data: {json.dumps(trace_event)}\n\n'
```

**Line 128-129**: Track MLflow tagging state
```python
mlflow_trace_tagged = False
```

**Line 168-179**: Tag MLflow trace with `client_request_id`
```python
# Tag MLflow trace with client_request_id (once per stream)
if not mlflow_trace_tagged:
    try:
        import mlflow
        mlflow.update_current_trace(client_request_id=client_request_id)
        logger.info(f'Tagged MLflow trace with client_request_id: {client_request_id}')
        mlflow_trace_tagged = True
    except Exception as e:
        logger.warning(f'Failed to tag MLflow trace: {e}')
        mlflow_trace_tagged = True  # Don't retry
```

### Frontend (`client/components/chat/ChatView.tsx`)

**Line 436-443**: Capture `client_request_id` from stream
```typescript
// Handle client_request_id from backend (for MLflow trace linking)
if (event.type === "trace.client_request_id") {
    traceId = event.client_request_id;
    devLog("📋 Received client_request_id for trace:", traceId);
}
```

**Line 445-448**: Keep legacy UUID handling for backward compatibility
```typescript
// Handle trace ID (legacy - keeping for backward compatibility)
if (event.id && !traceId) {
    traceId = event.id;
}
```

## How It Works

1. **Backend generates** `req-{16-char-hex}` ID (e.g., `req-1b4d58cf28d64b20`)
2. **Backend emits** as first stream event: `{"type": "trace.client_request_id", "client_request_id": "req-..."}`
3. **Frontend captures** and stores in `message.traceId`
4. **Backend tags MLflow trace** when first event with `id` arrives
5. **Message saved** to backend with `trace_id: "req-..."`
6. **Feedback endpoint** will search MLflow by `client_request_id` to find `tr-xxx` trace ID

## Data Flow

```
┌──────────────────────────────────────────────────────────────┐
│ 1. Backend: Generate client_request_id                       │
│    req-1b4d58cf28d64b20                                      │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│ 2. Backend: Emit as first stream event                       │
│    data: {"type": "trace.client_request_id", ...}            │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│ 3. Frontend: Capture and store in traceId                    │
│    message.traceId = "req-1b4d58cf28d64b20"                  │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│ 4. Backend: Tag MLflow trace                                 │
│    mlflow.update_current_trace(                              │
│        client_request_id="req-1b4d58cf28d64b20"              │
│    )                                                          │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│ 5. MLflow: Trace now searchable                              │
│    attributes.client_request_id = "req-1b4d58cf28d64b20"     │
│    trace_id = "tr-66ca399f091e84f5686a919575ed8366"          │
└──────────────────────────────────────────────────────────────┘
```

## Testing Instructions

### Test 1: Verify client_request_id Emission

1. Start the development server
2. Send a message to the agent
3. Open browser console (F12)
4. Look for logs showing:
   ```
   📋 Received client_request_id for trace: req-xxxxxxxxxxxxxxxx
   ```

### Test 2: Verify Backend Logging

1. Check server logs for:
   ```
   Generated client_request_id: req-xxxxxxxxxxxxxxxx
   Tagged MLflow trace with client_request_id: req-xxxxxxxxxxxxxxxx
   ```

### Test 3: Verify MLflow Tagging

Run this script to check if traces have `client_request_id`:

```python
import json
import mlflow
from mlflow import MlflowClient

mlflow.set_tracking_uri('databricks')
client = MlflowClient()

# Load agent config
with open('config/agents.json', 'r') as f:
    agents = json.load(f)['agents']

experiment_id = agents[0]['mlflow_experiment_id']

# Get recent traces
traces = client.search_traces(
    experiment_ids=[experiment_id],
    max_results=5,
    order_by=["timestamp_ms DESC"]
)

print(f"Recent traces with client_request_id:\n")
for trace in traces:
    detail = client.get_trace(trace.info.trace_id)
    tags = detail.info.tags if hasattr(detail.info, 'tags') else {}
    client_req_id = tags.get('client_request_id', 'NOT FOUND')
    print(f"Trace: {trace.info.trace_id}")
    print(f"  client_request_id: {client_req_id}")
    print()
```

### Test 4: Verify Message Storage

1. Send a message with tool calls
2. Switch to a different chat
3. Switch back to the original chat
4. Click "View Trace" button
5. Trace should appear with function calls
6. Check console - `message.traceId` should have `req-xxx` format

## Expected Results

✅ **Backend logs** show client_request_id generation and MLflow tagging
✅ **Frontend logs** show client_request_id capture
✅ **Messages** store `req-xxx` format in traceId field
✅ **MLflow traces** have `client_request_id` tag searchable
✅ **Trace modal** still works (uses cached data, not trace ID yet)
✅ **No breaking changes** - existing functionality unchanged

## What's Next

Phase 2 will implement:
- Feedback endpoint that searches MLflow by `client_request_id`
- Frontend feedback submission
- Toast notifications
- Visual feedback state

## Rollback Plan

If issues arise, simply revert these commits:
1. `server/agents/handlers/databricks_endpoint.py` - remove client_request_id generation
2. `client/components/chat/ChatView.tsx` - remove trace.client_request_id handling

The app will fall back to storing UUID in traceId (current behavior).
