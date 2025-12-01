# Databricks AI Chat Interface - Frontend Application

A modern, themeable React/Next.js frontend for AI-powered chat applications with Databricks integration.

## 🎯 Overview

This is a frontend-only (for now) application designed for AI chat interfaces. It features a sophisticated theme system, real-time chat interface, data visualization capabilities, and is ready to connect to Databricks backend APIs.

### Key Features

- **🎨 Advanced Theme System** - 4 predefined themes + unlimited custom themes with live preview
- **💬 Real-time Streaming Chat** - AI Agent responses stream in real-time with typing effect
- **📊 Data Visualization** - Built-in chart rendering (line, bar, pie, scatter)
- **🔍 MLflow Trace Integration** - Complete execution traces with tool calls, tokens, and timing
- **🎯 Multi-Agent Support** - Select from multiple configured AI agents
- **♿ Accessibility** - WCAG AAA compliant color contrast

---

## 📁 Project Structure

```
ui/
├── app/                          # Next.js app router
│   ├── api/                      # API route handlers (mock implementations)
│   │   ├── chat/                 # Chat endpoint
│   │   ├── chats/                # Chat history CRUD
│   │   ├── feedback/             # User feedback
│   │   ├── trace/                # Execution traces
│   │   └── brand/                # Theme generation
│   ├── layout.tsx                # Root layout with ThemeProvider
│   └── page.tsx                  # Main application page
│
├── components/                   # React components
│   ├── about/                    # About page view
│   ├── background/               # 3D particle background (Three.js)
│   ├── chat/                     # Chat interface components
│   │   ├── ChatView.tsx          # Main chat container
│   │   ├── ChatInput.tsx         # Message input with agent selector
│   │   ├── MessageList.tsx       # Message history display
│   │   ├── Message.tsx           # Individual message component
│   │   └── ChartRenderer.tsx     # Data visualization renderer
│   ├── dashboard/                # Dashboard view
│   ├── layout/                   # Layout components
│   │   ├── TopBar.tsx            # Navigation and branding
│   │   ├── Sidebar.tsx           # Chat history sidebar
│   │   └── MainContent.tsx       # Main content area router
│   ├── modals/                   # Modal dialogs
│   │   ├── EditModePanel.tsx     # Theme customization panel
│   │   ├── FeedbackModal.tsx     # User feedback modal
│   │   └── TraceModal.tsx        # Execution trace viewer
│   ├── tools/                    # Tools page view
│   └── ui/                       # Reusable UI primitives
│
├── contexts/                     # React contexts
│   └── ThemeContext.tsx          # Global theme state & management
│
├── lib/                          # Utility libraries
│   ├── api.ts                    # **🔌 BACKEND INTEGRATION POINT**
│   ├── chat-storage.ts           # LocalStorage chat persistence
│   ├── types.ts                  # TypeScript type definitions
│   ├── config.ts                 # App configuration
│   └── utils.ts                  # Utility functions
│
├── public/                       # Static assets
│   ├── logos/                    # Brand logos
│   ├── metadata/                 # Agent & tool configurations
│   │   ├── agents.json           # Available AI agents
│   │   └── tools.json            # Databricks tools
│   └── content/                  # Page content
│       └── about.json            # About page content
│
└── styles/                       # Global styles
    ├── theme.css                 # Theme CSS variables
    └── textures.css              # Background textures
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18.0 or higher
- **npm** or **yarn**

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd ui

# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

### Build for Production

```bash
# Create optimized production build
npm run build

