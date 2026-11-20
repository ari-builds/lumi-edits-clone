/*
 * Lumi edit model — pure helpers shared by the browser editor and Node smokes.
 * No DOM, no network, no secrets. Exposed as window.LumiEditModel and, when
 * required from Node, as module.exports.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.LumiEditModel = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
  function finite(v) { return typeof v === 'number' && isFinite(v) ? v : 0; }

  function parseTime(v) {
    if (typeof v === 'number' && isFinite(v)) return Math.max(0, v);
    var s = String(v == null ? '' : v).trim();
    if (!s) return 0;
    var m = s.match(/^(\d+):(\d{1,2}(?:\.\d+)?)$/);
    if (m) return Math.max(0, Number(m[1]) * 60 + Number(m[2]));
    var n = Number(s);
    return isFinite(n) ? Math.max(0, n) : 0;
  }

  function formatTime(seconds) {
    var s = Math.max(0, Math.floor(finite(seconds)));
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    var sec = ('0' + (s % 60)).slice(-2);
    return h > 0 ? h + ':' + ('0' + m).slice(-2) + ':' + sec : m + ':' + sec;
  }

  var MOTION_PRESETS = {
    none: [],
    'zoom-in': [{ x: 0, y: 0, zoom: 1, rotate: 0 }, { x: 0, y: 0, zoom: 1.12, rotate: 0 }],
    'zoom-out': [{ x: 0, y: 0, zoom: 1.12, rotate: 0 }, { x: 0, y: 0, zoom: 1, rotate: 0 }],
    'pan-left': [{ x: 0.35, y: 0, zoom: 1.08, rotate: 0 }, { x: -0.35, y: 0, zoom: 1.08, rotate: 0 }],
    'pan-right': [{ x: -0.35, y: 0, zoom: 1.08, rotate: 0 }, { x: 0.35, y: 0, zoom: 1.08, rotate: 0 }],
    'tilt-up': [{ x: 0, y: 0.32, zoom: 1.08, rotate: 0 }, { x: 0, y: -0.32, zoom: 1.08, rotate: 0 }],
    'tilt-down': [{ x: 0, y: -0.32, zoom: 1.08, rotate: 0 }, { x: 0, y: 0.32, zoom: 1.08, rotate: 0 }],
    'tilt-left': [{ x: 0, y: 0, zoom: 1.08, rotate: -2.5 }, { x: 0, y: 0, zoom: 1.08, rotate: 2.5 }],
    'tilt-right': [{ x: 0, y: 0, zoom: 1.08, rotate: 2.5 }, { x: 0, y: 0, zoom: 1.08, rotate: -2.5 }]
  };

  function motionKey(k) {
    k = k || {};
    return {
      t: parseTime(k.t),
      x: clamp(finite(k.x), -1, 1),
      y: clamp(finite(k.y), -1, 1),
      zoom: clamp(finite(k.zoom) || 1, 1, 3),
      rotate: clamp(finite(k.rotate), -45, 45)
    };
  }

  /** Return a normalised { keys: [...] } motion for `input` over `duration`. */
  function normalizeMotion(input, duration) {
    var d = Math.max(0.05, finite(duration) || 1);
    if (typeof input === 'string') {
      var preset = MOTION_PRESETS[input] || MOTION_PRESETS.none;
      input = { keys: preset.map(function (k, i) {
        return { t: preset.length > 1 ? (d * i) / (preset.length - 1) : 0, x: k.x, y: k.y, zoom: k.zoom, rotate: k.rotate };
      }) };
    }
    var raw = input && (Array.isArray(input.keys) ? input.keys : (Array.isArray(input.keyframes) ? input.keyframes : []));
    var keys = (raw || []).map(motionKey).sort(function (a, b) { return a.t - b.t; });
    if (!keys.length) return { keys: [] };
    // Anchor both ends so a clip starts and ends predictably.
    if (keys[0].t > 0) {
      var first = Object.assign({}, keys[0], { t: 0 });
      keys.unshift(first);
    }
    if (keys[keys.length - 1].t < d - 0.001) {
      var last = Object.assign({}, keys[keys.length - 1], { t: d });
      keys.push(last);
    }
    return { keys: keys.map(function (k) { return Object.assign({}, k, { t: clamp(k.t, 0, d) }); }) };
  }

  /** Interpolated motion at clip-local time `t`. */
  function evaluateMotion(motion, t) {
    var keys = (motion && Array.isArray(motion.keys) ? motion.keys : normalizeMotion(motion, 1).keys) || [];
    var base = { x: 0, y: 0, zoom: 1, rotate: 0 };
    if (!keys.length) return base;
    var at = finite(t);
    if (at <= keys[0].t) return Object.assign(base, keys[0]);
    var last = keys[keys.length - 1];
    if (at >= last.t) return Object.assign(base, last);
    for (var i = 0; i < keys.length - 1; i++) {
      var a = keys[i], b = keys[i + 1];
      if (at >= a.t && at <= b.t) {
        var span = Math.max(0.0001, b.t - a.t);
        var p = clamp((at - a.t) / span, 0, 1);
        return {
          x: a.x + (b.x - a.x) * p,
          y: a.y + (b.y - a.y) * p,
          zoom: a.zoom + (b.zoom - a.zoom) * p,
          rotate: a.rotate + (b.rotate - a.rotate) * p
        };
      }
    }
    return Object.assign(base, last);
  }

  var TRANSITIONS = ['none', 'fade', 'wipe', 'slide', 'zoom'];

  function normalizeTransition(input) {
    input = input || {};
    var type = TRANSITIONS.indexOf(String(input.type || 'none')) >= 0 ? String(input.type) : 'none';
    return { type: type, duration: clamp(finite(input.duration), 0, 5) };
  }

  function normalizeAudio(input) {
    input = input || {};
    return {
      volume: clamp(input.volume == null ? 1 : finite(input.volume), 0, 2),
      fadeIn: clamp(finite(input.fadeIn), 0, 60),
      fadeOut: clamp(finite(input.fadeOut), 0, 60),
      muted: Boolean(input.muted)
    };
  }

  /**
   * Normalise a clip list. Clip `timelineStart` is honoured when supplied, so
   * reordering and manual offsets survive into both preview and export.
   */
  function normalizeTimeline(clips, opts) {
    opts = opts || {};
    var fallback = Math.max(0.05, finite(opts.defaultDuration) || 5);
    var list = (Array.isArray(clips) ? clips : []).map(function (d, i) {
      d = d || {};
      var url = String(d.url || d.sourceUrl || '');
      if (!url) return null;
      var src = finite(d.sourceDuration);
      var inPoint = clamp(finite(d.inPoint != null ? d.inPoint : d.start), 0, Math.max(0, src - 0.01) || Infinity);
      var duration = finite(d.duration != null ? d.duration : d.len);
      if (!(duration > 0)) duration = src > 0 ? Math.max(0.05, src - inPoint) : fallback;
      if (src > 0) duration = Math.min(duration, Math.max(0.05, src - inPoint));
      return {
        id: String(d.id || ('clip_' + (i + 1))),
        url: url,
        name: String(d.name || ('Clip ' + (i + 1))),
        inPoint: inPoint,
        duration: duration,
        sourceDuration: src,
        timelineStart: d.timelineStart != null ? parseTime(d.timelineStart) : null,
        transition: normalizeTransition(d.transition),
        motion: normalizeMotion(d.motion, duration),
        audio: normalizeAudio(d.audio),
        look: String(d.look || opts.look || ''),
        element: null,
        ref: null
      };
    }).filter(Boolean);

    var cursor = 0;
    list.forEach(function (c) {
      if (c.timelineStart == null) c.timelineStart = cursor;
      cursor = Math.max(cursor, c.timelineStart + c.duration);
    });
    return {
      clips: list,
      total: Math.max(0.05, cursor),
      look: String(opts.look || 'classic'),
      format: String(opts.format || 'vertical'),
      musicMode: String(opts.musicMode || 'source')
    };
  }

  /** Rebuild contiguous timeline starts after a reorder or trim. */
  function reflow(clips) {
    var cursor = 0;
    (clips || []).forEach(function (c) {
      if (!c) return;
      c.timelineStart = cursor;
      cursor += Math.max(0.05, finite(c.duration));
    });
    return clips || [];
  }

  var CAP_POSITIONS = ['top', 'middle', 'bottom'];
  var CAP_SIZES = ['S', 'M', 'L'];

  function normalizeCaption(c, i) {
    c = c || {};
    var color = String(c.color || '').trim();
    if (!/^#[0-9a-f]{3,8}$/i.test(color)) color = '';
    var weight = Number(c.weight);
    if (!isFinite(weight)) weight = 800;
    return {
      id: String(c.id || ('cap_' + (i + 1))),
      t: parseTime(c.t),
      duration: Math.max(0.05, finite(c.duration) || 3),
      text: String(c.text == null ? '' : c.text),
      position: CAP_POSITIONS.indexOf(String(c.position)) >= 0 ? String(c.position) : 'bottom',
      size: CAP_SIZES.indexOf(String(c.size || '').toUpperCase()) >= 0 ? String(c.size).toUpperCase() : 'M',
      color: color,
      weight: clamp(Math.round(weight / 100) * 100, 400, 900)
    };
  }

  /**
   * Caption syntax:  t|position|size|#color|weight|text
   * Legacy `0:03 text` lines are accepted with default styling.
   */
  function parseCaptions(text) {
    return String(text == null ? '' : text).split(/\r?\n/).map(function (line, i) {
      var s = line.trim();
      if (!s) return null;
      var parts = s.split('|');
      if (parts.length >= 6) {
        return normalizeCaption({
          t: parts[0], position: parts[1], size: parts[2], color: parts[3],
          weight: parts[4], text: parts.slice(5).join('|')
        }, i);
      }
      var m = s.match(/^(\d+(?:\.\d+)?|\d{1,2}:\d{1,2}(?:\.\d+)?)\s+(.+)$/);
      if (!m) return null;
      return normalizeCaption({ t: m[1], text: m[2] }, i);
    }).filter(Boolean).slice(0, 120);
  }

  function serializeCaptions(captions) {
    return (captions || []).map(function (c) {
      c = normalizeCaption(c, 0);
      return [formatTime(c.t), c.position, c.size, c.color || 'auto', c.weight, c.text].join('|');
    }).join('\n');
  }

  /** Build a first edit model from a reel or a created-reel payload. */
  function defaultEdit(reel) {
    reel = reel || {};
    var assets = (Array.isArray(reel.assets) ? reel.assets : []).filter(function (a) {
      return a && a.kind === 'raw' && a.url;
    });
    if (!assets.length) {
      var url = String(reel.videoUrl || reel.sourceUrl || '');
      if (url) assets = [{ url: url, name: 'Source', ofIndex: 1 }];
    }
    var total = finite(reel.duration);
    var per = assets.length ? ((total || assets.length * 6) / assets.length) : 6;
    var clips = assets.map(function (a, i) {
      var duration = Math.max(0.5, per);
      var motion = String((reel.styleOptions && reel.styleOptions.motion) || '');
      var preset = /zoom|punch/i.test(motion) ? 'zoom-in' : 'none';
      return {
        id: 'c_' + (i + 1),
        url: a.url,
        name: String(a.name || ('Clip ' + (i + 1))),
        inPoint: 0,
        duration: duration,
        sourceDuration: finite(a.duration),
        timelineStart: i * duration,
        transition: { type: i > 0 ? 'fade' : 'none', duration: i > 0 ? 0.3 : 0 },
        motion: normalizeMotion(preset, duration),
        audio: { volume: 1, fadeIn: 0, fadeOut: 0, muted: false },
        look: String(reel.look || 'classic')
      };
    });
    var scenes = Array.isArray(reel.storyboard) ? reel.storyboard
      : ((reel.plan && Array.isArray(reel.plan.scenes)) ? reel.plan.scenes : []);
    var captions = scenes.filter(function (s) { return s && s.caption; }).map(function (s, i) {
      return normalizeCaption({
        t: s.start != null ? s.start : i * 3,
        duration: s.duration || 3,
        text: s.caption,
        position: 'bottom', size: 'M', color: 'auto', weight: 800
      }, i);
    });
    return {
      version: 1,
      clips: clips,
      captions: captions,
      hook: { text: String(reel.hookText || reel.title || ''), t: 0, duration: 2.5, color: 'auto' },
      cta: { text: String(reel.ctaText || 'Follow for more'), t: Math.max(0, total - 2), duration: 2 },
      look: String(reel.look || 'classic'),
      format: String(reel.format || 'vertical'),
      musicMode: 'source',
      updated: new Date().toISOString()
    };
  }

  return {
    clamp: clamp,
    parseTime: parseTime,
    formatTime: formatTime,
    MOTION_PRESETS: MOTION_PRESETS,
    TRANSITIONS: TRANSITIONS,
    CAP_POSITIONS: CAP_POSITIONS,
    CAP_SIZES: CAP_SIZES,
    normalizeMotion: normalizeMotion,
    evaluateMotion: evaluateMotion,
    normalizeTransition: normalizeTransition,
    normalizeAudio: normalizeAudio,
    normalizeTimeline: normalizeTimeline,
    reflow: reflow,
    normalizeCaption: normalizeCaption,
    parseCaptions: parseCaptions,
    serializeCaptions: serializeCaptions,
    defaultEdit: defaultEdit
  };
});
