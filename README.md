# Lumi Edits

Mobile-first social video editing app — your own version of Lumi, deployed on Vercel.

**Live:** https://lumi-edits-clone.vercel.app
**GitHub:** https://github.com/ari-builds/lumi-edits-clone

## What actually works

| Feature | Status | Backing |
|---|---|---|
| Accounts (register / login / session) | ✅ Real | Neon Postgres, scrypt-hashed passwords |
| Reels feed | ✅ Real | Postgres; seeded demo reels + your uploads |
| Publish a reel with a video file | ✅ Real | Video bytes uploaded to Neon Object Storage; permanent public URL |
| Like / comment | ✅ Real | Postgres (likes deduplicated per user) |
| Chat conversations & messages | ✅ Real | Postgres (seeded demo threads) |
| Pay flow (intent + confirm + history) | ⚠️ Demo | Persistent records, but **no real card charge** (no Stripe) |
| Trim scrub bar, style selection | ✅ UI | Local preview; no server-side transcoding/filters applied to the exported video |

### Honest limitations
- **No video editing engine.** The trim bar is a UI preview; the uploaded video is stored as-is (not actually cut or filtered). Lumi's proprietary transcoding/filter pipeline is not reproduced.
- **Payments are simulated.** Intents/confirmations are stored, but no money moves. Add Stripe keys to make it real.
- **Demo seed content** uses public sample videos; chat/reels seeds are sample data.
- Video files are stored in a **public-read** bucket — anyone with the URL can view them. Don't upload private content.

## Design system
- Paper theme `#f6f3ec` / ink `#141518` / accent `#2f6fd0`, dark mode, 10 look themes.

## Architecture
```
api/
  _db.js       Neon SQL-over-HTTP helper (zero deps, lazy schema init)
  _s3.js       AWS SigV4 presigned PUT generator (zero deps)
  auth.js      users + sessions (scrypt)
  reels.js     reels + likes + comments
  chat.js      conversations + messages
  pay.js       intents + confirmations + history
  upload.js    presigned upload URLs -> Neon Object Storage
  styles.js    static style catalog
app/           vanilla-JS SPA (PWA) — no build step
```

### Backend services (separate Neon project from OpenReply)
- **Postgres:** dedicated `lumi-edits` Neon project (`DATABASE_URL`)
- **Object Storage:** `lumi-media` public bucket on a us-east-2 Neon branch (`AWS_*` + `S3_BUCKET` env)
- All secrets live in Vercel env (production + preview), never in the repo.

## Local development
```bash
vercel dev          # API + static, needs .env.local with DATABASE_URL + AWS_* + S3_BUCKET
```
`vercel env pull` to fetch dev env. Opening `app/index.html` statically works for UI only (no API).

## Tests
- `tools/test-neon.cjs` — Neon HTTP connectivity
- `tools/test-upload.cjs` — presign → PUT → GET round-trip (reads env vars)
- `tools/set-env.cjs` — set Vercel env vars via API using local CLI token (reads `.env-values.json`, gitignored)

## Deployment
Push to `master`; Vercel auto-deploys. Manual: `vercel deploy --prod --yes`.

## License
MIT
