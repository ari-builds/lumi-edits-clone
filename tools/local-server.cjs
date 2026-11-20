// Minimal local dev server for this zero-dependency project.
// Loads .env.local (never prints it), dispatches /api/* to the real handlers,
// rewrites /site/<slug>, and serves app/ + public/ static files.
// Useful when `vercel dev` is unavailable (e.g. Windows symlink permissions).

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT || 3000);
const envPath = path.join(ROOT, '.env.local');

if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

// Some local setups keep DB config in a gitignored JSON file instead.
const valuesPath = path.join(ROOT, '.env-values.json');
if (fs.existsSync(valuesPath)) {
  try {
    const values = JSON.parse(fs.readFileSync(valuesPath, 'utf8'));
    for (const [key, value] of Object.entries(values)) {
      if (!(key in process.env) && value != null) process.env[key] = String(value);
    }
  } catch {}
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
};

function staticFile(req, res, pathname) {
  const clean = pathname.replace(/^\/+/, '').replace(/\.\./g, '');
  const candidates = [];
  if (!clean || clean === 'index.html') candidates.push(path.join(ROOT, 'app', 'index.html'));
  // Mirror Vercel's direct file serving: /app/index.html -> <root>/app/index.html.
  candidates.push(path.join(ROOT, clean));
  candidates.push(path.join(ROOT, 'app', clean));
  candidates.push(path.join(ROOT, 'public', clean));
  for (const file of candidates) {
    if (fs.existsSync(file) && fs.statSync(file).isFile()) {
      res.statusCode = 200;
      res.setHeader('Content-Type', MIME[path.extname(file).toLowerCase()] || 'application/octet-stream');
      return fs.createReadStream(file).pipe(res);
    }
  }
  res.statusCode = 404;
  res.end('Not found');
}

const server = http.createServer(async (req, res) => {
  const parsed = new URL(req.url, 'http://localhost');
  let pathname = parsed.pathname;

  if (pathname.startsWith('/site/')) {
    const slug = decodeURIComponent(pathname.slice('/site/'.length).split('/')[0]);
    req.url = `/api/site?slug=${encodeURIComponent(slug)}${parsed.search || ''}`;
    pathname = '/api/site';
  }

  const m = pathname.match(/^\/api\/([A-Za-z0-9_-]+)(\/.*)?$/);
  if (m) {
    const name = m[1];
    if (name.startsWith('_')) {
      res.statusCode = 404;
      return res.end('Not found');
    }
    const handlerPath = path.join(ROOT, 'api', name + '.js');
    if (!fs.existsSync(handlerPath)) {
      res.statusCode = 404;
      return res.end('Not found');
    }
    try {
      delete require.cache[require.resolve(handlerPath)];
      const handler = require(handlerPath);
      await handler(req, res);
    } catch (err) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: String((err && err.message) || err).slice(0, 200) }));
    }
    return;
  }

  return staticFile(req, res, pathname);
});

server.listen(PORT, () => {
  console.log(`Local server on http://localhost:${PORT} (env loaded from .env.local, values hidden)`);
});
