# Fixes Applied - Configuration Refactoring

## Issues Fixed

### 1. Server-Side Rendering (SSR) Error ✅
**Error:** `Error loading app config: null`

**Root Cause:**
- `generateMetadata()` in `layout.tsx` was trying to fetch from API endpoint during SSR
- API endpoints don't exist during build-time/SSR phase

**Solution:**
- Created `client/lib/config-server.ts` - reads config directly from filesystem
- Updated `client/app/layout.tsx` to use `getAppConfigServer()` (synchronous file read)
- Path adjusted to `join(process.cwd(), '..', 'config', 'app.json')` because Next.js runs from `/client/`

### 2. File Path Error ✅
**Error:** `ENOENT: no such file or directory, open '.../client/config/app.json'`

**Root Cause:**
- Next.js `process.cwd()` returns `/client/` directory
- Config files are in root `/config/` directory
- Initial path used `join(process.cwd(), 'config', 'app.json')` which looked in `/client/config/`

**Solution:**
- Changed path to `join(process.cwd(), '..', 'config', 'app.json')`
- Goes up one directory from `/client/` to reach root `/config/`

### 3. Dashboard Placeholder Message ✅
**Issue:** Instructions pointed to old config location `lib/config.ts`

**Solution:**
- Updated `client/components/dashboard/DashboardView.tsx`
- Changed instructions to point to `config/app.json`
- Added step to restart server after config changes

### 4. Duplicate Environment Files ✅
**Issue:** Credentials in both root and `client/.env.local`

**Solution:**
- Removed `client/.env.local`
- All credentials now in root `.env.local` only
- Cleaner, single source of truth

---

## Configuration Structure (Final)

```
/config/                          # All configuration here
  ├── app.json                    # Branding + dashboard
  ├── agents.json                 # Agents + endpoints + tools
  ├── about.json                  # About page content
  └── README.md                   # Configuration guide

/.env.local                       # Secrets only
  ├── DATABRICKS_HOST
  └── DATABRICKS_TOKEN

/client/lib/
  ├── config.ts                   # Client-side API fetcher (async)
  └── config-server.ts            # Server-side file reader (sync)
```

---

## How It Works

### Server-Side (SSR/Build Time)
1. `layout.tsx` calls `getAppConfigServer()`
2. Reads directly from `../config/app.json` (filesystem)
3. Returns config for metadata generation
4. No API calls needed

### Client-Side (Browser)
1. Components call `getAppConfig()` (from `config.ts`)
2. Fetches from `/api/config/app` endpoint
3. Backend reads from `/config/app.json` and serves via API
4. Frontend caches result in memory

### Backend API
1. `server/config_loader.py` loads all configs at startup
2. Serves via endpoints:
   - `GET /api/config/app`
   - `GET /api/config/about`
   - `GET /api/agents`
3. Single source of truth for all config

---

## Testing Checklist

- [x] Config files exist in `/config/`
- [x] JSON syntax is valid
- [x] `.env.local` has credentials
- [x] Virtual environment set up
- [x] Frontend dependencies installed
- [x] SSR error resolved
- [x] File path error resolved
- [x] Dashboard instructions updated
- [ ] Test local server startup
- [ ] Test UI loads without errors
- [ ] Test config displayed correctly
- [ ] Test agent endpoint calls

---

## Next Steps

1. **Restart the development server:**
   ```bash
   ./start_dev.sh
   ```

2. **Verify in browser (http://localhost:3000):**
   - Browser tab title shows "Wingman.ai"
   - Top bar shows "Thales"
   - Dashboard tab shows iframe
   - Chat tab shows 2 agents
   - Tools tab shows agent tools
   - No console errors

3. **Check backend logs** for:
   ```
   [config-server] Current working directory: /Users/.../client
   [config-server] Reading config from: /Users/.../config/app.json
   [config-server] ✅ Config loaded successfully
   ```

4. **Test agent call** (send a message in chat):
   - Should route based on `deployment_type`
   - Should call Databricks endpoint
   - Should return response

---

## Files Modified

### Created:
- `/config/app.json`
- `/config/agents.json`
- `/config/about.json`
- `/config/README.md`
- `/server/config_loader.py`
- `/client/lib/config-server.ts`
- `/verify_setup.sh`

### Updated:
- `/server/app.py` (added config endpoints + agent routing)
- `/client/lib/config.ts` (async API fetcher)
- `/client/app/layout.tsx` (uses server config)
- `/client/components/layout/TopBar.tsx` (async config load)
- `/client/components/dashboard/DashboardView.tsx` (async config load + updated instructions)
- `/.env.local` (added credentials)

### Removed:
- `/client/.env.local` (consolidated to root)

---

## Debugging Tips

If errors occur:
1. Check logs in terminal where `./start_dev.sh` is running
2. Look for `[config-server]` prefix in logs
3. Verify path printed in logs: `/Users/.../config/app.json`
4. Ensure config files exist: `ls -la config/`
5. Validate JSON: `python3 -m json.tool config/app.json`
6. Run verification: `./verify_setup.sh`
