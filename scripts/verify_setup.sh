#!/bin/bash

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Verifying Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check config files
echo "📁 Checking config files..."
if [ -f "config/app.json" ]; then
  echo "✅ config/app.json exists"
else
  echo "❌ config/app.json missing"
fi

if [ -f "config/agents.json" ]; then
  echo "✅ config/agents.json exists"
else
  echo "❌ config/agents.json missing"
fi

if [ -f "config/about.json" ]; then
  echo "✅ config/about.json exists"
else
  echo "❌ config/about.json missing"
fi

echo ""

# Check environment file
echo "🔐 Checking environment..."
if [ -f ".env.local" ]; then
  echo "✅ .env.local exists"
  if grep -q "DATABRICKS_HOST=" .env.local && grep -q "DATABRICKS_TOKEN=" .env.local; then
    echo "✅ Credentials configured"
  else
    echo "⚠️  Credentials not fully configured"
  fi
else
  echo "❌ .env.local missing"
fi

echo ""

# Check Python dependencies
echo "🐍 Checking Python setup..."
if [ -d ".venv" ]; then
  echo "✅ Virtual environment exists"
else
  echo "❌ Virtual environment missing (run: uv venv)"
fi

echo ""

# Check frontend dependencies
echo "📦 Checking frontend setup..."
if [ -d "client/node_modules" ]; then
  echo "✅ Frontend dependencies installed"
else
  echo "❌ Frontend dependencies missing (run: cd client && npm install)"
fi

echo ""

# Validate JSON files
echo "✔️  Validating JSON syntax..."
python3 -m json.tool config/app.json >/dev/null 2>&1 && echo "✅ config/app.json is valid" || echo "❌ config/app.json has syntax errors"
python3 -m json.tool config/agents.json >/dev/null 2>&1 && echo "✅ config/agents.json is valid" || echo "❌ config/agents.json has syntax errors"
python3 -m json.tool config/about.json >/dev/null 2>&1 && echo "✅ config/about.json is valid" || echo "❌ config/about.json has syntax errors"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Verification complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "To start the servers, run: ./start_dev.sh"
echo ""
