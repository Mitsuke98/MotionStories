# Motion Story — Build Log & Lessons Learned

## What We Built
Full-stack web app: Next.js 15 frontend (Vercel) + Express/TypeScript backend (Railway) + Postgres.
Features: video frame extraction → AI motion description → Library, Gallery, Recreate Studio, BYOK API keys, JWT auth.

---

## Stack Decisions

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 15 + Tailwind v4 | App Router, fast deploys on Vercel |
| Backend | Express + TypeScript (ESM) | Long-running jobs exceed Vercel's 10s serverless limit |
| DB | Drizzle ORM + Postgres | Type-safe, lightweight migrations |
| Auth | JWT Bearer tokens (localStorage) | Cross-domain cookies don't work between Vercel + Railway |
| AI | Pluggable VisionProvider interface | Not locked to one provider |
| Frame extraction | ffmpeg (scene detect → 1fps fallback) | Handles both hard cuts and continuous camera movement |
| Video download | yt-dlp | Handles Pinterest, YouTube, most social platforms |

---

## Problems & Fixes (Chronological)

### 1. `@types/express ^5` with Express 4
**Problem:** `req.params.id` typed as `string | string[]`, causing TS errors everywhere.  
**Fix:** Pin `@types/express ^4.17.21`.

### 2. Tailwind v4 `@apply` limitation
**Problem:** Cannot `@apply` a custom component class inside another custom class (`.btn-primary { @apply btn ... }` fails).  
**Fix:** Write every component class (`.btn-primary`, `.badge`, etc.) as fully standalone plain CSS — no chaining.

### 3. yt-dlp not in PATH
**Problem:** `spawn yt-dlp ENOENT` on local Mac.  
**Fix:** `pip3 install --user yt-dlp`, then set `YTDLP_PATH=/Users/mac/Library/Python/3.9/bin/yt-dlp` in `.env`.

### 4. Wrong provider selected (Claude key with no credits)
**Problem:** User kept selecting Claude provider; key had zero API credits → 401 errors.  
**Fix:** (a) Auto-select provider when only one key is saved. (b) Show selected key info below dropdown. (c) Delete the broken key from DB.

### 5. Git repo had `web/` tracked as submodule
**Problem:** `web/` had its own `.git` folder → Vercel couldn't see its files in the monorepo.  
**Fix:** `git rm --cached web && git add web/` to convert from submodule to regular directory.

### 6. Railway detected wrong root directory
**Problem:** Railway's railpack saw the monorepo root, not `server/`, so it couldn't identify the app type.  
**Fix:** Set **Root Directory = `server`** in Railway service → Settings.

### 7. Railway ignored `nixpacks.toml`
**Problem:** Railway switched from nixpacks to railpack — our `nixpacks.toml` was silently ignored. Start command didn't run migrations.  
**Fix:** Set start command directly in Railway → Settings → Deploy → Start Command: `sh start.sh`

### 8. DB migrations never ran on Railway
**Problem:** `db:migrate` script uses `tsx` (a devDependency, not installed in production). Tables never created → server crashed on every request.  
**Fix:** Add `db:migrate:prod` script that runs compiled `node dist/db/migrate.js`. Call it in `start.sh` before `node dist/index.js`.

### 9. Cross-domain session cookies blocked
**Problem:** Frontend on `motion-stories.vercel.app`, backend on `motionstories-production.up.railway.app` — different domains. `SameSite=Lax` cookies are blocked by browsers. Even `SameSite=None` was blocked by Safari's strict third-party cookie policy.  
**Fix:** Switched entirely to **Bearer token auth** stored in `localStorage`. Backend accepts `Authorization: Bearer <token>` header. Cookies kept as fallback for local dev only.

### 10. yt-dlp not available on Railway
**Problem:** Railway's railpack container has no Python → can't `pip install yt-dlp`. No `curl` or `wget` either.  
**Fix:** Download the **standalone Linux binary** (`yt-dlp_linux`, not `yt-dlp` which is a Python script) via Node.js `https.get()` with redirect-following. Run in `start.sh` before server starts.  
**Gotcha:** Must follow HTTP redirects manually — `https.get()` doesn't follow them by default. Use recursive function.  
**Gotcha 2:** Inline `node -e "..."` async code exits before download completes. Use a proper `.mjs` script file with top-level `await`.

