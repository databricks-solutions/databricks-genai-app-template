# Current Limitations & Roadmap

This document outlines the current limitations of the application and planned improvements for future releases.

## Current Limitations

### Chat Storage

- **In-memory only** - All chats lost on server restart (no database persistence)
- **Maximum 10 chats** - Oldest chat auto-deleted when limit reached, no warning to user
- **Single-user mode** - No user authentication or isolation, all users share same chat pool
- **No edit/delete** - Cannot edit messages after sending, cannot delete individual messages
- **No export** - No way to download or backup conversation history

**Impact:**
- Not ready for production multi-user deployments
- Chat history lost on deployment updates
- No audit trail or conversation archival (except through MLflow tracing)

### Trace Display (Databricks Endpoint Handler)

**Current implementation (for `databricks-endpoint` deployment type only):**

- **Stream-based collection** - Trace data built from Server-Sent Events during streaming
- **Function calls only** - Captures function_call and function_call_output events from stream
- **No duration data** - Timing information not included in streaming events
- **No MLflow backend integration** - App does not fetch traces from MLflow API
- **Depends on Databricks streaming format** - Limited to what Databricks includes in SSE events

**What's shown in trace viewer:**
- Function calls with names and arguments
- Function outputs (if provided in stream)
- Basic trace ID (client_request_id) for feedback linking
- No LLM call details, no span hierarchy, no timing metrics

**Impact:**
- Cannot see full execution details (LLM prompts, token counts, nested spans)
- Cannot identify performance bottlenecks (no timing data)
- Must visit MLflow UI for complete trace information
- Limited to streaming responses only (non-streaming has no trace data)

**Note:** This limitation applies specifically to the databricks-endpoint handler. Future deployment types (local agents, other endpoints) may have different trace capabilities depending on their implementation.

### Session Management

- **Single-response-at-a-time** - Cannot switch chats or create new chats while response streaming
- **No concurrent chats** - Cannot have multiple chats streaming simultaneously
- **Partial responses lost** - Switching chats during streaming discards partial response
- **No recovery** - Page refresh during streaming loses all progress
- **No queue** - Cannot queue multiple messages while waiting for response

**Impact:**
- Slow responses block all other activity
- Cannot multitask with different agents
- User must stay on page until response completes

### Feedback Linking (Databricks Endpoints)

- **Time-proximity linking** - Uses 3-second time window to match router and agent traces
- **Cold start issues** - May fail to link if agent cold start exceeds 3 seconds
- **No direct trace linking** - Cannot directly link feedback to agent trace (workaround only)

**Impact:**
- Feedback may occasionally be logged to wrong trace or fail to log
- Not a final solution (see [docs/features/feedback.md](features/feedback.md) for details)

### Deployment

- **No multi-region** - Single workspace deployment only
- **No auto-scaling** - Manual resource management
- **No health monitoring** - Basic health endpoint only, no metrics dashboard

## Roadmap

Planned improvements organized by priority and estimated effort.

---

## 💾 Persistent Storage & Multi-User Support

**Status:** Not Implemented
**Priority:** High
**Complexity:** Medium
**Estimated Effort:** 1-2 days

### Goals

1. Persist chat history across server restarts
2. Support multiple users with authentication
3. Remove arbitrary chat limits
4. Enable conversation export and archival

### Proposed Solution

**Database Integration:**

Add SQLite (simple) or Lakebase (PostgreSQL, production-grade).

**User Authentication:**
- Integrate Databricks OAuth (x-forwarded-email header)
- Per-user chat isolation
- User-specific limits and quotas

### Benefits

- ✅ Chat history persists across server restarts
- ✅ Support multiple users with authentication
- ✅ No arbitrary chat limits
- ✅ Trace data persisted and optionally enriched from MLflow
- ✅ Can add advanced features: search, export, analytics

---

## 🚀 Background Response Processing

**Status:** Not Implemented
**Priority:** Medium
**Complexity:** High
**Estimated Effort:** 2-3 days

### Goals

Allow users to switch chats or start new chats while agent responses continue processing in the background.

### Current Behavior (Blocking)

1. User asks question in Chat A → response starts streaming
2. User tries to switch to Chat B during response
3. **Response is aborted** and partial content is lost
4. User must wait for response to complete before switching

### Desired Behavior (Background Processing)

1. User asks question in Chat A → response starts streaming
2. User switches to Chat B mid-response
3. **Chat A response continues processing server-side** (invisible to user)
4. User can interact with Chat B or start new chats
5. User returns to Chat A later → sees **full completed response**

### Technical Requirements

**Backend Task Queue:**
- Current: HTTP request → Databricks stream → Frontend (coupled)
- Needed: HTTP request → Task queue → Background worker → Storage → Frontend polling

**Request Status Tracking:**
- State machine for request lifecycle (queued, streaming, completed, failed)
- Persistent storage for in-progress requests
- Cleanup mechanism for old/abandoned requests

**Frontend Polling/WebSocket:**
- Current: Single fetch() with streaming reader
- Needed: Polling or WebSocket to check request status
- Display "response in progress" indicators

### Implementation Options

**Option A: Simple In-Memory Queue**
- Use asyncio.create_task() for background processing
- Store results in memory (lost on restart)
- Pros: Simple, no external dependencies
- Cons: Lost on server restart, no distributed processing

**Option B: Redis + Celery**
- Full task queue with persistence
- Distributed worker support
- Pros: Production-ready, scalable
- Cons: Additional infrastructure, more complexity

### Benefits

