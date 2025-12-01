#!/bin/bash

set -e


# source .env and .env.local if they exist
# Use set -a to auto-export all variables
if [ -f ".env" ]; then
  echo "Loading .env"
  set -a
  source .env
  set +a
fi
if [ -f ".env.local" ]; then
  echo "Loading .env.local"
  set -a
  source .env.local
  set +a
fi

# Skip interactive login if we have DATABRICKS_HOST and DATABRICKS_TOKEN in env
# The SDK will use these automatically
if [ -z "$DATABRICKS_HOST" ] || [ -z "$DATABRICKS_TOKEN" ]; then
  echo "⚠️  DATABRICKS_HOST or DATABRICKS_TOKEN not set in environment"
  echo "Running databricks auth login..."
  if [ ! -z "$DATABRICKS_CONFIG_PROFILE" ]; then
    databricks auth login --profile $DATABRICKS_CONFIG_PROFILE
  else
    databricks auth login
  fi
else
  echo "✅ Using DATABRICKS_HOST and DATABRICKS_TOKEN from environment"
fi

uv run python -m scripts.make_fastapi_client

pushd client && BROWSER=none bun run dev | cat && popd &
pid[2]=$!

uv run uvicorn server.app:app --reload  --reload-dir server &
pid[1]=$!

uv run watchmedo auto-restart \
  --patterns="*.py" \
  --debounce-interval=1 \
  --no-restart-on-command-exit \
  --recursive \
  --directory=server \
  uv -- run python -m scripts.make_fastapi_client &
pid[0]=$!

# Wait for backend to start and detect which port it's using
sleep 3
if lsof -i :8000 | grep -q LISTEN; then
  BACKEND_PORT=8000
elif lsof -i :8001 | grep -q LISTEN; then
  BACKEND_PORT=8001
  echo "⚠️  Port 8000 was occupied, backend started on port 8001"
else
  BACKEND_PORT=8000
fi

open "http://localhost:$BACKEND_PORT"

# When control+c is pressed, kill all process ids.
trap "pkill -P $$;  exit 1" INT
wait
