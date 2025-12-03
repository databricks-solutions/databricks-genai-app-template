# Configuration Guide

This directory contains all application configuration files. Edit these files to customize your application.

## 📁 Configuration Files

### `app.json` - Application Settings
Contains branding and dashboard configuration.

```json
{
  "branding": {
    "tabTitle": "Your App Name",        // Browser tab title
    "appName": "Your App",              // Application name
    "companyName": "Your Company",      // Shown in top bar
    "description": "App description",   // Meta description
    "logoPath": "/logos/your-logo.svg"  // Logo file path (in client/public/logos/)
  },
  "dashboard": {
    "title": "Dashboard Title",
    "subtitle": "Dashboard subtitle",
    "iframeUrl": "https://your-dashboard-url...",  // Dashboard embed URL
    "showPadding": true                            // Add padding around iframe
  }
}
```

### `agents.json` - Agent Configuration
Defines your AI agents and their endpoints.

```json
{
  "agents": [
    {
      "id": "my-agent-01",                          // Unique ID
      "name": "my-agent",                           // Internal name
      "deployment_type": "databricks-endpoint",     // Type: "databricks-endpoint" or "langchain-agent"
      "endpoint_name": "my-endpoint-name",          // Databricks endpoint name (not full URL)
      "display_name": "My Agent",                   // Shown in UI
      "display_description": "Agent description",
      "chat_title": "Chat with Agent",
      "chat_subtitle": "Agent subtitle",
      "llm": "databricks-claude-sonnet-4/",
      "tools": [                                    // Tools available to this agent
        {
          "display_name": "Tool Name",
          "type": "Genie Room",                     // Tool type badge
          "display_description": "What this tool does",
          "url": "https://link-to-tool..."        // Link to tool resource
        }
      ],
      "mlflow_experiment_id": "123...",           // MLflow experiment ID
      "mlflow_experiment_url": "https://...",
      "mlflow_traces_url": "https://..."
    }
  ]
}
```

**Agent Deployment Types:**
- `databricks-endpoint`: External Databricks serving endpoint (currently supported)
- `langchain-agent`: Built-in LangChain agent (not yet implemented)

### `about.json` - About Page Content
Configures the About page content.

```json
{
  "title": "About Your App",
  "subtitle": "Optional subtitle",
  "videoUrl": "/videos/intro.mp4",          // Optional video (in client/public/videos/)
  "sections": [
    {
      "heading": "Section Title",
      "content": "Section content...",
      "bullets": [                           // Optional bullet points
        "Feature 1",
        "Feature 2"
      ]
    }
  ],
  "images": [                                // Optional images (in client/public/images/)
    "/images/screenshot-1.png",
    "/images/screenshot-2.png"
  ],
  "footer": "Footer text"
}
```

## 🖼️ Static Assets

Place your images, logos, and videos in:
- `/client/public/logos/` - Logo files
- `/client/public/images/` - Screenshots, images
- `/client/public/videos/` - Video files

Reference them in config files using paths like: `/logos/my-logo.svg`

## 🔐 Secrets

**Never put secrets in config files!** Use `.env.local` in the project root:

```bash
DATABRICKS_HOST=https://your-workspace...
DATABRICKS_TOKEN=dapi...
```

## ✅ Quick Setup Checklist

1. ✏️ Edit `app.json` - Update branding and dashboard URL
2. ✏️ Edit `agents.json` - Configure your agent endpoint(s)
3. ✏️ Edit `about.json` - Customize about page content
4. 📁 Add your logo to `/client/public/logos/`
5. 🔐 Add credentials to `/.env.local`
6. 🚀 Run `./start_dev.sh`

## 🔄 Reloading Configuration

Configuration is loaded at server startup. To reload:
1. Make your changes to config files
2. Restart the server (Ctrl+C, then `./start_dev.sh` again)

Frontend automatically fetches the updated configuration on page load.
