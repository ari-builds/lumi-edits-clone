// Shared Neon HTTP database helper (zero dependencies).
// Uses Neon's SQL-over-HTTP API with the neon-connection-string header.
// Set DATABASE_URL in the environment (Vercel) or .env.local (local dev).

let _ctx = null;

function getCtx() {
  if (_ctx) return _ctx;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not configured');
  const u = new URL(url);
  _ctx = { endpoint: `https://${u.host}/sql`, url };
  return _ctx;
}

async function query(text, params = []) {
  const { endpoint, url } = getCtx();
  const r = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'neon-connection-string': url },
    body: JSON.stringify({ query: text, params }),
  });
  let j;
  try { j = await r.json(); } catch { throw new Error('DB returned non-JSON'); }
  if (j.error || !r.ok) {
    throw new Error(j.error?.message || j.message || `DB error ${r.status}`);
  }
  return j.rows || [];
}

// One statement per call (HTTP API does not support multi-statement strings well).
async function ensureSchema() {
  const stmts = [
    `CREATE TABLE IF NOT EXISTS users (
       id TEXT PRIMARY KEY,
       username TEXT NOT NULL,
       email TEXT NOT NULL UNIQUE,
       password_hash TEXT NOT NULL,
       avatar TEXT,
       created_at TEXT NOT NULL
     )`,
    `CREATE TABLE IF NOT EXISTS sessions (
       token TEXT PRIMARY KEY,
       user_id TEXT NOT NULL,
       created_at TEXT NOT NULL
     )`,
    `CREATE TABLE IF NOT EXISTS reels (
       id TEXT PRIMARY KEY,
       user_id TEXT NOT NULL,
       username TEXT NOT NULL,
       video_url TEXT NOT NULL,
       caption TEXT DEFAULT '',
       style TEXT DEFAULT 'classic',
       likes INTEGER NOT NULL DEFAULT 0,
       created_at TEXT NOT NULL
     )`,
    // Extended reel workflow fields (safe against databases created by earlier versions).
    `ALTER TABLE reels ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'review'`,
    `ALTER TABLE reels ADD COLUMN IF NOT EXISTS title TEXT DEFAULT ''`,
    `ALTER TABLE reels ADD COLUMN IF NOT EXISTS brief TEXT DEFAULT ''`,
    `ALTER TABLE reels ADD COLUMN IF NOT EXISTS look TEXT DEFAULT 'classic'`,
    `ALTER TABLE reels ADD COLUMN IF NOT EXISTS format TEXT DEFAULT 'vertical'`,
    `ALTER TABLE reels ADD COLUMN IF NOT EXISTS revision INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE reels ADD COLUMN IF NOT EXISTS revision_limit INTEGER NOT NULL DEFAULT 5`,
    `ALTER TABLE reels ADD COLUMN IF NOT EXISTS no_music_url TEXT DEFAULT ''`,
    `ALTER TABLE reels ADD COLUMN IF NOT EXISTS source_kind TEXT DEFAULT ''`,
    `ALTER TABLE reels ADD COLUMN IF NOT EXISTS source_url TEXT DEFAULT ''`,
    `ALTER TABLE reels ADD COLUMN IF NOT EXISTS shorts INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE reels ADD COLUMN IF NOT EXISTS updated_at TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE reels ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'review'`,
    `ALTER TABLE reels ADD COLUMN IF NOT EXISTS status_message TEXT DEFAULT ''`,
    `ALTER TABLE reels ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT ''`,
    `ALTER TABLE reels ADD COLUMN IF NOT EXISTS storyboard TEXT DEFAULT ''`,
    `ALTER TABLE reels ADD COLUMN IF NOT EXISTS plan_version INTEGER NOT NULL DEFAULT 0`,
    `CREATE TABLE IF NOT EXISTS project_assets (
       id TEXT PRIMARY KEY,
       reel_id TEXT NOT NULL,
       user_id TEXT,
       kind TEXT NOT NULL DEFAULT 'raw',
       name TEXT DEFAULT '',
       url TEXT NOT NULL,
       remote INTEGER NOT NULL DEFAULT 0,
       of_index INTEGER NOT NULL DEFAULT 0,
       analysis TEXT DEFAULT '',
       created_at TEXT NOT NULL
     )`,
    `CREATE TABLE IF NOT EXISTS reel_versions (
       reel_id TEXT NOT NULL,
       version INTEGER NOT NULL,
       video_url TEXT NOT NULL,
       no_music_url TEXT DEFAULT '',
       poster_url TEXT DEFAULT '',
       note TEXT DEFAULT '',
       plan_version INTEGER NOT NULL DEFAULT 0,
       created_at TEXT NOT NULL,
       PRIMARY KEY (reel_id, version)
     )`,
    `ALTER TABLE reel_versions ADD COLUMN IF NOT EXISTS plan_version INTEGER NOT NULL DEFAULT 0`,
    `CREATE TABLE IF NOT EXISTS reel_notes (
       id TEXT PRIMARY KEY,
       reel_id TEXT NOT NULL,
       version INTEGER NOT NULL DEFAULT 1,
       t REAL NOT NULL DEFAULT 0,
       t_end REAL,
       text TEXT NOT NULL,
       kind TEXT NOT NULL DEFAULT 'note',
       status TEXT NOT NULL DEFAULT 'open',
       created_at TEXT NOT NULL
     )`,
    `CREATE TABLE IF NOT EXISTS drafts (
       user_id TEXT PRIMARY KEY,
       data TEXT NOT NULL,
       updated_at TEXT NOT NULL
     )`,
    `CREATE TABLE IF NOT EXISTS covers (
       reel_id TEXT PRIMARY KEY,
       data TEXT NOT NULL,
       updated_at TEXT NOT NULL
     )`,
    `CREATE TABLE IF NOT EXISTS intents (
       id TEXT PRIMARY KEY,
       user_id TEXT,
       kind TEXT NOT NULL,
       reel_id TEXT,
       payload TEXT DEFAULT '',
       idem TEXT UNIQUE,
       created_at TEXT NOT NULL
     )`,
    `CREATE TABLE IF NOT EXISTS events (
       id TEXT PRIMARY KEY,
       user_id TEXT,
       kind TEXT NOT NULL,
       payload TEXT DEFAULT '',
       created_at TEXT NOT NULL
     )`,
    `CREATE TABLE IF NOT EXISTS estimator_leads (
       id TEXT PRIMARY KEY,
       site TEXT NOT NULL DEFAULT '',
       reference TEXT NOT NULL,
       payload TEXT NOT NULL,
       notified INTEGER NOT NULL DEFAULT 0,
       created_at TEXT NOT NULL
     )`,
    `CREATE TABLE IF NOT EXISTS uploads (
       id TEXT PRIMARY KEY,
       user_id TEXT,
       reel_id TEXT,
       batch TEXT DEFAULT '',
       of_index INTEGER NOT NULL DEFAULT 0,
       kind TEXT DEFAULT '',
       object_key TEXT NOT NULL,
       public_url TEXT NOT NULL,
       created_at TEXT NOT NULL
     )`,
    `CREATE TABLE IF NOT EXISTS reel_likes (
       reel_id TEXT NOT NULL,
       user_id TEXT NOT NULL,
       PRIMARY KEY (reel_id, user_id)
     )`,
    `CREATE TABLE IF NOT EXISTS comments (
       id TEXT PRIMARY KEY,
       reel_id TEXT NOT NULL,
       user_id TEXT NOT NULL,
       username TEXT NOT NULL,
       text TEXT NOT NULL,
       created_at TEXT NOT NULL
     )`,
    `CREATE TABLE IF NOT EXISTS conv_users (
       id TEXT PRIMARY KEY,
       username TEXT NOT NULL
     )`,
    `CREATE TABLE IF NOT EXISTS conversations (
       id TEXT PRIMARY KEY,
       user1 TEXT NOT NULL,
       user2 TEXT NOT NULL,
       updated_at TEXT NOT NULL
     )`,
    `CREATE TABLE IF NOT EXISTS messages (
       id TEXT PRIMARY KEY,
       conversation_id TEXT NOT NULL,
       sender_id TEXT NOT NULL,
       text TEXT DEFAULT '',
       video_url TEXT,
       created_at TEXT NOT NULL
     )`,
    `CREATE TABLE IF NOT EXISTS payment_intents (
       client_secret TEXT PRIMARY KEY,
       amount INTEGER NOT NULL,
       currency TEXT NOT NULL,
       method TEXT NOT NULL,
       status TEXT NOT NULL,
       created_at TEXT NOT NULL
     )`,
    `CREATE TABLE IF NOT EXISTS payments (
       id TEXT PRIMARY KEY,
       client_secret TEXT NOT NULL,
       amount INTEGER NOT NULL,
       currency TEXT NOT NULL,
       status TEXT NOT NULL,
       user_id TEXT,
       created_at TEXT NOT NULL
     )`,
  ];
  for (const s of stmts) await query(s);
}