- ✅ Users can switch chats during responses
- ✅ Better UX for slow responses (> 10 seconds)
- ✅ Matches behavior of Claude.ai, ChatGPT
- ✅ Support for long-running agent tasks

---

## 🔍 Enhanced Trace Display with MLflow Integration

**Status:** Not Implemented
**Priority:** Medium
**Complexity:** Medium
**Estimated Effort:** 1-2 days

### Goals

Provide complete trace information with timing, LLM calls, and full span hierarchy by integrating with MLflow Tracking API.

### Current State (Databricks Endpoint)

- Traces built from streaming events only
- Function calls captured, but no duration, no LLM details, no nested spans
- No backend MLflow integration

### Proposed Implementation

**Backend API Endpoint:**
```python
@router.get('/api/traces/{trace_id}')
async def get_trace(trace_id: str):
    """Fetch full trace from MLflow with all span details."""
    mlflow_client = MlflowClient()
    trace = mlflow_client.get_trace(trace_id)

    # Parse and format trace data
    return {
        'trace_id': trace.info.trace_id,
        'spans': parse_spans(trace.data.spans),
        'duration_ms': calculate_duration(trace),
        'llm_calls': extract_llm_calls(trace),
        'tool_calls': extract_tool_calls(trace),
    }
```

**Frontend Integration:**
- Fetch trace on-demand when user clicks "View Trace"
- Fallback to cached stream data if MLflow fetch fails
- Display full span hierarchy with timing

### Benefits

- ✅ Complete trace visualization with timing data
- ✅ LLM call details (prompts, tokens, model parameters)
- ✅ Full span hierarchy and execution flow
- ✅ Performance debugging capabilities
- ✅ Works offline with cached data fallback

---

## 🔗 Direct Trace Linking for Feedback

**Status:** Workaround Implemented (Time-Proximity)
**Priority:** Low
**Complexity:** High (requires Databricks platform changes)
**Estimated Effort:** Unknown

### Current Workaround

Uses time-proximity linking to match router trace to agent trace within 3-second window. See [docs/features/feedback.md](features/feedback.md) for details.

### Ideal Solution

**Option 1: Databricks Agent API Enhancement**
- Agent API returns its trace ID in response
- Frontend can directly reference agent trace for feedback
- Requires Databricks platform team changes

**Option 2: Agent Framework Direct Logging**
- Run agents in-process (not via HTTP endpoint)
- Single unified trace with direct control
- Requires switching from Model Serving to local agent deployment

### When to Implement

- After Databricks adds trace ID to Agent API response, OR
- When switching to local agent deployment pattern

---

## 📊 Message Edit/Delete/Regenerate

**Status:** Not Implemented
**Priority:** Low
**Complexity:** Low
**Estimated Effort:** Half day

### Goals

- Edit user messages after sending
- Delete message pairs (user + assistant)
- Regenerate assistant responses

### Implementation

- Add versioning to messages
- Add DELETE endpoint for messages
- Add PUT endpoint for message edits
- Add "regenerate" button that resends last user message

### Benefits

- ✅ Fix typos in user messages
- ✅ Remove sensitive data from chat
- ✅ Retry failed responses

---

## 📈 Automatic Chart Rendering for Data Responses

**Status:** Not Implemented
**Priority:** Medium
**Complexity:** Medium
**Estimated Effort:** 2-3 days

### Goals

Automatically detect and render charts/visualizations when agent returns tabular data or structured data suitable for visualization.

### Current Behavior

- Agent may return data in markdown tables
- Data displayed as text only
- User must manually interpret numbers
- No visual representation

### Desired Behavior

**Automatic Detection:**
- Parse agent responses for tabular data (markdown tables, JSON arrays, CSV)
- Detect data patterns (time series, categorical, numerical)
- Auto-suggest appropriate chart types (line, bar, pie, scatter)

**Smart Rendering:**
- Show both table and chart side-by-side
- Allow chart type switching (line ↔ bar ↔ pie)
- Interactive charts with tooltips, zoom, pan
- Download chart as image

### Implementation Approach

**Backend Enhancement:**
```python
# In handler response processing
if detect_tabular_data(response):
    structured_data = extract_table(response)
    chart_config = suggest_chart_type(structured_data)
    return {
        "text": response,
        "visualization": {
            "type": "auto",
            "data": structured_data,
            "suggested_chart": chart_config
        }
    }
```

**Frontend Enhancement:**
- Enhance existing ChartRenderer component
- Add automatic chart type detection
- Add chart controls (type selector, download)
- Use existing visualization library (recharts/chart.js)

### Data Sources to Handle

1. **Markdown tables** - Parse with regex/markdown parser
2. **JSON arrays** - Direct structured data
3. **CSV inline** - Parse with CSV parser
4. **SQL results** - Tabular format from python_exec or sql tools

### Chart Types to Support

- **Line charts** - Time series, trends
- **Bar charts** - Categorical comparisons
- **Pie charts** - Proportions, percentages
- **Scatter plots** - Correlations
- **Area charts** - Cumulative data
- **Table view** - Always available fallback

### Benefits

- ✅ Better data comprehension
- ✅ Instant visual insights
- ✅ Professional presentation
- ✅ No manual chart creation needed
- ✅ Matches expectations from other AI tools (ChatGPT, Claude, etc.)

### Related Features

- Table extraction already exists in `table_parser.py`
- ChartRenderer component already exists
- Need to connect detection → rendering pipeline

---

## Related Documentation

- [Chat Storage Implementation](features/chat-storage.md)
- [User Feedback Implementation](features/feedback.md)
- [MLflow Tracing](features/tracing.md)
- [Session Management](features/session-management.md)
