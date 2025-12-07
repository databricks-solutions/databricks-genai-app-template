# Chat Storage

## Overview

Chat sessions are stored **in-memory on the backend** using a simple Python dictionary. Storage persists only during application runtime - all chats are lost when the server restarts.

## Architecture

### Backend Storage (`server/chat_storage.py`)

**Storage Class:** `ChatStorage` (lines 38-143)
- Stores chats in Python `Dict[str, Chat]` (line 49)
- Max 10 chats per application instance (line 47)
- Auto-deletes oldest chat when limit reached (lines 73-75)

**Data Models:**

1. **Message** (lines 16-25):
   ```python
   {
     "id": "msg_abc123",
     "role": "user|assistant|system",
     "content": "...",
     "timestamp": "2024-01-01T12:00:00",
     "trace_id": "req-abc123def456",  # Optional
     "trace_summary": {...}             # Optional
   }
   ```

2. **Chat** (lines 27-36):
   ```python
   {
     "id": "chat_xyz789",
     "title": "How to...",
     "agent_id": "databricks-agent-01",  # Optional
     "messages": [Message, ...],
     "created_at": "2024-01-01T12:00:00",
     "updated_at": "2024-01-01T12:05:00"
   }
   ```

**Global Singleton:** `storage = ChatStorage(max_chats=10)` (line 142)

### Frontend State (`client/components/chat/ChatView.tsx`)

**Local State Only:**
- `messages` array (line 36) - current chat messages
- `currentSessionId` (line 38-40) - tracks active chat ID
- No local persistence (no localStorage/IndexedDB)

**Loading Chat History:**
- Fetches from backend on chat switch (lines 140-186)
- `GET /api/chats/{id}` returns full chat with all messages
- Restores agent selection for chat (lines 164-167)

**Saving Messages:**
- Saves to backend after stream completes (lines 824-851)
- `POST /api/chats/{chat_id}/messages` with user + assistant messages
- Background operation - errors don't block UI

## Current Limitations

### 1. No Persistence Across Restarts

**What Happens:**
- All chats lost when backend server restarts
- No database or file storage
- Dev server restarts frequently during development

**Impact:**
- Users lose conversation history on deployment updates
- Cannot resume long-running research sessions
- No historical data for analytics

**Workaround:** None currently implemented

### 2. Maximum 10 Chats

**Behavior:**
- Storage enforces strict 10-chat limit (line 73)
- When creating 11th chat, **oldest chat auto-deleted** (lines 73-75)
- "Oldest" determined by `updated_at` timestamp (line 74)
- No user warning before deletion

**Impact:**
- Long-running chats can be deleted silently
- No way to "pin" important chats
- No archive or export functionality

**Workaround:** Manually copy important conversations

### 3. Single-User Mode Only

**What's Missing:**
- No user authentication or isolation
- All users share same 10-chat pool
- No per-user storage

**Impact:**
- Multiple users overwrite each other's chats
- Privacy concerns in shared deployments
- Cannot deploy to multi-tenant environments

**Current Use Case:** Development and single-user demos only

### 4. No Message Edit/Delete

**What's Missing:**
- Cannot edit message content after sending
- Cannot delete individual messages
- Cannot regenerate assistant responses

**Why:**
- Simple append-only model (line 107-108)
- No edit/versioning logic implemented

**Impact:**
- Typos in user messages stay forever
- Cannot remove sensitive data from chat
- Must delete entire chat to remove content

### 5. Race Conditions During Chat Switch

**Known Issue:**
- If user switches chats while response streaming, messages may save to wrong chat
- AbortController cancels stream (lines 84-88) but save may still occur

**Mitigation:**
- Stream validation checks `activeStreamChatIdRef` (lines 401-406, 574-579, 652-657, 736-740)
- Backend save only happens if stream completes successfully (line 825)

**Impact:** Rare but possible data corruption in edge cases

## Implementation Details

### Chat Creation Flow

1. **User sends first message** (no chatId) → `ChatView.tsx` line 232
2. **Frontend creates chat** via `POST /api/chats` (lines 234-254)
   - Title: First 50 characters of message (line 238)
   - Agent ID: Currently selected agent (line 239)
3. **Backend creates Chat object** → `server/routers/chat.py` line 53
   - Checks max_chats limit (line 73)
   - Deletes oldest if needed
   - Returns new chat ID
4. **Frontend updates state** (lines 257, 260-262)
   - Sets `currentSessionId`
   - Notifies parent component (URL update)

### Message Save Flow

1. **Stream completes successfully** → `ChatView.tsx` line 825
2. **Validates conditions:**
   - Has `activeChatId` (not undefined)
   - Assistant message was created (line 825)
   - Has content to save (line 825)
3. **Sends to backend** `POST /api/chats/{id}/messages` (lines 828-845)
   - Both user and assistant messages
   - Includes trace_id and trace_summary
4. **Backend stores** → `server/routers/chat.py` lines 84-94
   - Appends to chat.messages array (line 93)
   - Updates chat.updated_at (line 108)
   - Auto-generates title from first message (lines 111-112)

### Chat Loading Flow

1. **User clicks chat in sidebar** → chatId prop changes
2. **Effect triggers** → `ChatView.tsx` line 75-114
3. **Aborts active stream** if switching away (lines 84-88)
4. **Loads history** via `GET /api/chats/{id}` (lines 140-186)
5. **Restores state:**
   - Messages array (line 181)
   - Agent selection (lines 164-167)
   - Trace data (lines 173, 175-177)

## Possible Improvements

### Short-Term

1. **Increase Chat Limit to 50-100**
   - Change `max_chats=10` to higher value (line 142)
   - Minimal code change (~1 LOC)
   - Still in-memory but more practical

2. **Warn Before Deletion**
   - Show toast when chat auto-deleted
   - Include deleted chat title in notification
   - Implementation: ~10 LOC in create endpoint

3. **Export Chat to JSON**
   - Add "Download" button in chat UI
   - Generates JSON file with full chat history
   - Implementation: ~30 LOC frontend

### Medium-Term

4. **SQLite Persistence**
   - Replace in-memory dict with SQLite database
   - Persists across server restarts
   - Keep simple schema (chats + messages tables)
   - Implementation: ~200 LOC + SQLAlchemy models

5. **Chat Archiving**
   - Move old chats to "archive" instead of deleting
   - Archived chats read-only
   - Unarchive on demand
   - Implementation: ~100 LOC

6. **Message Edit/Delete**
   - Edit user messages after sending
   - Regenerate assistant response
   - Delete message pairs
   - Implementation: ~150 LOC (backend + frontend)

### Long-Term

7. **User Authentication**
   - Integrate Databricks OAuth
   - Per-user chat isolation
   - User-specific limits
   - Implementation: ~500 LOC + auth middleware

8. **PostgreSQL/Databricks SQL Storage**
   - Production-grade persistence
   - Scalable to thousands of users
   - Query chat history across users (analytics)
   - Implementation: ~400 LOC + database migration

9. **Real-Time Sync**
   - WebSocket updates for multi-device users
   - Live collaboration features
   - Shared team chats
   - Implementation: ~800 LOC + WebSocket server

## Configuration

**Max Chats Limit:**
```python
# server/chat_storage.py line 142
storage = ChatStorage(max_chats=10)
```

To change limit:
1. Edit line 142
2. Restart server
3. All existing chats cleared (in-memory storage)

**No other configuration options** currently available.
