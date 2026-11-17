// Lumi Edits Clone — Chat API (in-memory demo storage)
// Endpoints:
//   GET  /api/chat/conversations        -> { conversations }
//   GET  /api/chat/conversations/:id    { Authorization } -> { conversation, messages }
//   POST /api/chat/conversations/:id/messages { Authorization, body: { text, videoUrl } } -> { message }

const users = [
  { id: 'u1', username: 'you', avatar: null },
  { id: 'u2', username: 'mia.edits', avatar: null },
  { id: 'u3', username: 'kai.cuts', avatar: null },
  { id: 'u4', username: 'zoe.clips', avatar: null },
];

const conversations = [
  { id: 'conv1', participants: ['u1', 'u2'], updatedAt: new Date().toISOString() },
  { id: 'conv2', participants: ['u1', 'u3'], updatedAt: new Date().toISOString() },
  { id: 'conv3', participants: ['u1', 'u4'], updatedAt: new Date().toISOString() },
];

const messages = {
  conv1: [
    { id: 'm1', conversationId: 'conv1', senderId: 'u2', text: 'hey! loved your latest reel ✨', videoUrl: null, createdAt: new Date(Date.now() - 3600000).toISOString() },
    { id: 'm2', conversationId: 'conv1', senderId: 'u1', text: 'thanks mia! what style did you use?', videoUrl: null, createdAt: new Date(Date.now() - 3000000).toISOString() },
  ],
  conv2: [
    { id: 'm3', conversationId: 'conv2', senderId: 'u3', text: 'you want to collab on a new edit?', videoUrl: null, createdAt: new Date(Date.now() - 86400000).toISOString() },
  ],
  conv3: [
    { id: 'm4', conversationId: 'conv3', senderId: 'u4', text: 'matcha theme looks fire 🍵', videoUrl: null, createdAt: new Date(Date.now() - 172800000).toISOString() },
  ],
};

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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = req.url.split('?')[0];
  const parts = url.split('/').filter(Boolean); // ['api','chat',...]

  // --- List conversations ---
  if (url === '/api/chat/conversations' && req.method === 'GET') {
    const list = conversations.map((c) => {
      const otherId = c.participants.find((p) => p !== 'u1');
      const other = users.find((u) => u.id === otherId);
      const lastMsg = (messages[c.id] || []).slice(-1)[0];
      return {
        id: c.id,
        other: other || { username: 'user' },
        lastMessage: lastMsg ? lastMsg.text : '',
        lastMessageAt: lastMsg ? lastMsg.createdAt : c.updatedAt,
        unread: 0,
      };
    });
    return json(res, 200, { conversations: list });
  }

  // --- Get conversation + messages ---
  const convMatch = url.match(/^\/api\/chat\/conversations\/(conv\d+)$/);
  if (convMatch && req.method === 'GET') {
    const id = convMatch[1];
    const conv = conversations.find((c) => c.id === id);
    if (!conv) return json(res, 404, { error: 'conversation not found' });
    return json(res, 200, { conversation: conv, messages: messages[id] || [] });
  }

  // --- Send message ---
  const msgMatch = url.match(/^\/api\/chat\/conversations\/(conv\d+)\/messages$/);
  if (msgMatch && req.method === 'POST') {
    const id = msgMatch[1];
    const conv = conversations.find((c) => c.id === id);
    if (!conv) return json(res, 404, { error: 'conversation not found' });
    const body = await parseBody(req);
    const { text, videoUrl } = body;
    if (!text && !videoUrl) return json(res, 400, { error: 'text or videoUrl required' });
    const message = {
      id: 'm' + Date.now(),
      conversationId: id,
      senderId: 'u1',
      text: text || '',
      videoUrl: videoUrl || null,
      createdAt: new Date().toISOString(),
    };
    if (!messages[id]) messages[id] = [];
    messages[id].push(message);
    conv.updatedAt = new Date().toISOString();
    return json(res, 201, { message });
  }

  json(res, 404, { error: 'not found' });
};
