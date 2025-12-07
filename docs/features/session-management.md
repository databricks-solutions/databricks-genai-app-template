# Session Management

## Overview

The application manages chat sessions with **single-response-at-a-time constraints**: users cannot create new chats or switch chats while an agent response is streaming. This prevents data corruption and ensures message consistency.

## How It Works

### Chat Creation Blocking

**UI Behavior:**
- "New Chat" button disabled during streaming (`hasMessages && isLoading`) → `client/components/chat/ChatInput.tsx`
- User must wait for response to complete before starting new chat

**Why:**
- Chat creation requires a valid first message (line 238 in ChatView.tsx)
- If streaming in progress, race condition between old stream save and new chat
- Simpler UX: finish one conversation before starting another

**Implementation:**
- ChatInput component receives `disabled` prop when `isLoading` (line 976)
- Parent component tracks `isLoading` state (line 37)
- `onStreamingChange` callback notifies parent (lines 130-134)

### Chat Switching During Stream

**Stream Abortion:**
When user switches away from active chat (lines 75-96 in ChatView.tsx):

1. **Detect chat change** via `useEffect` on `chatId` prop (line 75)
2. **Abort active stream** if leaving current chat (lines 84-88):
   ```javascript
   if (abortControllerRef.current) {
     abortControllerRef.current.abort();
     abortControllerRef.current = null;
   }
   ```
3. **Clear stream reference** `activeStreamChatIdRef.current = undefined` (line 89)
4. **Load new chat** or reset state (lines 98-112)

**Stream Validation:**
Throughout streaming, multiple checks ensure data goes to correct chat (lines 401-406, 574-579, 652-657, 736-740):

```javascript
if (activeStreamChatIdRef.current !== streamChatId) {
  devLog("⚠️ Ignoring event from old stream (chat switched)");
  continue;
}
```

**AbortError Handling:**
Gracefully handles aborted streams (lines 784-794):
- Removes temporary assistant message
- No error shown to user (expected behavior)
- Logs "Stream aborted cleanly - user switched chats"

### Message Save Safety

**Save Conditions** (line 825):
- Must have valid `activeChatId`
- Assistant message must be created
- Must have content to save

**What Prevents Corruption:**
1. Stream locked to specific chatId: `const streamChatId = activeChatId` (line 270)
2. Frozen reference: `activeStreamChatIdRef.current = streamChatId` (line 271)
3. All stream events validated against frozen reference
4. Save only happens if stream completes successfully (not aborted)

**Background Save:**
- Saves asynchronously after stream completes (lines 827-850)
- Errors logged but don't throw (line 847-849)
- User doesn't see save failures

## Current Limitations

### 1. No Concurrent Chats

**What's Missing:**
- Cannot have multiple chats streaming simultaneously
- Cannot background a streaming response to start another

**Why:**
- Single `isLoading` state controls entire UI (line 37)
- AbortController per component instance, not per chat
- Message save logic assumes one active stream

**Impact:**
- Slow responses block all other activity
- Cannot multitask with different agents
- Limited parallelization for power users

**Workaround:** Open multiple browser tabs (each has own state)

### 2. Chat Switching Loses Partial Response

**Behavior:**
- If user switches chat during streaming, partial assistant response is **discarded** (lines 788-793)
- AbortError handler removes the temporary message
- User sees nothing in the chat they left

**Why:**
- Designed to prevent partial/corrupted messages
- Stream validation rejects events from old streams

**Impact:**
- Cannot quickly check other chat and return
- Long responses force user to stay on page
- No draft/recovery mechanism

**Possible Issue:** If response is 90% done and user switches, all progress lost

### 3. No Queue for Multiple Requests

**What's Missing:**
- Cannot queue multiple messages to same chat
- Must wait for response before sending next message
- No batch processing

**Why:**
- Chat input disabled during `isLoading` (line 976)
- Single stream per chat at a time

**Impact:**
- Slower workflow for sequential questions
- Cannot "fire and forget" multiple queries

### 4. No Chat Lock Indicator

**What's Missing:**
- No visual indication of which chat is streaming
- Sidebar doesn't show "this chat is active"
- Could switch to streaming chat unknowingly

**Why:**
- Streaming state not exposed to sidebar component
- No per-chat loading indicators

**Impact:**
- User confusion when sidebar shows multiple chats
- May accidentally abort important stream

### 5. Stream State Not Persisted

**What's Missing:**
- If page refreshes during stream, stream lost
- No recovery mechanism
- Must resend message

**Why:**
- AbortController and stream state live in component memory only
- No backend tracking of active streams

**Impact:**
- Network issues or accidental refresh lose progress
- Long-running agent tasks vulnerable

## Implementation Details

### Component State Management

