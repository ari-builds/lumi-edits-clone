# Lumi capability / gap ledger

Source of truth for the replica: `research/lumi-live.html` (saved from `https://lumiedits.app`) and the inline scripts extracted into `research/lumi-js/`.

Legend:
- **Observed**: directly visible in the shipped client.
- **Inferred**: requires the remote editing service, a human editor, or a payment/media provider.
- **Local**: implemented in the browser.
- **Remote/human**: implemented by backend, editor, or external service.

## Shell and navigation

| Capability | Evidence | Boundary | Replica target |
|---|---|---|---|
| Bottom tabs Reels / Styles / New reel / Chat / Pay | `lumi-live.html:3097-3103` | Local | Same tabs, same labels |
| Appearance Light / Dark / Match phone | `3556-3690` | Local + account | Theme sheet with persisted choice |
| Style tabs Templates / Captions / Motion graphics / Visual effects / hidden Color | `5538-5542` | Local | Segmented style browser |
| Guest gates for New reel / Chat / Inbox / checkout | `4933-5001` | Local + remote | Auth overlay; guest copy preserved in UI |

## New reel flow

| Capability | Evidence | Boundary | Replica target |
|---|---|---|---|
| Stepper Clips -> Title -> Brief | `6354-6370`, `7149-7262` | Local | 3-step flow with validation and draft save |
| Required title message | `6433-6483` | Local | “Required Please enter the title of your video” |
| Choose fully built-out style / Let Lumi choose / Customize / Same as last time / Own words | `6898-6914` | Local + remote history | Prefill paths in Brief step |
| Brief submit via `{kind:"brief"}` intent | `7248-7252` | Remote | `/api/intent` + local render + `/api/reels` |
| Drafts and in-progress reel sheet | `3784-3845`, `6279-6327` | Local + remote | `/api/drafts`, local cache, Continue/Delete |
| Editing intensity Clean / Polished / Punchy / Full Sauce | `3241-3245` | Brief field | Selectable, included in brief |

## Intake paths

| Capability | Evidence | Boundary | Replica target |
|---|---|---|---|
| Multi-file upload with resume/thumb cache | `6083-6188`, `6094-6098`, `6238-6242` | Local + storage | Presigned PUT, raw uploads, preview grid |
| Film with Lumi camera, 3-2-1 countdown, take verdict, multi-take, IndexedDB | `9759-9762`, `9835`, `9870-9872`, `10097-10193`, `10145-10171` | Local | `LumiEditor.openCamera()` with framing verdict and take strip |
| Paste a link: YouTube / Instagram / TikTok / Vimeo / Drive / Dropbox | `10228-10325` | Remote | Honest link intake; no fake download/render |
| Long video -> 3/5/10 shorts, vertical or horizontal | `10228-10325` | Remote | Brief fields and status `waiting` |

## Brief fields and catalogs

Observed at `6040-6082` and `6832-6877`:
Title, Video, Script, Video type, Look, Caption style, Editing intensity, Hook style, Motion graphics add-on, Captions, Music, B-roll, Background, Reference video, Reference match, Footage, What matters most, Built-out style, Hook pack, Visual effects, Editing style, AI extras, Voiceover, Voice, Length, Color.

Observed option groups:
- Backgrounds `6583-6589`: Keep it as filmed, Blurred background, Pop Out Effect, Cut you out onto a background, Zoom and blur on big points, You decide.
- Music `7005-7016`: A song I name, Trending music, You decide, No music.
- Voiceover `6622`: No, Yes AI voiceover, Yes upload voiceover, Yes record voiceover.
- Grades `5592-5605`: Natural True Color, Clean and Punchy, Warm Film, Bright and Airy, Soft Matte Pastel, Moody Muted, Golden Hour, Cool and Crisp, Rich and Vibrant.
- Hooks/templates/motion/VFX via `5651-5922`.

Replica target: `/api/styles` catalog with all groups; selections persisted in draft and rendered into the brief text.

## Local vs remote editing boundary

The shipped Lumi client contains **no local video renderer**. Editing, rendering, AI voiceover, clipping, revision execution, payment verification, and human replies are remote/human-assisted. The clone deliberately goes further: it adds a real browser editor (`app/editor.js`) for trim/crop/look/caption/hook/CTA export where `MediaRecorder` and `canvas.captureStream()` are supported, while keeping link-based work and payments honest about requiring the service.

## Review, delivery, and companion surfaces

| Capability | Evidence | Boundary | Replica target |
|---|---|---|---|
| Timecoded notes, range marks, overall notes | `7944-8075`, `8124-8126`, `8244-8260` | Local UI + remote state | `/api/reels/:id/notes` with resolve/status |
| Approve / Request changes / revision cap | `8113-8118`, `8286-8325` | Remote-controlled | `/api/reels/:id/review` |
| Versions and version badges | `8116-8118` | Remote | `reel_versions` + version action after local export |
| Cover editor CV_STYLES/POS/SIZE/BG | `4303-4522` | Local preview + remote save | `LumiEditor.drawCover()` + `/api/covers/:reelId` |
| Post kit: cover, caption, hashtags, hooks | `4268-4302` | Local generation + save | Deterministic client generation + intent |
| Hook pack / trial reels | `7454-7514` | Remote | Intent + status card, no fake render |
| Rewards / influencer / brand kit | `7387-7612` | Remote/human | Honest informational cards |
| Pay page with Stripe links and statuses | `8672-8720` | Remote | No card fields; intent + “checkout not connected” |
| Chat with editor + attachments | `8572-8670` | Remote/human | Existing chat + upload-then-URL attachments |
| Team Inbox distinct from Chat | `4737-4922` | Human | Header Inbox sheet + `team_reply` intent |

## Persistence

Observed localStorage keys include `lumi_look`, `lumi_appearance`, `lumi_draft`, `lumi_cover_*`, `lumi_briefsent`, `lumi_upres`, `lumi_upthumb`, `lumi_src` and many optimistic flags (`3276-3277` and throughout). IndexedDB store `lumi_fl111` holds camera takes (`10145-10157`).

Replica persistence:
- Authoritative state: Neon Postgres (`users`, `sessions`, `reels`, `reel_versions`, `reel_notes`, `drafts`, `covers`, `intents`, `events`, `conversations`, `messages`).
- Media: Neon Object Storage via presigned PUT.
- Device-local: appearance, last draft, camera takes, upload resume caches.
