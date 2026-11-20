// Reels API — persistent reels, project assets, plans, storyboards, versions and review notes in Neon.
//   GET  /api/reels                    -> { reels }
//   POST /api/reels     { videoUrl, ... } -> { reel }
//   POST /api/reels/:id/like           Authorization optional -> { liked, likes }
//   POST /api/reels/:id/comment        { text, userId, user } -> { comment }
//   GET  /api/reels/:id/comments       -> { comments }
//   POST /api/reels/:id/version        { videoUrl, noMusicUrl, posterUrl, note } -> { reel }
//   PATCH /api/reels/:id/plan          { plan | notes, storyboard } -> { reel }
//   GET  /api/reels/:id/notes          -> { notes }
//   POST /api/reels/:id/notes          { version, t, tEnd, text, kind } -> { note }
//   PATCH /api/reels/:id/notes/:noteId { status } -> { note }
//   POST /api/reels/:id/review         { action, version, text } -> { reel }
//
// action for storyboard approval is 'approve-storyboard'. A reel with a plan
// cannot create a real export version until that approval has been recorded.

const db = require('./_db');
const planner = require('../lib/plan');

// Never let a raw DB/network error echo a connection string or credential.
function safeError(e) {
  let m = String((e && e.message) || e || 'Unknown error');
  if (/DATABASE_URL|neon-connection-string|postgres(ql)?:\/\//i.test(m)) m = 'Database error (details withheld)';
  return m.replace(/\s+/g, ' ').slice(0, 200);
}

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
        `INSERT INTO reels
           (id, user_id, username, video_url, caption, style, likes, created_at,
            status, stage, status_message, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'done','done',$9,$8)
         ON CONFLICT (id) DO NOTHING`,
        [r.id, 'seed', r.user, r.videoUrl, r.caption, r.style, r.likes,
          new Date().toISOString(), 'Sample reel from the public demo catalog.']
      );
    }
  }
}

async function loadAssetRows(query, id) {
  return query('SELECT * FROM project_assets WHERE reel_id = $1 ORDER BY of_index ASC, created_at ASC', [id]);
}

async function loadReel(query, id) {
  const rows = await query('SELECT * FROM reels WHERE id = $1', [id]);
  if (!rows.length) return null;
  const vs = await query('SELECT * FROM reel_versions WHERE reel_id = $1 ORDER BY version ASC', [id]);
  const ns = await query('SELECT * FROM reel_notes WHERE reel_id = $1 ORDER BY created_at ASC', [id]);
  const as = await loadAssetRows(query, id);
  return db.reelShape(
    rows[0],
    vs.map(db.versionShape),
    ns.map(db.noteShape),
    as.map(db.assetShape)
  );
}

function normalizeStoryboard(value, plan) {
  const source = Array.isArray(value) ? value : (plan && plan.scenes) || [];
  return source.slice(0, 200).map((scene, i) => planner.normalizeScene(scene, i));
}

function assetEntries(value, kind) {
  if (!Array.isArray(value)) return [];
  return value.map((entry, i) => {
    if (typeof entry === 'string') {
      return { url: entry, kind, name: '', ofIndex: i + 1, remote: false, analysis: null };
    }
    if (!entry || typeof entry !== 'object') return null;
    const url = entry.url || entry.blobUrl || entry.remoteUrl || '';
    if (!url) return null;
    return {
      url,
      kind: ['raw', 'reference', 'style'].includes(entry.kind) ? entry.kind : kind,
      name: entry.name || entry.fileName || '',
      ofIndex: Number.isInteger(entry.ofIndex) ? entry.ofIndex : i + 1,
      remote: Boolean(entry.remote),
      analysis: entry.analysis && typeof entry.analysis === 'object' ? entry.analysis : null,
    };
  }).filter(Boolean);
}

async function persistAssets(query, reelId, userId, body, created) {
  const entries = [
    ...assetEntries(body.rawUrls, 'raw'),
    ...assetEntries(body.referenceUrls, 'reference'),
    ...assetEntries(body.assets, 'raw'),
  ];
  const seen = new Set();
  for (const entry of entries) {
    const url = String(entry.url || '').trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    await query(
      `INSERT INTO project_assets
         (id, reel_id, user_id, kind, name, url, remote, of_index, analysis, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (id) DO NOTHING`,
      [db.newId('a_'), reelId, userId || null, entry.kind, String(entry.name || ''),
        url, entry.remote ? 1 : 0, entry.ofIndex || 0,
        entry.analysis ? JSON.stringify(entry.analysis) : '', created]
    );
  }
  return seen.size;
}