# Start production server
npm start
```

---

## 🔌 Backend Integration

### Overview

The application is now connected to **Databricks AI agents** through serving endpoints. The chat interface dynamically loads available agents from configuration and routes messages to their respective endpoints.

### Current State

**✅ Agent Integration Active** - The application now:
- Loads agents from `public/metadata/agents.json`
- Allows users to select different agents in the chat interface
- Routes messages to Databricks serving endpoints
- Falls back to mock responses if no Databricks token is configured

### Environment Variables

Create a `.env.local` file in the `ui` directory:

```bash
# Required for Databricks agent integration
DATABRICKS_TOKEN=your_databricks_personal_access_token
```

**To get your Databricks token:**
1. Go to your Databricks workspace
2. Click your profile icon → "User Settings"
3. Navigate to "Access Tokens" or "Developer" section
4. Generate a new personal access token
5. Copy and paste it in your `.env.local` file

**Note:** 
- The Databricks workspace URL is automatically extracted from the `endpoint_url` in your `agents.json`, so you don't need to set it separately
- Without the token, the app will still work but use mock responses (useful for UI development)

See `CONFIGURATION.md` for detailed setup instructions.

### Integration Architecture

**Files involved:**
- `app/api/chat/route.ts` - Main chat endpoint that calls Databricks agents
- `app/api/agents/route.ts` - API to serve agent metadata
- `public/metadata/agents.json` - Agent configuration (endpoints, tools, display info)
- `components/chat/ChatInput.tsx` - Agent selector dropdown
- `components/chat/ChatView.tsx` - Passes selected agent to API

### Agent Configuration Format

Edit `public/metadata/agents.json` to add or modify agents:

```json
{
  "agents": [
    {
      "id": "unique-agent-id",
      "name": "agent_system_name",
      "display_name": "Friendly Display Name",
      "display_description": "What this agent does",
      "endpoint_url": "https://your-workspace.databricks.net/serving-endpoints/your-endpoint/invocations",
      "llm": "model-name",
      "tools": [
        {
          "display_name": "Tool Name",
          "display_description": "What it does",
          "url": "https://..."
        }
      ],
      "mlflow_experiment_id": "experiment-id",
      "mlflow_experiment_url": "https://...",
      "mlflow_traces_url": "https://..."
    }
  ]
}
```

### Integration Steps (Completed)

✅ 1. **Agent Selection** - Users can select different agents from dropdown
✅ 2. **Dynamic Routing** - Messages route to selected agent's endpoint
✅ 3. **Databricks API Calls** - Real API integration with error handling
✅ 4. **Graceful Fallback** - Mock responses when token not configured

### Streaming & MLflow Tracing

✅ **Full streaming with comprehensive tracing** - The application:

**Real-Time Streaming:**
- ⚡ Streams responses directly to browser (SSE)
- ⌨️ Displays text as it's generated (typing effect)
- 🔧 Shows function calls as they execute
- 📡 Zero buffering - text appears immediately

**Comprehensive Trace Analysis:**
- 📊 Fetches complete MLflow traces after stream completes
- 🔍 Displays execution metrics as interactive badges:
  - ⏱️ Total execution time
  - ⚡ Token usage (input + output)
  - 🔧 Tools called with details
  - 💾 Documents retrieved
- 🔬 Detailed trace viewer with hierarchical span tree
- 📈 Performance analysis and timing breakdown

**How It Works:**
1. Server forwards Databricks agent stream to client
2. Client displays text deltas in real-time
3. Server accumulates data for storage
4. After stream: server fetches complete MLflow trace
5. Trace summary sent to client as final event
6. Full message + trace saved to chat history

**Environment Variable Required:**
```bash
DATABRICKS_TOKEN=your_personal_access_token
```

The Databricks host is automatically extracted from your agent endpoints in `agents.json`.

See `MLFLOW_INTEGRATION.md` and `STREAMING_FORMAT.md` for technical details.

### Future Enhancements

- [ ] Parse visualizations from agent responses
- [ ] Show tool execution progress indicators in UI
- [x] Stream responses to client in real-time ✅
- [x] Add token usage tracking ✅
- [ ] Enhanced error messages for users
- [ ] Trace comparison across multiple runs
- [ ] Export traces for analysis

## 🎨 Theme System

### Architecture

The theme system is built with **smart auto-derivation** for maximum consistency with minimal configuration.

**User Editable Settings (7 colors):**
- Text Heading, Primary, Muted
- Brand Accent Primary
- Background Primary, Secondary
- Border

**Auto-Derived (20+ colors):**
- Accent Secondary (hover states)
- Accent Particles (animated background)
- Background Tertiary & Elevated
- Chat message backgrounds
- Icon colors
- Chart colors
- Scrollbar
- And more...

### Predefined Themes

**Location:** `components/modals/EditModePanel.tsx` (lines 14-193)

1. **Default** - Navy and warm neutrals (light)
2. **Deep Ocean Dark** - Dark with cyan accents
3. **Night Red (Netflix)** - Dark with red accents
4. **Night Green (Spotify)** - Dark with green accents

### Custom Themes

Users can create unlimited custom themes through the UI:
1. Click the Edit icon (top right)
2. Go to "Customize" tab
3. Modify colors, fonts, animations
4. Save as custom theme

**Storage:** Browser `localStorage` (key: `customThemes`)

### Adding New Predefined Themes

Edit `components/modals/EditModePanel.tsx`:

```typescript
const predefinedThemes = [
  // ... existing themes
  {
    id: 'my-theme',
    name: 'My Theme',
    description: 'Cool new theme',
    colors: {
      textHeading: '#...',
      textPrimary: '#...',
      textMuted: '#...',
      accentPrimary: '#...',
      bgPrimary: '#...',
      bgSecondary: '#...',
      border: '#...',
      // Status colors (required but not user-editable)
      success: '#10B981',
      successHover: '#D1FAE5',
      error: '#EF4444',
      errorHover: '#FEE2E2',
      info: '#3B82F6',
      infoHover: '#DBEAFE',
      warning: '#F59E0B',
      warningHover: '#FEF3C7',
    },
    typography: {
      primaryFont: '"Your Font", sans-serif',
      secondaryFont: '"Body Font", sans-serif'
    },
    animatedBackground: {
      particleCount: 60,
      connectionDistance: 60,
      particleOpacity: 0.6,
      lineOpacity: 0.4,
      particleSize: 3,
      lineWidth: 1.2,
      animationSpeed: 0.8
    }
  }
]
```

---

## 📊 Data Visualization

### Supported Chart Types

The `ChartRenderer` is to be defined / improved as part of building the backend.

### Adding Charts to Responses

Based on intelligent parsing of AI Agent's responses.

---

## 🔧 Configuration

### App Configuration

**File:** `lib/config.ts`

```typescript
export const appConfig = {
  branding: {
    companyName: 'Your Company',
    logoPath: '/logos/your-logo.svg',
  },
  features: {
    enableFeedback: true,
    enableTraces: true,
    enableThemeCustomization: true,
  },
  defaults: {
    agentId: 'default-agent',
  }
}
```

### Agent Configuration

**File:** `public/metadata/agents.json`

```json
{
  "agents": [
    {
      "id": "data-analyst",
      "display_name": "Data Analyst",
      "display_description": "Expert in data analysis and visualization",
      "tools": [...]
    }
  ]
}
```

### Tools Configuration

**File:** `public/metadata/tools.json`

Configure Databricks tools displayed in the Tools page.

---

## 🎯 Type Definitions

### Core Types

**File:** `lib/types.ts`

```typescript
// Chat message
interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  traceId?: string
  visualizations?: Visualization[]
}

