// Shared static Lumi catalog. No database, no dependencies.
// Consumed by /api/styles and /api/state so both return the same options.

function opt(id, name, extra = {}) { return Object.assign({ id, name }, extra); }

const templates = [
  opt('classic', 'Classic', { preview: 'paper', accent: '#141518', desc: 'Clean paper background, bold ink text.' }),
  opt('glass', 'Glass', { preview: 'glass', accent: '#2f6fd0', desc: 'Frosted glass panels with subtle blur.' }),
  opt('dojo', 'Dojo', { preview: 'dojo', accent: '#8b5cf6', desc: 'Dark slate training-mat aesthetic.' }),
  opt('clay', 'Clay', { preview: 'clay', accent: '#e5a06d', desc: 'Soft claymorphism with deep shadows.' }),
  opt('cleangirl', 'Clean Girl', { preview: 'cleangirl', accent: '#f4c2c2', desc: 'Minimalist neutral tones, soft glazed look.' }),
  opt('strawberry', 'Strawberry', { preview: 'strawberry', accent: '#ff6b9d', desc: 'Berry pink with glossy accents.' }),
  opt('matcha', 'Matcha', { preview: 'matcha', accent: '#8ab17d', desc: 'Muted green, earthy and calm.' }),
  opt('golden', 'Golden', { preview: 'golden', accent: '#d4af37', desc: 'Warm gold highlights on cream.' }),
  opt('silentpower', 'Silent Power', { preview: 'silentpower', accent: '#0a0a0a', desc: 'High-contrast black-on-black minimalism.' }),
  opt('everybody', 'Everybody', { preview: 'everybody', accent: '#ffd700', desc: 'Bold, playful, maximalist color pop.' }),
  opt('product', 'Product Spotlight'),
  opt('before-after', 'Before / After'),
  opt('listicle', 'Listicle'),
  opt('story', 'Story Time'),
];

const captions = [
  opt('bold-bottom', 'Bold bottom', { desc: 'Big, confident captions pinned to the bottom.' }),
  opt('highlight-word', 'Highlight word', { desc: 'Punch one word per line in an accent color.' }),
  opt('two-tone', 'Two-tone', { desc: 'Alternating colors for contrast and rhythm.' }),
  opt('minimal', 'Minimal', { desc: 'Small, quiet captions that stay out of the way.' }),
  opt('karaoke', 'Karaoke', { desc: 'Word-by-word fill synced to the voiceover.' }),
];

const motion = [
  opt('kinetic', 'Kinetic words'),
  opt('zoom-pop', 'Zoom pop'),
  opt('slide-in', 'Slide in'),
  opt('typewriter', 'Typewriter'),
  opt('photo-carousel', 'Photo carousel'),
];

const vfx = [
  opt('spotlight', 'Spotlight'),
  opt('type-wall', 'Type wall'),
  opt('clone', 'Clone'),
];

const grades = [
  opt('natural-true-color', 'Natural True Color'),
  opt('clean-and-punchy', 'Clean and Punchy'),
  opt('warm-film', 'Warm Film'),
  opt('bright-and-airy', 'Bright and Airy'),
  opt('soft-matte-pastel', 'Soft Matte Pastel'),
  opt('moody-muted', 'Moody Muted'),
  opt('golden-hour', 'Golden Hour'),
  opt('cool-and-crisp', 'Cool and Crisp'),
  opt('rich-and-vibrant', 'Rich and Vibrant'),
];

const hooks = [
  opt('control', 'Control', { desc: 'Open with a direct command to the viewer.' }),
  opt('wait-for', 'Wait-for', { desc: 'Build curiosity with a delayed reveal.' }),
  opt('flash-forward', 'Flash-forward', { desc: 'Show the payoff first, then rewind.' }),
  opt('cold-open', 'Cold open', { desc: 'Drop straight into the action.' }),
  opt('series-pitch', 'Series pitch', { desc: 'Frame it as part one of a series.' }),
];

const backgrounds = [
  opt('keep', 'Keep it as filmed'),
  opt('blurred', 'Blurred background'),
  opt('pop-out', 'Pop Out Effect'),
  opt('cut-out', 'Cut you out onto a background'),
  opt('zoom-blur', 'Zoom and blur on big points'),
  opt('you-decide', 'You decide'),
];

const music = [
  opt('none', 'No Music'),
  opt('upbeat-pop', 'Upbeat Pop'),
  opt('lofi-chill', 'Lo-fi Chill'),
  opt('cinematic-rise', 'Cinematic Rise'),
  opt('trending', 'Trending'),
  opt('soft-piano', 'Soft Piano'),
  opt('corporate-clean', 'Corporate Clean'),
];

const voices = [
  opt('warm-friendly', 'Warm & Friendly'),
  opt('calm-clear', 'Calm & Clear'),
  opt('energetic', 'Energetic'),
  opt('editorial', 'Editorial'),
];

const formats = [
  opt('vertical', 'vertical 9:16', { ratio: '9:16', width: 1080, height: 1920 }),
  opt('horizontal', 'horizontal 16:9', { ratio: '16:9', width: 1920, height: 1080 }),
];

const intensities = [
  opt('clean', 'Clean'),
  opt('polished', 'Polished'),
  opt('punchy', 'Punchy'),
  opt('full-sauce', 'Full Sauce'),
];

const catalog = {
  templates, captions, motion, vfx, grades, hooks, backgrounds, music, voices, formats,
  intensities,
};

module.exports = { catalog };
