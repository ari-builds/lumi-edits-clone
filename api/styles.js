// Lumi Edits Clone — Styles API (in-memory demo storage)
// Endpoint: GET /api/styles -> { styles }

const styles = [
  { id: 'classic', name: 'Classic', preview: 'paper', accent: '#141518', desc: 'Clean paper background, bold ink text.' },
  { id: 'glass', name: 'Glass', preview: 'glass', accent: '#2f6fd0', desc: 'Frosted glass panels with subtle blur.' },
  { id: 'dojo', name: 'Dojo', preview: 'dojo', accent: '#8b5cf6', desc: 'Dark slate training-mat aesthetic.' },
  { id: 'clay', name: 'Clay', preview: 'clay', accent: '#e5a06d', desc: 'Soft claymorphism with deep shadows.' },
  { id: 'cleangirl', name: 'Clean Girl', preview: 'cleangirl', accent: '#f4c2c2', desc: 'Minimalist neutral tones, soft glazed look.' },
  { id: 'strawberry', name: 'Strawberry', preview: 'strawberry', accent: '#ff6b9d', desc: 'Berry pink with glossy accents.' },
  { id: 'matcha', name: 'Matcha', preview: 'matcha', accent: '#8ab17d', desc: 'Muted green, earthy and calm.' },
  { id: 'golden', name: 'Golden', preview: 'golden', accent: '#d4af37', desc: 'Warm gold highlights on cream.' },
  { id: 'silentpower', name: 'Silent Power', preview: 'silentpower', accent: '#0a0a0a', desc: 'High-contrast black-on-black minimalism.' },
  { id: 'everybody', name: 'Everybody', preview: 'everybody', accent: '#ffd700', desc: 'Bold, playful, maximalist color pop.' },
];

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = req.url.split('?')[0];
  if (url === '/api/styles' && req.method === 'GET') {
    return json(res, 200, { styles });
  }
  json(res, 404, { error: 'not found' });
};
