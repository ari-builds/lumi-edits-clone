// Covers API — per-reel cover JSON blob in Neon.
//   GET /api/covers/:reelId  Authorization: Bearer <token> -> { cover }
//   PUT /api/covers/:reelId  Authorization: Bearer <token> { cover } -> { cover }

const db = require('./_db');

module.exports = async (req, res) => {
  if (db.cors(req, res)) return;
  const { query, ready, json, parseBody, userFromReq, parseJson } = db;
  try { await ready(); } catch (e) { return json(res, 500, { error: 'Database unavailable: ' + e.message }); }

  const url = req.url.split('?')[0];
  const m = url.match(/^\/api\/covers\/([^/]+)$/);
  if (!m) return json(res, 404, { error: 'not found' });
  if (req.method !== 'GET' && req.method !== 'PUT') return json(res, 404, { error: 'not found' });

  try {
    const user = await userFromReq(req);
    if (!user) return json(res, 401, { error: 'not authenticated' });
    const reelId = m[1];

    if (req.method === 'GET') {
      const rows = await query('SELECT data FROM covers WHERE reel_id = $1', [reelId]);
      const cover = rows.length ? parseJson(rows[0].data, {}) : {};
      return json(res, 200, { cover });
    }

    const body = await parseBody(req);
    const cover = body.cover == null ? {} : body.cover;
    const updated = new Date().toISOString();
    await query(
      'INSERT INTO covers (reel_id, data, updated_at) VALUES ($1,$2,$3) ON CONFLICT (reel_id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at',
      [reelId, JSON.stringify(cover), updated]
    );
    return json(res, 200, { cover });
  } catch (e) {
    json(res, 500, { error: e.message });
  }
};