let _schemaReady = null;
async function ready() {
  if (!_schemaReady) _schemaReady = ensureSchema().catch((e) => { _schemaReady = null; throw e; });
  return _schemaReady;
}

// --- shared helpers used by endpoints ---
const crypto = require('crypto');

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}
function verifyPassword(password, stored) {
  try {
    const [salt, hash] = stored.split(':');
    const calc = crypto.scryptSync(password, salt, 64).toString('hex');
    return hash === calc;
  } catch { return false; }
}
function newId(prefix = '') { return prefix + Date.now().toString(36) + crypto.randomBytes(4).toString('hex'); }

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}
function parseBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); } catch { resolve({}); }
    });
  });
}
function getToken(req) {
  const auth = req.headers['authorization'] || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}
async function userFromReq(req) {
  const token = getToken(req);
  if (!token) return null;
  const rows = await query(
    `SELECT u.id, u.username, u.email, u.avatar FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = $1`,
    [token]
  );
  return rows[0] || null;
}
function cors(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return true; }
  return false;
}

// --- small row shapers shared by endpoints ---
function parseJson(text, fallback) {
  if (text == null || text === '') return fallback;
  try { return JSON.parse(text); } catch { return fallback; }
}

function versionShape(row) {
  if (!row) return null;
  return {
    version: Number(row.version || 1),
    videoUrl: row.video_url || '',
    noMusicUrl: row.no_music_url || '',
    posterUrl: row.poster_url || '',
    note: row.note || '',
    planVersion: Number(row.plan_version || 0),
    createdAt: row.created_at || '',
  };
}

