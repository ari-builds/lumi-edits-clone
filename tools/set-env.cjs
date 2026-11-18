// Set Vercel env vars via REST API using local CLI token. Never prints secrets.
const fs = require('fs');
const os = require('os');
const path = require('path');

const authPath = path.join(os.homedir(), 'AppData', 'Roaming', 'com.vercel.cli', 'Data', 'auth.json');
const auth = JSON.parse(fs.readFileSync(authPath, 'utf8'));
const token = auth.token || (auth.credentials && (auth.credentials.token || (auth.credentials[0] && auth.credentials[0].token)));
if (!token) { console.error('No token found in auth.json keys: ' + Object.keys(auth)); process.exit(1); }

const project = 'lumi-edits-clone';
// Find team id from config or auth
const cfgPath = path.join(os.homedir(), 'AppData', 'Roaming', 'com.vercel.cli', 'Data', 'config.json');
let teamId = '';
try { const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8')); teamId = (cfg.team && cfg.team.id) || ''; } catch {}

// Env values passed via a local JSON file (gitignored) to avoid shell quoting issues.
const values = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '.env-values.json'), 'utf8'));

async function upsert(key, value, target) {
  // Delete existing (any env) then create — Vercel has no idempotent upsert for value
  const base = `https://api.vercel.com/v9/projects/${project}/env`;
  const qs = teamId ? `?teamId=${teamId}` : '';

  // List existing
  const listRes = await fetch(base + qs, { headers: { Authorization: `Bearer ${token}` } });
  const list = await listRes.json();
  const existing = (list.envs || []).filter((e) => e.key === key && e.target.includes(target));
  for (const e of existing) {
    await fetch(`${base}/${e.id}${qs}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  }
  const createRes = await fetch(base + qs, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value, target: [target], type: 'sensitive' }),
  });
  const created = await createRes.json();
  return { ok: createRes.ok, key, target, error: created.error && created.error.message };
}

(async () => {
  const results = [];
  for (const target of ['production', 'preview']) {
    for (const [k, v] of Object.entries(values)) {
      results.push(await upsert(k, v, target));
    }
  }
  results.forEach((r) => console.log(`${r.ok ? 'OK' : 'FAIL'} ${r.key} [${r.target}]${r.error ? ' - ' + r.error : ''}`));
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
