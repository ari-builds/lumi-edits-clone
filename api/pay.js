// Pay API — persistent payment intents/confirmations in Neon (demo, no real charges).
//   POST /api/pay/create-intent { amount, currency, method } -> { client_secret, ... }
//   POST /api/pay/confirm       { client_secret, amount, currency } -> { payment, status }
//   GET  /api/pay/history       Authorization: Bearer -> { payments }

const db = require('./_db');
const crypto = require('crypto');

module.exports = async (req, res) => {
  if (db.cors(req, res)) return;
  const { query, ready, json, parseBody, userFromReq } = db;
  try { await ready(); } catch (e) { return json(res, 500, { error: 'Database unavailable: ' + e.message }); }
  const url = req.url.split('?')[0];
  try {
    if (url === '/api/pay/create-intent' && req.method === 'POST') {
      const body = await parseBody(req);
      const { amount, currency = 'usd', method = 'card' } = body;
      if (!amount || Number(amount) <= 0) return json(res, 400, { error: 'valid amount required' });
      const clientSecret = 'pi_' + crypto.randomBytes(12).toString('hex') + '_secret_' + Date.now();
      const created = new Date().toISOString();
      await query('INSERT INTO payment_intents (client_secret, amount, currency, method, status, created_at) VALUES ($1,$2,$3,$4,$5,$6)',
        [clientSecret, Number(amount), String(currency), String(method), 'requires_confirmation', created]);
      return json(res, 201, { client_secret: clientSecret, amount: Number(amount), currency: String(currency), method: String(method), status: 'requires_confirmation' });
    }

    if (url === '/api/pay/confirm' && req.method === 'POST') {
      const body = await parseBody(req);
      const { client_secret } = body;
      if (!client_secret) return json(res, 400, { error: 'client_secret required' });
      const intent = (await query('SELECT * FROM payment_intents WHERE client_secret = $1', [client_secret]))[0];
      if (!intent) return json(res, 404, { error: 'intent not found' });
      if (intent.status === 'succeeded') {
        const existing = (await query('SELECT id FROM payments WHERE client_secret = $1', [client_secret]))[0];
        return json(res, 200, { payment: { id: existing.id, amount: Number(intent.amount), currency: intent.currency, status: 'succeeded' }, status: 'succeeded' });
      }
      const user = await userFromReq(req);
      const pid = 'pay_' + Date.now().toString(36) + crypto.randomBytes(4).toString('hex');
      const created = new Date().toISOString();
      await query('UPDATE payment_intents SET status = $1 WHERE client_secret = $2', ['succeeded', client_secret]);
      await query('INSERT INTO payments (id, client_secret, amount, currency, status, user_id, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [pid, client_secret, Number(intent.amount), intent.currency, 'succeeded', user ? user.id : null, created]);
      return json(res, 200, { payment: { id: pid, amount: Number(intent.amount), currency: intent.currency, status: 'succeeded' }, status: 'succeeded' });
    }

    if (url === '/api/pay/history' && req.method === 'GET') {
      const user = await userFromReq(req);
      if (!user) return json(res, 401, { error: 'not authenticated' });
      const rows = await query('SELECT id, amount, currency, status, created_at FROM payments WHERE user_id = $1 ORDER BY created_at DESC', [user.id]);
      return json(res, 200, { payments: rows });
    }

    json(res, 404, { error: 'not found' });
  } catch (e) {
    json(res, 500, { error: e.message });
  }
};