function noteShape(row) {
  if (!row) return null;
  return {
    id: row.id,
    reelId: row.reel_id,
    version: Number(row.version || 1),
    t: Number(row.t || 0),
    tEnd: row.t_end == null ? null : Number(row.t_end),
    text: row.text || '',
    kind: row.kind || 'note',
    status: row.status || 'open',
    createdAt: row.created_at || '',
  };
}

function assetShape(row) {
  if (!row) return null;
  return {
    id: row.id || null,
    reelId: row.reel_id || null,
    kind: row.kind || 'raw',
    name: row.name || '',
    url: row.url || '',
    remote: Boolean(row.remote),
    ofIndex: Number(row.of_index || 0),
    analysis: parseJson(row.analysis, null),
    createdAt: row.created_at || '',
  };
}

function reelShape(row, versions = [], notes = [], assets = []) {
  if (!row) return null;
  const vs = Array.isArray(versions) ? versions : [];
  const ns = Array.isArray(notes) ? notes : [];
  const as = Array.isArray(assets) ? assets : [];
  const last = vs.length ? vs[vs.length - 1] : null;
  const lastPoster = last ? (last.posterUrl || last.poster_url || '') : '';
  const lastNoMusic = last ? (last.noMusicUrl || last.no_music_url || '') : '';
  return {
    id: row.id,
    userId: row.user_id,
    user: row.username,
    avatar: row.avatar || null,
    videoUrl: row.video_url || '',
    noMusicUrl: row.no_music_url || lastNoMusic || '',
    posterUrl: row.poster_url || lastPoster || '',
    caption: row.caption || '',
    title: row.title || '',
    brief: row.brief || '',
    look: row.look || 'classic',
    format: row.format || 'vertical',
    status: row.status || 'review',
    stage: row.stage || (row.plan ? 'storyboard' : 'review'),
    statusMessage: row.status_message || '',
    plan: parseJson(row.plan, null),
    planVersion: Number(row.plan_version || 0),
    storyboard: parseJson(row.storyboard, []),
    assets: as,
    revision: Number(row.revision || 0),
    revisionLimit: Number(row.revision_limit || 5),
    sourceKind: row.source_kind || '',
    sourceUrl: row.source_url || '',
    shorts: Number(row.shorts || 0),
    style: row.style || 'classic',
    likes: Number(row.likes || 0),
    comments: [],
    versions: vs,
    notes: ns,
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
  };
}

module.exports = {
  query, ready, hashPassword, verifyPassword, newId, json, parseBody, getToken, userFromReq, cors,
  parseJson, versionShape, noteShape, assetShape, reelShape,
};
