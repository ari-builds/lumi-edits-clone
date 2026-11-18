// Reels API — persistent reels, likes, comments in Neon.
//   GET  /api/reels                -> { reels }
//   POST /api/reels                { videoUrl, caption, style, ... } -> { reel }
//   POST /api/reels/:id/like       Authorization optional -> { liked, likes }
//   POST /api/reels/:id/comment    { text, userId, user } -> { comment }
//   GET  /api/reels/:id/comments   -> { comments }

const db = require('./_db');

// Demo seed reels (played from public sample videos). Inserted once if table empty.
const SEED = [
  { id: 'r1', user: 'mia.edits', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', caption: 'morning light edit ☀️', style: 'golden', likes: 1240 },
  { id: 'r2', user: 'kai.cuts', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', caption: 'glass aesthetic ✨', style: 'glass', likes: 980 },
  { id: 'r3', user: 'zoe.clips', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', caption: 'matcha vibes 🍵', style: 'matcha', likes: 2100 },
  { id: 'r4', user: 'leo.reels', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', caption: 'clay render 🏺', style: 'clay', likes: 1750 },
  { id: 'r5', user: 'nova.cut', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4', caption: 'silentpower mode 🔇', style: 'silentpower', likes: 3400 },
];

async function seedIfEmpty(query) {
  const rows = await query('SELECT count(*)::int AS n FROM reels');
  if (rows[0] && rows[0].n === 0) {
    for (const r of SEED) {
      await query(
        'INSERT INTO reels (id, user_id, username, video_url, caption, style, likes, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING',
        [r.id, 'seed', r.user, r.videoUrl, r.caption, r.style, r.likes, new Date().toISOString()]
      );
    }
  }
}

module.exports = async (req, res) => {
  if (db.cors(req, res)) return;
  const { query, ready, json, parseBody, newId, userFromReq } = db;
  try { await ready(); } catch (e) { return json(res, 500, { error: 'Database unavailable: ' + e.message }); }

  const url = req.url.split('?')[0];

  try {
    if (url === '/api/reels' && req.method === 'GET') {
      await seedIfEmpty(query);
      const rows = await query('SELECT * FROM reels ORDER BY created_at DESC');
      const reels = rows.map((r) => ({
        id: r.id, userId: r.user_id, user: r.username, avatar: r.avatar || null,
        videoUrl: r.video_url, caption: r.caption, style: r.style,
        likes: Number(r.likes), comments: [], createdAt: r.created_at,
      }));
      return json(res, 200, { reels });
    }

    if (url === '/api/reels' && req.method === 'POST') {
      const body = await parseBody(req);
      const { videoUrl, caption, style } = body;
      if (!videoUrl) return json(res, 400, { error: 'videoUrl is required' });
      const user = await userFromReq(req);
      const id = newId('r_');
      const userId = user ? user.id : (body.userId || 'anon');
      const username = user ? user.username : (body.user || 'you');
      const created = new Date().toISOString();
      await query(
        'INSERT INTO reels (id, user_id, username, video_url, caption, style, likes, created_at) VALUES ($1,$2,$3,$4,$5,$6,0,$7)',
        [id, userId, username, String(videoUrl), String(caption || ''), String(style || 'classic'), created]
      );
      return json(res, 201, { reel: { id, userId, user: username, videoUrl: String(videoUrl), caption: String(caption || ''), style: String(style || 'classic'), likes: 0, comments: [], createdAt: created } });
    }

    let m;
    if ((m = url.match(/^\/api\/reels\/([^/]+)\/like$/)) && req.method === 'POST') {
      const id = m[1];
      const user = await userFromReq(req);
      const userId = user ? user.id : (req.headers['x-user-id'] || 'anon');
      const exists = await query('SELECT id, likes FROM reels WHERE id = $1', [id]);
      if (!exists.length) return json(res, 404, { error: 'reel not found' });
      const prior = await query('SELECT 1 FROM reel_likes WHERE reel_id = $1 AND user_id = $2', [id, userId]);
      if (prior.length) return json(res, 200, { liked: true, likes: Number(exists[0].likes) });
      await query('INSERT INTO reel_likes (reel_id, user_id) VALUES ($1,$2)', [id, userId]);
      const rows = await query('UPDATE reels SET likes = likes + 1 WHERE id = $1 RETURNING likes', [id]);
      return json(res, 200, { liked: true, likes: Number(rows[0].likes) });
    }

    if ((m = url.match(/^\/api\/reels\/([^/]+)\/comment$/)) && req.method === 'POST') {
      const id = m[1];
      const exists = await query('SELECT id FROM reels WHERE id = $1', [id]);
      if (!exists.length) return json(res, 404, { error: 'reel not found' });
      const body = await parseBody(req);
      const { text } = body;
      if (!text) return json(res, 400, { error: 'text is required' });
      const user = await userFromReq(req);
      const userId = user ? user.id : (body.userId || 'anon');
      const username = user ? user.username : (body.user || 'you');
      const cid = newId('c_');
      const created = new Date().toISOString();
      await query('INSERT INTO comments (id, reel_id, user_id, username, text, created_at) VALUES ($1,$2,$3,$4,$5,$6)', [cid, id, userId, username, String(text), created]);
      return json(res, 201, { comment: { id: cid, userId, user: username, text: String(text), createdAt: created } });
    }

    if ((m = url.match(/^\/api\/reels\/([^/]+)\/comments$/)) && req.method === 'GET') {
      const id = m[1];
      const rows = await query('SELECT id, user_id, username, text, created_at FROM comments WHERE reel_id = $1 ORDER BY created_at ASC', [id]);
      return json(res, 200, { comments: rows.map((c) => ({ id: c.id, userId: c.user_id, user: c.username, text: c.text, createdAt: c.created_at })) });
    }

    json(res, 404, { error: 'not found' });
  } catch (e) {
    json(res, 500, { error: e.message });
  }
};