function initialStage(body, hasPlan) {
  if (String(body.sourceKind || '') === 'link') {
    return {
      stage: 'waiting',
      status: 'waiting',
      statusMessage: 'Link saved. Media is not downloaded or edited locally.',
    };
  }
  if (hasPlan) {
    return {
      stage: 'storyboard',
      status: 'review',
      statusMessage: 'On-device storyboard is ready for approval. Export is locked until approved.',
    };
  }
  return {
    stage: 'editing',
    status: 'review',
    statusMessage: 'Media is saved. The local editor can produce an export.',
  };
}

function stageForPlanRevision() {
  return {
    stage: 'storyboard',
    status: 'review',
    statusMessage: 'Revised plan saved locally. Re-approve the storyboard before exporting.',
  };
}

module.exports = async (req, res) => {
  if (db.cors(req, res)) return;
  const { query, ready, json, parseBody, newId, userFromReq } = db;
  try { await ready(); } catch (e) { return json(res, 500, { error: 'Database unavailable: ' + safeError(e) }); }

  const url = req.url.split('?')[0];

  try {
    if (url === '/api/reels' && req.method === 'GET') {
      await seedIfEmpty(query);
      const rows = await query('SELECT * FROM reels ORDER BY created_at DESC');
      const versionRows = await query('SELECT * FROM reel_versions ORDER BY reel_id ASC, version ASC');
      const noteRows = await query('SELECT * FROM reel_notes ORDER BY reel_id ASC, created_at ASC');
      const assetRows = await query('SELECT * FROM project_assets ORDER BY reel_id ASC, of_index ASC, created_at ASC');
      const versionsByReel = {};
      const notesByReel = {};
      const assetsByReel = {};
      for (const v of versionRows) {
        (versionsByReel[v.reel_id] || (versionsByReel[v.reel_id] = [])).push(db.versionShape(v));
      }
      for (const n of noteRows) {
        (notesByReel[n.reel_id] || (notesByReel[n.reel_id] = [])).push(db.noteShape(n));
      }
      for (const a of assetRows) {
        (assetsByReel[a.reel_id] || (assetsByReel[a.reel_id] = [])).push(db.assetShape(a));
      }
      const reels = rows.map((r) => db.reelShape(
        r, versionsByReel[r.id] || [], notesByReel[r.id] || [], assetsByReel[r.id] || []
      ));
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

      const plan = body.plan ? planner.normalizePlan(body.plan) : null;
      const storyboard = plan ? normalizeStoryboard(body.storyboard, plan) : [];
      const stageInfo = initialStage(body, Boolean(plan));

      await query(
        `INSERT INTO reels
           (id, user_id, username, video_url, caption, style, likes, created_at,
            status, stage, status_message, title, brief, look, format, revision, revision_limit,
            no_music_url, source_kind, source_url, shorts, updated_at,
            plan, plan_version, storyboard)
         VALUES ($1,$2,$3,$4,$5,$6,0,$7,$8,$9,$10,$11,$12,$13,$14,0,$15,$16,$17,$18,$19,$20,$21,$22,$23)`,
        [id, userId, username, String(videoUrl || ''), String(caption || ''), String(style || 'classic'), created,
          stageInfo.status, stageInfo.stage, stageInfo.statusMessage,
          String(body.title || ''), String(body.brief || ''),
          String(body.look || 'classic'), String(body.format || 'vertical'), revisionLimit,
          noMusicUrl, sourceKind, String(body.sourceUrl || ''), shorts, created,
          plan ? JSON.stringify(plan) : '', 0, JSON.stringify(storyboard)]
      );
      await persistAssets(query, id, userId, body, created);
      await query(
        `INSERT INTO reel_versions
           (reel_id, version, video_url, no_music_url, poster_url, note, plan_version, created_at)
         VALUES ($1,1,$2,$3,$4,$5,0,$6)
         ON CONFLICT (reel_id, version) DO NOTHING`,
        [id, String(videoUrl || ''), noMusicUrl, String(body.posterUrl || ''),
          String(body.note || ''), created]
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

    if ((m = url.match(/^\/api\/reels\/([^/]+)\/plan$/)) && req.method === 'PATCH') {
      const id = m[1];
      const rows = await query('SELECT id, plan, plan_version, storyboard FROM reels WHERE id = $1', [id]);
      if (!rows.length) return json(res, 404, { error: 'reel not found' });
      const body = await parseBody(req);
      const previous = db.parseJson(rows[0].plan, null);
      let plan;
      if (body.plan) {
        plan = planner.normalizePlan(body.plan);
      } else if (body.notes) {
        plan = planner.applyNotesToPlan(previous || {}, body.notes);
      } else {
        return json(res, 400, { error: 'plan or notes is required' });
      }
      const nextVersion = Number(rows[0].plan_version || 0) + 1;
      plan.planVersion = nextVersion;
      const storyboard = normalizeStoryboard(body.storyboard, plan);
      const created = new Date().toISOString();
      const user = await userFromReq(req);
      const userId = user ? user.id : (body.userId || 'anon');
      const info = stageForPlanRevision();
      await query(
        `UPDATE reels
            SET plan = $1, plan_version = $2, storyboard = $3,
                stage = $4, status = $5, status_message = $6, updated_at = $7
          WHERE id = $8`,
        [JSON.stringify(plan), nextVersion, JSON.stringify(storyboard),
          info.stage, info.status, info.statusMessage, created, id]
      );
      if (Array.isArray(body.assets) && body.assets.length) {
        await persistAssets(query, id, userId, { assets: body.assets }, created);
      }
      const payload = JSON.stringify({ planVersion: nextVersion, source: 'local' });
      await query(
        'INSERT INTO events (id, user_id, kind, payload, created_at) VALUES ($1,$2,$3,$4,$5)',
        [newId('e_'), userId, 'plan.revise', payload, created]
      );
      return json(res, 200, { reel: await loadReel(query, id) });
    }

    if ((m = url.match(/^\/api\/reels\/([^/]+)\/version$/)) && req.method === 'POST') {
      const id = m[1];
      const exists = await query('SELECT id, no_music_url, plan, plan_version, stage FROM reels WHERE id = $1', [id]);
      if (!exists.length) return json(res, 404, { error: 'reel not found' });
      const hasPlan = Boolean(db.parseJson(exists[0].plan, null));
      if (hasPlan && exists[0].stage !== 'approved') {
        return json(res, 409, {
          error: 'Storyboard approval is required before a local export can be saved.',
          stage: exists[0].stage || 'storyboard',
        });
      }
      const body = await parseBody(req);
      if (!body.videoUrl) return json(res, 400, { error: 'videoUrl is required' });
      const next = await query('SELECT COALESCE(MAX(version), 0) + 1 AS n FROM reel_versions WHERE reel_id = $1', [id]);
      const version = Number(next[0] && next[0].n) || 1;
      const created = new Date().toISOString();
      const planVersion = Number(exists[0].plan_version || 0);
      const noMusicUrl = body.noMusicUrl == null
        ? String(exists[0].no_music_url || '')
        : String(body.noMusicUrl);
      const note = String(body.note || (planVersion ? `Local export from plan v${planVersion}` : 'Local export'));
      await query(
        `INSERT INTO reel_versions
           (reel_id, version, video_url, no_music_url, poster_url, note, plan_version, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [id, version, String(body.videoUrl), noMusicUrl, String(body.posterUrl || ''), note, planVersion, created]
      );
      await query(
        `UPDATE reels
            SET video_url = $1, no_music_url = $2, status = 'done', stage = 'done',
                status_message = $3, updated_at = $4
          WHERE id = $5`,
        [String(body.videoUrl), noMusicUrl, `Local export saved as version ${version}.`, created, id]
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
      const kind = planner.NOTE_KINDS.includes(body.kind) ? body.kind : 'general';
      const nid = newId('n_');
      const created = new Date().toISOString();
      await query(
        'INSERT INTO reel_notes (id, reel_id, version, t, t_end, text, kind, status, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
        [nid, id, Number(body.version || 1), Number(body.t || 0),
          body.tEnd == null ? null : Number(body.tEnd), String(body.text),
          kind, 'open', created]
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
      const exists = await query('SELECT id, plan FROM reels WHERE id = $1', [id]);
      if (!exists.length) return json(res, 404, { error: 'reel not found' });
      const body = await parseBody(req);
      const { action } = body;
      const allowed = ['approve', 'changes', 'approve-storyboard'];
      if (!allowed.includes(action)) {
        return json(res, 400, { error: 'action must be approve, changes, or approve-storyboard' });
      }
      if (action === 'approve-storyboard' && !db.parseJson(exists[0].plan, null)) {
        return json(res, 400, { error: 'this reel has no on-device plan to approve' });
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
      if (action === 'approve-storyboard') {
        await query(
          `UPDATE reels SET stage = 'approved', status = 'approved',
             status_message = $1, updated_at = $2 WHERE id = $3`,
          ['On-device storyboard approved. Local export is unlocked.', created, id]
        );
      } else if (action === 'approve') {
        await query(
          `UPDATE reels SET stage = 'done', status = 'done',
             status_message = $1, updated_at = $2 WHERE id = $3`,
          ['Approved after review.', created, id]
        );
      } else {
        await query(
          `UPDATE reels SET stage = 'editing', status = 'editing', revision = revision + 1,
             status_message = $1, updated_at = $2 WHERE id = $3`,
          ['Changes requested. Revise locally, then re-approve before exporting.', created, id]
        );
      }
      return json(res, 200, { reel: await loadReel(query, id) });
    }

    json(res, 404, { error: 'not found' });
  } catch (e) {
    json(res, 500, { error: safeError(e) });
  }
};
