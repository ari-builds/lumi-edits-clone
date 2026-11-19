// Health endpoint — intentionally dependency-free so it stays green even if Neon is down.
const db = require('./_db');

module.exports = async (req, res) => {
  if (db.cors(req, res)) return;
  const url = req.url.split('?')[0];
  if (url !== '/api/health' || req.method !== 'GET') {
    return db.json(res, 404, { error: 'not found' });
  }
  return db.json(res, 200, { ok: true, service: 'lumi-edits', time: new Date().toISOString() });
};
