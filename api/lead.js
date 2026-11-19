// Shared lead capture for the client estimator pages (GitHub Pages -> this API).
//   OPTIONS /api/lead          CORS preflight
//   GET     /api/lead/health   -> { ok: true, table: 'estimator_leads' }
//   POST    /api/lead          -> { ok: true, ref } | { error }
//
// No auth is required: these are public quote requests. The payload is stored
// in Neon and, when RESEND_API_KEY + LEAD_TO_EMAIL are configured, a notification
// is attempted. If email is not configured the lead is still durably stored.
// Secret values are never logged or returned.

const db = require('./_db');

function clean(value, max) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function serverRef(site) {
  const prefix = String(site || 'EST').replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase() || 'EST';
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}

async function notify(site, ref, payload) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.LEAD_TO_EMAIL;
  if (!key || !to) return false;
  const contact = payload.contact || {};
  const estimate = payload.estimate || {};
  const text = [
    `New written estimate request — ${site || 'estimator'}`,
    '',
    `Reference: ${ref}`,
    `Name: ${contact.name || ''}`,
    `Phone: ${contact.phone || ''}`,
    `Email: ${contact.email || ''}`,
    `Address: ${contact.address || ''}`,
    '',
    `Surface: ${(payload.surface || {}).label || ''}`,
    `Area: ${JSON.stringify(payload.area || {})}`,
    `Total: ${estimate.currency || 'USD'} ${estimate.total || ''} (band ${estimate.min || ''}-${estimate.max || ''})`,
    `Page: ${(payload.meta || {}).page || ''}`,
  ].join('\n');

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.LEAD_FROM_EMAIL || 'Netclicks Leads <onboarding@resend.dev>',
        to: [to],
        subject: `${ref} — ${site || 'Estimate'} request from ${contact.name || 'a visitor'}`,
        text,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

module.exports = async (req, res) => {
  if (db.cors(req, res)) return;
  const path = req.url.split('?')[0];

  if (path === '/api/lead/health' && req.method === 'GET') {
    let count = null;
    try {
      await db.ready();
      const rows = await db.query('select count(*)::int as n from estimator_leads');
      count = rows[0] ? rows[0].n : 0;
    } catch {}
    return db.json(res, 200, { ok: true, table: 'estimator_leads', count });
  }
  if (path !== '/api/lead' || req.method !== 'POST') {
    return db.json(res, 404, { error: 'not found' });
  }

  try {
    await db.ready();
  } catch (e) {
    return db.json(res, 500, { error: 'Lead storage is unavailable right now.' });
  }

  let body;
  try {
    body = await db.parseBody(req);
  } catch {
    return db.json(res, 400, { error: 'Invalid request body.' });
  }

  // Honeypot: bots get a success response but nothing is stored.
  if (body.website || body.hp) {
    return db.json(res, 201, { ok: true, ref: serverRef(body.site) });
  }

  // Automated QA can opt out of storage with a client-supplied flag.
  if (body.meta && body.meta.smoke === true) {
    return db.json(res, 201, {
      ok: true,
      ref: clean(body.reference, 40) || serverRef(body.site),
      notified: false,
      smoke: true,
    });
  }

  const contact = body.contact || {};
  const name = clean(contact.name, 120);
  const phone = clean(contact.phone, 40);
  const address = clean(contact.address, 240);
  const email = clean(contact.email, 160);

  if (name.length < 2 || !/[\d()\- ]{7,}/.test(phone) || address.length < 4) {
    return db.json(res, 400, { error: 'Name, phone and address are required.' });
  }

  const site = clean(body.site, 80);
  const ref = clean(body.reference, 40) || serverRef(site);
  const record = {
    site,
    reference: ref,
    contact: { name, phone, address, email },
    surface: body.surface || {},
    area: body.area || {},
    extras: Array.isArray(body.extras) ? body.extras.slice(0, 30) : [],
    estimate: body.estimate || {},
    meta: body.meta || {},
    receivedAt: new Date().toISOString(),
  };

  try {
    await db.query(
      'INSERT INTO estimator_leads (id, site, reference, payload, created_at) VALUES ($1, $2, $3, $4, $5)',
      [db.newId('lead_'), site, ref, JSON.stringify(record), record.receivedAt]
    );
  } catch (e) {
    return db.json(res, 500, { error: 'Could not save your request. Please try again.' });
  }

  const notified = await notify(site, ref, record);
  if (notified) {
    try {
      await db.query('UPDATE estimator_leads SET notified = 1 WHERE reference = $1', [ref]);
    } catch {}
  }

  return db.json(res, 201, { ok: true, ref, notified });
};
