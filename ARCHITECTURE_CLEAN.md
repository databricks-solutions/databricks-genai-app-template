# Clean Architecture - How It Actually Works

## 🎯 The Correct Flow

```
User types message in browser
        ↓
Next.js Frontend (localhost:3000)
        ↓
POST /api/chat (Next.js API route - SIMPLE PROXY)
        ↓
POST /api/invoke_endpoint (Python FastAPI backend - localhost:8000)
        ↓
Python calls Databricks Agent
        ↓
Response flows back up the chain
```

---

## 📁 What Each Layer Does

### 1. Next.js Frontend (Client-Side)
**Location:** `client/components/`

**Responsibilities:**
- Display UI
- Capture user input
- Show messages
- Call `/api/*` endpoints

**Does NOT:**
- ❌ Call Databricks directly
- ❌ Handle authentication
- ❌ Know about endpoint URLs

### 2. Next.js API Routes (Thin Proxy)
**Location:** `client/app/api/`

**Responsibilities:**
- Forward requests to Python backend
- Handle Next.js specific routing
- Convert formats if needed

**Does NOT:**
- ❌ Business logic
- ❌ Call Databricks directly
- ❌ Handle complex auth

**Example (`/api/chat`):**
```typescript
// Just 60 lines - simple proxy!
POST /api/chat → fetch('http://localhost:8000/api/invoke_endpoint')
```

### 3. Python FastAPI Backend (Business Logic)
**Location:** `server/`

**Responsibilities:**
- ✅ Load configuration from `/config/*.json`
- ✅ Route to correct agent based on `deployment_type`
- ✅ Handle authentication (local token or OAuth)
- ✅ Call Databricks endpoints
- ✅ Handle MLflow tracing
- ✅ Format responses

**Key Endpoints:**
- `GET /api/agents` - Return agents from `/config/agents.json`
- `GET /api/config/app` - Return app config
- `POST /api/invoke_endpoint` - Call agent based on `agent_id`
- `GET /api/health` - Health check

---

## 🔧 Configuration Files

All config in ONE place:

```
/config/
  ├── app.json          # Branding, dashboard
  ├── agents.json       # Agents, deployment_type, endpoint_name
  └── about.json        # About page content

/.env.local            # Secrets ONLY
  ├── DATABRICKS_HOST
  └── DATABRICKS_TOKEN
```

---

## 🔄 Example: User Sends "Hello"

### Step 1: Frontend Captures Input
```typescript
// client/components/chat/ChatView.tsx
sendMessage('Hello')
```

### Step 2: Frontend Calls Next.js API
```typescript
fetch('/api/chat', {
  method: 'POST',
  body: JSON.stringify({
    messages: [{ role: 'user', content: 'Hello' }],
    agentId: 'databricks-agent-01'
  })
})
```

### Step 3: Next.js Proxies to Python
```typescript
// client/app/api/chat/route.ts (simple!)
fetch('http://localhost:8000/api/invoke_endpoint', {
  method: 'POST',
  body: JSON.stringify({
    agent_id: 'databricks-agent-01',
    messages: [{ role: 'user', content: 'Hello' }]
  })
})
```

### Step 4: Python Loads Agent Config
```python
# server/app.py
agent = config_loader.get_agent_by_id('databricks-agent-01')
# Returns: { deployment_type: "databricks-endpoint", endpoint_name: "..." }
```

### Step 5: Python Routes Based on deployment_type
```python
if agent['deployment_type'] == 'databricks-endpoint':
    # Call external Databricks endpoint
    response = model_serving_endpoint(
        endpoint_name=agent['endpoint_name'],
        messages=messages,
        endpoint_type='databricks-agent'
    )
```

### Step 6: Python Handles Auth
```python
# server/agents/model_serving.py
client = get_client()  # Uses DATABRICKS_TOKEN from env
response = client.post(
    f'{DATABRICKS_HOST}/serving-endpoints/{endpoint_name}/invocations',
    headers={'Authorization': f'Bearer {token}'},
    json={'input': messages}
)
```

### Step 7: Response Flows Back
```
Databricks Agent Response
    ↓
Python formats it
    ↓
Next.js returns it
    ↓
Frontend displays it
```

---

## ✅ What Got Fixed

| Issue | Before | After |
|-------|--------|-------|
| Agent loading | ❌ Frontend loaded from `public/metadata/` | ✅ Calls Python `/api/agents` |
| Chat logic | ❌ 536-line Next.js route | ✅ 60-line proxy to Python |
| Authentication | ❌ Complex Next.js logic | ✅ Python handles it |
| Config location | ❌ Scattered | ✅ `/config/*.json` |
| Endpoint URLs | ❌ Hardcoded in agents.json | ✅ `endpoint_name` + `DATABRICKS_HOST` |

---

## 🚀 Current Status

### ✅ Working:
- Python backend loads config from `/config/`
- Frontend hook (`useAgents`) calls Python API
- Next.js `/api/chat` proxies to Python
- Python routes based on `deployment_type`
- Authentication handled in Python

### ⏳ To Test:
- Send a message and get response
- Verify agent call works end-to-end

### 🔜 Next Steps (After Testing):
1. Add streaming support to Python backend
2. Update Next.js proxy to handle streaming
3. Frontend already supports streaming!

---

## 🧪 How to Test

1. **Start servers:**
   ```bash
   ./start_dev.sh
   ```

2. **Check backend loads config:**
   ```bash
   curl http://localhost:8000/api/agents
   ```

3. **Open UI:**
   http://localhost:3000

4. **Send a message:**
   - Go to Chat tab
   - Select agent
   - Type message
   - Should get response!

5. **Check logs:**
   ```
   📤 Proxying chat request to Python backend
   ✅ Got response from backend
   ```

---

## 📝 Key Principles

1. **Python backend owns business logic**
2. **Next.js frontend is just a thin UI layer**
3. **Config in `/config/`, secrets in `.env.local`**
4. **Simple, clean separation of concerns**

---

This is the CORRECT architecture - clean, simple, maintainable!
