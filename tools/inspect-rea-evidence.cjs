// Inspect a REA JSON evidence file that may include progress lines and UTF-16LE BOM.
const fs = require('fs');
const path = require('path');

const file = process.argv[2] || path.resolve(__dirname, '..', 'research', 'rea-evidence-small.json');
let raw = fs.readFileSync(file);
let text = raw.toString('utf16le');
if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

const candidates = text.split(/\r?\n/)
  .map((l) => l.trim())
  .filter((l) => l.startsWith('{') && !l.includes('"rea_progress"'));

if (!candidates.length) {
  text = raw.toString('utf8').replace(/^\uFEFF/, '');
  candidates.push(...text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.startsWith('{') && !l.includes('"rea_progress"')));
}

const evidence = JSON.parse(candidates[candidates.length - 1]);
const normalized = evidence.normalized_result || {};
const mode = process.argv[3] || 'summary';

if (mode === 'summary') {
  console.log(JSON.stringify({
    subject: evidence.subject,
    summary: normalized.summary,
    statistics: normalized.statistics,
    semanticKeys: Object.keys(normalized.semantic_graph || {}),
    graphKeys: Object.keys(normalized.graph || {}),
    limitations: evidence.limitations,
  }, null, 2));
} else if (mode === 'keys') {
  console.log(Object.keys(evidence).join('\n'));
  console.log('--- normalized ---');
  console.log(Object.keys(normalized).join('\n'));
} else if (mode === 'raw') {
  console.log(JSON.stringify(evidence.raw_result, null, 2));
} else {
  console.log(JSON.stringify(evidence, null, 2));
}
