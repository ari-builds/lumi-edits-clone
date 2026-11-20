// Pure edit-model smoke tests. No server, no credentials, no network.
// Covers transitions, motion keyframes, audio gain, timeline reflow and caption styling.

'use strict';

const M = require('../app/edit-model.js');

let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    const detail = fn();
    passed += 1;
    console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`);
  } catch (err) {
    failed += 1;
    console.log(`FAIL ${name} — ${err && err.message ? err.message : String(err)}`);
  }
}

function must(condition, message) {
  if (!condition) throw new Error(message);
}

function near(a, b, eps, message) {
  must(Math.abs(Number(a) - Number(b)) <= (eps || 0.01), `${message}: expected ${b}, got ${a}`);
}

console.log('Lumi editor model smoke');

check('parseTime accepts seconds, mm:ss and junk', () => {
  near(M.parseTime('12.5'), 12.5, 0.001, 'seconds');
  near(M.parseTime('1:03.5'), 63.5, 0.001, 'mm:ss');
  near(M.parseTime(7), 7, 0.001, 'number');
  near(M.parseTime('nope'), 0, 0.001, 'invalid');
  return '4 cases';
});

check('motion presets are normalised and interpolated', () => {
  const zoom = M.normalizeMotion('zoom-in', 4);
  must(zoom.keys.length >= 2, 'zoom-in should have at least two keys');
  near(zoom.keys[0].t, 0, 0.001, 'first key at zero');
  near(zoom.keys[zoom.keys.length - 1].t, 4, 0.001, 'last key at duration');
  near(M.evaluateMotion(zoom, 0).zoom, 1, 0.001, 'zoom at start');
  near(M.evaluateMotion(zoom, 4).zoom, 1.12, 0.001, 'zoom at end');
  near(M.evaluateMotion(zoom, 2).zoom, 1.06, 0.01, 'zoom midway');
  const flat = M.evaluateMotion({ keys: [] }, 1.5);
  near(flat.zoom, 1, 0.001, 'no motion keeps zoom at 1');
  return 'zoom-in 0→4s';
});

check('custom keyframes are clamped and sorted', () => {
  const motion = M.normalizeMotion({
    keys: [
      { t: 3, x: 5, y: -5, zoom: 9, rotate: 90 },
      { t: 1, x: -0.4, y: 0.2, zoom: 1.2, rotate: -5 },
    ],
  }, 3);
  must(motion.keys[0].t === 0, 'first sorted key anchored to zero');
  must(motion.keys[0].x === -0.4, 'pan X clamped to -0.4');
  must(motion.keys[0].y === 0.2, 'pan Y clamped to 0.2');
  must(motion.keys[0].zoom === 1.2, 'zoom clamped to 1.2');
  must(motion.keys[0].rotate === -5, 'rotation preserved');
  near(motion.keys[motion.keys.length - 1].t, 3, 0.001, 'last key at duration');
  return `${motion.keys.length} anchored keys`;
});

check('transitions and audio settings are clamped', () => {
  const tr = M.normalizeTransition({ type: 'wipe', duration: -3 });
  must(tr.type === 'wipe', 'transition type kept');
  near(tr.duration, 0, 0.001, 'negative transition duration clamped');
  const bad = M.normalizeTransition({ type: 'teleport', duration: 2 });
  must(bad.type === 'none', 'unknown transition falls back to none');
  const audio = M.normalizeAudio({ volume: 9, fadeIn: -1, fadeOut: 100, muted: true });
  near(audio.volume, 2, 0.001, 'volume clamped to 2');
  near(audio.fadeIn, 0, 0.001, 'fade-in clamped');
  near(audio.fadeOut, 60, 0.001, 'fade-out clamped to 60');
  must(audio.muted === true, 'mute preserved');
  return 'fade/wipe/audio bounds';
});

check('timeline honours manual starts and reflow removes gaps', () => {
  const timeline = M.normalizeTimeline([
    { id: 'a', url: 'blob:a', duration: 2, timelineStart: 0, transition: { type: 'fade', duration: 0.3 } },
    { id: 'b', url: 'blob:b', duration: 3, timelineStart: 5, audio: { volume: 0.5, fadeOut: 1 } },
  ], { look: 'classic', format: 'vertical' });
  near(timeline.total, 8, 0.001, 'offset kept in total');
  near(timeline.clips[1].timelineStart, 5, 0.001, 'manual start preserved');
  near(timeline.clips[1].audio.volume, 0.5, 0.001, 'clip gain preserved');
  M.reflow(timeline.clips);
  near(timeline.clips[1].timelineStart, 2, 0.001, 'reflow makes clips contiguous');
  return 'offset 5s → reflow 2s';
});

check('caption parser handles styled and legacy lines', () => {
  const caps = M.parseCaptions([
    '0:01|top|L|#ffcc00|900|Big hook',
    '3.5|bottom|S||700|Small line',
    '7 Legacy caption',
    'garbage line',
  ].join('\n'));
  must(caps.length === 3, `expected 3 captions, got ${caps.length}`);
  near(caps[0].t, 1, 0.001, 'styled time');
  must(caps[0].position === 'top' && caps[0].size === 'L', 'styled position and size');
  must(caps[0].color === '#ffcc00' && caps[0].weight === 900, 'styled color and weight');
  must(caps[1].color === '' && caps[1].size === 'S', 'blank color retained');
  must(caps[2].text === 'Legacy caption', 'legacy text parsed');
  const wire = M.serializeCaptions(caps);
  const again = M.parseCaptions(wire);
  must(again.length === 3, 'serialize/parse roundtrip count');
  must(again[0].text === caps[0].text && again[0].weight === caps[0].weight, 'roundtrip styling');
  return 'styled + legacy + roundtrip';
});

check('defaultEdit builds clips and timed captions from a reel', () => {
  const edit = M.defaultEdit({
    id: 'r1',
    title: 'Demo',
    duration: 9,
    look: 'golden',
    format: 'vertical',
    assets: [
      { kind: 'raw', url: 'blob:one', name: 'One' },
      { kind: 'raw', url: 'blob:two', name: 'Two' },
    ],
    storyboard: [
      { start: 0, duration: 2, caption: 'First' },
      { start: 4, duration: 2, caption: 'Second' },
    ],
  });
  must(edit.clips.length === 2, 'two raw clips');
  near(edit.clips[0].duration, 4.5, 0.001, 'even split');
  near(edit.clips[1].timelineStart, 4.5, 0.001, 'second clip start');
  must(edit.captions.length === 2, 'captions from storyboard');
  near(edit.captions[1].t, 4, 0.001, 'caption timing from scene');
  must(edit.look === 'golden' && edit.format === 'vertical', 'look and format carried');
  return '2 clips, 2 captions';
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
