// Intent API — records user intents/events with idempotency.
//   POST /api/intent  Authorization: Bearer <token>
//     { kind, reel, text, choice, payload, idem } -> { ok: true, intent }

const db = require('./_db');

function intentShape(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    kind: row.kind,
    reelId: row.reel_id,
    payload: db.parseJson(row.payload, row.payload || ''),
    idem: row.idem,
    createdAt: row.created_at,
  };
}

module.exports = async (req, res) => {
  if (db.cors(req, res)) return;
  const { query, ready, json, parseBody, userFromReq, newId } = db;
  try { await ready(); } catch (e) { return json(res, 500, { error: 'Database unavailable: ' + e.message }); }

  const url = req.url.split('?')[0];
  if (url !== '/api/intent' || req.method !== 'POST') return json(res, 404, { error: 'not found' });

  try {
    const user = await userFromReq(req);
    if (!user) return json(res, 401, { error: 'not authenticated' });
    const body = await parseBody(req);
    if (!body.kind) return json(res, 400, { error: 'kind is required' });

    const reelId = body.reel && typeof body.reel === 'object'
      ? (body.reel.id || null)
      : (body.reel || null);
    const extra = body.payload && typeof body.payload === 'object' ? body.payload : {};
    const payload = JSON.stringify(Object.assign({
      reel: body.reel || null,
      text: body.text == null ? '' : String(body.text),
      choice: body.choice == null ? null : body.choice,
    }, extra));
    const idem = String(body.idem || newId('idem_'));
    const created = new Date().toISOString();
    const id = newId('i_');
    const kind = String(body.kind);

    const existing = await query('SELECT * FROM intents WHERE idem = $1', [idem]);
    if (existing.length) return json(res, 200, { ok: true, intent: intentShape(existing[0]) });

    await query(
      'INSERT INTO intents (id, user_id, kind, reel_id, payload, idem, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (idem) DO NOTHING',
      [id, user.id, kind, reelId ? String(reelId) : null, payload, idem, created]
    );
    const rows = await query('SELECT * FROM intents WHERE idem = $1', [idem]);
    if (!rows.length) return json(res, 500, { error: 'could not record intent' });
    const intent = rows[0];

    // Only log the event when this request created the intent (handles idem races).
    if (intent.id === id) {
      await query(
        'INSERT INTO events (id, user_id, kind, payload, created_at) VALUES ($1,$2,$3,$4,$5)',
        [newId('e_'), user.id, 'intent.' + kind, payload, created]
      );
    }
    return json(res, 200, { ok: true, intent: intentShape(intent) });
  } catch (e) {
    json(res, 500, { error: e.message });
  }
};
