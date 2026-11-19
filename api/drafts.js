// Drafts API — per-user JSON draft blob in Neon.
//   GET /api/drafts  Authorization: Bearer <token> -> { draft }
//   PUT /api/drafts  Authorization: Bearer <token> { draft } -> { draft }

const db = require('./_db');

module.exports = async (req, res) => {
  if (db.cors(req, res)) return;
  const { query, ready, json, parseBody, userFromReq, parseJson } = db;
  try { await ready(); } catch (e) { return json(res, 500, { error: 'Database unavailable: ' + e.message }); }

  const url = req.url.split('?')[0];
  if (url !== '/api/drafts') return json(res, 404, { error: 'not found' });
  if (req.method !== 'GET' && req.method !== 'PUT') return json(res, 404, { error: 'not found' });

  try {
    const user = await userFromReq(req);
    if (!user) return json(res, 401, { error: 'not authenticated' });

    if (req.method === 'GET') {
      const rows = await query('SELECT data FROM drafts WHERE user_id = $1', [user.id]);
      const draft = rows.length ? parseJson(rows[0].data, {}) : {};
      return json(res, 200, { draft });
    }

    const body = await parseBody(req);
    const draft = body.draft == null ? {} : body.draft;
    const updated = new Date().toISOString();
    await query(
      'INSERT INTO drafts (user_id, data, updated_at) VALUES ($1,$2,$3) ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at',
      [user.id, JSON.stringify(draft), updated]
    );
    return json(res, 200, { draft });
  } catch (e) {
    json(res, 500, { error: e.message });
  }
};
