# 🚀 Local Development Guide

## Quick Start

### 1. Start Both Servers (Easiest Way)
```bash
./start_dev.sh
```

This will start:
- **Backend (FastAPI)**: http://localhost:8000
- **Frontend (Next.js)**: http://localhost:3000

Press `Ctrl+C` to stop both servers.

---

## Manual Start (Alternative)

### Start Backend Only
```bash
# Activate venv
source .venv/bin/activate

# Start FastAPI
uvicorn server.app:app --reload --port 8000
```

### Start Frontend Only
```bash
cd client
npm run dev
```

---

## Test Endpoints

### Backend API Endpoints
```bash
# Health check
curl http://localhost:8000/api/health

# List agents
curl http://localhost:8000/api/agents

# List chats
curl http://localhost:8000/api/chats

# Create chat
curl -X POST http://localhost:8000/api/chats \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Chat", "agent_id": "databricks-agent-01"}'
```

### Frontend
Open browser: http://localhost:3000

---

## What Works Now

✅ **Backend:**
- Health check endpoint
- Agents endpoint (loads from agents.json)
- Chat CRUD endpoints (create, list, get, delete)
- In-memory storage (max 10 chats)

✅ **Frontend:**
- Next.js app loads
- All UI components (Chat, Dashboard, Tools, About tabs)
- Theme system
- 3D animated backgrounds

⚠️ **Not Working Yet:**
- Chat streaming (SSE endpoint not implemented)
- Sending messages (will fail until SSE endpoint added)
- MLflow traces (endpoint exists but not integrated)

---

## Directory Structure

```
.
├── server/              # Python FastAPI backend
│   ├── app.py          # Main FastAPI app (458 lines)
│   └── chat_storage.py # In-memory chat storage
│
├── client/              # Next.js frontend
│   ├── app/            # Next.js pages
│   ├── components/     # React components
│   └── public/metadata/
│       └── agents.json # Agent configurations
│
├── .venv/              # Python virtual environment
├── start_dev.sh        # Start both servers
└── LOCAL_DEV_GUIDE.md  # This file
```

---

## Environment Variables

### Backend (.env.local in root)
```bash
DATABRICKS_TOKEN=dapi...              # Your Databricks PAT
DATABRICKS_HOST=https://...          # Your workspace URL
MLFLOW_EXPERIMENT_ID=123...          # MLflow experiment ID
```

### Frontend (client/.env.local)
```bash
DATABRICKS_TOKEN=dapi...              # Same as backend
NEXT_PUBLIC_DASHBOARD_IFRAME_URL=... # Dashboard embed URL
```

---

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 8000
lsof -ti:8000 | xargs kill -9

# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Python Import Errors
```bash
# Reinstall dependencies
source .venv/bin/activate
uv pip install -e .
```

### Frontend Build Errors
```bash
# Reinstall node modules
cd client
rm -rf node_modules package-lock.json
npm install
```

---

## Next Steps

1. ✅ Environment set up
2. ✅ Backend running
3. ✅ Frontend running
4. ⏳ Implement SSE streaming endpoint
5. ⏳ Test end-to-end chat flow
6. ⏳ Deploy to Databricks Apps

---

## Useful Commands

```bash
# Check if servers are running
lsof -i:8000  # Backend
lsof -i:3000  # Frontend

# View backend logs
# (will show in terminal where uvicorn is running)

# View frontend logs
# (will show in terminal where npm run dev is running)

# Stop all servers
pkill -f uvicorn
pkill -f "next dev"
```

---

## API Documentation

FastAPI auto-generates API docs:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
