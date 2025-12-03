# Authentication Fix - Complete Solution

## Problem Summary
"Running in Databricks Apps mode but no user access token found in headers" error when running locally.

## Root Causes

### 1. Wrong Environment Detection (MAIN ISSUE)
```typescript
// ❌ WRONG - This returns false on server-side
const isLocalDevelopment = isRunningLocally()  // Checks window.location
```

**Why it failed:**
- `isRunningLocally()` checks `window.location.hostname`
- In Next.js API routes (server-side), `window` doesn't exist
- Function returns `false` → app thinks it's in production
- Looks for OAuth headers instead of using local token

### 2. Old Config File Paths
- API routes tried to load `public/metadata/agents.json` (doesn't exist)
- Should load from `/config/agents.json` via backend API

### 3. Old Field Names
- Code used `endpoint_url` field (removed)
- Should use `endpoint_name` + `DATABRICKS_HOST`

---

## Solution Applied

### Fix 1: Correct Environment Detection
```typescript
// ✅ CORRECT - Check for token in environment
const isLocalDevelopment = !!process.env.DATABRICKS_TOKEN
```

**Why this works:**
- On server-side, check environment variables directly
- If `DATABRICKS_TOKEN` exists → local development
- If `DATABRICKS_TOKEN` missing → Databricks Apps (OAuth)

**Files fixed:**
- `client/app/api/chat/route.ts` (line 75)

### Fix 2: Load Agents from Backend API
```typescript
// ✅ CORRECT - Load from backend
const agentsResponse = await fetch('http://localhost:8000/api/agents')
const agentsData = await agentsResponse.json()
```

**Files fixed:**
- `client/app/api/chat/route.ts` (line 53-54)
- `client/app/api/trace/[id]/route.ts` (line 53-55)

### Fix 3: Use endpoint_name + DATABRICKS_HOST
```typescript
// ✅ CORRECT - Construct URL from parts
const databricksHost = process.env.DATABRICKS_HOST
const endpointUrl = `${databricksHost}/serving-endpoints/${selectedAgent.endpoint_name}/invocations`
```

**Files fixed:**
- `client/app/api/chat/route.ts` (line 69, 134)
- `client/app/api/trace/[id]/route.ts` (line 45)

### Fix 4: Export Environment Variables
```bash
# ✅ start_dev.sh now exports variables
set -a                    # Auto-export all variables
source .env.local         # Load DATABRICKS_HOST & DATABRICKS_TOKEN
set +a                    # Stop auto-export
```

**Files fixed:**
- `start_dev.sh` (lines 15-21)

### Fix 5: Cleanup
- ✅ Removed `client/public/metadata/` directory
- ✅ Removed unused imports from API routes
- ✅ Updated all references to new config structure

---

## Files Modified

| File | Changes |
|------|---------|
| `start_dev.sh` | Added environment variable export |
| `client/app/api/chat/route.ts` | Fixed auth detection + config loading + endpoint URL |
| `client/app/api/trace/[id]/route.ts` | Fixed config loading + host detection |
| `client/public/metadata/` | REMOVED (now in `/config/`) |

---

## How Authentication Now Works

### Local Development Flow:
1. User runs `./start_dev.sh`
2. Script exports `DATABRICKS_TOKEN` from `.env.local`
3. Next.js API routes inherit the environment variable
4. Detection: `!!process.env.DATABRICKS_TOKEN` → `true` (local mode)
5. Uses PAT token from environment
6. ✅ Calls succeed!

### Databricks Apps Flow:
1. App runs in Databricks workspace
2. No `DATABRICKS_TOKEN` in environment
3. Detection: `!!process.env.DATABRICKS_TOKEN` → `false` (production mode)
4. Uses OAuth token from `x-forwarded-access-token` header
5. ✅ Calls succeed!

---

## Testing the Fix

### Step 1: Verify Environment
```bash
./test_env.sh
```

Expected output:
```
✅ .env.local sourced
✅ Both variables are set correctly!
Local development mode will be detected correctly.
```

### Step 2: Restart Server
```bash
# Stop current server (Ctrl+C)
./start_dev.sh
```

Look for:
```
📝 Loading environment variables from .env.local...
✅ Environment variables loaded (DATABRICKS_HOST set: yes)
```

### Step 3: Check Logs
When you send a message, you should see:
```
=== AUTH DEBUG START ===
DATABRICKS_TOKEN exists: true
isLocalDevelopment: true          ← Should be TRUE now!
🔧 Running in LOCAL DEVELOPMENT mode with PAT token
Token length: 62
```

### Step 4: Send a Chat Message
1. Open http://localhost:3000
2. Go to Chat tab
3. Send a message
4. ✅ Should get a response without errors!

---

## Troubleshooting

### Still seeing "Databricks Apps mode" error?

**Check 1:** Environment variables loaded?
```bash
./test_env.sh
```

**Check 2:** Server restarted with updated script?
- Must stop and restart (Ctrl+C then `./start_dev.sh`)
- Old process won't have the exported variables

**Check 3:** Check backend logs for:
```
DATABRICKS_TOKEN exists: true
isLocalDevelopment: true
```

**Check 4:** Verify .env.local format:
```bash
cat .env.local
```

Should have:
```
DATABRICKS_HOST=https://...
DATABRICKS_TOKEN=dapi...
```

### Backend connection refused?

Make sure backend is running:
```bash
curl http://localhost:8000/api/health
```

If not running, restart:
```bash
./start_dev.sh
```

---

## Summary

| Issue | Root Cause | Solution |
|-------|------------|----------|
| Wrong environment detection | Checked `window.location` on server | Check `process.env.DATABRICKS_TOKEN` |
| Environment vars not accessible | Next.js couldn't see root `.env.local` | Export in start script |
| Old config paths | Loaded from `public/metadata/` | Load from backend API |
| Old field names | Used `endpoint_url` | Use `endpoint_name` + host |

**Result:** Local authentication now works correctly! ✅
