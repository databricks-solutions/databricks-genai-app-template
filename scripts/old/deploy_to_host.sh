#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# Define host directory
HOST_DIR="/Users/mehdi.lamrani/code/dbdemos-genai"
FRONTEND_TARGET="$HOST_DIR/public/assistant-app"
BACKEND_TARGET="$HOST_DIR/agent_app_backend"

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CLIENT_DIR="$PROJECT_ROOT/client"
SERVER_DIR="$PROJECT_ROOT/server"

echo "============================================================================"
echo "🚀 Deploying Assistant Template App to dbdemos-genai"
echo "============================================================================"
echo ""
echo "ℹ️  Project root: $PROJECT_ROOT"
echo "ℹ️  Host directory: $HOST_DIR"
echo ""

# 1. Build the React frontend
echo "📦 Building React frontend..."
cd "$CLIENT_DIR"
bun x vite build --outDir build
echo "✅ Frontend build complete"
echo ""

# 2. Copy frontend to host
echo "📂 Copying frontend to host..."
rm -rf "$FRONTEND_TARGET"
mkdir -p "$FRONTEND_TARGET"
cp -R "$CLIENT_DIR/build/"* "$FRONTEND_TARGET/"
echo "✅ Frontend copied to $FRONTEND_TARGET"
echo ""

# 3. Copy backend to host
echo "📂 Copying backend to host..."
rm -rf "$BACKEND_TARGET"
mkdir -p "$BACKEND_TARGET"
cp -R "$SERVER_DIR/"* "$BACKEND_TARGET/"
echo "✅ Backend copied to $BACKEND_TARGET"
echo ""

# 4. Copy .env.local if it exists
if [ -f "$PROJECT_ROOT/.env.local" ]; then
  echo "🔐 Copying .env.local to backend..."
  cp "$PROJECT_ROOT/.env.local" "$BACKEND_TARGET/.env.local"
  echo "✅ Environment file copied"
else
  echo "⚠️  No .env.local found - backend will use environment variables"
fi
echo ""

echo "============================================================================"
echo "✅ Deployment Complete!"
echo "============================================================================"
echo ""
echo "Frontend deployed to: $FRONTEND_TARGET"
echo "Backend deployed to:  $BACKEND_TARGET"
echo ""
echo "Next steps:"
echo "  1. cd $HOST_DIR"
echo "  2. ./watch.sh"
echo "  3. Open http://localhost:5173/api/agent-app/"
echo ""

