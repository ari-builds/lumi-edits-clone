// List recent estimator leads from Neon without printing credentials.
// Usage: node tools/check-leads.cjs [limit]
'use strict';

const fs = require('fs');
const path = require('path');

const envFile = path.resolve(__dirname, '..', '.env.local');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m || m[2].startsWith('#')) continue;
    const value = m[2].replace(/^(['"])(.*)\1$/, '$2');
    if (!process.env[m[1]]) process.env[m[1]] = value;
  }
}

const db = require('../api/_db');
const limit = Math.max(1, Math.min(100, Number(process.argv[2] || 10)));

(async () => {
  await db.ready();
  const rows = await db.query(
    'select id, site, reference, notified, created_at from estimator_leads order by created_at desc limit $1',
    [limit]
  );
  console.log(`estimator_leads (${rows.length} shown):`);
  for (const r of rows) {
    console.log(`${r.created_at}  ${r.reference}  ${r.site}  notified=${r.notified}`);
  }
})().catch((e) => {
  console.error('FAIL', e && e.message ? e.message : e);
  process.exitCode = 1;
});
