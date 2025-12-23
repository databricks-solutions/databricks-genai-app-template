# Databricks GenAI App Template

A production-ready template for building AI agent applications on Databricks. Features a modern React chat interface, FastAPI backend, optional PostgreSQL persistence via Databricks Lakebase, and seamless deployment to Databricks Apps.

![Chat Interface](docs/images/chat-ui.png)

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Vite, React 18, TypeScript, React Router, Tailwind CSS, shadcn/ui |
| **Backend** | FastAPI, Python 3.11+, async SQLAlchemy |
| **Database** | In-memory (default) or PostgreSQL via Databricks Lakebase |
| **AI/ML** | Databricks Model Serving, MLflow tracing & feedback |
| **Deployment** | Databricks Apps with OAuth authentication |

## Project Structure

```
databricks-genai-app-template/
├── server/                      # FastAPI backend
│   ├── app.py                  # Application entry point
│   ├── routers/                # API endpoints
│   │   ├── agent.py           # Agent invocation & feedback
│   │   ├── chat.py            # Chat CRUD operations
│   │   └── config.py          # Configuration endpoints
│   ├── services/
│   │   ├── agents/handlers/   # Deployment handlers (extensible)
│   │   └── chat/              # Storage backends (memory/postgres)
│   └── db/                     # SQLAlchemy models & migrations
├── client/                      # Vite/React frontend
│   ├── src/
│   │   ├── App.tsx            # Routes and providers
│   │   ├── main.tsx           # Entry point
│   │   ├── pages/             # Page components
│   │   ├── components/        # React components
│   │   │   ├── chat/          # Chat UI (ChatCore, MessageList, etc.)
│   │   │   ├── modals/        # TraceModal, FeedbackModal
│   │   │   └── layout/        # MainLayout, Sidebar, TopBar
│   │   ├── contexts/          # React state (user, agents, theme)
│   │   └── lib/               # Types and utilities
│   ├── index.html             # Vite entry point
│   └── vite.config.ts         # Vite configuration
├── config/
│   └── app.json                # Agents, branding, dashboard config
├── scripts/                     # setup, start_dev, deploy, fix, check
├── alembic/                     # Database migrations
└── app.yaml                     # Databricks Apps deployment config
```

## Quick Start

