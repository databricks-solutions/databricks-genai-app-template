# AI Assistant Guide - Databricks GenAI App Template

This file helps AI assistants understand the project structure, patterns, and implementation details.

## Project Overview

A template for building production-ready AI agent applications with Databricks. Features:
- **Handler Pattern**: Pluggable deployment types (databricks-endpoint current, local-agent/openai planned)
- **Strategy Pattern**: Authentication strategies (HttpTokenAuth, WorkspaceClientAuth)
- **MLflow Integration**: Tracing and feedback collection
- **Next.js + FastAPI**: Static frontend export served by FastAPI backend
- **In-memory storage**: Chat history (10 chat limit)

## Package Management

**Python:**
- Use `uv` for dependency management (NOT pip directly)
- Commands: `uv add`, `uv remove`, `uv sync`
- Virtual environment in `.venv/`

**Frontend:**
- Use `npm` for package management (NOT bun)
- Commands: `npm install`, `npm run dev`, `npm run build`
- Uses shadcn/ui components with TypeScript
- Path alias: `@/` for imports (e.g., `import { Button } from "@/components/ui/button"`)

## Quick Start

```bash
# Setup (creates .env.local, installs deps)
./scripts/setup.sh

# Start dev servers (backend:8000, frontend:3000)
./scripts/start_dev.sh

# Format code (ruff + prettier)
./scripts/fix.sh

# Lint and type check
./scripts/check.sh

# Deploy to Databricks Apps
./scripts/deploy.sh
```

## Configuration Locations

**IMPORTANT - Know where configs go:**

`.env.local` (local development only, gitignored):
```bash
DATABRICKS_HOST=https://adb-123456789.azuredatabricks.net
DATABRICKS_TOKEN=dapi...  # PAT token
DATABRICKS_APP_NAME=my-app  # Optional, for deployment
WORKSPACE_SOURCE_PATH=/Workspace/Users/...  # Optional, for deployment
```

`config/agents.json` (agent definitions):
```json
{
  "agents": [{
    "id": "databricks-agent-01",
    "name": "my-agent",
    "deployment_type": "databricks-endpoint",
    "endpoint_name": "my-endpoint",
    "mlflow_experiment_id": "1234567890",  # ← Goes HERE, not .env.local
    "tools": [...]
  }]
}
```

`config/app.json` (UI branding):
```json
{
  "branding": {
    "tabTitle": "Phoenix",
    "appName": "Phoenix",
    "logoPath": "/logos/u_logo.svg"
  },
  "dashboard": {
    "iframeUrl": "",
    "showPadding": true
  }
}
```

`config/about.json` (about page content with hero, sections, CTA)

`app.yaml` (Databricks Apps deployment config)

## Project Structure

```
databricks-genai-app-template/
├── server/                     # FastAPI backend
│   ├── agents/
│   │   ├── handlers/          # Deployment handlers
│   │   │   ├── base.py       # BaseHandler interface
│   │   │   └── databricks_endpoint.py  # Current implementation
│   │   └── databricks_assistant/  # Example agent code
│   ├── auth/                  # Auth strategies
│   │   ├── base.py           # BaseAuthStrategy
│   │   ├── http_token.py     # HttpTokenAuth (current)
│   │   └── workspace_client.py  # WorkspaceClientAuth (future)
│   ├── routers/
│   │   └── agent.py          # Main API routes
│   ├── app.py                # FastAPI app entry
│   └── chat_storage.py       # In-memory ChatStorage
├── client/                    # Next.js frontend
│   ├── app/                  # Pages
│   ├── components/
│   │   ├── chat/ChatView.tsx  # Main chat + trace collection
│   │   └── modals/TraceModal.tsx  # Trace display
│   ├── lib/types.ts          # TypeScript interfaces
│   └── contexts/             # React contexts
├── config/                    # JSON configuration
├── scripts/                   # Build/deploy scripts
└── docs/                      # Documentation
```

## Architecture Patterns

### Handler Pattern (server/agents/handlers/)

Enables support for multiple agent deployment types:

```python
# Current: Databricks Model Serving
'databricks-endpoint': DatabricksEndpointHandler

# Future (TODO):
'local-agent': LocalAgentHandler
'openai-compatible': OpenAIHandler
'agent-bricks-mas': AgentBricksMASHandler
```

