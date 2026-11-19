// Reels API — persistent reels, likes, comments, versions and review notes in Neon.
//   GET  /api/reels                    -> { reels }
//   POST /api/reels     { videoUrl, ... } -> { reel }
//   POST /api/reels/:id/like           Authorization optional -> { liked, likes }
//   POST /api/reels/:id/comment        { text, userId, user } -> { comment }
//   GET  /api/reels/:id/comments       -> { comments }
//   POST /api/reels/:id/version        { videoUrl, noMusicUrl, posterUrl, note } -> { reel }
//   GET  /api/reels/:id/notes          -> { notes }
//   POST /api/reels/:id/notes          { version, t, tEnd, text, kind } -> { note }
//   PATCH /api/reels/:id/notes/:noteId { status } -> { note }
//   POST /api/reels/:id/review         { action, version, text } -> { reel }

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

async function loadReel(query, id) {
  const rows = await query('SELECT * FROM reels WHERE id = $1', [id]);
  if (!rows.length) return null;
  const vs = await query('SELECT * FROM reel_versions WHERE reel_id = $1 ORDER BY version ASC', [id]);
  const ns = await query('SELECT * FROM reel_notes WHERE reel_id = $1 ORDER BY created_at ASC', [id]);
  return db.reelShape(rows[0], vs.map(db.versionShape), ns.map(db.noteShape));
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
      const versionRows = await query('SELECT * FROM reel_versions ORDER BY reel_id ASC, version ASC');
      const noteRows = await query('SELECT * FROM reel_notes ORDER BY reel_id ASC, created_at ASC');
      const versionsByReel = {};
      const notesByReel = {};
      for (const v of versionRows) {
        (versionsByReel[v.reel_id] || (versionsByReel[v.reel_id] = [])).push(db.versionShape(v));
      }
      for (const n of noteRows) {
        (notesByReel[n.reel_id] || (notesByReel[n.reel_id] = [])).push(db.noteShape(n));
      }
      const reels = rows.map((r) => db.reelShape(r, versionsByReel[r.id] || [], notesByReel[r.id] || []));
      return json(res, 200, { reels });
    }

    if (url === '/api/reels' && req.method === 'POST') {
      const body = await parseBody(req);
      const { videoUrl, caption, style } = body;
      const sourceKind = String(body.sourceKind || '');
      // Link intake has no local media yet; the reel is stored as waiting on the service.
      if (!videoUrl && sourceKind !== 'link') return json(res, 400, { error: 'videoUrl is required' });
      const user = await userFromReq(req);
      const id = newId('r_');
      const userId = user ? user.id : (body.userId || 'anon');
      const username = user ? user.username : (body.user || 'you');
      const created = new Date().toISOString();
      const noMusicUrl = String(body.noMusicUrl || '');
      const revisionLimit = body.revisionLimit == null ? 5 : (Number(body.revisionLimit) || 5);
      const shorts = Number(body.shorts || 0) || 0;
      await query(
        `INSERT INTO reels
           (id, user_id, username, video_url, caption, style, likes, created_at,
            status, title, brief, look, format, revision, revision_limit,
            no_music_url, source_kind, source_url, shorts, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,0,$7,$8,$9,$10,$11,$12,0,$13,$14,$15,$16,$17,$18)`,
        [id, userId, username, String(videoUrl || ''), String(caption || ''), String(style || 'classic'), created,
          String(body.status || (sourceKind === 'link' ? 'waiting' : 'review')), String(body.title || ''), String(body.brief || ''),
          String(body.look || 'classic'), String(body.format || 'vertical'), revisionLimit,
          noMusicUrl, sourceKind, String(body.sourceUrl || ''), shorts, created]
      );
      await query(
        'INSERT INTO reel_versions (reel_id, version, video_url, no_music_url, poster_url, note, created_at) VALUES ($1,1,$2,$3,$4,$5,$6) ON CONFLICT (reel_id, version) DO NOTHING',
        [id, String(videoUrl || ''), noMusicUrl, String(body.posterUrl || ''), String(body.note || ''), created]
      );
      return json(res, 201, { reel: await loadReel(query, id) });
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

    if ((m = url.match(/^\/api\/reels\/([^/]+)\/version$/)) && req.method === 'POST') {
      const id = m[1];
      const exists = await query('SELECT id, no_music_url FROM reels WHERE id = $1', [id]);
      if (!exists.length) return json(res, 404, { error: 'reel not found' });
      const body = await parseBody(req);
      if (!body.videoUrl) return json(res, 400, { error: 'videoUrl is required' });
      const next = await query('SELECT COALESCE(MAX(version), 0) + 1 AS n FROM reel_versions WHERE reel_id = $1', [id]);
      const version = Number(next[0] && next[0].n) || 1;
      const created = new Date().toISOString();
      const noMusicUrl = body.noMusicUrl == null
        ? String(exists[0].no_music_url || '')
        : String(body.noMusicUrl);
      await query(
        'INSERT INTO reel_versions (reel_id, version, video_url, no_music_url, poster_url, note, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [id, version, String(body.videoUrl), noMusicUrl, String(body.posterUrl || ''), String(body.note || ''), created]
      );
      await query(
        'UPDATE reels SET video_url = $1, no_music_url = $2, status = $3, updated_at = $4 WHERE id = $5',
        [String(body.videoUrl), noMusicUrl, 'review', created, id]
      );
      return json(res, 200, { reel: await loadReel(query, id) });
    }

    if ((m = url.match(/^\/api\/reels\/([^/]+)\/notes$/)) && req.method === 'GET') {
      const id = m[1];
      const exists = await query('SELECT id FROM reels WHERE id = $1', [id]);
      if (!exists.length) return json(res, 404, { error: 'reel not found' });
      const rows = await query('SELECT * FROM reel_notes WHERE reel_id = $1 ORDER BY created_at ASC', [id]);
      return json(res, 200, { notes: rows.map(db.noteShape) });
    }

    if ((m = url.match(/^\/api\/reels\/([^/]+)\/notes$/)) && req.method === 'POST') {
      const id = m[1];
      const exists = await query('SELECT id FROM reels WHERE id = $1', [id]);
      if (!exists.length) return json(res, 404, { error: 'reel not found' });
      const body = await parseBody(req);
      if (!body.text) return json(res, 400, { error: 'text is required' });
      const nid = newId('n_');
      const created = new Date().toISOString();
      await query(
        'INSERT INTO reel_notes (id, reel_id, version, t, t_end, text, kind, status, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
        [nid, id, Number(body.version || 1), Number(body.t || 0),
          body.tEnd == null ? null : Number(body.tEnd), String(body.text),
          String(body.kind || 'note'), 'open', created]
      );
      const rows = await query('SELECT * FROM reel_notes WHERE id = $1', [nid]);
      return json(res, 201, { note: db.noteShape(rows[0]) });
    }

    if ((m = url.match(/^\/api\/reels\/([^/]+)\/notes\/([^/]+)$/)) && req.method === 'PATCH') {
      const id = m[1];
      const noteId = m[2];
      const body = await parseBody(req);
      const rows = await query(
        'UPDATE reel_notes SET status = $1 WHERE id = $2 AND reel_id = $3 RETURNING *',
        [String(body.status || 'open'), noteId, id]
      );
      if (!rows.length) return json(res, 404, { error: 'note not found' });
      return json(res, 200, { note: db.noteShape(rows[0]) });
    }

    if ((m = url.match(/^\/api\/reels\/([^/]+)\/review$/)) && req.method === 'POST') {
      const id = m[1];
      const exists = await query('SELECT id FROM reels WHERE id = $1', [id]);
      if (!exists.length) return json(res, 404, { error: 'reel not found' });
      const body = await parseBody(req);
      const { action } = body;
      if (action !== 'approve' && action !== 'changes') {
        return json(res, 400, { error: 'action must be approve or changes' });
      }
      const user = await userFromReq(req);
      const userId = user ? user.id : (body.userId || 'anon');
      const created = new Date().toISOString();
      const payload = JSON.stringify({
        action,
        version: body.version == null ? null : Number(body.version),
        text: String(body.text || ''),
      });
      const idem = String(body.idem || newId('idem_'));
      await query(
        'INSERT INTO intents (id, user_id, kind, reel_id, payload, idem, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (idem) DO NOTHING',
        [newId('i_'), userId, 'review.' + action, id, payload, idem, created]
      );
      await query(
        'INSERT INTO events (id, user_id, kind, payload, created_at) VALUES ($1,$2,$3,$4,$5)',
        [newId('e_'), userId, 'review.' + action, payload, created]
      );
      if (action === 'approve') {
        await query('UPDATE reels SET status = $1, updated_at = $2 WHERE id = $3', ['done', created, id]);
      } else {
        await query('UPDATE reels SET status = $1, revision = revision + 1, updated_at = $2 WHERE id = $3', ['editing', created, id]);
      }
      return json(res, 200, { reel: await loadReel(query, id) });
    }

    json(res, 404, { error: 'not found' });
  } catch (e) {
    json(res, 500, { error: e.message });
  }
};
