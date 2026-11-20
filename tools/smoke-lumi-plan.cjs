// Storyboard/plan smoke test: proves the approval gate and re-approval after revision.
// Runs against a local `vercel dev` instance by default. Credentials are read from
// the gitignored .smoke-token file and are never printed.

'use strict';

const fs = require('fs');
const path = require('path');
const planner = require('../lib/plan');

const BASE = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const TOKEN_FILE = path.resolve(__dirname, '..', '.smoke-token');
if (!fs.existsSync(TOKEN_FILE)) {
  console.error('No .smoke-token. Run `npm run smoke:parity` with LUMI_SMOKE_CREATE_USER=1 first.');
  process.exit(1);
}
const token = fs.readFileSync(TOKEN_FILE, 'utf8').trim();

let passed = 0;
let failed = 0;

async function request(apiPath, { method = 'GET', body } = {}) {
  const headers = { authorization: `Bearer ${token}` };
  if (body !== undefined) headers['content-type'] = 'application/json';
  const res = await fetch(BASE + apiPath, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = {};
  try { json = await res.json(); } catch {}
  return { res, json };
}

async function check(name, fn) {
  try {
    const detail = await fn();
    passed += 1;
    console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`);
    return true;
  } catch (err) {
    failed += 1;
    console.log(`FAIL ${name} — ${err && err.message ? err.message : String(err)}`);
    return false;
  }
}

function must(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  console.log(`Lumi storyboard smoke: ${BASE}`);
  const suffix = Date.now();
  let reelId = '';
  const plan = planner.normalizePlan({
    title: `__smoke_storyboard_${suffix}__`,
    brief: 'Throwaway smoke test for the storyboard gate.',
    scenes: [
      { start: 0, duration: 3, caption: 'Hook', visual: 'Opening shot' },
      { start: 3, duration: 3, caption: 'Detail', visual: 'Close-up' },
    ],
  });

  await check('create reel with on-device plan', async () => {
    const { res, json } = await request('/api/reels', {
      method: 'POST',
      body: {
        sourceKind: 'file',
        sourceUrl: `https://example.invalid/smoke-plan-${suffix}`,
        videoUrl: `https://example.invalid/smoke-source-${suffix}.mp4`,
        title: `__smoke_storyboard_${suffix}__`,
        brief: plan.brief,
        look: 'classic',
        format: 'vertical',
        plan,
        storyboard: plan.scenes,
      },
    });
    must(res.ok, json.error || `HTTP ${res.status}`);
    must(json.reel && json.reel.id, 'missing reel id');
    must(String(json.reel.stage) === 'storyboard', `expected stage storyboard, got ${json.reel.stage}`);
    reelId = json.reel.id;
    return `reel ${reelId}, stage ${json.reel.stage}`;
  });

  await check('export blocked before approval', async () => {
    const { res, json } = await request(`/api/reels/${encodeURIComponent(reelId)}/version`, {
      method: 'POST',
      body: { videoUrl: `https://example.invalid/smoke-blocked-${suffix}.webm` },
    });
    must(res.status === 409, `expected 409, got ${res.status}`);
    must(/approval/i.test(json.error || ''), `unexpected error: ${json.error}`);
    return '409 approval required';
  });

  await check('add timecoded b-roll note', async () => {
    const { res, json } = await request(`/api/reels/${encodeURIComponent(reelId)}/notes`, {
      method: 'POST',
      body: { version: 1, t: 4, tEnd: 5.5, text: 'Add tool close-up', kind: 'broll' },
    });
    must(res.ok, json.error || `HTTP ${res.status}`);
    must(json.note && json.note.kind === 'broll', 'note kind not persisted');
    return `note ${json.note.id}, kind broll`;
  });

  await check('revise plan from notes resets approval', async () => {
    const { res, json } = await request(`/api/reels/${encodeURIComponent(reelId)}/plan`, {
      method: 'PATCH',
      body: { notes: [{ t: 4, kind: 'broll', text: 'Add tool close-up' }] },
    });
    must(res.ok, json.error || `HTTP ${res.status}`);
    const reel = json.reel || {};
    must(Number(reel.planVersion) === 1, `expected plan v1, got ${reel.planVersion}`);
    must(String(reel.stage) === 'storyboard', `expected stage storyboard after revision, got ${reel.stage}`);
    must(/broll|close-up/i.test(JSON.stringify(reel.plan || {})), 'note was not applied to plan');
    return `plan v${reel.planVersion}, stage ${reel.stage}`;
  });

  await check('export still blocked after revision', async () => {
    const { res } = await request(`/api/reels/${encodeURIComponent(reelId)}/version`, {
      method: 'POST',
      body: { videoUrl: `https://example.invalid/smoke-blocked2-${suffix}.webm` },
    });
    must(res.status === 409, `expected 409, got ${res.status}`);
    return '409 re-approval required';
  });

  await check('approve storyboard', async () => {
    const { res, json } = await request(`/api/reels/${encodeURIComponent(reelId)}/review`, {
      method: 'POST',
      body: { action: 'approve-storyboard', version: 1, text: 'Smoke approval', idem: `smoke-${suffix}` },
    });
    must(res.ok, json.error || `HTTP ${res.status}`);
    must(String(json.reel.stage) === 'approved', `expected approved, got ${json.reel.stage}`);
    return `stage ${json.reel.stage}`;
  });

  await check('export allowed after approval', async () => {
    const { res, json } = await request(`/api/reels/${encodeURIComponent(reelId)}/version`, {
      method: 'POST',
      body: { videoUrl: `https://example.invalid/smoke-export-${suffix}.webm`, note: 'Smoke export' },
    });
    must(res.ok, json.error || `HTTP ${res.status}`);
    const versions = (json.reel && json.reel.versions) || [];
    must(versions.length === 2, `expected 2 versions, got ${versions.length}`);
    must(String(json.reel.stage) === 'done', `expected stage done, got ${json.reel.stage}`);
    return `version ${versions[versions.length - 1].version}, stage ${json.reel.stage}`;
  });

  await check('second revision requires re-approval', async () => {
    const patched = await request(`/api/reels/${encodeURIComponent(reelId)}/plan`, {
      method: 'PATCH',
      body: { plan: planner.normalizePlan({ ...plan, title: `rev2-${suffix}` }) },
    });
    must(patched.res.ok, patched.json.error || `HTTP ${patched.res.status}`);
    must(String(patched.json.reel.stage) === 'storyboard', 'stage did not reset');
    const blocked = await request(`/api/reels/${encodeURIComponent(reelId)}/version`, {
      method: 'POST',
      body: { videoUrl: `https://example.invalid/smoke-blocked3-${suffix}.webm` },
    });
    must(blocked.res.status === 409, `expected 409 after second revision, got ${blocked.res.status}`);
    return 'stage reset and export blocked again';
  });

  console.log(`\nSummary: ${passed} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
}

main().catch((err) => {
  console.error('Plan smoke crashed:', err && err.message ? err.message : err);
  process.exitCode = 1;
});
