# Motion Story

Analyze any video into a frame-by-frame storyboard with plain-English motion
descriptions, save it to a personal Library, browse a Motion Insights Gallery
of recurring camera/subject moves, and generate "Recreate" shot-list
blueprints for filming a new subject with the same motion pattern.

See `/Users/mac/.claude/plans/whimsical-juggling-wozniak.md` for the full
product plan this was built from.

## Structure

- `server/` — Node + TypeScript + Express backend: auth, BYOK key storage,
  video download (yt-dlp) + frame extraction (ffmpeg), pluggable AI vision
  providers (Claude/OpenAI/Gemini), Postgres persistence, PDF export.
- `web/` — Next.js 16 (App Router) + Tailwind frontend: Analyze, Library,
  Motion Gallery, Recreate Studio, Settings (BYOK) pages.

## Local setup

### Prerequisites

- Node.js 20+
- A Postgres database (local or hosted, e.g. Railway/Supabase/Neon)
- `ffmpeg` available on PATH (or set `FFMPEG_PATH` in `server/.env`)
- `yt-dlp` binary available on PATH for URL downloads (the `yt-dlp-wrap`
  package shells out to it — install via `brew install yt-dlp` or
  `pip install yt-dlp`; file uploads work without it)

### Backend

```bash
cd server
cp .env.example .env
# edit .env: set DATABASE_URL, JWT_SECRET, KEY_ENCRYPTION_SECRET
npm install
npm run db:generate   # generates SQL migrations from src/db/schema.ts
npm run db:migrate    # applies them to DATABASE_URL
npm run dev            # http://localhost:4000
```

Object storage (Cloudflare R2 / S3) is optional for local dev — if
`S3_BUCKET`/`S3_ACCESS_KEY_ID` are unset, frame images are written to
`server/public/frames` and served from the backend directly.

### Frontend

```bash
cd web
cp .env.local.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:4000
npm install
npm run dev   # http://localhost:3000
```

### First run

1. Visit `http://localhost:3000/signup`, create an account.
2. Go to **Settings**, add an API key for at least one provider (Claude,
   OpenAI, or Gemini).
3. Go to **Analyze** (home page), paste a video URL or upload a file, pick
   the provider, submit.
4. Once processing finishes you're redirected into the saved document in the
   **Library**, where you can edit descriptions, leave feedback, and export
   a PDF.
5. **Motion Gallery** aggregates motion-tag patterns across everything you've
   analyzed. **Recreate** lets you pick a Library video as a structural
   reference and upload a new subject photo to get a shot-list blueprint.

## Deploying

Recommended split (see the plan doc for rationale): frontend on **Vercel**,
backend + Postgres on **Railway** (ffmpeg/yt-dlp need a long-lived process,
not serverless functions).

1. **Railway**: create a Postgres instance, deploy `server/` as a service
   (set the same env vars as `.env.example`, plus `CORS_ORIGIN` pointed at
   your Vercel domain). Railway's Nixpacks builder needs `ffmpeg` and
   `yt-dlp` available — add a `nixpacks.toml` or Dockerfile installing both
   if the default image doesn't include them.
2. **Object storage**: provision a Cloudflare R2 bucket (or S3), set the
   `S3_*` env vars on the backend so frame images persist beyond the
   container's local disk.
3. **Vercel**: deploy `web/`, set `NEXT_PUBLIC_API_URL` to the Railway
   backend's public URL.
4. Confirm CORS, cookies (`SameSite`/`Secure`) work cross-domain between the
   Vercel and Railway URLs — you may need `sameSite: "none"` + `secure: true`
   on the session cookie in `server/src/lib/auth.ts` once both are on HTTPS.

## Known limitations (v1)

- Recreate Studio produces a **shot-list document**, not a rendered video —
  actual AI video generation (Runway/Veo/Luma) is a planned v2.
- Single-instance job queue (`p-queue`, concurrency 1) — fine for personal/
  small-team use; would need a real job queue (e.g. BullMQ + Redis) to scale
  to concurrent users processing videos simultaneously.
- yt-dlp downloads from third-party platforms may be subject to those
  platforms' Terms of Service — surfaced as an in-app disclaimer, but it's
  the user's responsibility to only analyze content they have rights to.
