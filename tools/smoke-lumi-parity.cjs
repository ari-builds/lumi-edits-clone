// Functional smoke checks for the Lumi parity deployment.
// - Read-only by default. Writes are limited to idempotent intent + temporary draft/cover checks.
// - Credentials come from env only and are never printed:
//   BASE_URL, LUMI_TOKEN  OR  LUMI_EMAIL + LUMI_PASSWORD
//   LUMI_SMOKE_UPLOAD=1 additionally PUTs a tiny blob to the presigned URL.

'use strict';

const fs = require('fs');
const path = require('path');

const BASE = (process.env.BASE_URL || 'https://lumi-edits-clone.vercel.app').replace(/\/$/, '');
const TOKEN_FILE = path.resolve(__dirname, '..', '.smoke-token');
let token = process.env.LUMI_TOKEN || '';
let passed = 0;
let failed = 0;
let skipped = 0;

function log(status, name, detail = '') {
  if (status === 'PASS') passed += 1;
  if (status === 'FAIL') failed += 1;
  if (status === 'SKIP') skipped += 1;
  console.log(`${status.padEnd(4)} ${name}${detail ? ` — ${detail}` : ''}`);
}

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = {};
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (auth && token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: 'manual',
  });
  let json = {};
  try { json = await res.json(); } catch {}
  return { res, json };
}

async function check(name, fn) {
  try {
    const detail = await fn();
    log('PASS', name, detail || '');
  } catch (err) {
    log('FAIL', name, err && err.message ? err.message : String(err));
  }
}

