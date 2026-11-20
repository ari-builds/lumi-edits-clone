// State API — one consolidated payload for the SPA.
//   GET /api/state  Authorization: Bearer <token>
//     -> { user, reels, conversations, catalog, draft, account, price, notices }

const db = require('./_db');
const { catalog } = require('./_catalog');

// Demo conversation data (mirrors chat.js) — seeded only when the tables are empty.
const DEMO_USERS = [
  { id: 'u1', username: 'you' },
  { id: 'u2', username: 'mia.edits' },
  { id: 'u3', username: 'kai.cuts' },
  { id: 'u4', username: 'zoe.clips' },
];
const DEMO_CONVOS = [
  { id: 'conv1', user1: 'u1', user2: 'u2' },
  { id: 'conv2', user1: 'u1', user2: 'u3' },
  { id: 'conv3', user1: 'u1', user2: 'u4' },
];
const DEMO_MESSAGES = {
  conv1: [
    { id: 'm1', senderId: 'u2', text: 'hey! loved your latest reel ✨', videoUrl: null, ago: 3600000 },
    { id: 'm2', senderId: 'u1', text: 'thanks mia! what style did you use?', videoUrl: null, ago: 3000000 },
  ],
  conv2: [{ id: 'm3', senderId: 'u3', text: 'you want to collab on a new edit?', videoUrl: null, ago: 86400000 }],
  conv3: [{ id: 'm4', senderId: 'u4', text: 'matcha theme looks fire 🍵', videoUrl: null, ago: 172800000 }],
};

// Seed reels so a fresh database still has a demo feed on first load.
const REEL_SEED = [
  { id: 'r1', user: 'mia.edits', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', caption: 'morning light edit ☀️', style: 'golden', likes: 1240 },
  { id: 'r2', user: 'kai.cuts', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', caption: 'glass aesthetic ✨', style: 'glass', likes: 980 },
  { id: 'r3', user: 'zoe.clips', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', caption: 'matcha vibes 🍵', style: 'matcha', likes: 2100 },
  { id: 'r4', user: 'leo.reels', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', caption: 'clay render 🏺', style: 'clay', likes: 1750 },
  { id: 'r5', user: 'nova.cut', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4', caption: 'silentpower mode 🔇', style: 'silentpower', likes: 3400 },
];

async function seedConversationsIfEmpty(query) {
  const rows = await query('SELECT count(*)::int AS n FROM conversations');
  if (rows[0] && rows[0].n === 0) {
    for (const u of DEMO_USERS) {
      await query('INSERT INTO conv_users (id, username) VALUES ($1,$2) ON CONFLICT (id) DO NOTHING', [u.id, u.username]);
    }
    for (const c of DEMO_CONVOS) {
      await query('INSERT INTO conversations (id, user1, user2, updated_at) VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING', [c.id, c.user1, c.user2, new Date().toISOString()]);
      for (const msg of (DEMO_MESSAGES[c.id] || [])) {
        await query('INSERT INTO messages (id, conversation_id, sender_id, text, video_url, created_at) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING',
          [msg.id, c.id, msg.senderId, msg.text, msg.videoUrl, new Date(Date.now() - msg.ago).toISOString()]);
      }
    }
  }
}

async function seedReelsIfEmpty(query) {
  const rows = await query('SELECT count(*)::int AS n FROM reels');
  if (rows[0] && rows[0].n === 0) {
    for (const r of REEL_SEED) {
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

async function loadReels(query) {
  await seedReelsIfEmpty(query);
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
  return rows.map((r) => db.reelShape(
    r, versionsByReel[r.id] || [], notesByReel[r.id] || [], assetsByReel[r.id] || []
  ));
}

async function loadConversations(query) {
  await seedConversationsIfEmpty(query);
  const convs = await query('SELECT id, user1, user2, updated_at FROM conversations ORDER BY updated_at DESC');
  const users = await query('SELECT id, username FROM conv_users');
  const userMap = Object.fromEntries(users.map((u) => [u.id, u.username]));
  const msgs = await query('SELECT id, conversation_id, sender_id, text, video_url, created_at FROM messages ORDER BY created_at ASC');
  const byConv = {};
  for (const m of msgs) {
    (byConv[m.conversation_id] || (byConv[m.conversation_id] = [])).push({
      id: m.id,
      conversationId: m.conversation_id,
      senderId: m.sender_id,
      text: m.text || '',
      videoUrl: m.video_url || null,
      createdAt: m.created_at,
    });
  }
  return convs.map((c) => {
    const list = byConv[c.id] || [];
    const last = list.length ? list[list.length - 1] : null;
    return {
      id: c.id,
      other: { id: c.user2, username: userMap[c.user2] || 'user' },
      lastMessage: last ? last.text : '',
      lastMessageAt: last ? last.createdAt : c.updated_at,
      unread: 0,
      messages: list,
    };
  });
}

module.exports = async (req, res) => {
  if (db.cors(req, res)) return;
  const { query, ready, json, userFromReq, parseJson } = db;
  try { await ready(); } catch (e) { return json(res, 500, { error: 'Database unavailable: ' + e.message }); }

  const url = req.url.split('?')[0];
  if (url !== '/api/state' || req.method !== 'GET') return json(res, 404, { error: 'not found' });

  try {
    const user = await userFromReq(req);
    if (!user) return json(res, 401, { error: 'not authenticated' });

    const draftRows = await query('SELECT data FROM drafts WHERE user_id = $1', [user.id]);
    const draft = draftRows.length ? parseJson(draftRows[0].data, {}) : {};

    const [reels, conversations] = await Promise.all([
      loadReels(query),
      loadConversations(query),
    ]);

    return json(res, 200, {
      user: { id: user.id, username: user.username, email: user.email, avatar: user.avatar || null },
      reels,
      conversations,
      catalog,
      draft,
      account: { email: user.email, username: user.username, send196: '', intensity: 'Polished' },
      price: { reel: 20, monthly: 60, monthly_reels: 10 },
      notices: [],
    });
  } catch (e) {
    json(res, 500, { error: e.message });
  }
};
