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
       user TEXT NOT NULL,
       video_url TEXT NOT NULL,
       caption TEXT DEFAULT '',
       style TEXT DEFAULT 'classic',
       likes INTEGER NOT NULL DEFAULT 0,
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
       user TEXT NOT NULL,
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

module.exports = { query, ready, hashPassword, verifyPassword, newId, json, parseBody, getToken, userFromReq, cors };