### Prerequisites
- Python 3.11+ with [uv](https://docs.astral.sh/uv/) package manager
- [Bun](https://bun.sh/) (or Node.js 18+ with npm)
- Databricks workspace with a Model Serving endpoint

### Setup

```bash
# 1. Clone and enter the project
git clone <repo-url>
cd databricks-genai-app-template

# 2. Configure your agent in config/app.json
#    Set endpoint_name to your Databricks serving endpoint

# 3. Start development servers
./scripts/start_dev.sh
```

Open **http://localhost:3000** - the chat interface connects to your agent.

## Configuration

### Environment Variables (`.env.local`)

```bash
# Required for local development
DATABRICKS_HOST=https://your-workspace.cloud.databricks.com
DATABRICKS_TOKEN=dapi...your-token...

# Optional: PostgreSQL persistence (Databricks Lakebase)
LAKEBASE_PG_URL=postgresql://user:pass@host/db?sslmode=require
LAKEBASE_PROJECT_ID=your-project-id  # For UI link to Lakebase
```

### Agent Configuration (`config/app.json`)

```json
{
  "agents": [
    {
      "mas_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      "question_examples": ["What can you help me with?"]
    },
    {
      "endpoint_name": "your-agent-endpoint",
      "display_name": "My Agent",
      "question_examples": ["Example question for this agent"],
      "mlflow_experiment_id": "123456789"
    }
  ],
  "branding": {
    "name": "My Company",
    "logo": "/logos/logo.svg"
  }
}
```

### Branding & Theming

- **Logo**: Place your logo in `client/public/logos/` and update `branding.logo` in config
- **Colors/Fonts**: Click "Edit" button in top-right of the app to customize in real-time
- **Code changes**: Modify `client/tailwind.config.ts` for deep customization

## Chat Storage

### In-Memory (Default)
- No configuration needed
- Max 10 chats per user (oldest auto-deleted)
- Data lost on restart
- Good for development and demos

### PostgreSQL via Lakebase (Production)

Set `LAKEBASE_PG_URL` in your environment to enable persistent storage:

```bash
LAKEBASE_PG_URL=postgresql://user:pass@host.database.cloud.databricks.com/db?sslmode=require
```

Migrations run automatically on startup. The UI shows storage status in the chat sidebar.

## Customizing the Template

### Adding a New Agent

1. Deploy your agent to a Databricks Model Serving endpoint
2. Add it to `config/app.json`:
   ```json
   {
     "agents": [
       {
         "endpoint_name": "my-new-agent",
         "display_name": "New Agent",
         "tools": [...]
       }
     ]
   }
   ```
3. Restart the app - the new agent appears in the dropdown

### Modifying the Chat UI

Key components to customize:
- `client/src/components/chat/ChatCore.tsx` - Main chat logic and streaming
- `client/src/components/chat/Message.tsx` - Individual message rendering
- `client/src/components/chat/ChatInput.tsx` - Input box and agent selector

### Adding New Pages

1. Create `client/src/pages/YourPage.tsx`
2. Add route in `client/src/App.tsx`
3. Add navigation in `client/src/components/layout/TopBar.tsx`

### Extending the Backend

**Add new API endpoints:**
```python
# server/routers/your_router.py
from fastapi import APIRouter
router = APIRouter()

@router.get('/your-endpoint')
async def your_endpoint():
    return {"data": "value"}

# Register in server/app.py
from .routers import your_router
app.include_router(your_router.router, prefix='/api')
```

**Add new deployment handlers:**
See `server/services/agents/handlers/` - implement the `BaseDeploymentHandler` interface.

## Deployment to Databricks Apps

```bash
./scripts/deploy.sh
```

This script:
1. Builds the Vite frontend to static files (`client/out/`)
2. Syncs code to your Databricks workspace
3. Deploys using `app.yaml` configuration

### Production Environment

In `app.yaml`, set your production environment:
```yaml
env:
  - name: ENV
    value: production
  - name: DATABRICKS_HOST
    value: "https://your-workspace.cloud.databricks.com"
  # Add LAKEBASE_PG_URL for persistent storage
```

Databricks Apps automatically handles OAuth authentication - no tokens needed in production.

## Development Commands

```bash
./scripts/start_dev.sh   # Start backend (8000) + frontend (3000)
./scripts/fix.sh         # Format code (ruff + prettier)
./scripts/check.sh       # Lint and type check
./scripts/deploy.sh      # Deploy to Databricks Apps
```

## Key Features

- **Streaming Responses** - Real-time SSE streaming with function call notifications
- **MLflow Tracing** - View agent traces and tool calls in the UI
- **User Feedback** - Thumbs up/down logged to MLflow for evaluation
- **Multi-Agent Support** - Agent Bricks MAS flow visualization
- **Chart Rendering** - Agents can return chart data for visualization
- **Theme Customization** - In-app editor for colors, fonts, backgrounds

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **"Agent not found"** | Verify `endpoint_name` in config matches your Databricks endpoint |
| **Auth errors (local)** | Check `DATABRICKS_HOST` and `DATABRICKS_TOKEN` in `.env.local` |
| **Auth errors (prod)** | Verify `DATABRICKS_HOST` in `app.yaml` |
| **Database errors** | Check `LAKEBASE_PG_URL` format, ensure `?sslmode=require` is included |
| **Build failures** | Run `./scripts/fix.sh`, then `uv sync` and `cd client && bun install` |


## License

© 2025 Databricks, Inc. All rights reserved. Subject to the [Databricks License](https://databricks.com/db-license-source).

---

**Questions?** Open a [GitHub issue](https://github.com/databricks-solutions/databricks-genai-app-template/issues).
