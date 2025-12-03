#!/bin/bash

echo "🧪 Testing Environment Variable Loading"
echo ""

# Test loading
if [ -f .env.local ]; then
  set -a
  source .env.local
  set +a

  echo "✅ .env.local sourced"
  echo ""
  echo "Variables found:"
  echo "  DATABRICKS_HOST: ${DATABRICKS_HOST:0:40}..."
  echo "  DATABRICKS_TOKEN: ${DATABRICKS_TOKEN:0:15}..."
  echo ""

  if [ -n "$DATABRICKS_HOST" ] && [ -n "$DATABRICKS_TOKEN" ]; then
    echo "✅ Both variables are set correctly!"
    echo ""
    echo "Local development mode will be detected correctly."
  else
    echo "❌ Variables are missing!"
  fi
else
  echo "❌ .env.local not found!"
fi
