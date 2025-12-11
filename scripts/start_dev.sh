#!/bin/bash

BACKEND_PORT=8000
FRONTEND_PORT=3000

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Starting Development Servers"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Backend (FastAPI):  http://localhost:$BACKEND_PORT"
echo "Frontend (Next.js): http://localhost:$FRONTEND_PORT"
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

# Load environment variables from .env.local
if [ -f .env.local ]; then
  echo "📝 Loading environment variables from .env.local..."
  # Use set -a to automatically export all variables, then source the file
  set -a
  source .env.local
  set +a
  echo "✅ Environment variables loaded (DATABRICKS_HOST set: ${DATABRICKS_HOST:+yes})"
else
  echo "⚠️  Warning: .env.local not found"
fi

echo ""

# Activate virtual environment
if [ ! -d ".venv" ]; then
    echo "❌ Virtual environment not found"
    echo "Run: ./scripts/setup.sh"
    exit 1
fi
source .venv/bin/activate

# Start FastAPI backend in background
echo "🔧 Starting FastAPI backend on port $BACKEND_PORT..."
uvicorn server.app:app --reload --port $BACKEND_PORT &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 3

# Start Next.js frontend in background
echo "🎨 Starting Next.js frontend on port $FRONTEND_PORT..."
cd client && npm run dev -- -p $FRONTEND_PORT &
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
