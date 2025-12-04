#!/bin/bash

# Deploy to Databricks Apps
# Requires DATABRICKS_APP_NAME and LHA_SOURCE_CODE_PATH in .env.local

set -e

# Load environment variables from .env.local if it exists.
if [ -f .env.local ]
then
  set -a
  source .env.local
  set +a
fi

# If LHA_SOURCE_CODE_PATH is not set throw an error.
if [ -z "$LHA_SOURCE_CODE_PATH" ]
then
  echo "LHA_SOURCE_CODE_PATH is not set. Please set to the /Workspace/Users/{username}/{lha-name} in .env.local."
  exit 1
fi

if [ -z "$DATABRICKS_APP_NAME" ]
then
  echo "DATABRICKS_APP_NAME is not set. Please set to the name of the app in .env.local."
  exit 1
fi

if [ -z "$DATABRICKS_CONFIG_PROFILE" ]
then
  DATABRICKS_CONFIG_PROFILE="DEFAULT"
fi

# Authenticate with Databricks CLI using the host from environment
if [ -n "$DATABRICKS_HOST" ]
then
  echo "Authenticating with Databricks at $DATABRICKS_HOST..."
  databricks auth login --host "$DATABRICKS_HOST"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Building Application"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Generate requirements.txt from pyproject.toml
echo "🐍 Generating requirements.txt from pyproject.toml..."
uv run python scripts/generate_server_requirements.py

# Build Next.js frontend
echo "🎨 Building Next.js frontend..."
cd client && BROWSER=none npm run build && cd ..

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Deploying to Databricks Apps"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Sync code to workspace
echo "📤 Syncing code to workspace..."
databricks sync . "$LHA_SOURCE_CODE_PATH" \
  --profile "$DATABRICKS_CONFIG_PROFILE"

# Deploy app
echo ""
echo "🎯 Deploying app: $DATABRICKS_APP_NAME..."
databricks apps deploy $DATABRICKS_APP_NAME \
  --source-code-path "$LHA_SOURCE_CODE_PATH" \
  --profile "$DATABRICKS_CONFIG_PROFILE"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Deployment Complete"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verify deployment
echo "📊 Verifying deployment..."
APP_STATUS=$(databricks apps list --profile "$DATABRICKS_CONFIG_PROFILE" | grep "$DATABRICKS_APP_NAME" || echo "")

if [ -n "$APP_STATUS" ]; then
  echo "✅ App is deployed"
  echo ""
  echo "$APP_STATUS"
  echo ""
  echo "📋 Next Steps:"
  echo ""
  echo "  1. Access App:"
  echo "     • Navigate to Compute → Apps in Databricks workspace"
  echo "     • Click '$DATABRICKS_APP_NAME' to open the app"
  echo ""
  echo "  2. Monitor App:"
  echo "     • Logs: Click 'Logs' tab or visit {app-url}/logz"
  echo "     • Health: Visit {app-url}/api/health"
  echo ""
  echo "  3. Test Functionality:"
  echo "     • Send a test message in the chat interface"
  echo "     • Verify agent responses and markdown rendering"
  echo "     • Check logs for any errors"
  echo ""
else
  echo "⚠️  App not found - deployment may have failed"
  echo ""
  echo "Debugging steps:"
  echo "  1. Run: databricks apps list --profile $DATABRICKS_CONFIG_PROFILE"
  echo "  2. Verify DATABRICKS_APP_NAME in .env.local"
  echo "  3. Check workspace permissions for app deployment"
  echo "  4. Review deployment logs above for errors"
  echo ""
fi
