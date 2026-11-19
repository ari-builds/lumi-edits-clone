// End-to-end review-flow check against a live deployment.
// Uses the gitignored .smoke-token written by smoke-lumi-parity.cjs.
// Creates one clearly-labelled throwaway reel and exercises the full review pipeline.
// Credentials are read from a local file only and are never printed.

'use strict';

const fs = require('fs');
const path = require('path');

const BASE = (process.env.BASE_URL || 'https://lumi-edits-clone.vercel.app').replace(/\/$/, '');
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
  console.log(`Lumi review-flow smoke: ${BASE}`);
  let reelId = '';
  let noteId = '';
  const suffix = Date.now();

  await check('create link-intake reel (no videoUrl)', async () => {
    const { res, json } = await request('/api/reels', {
      method: 'POST',
      body: {
        sourceKind: 'link',
        sourceUrl: `https://example.invalid/smoke-${suffix}`,
        videoUrl: '',
        title: `__smoke_review_flow_${suffix}__`,
        brief: 'Smoke-test brief: verify link intake and review pipeline.',
        look: 'classic',
        format: 'vertical',
        status: 'waiting',
        captions: 'off',
      },
    });
    must(res.ok, json.error || `HTTP ${res.status}`);
    must(json.reel && json.reel.id, 'response did not include reel.id');
    must(json.reel.status === 'waiting', `expected waiting status, got ${json.reel.status}`);
    reelId = json.reel.id;
    return `reel ${reelId}, status waiting`;
  });

  await check('add timecoded note', async () => {
    const { res, json } = await request(`/api/reels/${encodeURIComponent(reelId)}/notes`, {
      method: 'POST',
      body: { version: 1, t: 1.25, tEnd: 3.5, text: 'Smoke note — check this cut', kind: 'note' },
    });
    must(res.ok, json.error || `HTTP ${res.status}`);
    must(json.note && json.note.id, 'response did not include note.id');
    noteId = json.note.id;
    return `note ${noteId} at 1.25–3.5s`;
  });

  await check('read back note with range', async () => {
    const { res, json } = await request(`/api/reels/${encodeURIComponent(reelId)}/notes`);
    must(res.ok, json.error || `HTTP ${res.status}`);
    const note = (json.notes || []).find((n) => n.id === noteId);
    must(note, 'new note not found');
    must(Number(note.t) === 1.25, `bad t: ${note.t}`);
    must(Number(note.tEnd) === 3.5, `bad tEnd: ${note.tEnd}`);
    return `range ${note.t}–${note.tEnd}s`;
  });

  await check('resolve note', async () => {
    const { res, json } = await request(`/api/reels/${encodeURIComponent(reelId)}/notes/${encodeURIComponent(noteId)}`, {
      method: 'PATCH',
      body: { status: 'resolved' },
    });
    must(res.ok, json.error || `HTTP ${res.status}`);
    must(json.note && String(json.note.status) === 'resolved', 'status did not persist');
    return 'status resolved';
  });

  await check('request changes', async () => {
    const { res, json } = await request(`/api/reels/${encodeURIComponent(reelId)}/review`, {
      method: 'POST',
      body: { action: 'changes', version: 1, text: 'Smoke review: please tighten the hook' },
    });
    must(res.ok, json.error || `HTTP ${res.status}`);
    must(json.reel, 'response did not include reel');
    return `status ${json.reel.status}, revision ${json.reel.revision}`;
  });

  await check('add exported version', async () => {
    const { res, json } = await request(`/api/reels/${encodeURIComponent(reelId)}/version`, {
      method: 'POST',
      body: {
        videoUrl: `https://example.invalid/smoke-v2-${suffix}.webm`,
        posterUrl: '',
        noMusicUrl: '',
        note: 'Smoke version 2',
      },
    });
    must(res.ok, json.error || `HTTP ${res.status}`);
    // POST /api/reels seeds a v1 version; the export adds v2.
    const versions = json.reel?.versions || [];
    must(versions.length === 2, `expected 2 versions (seed v1 + export v2), got ${versions.length}`);
    must(Number(versions[versions.length - 1].version) === 2, `expected latest version 2, got ${versions[versions.length - 1].version}`);
    return `version ${versions[versions.length - 1].version} recorded`;
  });

  await check('approve latest version', async () => {
    const { res, json } = await request(`/api/reels/${encodeURIComponent(reelId)}/review`, {
      method: 'POST',
      body: { action: 'approve', version: 2, text: 'Smoke review: approved' },
    });
    must(res.ok, json.error || `HTTP ${res.status}`);
    must(json.reel, 'response did not include reel');
    return `status ${json.reel.status}`;
  });

  await check('final reel shape is complete', async () => {
    const { res, json } = await request('/api/reels');
    must(res.ok, json.error || `HTTP ${res.status}`);
    const reel = (json.reels || []).find((r) => r.id === reelId);
    must(reel, 'created reel missing from feed');
    must(Array.isArray(reel.versions) && reel.versions.length === 2, 'versions missing');
    must(Array.isArray(reel.notes) && reel.notes.length === 1, 'notes missing');
    must(reel.notes[0].status === 'resolved', 'note status missing');
    must(Number(reel.revision) >= 1, 'revision not incremented');
    return `status ${reel.status}, ${reel.versions.length} version, ${reel.notes.length} note`;
  });

  console.log(`\nSummary: ${passed} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
}

main().catch((err) => {
  console.error('Flow smoke crashed:', err && err.message ? err.message : err);
  process.exitCode = 1;
});
