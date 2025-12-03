# Environment Variable Fix

## Problem
Error: "Running in Databricks Apps mode but no user access token found in headers"

**Root Cause:**
- Next.js was running in the `client/` directory
- Next.js couldn't access the root `.env.local` file
- Without `DATABRICKS_TOKEN` in environment, app thought it was in production mode
- Looked for OAuth headers instead of using local token

## Solution

Updated `start_dev.sh` to **export** environment variables before starting servers.

### What Changed

**Before:**
```bash
# Just activated venv and started servers
source .venv/bin/activate
uvicorn server.app:app --reload --port 8000 &
cd client && npm run dev &
```

**After:**
```bash
# Load and EXPORT environment variables first
set -a                    # Auto-export all variables
source .env.local         # Load variables
set +a                    # Stop auto-export

# Now start servers (they inherit the exported vars)
source .venv/bin/activate
uvicorn server.app:app --reload --port 8000 &
cd client && npm run dev &
```

### How It Works

1. **`set -a`** - Tells bash to automatically export all variables
2. **`source .env.local`** - Loads DATABRICKS_HOST and DATABRICKS_TOKEN
3. **`set +a`** - Stops auto-exporting
4. Both servers (FastAPI + Next.js) inherit these environment variables
5. Next.js API routes can now access `process.env.DATABRICKS_TOKEN`
6. Authentication detection works correctly: "Has token? → Local mode"

### Verification

Test the setup:
```bash
./test_env.sh
```

Expected output:
```
✅ .env.local sourced
✅ Both variables are set correctly!
Local development mode will be detected correctly.
```

## Usage

### Start Servers
```bash
./start_dev.sh
```

You should see:
```
📝 Loading environment variables from .env.local...
✅ Environment variables loaded (DATABRICKS_HOST set: yes)
```

### What to Expect

**In the browser (http://localhost:3000):**
- ✅ No authentication errors
- ✅ Chat messages work
- ✅ Agent calls succeed
- ✅ Local token is used (not OAuth headers)

### Troubleshooting

If you still see "Databricks Apps mode" error:

1. **Check .env.local exists:**
   ```bash
   cat .env.local
   ```

2. **Verify variables load:**
   ```bash
   ./test_env.sh
   ```

3. **Check server startup logs:**
   ```bash
   ./start_dev.sh
   # Should show: "✅ Environment variables loaded"
   ```

4. **Restart server completely:**
   - Press Ctrl+C to stop
   - Run `./start_dev.sh` again
   - **Important:** Must restart to pick up new export logic!

## Files Modified

- ✅ `start_dev.sh` - Added environment variable export
- ✅ `test_env.sh` - Created test script
- ✅ `.env.local` - Already had correct credentials

## Why This Approach?

**Alternatives considered:**

1. ❌ **Duplicate .env.local in client/** - Credentials in two places (bad practice)
2. ❌ **next.config.ts env injection** - Complex, Next.js specific
3. ✅ **Export in start script** - Simple, single source of truth

**Benefits:**
- ✅ Single `.env.local` file (no duplication)
- ✅ Works for both FastAPI and Next.js
- ✅ Standard bash practice
- ✅ Easy to understand and maintain

## Summary

**Before:** Next.js couldn't see environment variables → thought it was in production → failed

**After:** Start script exports variables → both servers inherit them → local mode detected → works! ✅
