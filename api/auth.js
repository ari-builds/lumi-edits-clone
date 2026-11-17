// Lumi Edits Clone — Auth API (in-memory demo storage)
// Endpoints:
//   POST /api/auth/register  { username, email, password } -> { token, user }
//   POST /api/auth/login     { email, password }           -> { token, user }
//   GET  /api/auth/me        Authorization: Bearer <token> -> { user }

const users = [];
const sessions = new Map(); // token -> user

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function parseBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch { resolve({}); }
    });
  });
}

function getToken(req) {
  const auth = req.headers['authorization'] || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

module.exports = async (req, res) => {
  // CORS for local dev
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = req.url.split('?')[0];

  // --- Register ---
  if (url === '/api/auth/register' && req.method === 'POST') {
    const body = await parseBody(req);
    const { username, email, password } = body;
    if (!username || !email || !password) {
      return json(res, 400, { error: 'username, email, and password are required' });
    }
    if (users.find((u) => u.email === email)) {
      return json(res, 409, { error: 'email already registered' });
    }
    const user = { id: String(users.length + 1), username, email, avatar: null, createdAt: new Date().toISOString() };
    users.push(user);
    const token = 'tok_' + Math.random().toString(36).slice(2) + Date.now();
    sessions.set(token, user);
    return json(res, 201, { token, user });
  }

  // --- Login ---
  if (url === '/api/auth/login' && req.method === 'POST') {
    const body = await parseBody(req);
    const { email, password } = body;
    if (!email || !password) {
      return json(res, 400, { error: 'email and password are required' });
    }
    const user = users.find((u) => u.email === email);
    if (!user) {
      return json(res, 401, { error: 'invalid credentials' });
    }
    const token = 'tok_' + Math.random().toString(36).slice(2) + Date.now();
    sessions.set(token, user);
    return json(res, 200, { token, user });
  }

  // --- Me ---
  if (url === '/api/auth/me' && req.method === 'GET') {
    const token = getToken(req);
    if (!token || !sessions.has(token)) {
      return json(res, 401, { error: 'not authenticated' });
    }
    return json(res, 200, { user: sessions.get(token) });
  }

  json(res, 404, { error: 'not found' });
};