**Key locations:**
- `server/agents/handlers/base.py` - BaseHandler interface
- `server/agents/handlers/databricks_endpoint.py:40-112` - Current implementation (passthrough forwarding)
- `server/routers/agent.py:191-202` - Handler selection logic

### Authentication Strategy (server/auth/)

Strategy pattern for different credential types:

```python
# For HTTP endpoints (current)
HttpTokenAuth:
  - Dev: Uses DATABRICKS_TOKEN from .env.local
  - Prod: Uses x-forwarded-access-token header
  - Returns: (host, token) tuple

# For local agents (future)
WorkspaceClientAuth:
  - Dev: WorkspaceClient with PAT
  - Prod: WorkspaceClient with forwarded token
  - Returns: WorkspaceClient instance
```

**Key locations:**
- `server/auth/base.py` - BaseAuthStrategy interface
- `server/auth/http_token.py` - HttpTokenAuth implementation
- `server/routers/agent.py:176-179` - Strategy selection

### Request Flow

1. POST /api/invoke_endpoint (server/routers/agent.py:122)
2. Create MLflow trace with client_request_id (line 143-163)
3. Select handler based on deployment_type (line 191-202)
4. Get credentials via auth strategy (line 176-179)
5. Call handler.invoke() which streams SSE (databricks_endpoint.py:40-112)
6. Frontend collects trace data from stream (client/components/chat/ChatView.tsx:334-760)
7. Save messages with trace_summary (server/routers/agent.py:238-270)
8. Feedback links to trace via time-proximity matching (agent.py:306-326)

## Handler-Specific Implementation: databricks-endpoint

**IMPORTANT:** Current trace implementation is specific to databricks-endpoint handler only.

### Trace Collection (Client-Side)

**File:** `client/components/chat/ChatView.tsx`

Process:
1. **Lines 437-443**: Receives `trace.client_request_id` event
2. **Lines 451-481**: Captures `function_call` events from stream
3. **Lines 507-541**: Captures `function_call_output` events
4. **Lines 606-677**: Handles optional `trace.summary` event from Databricks
5. **Lines 706-725**: Creates fallback trace summary if none provided
6. **Lines 656-676, 736-760**: Attaches trace_summary to message

**What's captured:**
- Function call names, arguments, outputs
- Call IDs for linking
- Client request ID (for feedback)

**NOT captured (not in SSE events):**
- Duration/timing data (always 0ms)
- LLM call details
- Full span hierarchy

### Backend Handler (Passthrough)

**File:** `server/agents/handlers/databricks_endpoint.py`

```python
# Lines 76-112: Simple forwarding of Databricks SSE events
async for line in response.aiter_lines():
    event = json.loads(json_str)
    yield f'data: {json_str}\n\n'  # Passthrough only
```

- No MLflow API integration
- No trace processing
- Simply forwards events to frontend

**Future handlers may differ** - local agents could create traces with full control and timing.

## Development Workflow

### Local Development

1. **Setup:** Run `./scripts/setup.sh` once
2. **Start:** Run `./scripts/start_dev.sh`
   - Backend: http://localhost:8000 (uvicorn with auto-reload)
   - Frontend: http://localhost:3000 (Next.js dev server)
3. **Edit code:** Changes auto-reload (Python) or hot-reload (React)
4. **Format:** Run `./scripts/fix.sh` before committing
5. **Test API:** Use curl to test endpoints:
   ```bash
   curl -X POST http://localhost:8000/api/invoke_endpoint \
     -H "Content-Type: application/json" \
     -d '{"agent_id":"databricks-agent-01","chat_id":"test","message":"hello"}'
   ```

### Code Quality

```bash
./scripts/fix.sh    # Runs ruff (Python) + prettier (JS/TS)
./scripts/check.sh  # Runs ruff check + TypeScript compiler
```

## Deployment

### Process

```bash
./scripts/deploy.sh
```

**What it does:**
1. Generates `requirements.txt` from pyproject.toml
2. Builds frontend: `npm install && npm run build` → creates `client/out/`
3. Syncs to workspace using `.databricksignore` filters
4. Deploys app using `app.yaml` configuration
5. Verifies with `databricks apps list`

### Configuration

