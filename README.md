# Lumi Edits

A working, phone-first replica of the user's own Lumi app: a PWA with a real browser editing engine and persistent backend state.

**Live:** https://lumi-edits-clone.vercel.app
**GitHub:** https://github.com/ari-builds/lumi-edits-clone

## What actually works

| Feature | Status | Backing |
|---|---|---|
| Accounts (register / login / session) | Real | Neon Postgres, scrypt-hashed passwords |
| Reels feed, likes, comments | Real | Postgres; seeded demo reels + uploaded reels |
| New reel flow: Clips → Title → Brief → Storyboard | Real | Draft state in Postgres + local browser cache; step 4 requires storyboard approval |
| Upload clips + style references | Real | Neon Object Storage presigned PUT with `kind`/`batch`/`ofIndex`/`reelId` metadata |
| On-device AI planner | Real, deterministic | `lib/plan.js` + `app/app.js`; builds a scene-level plan from your brief, trim range, and locally sampled references — not a hosted LLM |
| Local reference analysis | Real | Canvas pixel sampling of images/video frames in the browser; palette + brightness shown as "Analyzed locally" |
| Film with Lumi | Real where supported | `getUserMedia`, canvas-framed recording, take verdict, IndexedDB takes |
| Local multi-clip export with captions, B-roll cues, motion, SFX | Real where supported | `canvas.captureStream()` + `MediaRecorder` + Web Audio in `app/editor.js`; requires approved storyboard for planned reels |
| Drafts, covers, timecoded notes, versions, review state, plan revisions | Real | `drafts`, `covers`, `reel_notes`, `reel_versions`, `intents`, `events`, `project_assets` tables |
| Styles catalog (templates, captions, motion, VFX, grades, hooks, backgrounds, music, voices, formats, intensity) | Real | `/api/styles`, `/api/state` |
| Cover editor + Post kit | Real | `LumiEditor.drawCover()`, `/api/covers`, intent log |
| Chat with attachments | Real | Postgres messages; uploads via presigned PUT |
| PWA install + offline shell | Real | Manifest, service worker (`lumi-v2`) |
| Payments | Demo only | Intents are recorded, but **no real card charge** (no Stripe keys) |

## Honest limitations

- The shipped Lumi client is a thin front end over a remote human/AI editing service. This replica deliberately adds a real local renderer, but it cannot reproduce Lumi's proprietary remote pipeline.
- Local export requires a browser with `MediaRecorder` and `HTMLCanvasElement.captureStream()`. MP4 is preferred; browsers without MP4 encoding get WebM.
- Export is real-time: the source plays for the selected duration while frames are drawn and recorded.
- Local export renders all uploaded raw clips sequentially. Plan scenes map to those clips; it does not fetch or invent B-roll footage. A B-roll scene draws a labelled local overlay cue only.
- Cross-origin media without CORS can taint the canvas and block export. Blob/object URLs and this project's public bucket URLs are safe. The export fails with an explicit message; it never produces a blank or fake file.
- "Paste a link" intake stores the link and brief honestly; it does **not** download YouTube/Instagram/TikTok/Vimeo/Drive/Dropbox media or cut it into shorts locally. Those reels are marked `waiting` and cannot be exported here.
- The on-device AI planner is deterministic local rule logic. It writes scene timings, captions, motion, B-roll cues, and SFX cues into a saved plan. It does not call a hosted model, generate imagery/voice, license music, or execute an external human edit.
- Caption / B-roll / motion / SFX from a plan are rendered locally where the browser supports the needed API. Web Audio SFX are short generated tones; there is no voiceover or sourced sound effect library.
- Applying review feedback creates a new local plan version from the note kinds (`general`, `storyboard`, `caption`, `broll`, `motion`, `sfx`). It is a plan revision, not an automatically re-edited video. The storyboard must be re-approved before the next export.
- Payments are simulated. The Pay page does not collect card details and clearly states that checkout is not connected.
- Cover art, captions, hashtags, hooks, and Post kit copy are generated locally and deterministically; they are not an LLM service.

## Architecture

- `app/` — vanilla JS PWA shell, SPA logic, and `editor.js` browser renderer. No npm dependencies, no build step.
- `api/` — zero-dependency Vercel serverless functions using Neon SQL-over-HTTP (`neon-connection-string` header).
- `lib/plan.js` — shared zero-dependency plan normalization and local feedback application used by the API. No new API function files were added (Vercel Hobby function limit).
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
node --check api/_db.js && node --check api/reels.js && node --check api/state.js && node --check api/upload.js && node --check lib/plan.js && node --check app/app.js && node --check app/editor.js && node --check tools/check-db.cjs
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
