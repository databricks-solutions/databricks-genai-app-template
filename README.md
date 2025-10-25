# Databricks GenAI App Template

A production-ready template for building and deploying AI agents with Databricks Apps. Features MLflow tracing, a modern React chat interface, and flexible deployment options including host app integration.

## Quick Start

```bash
git clone https://github.com/databricks-solutions/databricks-genai-app-template.git
cd databricks-genai-app-template
./setup.sh    # Configure your environment
./watch.sh    # Start dev servers
```

Open **http://localhost:8000** - you'll have a working chat interface!

## Features

- **LangChain Agent** - Explores and queries Databricks Unity Catalog
- **MLflow Tracing** - Monitor every agent interaction
- **Modern Chat UI** - Markdown rendering, chart visualization, multi-endpoint support
- **Hot Reload** - Fast development cycle for both frontend and backend
- **Runtime Config** - Change endpoints without rebuilding
- **Host App Integration** - Deploy as standalone component in other React apps

## Installation

### Prerequisites

- Python 3.12+
- Databricks workspace with Unity Catalog
- MLflow experiment (or it will create one)

### Install Dependencies

```bash
# macOS
brew install uv bun

# Linux
curl -LsSf https://astral.sh/uv/install.sh | sh
curl -fsSL https://bun.sh/install | bash
```

### Configuration

Run the interactive setup or set environment variables:

```bash
export DATABRICKS_HOST="your-workspace.cloud.databricks.com"
export DATABRICKS_TOKEN="dapi..."
export MLFLOW_EXPERIMENT_ID="1234567890"
```

See [`env.template`](env.template) for all options.

## Development

```bash
./watch.sh              # Start dev servers with hot reload
./test_agent.sh        # Test agent without full UI
./fix.sh               # Format code
./check.sh             # Run quality checks
```

## Deployment

**Deploy to Databricks Apps:**

```bash
./deploy.sh
```

**Integrate into another React app:**

```bash
./scripts/prepare_for_host.sh /path/to/host-app/public/agent-monitoring
```

This creates a self-contained build with runtime configuration. See [`DEPLOYMENT.md`](DEPLOYMENT.md) for details.

## Customization

### Add Tools to the Agent

Edit `server/agents/databricks_assistant/tools.py`:

```python
@tool
def my_custom_tool(param: str) -> str:
    """Your tool description."""
    return result
```

### Add UI Components

```bash
bunx --bun shadcn@latest add dialog
```

Components use shadcn/ui with Tailwind CSS.

## Project Structure

```
├── server/                 # FastAPI backend
│   ├── agents/            # Agent implementations
│   ├── app.py             # Main app
│   └── tracing.py         # MLflow setup
├── client/                # React frontend
│   ├── src/
│   │   ├── App.tsx        # Chat interface
│   │   ├── config.ts      # Runtime config
│   │   └── components/    # UI components
└── scripts/               # Build & deploy scripts
```

## Troubleshooting

- **MLflow experiment not found** - App auto-creates one if ID is invalid
- **Port in use** - Run `pkill -f uvicorn` or `pkill -f vite`
- **Auth errors** - Verify `DATABRICKS_HOST` and `DATABRICKS_TOKEN`

More help in [`CLAUDE.md`](CLAUDE.md).

## How to get help

Databricks support doesn't cover this content. For questions or bugs, please open a GitHub issue and the team will help on a best effort basis.

## License

© 2025 Databricks, Inc. All rights reserved. The source in this notebook is provided subject to the Databricks License [https://databricks.com/db-license-source]. All included or referenced third party libraries are subject to the licenses set forth below.

| library      | description                         | license    | source                                      |
| ------------ | ----------------------------------- | ---------- | ------------------------------------------- |
| FastAPI      | Modern web framework for APIs       | MIT        | https://github.com/tiangolo/fastapi         |
| React        | JavaScript library for UIs          | MIT        | https://github.com/facebook/react           |
| LangChain    | Framework for LLM applications      | MIT        | https://github.com/langchain-ai/langchain   |
| MLflow       | Machine learning lifecycle platform | Apache 2.0 | https://github.com/mlflow/mlflow            |
| Vite         | Frontend build tool                 | MIT        | https://github.com/vitejs/vite              |
| shadcn/ui    | Re-usable components                | MIT        | https://github.com/shadcn-ui/ui             |
| Tailwind CSS | Utility-first CSS framework         | MIT        | https://github.com/tailwindlabs/tailwindcss |
| Recharts     | Composable charting library         | MIT        | https://github.com/recharts/recharts        |

---

**Built by Databricks Solutions Team**
