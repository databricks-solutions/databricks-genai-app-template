# Tracing Display

## Overview

The application displays execution traces for agent responses, showing function calls, inputs, and outputs in a visual interface. Traces are built **client-side from streaming data** - no MLflow API calls are made from the frontend.

## How It Works

### Data Collection During Streaming

As the agent streams its response (in `ChatView.tsx`):

1. **Function Call Events** are captured from the stream:
   - `response.output_item.done` with `type: "function_call"` → Adds function call to collected list
   - `response.output_item.done` with `type: "function_call_output"` → Adds output to matching function call

2. **Function calls are stored locally** in `collectedFunctionCalls` array during streaming (lines 223-228, 466-504, 508-564)

3. **Trace Summary Event** (`trace.summary`) received at end of stream:
   - Contains trace metadata (trace_id, duration, status, tokens)
   - **Merged with collected function calls** (lines 636-650) to ensure complete data
   - Stored in message as `traceSummary` field

4. **Data attached to message** for future display (lines 668-686, 715-734)

### Display in Trace Modal

When user clicks "View Trace" on a message (in `TraceModal.tsx`):

1. **Opens modal with cached data** - no network calls (line 52-54)
   - `functionCalls` from message's `traceSummary.function_calls`
   - `userMessage` and `assistantResponse` from message content

2. **Builds hierarchical trace structure** (lines 68-104):
   - Root span: "Agent Execution" with user message input and assistant response output
   - Child spans: One per function call (tool/retrieval)

3. **Renders interactive tree**:
   - Expandable/collapsible nodes
   - Color-coded by type (LLM, Tool, Retrieval)
   - Displays inputs and outputs in formatted JSON
   - No duration data (not available from stream)

## Current Limitations

### 1. No MLflow Backend Integration

**What's Missing:**
- Cannot fetch full MLflow trace from backend
- No access to complete span hierarchy
- No LLM call details (prompts, token counts per call)
- No timing/duration information

**Why:**
- Designed for client-side-only operation
- Reduces backend load and API dependencies
- Simplifies data flow (stream → display)

**Impact:**
- Trace shows function calls only, not full execution graph
- No nested span details
- Users must visit MLflow UI for complete traces

### 2. No Duration/Timing Data

**What's Missing:**
- Span durations always show as 0ms
- No execution timeline
- No performance metrics

**Why:** SSE stream doesn't include timing metadata

**Impact:** Cannot identify performance bottlenecks from UI

### 3. Limited to Streaming Responses

**What's Missing:**
- Non-streaming responses don't collect function call data
- No trace display for non-streaming mode

**Why:** Data collection happens during stream event processing (lines 451-604)

**Impact:** Trace modal shows "No trace data available" for non-streaming responses

### 4. No Real-Time Trace Updates

**What's Missing:**
- Trace data attached only after stream completes
- No progress indication during function calls

**Why:** `trace.summary` event sent at end of stream (line 607-686)

**Impact:** User sees "no trace" until response fully completes

## Possible Improvements

### Short-Term (Client-Side Only)

1. **Show In-Progress Function Calls**
   - Display function calls as they execute (already tracked in `activeFunctionCalls` state)
   - Add "partial trace" view while streaming
   - Implementation: ~50 LOC in TraceModal.tsx

2. **Enhanced Empty State**
   - Distinguish between "no tools used" vs "non-streaming response"
   - Show message like "This response used direct reasoning without tools"

3. **Better Visual Hierarchy**
   - Group function calls by category (retrieval vs computation)
   - Add search/filter for traces with many function calls

### Medium-Term (Backend Integration)

4. **Fetch Full MLflow Trace**
   - Add backend endpoint: `GET /api/traces/{trace_id}`
   - Fetch complete span hierarchy with timing data
   - Fallback to cached data if backend unavailable
   - Implementation: ~200 LOC (backend + frontend)

5. **Show LLM Call Details**
   - Display prompts sent to LLM
   - Token counts per call
   - Model parameters used
   - Requires MLflow trace parsing on backend

6. **Duration and Performance Metrics**
   - Calculate span durations from MLflow data
   - Show execution timeline
   - Highlight slow operations

### Long-Term (Enhanced Features)

7. **Trace Comparison**
   - Compare traces across multiple responses
   - Identify patterns in function call usage
   - Useful for debugging similar queries

8. **Export Trace Data**
   - Download trace as JSON
   - Share with team for debugging
   - Integration with monitoring tools

9. **Trace Search and Filtering**
   - Search across all traces in chat session
   - Filter by function calls used
   - Find traces with errors

## Implementation References

**Data Collection:**
- `client/components/chat/ChatView.tsx` lines 188-853 (sendMessage function)
- Function call collection: lines 466-504, 508-564
- Trace summary merging: lines 607-650

**Display:**
- `client/components/modals/TraceModal.tsx` lines 68-104 (buildTraceFromFunctionCalls)
- Span rendering: lines 180-305

**Data Models:**
- `client/lib/types.ts` (TraceSummary, TraceSpan types)
- `server/chat_storage.py` lines 16-25 (Message with trace_id and trace_summary)