**Key State Variables** (lines 36-72):
```javascript
const [isLoading, setIsLoading] = useState(false);          // Blocks UI
const [currentSessionId, setCurrentSessionId] = useState(); // Tracks active chat
const abortControllerRef = useRef<AbortController | null>(); // Cancels fetch
const activeStreamChatIdRef = useRef<string | undefined>(); // Validates events
```

**State Flow:**
1. User sends message → `setIsLoading(true)` (line 210)
2. Creates AbortController (lines 199-200)
3. Locks stream to chatId (lines 270-272)
4. Streams data with validation (lines 334-706)
5. Saves to backend (lines 827-850)
6. Resets state: `setIsLoading(false)` (line 819)

### Chat Switch Detection

**Effect Hook** (lines 75-114):
```javascript
useEffect(() => {
  const isDifferentChat = chatId !== currentSessionId;

  if (isDifferentChat) {
    // Abort only if LEAVING a chat (not creating new)
    if (currentSessionId) {
      abortControllerRef.current?.abort();
    }

    setCurrentSessionId(chatId);

    if (chatId) {
      loadChatHistory(chatId);
    } else {
      // Reset state for new chat
      setMessages([]);
      setIsLoading(false);
    }
  }
}, [chatId, currentSessionId]);
```

**Key Logic:**
- Only abort if `currentSessionId` exists (we're leaving a chat)
- Don't abort when creating first chat (`currentSessionId` is undefined)
- Reset all state when starting new chat

### Stream Validation Pattern

**Used Throughout Streaming** (example from line 401-406):
```javascript
if (activeStreamChatIdRef.current !== streamChatId) {
  devLog("⚠️ Ignoring text delta from old stream (chat switched)");
  continue; // Skip this event
}
```

**Locations:**
- Text deltas (lines 401-406)
- Final text (lines 574-579)
- Trace summary (lines 652-657)
- Final update (lines 736-740)

**Purpose:**
- Prevents race conditions
- Ensures events go to correct chat
- Safe even with network delays

## Possible Improvements

### Short-Term

1. **Visual Stream Indicator in Sidebar**
   - Add pulsing dot next to streaming chat
   - Show "Generating..." text
   - Disable click during stream
   - Implementation: ~50 LOC

2. **Confirm Dialog on Chat Switch**
   - "Response in progress. Switch anyway?" dialog
   - Prevent accidental stream abortion
   - Implementation: ~30 LOC with AskUserQuestion tool

3. **Show Partial Response on Switch**
   - Save partial assistant message before aborting
   - Mark as "Incomplete" or "Partial"
   - Allow user to continue later
   - Implementation: ~80 LOC

### Medium-Term

4. **Message Queue**
   - Allow sending multiple messages while streaming
   - Queue messages for sequential processing
   - Show "2 messages queued" indicator
   - Implementation: ~200 LOC

5. **Background Streaming**
   - Continue streaming in background when switching chats
   - Show completion notification
   - Return to see full response
   - Implementation: ~300 LOC (needs WebSocket or polling)

6. **Stream Recovery**
   - Save stream progress to backend periodically
   - Resume stream after page refresh
   - Requires backend stream tracking
   - Implementation: ~400 LOC

### Long-Term

7. **Multi-Chat Streaming**
   - Support multiple concurrent streams
   - Per-chat loading state and AbortControllers
   - Parallel agent execution
   - Implementation: ~500 LOC + refactoring

8. **Stream Persistence**
   - Store stream state in database
   - Recover from server restarts
   - Long-running tasks (hours/days)
   - Implementation: ~600 LOC + job queue system

9. **Collaborative Streaming**
   - Multiple users viewing same streaming response
   - Real-time sync via WebSocket
   - Shared chat sessions
   - Implementation: ~1000 LOC + WebSocket infrastructure

## Edge Cases Handled

### 1. Rapid Chat Switching
- Multiple quick switches during stream
- **Handled:** Each switch aborts previous, validation rejects old events

### 2. Network Failure During Stream
- Connection drops mid-stream
- **Handled:** Try/catch around stream reading (lines 783-817), error message shown

### 3. Stream Completes After Chat Switch
- Network delay causes events to arrive after switch
- **Handled:** Validation rejects events (lines 736-740), no data corruption

### 4. Create Chat While Streaming
- User tries to create new chat during active stream
- **Handled:** New Chat button disabled (ChatInput component)

### 5. Page Refresh During Stream
- User refreshes browser mid-stream
- **Handled:** Stream lost (limitation #5), clean state on reload

## Configuration

**No configurable options** for session management behavior.

All constraints are hardcoded in component logic:
- Single stream per component instance
- Automatic abort on chat switch
- Disabled UI during streaming

To change behavior, modify source code in:
- `client/components/chat/ChatView.tsx` (stream management)
- `client/components/chat/ChatInput.tsx` (UI blocking)
