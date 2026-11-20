'use strict';

// Deterministic, on-device planning helpers. No network calls, no hosted LLM,
// no generated media. Plans are structured instructions only.

const NOTE_KINDS = ['general', 'storyboard', 'caption', 'broll', 'motion', 'sfx'];

function cleanText(value, max = 600) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, max);
}

function clampNumber(value, min, max, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

function normalizeAsset(input = {}) {
  const kind = ['raw', 'reference', 'style'].includes(input.kind) ? input.kind : 'raw';
  const url = cleanText(input.url || input.blobUrl || input.remoteUrl, 2000);
  const name = cleanText(input.name || input.fileName, 200);
  const analysis = input.analysis && typeof input.analysis === 'object' ? input.analysis : null;
  return {
    id: cleanText(input.id, 120) || null,
    kind,
    name: name || null,
    url: url || null,
    remote: Boolean(input.remote),
    ofIndex: Number.isInteger(input.ofIndex) ? input.ofIndex : null,
    analysis: analysis
      ? {
          method: cleanText(analysis.method, 120) || null,
          palette: Array.isArray(analysis.palette)
            ? analysis.palette.slice(0, 12).map((c) => cleanText(c, 32)).filter(Boolean)
            : [],
          brightness: Number.isFinite(Number(analysis.brightness))
            ? clampNumber(analysis.brightness, 0, 1, 0)
            : null,
          note: cleanText(analysis.note, 400) || null
        }
      : null
  };
}

function normalizeAssets(list) {
  if (!Array.isArray(list)) return [];
  return list.map(normalizeAsset).filter((a) => a.url || a.name);
}

function normalizeScene(input = {}, index = 0) {
  const caption = cleanText(input.caption, 240);
  const visual = cleanText(input.visual || input.description, 400);
  const motion = cleanText(input.motion, 200);
  const sfx = cleanText(input.sfx, 200);
  const broll = cleanText(input.broll, 300);
  const sourceIndex = Number.isInteger(input.sourceIndex) ? input.sourceIndex : null;
  const start = clampNumber(input.start, 0, 36000, index * 5);
  const duration = clampNumber(input.duration, 0.5, 36000, 5);
  return {
    index,
    start: Math.round(start * 100) / 100,
    duration: Math.round(duration * 100) / 100,
    sourceIndex,
    caption: caption || null,
    visual: visual || null,
    motion: motion || null,
    sfx: sfx || null,
    broll: broll || null
  };
}

function normalizePlan(input = {}) {
  const scenesRaw = Array.isArray(input.scenes) ? input.scenes : [];
  const scenes = scenesRaw.slice(0, 200).map(normalizeScene);
  const sourceSummary = Array.isArray(input.sourceSummary)
    ? input.sourceSummary.slice(0, 40).map((s) => cleanText(s, 240)).filter(Boolean)
    : [];
  const styleNotes = Array.isArray(input.styleNotes)
    ? input.styleNotes.slice(0, 40).map((s) => cleanText(s, 240)).filter(Boolean)
    : [];
  return {
    planner: cleanText(input.planner, 120) || 'on-device AI planner',
    method: cleanText(input.method, 200) || 'deterministic local rules',
    createdAt: cleanText(input.createdAt, 60) || new Date().toISOString(),
    title: cleanText(input.title, 240) || null,
    brief: cleanText(input.brief, 2000) || null,
    sceneCount: scenes.length,
    estimatedDuration: Math.round(scenes.reduce((sum, s) => sum + s.duration, 0) * 100) / 100,
    sourceSummary,
    styleNotes,
    scenes
  };
}

function applyNotesToPlan(plan, notes = {}) {
  const base = normalizePlan(plan);
  const buckets = {};
  for (const kind of NOTE_KINDS) buckets[kind] = [];

  const list = Array.isArray(notes) ? notes : notes.notes || [];
  for (const note of list) {
    if (!note || typeof note !== 'object') continue;
    const kind = NOTE_KINDS.includes(note.kind) ? note.kind : 'general';
    const text = cleanText(note.text, 400);
    if (!text) continue;
    const time = clampNumber(note.t, 0, 36000, 0);
    buckets[kind].push({ text, time: Math.round(time * 100) / 100 });
  }

  const globalNotes = buckets.general.map((n) => n.text);
  for (const scene of base.scenes) {
    for (const note of globalNotes) {
      if (!scene.visual) scene.visual = note;
      else if (!scene.visual.includes(note)) scene.visual = `${scene.visual}; ${note}`.slice(0, 400);
    }

    for (const note of buckets.storyboard) {
      if (scene.start <= note.time && note.time < scene.start + scene.duration) {
        scene.visual = `${scene.visual || ''} ${note.text}`.trim().slice(0, 400);
      }
    }

    for (const note of buckets.caption) {
      if (scene.start <= note.time && note.time < scene.start + scene.duration) {
        scene.caption = scene.caption ? `${scene.caption} / ${note.text}`.slice(0, 240) : note.text;
      }
    }

    for (const note of buckets.broll) {
      if (scene.start <= note.time && note.time < scene.start + scene.duration) {
        scene.broll = scene.broll ? `${scene.broll}; ${note.text}`.slice(0, 300) : note.text;
      }
    }

    for (const note of buckets.motion) {
      if (scene.start <= note.time && note.time < scene.start + scene.duration) {
        scene.motion = scene.motion ? `${scene.motion}; ${note.text}`.slice(0, 200) : note.text;
      }
    }

    for (const note of buckets.sfx) {
      if (scene.start <= note.time && note.time < scene.start + scene.duration) {
        scene.sfx = scene.sfx ? `${scene.sfx}; ${note.text}`.slice(0, 200) : note.text;
      }
    }
  }

  base.planner = 'on-device AI planner';
  base.method = 'deterministic local revision from timecoded notes';
  base.createdAt = new Date().toISOString();
  base.sourceSummary = [
    ...base.sourceSummary,
    ...globalNotes.slice(0, 5)
  ].slice(0, 40);
  return base;
}

module.exports = {
  NOTE_KINDS,
  cleanText,
  normalizeAsset,
  normalizeAssets,
  normalizeScene,
  normalizePlan,
  applyNotesToPlan
};
