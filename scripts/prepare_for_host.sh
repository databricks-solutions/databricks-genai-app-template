#!/bin/bash

# ============================================================================
# Prepare Agent Monitoring App for Host Integration
# ============================================================================
#
# This script builds the agent monitoring app and prepares it for integration
# into a host React application (e.g., dbdemos-genai).
#
# Usage:
#   ./scripts/prepare_for_host.sh [output_directory]
#
# Arguments:
#   output_directory - Optional. Where to place the built app.
#                      Defaults to ./dist/agent-monitoring-app
#
# The script will:
#   1. Build the React frontend
#   2. Copy the build artifacts to the specified output directory
#   3. Create a sample app_config.json template
#   4. Generate integration instructions
#
# ============================================================================

set -e  # Exit on error

# Color output helpers
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# ============================================================================
# Configuration
# ============================================================================

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
CLIENT_DIR="$PROJECT_ROOT/client"
OUTPUT_DIR="${1:-$PROJECT_ROOT/dist/agent-monitoring-app}"

info "Starting build process..."
info "Project root: $PROJECT_ROOT"
info "Output directory: $OUTPUT_DIR"

# ============================================================================
# Step 1: Build the frontend
# ============================================================================

info "Building React frontend..."
cd "$CLIENT_DIR"

# Check if bun is available, otherwise use npm
if command -v bun &> /dev/null; then
    info "Using bun for build"
    bun run build
elif command -v npm &> /dev/null; then
    info "Using npm for build"
    npm run build
else
    error "Neither bun nor npm found. Please install one of them."
    exit 1
fi

success "Frontend build complete"

# ============================================================================
# Step 2: Prepare output directory
# ============================================================================

info "Preparing output directory: $OUTPUT_DIR"

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Copy build artifacts
info "Copying build artifacts..."
cp -r "$CLIENT_DIR/build/"* "$OUTPUT_DIR/"

success "Build artifacts copied to $OUTPUT_DIR"

# ============================================================================
# Step 3: Create app_config.json template
# ============================================================================

info "Creating app_config.json template..."

cat > "$OUTPUT_DIR/app_config.json.template" << 'EOF'
{
  "endpoints": [
    {
      "displayName": "Your Agent Display Name",
      "endpointName": "your-databricks-endpoint-name",
      "type": "databricks-agent"
    },
    {
      "displayName": "OpenAI Compatible Model",
      "endpointName": "your-openai-compatible-endpoint",
      "type": "openai-chat"
    }
  ],
  "apiBaseUrl": "/api"
}
EOF

success "Created app_config.json.template"

# ============================================================================
# Step 4: Generate integration instructions
# ============================================================================

info "Generating integration instructions..."

cat > "$OUTPUT_DIR/INTEGRATION_GUIDE.md" << 'EOF'
# Agent Monitoring App - Integration Guide

This directory contains the built Agent Monitoring App, ready for integration into a host React application.

## Contents

- `index.html` - Main HTML file
- `assets/` - JavaScript, CSS, and other static assets
- `app_config.json.template` - Template for runtime configuration

## Integration Steps

### 1. Copy Files to Host App

Copy the contents of this directory to your host app's public directory or appropriate location.

For example, if integrating into `dbdemos-genai`:
```bash
cp -r ./* /path/to/dbdemos-genai/public/agent-monitoring/
```

### 2. Configure Endpoints

Create `app_config.json` from the template:

```bash
cp app_config.json.template app_config.json
```

Edit `app_config.json` with your actual Databricks endpoints:

```json
{
  "endpoints": [
    {
      "displayName": "My Agent",
      "endpointName": "my-agent-endpoint-id",
      "type": "databricks-agent"
    }
  ],
  "apiBaseUrl": "/api"
}
```

### 3. Endpoint Types

The app supports two endpoint types:

- **`databricks-agent`**: For Databricks Agent endpoints (uses `input` field format)
- **`openai-chat`**: For OpenAI-compatible endpoints (uses standard chat format)

### 4. Runtime Configuration

The app loads `app_config.json` at runtime from the same directory as `index.html`.
This allows you to:

- Deploy the same build to multiple environments
- Update endpoints without rebuilding
- Generate configuration dynamically from your host app

### 5. Host App Integration Example

#### Static Integration
If you're serving the app as a static route in your host app:

```javascript
// In your host app's router
app.get('/agent-monitoring/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/agent-monitoring/index.html'));
});
```

#### Dynamic Configuration
If you want to generate `app_config.json` dynamically:

```python
# In your host app's backend (Python example)
from fastapi import FastAPI
from fastapi.responses import JSONResponse

app = FastAPI()

@app.get("/agent-monitoring/app_config.json")
async def get_app_config():
    # Generate config based on user's available endpoints
    endpoints = get_user_endpoints()  # Your logic here
    return JSONResponse({
        "endpoints": endpoints,
        "apiBaseUrl": "/api"
    })
```

### 6. Backend API Proxy

The app expects certain API endpoints to be available. Make sure your host app proxies these:

- `POST /api/invoke_endpoint` - Invoke an agent/model endpoint
- `GET /api/tracing_experiment` - Get MLflow experiment info
- `POST /api/log_feedback` - Log user feedback

Example FastAPI integration:

```python
@app.post("/api/invoke_endpoint")
async def invoke_endpoint(request: EndpointRequest):
    # Your existing endpoint invocation logic
    pass
```

## Development Testing

To test the integration locally:

1. Start your host app's backend
2. Configure `app_config.json` with your test endpoints
3. Serve the built app from a web server
4. Open in browser and verify endpoints appear in dropdown

## Troubleshooting

### Endpoints not appearing
- Check browser console for `app_config.json` loading errors
- Verify `app_config.json` is in the same directory as `index.html`
- Check CORS settings if serving from different domains

### API calls failing
- Verify `apiBaseUrl` in `app_config.json` is correct
- Check that backend API endpoints are properly proxied
- Inspect network requests in browser DevTools

### Chart not rendering
- Ensure the agent response includes a markdown table
- Check browser console for any rendering errors
- Verify `recharts` library is properly bundled

## Support

For issues or questions, refer to the main project documentation or open an issue in the repository.
EOF

success "Created INTEGRATION_GUIDE.md"

# ============================================================================
# Step 5: Generate summary
# ============================================================================

echo ""
echo "============================================================================"
success "Build and preparation complete!"
echo "============================================================================"
echo ""
info "Output location: $OUTPUT_DIR"
echo ""
echo "Next steps:"
echo "  1. Review the INTEGRATION_GUIDE.md in the output directory"
echo "  2. Copy the built app to your host application"
echo "  3. Create app_config.json from the template"
echo "  4. Configure your endpoints"
echo ""
info "Files generated:"
ls -lh "$OUTPUT_DIR" | tail -n +2
echo ""
warn "Remember to create app_config.json from the template before deploying!"
echo ""

