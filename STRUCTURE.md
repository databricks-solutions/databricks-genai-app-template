# Project Structure

```
databricks-genai-app-template/
├── README.md                    # Main documentation
├── app.yaml                     # Databricks Apps configuration
├── pyproject.toml               # Python dependencies (uv)
├── uv.lock                      # Dependency lock file
├── env.template                 # Environment variable template
├── requirements.txt             # Generated Python requirements
│
├── server/                      # Python FastAPI backend
│   ├── __init__.py
│   ├── app.py                   # Main FastAPI application
│   ├── tracing.py               # MLflow tracing setup
│   ├── brand_service.py         # Brand customization
│   └── agents/                  # Agent implementations
│       ├── databricks_assistant/
│       │   ├── agent.py         # LangChain agent
│       │   ├── tools.py         # Unity Catalog tools
│       │   └── auth.py          # Authentication
│       ├── model_serving.py
│       └── table_parser.py
│
├── client/                      # React frontend (Vite)
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   ├── queries/
│   │   └── fastapi_client/      # Auto-generated API client
│   ├── public/
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── scripts/                     # Build & deployment scripts
│   ├── watch.sh                 # Development server
│   ├── deploy.sh                # Deploy to Databricks
│   ├── setup.sh                 # Environment setup
│   ├── fix.sh                   # Code formatting
│   ├── check.sh                 # Health check
│   ├── start_prod.sh            # Production server
│   ├── monitor_deployment.sh    # Monitor deployment
│   ├── make_fastapi_client.py   # Generate TS client
│   ├── generate_semver_requirements.py
│   ├── deploy_to_host.sh
│   └── prepare_for_host.sh
│
├── tests/                       # Test files
│   ├── test_agent.py
│   └── test_agent.sh
│
└── docs/                        # Documentation (gitignored)
    ├── CLAUDE.md                # Claude Code instructions
    ├── DEPLOYMENT.md            # Deployment guide
    ├── BRAND_CUSTOMIZATION.md
    ├── BRAND_INTEGRATION_FOR_HOST.md
    ├── IMPLEMENTATION_SUMMARY.md
    ├── LICENSE.md
    ├── NOTICE.md
    └── SECURITY.md
```

## Key Files

- **Configuration**: `app.yaml`, `env.template`, `pyproject.toml`
- **Development**: `scripts/watch.sh`, `scripts/fix.sh`
- **Deployment**: `scripts/deploy.sh`, `scripts/setup.sh`
- **Testing**: `tests/test_agent.py`
- **Frontend**: `client/src/App.tsx`
- **Backend**: `server/app.py`
