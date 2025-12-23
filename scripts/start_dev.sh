#!/bin/bash

BACKEND_PORT=8000
FRONTEND_PORT=3000

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Starting Development Servers"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ============================================================
# Check Required Dependencies
# ============================================================

MISSING_DEPS=()
INSTALL_COMMANDS=()

# Check for uv (Python package manager)
if ! command -v uv &> /dev/null; then
  MISSING_DEPS+=("uv")
  INSTALL_COMMANDS+=("curl -LsSf https://astral.sh/uv/install.sh | sh")
fi

# Check for bun (JavaScript runtime)
# Check both in PATH and in default installation location
if ! command -v bun &> /dev/null && [ ! -f "$HOME/.bun/bin/bun" ]; then
  MISSING_DEPS+=("bun")
  INSTALL_COMMANDS+=("curl -fsSL https://bun.sh/install | bash")
elif ! command -v bun &> /dev/null && [ -f "$HOME/.bun/bin/bun" ]; then
  # Bun is installed but not in PATH, add it
  export PATH="$HOME/.bun/bin:$PATH"
fi

# If there are missing dependencies, prompt user
if [ ${#MISSING_DEPS[@]} -gt 0 ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📦 Missing Required Dependencies"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "The following tools are required but not installed:"
  echo ""
  for i in "${!MISSING_DEPS[@]}"; do
    echo "  ❌ ${MISSING_DEPS[$i]}"
    echo "     Install: ${INSTALL_COMMANDS[$i]}"
    echo ""
  done

  read -p "Would you like to install them now? (y/N) " -n 1 -r
  echo ""

  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    for i in "${!MISSING_DEPS[@]}"; do
      echo "📥 Installing ${MISSING_DEPS[$i]}..."
      eval "${INSTALL_COMMANDS[$i]}"
      if [ $? -eq 0 ]; then
        echo "✅ ${MISSING_DEPS[$i]} installed successfully"
      else
        echo "❌ Failed to install ${MISSING_DEPS[$i]}"
        exit 1
      fi
      echo ""
    done

    # Reload shell environment to pick up new installations
    echo "🔄 Reloading shell environment..."
    export PATH="$HOME/.local/bin:$HOME/.bun/bin:$PATH"
    echo ""
  else
    echo ""
    echo "Please install the missing dependencies and try again."
    exit 1
  fi
fi

echo "✅ All dependencies installed (uv, bun)"
echo ""

# ============================================================
# Check Frontend Dependencies (Vite)
# ============================================================

# Ensure bun is in PATH for the checks below
if [ -f "$HOME/.bun/bin/bun" ]; then
  export PATH="$HOME/.bun/bin:$PATH"
fi

# Check if Vite and other frontend dependencies are installed
if [ ! -d "client/node_modules" ] || [ ! -d "client/node_modules/vite" ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📦 Frontend Dependencies Not Installed"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Vite and other frontend dependencies need to be installed."
  echo ""

  read -p "Would you like to install them now? (y/N) " -n 1 -r
  echo ""

  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "📥 Installing frontend dependencies with bun..."
    cd client && bun install
    if [ $? -eq 0 ]; then
      echo "✅ Frontend dependencies installed successfully"
      cd ..
    else
      echo "❌ Failed to install frontend dependencies"
      exit 1
    fi
    echo ""
  else
    echo ""
    echo "Please install frontend dependencies manually:"
    echo "  cd client && bun install"
    exit 1
  fi
fi

echo "✅ Frontend dependencies installed (vite)"
echo ""

# ============================================================
# Environment Configuration
# ============================================================

# Check if .env.local exists, if not create from template
if [ ! -f .env.local ]; then
  if [ -f .env.template ]; then
    echo "📋 Creating .env.local from .env.template..."
    cp .env.template .env.local
    echo "✅ Created .env.local"
    echo ""
  else
    echo "❌ Error: .env.template not found"
    exit 1
  fi
fi

# Load environment variables from .env.local
echo "📝 Loading environment variables from .env.local..."
set -a
source .env.local
set +a

# Check required credentials
# Note: More authentication methods coming soon (OAuth, service principals, etc.)
if [ -z "$DATABRICKS_HOST" ] || [ -z "$DATABRICKS_TOKEN" ]; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "❌ Missing Databricks credentials"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Please edit .env.local and set the following:"
  echo ""
  echo "  DATABRICKS_HOST=https://your-workspace.cloud.databricks.com"
  echo "  DATABRICKS_TOKEN=dapi..."
  echo ""
  echo "To generate a Personal Access Token:"
  echo "  1. Go to your Databricks workspace"
  echo "  2. Click on your profile (top-right) > Settings"
  echo "  3. Developer > Access tokens > Generate new token"
  echo ""
  echo "More authentication methods coming soon."
  echo ""
  exit 1
fi

echo "✅ Databricks credentials configured"
echo ""
echo "Backend (FastAPI):  http://localhost:$BACKEND_PORT"
echo "Frontend (Vite):    http://localhost:$FRONTEND_PORT"
echo ""
echo "Press Ctrl+C to stop both servers"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Function to kill process on a port
kill_port() {
  local port=$1
  local pids=$(lsof -ti :$port 2>/dev/null)
  if [ -n "$pids" ]; then
    echo "⚠️  Port $port is in use. Killing existing processes..."
    echo "$pids" | xargs kill -9 2>/dev/null
    sleep 1
    echo "✅ Port $port cleared"
  fi
}

# Clear ports before starting
echo "🔍 Checking ports..."
kill_port $BACKEND_PORT
kill_port $FRONTEND_PORT
echo ""

# Activate virtual environment
if [ ! -d ".venv" ]; then
    echo "❌ Virtual environment not found"
    echo "Run: ./scripts/setup.sh"
    exit 1
fi
source .venv/bin/activate

# Start FastAPI backend in background
# --reload-include watches config/*.json for changes
echo "🔧 Starting FastAPI backend on port $BACKEND_PORT..."
uvicorn server.app:app --reload --reload-include "config/*.json" --port $BACKEND_PORT &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 3

# Start Vite frontend in background
echo "🎨 Starting Vite frontend on port $FRONTEND_PORT..."
cd client && bun run dev &
FRONTEND_PID=$!

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

# Trap Ctrl+C and cleanup
trap cleanup INT TERM

# Wait for both processes
wait
