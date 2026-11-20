// Verify the Neon schema used by the Lumi parity APIs without printing credentials.
// Loads .env.local if present; otherwise uses the current process environment.
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

const TABLES = [
  'users', 'sessions', 'reels', 'reel_versions', 'reel_notes', 'project_assets',
  'drafts', 'covers', 'intents', 'events', 'uploads', 'estimator_leads',
  'conv_users', 'conversations', 'messages',
];

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured');
  await db.ready();
  const ok = await db.query('select 1 as ok');
  if (!ok[0] || ok[0].ok !== 1) throw new Error('select 1 did not return 1');
  console.log('PASS connection + ready()');

  for (const table of TABLES) {
    const rows = await db.query(`select count(*)::int as n from ${table}`);
    console.log(`PASS table ${table} (${rows[0]?.n ?? '?'} rows)`);
  }

  const reelCols = await db.query(`
    select column_name from information_schema.columns
    where table_name = 'reels' and column_name in
      ('status','stage','status_message','plan','plan_version','storyboard',
       'title','brief','look','format','revision','revision_limit','no_music_url',
       'source_kind','source_url','shorts','updated_at')
  `);
  const found = new Set(reelCols.map((r) => r.column_name));
  const required = ['status', 'stage', 'status_message', 'plan', 'plan_version', 'storyboard',
    'title', 'brief', 'look', 'format', 'revision', 'revision_limit', 'no_music_url',
    'source_kind', 'source_url', 'shorts', 'updated_at'];
  const missing = required.filter((c) => !found.has(c));
  if (missing.length) throw new Error('missing reels columns: ' + missing.join(', '));
  console.log(`PASS reels columns (${required.length})`);

  const assetCols = await db.query(`
    select column_name from information_schema.columns
    where table_name = 'project_assets' and column_name in
      ('id','reel_id','user_id','kind','name','url','remote','of_index','analysis','created_at')
  `);
  const assetFound = new Set(assetCols.map((r) => r.column_name));
  const assetRequired = ['id', 'reel_id', 'user_id', 'kind', 'name', 'url', 'remote', 'of_index', 'analysis', 'created_at'];
  const assetMissing = assetRequired.filter((c) => !assetFound.has(c));
  if (assetMissing.length) throw new Error('missing project_assets columns: ' + assetMissing.join(', '));
  console.log(`PASS project_assets columns (${assetRequired.length})`);
}

main().catch((e) => {
  console.error('FAIL', e && e.message ? e.message : e);
  process.exitCode = 1;
});