**app.yaml:**
```yaml
command:
  - "uvicorn"
  - "server.app:app"
  - "--host"
  - "0.0.0.0"

env:
  - name: ENV
    value: production  # Triggers OAuth mode
  - name: DATABRICKS_HOST
    value: "https://your-workspace.databricks.net"
```

### Authentication in Production

- **Local dev:** Uses `DATABRICKS_TOKEN` (PAT) from `.env.local`
- **Production:** Uses OAuth with `x-forwarded-access-token` header (automatically provided by Databricks Apps)
- Code automatically detects and switches between modes based on `ENV` variable

### Post-Deployment

1. Check status: `databricks apps list`
2. View logs: `https://{app-url}/logz` (requires browser auth)
3. Test chat interface
4. Verify feedback and MLflow traces

## Common Gotchas

### Configuration

- ❌ **MLFLOW_EXPERIMENT_ID in .env.local** - WRONG, goes in config/agents.json
- ✅ **mlflow_experiment_id in agents.json** - CORRECT
- Frontend on port 3000, backend on port 8000 (NOT proxied)
- Use npm, NOT bun

### Traces

- Trace data is **client-side only** for databricks-endpoint handler
- No MLflow API integration in current implementation
- Duration always 0ms (no timing data in SSE events)
- Future handlers (local-agent, etc.) may have different trace capabilities

### Chat Storage

- In-memory only (lost on restart)
- Maximum 10 chats (oldest auto-deleted)
- Single-user mode (no isolation)
- No edit/delete functionality

### Deployment

- Must build frontend before deploying
- `.databricksignore` controls what syncs (includes client/out/, excludes node_modules)
- Dependency conflicts: Pin to exact versions in pyproject.toml
- Check app status with `databricks apps list`

## Key Code Locations

### Backend Routes
- `server/routers/agent.py:122-277` - Main invoke_endpoint route
- `server/routers/agent.py:279-340` - Feedback logging with trace linking
- `server/app.py:55-71` - Static file serving for frontend

### Frontend Chat
- `client/components/chat/ChatView.tsx:334-760` - Message streaming and trace collection
- `client/components/modals/TraceModal.tsx` - Trace display UI
- `client/lib/types.ts:39-71` - TraceSummary interface

### Handlers & Auth
- `server/agents/handlers/databricks_endpoint.py:40-112` - SSE streaming
- `server/auth/http_token.py:12-38` - Token-based auth

### Storage
- `server/chat_storage.py:8-156` - ChatStorage class with 10 chat limit

## Documentation Reference

**For users (comprehensive guides):**
- `README.md` - Overview, quick start, architecture
- `docs/user-guide.md` - Setup, configuration, deployment
- `docs/developer-guide.md` - Architecture deep dive, adding handlers
- `docs/limitations-and-roadmap.md` - Current limits and planned features

**For features (implementation details):**
- `docs/features/tracing.md` - Trace collection (databricks-endpoint specific)
- `docs/features/feedback.md` - Thumbs up/down and MLflow logging
- `docs/features/chat-storage.md` - In-memory storage details
- `docs/features/session-management.md` - Stream handling

## Troubleshooting

### Authentication Errors
- Local: Check `DATABRICKS_HOST` and `DATABRICKS_TOKEN` in `.env.local`
- Production: Check `app.yaml` has correct `DATABRICKS_HOST`
- Never commit `.env.local` to git

### Agent Not Found
- Verify `endpoint_name` in `config/agents.json` matches actual endpoint
- Check endpoint is in READY state in Databricks workspace
- Confirm endpoint is accessible with token/credentials

### Deployment Fails
- Run `databricks apps list` to check app status
- View logs at `{app-url}/logz` in browser
- Check for dependency conflicts in deploy.sh output
- Pin conflicting packages to exact versions in pyproject.toml

### Build Errors
- Frontend: `cd client && npm run build`
- Backend: `uv sync` to update dependencies
- Run `./scripts/fix.sh` to fix formatting issues

## Git Operations

- Use `git pp` instead of `git push` for pushing changes (if configured)

## Reading Databricks Apps Logs

- **Access:** `https://{app-url}/logz` (requires browser OAuth authentication)
- **Cannot programmatically access** - logs require authenticated session
- **Error detection:** Check `databricks apps list` for ACTIVE/FAILED status
- **Dependency conflicts:** Pin packages to exact versions in pyproject.toml