async function main() {
  console.log(`Lumi parity smoke: ${BASE}`);

  if (!token && fs.existsSync(TOKEN_FILE)) {
    try {
      const saved = fs.readFileSync(TOKEN_FILE, 'utf8').trim();
      if (saved) {
        const me = await fetch(`${BASE}/api/auth/me`, { headers: { authorization: `Bearer ${saved}` } });
        if (me.ok) {
          token = saved;
          log('PASS', 'reuse saved smoke token', 'token still valid');
        }
      }
    } catch {}
  }

  if (!token && process.env.LUMI_EMAIL && process.env.LUMI_PASSWORD) {
    await check('auth login from env', async () => {
      const { res, json } = await request('/api/auth/login', {
        method: 'POST',
        body: { email: process.env.LUMI_EMAIL, password: process.env.LUMI_PASSWORD },
      });
      if (!res.ok || !json.token) throw new Error(json.error || `HTTP ${res.status}`);
      token = json.token;
      return 'token received';
    });
  }

  if (!token && process.env.LUMI_SMOKE_CREATE_USER === '1') {
    await check('register throwaway smoke user', async () => {
      const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const email = `smoke-${suffix}@example.invalid`;
      const password = `Smoke_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}!`;
      const { res, json } = await request('/api/auth/register', {
        method: 'POST',
        body: { username: `smoke_${suffix.replace(/[^a-z0-9]/gi, '_')}`, email, password },
      });
      if (!res.ok || !json.token) throw new Error(json.error || `HTTP ${res.status}`);
      token = json.token;
      fs.writeFileSync(TOKEN_FILE, token, { encoding: 'utf8', mode: 0o600 });
      return 'throwaway token saved locally';
    });
  }

  if (!token) log('SKIP', 'authenticated endpoint checks', 'set LUMI_TOKEN, LUMI_EMAIL/LUMI_PASSWORD, or LUMI_SMOKE_CREATE_USER=1');

  await check('PWA shell serves editor script', async () => {
    for (const path of ['/app/index.html', '/app/app.js', '/app/editor.js', '/app/styles.css', '/app/sw.js', '/app/manifest.webmanifest']) {
      const res = await fetch(BASE + path);
      if (!res.ok) throw new Error(`${path} -> ${res.status}`);
    }
    return 'all app assets return 200';
  });

  await check('GET /api/styles returns expanded catalog', async () => {
    const { res, json } = await request('/api/styles');
    if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
    if (!Array.isArray(json.styles) || json.styles.length < 10) throw new Error('styles missing');
    const required = ['templates', 'captions', 'motion', 'vfx', 'grades', 'hooks', 'backgrounds', 'music', 'voices', 'formats'];
    const missing = required.filter((k) => !Array.isArray(json[k]));
    if (missing.length) throw new Error('missing catalog arrays: ' + missing.join(','));
    return `${json.styles.length} styles, ${required.length} catalog groups`;
  });

  await check('GET /api/upload issues presigned PUT', async () => {
    const { res, json } = await request('/api/upload', {
      method: 'POST',
      auth: !!token,
      body: { fileName: `smoke-${Date.now()}.webm`, fileType: 'video/webm' },
    });
    if (!res.ok || !json.uploadUrl || !json.publicUrl) throw new Error(json.error || `HTTP ${res.status}`);
    if (process.env.LUMI_SMOKE_UPLOAD === '1') {
      const put = await fetch(json.uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'video/webm' }, body: new Uint8Array([1, 2, 3]) });
      if (!put.ok) throw new Error(`PUT ${put.status}`);
      const get = await fetch(json.publicUrl);
      if (!get.ok) throw new Error(`GET ${get.status}`);
      return 'presign + PUT + GET round trip';
    }
    return 'presign URL issued (PUT skipped)';
  });

  if (token) {
    let state;
    await check('GET /api/state returns consolidated payload', async () => {
      const { res, json } = await request('/api/state', { auth: true });
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      const required = ['user', 'reels', 'conversations', 'catalog', 'draft', 'account', 'price', 'notices'];
      const missing = required.filter((k) => !(k in json));
      if (missing.length) throw new Error('missing keys: ' + missing.join(','));
      state = json;
      return `${(json.reels || []).length} reels`;
    });

    await check('GET /api/reels exposes review fields', async () => {
      const { res, json } = await request('/api/reels');
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      const reel = (json.reels || [])[0];
      if (!reel) return 'no reels to inspect';
      const required = ['status', 'title', 'brief', 'look', 'format', 'revision', 'revisionLimit', 'versions', 'notes'];
      const missing = required.filter((k) => !(k in reel));
      if (missing.length) throw new Error('missing fields: ' + missing.join(','));
      return `first reel ${reel.id} has ${(reel.versions || []).length} version(s)`;
    });

    await check('GET/PUT /api/drafts round trip', async () => {
      const before = await request('/api/drafts', { auth: true });
      if (!before.res.ok) throw new Error(before.json.error || `GET ${before.res.status}`);
      const marker = `__smoke_${Date.now()}__`;
      const put = await request('/api/drafts', { method: 'PUT', auth: true, body: { draft: { ...(before.json.draft || {}), smoke: marker } } });
      if (!put.res.ok) throw new Error(put.json.error || `PUT ${put.res.status}`);
      const after = await request('/api/drafts', { auth: true });
      if (after.json.draft?.smoke !== marker) throw new Error('draft marker not persisted');
      await request('/api/drafts', { method: 'PUT', auth: true, body: { draft: before.json.draft || {} } });
      return 'draft persisted and restored';
    });

    const reelId = (state?.reels || [])[0]?.id;
    if (!reelId) {
      log('SKIP', 'cover/note endpoint checks', 'no reel available');
    } else {
      await check('GET /api/reels/:id/notes', async () => {
        const { res, json } = await request(`/api/reels/${encodeURIComponent(reelId)}/notes`);
        if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
        if (!Array.isArray(json.notes)) throw new Error('notes is not an array');
        return `${json.notes.length} note(s)`;
      });

      await check('GET/PUT /api/covers/:reelId round trip', async () => {
        const before = await request(`/api/covers/${encodeURIComponent(reelId)}`, { auth: true });
        if (!before.res.ok) throw new Error(before.json.error || `GET ${before.res.status}`);
        const marker = `__smoke_${Date.now()}__`;
        const put = await request(`/api/covers/${encodeURIComponent(reelId)}`, {
          method: 'PUT', auth: true, body: { cover: { ...(before.json.cover || {}), smoke: marker } },
        });
        if (!put.res.ok) throw new Error(put.json.error || `PUT ${put.res.status}`);
        const after = await request(`/api/covers/${encodeURIComponent(reelId)}`, { auth: true });
        if (after.json.cover?.smoke !== marker) throw new Error('cover marker not persisted');
        await request(`/api/covers/${encodeURIComponent(reelId)}`, { method: 'PUT', auth: true, body: { cover: before.json.cover || {} } });
        return 'cover persisted and restored';
      });
    }

    await check('POST /api/intent is idempotent', async () => {
      const idem = `smoke-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const body = { kind: 'smoke', text: 'parity smoke check', idem, payload: { source: 'smoke' } };
      const one = await request('/api/intent', { method: 'POST', auth: true, body });
      if (!one.res.ok) throw new Error(one.json.error || `HTTP ${one.res.status}`);
      const two = await request('/api/intent', { method: 'POST', auth: true, body });
      if (!two.res.ok) throw new Error(two.json.error || `HTTP ${two.res.status}`);
      if (one.json.intent?.id !== two.json.intent?.id) throw new Error('idempotency key returned different intent ids');
      return 'same intent id on duplicate submit';
    });
  }

  console.log(`\nSummary: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  if (failed) process.exitCode = 1;
}

main().catch((err) => {
  console.error('Smoke run crashed:', err && err.message ? err.message : err);
  process.exitCode = 1;
});
