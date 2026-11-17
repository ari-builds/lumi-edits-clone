// Lumi Edits Clone — Reels API (in-memory demo storage)
// Endpoints:
//   GET  /api/reels               -> { reels }
//   POST /api/reels               { userId, videoUrl, caption, style } -> { reel }
//   POST /api/reels/:id/like      -> { liked, likes }
//   POST /api/reels/:id/comment   { userId, text } -> { comment }

const reels = [];
const comments = {}; // reelId -> []

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

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = req.url.split('?')[0];
  const parts = url.split('/').filter(Boolean); // ['api','reels',id,'like']

  // Seed demo reels on first request
  if (reels.length === 0) {
    const demo = [
      { id: 'r1', userId: 'u1', user: 'mia.edits', avatar: null, videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', caption: 'morning light edit ☀️', style: 'golden', likes: 1240, comments: [], createdAt: new Date().toISOString() },
      { id: 'r2', userId: 'u2', user: 'kai.cuts', avatar: null, videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', caption: 'glass aesthetic ✨', style: 'glass', likes: 980, comments: [], createdAt: new Date().toISOString() },
      { id: 'r3', userId: 'u3', user: 'zoe.clips', avatar: null, videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', caption: 'matcha vibes 🍵', style: 'matcha', likes: 2100, comments: [], createdAt: new Date().toISOString() },
      { id: 'r4', userId: 'u4', user: 'leo.reels', avatar: null, videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', caption: 'clay render 🏺', style: 'clay', likes: 1750, comments: [], createdAt: new Date().toISOString() },
      { id: 'r5', userId: 'u5', user: 'nova.cut', avatar: null, videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4', caption: 'silentpower mode 🔇', style: 'silentpower', likes: 3400, comments: [], createdAt: new Date().toISOString() },
    ];
    demo.forEach((r) => { reels.push(r); comments[r.id] = []; });
  }

  // --- List reels ---
  if (parts.length === 2 && req.method === 'GET') {
    return json(res, 200, { reels: [...reels].reverse() });
  }

  // --- Create reel ---
  if (parts.length === 2 && req.method === 'POST') {
    const body = await parseBody(req);
    const { userId, videoUrl, caption, style } = body;
    if (!videoUrl) {
      return json(res, 400, { error: 'videoUrl is required' });
    }
    const reel = {
      id: 'r' + (reels.length + 1),
      userId: userId || 'u1',
      user: body.user || 'you',
      avatar: null,
      videoUrl,
      caption: caption || '',
      style: style || 'classic',
      likes: 0,
      comments: [],
      createdAt: new Date().toISOString(),
    };
    reels.push(reel);
    comments[reel.id] = [];
    return json(res, 201, { reel });
  }

  // --- Like reel ---
  const likeMatch = url.match(/^\/api\/reels\/(r\d+)\/like$/);
  if (likeMatch && req.method === 'POST') {
    const id = likeMatch[1];
    const reel = reels.find((r) => r.id === id);
    if (!reel) return json(res, 404, { error: 'reel not found' });
    reel.likes += 1;
    return json(res, 200, { liked: true, likes: reel.likes });
  }

  // --- Comment on reel ---
  const commentMatch = url.match(/^\/api\/reels\/(r\d+)\/comment$/);
  if (commentMatch && req.method === 'POST') {
    const id = commentMatch[1];
    const reel = reels.find((r) => r.id === id);
    if (!reel) return json(res, 404, { error: 'reel not found' });
    const body = await parseBody(req);
    const { userId, text } = body;
    if (!text) return json(res, 400, { error: 'text is required' });
    const comment = { id: 'c' + Date.now(), userId: userId || 'u1', user: body.user || 'you', text, createdAt: new Date().toISOString() };
    if (!comments[id]) comments[id] = [];
    comments[id].push(comment);
    reel.comments = comments[id];
    return json(res, 201, { comment });
  }

  // --- Get comments for reel ---
  const commentsMatch = url.match(/^\/api\/reels\/(r\d+)\/comments$/);
  if (commentsMatch && req.method === 'GET') {
    const id = commentsMatch[1];
    return json(res, 200, { comments: comments[id] || [] });
  }

  json(res, 404, { error: 'not found' });
};
