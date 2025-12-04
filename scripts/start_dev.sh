#!/bin/bash

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Starting Development Servers"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Backend (FastAPI):  http://localhost:8000"
echo "Frontend (Next.js): http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
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
echo "🔧 Starting FastAPI backend on port 8000..."
uvicorn server.app:app --reload --port 8000 &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 3

# Start Next.js frontend in background
echo "🎨 Starting Next.js frontend on port 3000..."
cd client && npm run dev &
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
