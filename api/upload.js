// Upload API — issues presigned PUT URLs for real video storage in Neon Object Storage.
//   POST /api/upload  { fileName, fileType } -> { uploadUrl, publicUrl, key, ... }
// The browser then does: fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': fileType } })
// The returned publicUrl is a permanent URL used as a reel's videoUrl.

const { presignPut } = require('./_s3');

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}
function parseBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch { resolve({}); } });
  });
}
function safeName(name) {
  return String(name).replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  const url = req.url.split('?')[0];
  if (url !== '/api/upload' || req.method !== 'POST') return json(res, 404, { error: 'not found' });

  const body = await parseBody(req);
  const { fileName, fileType } = body;
  if (!fileName || !fileType) return json(res, 400, { error: 'fileName and fileType required' });

  // Only allow video/audio/image mime types
  if (!/^(video|audio|image)\//.test(String(fileType))) {
    return json(res, 400, { error: 'unsupported file type' });
  }

  const key = `reels/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName(fileName)}`;
  try {
    const signed = presignPut({ key, contentType: String(fileType), expires: 900 });
    return json(res, 201, { ...signed, note: 'Upload the file with PUT to uploadUrl, then use publicUrl as videoUrl.' });
  } catch (e) {
    return json(res, 500, { error: 'Could not sign upload: ' + e.message });
  }
};
