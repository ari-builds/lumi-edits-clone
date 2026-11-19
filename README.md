# Lumi Edits

A working, phone-first replica of the user's own Lumi app: a PWA with a real browser editing engine and persistent backend state.

**Live:** https://lumi-edits-clone.vercel.app
**GitHub:** https://github.com/ari-builds/lumi-edits-clone

## What actually works

| Feature | Status | Backing |
|---|---|---|
| Accounts (register / login / session) | Real | Neon Postgres, scrypt-hashed passwords |
| Reels feed, likes, comments | Real | Postgres; seeded demo reels + uploaded reels |
| New reel flow: Clips → Title → Brief | Real | Draft state in Postgres + local browser cache |
| Upload clips | Real | Neon Object Storage presigned PUT |
| Film with Lumi | Real where supported | `getUserMedia`, canvas-framed recording, take verdict, IndexedDB takes |
| Local trim / crop / look / captions / hook / CTA export | Real where supported | `canvas.captureStream()` + `MediaRecorder` in `app/editor.js` |
| Drafts, covers, timecoded notes, versions, review state | Real | `drafts`, `covers`, `reel_notes`, `reel_versions`, `intents`, `events` tables |
| Styles catalog (templates, captions, motion, VFX, grades, hooks, backgrounds, music, voices, formats, intensity) | Real | `/api/styles`, `/api/state` |
| Cover editor + Post kit | Real | `LumiEditor.drawCover()`, `/api/covers`, intent log |
| Chat with attachments | Real | Postgres messages; uploads via presigned PUT |
| PWA install + offline shell | Real | Manifest, service worker (`lumi-v2`) |
| Payments | Demo only | Intents are recorded, but **no real card charge** (no Stripe keys) |

## Honest limitations

- The shipped Lumi client is a thin front end over a remote human/AI editing service. This replica deliberately adds a real local renderer, but it cannot reproduce Lumi's proprietary remote pipeline.
- Local export requires a browser with `MediaRecorder` and `HTMLCanvasElement.captureStream()`. MP4 is preferred; browsers without MP4 encoding get WebM.
- Export is real-time: the source plays for the selected duration while frames are drawn and recorded.
- Local export uses one lead clip. Additional clips are uploaded as raw footage and described in the brief.
- Cross-origin media without CORS can taint the canvas and block export. Blob/object URLs are safe.
- "Paste a link" intake stores the link and brief honestly; it does **not** download YouTube/Instagram/TikTok/Vimeo/Drive/Dropbox media or cut it into shorts locally. Those reels are marked `waiting`.
- AI voiceover, trending-music licensing, reference-video matching, background cutout, Hook pack generation, human team replies, and revision execution require the remote Lumi service.
- Payments are simulated. The Pay page does not collect card details and clearly states that checkout is not connected.
- Cover art, captions, hashtags, and hooks in Post kit are generated locally and deterministically; they are not an LLM service.

## Architecture

- `app/` — vanilla JS PWA shell, SPA logic, and `editor.js` browser renderer. No npm dependencies, no build step.
- `api/` — zero-dependency Vercel serverless functions using Neon SQL-over-HTTP (`neon-connection-string` header).
- Neon Object Storage — public media bucket reached through zero-dep AWS SigV4 presigned PUT URLs in `api/_s3.js`.
- `research/` — saved shipped Lumi client, extracted inline scripts, REA evidence, and the capability/gap ledger used to drive parity.

### Environment variables (names only)

Set these in Vercel (Production and Preview) and in a gitignored `.env.local` for local work:

- `DATABASE_URL`
- `S3_BUCKET`, `AWS_REGION`, `AWS_ENDPOINT_URL_S3`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`

Never commit or paste secret values.

## Development

```bash
npm run dev
```

## Verification

```bash
npm run check:db                        # verifies Neon schema and required columns
npm run smoke:parity                    # remote smoke checks against the live deployment
```

Override the smoke target and add auth without exposing credentials in output:

```powershell
$env:BASE_URL = 'https://lumi-edits-clone.vercel.app'
$env:LUMI_TOKEN = '<token>'
npm run smoke:parity
```

For a hands-free run, `LUMI_SMOKE_CREATE_USER=1` registers a throwaway account and caches its token in the gitignored `.smoke-token` file. It never prints the token or password.

Optional full upload round trip:

```powershell
$env:LUMI_SMOKE_UPLOAD = '1'
npm run smoke:parity
```

## Reverse engineering note

REA MCP tools were not registered in the working session, so the documented CLI fallback was used (`rea-agents@6.7.0 doctor` and `analyze-javascript-application`). The large main inline script timed out under the analyzer's source timeout; the capability inventory was therefore completed with direct static reads plus successful REA passes over the smaller inline scripts. All findings are recorded in `research/CAPABILITY-GAP-LEDGER.md`.
