// Lumi Edits Clone — Pay API (in-memory demo storage)
// Endpoints:
//   POST /api/pay/create-intent  { amount, currency, method } -> { client_secret, amount, currency }
//   GET  /api/pay/history        Authorization: Bearer <token> -> { payments }

const payments = [];

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

function getToken(req) {
  const auth = req.headers['authorization'] || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = req.url.split('?')[0];

  // --- Create payment intent ---
  if (url === '/api/pay/create-intent' && req.method === 'POST') {
    const body = await parseBody(req);
    const { amount, currency = 'usd', method = 'card' } = body;
    if (!amount || amount <= 0) {
      return json(res, 400, { error: 'valid amount required' });
    }
    const intent = {
      client_secret: 'pi_' + Math.random().toString(36).slice(2) + '_secret_' + Date.now(),
      amount: Number(amount),
      currency,
      method,
      status: 'requires_confirmation',
      createdAt: new Date().toISOString(),
    };
    return json(res, 201, intent);
  }

  // --- Confirm payment ---
  if (url === '/api/pay/confirm' && req.method === 'POST') {
    const body = await parseBody(req);
    const { client_secret } = body;
    if (!client_secret) return json(res, 400, { error: 'client_secret required' });
    const payment = {
      id: 'pay_' + Date.now(),
      amount: body.amount || 0,
      currency: body.currency || 'usd',
      status: 'succeeded',
      createdAt: new Date().toISOString(),
    };
    payments.push(payment);
    return json(res, 200, { payment, status: 'succeeded' });
  }

  // --- Payment history ---
  if (url === '/api/pay/history' && req.method === 'GET') {
    const token = getToken(req);
    if (!token) return json(res, 401, { error: 'not authenticated' });
    return json(res, 200, { payments: [...payments].reverse() });
  }

  json(res, 404, { error: 'not found' });
};