### 11. ffmpeg not available on Railway
**Problem:** Same as yt-dlp — no system ffmpeg on Railway's railpack containers.  
**Fix:** Download static Linux build (`ffmpeg-linux-x64` from johnvansickle.com via `eugeneware/ffmpeg-static` releases) in `start.sh`. Set no `FFMPEG_PATH` env var — `frames.ts` defaults to `/usr/local/bin/ffmpeg`.  
**Failed approach:** `ffmpeg-static` npm package requires its install script to run (`node install.js`) — this script is blocked by npm's `allow-scripts` security policy on Railway. Even if approved locally, Railway doesn't inherit the approval.

### 12. Railway auto-injected junk S3 credentials
**Problem:** Railway's environment had `S3_BUCKET` and `S3_ACCESS_KEY_ID` set to garbage values (auto-generated or from a previous project). `s3Configured()` returned `true` → every frame upload tried connecting to AWS → SSL handshake failure.  
**Fix:** Delete all `S3_*` variables from Railway → Variables. Frame uploads fall back to local `/public/frames/`.  
**Lesson:** Always check Railway's auto-injected variables. Railway sometimes populates env vars from other services in the project.

### 13. Export PDF returned 401
**Problem:** PDF export is a direct `<a href>` link opened in a new tab — no way to attach an `Authorization` header to a browser navigation.  
**Fix:** Pass JWT token as a query param (`?token=...`) in the export URL. Backend `requireAuth` middleware reads from `req.query.token` as a fallback.

### 14. Frame images not loading in production
**Problem:** Frames stored locally on Railway at `/frames/...` relative path. Frontend on Vercel tried loading `https://motion-stories.vercel.app/frames/...` — wrong domain.  
**Fix:** `resolveFrameUrl()` helper prepends `NEXT_PUBLIC_API_URL` to relative frame URLs. Absolute URLs (future S3/R2) pass through unchanged.

### 15. Scene detection skipping video segments
**Problem:** ffmpeg scene threshold of `0.25` missed subtle transitions, leaving 10+ second gaps.  
**Fix:** Lowered threshold to `0.15`. Trade-off: more frames extracted = more AI calls = higher cost.

---

## Railway-Specific Gotchas (Summary)

1. **railpack ignores nixpacks.toml** — configure everything via Railway Settings UI or `railway.toml`
2. **devDependencies not installed** — anything used at runtime must be in `dependencies`, not `devDependencies`
3. **No curl/wget/pip** — download binaries via Node.js `https.get()` with manual redirect handling
4. **Multi-stage build** — files written during build phase don't carry to runtime container. Download binaries in `start.sh` (runtime), not build scripts
5. **Auto-injected env vars** — Railway may populate S3/database/Redis vars from sibling services. Always audit Variables tab
6. **Migrations must run before server start** — put them in `start.sh` before `node dist/index.js`

## Vercel-Specific Gotchas

1. **Submodules invisible** — if a subdirectory has its own `.git`, Vercel treats it as a submodule and can't deploy it. Remove nested `.git` folders
2. **Root Directory picker** — for monorepos, you must set Root Directory to the frontend subfolder (`web`). The picker may not show all folders if they were previously submodules — fix in git first, then re-import
3. **NEXT_PUBLIC_* vars baked at build time** — changing them requires a redeploy, not just a restart
4. **Cross-domain cookies** — never use cookie-based auth when frontend and backend are on different domains. Use Bearer tokens

## Auth Architecture for Cross-Domain Apps

**Wrong:** Cookie-based sessions (`httpOnly`, `SameSite=Lax`) — blocked between Vercel and Railway  
**Wrong:** `SameSite=None` cookies — blocked by Safari ITP  
**Right:** JWT Bearer tokens in `localStorage` + `Authorization: Bearer` header  
- Login/signup returns `{ token }` in response body
- Frontend saves to `localStorage.setItem("ms_token", token)`
- Every API request reads token and adds `Authorization: Bearer <token>` header
- For file downloads (PDF export): pass token as `?token=` query param

## Local Dev Setup (No Brew/Docker)

- **Postgres:** `embedded-postgres` npm package (port 5433, persistent data in `local-pgdata/`)
- **ffmpeg:** `imageio-ffmpeg` Python package (`pip3 install imageio-ffmpeg`) — binary at `/Users/mac/Library/Python/3.9/lib/python/site-packages/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1`
- **yt-dlp:** `pip3 install --user yt-dlp` — binary at `/Users/mac/Library/Python/3.9/bin/yt-dlp`
- Set both paths in `server/.env` via `FFMPEG_PATH` and `YTDLP_PATH`
