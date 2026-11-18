// Chat API — persistent conversations/messages in Neon.
//   GET  /api/chat/conversations              -> { conversations }
//   GET  /api/chat/conversations/:id          -> { conversation, messages }
//   POST /api/chat/conversations/:id/messages { text, videoUrl, senderId } -> { message }

const db = require('./_db');

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

async function seedIfEmpty(query) {
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

module.exports = async (req, res) => {
  if (db.cors(req, res)) return;
  const { query, ready, json, parseBody, newId } = db;
  try { await ready(); } catch (e) { return json(res, 500, { error: 'Database unavailable: ' + e.message }); }
  const url = req.url.split('?')[0];
  try {
    await seedIfEmpty(query);

    if (url === '/api/chat/conversations' && req.method === 'GET') {
      const convs = await query('SELECT id, user1, user2, updated_at FROM conversations ORDER BY updated_at DESC');
      const users = await query('SELECT id, username FROM conv_users');
      const userMap = Object.fromEntries(users.map((u) => [u.id, u.username]));
      const msgs = await query('SELECT conversation_id, text, created_at FROM messages ORDER BY created_at ASC');
      const lastByConv = {};
      for (const m of msgs) lastByConv[m.conversation_id] = m;
      const list = convs.map((c) => {
        const otherId = c.user2; // demo layout: other participant
        const last = lastByConv[c.id];
        return {
          id: c.id,
          other: { id: otherId, username: userMap[otherId] || 'user' },
          lastMessage: last ? last.text : '',
          lastMessageAt: last ? last.created_at : c.updated_at,
          unread: 0,
        };
      });
      return json(res, 200, { conversations: list });
    }

    let m;
    if ((m = url.match(/^\/api\/chat\/conversations\/([^/]+)$/)) && req.method === 'GET') {
      const id = m[1];
      const conv = (await query('SELECT id, user1, user2, updated_at FROM conversations WHERE id = $1', [id]))[0];
      if (!conv) return json(res, 404, { error: 'conversation not found' });
      const msgs = await query('SELECT id, sender_id, text, video_url, created_at FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC', [id]);
      return json(res, 200, {
        conversation: conv,
        messages: msgs.map((x) => ({ id: x.id, conversationId: id, senderId: x.sender_id, text: x.text, videoUrl: x.video_url, createdAt: x.created_at })),
      });
    }

    if ((m = url.match(/^\/api\/chat\/conversations\/([^/]+)\/messages$/)) && req.method === 'POST') {
      const id = m[1];
      const conv = (await query('SELECT id FROM conversations WHERE id = $1', [id]))[0];
      if (!conv) return json(res, 404, { error: 'conversation not found' });
      const body = await parseBody(req);
      const { text, videoUrl, senderId } = body;
      if (!text && !videoUrl) return json(res, 400, { error: 'text or videoUrl required' });
      const mid = newId('m_');
      const created = new Date().toISOString();
      await query('INSERT INTO messages (id, conversation_id, sender_id, text, video_url, created_at) VALUES ($1,$2,$3,$4,$5,$6)',
        [mid, id, senderId || 'u1', String(text || ''), videoUrl || null, created]);
      await query('UPDATE conversations SET updated_at = $1 WHERE id = $2', [created, id]);
      return json(res, 201, { message: { id: mid, conversationId: id, senderId: senderId || 'u1', text: String(text || ''), videoUrl: videoUrl || null, createdAt: created } });
    }

    json(res, 404, { error: 'not found' });
  } catch (e) {
    json(res, 500, { error: e.message });
  }
};