// Chat session
interface Chat {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
}

// Execution trace
interface TraceSpan {
  name: string
  duration: number
  type: 'llm' | 'retrieval' | 'tool' | 'chain'
  input?: any
  output?: any
  children?: TraceSpan[]
}

// Data visualization
interface Visualization {
  type: 'line' | 'bar' | 'pie' | 'scatter'
  data: {
    labels: string[]
    datasets: {
      label: string
      data: number[]
      borderColor?: string
      backgroundColor?: string
    }[]
  }
  options?: any
}
```

---

## 🧪 Development

### Available Scripts

```bash
# Development server with hot reload
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint

# Production build
npm run build

# Start production server
npm start
```

### Code Style

- **TypeScript** for type safety
- **ESLint** for code quality
- **Prettier** for formatting (optional)
- **CSS Modules** + **Tailwind** for styling

---

## 📦 Dependencies

### Core
- **Next.js 15** - React framework
- **React 18** - UI library
- **TypeScript** - Type safety

### UI & Styling
- **Tailwind CSS** - Utility-first CSS
- **Lucide React** - Icon library
- **Three.js** - 3D backgrounds
- **Chart.js** - Data visualization

### Utilities
- **date-fns** - Date formatting
- **react-chartjs-2** - Chart.js wrapper

---

## 🐛 Troubleshooting

### Build Warnings

Some ESLint warnings about unused variables in `lib/api.ts` are **intentional**. These are parameters that will be used when you integrate with your real backend.

### Port Already in Use

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 npm run dev
```

### Theme Not Applying

1. Check browser console for errors
2. Clear localStorage: `localStorage.clear()`
3. Hard refresh: Cmd/Ctrl + Shift + R
