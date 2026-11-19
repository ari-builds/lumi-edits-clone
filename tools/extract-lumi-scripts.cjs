// Extract inline <script> bodies from the saved live Lumi HTML into a JS tree
// for static analysis with REA's JavaScript application analyzer.
const fs = require('fs');
const path = require('path');

const input = path.resolve(__dirname, '..', 'research', 'lumi-live.html');
const outDir = path.resolve(__dirname, '..', 'research', 'lumi-js');
const html = fs.readFileSync(input, 'utf8');
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .map((m) => m[1])
  .filter((s) => s.trim().length > 20);

scripts.forEach((src, i) => {
  const name = `inline-${String(i + 1).padStart(3, '0')}.js`;
  fs.writeFileSync(path.join(outDir, name), src, 'utf8');
});

const manifest = {
  source: 'research/lumi-live.html',
  scriptCount: scripts.length,
  files: scripts.map((_, i) => `inline-${String(i + 1).padStart(3, '0')}.js`),
  bytes: scripts.reduce((n, s) => n + Buffer.byteLength(s), 0),
};
fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
console.log(JSON.stringify(manifest, null, 2));
