// Auth API — persistent users/sessions in Neon.
//   POST /api/auth/register { username, email, password } -> { token, user }
//   POST /api/auth/login    { email, password }           -> { token, user }
//   GET  /api/auth/me       Authorization: Bearer <token> -> { user }

const db = require('./_db');

module.exports = async (req, res) => {
  if (db.cors(req, res)) return;
  const { query, ready, hashPassword, verifyPassword, json, parseBody, userFromReq, newId } = db;

  try {
    await ready();
  } catch (e) {
    return json(res, 500, { error: 'Database unavailable: ' + e.message });
  }

  const url = req.url.split('?')[0];

  if (url === '/api/auth/register' && req.method === 'POST') {
    const body = await parseBody(req);
    const { username, email, password } = body;
    if (!username || !email || !password) return json(res, 400, { error: 'username, email, and password are required' });
    const emailLc = String(email).toLowerCase().trim();
    try {
      const existing = await query('SELECT id FROM users WHERE email = $1', [emailLc]);
      if (existing.length) return json(res, 409, { error: 'email already registered' });
      const id = newId('u_');
      const created = new Date().toISOString();
      await query(
        'INSERT INTO users (id, username, email, password_hash, created_at) VALUES ($1,$2,$3,$4,$5)',
        [id, String(username).trim(), emailLc, hashPassword(String(password)), created]
      );
      const token = newId('tok_');
      await query('INSERT INTO sessions (token, user_id, created_at) VALUES ($1,$2,$3)', [token, id, created]);
      return json(res, 201, { token, user: { id, username: String(username).trim(), email: emailLc, avatar: null } });
    } catch (e) {
      return json(res, 500, { error: e.message });
    }
  }

  if (url === '/api/auth/login' && req.method === 'POST') {
    const body = await parseBody(req);
    const { email, password } = body;
    if (!email || !password) return json(res, 400, { error: 'email and password are required' });
    const emailLc = String(email).toLowerCase().trim();
    try {
      const rows = await query('SELECT id, username, email, avatar, password_hash FROM users WHERE email = $1', [emailLc]);
      const user = rows[0];
      if (!user || !verifyPassword(String(password), user.password_hash)) return json(res, 401, { error: 'invalid credentials' });
      const token = newId('tok_');
      await query('INSERT INTO sessions (token, user_id, created_at) VALUES ($1,$2,$3)', [token, user.id, new Date().toISOString()]);
      return json(res, 200, { token, user: { id: user.id, username: user.username, email: user.email, avatar: user.avatar } });
    } catch (e) {
      return json(res, 500, { error: e.message });
    }
  }

  if (url === '/api/auth/me' && req.method === 'GET') {
    try {
      const user = await userFromReq(req);
      if (!user) return json(res, 401, { error: 'not authenticated' });
      return json(res, 200, { user });
    } catch (e) {
      return json(res, 500, { error: e.message });
    }
  }

  json(res, 404, { error: 'not found' });
};
