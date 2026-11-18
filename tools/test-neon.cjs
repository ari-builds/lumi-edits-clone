// Test Neon HTTP query API (no dependencies)
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '..', '.env.local');
const line = fs.readFileSync(envPath, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/).find((l) => l.startsWith('DATABASE_URL='));
const url = line.slice('DATABASE_URL='.length).trim();
const u = new URL(url);
const auth = 'Basic ' + Buffer.from(decodeURIComponent(u.username) + ':' + decodeURIComponent(u.password)).toString('base64');
const endpoint = `https://${u.host}/sql`;

async function query(text, params = []) {
  const r = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'neon-connection-string': url },
    body: JSON.stringify({ query: text, params }),
  });
  const j = await r.json();
  if (j.error || !r.ok) throw new Error(JSON.stringify(j));
  return j.rows;
}

(async () => {
  const rows = await query('SELECT 1 AS n, now() AS ts');
  console.log('OK', JSON.stringify(rows));
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
