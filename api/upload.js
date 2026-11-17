// Lumi Edits Clone — Upload API (mock)
// Endpoint: POST /api/upload  { fileName, fileType, base64 } -> { url, fileName, fileType, size }

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
  if (url !== '/api/upload' || req.method !== 'POST') {
    return json(res, 404, { error: 'not found' });
  }

  const body = await parseBody(req);
  const { fileName, fileType, base64 } = body;
  if (!fileName || !fileType) {
    return json(res, 400, { error: 'fileName and fileType required' });
  }

  // Mock: pretend to store and return a public URL
  const size = base64 ? Math.round((base64.length * 3) / 4) : 0;
  const urlResult = '/uploads/' + fileName;

  return json(res, 201, {
    url: urlResult,
    fileName,
    fileType,
    size,
    uploadedAt: new Date().toISOString(),
    note: 'mock upload - file not actually stored',
  });
};
