# Trace ID Handling and User Feedback

## Problem Statement

**Challenge**: Enabling user feedback on AI agent responses requires linking feedback to MLflow traces, but there's a mismatch between IDs.

### The ID Mismatch

1. **Agent Stream Events**: Databricks agent emits events with UUID `id` field
   - Format: `1b4d58cf-28d6-4b20-b601-6324bd114bab`
   - Available during streaming
   - NOT usable for MLflow feedback API

2. **MLflow Trace ID**: MLflow stores traces with `tr-xxx` format
   - Format: `tr-66ca399f091e84f5686a919575ed8366`
   - Required for `mlflow.log_feedback()`
   - NOT emitted in agent stream events

3. **Our Current Storage**: Messages store `traceId` field
   - Currently stores the UUID from events
   - Cannot be used for feedback logging

## Solution: client_request_id Pattern

Following [Databricks documentation](https://docs.databricks.com/aws/en/mlflow3/genai/tracing/collect-user-feedback/), we use the `client_request_id` pattern.

### How It Works

```
┌─────────────┐
│   Backend   │  1. Generate client_request_id (UUID)
│             │  2. Set on MLflow trace via mlflow.update_current_trace()
│             │  3. Emit in stream as custom event
└──────┬──────┘
       │
       │ SSE Stream
       │
       ▼
┌─────────────┐
│  Frontend   │  4. Capture client_request_id from stream
│             │  5. Store in message.traceId
└──────┬──────┘
       │
       │ User clicks thumbs up/down
       │
       ▼
┌─────────────┐
│   Backend   │  6. Search MLflow by client_request_id
│  /feedback  │  7. Get tr-xxx trace ID
│             │  8. Log feedback with mlflow.log_feedback()
└─────────────┘
```

### Implementation Details

#### 1. Backend: Set client_request_id During Invocation

**File**: `server/agents/handlers/databricks_endpoint.py`

```python
import uuid
import mlflow

async def invoke_stream(self, messages):
    # Generate unique client request ID
    client_request_id = f"req-{uuid.uuid4().hex[:16]}"

    # Set on MLflow trace (if tracing is active)
    try:
        mlflow.update_current_trace(client_request_id=client_request_id)
    except Exception:
        pass  # Silently fail if no active trace

    # Emit as first event in stream for frontend
    yield f'data: {json.dumps({
        "type": "trace.client_request_id",
        "client_request_id": client_request_id
    })}\n\n'

    # Continue with normal streaming...
```

**Why**: This tags the MLflow trace with a searchable ID we control.

#### 2. Frontend: Capture client_request_id from Stream

**File**: `client/components/chat/ChatView.tsx`

```typescript
// In stream processing loop
if (event.type === "trace.client_request_id") {
    traceId = event.client_request_id;
    devLog("📋 Trace client_request_id:", traceId);
}
```

**Why**: Store the searchable ID instead of the unusable UUID.

#### 3. Backend: Search and Log Feedback

**File**: `server/routers/agent.py`

```python
@router.post('/log_assessment')
async def log_feedback(options: LogAssessmentRequest):
    client = mlflow.MlflowClient()

    # Get agent config to find experiment ID
    agent = config_loader.get_agent_by_id(options.agent_id)

    # Search for trace by client_request_id
    traces = client.search_traces(
        experiment_ids=[agent.mlflow_experiment_id],
        filter_string=f"attributes.client_request_id = '{options.trace_id}'",
        max_results=1
    )

    if not traces:
        raise HTTPException(404, "Trace not found for feedback")

    # Get the actual MLflow trace ID (tr-xxx format)
    mlflow_trace_id = traces[0].info.trace_id

    # Log feedback with correct trace ID
    mlflow.log_feedback(
        trace_id=mlflow_trace_id,
        name=options.assessment_name,
        value=options.assessment_value,
        source=mlflow.entities.AssessmentSource(
            source_type=mlflow.entities.AssessmentSourceType.HUMAN,
            source_id=options.source_id or "anonymous"
        ),
        rationale=options.rationale
    )

    return {"status": "success"}
```

**Why**: Converts our client_request_id to the MLflow trace ID needed for feedback.

## Data Model Updates

### Frontend: Message Type

```typescript
interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
    traceId?: string;  // NOW: client_request_id format (req-xxx)
                       // BEFORE: UUID format
    traceSummary?: TraceSummary;
}
```

### Backend: LogAssessmentRequest

```python
class LogAssessmentRequest(BaseModel):
    trace_id: str  # client_request_id (we search MLflow with this)
    agent_id: str  # NEW: needed to find MLflow experiment
    assessment_name: str
    assessment_value: Union[str, int, float, bool]
    rationale: Optional[str] = None
    source_id: Optional[str] = "anonymous"
```

## Benefits

✅ **Reliable**: client_request_id is searchable in MLflow
✅ **Backward Compatible**: Only changes what we store in traceId field
✅ **No Breaking Changes**: Existing messages without client_request_id will simply not have feedback available
✅ **Future-Proof**: Follows Databricks recommended pattern

## Limitations

⚠️ **Search Performance**: Each feedback requires a search_traces() call
⚠️ **Experiment Required**: Must know which agent/experiment to search
⚠️ **New Messages Only**: Old messages with UUID traceId cannot use feedback

## Migration Path

1. ✅ **No data migration needed**: Old messages keep UUID traceId, new ones get client_request_id
2. ✅ **Gradual rollout**: Feedback only works for new messages after deployment
3. ✅ **Fallback**: If trace not found, show error toast to user

## Testing Checklist

- [ ] Backend emits `trace.client_request_id` event
- [ ] Frontend captures and stores client_request_id in message.traceId
- [ ] Saved messages persist client_request_id to backend
- [ ] Loaded messages restore client_request_id from backend
- [ ] Feedback endpoint finds trace by client_request_id
- [ ] Feedback logged successfully to MLflow
- [ ] Feedback visible in Databricks MLflow experiment UI
- [ ] Error handling when trace not found
- [ ] Works across server restarts (via chat storage)

## Future Enhancements

1. **Cache Trace ID Mapping**: Store client_request_id → tr-xxx mapping to avoid repeated searches
2. **Batch Feedback**: Support multiple feedback submissions in one request
3. **Feedback Analytics**: Query and display feedback trends in UI
4. **Multi-dimensional Feedback**: Extend beyond binary thumbs up/down
