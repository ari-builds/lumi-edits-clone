/*
 * Lumi Editor - client-side video engine (vanilla JS, no dependencies).
 * Loaded as a normal script before app.js. Exposes only window.LumiEditor.
 * All media work stays local (object/blob URLs); no network calls, no secrets.
 */
(function () {
  'use strict';

  var win = window;
  var doc = document;
  var URL_ = win.URL || {};
  var registry = new Map(); // url -> { url, element, owned, external, refcount, meta }

  // ---------------------------------------------------------------------------
  // Small utilities
  // ---------------------------------------------------------------------------
  function noop() {}
  function num(v, fallback) { var n = Number(v); return isFinite(n) ? n : fallback; }
  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
  function finite(v) { return typeof v === 'number' && isFinite(v) ? v : 0; }
  function isBlobLike(x) { return typeof Blob !== 'undefined' && x instanceof Blob; }
  function stopTracks(list) {
    (list || []).forEach(function (t) { try { t.stop(); } catch (e) {} });
  }
  function hide(el) { if (el) el.classList.add('lec-hidden'); }
  function show(el) { if (el) el.classList.remove('lec-hidden'); }
  function safeUrlCreate(blob) {
    try { return URL_.createObjectURL.call(URL_, blob); } catch (e) { return ''; }
  }
  function safeUrlRevoke(url) {
    if (!url || url.indexOf('blob:') !== 0) return;
    try { URL_.revokeObjectURL.call(URL_, url); } catch (e) {}
  }

  /** Resolve on one of `events`; reject on an error event or timeout. */
  function once(target, events, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var done = false, timer = null;
      function cleanup() {
        events.forEach(function (n) { try { target.removeEventListener(n, onEvent); } catch (e) {} });
        if (timer) clearTimeout(timer);
      }
      function onEvent(ev) {
        if (done) return;
        done = true; cleanup();
        if (ev && ev.type === 'error') reject(new Error('Media could not be loaded'));
        else resolve(ev);
      }
      events.forEach(function (n) { try { target.addEventListener(n, onEvent); } catch (e) {} });
      if (timeoutMs) timer = setTimeout(function () {
        if (done) return;
        done = true; cleanup();
        reject(new Error('Media load timed out'));
      }, timeoutMs);
    });
  }

  function seekTo(el, t) {
    return new Promise(function (resolve) {
      var target = clamp(num(t, 0), 0, Math.max(0, finite(el.duration) - 0.001));
      var done = false, timer = null;
      function finish() {
        if (done) return;
        done = true;
        try { el.removeEventListener('seeked', finish); } catch (e) {}
        if (timer) clearTimeout(timer);
        resolve();
      }
      try { el.addEventListener('seeked', finish); } catch (e) {}
      timer = setTimeout(finish, 2500); // some browsers skip seeked for tiny seeks
      try { el.currentTime = target; } catch (e) { finish(); }
    });
  }

  function playMedia(el) {
    try {
      var p = el.play();
      return p && typeof p.then === 'function' ? p : Promise.resolve();
    } catch (e) { return Promise.reject(e); }
  }

  function abortError() {
    try { return new DOMException('Export aborted', 'AbortError'); }
    catch (e) { var err = new Error('Export aborted'); err.name = 'AbortError'; return err; }
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise(function (resolve, reject) {
      try {
        if (typeof canvas.toBlob !== 'function') { reject(new Error('Canvas export unavailable')); return; }
        canvas.toBlob(function (blob) {
          if (blob) resolve(blob);
          else reject(new Error('Canvas export returned no data'));
        }, type, quality);
      } catch (e) { reject(e); }
    });
  }

  // ---------------------------------------------------------------------------
  // Look definitions (CSS filter strings + text styling; no network fonts)
  // ---------------------------------------------------------------------------
  var looks = {
    classic: {
      label: 'Classic',
      filter: 'contrast(1.06) saturate(1.07)',
      font: 'Impact, "Arial Black", sans-serif',
      captionColor: '#ffffff', captionStroke: '#101014',
      accent: '#ff3b5c', bg: '#0b0b10'
    },
    glass: {
      label: 'Glass',
      filter: 'brightness(1.07) contrast(0.94) saturate(0.82)',
      font: 'Georgia, "Times New Roman", serif',
      captionColor: '#f7fbff', captionStroke: '#25313d',
      accent: '#8fd3ff', bg: '#111820'
    },
    dojo: {
      label: 'Dojo',
      filter: 'contrast(1.22) saturate(0.72) sepia(0.16)',
      font: 'Impact, "Arial Black", sans-serif',
      captionColor: '#fff6e8', captionStroke: '#241a12',
      accent: '#ff8a3d', bg: '#17110c'
    },
    clay: {
      label: 'Clay',
      filter: 'sepia(0.38) saturate(1.28) contrast(1.04) hue-rotate(-8deg)',
      font: 'Georgia, serif',
      captionColor: '#fff4e9', captionStroke: '#3a2318',
      accent: '#e07a5f', bg: '#241610'
    },
    cleangirl: {
      label: 'Clean Girl',
      filter: 'brightness(1.12) contrast(0.93) saturate(0.9)',
      font: 'system-ui, -apple-system, "Segoe UI", sans-serif',
      captionColor: '#ffffff', captionStroke: '#4a4038',
      accent: '#f6c9b6', bg: '#2b2622'
    },
    strawberry: {
      label: 'Strawberry',
      filter: 'saturate(1.38) hue-rotate(-12deg) contrast(1.06)',
      font: '"Arial Black", Impact, sans-serif',
      captionColor: '#fff0f5', captionStroke: '#3d1024',
      accent: '#ff4d8d', bg: '#260b16'
    },
    matcha: {
      label: 'Matcha',
      filter: 'sepia(0.24) hue-rotate(38deg) saturate(1.12) contrast(1.02)',
      font: 'Georgia, serif',
      captionColor: '#f4ffe8', captionStroke: '#1d2c17',
      accent: '#9bd35f', bg: '#131d10'
    },
    golden: {
      label: 'Golden',
      filter: 'sepia(0.3) saturate(1.32) brightness(1.05) hue-rotate(-5deg)',
      font: 'Impact, "Arial Black", sans-serif',
      captionColor: '#fff8dd', captionStroke: '#3b2a08',
      accent: '#ffc94a', bg: '#2a1e08'
    },
    silentpower: {
      label: 'Silent Power',
      filter: 'grayscale(1) contrast(1.26) brightness(0.96)',
      font: 'system-ui, -apple-system, sans-serif',
      captionColor: '#ffffff', captionStroke: '#000000',
      accent: '#ffffff', bg: '#000000'
    },
    everybody: {
      label: 'Everybody',
      filter: 'contrast(1.11) saturate(1.16) brightness(1.02)',
      font: '"Arial Black", Impact, sans-serif',
      captionColor: '#ffffff', captionStroke: '#101014',
      accent: '#5ce1e6', bg: '#0b1114'
    }
  };

  function getLook(name) { return looks[name] || looks.classic; }

  // Edit-model helpers come from app/edit-model.js (also usable from Node smokes).
  var EM = win.LumiEditModel || null;
  function model() {
    if (EM) return EM;
    throw new Error('LumiEditModel is not loaded');
  }

  // ---------------------------------------------------------------------------
  // Feature probes + mime selection
  // ---------------------------------------------------------------------------
  function hasMediaRecorder() { return typeof win.MediaRecorder === 'function'; }
  function hasCanvasCapture() {
    try { return typeof HTMLCanvasElement !== 'undefined' && typeof HTMLCanvasElement.prototype.captureStream === 'function'; }
    catch (e) { return false; }
  }
  function hasVideoCapture() {
    try {
      var p = (typeof HTMLMediaElement !== 'undefined' && HTMLMediaElement.prototype) || {};
      return typeof p.captureStream === 'function' ||
             typeof p.mozCaptureStream === 'function' ||
             typeof p.webkitCaptureStream === 'function';
    } catch (e) { return false; }
  }
  function hasFaceDetector() { return typeof win.FaceDetector === 'function'; }
  function hasAudioSession() {
    try { return !!(navigator.audioSession && 'type' in navigator.audioSession); }
    catch (e) { return false; }
  }
  function hasGetUserMedia() {
    try { return !!(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function'); }
    catch (e) { return false; }
  }

  function probes() {
    var unsupported = [];
    if (!hasMediaRecorder()) unsupported.push('MediaRecorder');
    if (!hasCanvasCapture()) unsupported.push('canvas.captureStream');
    if (!hasVideoCapture()) unsupported.push('video.captureStream');
    if (!hasFaceDetector()) unsupported.push('FaceDetector');
    if (!hasAudioSession()) unsupported.push('audioSession');
    if (!hasGetUserMedia()) unsupported.push('getUserMedia');
    return {
      mediaRecorder: hasMediaRecorder(),
      canvasCapture: hasCanvasCapture(),
      videoCapture: hasVideoCapture(),
      faceDetector: hasFaceDetector(),
      audioSession: hasAudioSession(),
      getUserMedia: hasGetUserMedia(),
      supported: hasMediaRecorder() && hasCanvasCapture(),
      unsupported: unsupported
    };
  }

  var MIME_PREFERENCES = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4',
    'video/webm;codecs=vp8,opus',
    'video/webm'
  ];

  function pickMime() {
    if (!hasMediaRecorder()) return '';
    for (var i = 0; i < MIME_PREFERENCES.length; i++) {
      try {
        if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(MIME_PREFERENCES[i])) return MIME_PREFERENCES[i];
      } catch (e) {}
    }
    return '';
  }

  function makeCombinedStream(videoStream, audioTracks) {
    audioTracks = audioTracks || [];
    var tracks = [];
    try { tracks = (videoStream && videoStream.getTracks ? videoStream.getTracks() : []).slice(); } catch (e) {}
    tracks = tracks.concat(audioTracks);
    try { return new MediaStream(tracks); }
    catch (e) {
      // Older Safari: add audio tracks to the canvas stream in place.
      audioTracks.forEach(function (t) { try { videoStream.addTrack(t); } catch (e2) {} });
      return videoStream;
    }
  }

  // ---------------------------------------------------------------------------
  // Source registry / loading
  // ---------------------------------------------------------------------------
  function detectHasAudio(el) {
    try { if (typeof el.mozHasAudio === 'boolean') return el.mozHasAudio; } catch (e) {}
    try { if (el.audioTracks && typeof el.audioTracks.length === 'number' && el.audioTracks.length > 0) return true; } catch (e) {}
    try {
      var fn = el.captureStream || el.mozCaptureStream || el.webkitCaptureStream;
      if (typeof fn === 'function') {
        var s = fn.call(el);
        var n = 0;
        try { n = s && s.getAudioTracks ? s.getAudioTracks().length : 0; } catch (e2) {}
        if (s && s.getTracks) stopTracks(s.getTracks()); // captured copies only
        return n > 0;
      }
    } catch (e) {}
    return true; // assume audio rather than reporting a false "no audio"
  }

  function makeHiddenVideo() {
    var el = doc.createElement('video');
    el.setAttribute('playsinline', '');
    el.setAttribute('webkit-playsinline', '');
    el.setAttribute('aria-hidden', 'true');
    el.style.cssText = 'position:fixed;left:-10000px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;';
    el.preload = 'auto';
    el.muted = false;
    el.volume = 0; // silent locally; captureStream taps decoded media
    return el;
  }

  function disposeElement(el, url, owned) {
    if (!el) return;
    try { el.pause(); } catch (e) {}
    try { el.removeAttribute('src'); el.load(); } catch (e) {}
    try { if (el.parentNode) el.parentNode.removeChild(el); } catch (e) {}
    if (owned) safeUrlRevoke(url);
  }

  /** Public loader. `internal` entries are owned by the engine and may be revoked. */
  function loadSourceInternal(input, internal) {
    if (isBlobLike(input)) {
      var blobUrl = safeUrlCreate(input);
      return loadSourceInternal(blobUrl, internal).then(function (meta) {
        meta.element && (meta.element.__lumiOwnedBlob = blobUrl);
        return meta;
      });
    }
    if (typeof input !== 'string' || !input) {
      return Promise.reject(new TypeError('loadSource expects a File/Blob or URL string'));
    }
    var url = input;
    var el = makeHiddenVideo();
    var owned = url.indexOf('blob:') === 0;
    var useCors = /^https?:\/\//i.test(url);
    if (useCors) el.crossOrigin = 'anonymous'; // avoid tainted canvas for remote URLs
    el.src = url;
    try { (doc.body || doc.documentElement).appendChild(el); } catch (e) {}

    return once(el, ['loadedmetadata', 'error'], 20000)
      .catch(function (err) {
        // A remote server without CORS headers may fail with crossOrigin set.
        if (useCors && el.hasAttribute('crossorigin')) {
          el.removeAttribute('crossorigin');
          try { el.load(); } catch (e) {}
          return once(el, ['loadedmetadata', 'error'], 20000);
        }
        throw err;
      })
      .then(function () {
        var meta = {
          url: url,
          duration: finite(el.duration),
          width: el.videoWidth || 0,
          height: el.videoHeight || 0,
          hasAudio: detectHasAudio(el),
          element: el
        };
        registry.set(url, {
          url: url, element: el, owned: owned,
          external: !internal, refcount: 0, meta: meta
        });
        return meta;
      })
      .catch(function (err) {
        disposeElement(el, url, owned);
        registry.delete(url);
        throw err;
      });
  }

  function loadSource(input) { return loadSourceInternal(input, false); }

  /** Acquire by URL, reusing an already-loaded element when possible. */
  function acquireSource(input) {
    if (isBlobLike(input)) {
      return loadSourceInternal(input, true).then(function (meta) {
        var entry = registry.get(meta.url);
        if (entry) entry.refcount++;
        return { entry: entry, element: meta.element, duration: meta.duration, owned: true };
      });
    }
    var url = String(input || '');
    var existing = registry.get(url);
    if (existing && existing.element) {
      existing.refcount++;
      return Promise.resolve({
        entry: existing, element: existing.element,
        duration: existing.meta.duration, owned: false
      });
    }
    return loadSourceInternal(url, true).then(function (meta) {
      var entry = registry.get(url);
      if (entry) entry.refcount++;
      return { entry: entry, element: meta.element, duration: meta.duration, owned: true };
    });
  }

  function releaseSource(ref) {
    if (!ref || !ref.entry) return;
    var entry = ref.entry;
    entry.refcount = Math.max(0, (entry.refcount || 1) - 1);
    try { ref.element.pause(); } catch (e) {}
    try { if (ref.element.currentTime > 0) ref.element.currentTime = 0; } catch (e) {}
    // Never dispose a source the app loaded itself.
    if (entry.external) return;
    if (ref.owned || entry.owned) {
      if (entry.refcount <= 0) {
        registry.delete(entry.url);
        disposeElement(entry.element, entry.url, entry.owned);
      }
    }
  }

  /** Optional helper: fully dispose a source previously created by loadSource(). */
  function revoke(url) {
    var entry = registry.get(String(url || ''));
    if (!entry) return false;
    registry.delete(entry.url);
    disposeElement(entry.element, entry.url, entry.owned);
    return true;
  }

  /** Measure a File without keeping it alive. Resolves null on failure. */
  function measureFile(file) {
    return loadSourceInternal(file, true).then(function (meta) {
      var info = {
        width: meta.width,
        height: meta.height,
        duration: meta.duration,
        w: meta.width,
        h: meta.height,
        dur: meta.duration,
        hasAudio: !!meta.hasAudio,
        type: (file && file.type) || '',
        name: (file && file.name) || '',
        size: (file && file.size) || 0
      };
      revoke(meta.url);
      return info;
    }).catch(function () { return null; });
  }

  function fmtTime(seconds) {
    var s = Math.max(0, Math.floor(finite(seconds)));
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    var sec = ('0' + (s % 60)).slice(-2);
    return h > 0 ? h + ':' + ('0' + m).slice(-2) + ':' + sec : m + ':' + sec;
  }

  function extForBlob(blob) {
    var t = ((blob && blob.type) || '').toLowerCase();
    if (t.indexOf('mp4') >= 0) return '.mp4';
    if (t.indexOf('webm') >= 0) return '.webm';
    if (t.indexOf('ogg') >= 0) return '.ogv';
    if (t.indexOf('jpeg') >= 0 || t.indexOf('jpg') >= 0) return '.jpg';
    if (t.indexOf('png') >= 0) return '.png';
    if (t.indexOf('webp') >= 0) return '.webp';
    return '.bin';
  }

  // ---------------------------------------------------------------------------
  // Still image resolution + shared drawing pipeline
  // ---------------------------------------------------------------------------
  function resolveStill(input) {
    if (!input) return Promise.resolve(null);
    if (isBlobLike(input)) {
      var u = safeUrlCreate(input);
      return resolveStill(u).then(function (img) { safeUrlRevoke(u); return img; });
    }
    if (typeof input === 'string') {
      return new Promise(function (resolve, reject) {
        var img = new Image();
        var cross = /^https?:\/\//i.test(input);
        var retried = false;
        if (cross) img.crossOrigin = 'anonymous';
        img.onload = function () { resolve(img); };
        img.onerror = function () {
          if (cross && !retried) {
            retried = true;
            try { img.removeAttribute('crossorigin'); } catch (e) {}
            try { img.src = input; return; } catch (e) {}
          }
          reject(new Error('Image could not be loaded'));
        };
        try { img.src = input; } catch (e) { reject(e); }
      });
    }
    return Promise.resolve(input); // HTMLImageElement / canvas / video / ImageBitmap
  }

  /** Center-crop `src` to fill w x h without stretching. */
  function drawSourceCover(ctx, src, w, h, filter) {
    if (!src) return;
    var sw = src.videoWidth || src.naturalWidth || src.width || 0;
    var sh = src.videoHeight || src.naturalHeight || src.height || 0;
    if (!sw || !sh) return;
    var scale = Math.max(w / sw, h / sh);
    var cw = w / scale, ch = h / scale;
    var sx = (sw - cw) / 2, sy = (sh - ch) / 2;
    try { ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; } catch (e) {}
    var filtered = false;
    try {
      if (filter && 'filter' in ctx) { ctx.filter = filter; filtered = true; }
    } catch (e) {}
    try { ctx.drawImage(src, sx, sy, cw, ch, 0, 0, w, h); } catch (e) {}
    if (filtered) { try { ctx.filter = 'none'; } catch (e) {} }
  }

  /** Greedy word wrap with long-word splitting and ellipsis on overflow. */
  function wrapLines(ctx, text, maxWidth, maxLines) {
    var paragraphs = String(text == null ? '' : text).split(/\r?\n/);
    var rough = [];
    paragraphs.forEach(function (p) {
      var words = p.trim().split(/\s+/).filter(Boolean);
      if (!words.length) { rough.push(''); return; }
      var line = '';
      words.forEach(function (word) {
        var test = line ? line + ' ' + word : word;
        if (!line || ctx.measureText(test).width <= maxWidth) line = test;
        else { rough.push(line); line = word; }
      });
      if (line) rough.push(line);
    });
    var out = [];
    rough.forEach(function (line) {
      if (ctx.measureText(line).width <= maxWidth) { out.push(line); return; }
      var cur = '';
      for (var i = 0; i < line.length; i++) {
        var t = cur + line.charAt(i);
        if (cur && ctx.measureText(t).width > maxWidth) { out.push(cur); cur = line.charAt(i); }
        else cur = t;
      }
      if (cur) out.push(cur);
    });
    if (maxLines && out.length > maxLines) {
      out = out.slice(0, maxLines);
      var last = out[maxLines - 1];
      while (last && ctx.measureText(last + '...').width > maxWidth && last.length > 1) {
        last = last.slice(0, -1);
      }
      out[maxLines - 1] = (last || '') + '...';
    }
    return out.filter(function (l) { return l.length > 0; });
  }

  function drawTextBlock(ctx, text, cfg) {
    ctx.save();
    ctx.font = cfg.weight + ' ' + cfg.fontSize + 'px ' + cfg.font;
    var lines = wrapLines(ctx, text, cfg.maxWidth, cfg.maxLines || 3);
    if (!lines.length) { ctx.restore(); return; }
    var lineH = cfg.fontSize * 1.08;
    var total = lines.length * lineH;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = cfg.fontSize * 0.2;
    ctx.shadowOffsetY = cfg.fontSize * 0.05;
    for (var i = 0; i < lines.length; i++) {
      var y = cfg.top + i * lineH;
      if (cfg.stroke) {
        ctx.lineWidth = Math.max(2, cfg.fontSize * 0.085);
        ctx.strokeStyle = cfg.stroke;
        ctx.strokeText(lines[i], cfg.cx, y);
      }
      ctx.fillStyle = cfg.color;
      ctx.fillText(lines[i], cfg.cx, y);
    }
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    if (cfg.underline && cfg.accent) {
      var bw = Math.min(cfg.maxWidth * 0.42, Math.max(cfg.fontSize, ctx.measureText(lines[0]).width * 0.85));
      ctx.fillStyle = cfg.accent;
      ctx.fillRect(cfg.cx - bw / 2, cfg.top + total + cfg.fontSize * 0.14, bw, Math.max(3, cfg.fontSize * 0.045));
    }
    ctx.restore();
  }

  function inWindow(t, start, duration) {
    var s = num(start, 0);
    var d = num(duration, 0);
    if (d <= 0) d = 3;
    return t >= s && t < s + d;
  }

  function activeCaption(captions, t) {
    if (!Array.isArray(captions) || !captions.length) return null;
    var list = captions.filter(function (c) { return c && typeof c.text === 'string'; })
      .slice().sort(function (a, b) { return num(a.t, 0) - num(b.t, 0); });
    var found = null;
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if (t + 0.001 < num(c.t, 0)) break;
      var dur = num(c.duration, 3);
      if (!(dur > 0)) dur = 3;
      if (t < num(c.t, 0) + dur) found = c;
    }
    return found;
  }

  function activePlanScene(plan, t) {
    var scenes = plan && Array.isArray(plan.scenes) ? plan.scenes : [];
    for (var i = 0; i < scenes.length; i++) {
      var s = scenes[i] || {};
      if (inWindow(t, s.start, s.duration)) return s;
    }
    return null;
  }

  function activeWindow(items, t) {
    if (!Array.isArray(items) || !items.length) return null;
    var list = items.slice().sort(function (a, b) { return num(a.t, 0) - num(b.t, 0); });
    var found = null;
    for (var i = 0; i < list.length; i++) {
      if (t + 0.001 >= num(list[i].t, 0)) found = list[i];
      else break;
    }
    return found && inWindow(t, found.t, found.duration) ? found : null;
  }

  /** Apply interpolated pan/zoom/rotation keyframes to a frame. */
  function applyMotion(ctx, motion, t, w, h, extraZoom) {
    var m = { x: 0, y: 0, zoom: 1, rotate: 0 };
    try { m = model().evaluateMotion(motion, t); } catch (e) { /* no edit model: static frame */ }
    var zoom = clamp(num(m.zoom, 1) * num(extraZoom || 1, 1), 0.5, 4);
    var rot = num(m.rotate, 0) * Math.PI / 180;
    var panX = clamp(num(m.x, 0), -1, 1) * w * 0.12;
    var panY = clamp(num(m.y, 0), -1, 1) * h * 0.12;
    if (zoom === 1 && !rot && !panX && !panY) return;
    // Slight overscan keeps the crop filled when panning or rotating.
    var overscan = zoom * (1 + Math.abs(panX) / Math.max(1, w) + Math.abs(panY) / Math.max(1, h) + Math.abs(rot) * 0.12);
    ctx.translate(w / 2 + panX, h / 2 + panY);
    if (rot) ctx.rotate(rot);
    ctx.scale(overscan, overscan);
    ctx.translate(-w / 2, -h / 2);
  }

  function drawScrims(ctx, w, h) {
    var top = ctx.createLinearGradient(0, 0, 0, h * 0.45);
    top.addColorStop(0, 'rgba(0,0,0,0.52)');
    top.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, w, h * 0.45);
    var bottom = ctx.createLinearGradient(0, h * 0.52, 0, h);
    bottom.addColorStop(0, 'rgba(0,0,0,0)');
    bottom.addColorStop(1, 'rgba(0,0,0,0.7)');
    ctx.fillStyle = bottom;
    ctx.fillRect(0, h * 0.52, w, h * 0.48);
  }

  /** Draw the media layer only. `cfg` controls background/scrims/opacity for transitions. */
  function renderMedia(ctx, source, opts, w, h, t, cfg) {
    opts = opts || {};
    cfg = cfg || {};
    var look = getLook(opts.look);
    ctx.save();
    if (cfg.opacity != null) ctx.globalAlpha = clamp(num(cfg.opacity, 1), 0, 1);
    if (cfg.background !== false) {
      try { ctx.fillStyle = look.bg; ctx.fillRect(0, 0, w, h); } catch (e) {}
    }
    ctx.save();
    var legacyZoom = 1;
    if (!opts.motion) {
      var scene = activePlanScene(opts.plan, opts.timelineTime == null ? t : num(opts.timelineTime, t));
      if (scene && scene.motion && /zoom|punch/i.test(String(scene.motion))) {
        legacyZoom = 1.035 + Math.sin(num(opts.timelineTime, t) * 3.1) * 0.015;
      }
    }
    applyMotion(ctx, opts.motion, t, w, h, legacyZoom * (cfg.extraZoom || 1));
    drawSourceCover(ctx, source, w, h, look.filter);
    ctx.restore();
    if (cfg.scrims !== false) drawScrims(ctx, w, h);
    ctx.restore();
  }

  /** Plan overlays, hook, styled captions and CTA. */
  function renderOverlays(ctx, opts, w, h, t) {
    opts = opts || {};
    var look = getLook(opts.look);
    var overlayT = opts.timelineTime == null ? t : num(opts.timelineTime, t);
    var scene = activePlanScene(opts.plan, overlayT);
    var unit = Math.min(w, h);
    var cx = w / 2;

    if (scene && scene.broll) {
      ctx.save();
      ctx.fillStyle = 'rgba(8,10,16,0.42)';
      ctx.fillRect(w * 0.06, unit * 0.30, w * 0.88, unit * 0.11);
      ctx.strokeStyle = look.accent;
      ctx.lineWidth = Math.max(2, unit * 0.004);
      ctx.strokeRect(w * 0.06, unit * 0.30, w * 0.88, unit * 0.11);
      ctx.restore();
      drawTextBlock(ctx, 'B-ROLL CUE · ' + scene.broll, {
        cx: cx, top: unit * 0.315, maxWidth: w * 0.82,
        font: 'system-ui, -apple-system, "Segoe UI", sans-serif',
        fontSize: unit * 0.032, weight: '700',
        color: look.captionColor, stroke: look.captionStroke, maxLines: 1
      });
    }

    if (opts.hook && opts.hook.text && inWindow(overlayT, opts.hook.t, num(opts.hook.duration, 3))) {
      drawTextBlock(ctx, opts.hook.text, {
        cx: cx, top: unit * 0.07, maxWidth: w * 0.86,
        font: look.font, fontSize: unit * 0.086, weight: '900',
        color: opts.hook.color || look.captionColor, stroke: look.captionStroke,
        underline: true, accent: look.accent, maxLines: 2
      });
    }

    var cap = activeCaption(opts.captions, overlayT);
    if (!cap && (!opts.captions || !opts.captions.length) && scene && scene.caption) {
      cap = { text: scene.caption };
    }
    if (cap && cap.text) {
      var sizeFactor = ({ S: 0.052, M: 0.066, L: 0.082 })[String(cap.size || 'M').toUpperCase()] || 0.066;
      var capTop = String(cap.position || 'bottom') === 'top' ? unit * 0.16
        : String(cap.position) === 'middle' ? h * 0.46 - unit * 0.06
          : h - unit * 0.42;
      drawTextBlock(ctx, cap.text, {
        cx: cx, top: capTop, maxWidth: w * 0.88,
        font: look.font, fontSize: unit * sizeFactor,
        weight: String(cap.weight || 800),
        color: /^#[0-9a-f]{3,8}$/i.test(String(cap.color || '')) ? cap.color : look.captionColor,
        stroke: look.captionStroke, maxLines: 3
      });
    }

    if (opts.cta && opts.cta.text && inWindow(overlayT, opts.cta.t, num(opts.cta.duration, 4))) {
      drawTextBlock(ctx, opts.cta.text, {
        cx: cx, top: h - unit * 0.12, maxWidth: w * 0.84,
        font: 'system-ui, -apple-system, "Segoe UI", sans-serif',
        fontSize: unit * 0.05, weight: '700',
        color: look.accent, stroke: look.captionStroke, maxLines: 2
      });
    }
  }

  /** One frame: media + overlays (used by posters and simple sources). */
  function renderFrame(ctx, source, opts, w, h, t) {
    renderMedia(ctx, source, opts, w, h, t, {});
    renderOverlays(ctx, opts, w, h, opts && opts.timelineTime == null ? t : num(opts.timelineTime, t));
  }

  /** Options for one clip at a clip-local time. */
  function clipOptions(opts, clip, localT, overlayT) {
    var o = Object.assign({}, opts || {});
    o.look = (clip && clip.look) || o.look;
    o.motion = clip && clip.motion ? clip.motion : o.motion;
    o.clip = clip || null;
    o.timelineTime = overlayT == null ? localT : overlayT;
    return o;
  }

  /**
   * Render a frame from a normalised timeline. Shared by preview and export so
   * transitions, motion and caption styling look identical in both.
   */
  function renderTimelineFrame(ctx, clips, index, elapsed, opts, w, h, overlayStart) {
    var c = clips[index];
    if (!c || !c.element) return;
    var local = clamp(elapsed - c.timelineStart, 0, Math.max(0.05, c.duration - 0.001));
    var overlayT = (overlayStart || 0) + elapsed;
    var tr = c.transition || { type: 'none', duration: 0 };
    var useTransition = index > 0 && tr.type && tr.type !== 'none' && tr.duration > 0 && local < tr.duration;
    if (!useTransition) {
      renderMedia(ctx, c.element, clipOptions(opts, c, local, overlayT), w, h, local, {});
    } else {
      var prev = clips[index - 1];
      var p = clamp(local / tr.duration, 0, 1);
      var prevLocal = Math.max(0, finite(prev.duration) - 0.02);
      renderMedia(ctx, prev.element, clipOptions(opts, prev, prevLocal, overlayT), w, h, prevLocal, {});
      var curOpts = clipOptions(opts, c, local, overlayT);
      if (tr.type === 'wipe') {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, w * p, h);
        ctx.clip();
        renderMedia(ctx, c.element, curOpts, w, h, local, { background: false, scrims: false });
        ctx.restore();
      } else if (tr.type === 'slide') {
        ctx.save();
        ctx.beginPath();
        ctx.rect(w * (1 - p), 0, w * p, h);
        ctx.clip();
        ctx.translate(w * (1 - p), 0);
        renderMedia(ctx, c.element, curOpts, w, h, local, { background: false, scrims: false });
        ctx.restore();
      } else {
        var extraZoom = tr.type === 'zoom' ? 1.16 - 0.16 * p : 1;
        renderMedia(ctx, c.element, curOpts, w, h, local, {
          background: false, scrims: false,
          opacity: p, extraZoom: extraZoom
        });
        drawScrims(ctx, w, h);
      }
    }
    renderOverlays(ctx, clipOptions(opts, c, local, overlayT), w, h, overlayT);
  }

  function activeClipIndex(clips, elapsed) {
    for (var i = clips.length - 1; i >= 0; i--) {
      if (elapsed >= clips[i].timelineStart) return i;
    }
    return 0;
  }

  function targetSize(format) {
    return format === 'horizontal' ? { w: 1920, h: 1080 } : { w: 1080, h: 1920 };
  }

  // ---------------------------------------------------------------------------
  // Poster (JPEG) using the exact export drawing pipeline
  // ---------------------------------------------------------------------------
  function makePoster(options) {
    options = options || {};
    var t = Math.max(0, num(options.t, 0));
    var size = targetSize(options.format);
    var canvas = doc.createElement('canvas');
    canvas.width = size.w;
    canvas.height = size.h;
    var ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return Promise.reject(new Error('Canvas is not available'));
    var ref = null;
    function cleanup() { if (ref) releaseSource(ref); }

    return Promise.resolve()
      .then(function () {
        if (options.sourceImage) {
          return resolveStill(options.sourceImage).then(function (img) {
            renderFrame(ctx, img, options, size.w, size.h, t);
          });
        }
        if (!options.sourceUrl) throw new Error('makePoster requires sourceUrl or sourceImage');
        return acquireSource(options.sourceUrl).then(function (r) {
          ref = r;
          return seekTo(r.element, t).then(function () {
            renderFrame(ctx, r.element, options, size.w, size.h, t);
          });
        });
      })
      .then(function () { return canvasToBlob(canvas, 'image/jpeg', 0.9); })
      .then(function (blob) { cleanup(); return blob; },
            function (err) { cleanup(); throw err; });
  }

  // ---------------------------------------------------------------------------
  // Cover art generator (drawCover)
  // ---------------------------------------------------------------------------
  function drawCoverBackground(ctx, img, w, h, mode, unit, accent) {
    if (mode === 'checker') {
      var s = Math.max(24, unit * 0.075);
      for (var y = 0; y < h; y += s) {
        for (var x = 0; x < w; x += s) {
          ctx.fillStyle = ((Math.floor(x / s) + Math.floor(y / s)) % 2) ? '#e8e8ec' : '#fafafa';
          ctx.fillRect(x, y, s, s);
        }
      }
      return;
    }
    ctx.fillStyle = '#0d0d12';
    ctx.fillRect(0, 0, w, h);
    if (mode === 'gradient') {
      var g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#101116');
      g.addColorStop(0.6, '#2a1f2e');
      g.addColorStop(1, accent);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      if (img) {
        ctx.save(); ctx.globalAlpha = 0.22;
        drawSourceCover(ctx, img, w, h, '');
        ctx.restore();
      }
      return;
    }
    if (img) {
      if (mode === 'blur') {
        ctx.save();
        try { ctx.filter = 'blur(' + Math.round(unit * 0.03) + 'px) brightness(0.68)'; } catch (e) {}
        drawSourceCover(ctx, img, w, h, '');
        ctx.restore();
      } else {
        drawSourceCover(ctx, img, w, h, 'contrast(1.02)');
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(0, 0, w, h);
      }
    }
  }

  function drawCover(canvas, options) {
    if (!canvas) return Promise.reject(new Error('drawCover requires a canvas'));
    options = options || {};
    var w = canvas.width || 1080;
    var h = canvas.height || 1920;
    canvas.width = w; canvas.height = h; // normalize if only one dimension was set
    var ctx = canvas.getContext('2d');
    if (!ctx) return Promise.reject(new Error('Canvas is not available'));

    var unit = Math.min(w, h);
    var background = options.background || 'original';
    var style = options.style || 'bold';
    var position = options.position || 'smart';
    var scale = ({ S: 0.055, M: 0.08, L: 0.115 })[String(options.size || 'M').toUpperCase()] || 0.08;
    var fontSize = unit * scale;
    var accent = options.accent || looks.classic.accent;
    var family, weight, color, stroke = null;
    if (style === 'highlight') {
      family = 'system-ui, -apple-system, "Segoe UI", sans-serif'; weight = '800'; color = '#17171b';
    } else if (style === 'two-tone') {
      family = '"Arial Black", Impact, sans-serif'; weight = '900'; color = '#ffffff'; stroke = 'rgba(0,0,0,0.8)';
    } else if (style === 'minimal') {
      family = 'system-ui, -apple-system, sans-serif'; weight = '500';
      color = (background === 'original' || background === 'blur') ? '#ffffff' : '#17171b';
    } else {
      family = 'Impact, "Arial Black", sans-serif'; weight = '900'; color = '#ffffff'; stroke = 'rgba(0,0,0,0.85)';
    }

    return resolveStill(options.sourceImage).then(function (img) {
      drawCoverBackground(ctx, img, w, h, background, unit, accent);
      var title = String(options.title == null ? '' : options.title);
      if (!title) return;
      ctx.save();
      ctx.font = weight + ' ' + fontSize + 'px ' + family;
      var lines = wrapLines(ctx, style === 'bold' || style === 'two-tone' ? title.toUpperCase() : title, w * 0.86, 4);
      if (!lines.length) { ctx.restore(); return; }
      var lineH = fontSize * 1.12;
      var blockH = lines.length * lineH;
      var top;
      if (position === 'top') top = unit * 0.12;
      else if (position === 'lower') top = h - unit * 0.3 - blockH;
      else if (position === 'smart') top = (background === 'original' || background === 'blur')
        ? h - unit * 0.3 - blockH : (h - blockH) / 2;
      else top = (h - blockH) / 2;
      top = clamp(top, unit * 0.04, h - blockH - unit * 0.04);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.lineJoin = 'round';
      ctx.shadowColor = 'rgba(0,0,0,0.38)';
      ctx.shadowBlur = fontSize * 0.16;
      ctx.shadowOffsetY = fontSize * 0.04;
      for (var i = 0; i < lines.length; i++) {
        var y = top + i * lineH;
        var line = lines[i];
        var tw = ctx.measureText(line).width;
        if (style === 'highlight') {
          ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
          ctx.fillStyle = accent;
          var padX = fontSize * 0.22, padY = fontSize * 0.08;
          if (typeof ctx.roundRect === 'function') {
            ctx.beginPath();
            ctx.roundRect(w / 2 - tw / 2 - padX, y - padY, tw + padX * 2, fontSize + padY * 2, fontSize * 0.16);
            ctx.fill();
          } else {
            ctx.fillRect(w / 2 - tw / 2 - padX, y - padY, tw + padX * 2, fontSize + padY * 2);
          }
          ctx.fillStyle = color;
        } else if (style === 'two-tone') {
          ctx.fillStyle = i % 2 === 0 ? '#ffffff' : accent;
        } else {
          ctx.fillStyle = color;
        }
        if (stroke) {
          ctx.lineWidth = Math.max(2, fontSize * 0.075);
          ctx.strokeStyle = stroke;
          ctx.strokeText(line, w / 2, y);
        }
        ctx.fillText(line, w / 2, y);
      }
      ctx.restore();
    });
  }

  // ---------------------------------------------------------------------------
  // Real-time canvas + MediaRecorder export
  // ---------------------------------------------------------------------------
  function exportVideo(options) {
    options = options || {};
    var signal = options.signal;
    if (signal && signal.aborted) return Promise.reject(abortError());
    var hasClips = Array.isArray(options.clips) && options.clips.length > 0;
    if (!options.sourceUrl && !hasClips) {
      return Promise.reject(new Error('exportVideo requires sourceUrl or clips'));
    }
    var caps = probes();
    if (!caps.mediaRecorder || !caps.canvasCapture) {
      return Promise.reject(new Error(
        'Local export is not supported in this browser. Use a recent Chrome, Edge, Safari, or Firefox with MediaRecorder and canvas.captureStream().'
      ));
    }

    var onProgress = typeof options.onProgress === 'function' ? options.onProgress : noop;
    var size = targetSize(options.format);
    var refs = [];
    var clips = [];
    var activeIndex = 0;
    var canvasStream = null, recorder = null;
    var raf = 0, watchdog = 0;
    var audioCtx = null, sourceDest = null, sfxDest = null;
    var sourceNode = null, clipCapture = null, fallbackCapture = null, clipGain = null;
    var audioTracks = [];
    var rafFn = win.requestAnimationFrame || function (cb) { return setTimeout(function () { cb(Date.now()); }, 33); };
    var cancelRaf = win.cancelAnimationFrame || function (id) { clearTimeout(id); };

    function report(v) { try { onProgress(clamp(num(v, 0), 0, 100)); } catch (e) {} }

    function buildTimeline() {
      var legacyStart = clamp(num(options.start, 0), 0, 3600);
      var legacyEnd = Math.max(legacyStart + 0.05, num(options.end, legacyStart + 5));
      var defs = hasClips
        ? options.clips.slice(0, 24)
        : [{ url: options.sourceUrl, inPoint: legacyStart, duration: legacyEnd - legacyStart }];
      var normalized = model().normalizeTimeline(defs, {
        defaultDuration: Math.max(0.05, legacyEnd - legacyStart),
        look: options.look,
        format: options.format,
        musicMode: options.musicMode
      });
      if (!normalized.clips.length) return Promise.reject(new Error('No playable clips in the timeline'));

      return Promise.all(normalized.clips.map(function (c) { return acquireSource(c.url); }))
        .then(function (loaded) {
          var start = hasClips ? 0 : legacyStart;
          var overlayStart = hasClips ? 0 : start;
          loaded.forEach(function (r, i) {
            var c = normalized.clips[i];
            if (!r) return;
            var srcDur = finite(r.duration || r.element.duration);
            if (!srcDur) { releaseSource(r); return; }
            var inPoint = clamp(c.inPoint, 0, Math.max(0, srcDur - 0.05));
            var len = clamp(c.duration, 0.05, Math.max(0.05, srcDur - inPoint));
            if (!hasClips) len = Math.min(len, Math.max(0.05, legacyEnd - start));
            c.inPoint = inPoint;
            c.duration = len;
            c.sourceDuration = srcDur;
            c.motion = model().normalizeMotion(c.motion, len);
            c.element = r.element;
            c.ref = r;
            refs.push(r);
            clips.push(c);
          });
          if (!clips.length) throw new Error('No playable clips in the timeline');
          if (!hasClips) {
            model().reflow(clips);
            clips.forEach(function (c) { c.timelineStart += start; });
          }
          var total = 0;
          clips.forEach(function (c) { total = Math.max(total, c.timelineStart + c.duration); });
          return { total: Math.max(0.05, total), start: start, overlayStart: overlayStart };
        });
    }

    function setupAudio() {
      try {
        var AudioCtor = win.AudioContext || win.webkitAudioContext;
        if (AudioCtor) {
          audioCtx = new AudioCtor();
          if (typeof audioCtx.createMediaStreamDestination === 'function') {
            sourceDest = audioCtx.createMediaStreamDestination();
            sfxDest = audioCtx.createMediaStreamDestination();
            if (options.musicMode !== 'none') {
              audioTracks = audioTracks.concat(sourceDest.stream.getAudioTracks());
            }
            audioTracks = audioTracks.concat(sfxDest.stream.getAudioTracks());
          } else {
            audioCtx = null;
          }
        }
      } catch (e) { audioCtx = null; sourceDest = null; sfxDest = null; }

      // Fallback for browsers without a usable Web Audio destination.
      if (!audioCtx && options.musicMode !== 'none' && clips[0]) {
        try {
          var fn = clips[0].element.captureStream || clips[0].element.mozCaptureStream || clips[0].element.webkitCaptureStream;
          if (typeof fn === 'function') {
            fallbackCapture = fn.call(clips[0].element);
            if (fallbackCapture && fallbackCapture.getAudioTracks) {
              audioTracks = audioTracks.concat(fallbackCapture.getAudioTracks());
            }
          }
        } catch (e) { fallbackCapture = null; }
      }
    }

    function connectClipAudio(element, clip) {
      if (!audioCtx || !sourceDest || options.musicMode === 'none') return;
      disconnectClipAudio();
      try {
        var fn = element.captureStream || element.mozCaptureStream || element.webkitCaptureStream;
        if (typeof fn !== 'function') return;
        clipCapture = fn.call(element);
        if (!clipCapture || !clipCapture.getAudioTracks || !clipCapture.getAudioTracks().length) return;
        sourceNode = audioCtx.createMediaStreamSource(clipCapture);
        clipGain = audioCtx.createGain();
        var a = (clip && clip.audio) || {};
        var vol = a.muted ? 0 : clamp(num(a.volume, 1), 0, 2);
        var len = Math.max(0.05, finite(clip && clip.duration) || 1);
        var fadeIn = clamp(num(a.fadeIn, 0), 0, len / 2);
        var fadeOut = clamp(num(a.fadeOut, 0), 0, len / 2);
        var now = audioCtx.currentTime;
        var startVol = fadeIn > 0 ? 0.0001 : vol;
        var endVol = fadeOut > 0 ? 0.0001 : vol;
        if (!vol) { startVol = 0; endVol = 0; }
        clipGain.gain.setValueAtTime(startVol, now);
        if (fadeIn > 0) clipGain.gain.linearRampToValueAtTime(vol, now + fadeIn);
        clipGain.gain.setValueAtTime(vol, now + Math.max(fadeIn, len - fadeOut));
        if (fadeOut > 0) clipGain.gain.linearRampToValueAtTime(endVol, now + len);
        sourceNode.connect(clipGain);
        clipGain.connect(sourceDest);
      } catch (e) {
        clipCapture = null; sourceNode = null; clipGain = null;
      }
    }

    function disconnectClipAudio() {
      try { if (sourceNode) sourceNode.disconnect(); } catch (e) {}
      try { if (clipGain) clipGain.disconnect(); } catch (e) {}
      try { if (clipCapture && clipCapture.getTracks) stopTracks(clipCapture.getTracks()); } catch (e) {}
      sourceNode = null;
      clipCapture = null;
      clipGain = null;
    }

    function blip(at, label) {
      if (!audioCtx || !sfxDest) return;
      try {
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        osc.type = /deep|low|bass/i.test(String(label)) ? 'sine' : 'triangle';
        osc.frequency.value = /deep|low|bass/i.test(String(label)) ? 180 : 520;
        gain.gain.setValueAtTime(0.0001, at);
        gain.gain.exponentialRampToValueAtTime(0.07, at + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.13);
        osc.connect(gain);
        gain.connect(sfxDest);
        osc.start(at);
        osc.stop(at + 0.15);
      } catch (e) { /* SFX are optional; never fail an export for them */ }
    }

    function scheduleSfx(start, total) {
      if (!audioCtx || !sfxDest) return;
      var scenes = (options.plan && options.plan.scenes) || [];
      var cues = [];
      scenes.forEach(function (s) {
        if (!s || !s.sfx) return;
        var cueT = num(s.start, 0) - start;
        if (cueT >= 0 && cueT < total) cues.push({ t: cueT, label: s.sfx });
      });
      if (!cues.length) return;
      try {
        audioCtx.resume().then(function () {
          var base = audioCtx.currentTime + 0.08;
          cues.forEach(function (c) { blip(base + c.t, c.label); });
        }).catch(noop);
      } catch (e) { /* optional */ }
    }

    function cleanupExport() {
      if (raf) { try { cancelRaf(raf); } catch (e) {} raf = 0; }
      if (watchdog) { clearTimeout(watchdog); watchdog = 0; }
      disconnectClipAudio();
      try { if (fallbackCapture && fallbackCapture.getTracks) stopTracks(fallbackCapture.getTracks()); } catch (e) {}
      try { if (canvasStream && canvasStream.getTracks) stopTracks(canvasStream.getTracks()); } catch (e) {}
      clips.forEach(function (c) {
        try { c.element.pause(); } catch (e) {}
        try { if (c.element.currentTime > 0) c.element.currentTime = 0; } catch (e) {}
      });
      refs.forEach(function (r) { releaseSource(r); });
      refs = [];
      clips = [];
      try { if (audioCtx) audioCtx.close(); } catch (e) {}
      audioCtx = null; sourceDest = null; sfxDest = null;
    }

    return buildTimeline().then(function (timeline) {
      var total = Math.max(0.05, timeline.total);
      var start = timeline.start;
      var overlayStart = timeline.overlayStart;
      var first = clips[0];

      var canvas = doc.createElement('canvas');
      canvas.width = size.w;
      canvas.height = size.h;
      var ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) throw new Error('Canvas is not available');
      var mime = pickMime();

      return seekTo(first.element, first.inPoint).then(function () {
        return new Promise(function (resolve, reject) {
          var settled = false;
          var chunks = [];
          var startedAt = 0;

          function clearTimers() {
            if (raf) { try { cancelRaf(raf); } catch (e) {} raf = 0; }
            if (watchdog) { clearTimeout(watchdog); watchdog = 0; }
          }
          function cleanupEvents() {
            clearTimers();
            if (signal) { try { signal.removeEventListener('abort', onAbort); } catch (e) {} }
          }
          function fail(err) {
            if (settled) return;
            settled = true; cleanupEvents();
            reject(signal && signal.aborted ? abortError() : (err || new Error('Export failed')));
          }
          function succeed() {
            if (settled) return;
            settled = true; cleanupEvents();
            resolve(new Blob(chunks, { type: (recorder && recorder.mimeType) || mime || 'video/webm' }));
          }
          function stopNow() {
            clips.forEach(function (c) { try { c.element.pause(); } catch (e) {} });
            if (recorder && recorder.state !== 'inactive') {
              try { recorder.stop(); } catch (e) { succeed(); }
            } else succeed();
          }
          function onAbort() {
            if (signal && signal.aborted) { fail(abortError()); stopNow(); }
          }

          try { canvasStream = canvas.captureStream(30); }
          catch (e) { fail(new Error('Canvas capture failed; the source may be cross-origin')); return; }
          if (!canvasStream || !canvasStream.getVideoTracks || !canvasStream.getVideoTracks().length) {
            fail(new Error('Canvas capture returned no video tracks'));
            return;
          }

          setupAudio();
          var combined;
          try { combined = makeCombinedStream(canvasStream, audioTracks); }
          catch (e) { fail(e); return; }

          try {
            var recOpts = { videoBitsPerSecond: 6000000 };
            if (mime) recOpts.mimeType = mime;
            recorder = new MediaRecorder(combined, recOpts);
          } catch (e) {
            try { recorder = new MediaRecorder(combined); }
            catch (e2) { fail(e2); return; }
          }

          recorder.ondataavailable = function (ev) {
            if (ev && ev.data && ev.data.size) chunks.push(ev.data);
          };
          recorder.onerror = function (ev) { fail((ev && ev.error) || new Error('Recording failed')); };
          recorder.onstop = function () { succeed(); };

          if (signal) {
            try { signal.addEventListener('abort', onAbort); } catch (e) {}
            if (signal.aborted) { onAbort(); return; }
          }

          function switchClip(next) {
            var prev = clips[activeIndex];
            try { prev.element.pause(); } catch (e) {}
            try { prev.element.currentTime = prev.inPoint + Math.max(0, prev.duration - 0.02); } catch (e) {}
            activeIndex = next;
            var c = clips[next];
            seekTo(c.element, c.inPoint).then(function () {
              if (settled) return;
              connectClipAudio(c.element, c);
              return playMedia(c.element);
            }).catch(fail);
          }

          function tick() {
            if (settled) return;
            var elapsed = (Date.now() - startedAt) / 1000;
            if (signal && signal.aborted) { onAbort(); return; }
            if (elapsed >= total) { stopNow(); return; }

            var next = activeClipIndex(clips, elapsed);
            if (next !== activeIndex) switchClip(next);

            var c = clips[activeIndex];
            var localTarget = c.inPoint + (elapsed - c.timelineStart);
            var local = finite(c.element.currentTime);
            if (Math.abs(local - localTarget) > 0.5 && localTarget < c.inPoint + c.duration) {
              try { c.element.currentTime = localTarget; } catch (e) {}
            }
            try { renderTimelineFrame(ctx, clips, activeIndex, elapsed, options, size.w, size.h, overlayStart); }
            catch (e) { fail(e); return; }
            report(elapsed / total * 100);
            raf = rafFn(tick);
          }

          // Paint one frame and verify the canvas is readable before recording.
          try { renderTimelineFrame(ctx, clips, 0, 0, options, size.w, size.h, overlayStart); }
          catch (e) { fail(e); return; }
          try { ctx.getImageData(0, 0, 1, 1); }
          catch (e) {
            fail(new Error('Cross-origin media tainted the canvas. Local export is blocked. Use blob URLs or CORS-enabled media.'));
            return;
          }

          connectClipAudio(first.element, first);
          scheduleSfx(overlayStart, total);
          playMedia(first.element).then(function () {
            if (settled) return;
            recorder.start(100); // timeslice keeps memory bounded on phones
            startedAt = Date.now();
            report(0);
            tick();
            watchdog = setTimeout(stopNow, Math.max(2000, total * 1000 + 8000));
          }).catch(fail);
        });
      });
    }).then(function (blob) {
      report(100);
      return blob;
    }).then(function (blob) { cleanupExport(); return blob; },
             function (err) { cleanupExport(); throw err; });
  }

  // ---------------------------------------------------------------------------
  // Local take storage (IndexedDB). Storage is best-effort, never blocking UI.
  // ---------------------------------------------------------------------------
  var DB_NAME = 'lumi_clone_takes';
  var STORE = 'takes';

  function openTakesDB() {
    return new Promise(function (resolve, reject) {
      if (!win.indexedDB) { reject(new Error('IndexedDB unavailable')); return; }
      var req;
      try { req = indexedDB.open(DB_NAME, 1); }
      catch (e) { reject(e); return; }
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error('IndexedDB error')); };
    });
  }

  function blobToBuffer(blob) {
    if (blob.arrayBuffer) return blob.arrayBuffer();
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = function () { reject(r.error || new Error('Could not read take')); };
      r.readAsArrayBuffer(blob);
    });
  }

  function storeTake(blob, verdict, orient) {
    var id = 'take_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    var base = { id: id, created: Date.now(), orient: orient, mime: blob.type || '', verdict: verdict };
    return openTakesDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        function write(rec, fallback) {
          var tx;
          try {
            tx = db.transaction(STORE, 'readwrite');
            tx.objectStore(STORE).put(rec);
          } catch (e) {
            if (fallback) { fallback().then(function (r) { write(r, null); }, reject); }
            else reject(e);
            return;
          }
          tx.oncomplete = function () { resolve(id); };
          tx.onerror = function () {
            if (fallback) fallback().then(function (r) { write(r, null); }, reject);
            else reject(tx.error || new Error('Take could not be stored'));
          };
        }
        var withBlob = Object.assign({}, base, { blob: blob });
        // Some browsers cannot structured-clone a MediaRecorder Blob: store bytes instead.
        write(withBlob, function () {
          return blobToBuffer(blob).then(function (buf) { return Object.assign({}, base, { buf: buf }); });
        });
      }).then(function (v) { try { db.close(); } catch (e) {} return v; },
              function (e) { try { db.close(); } catch (e) {} throw e; });
    }).catch(function () { return id; }); // storage is optional, never fatal
  }

  function listTakes() {
    return openTakesDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, 'readonly');
        var req = tx.objectStore(STORE).getAll();
        req.onsuccess = function () { resolve(req.result || []); };
        req.onerror = function () { reject(req.error || new Error('Could not list takes')); };
      }).then(function (v) { try { db.close(); } catch (e) {} return v; },
              function (e) { try { db.close(); } catch (e) {} throw e; });
    });
  }

  function deleteTake(id) {
    return openTakesDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).delete(String(id));
        tx.oncomplete = function () { resolve(true); };
        tx.onerror = function () { reject(tx.error || new Error('Could not delete take')); };
      }).then(function (v) { try { db.close(); } catch (e) {} return v; },
              function (e) { try { db.close(); } catch (e) {} throw e; });
    });
  }

  // ---------------------------------------------------------------------------
  // Camera overlay: self-contained DOM + styles, multi-take session
  // ---------------------------------------------------------------------------
  var LEC_CSS = `
.lec-root{position:fixed;inset:0;z-index:2147483000;background:#08080c;color:#fff;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;display:flex;flex-direction:column;}
.lec-hidden{display:none!important;}
.lec-top{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 14px;min-height:56px;background:rgba(0,0,0,.55);}
.lec-title{font-size:16px;font-weight:700;letter-spacing:.02em;}
.lec-icon,.lec-textbtn{border:0;background:rgba(255,255,255,.13);color:#fff;border-radius:999px;padding:8px 14px;font-size:15px;min-width:44px;min-height:40px;cursor:pointer;}
.lec-stage{position:relative;flex:1;min-height:0;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#000;}
.lec-preview,.lec-replay{width:100%;height:100%;object-fit:cover;display:block;}
.lec-preview{transform:scaleX(-1);}
.lec-oval{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);border:2px solid rgba(255,255,255,.85);border-radius:50%;box-shadow:0 0 0 9999px rgba(0,0,0,.28),0 0 20px rgba(0,0,0,.35);pointer-events:none;}
.lec-oval-tall{width:64%;height:76%;}
.lec-oval-wide{width:36%;height:82%;}
.lec-countdown{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:96px;font-weight:900;text-shadow:0 4px 24px #000;pointer-events:none;}
.lec-timer{position:absolute;top:12px;right:14px;background:rgba(0,0,0,.5);padding:4px 10px;border-radius:999px;font-size:14px;font-variant-numeric:tabular-nums;}
.lec-status{position:absolute;left:14px;bottom:12px;background:rgba(0,0,0,.55);padding:6px 10px;border-radius:10px;font-size:13px;max-width:72%;}
.lec-verdict{position:absolute;left:0;right:0;top:52px;text-align:center;font-size:13px;line-height:1.35;padding:0 16px;text-shadow:0 2px 8px #000;}
.lec-replaybox{height:0;background:#000;}
.lec-replaybox:not(.lec-hidden){height:36vh;min-height:220px;}
.lec-takes{display:flex;gap:8px;overflow-x:auto;padding:8px 14px;min-height:44px;}
.lec-pill{flex:0 0 auto;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.08);color:#fff;border-radius:999px;padding:7px 13px;font-size:13px;cursor:pointer;}
.lec-pill.lec-active{border-color:#ff3b5c;background:rgba(255,59,92,.28);}
.lec-pill.lec-used{opacity:.55;}
.lec-actions{display:flex;gap:10px;justify-content:center;padding:10px 14px 14px;background:rgba(0,0,0,.45);}
.lec-btn{flex:1;max-width:260px;min-height:52px;border:0;border-radius:14px;background:#ff3b5c;color:#fff;font-size:16px;font-weight:700;cursor:pointer;}
.lec-btn.lec-stop{background:#fff;color:#111;}
.lec-btn.lec-secondary{background:rgba(255,255,255,.14);}
.lec-footnote{text-align:center;font-size:11px;opacity:.6;padding:0 10px 10px;}
@media (min-width:720px){.lec-root{max-width:520px;margin:0 auto;box-shadow:0 0 40px #000;}}
`;

  function ensureCameraStyles() {
    if (doc.getElementById('lec-styles')) return;
    try {
      var style = doc.createElement('style');
      style.id = 'lec-styles';
      style.textContent = LEC_CSS;
      (doc.head || doc.body).appendChild(style);
    } catch (e) {}
  }

  function setAudioSessionType(type) {
    try { if (hasAudioSession()) navigator.audioSession.type = type; } catch (e) {}
  }

  function openCamera(options) {
    options = options || {};
    var orient = options.orient === 'wide' ? 'wide' : 'tall';
    var onUse = typeof options.onUse === 'function' ? options.onUse : noop;
    var onClose = typeof options.onClose === 'function' ? options.onClose : noop;
    var rafFn = win.requestAnimationFrame || function (cb) { return setTimeout(function () { cb(Date.now()); }, 33); };
    var cancelRaf = win.cancelAnimationFrame || function (id) { clearTimeout(id); };

    ensureCameraStyles();

    var state = {
      closed: false, stream: null, audioCtx: null, analyser: null, audioBuf: null,
      recorder: null, recMime: '', chunks: [], recording: false, recStart: 0,
      timer: null, sampleInterval: null, countdown: null, drawRaf: 0,
      outputCanvas: null, outputCtx: null, outputStream: null,
      faceDetector: null, sampleCanvas: null, sampleLast: null,
      light: 0.5, motion: 0, sound: 0,
      takes: [], current: null, replayUrls: [], autoUseAfterStop: false
    };

    var root = doc.createElement('div');
    root.className = 'lec-root';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.innerHTML =
      '<div class="lec-top">' +
        '<button type="button" class="lec-icon lec-close" aria-label="Close camera">&#10005;</button>' +
        '<div class="lec-title">Lumi Camera</div>' +
        '<button type="button" class="lec-textbtn lec-done">Done</button>' +
      '</div>' +
      '<div class="lec-stage">' +
        '<video class="lec-preview" playsinline webkit-playsinline muted autoplay></video>' +
        '<div class="lec-oval ' + (orient === 'wide' ? 'lec-oval-wide' : 'lec-oval-tall') + '"></div>' +
        '<div class="lec-countdown"></div>' +
        '<div class="lec-timer">0:00</div>' +
        '<div class="lec-verdict"></div>' +
        '<div class="lec-status">Starting camera...</div>' +
      '</div>' +
      '<div class="lec-replaybox lec-hidden"><video class="lec-replay" playsinline webkit-playsinline controls></video></div>' +
      '<div class="lec-takes"></div>' +
      '<div class="lec-actions">' +
        '<button type="button" class="lec-btn lec-rec">&#9679; Record</button>' +
        '<button type="button" class="lec-btn lec-secondary lec-retake lec-hidden">Retake</button>' +
        '<button type="button" class="lec-btn lec-use lec-hidden">Use this take</button>' +
      '</div>' +
      '<div class="lec-footnote">Takes stay on this device.</div>';
    try { doc.body.appendChild(root); } catch (e) {}

    function q(sel) { return root.querySelector(sel); }
    var preview = q('.lec-preview');
    var replay = q('.lec-replay');
    var replayBox = q('.lec-replaybox');
    var countdown = q('.lec-countdown');
    var timerEl = q('.lec-timer');
    var statusEl = q('.lec-status');
    var verdictEl = q('.lec-verdict');
    var takesEl = q('.lec-takes');
    var recBtn = q('.lec-rec');
    var retakeBtn = q('.lec-retake');
    var useBtn = q('.lec-use');

    function setStatus(msg) { try { statusEl.textContent = msg; } catch (e) {} }
    function updateTimer() {
      var elapsed = ((win.performance && performance.now) ? performance.now() : Date.now()) - state.recStart;
      timerEl.textContent = fmtTime(Math.max(0, elapsed / 1000));
    }

    function updateButtons() {
      if (state.closed) return;
      if (state.recording) {
        recBtn.textContent = '\u25A0 Stop';
        recBtn.classList.add('lec-stop');
        hide(replayBox); show(preview); hide(retakeBtn); hide(useBtn);
      } else {
        recBtn.textContent = '\u25CF Record';
        recBtn.classList.remove('lec-stop');
        if (state.current) { show(replayBox); hide(preview); show(retakeBtn); show(useBtn); }
        else { hide(replayBox); show(preview); hide(retakeBtn); hide(useBtn); }
      }
    }

    function setupFaceDetector() {
      if (!hasFaceDetector()) return;
      try { state.faceDetector = new FaceDetector({ fast: true, maxDetectedFaces: 3 }); }
      catch (e) { state.faceDetector = null; }
    }

    // AudioContext is used ONLY while camera mode is open (for a sound-level hint).
    function setupAudioAnalysis(stream) {
      try {
        var AC = win.AudioContext || win.webkitAudioContext;
        if (!AC) return;
        var ac = new AC();
        state.audioCtx = ac;
        var srcNode = ac.createMediaStreamSource(stream);
        var an = ac.createAnalyser();
        an.fftSize = 1024;
        srcNode.connect(an); // deliberately NOT connected to destination (no feedback)
        state.analyser = an;
        state.audioBuf = new Uint8Array(an.fftSize);
        if (ac.state === 'suspended') ac.resume().catch(noop);
      } catch (e) { state.audioCtx = null; state.analyser = null; }
    }

    function sample() {
      try {
        var c = state.sampleCanvas;
        if (!c) { c = doc.createElement('canvas'); c.width = 32; c.height = 18; state.sampleCanvas = c; }
        var cx = c.getContext('2d');
        if (!cx) return;
        cx.drawImage(preview, 0, 0, 32, 18);
        var d = cx.getImageData(0, 0, 32, 18).data;
        var n = d.length / 4, lum = 0, i;
        for (i = 0; i < d.length; i += 4) lum += (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
        state.light = lum / n;
        if (state.sampleLast) {
          var diff = 0;
          for (i = 0; i < d.length; i += 4) diff += Math.abs(d[i] - state.sampleLast[i]) / 255;
          state.motion = diff / n;
        }
        state.sampleLast = new Uint8ClampedArray(d);
        if (state.analyser && state.audioBuf) {
          state.analyser.getByteTimeDomainData(state.audioBuf);
          var sum = 0;
          for (i = 0; i < state.audioBuf.length; i++) {
            var v = (state.audioBuf[i] - 128) / 128;
            sum += v * v;
          }
          state.sound = Math.sqrt(sum / state.audioBuf.length);
        }
      } catch (e) {}
    }

    function drawOutput() {
      if (!state.recording || state.closed) return;
      try {
        var c = state.outputCanvas, cx = state.outputCtx;
        if (c && cx) {
          cx.setTransform(1, 0, 0, 1, 0, 0);
          cx.translate(c.width, 0);
          cx.scale(-1, 1); // mirror to match the selfie preview
          renderFrame(cx, preview, { look: options.look || 'classic' }, c.width, c.height, finite(preview.currentTime));
          cx.setTransform(1, 0, 0, 1, 0, 0);
        }
      } catch (e) {}
      state.drawRaf = rafFn(drawOutput);
    }

    function computeVerdict() {
      var v = {
        faceFound: false, centered: false, distance: false, headroom: false,
        light: state.light > 0.32 && state.light < 0.82,
        steady: state.motion < 0.09,
        sound: state.sound > 0.008,
        text: ''
      };
      var detectorAvailable = !!state.faceDetector;
      return Promise.resolve()
        .then(function () {
          if (!detectorAvailable) return [];
          try { return state.faceDetector.detect(preview) || []; }
          catch (e) { detectorAvailable = false; return []; }
        })
        .catch(function () { detectorAvailable = false; return []; })
        .then(function (faces) {
          if (faces && faces.length) {
            var box = faces[0].boundingBox || {};
            var fw = num(box.width, 0), fh = num(box.height, 0);
            var fx = num(box.x, 0), fy = num(box.y, 0);
            var pw = preview.videoWidth || 1, ph = preview.videoHeight || 1;
            var cxRatio = (fx + fw / 2) / pw;
            var topRatio = fy / ph;
            var widthRatio = fw / pw;
            v.faceFound = fw > 0 && fh > 0;
            v.centered = Math.abs(cxRatio - 0.5) < 0.18;
            v.distance = widthRatio > 0.2 && widthRatio < 0.62;
            v.headroom = topRatio > 0.05 && topRatio < 0.42;
            v.text = [
              'Face found',
              v.centered ? 'Centered' : 'Off center',
              v.distance ? 'Good distance' : 'Adjust distance',
              v.headroom ? 'Headroom ok' : 'Check headroom',
              v.light ? 'Light good' : 'Check light',
              v.steady ? 'Steady' : 'Unsteady',
              v.sound ? 'Sound ok' : 'Low sound'
            ].join(' | ');
          } else {
            v.text = detectorAvailable
              ? 'No face detected - review your take'
              : 'Framing check unavailable, review your take';
          }
          return v;
        });
    }

    function startCamera() {
      if (!hasGetUserMedia()) { setStatus('Camera is not supported in this browser.'); return Promise.resolve(); }
      return navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1080 }, height: { ideal: 1920 } },
        audio: true
      }).then(function (stream) {
        if (state.closed) { stopTracks(stream.getTracks ? stream.getTracks() : []); return; }
        state.stream = stream;
        preview.srcObject = stream;
        return playMedia(preview).then(function () {
          setupAudioAnalysis(stream);
          setupFaceDetector();
          setStatus('Ready - frame yourself in the oval');
          updateButtons();
        });
      }).catch(function (err) {
        if (state.closed) return;
        setStatus('Camera unavailable: ' + ((err && err.message) || 'permission denied'));
      });
    }

    function startRecording() {
      if (state.closed || state.recording || !state.stream) return;
      state.chunks = [];
      state.autoUseAfterStop = false;
      state.light = 0.5; state.motion = 0; state.sound = 0; state.sampleLast = null;
      setAudioSessionType('play-and-record');

      var dims = orient === 'wide' ? { w: 1920, h: 1080 } : { w: 1080, h: 1920 };
      var toRecord = null;
      if (hasCanvasCapture()) {
        try {
          var c = doc.createElement('canvas');
          c.width = dims.w; c.height = dims.h;
          state.outputCanvas = c;
          state.outputCtx = c.getContext('2d', { alpha: false });
          state.outputStream = c.captureStream(30);
          var aud = [];
          try { aud = state.stream.getAudioTracks ? state.stream.getAudioTracks() : []; } catch (e) {}
          toRecord = makeCombinedStream(state.outputStream, aud);
        } catch (e) {
          toRecord = null;
          if (state.outputStream && state.outputStream.getTracks) stopTracks(state.outputStream.getTracks());
        }
      }
      if (!toRecord) toRecord = state.stream; // fallback: record the raw camera stream

      var mime = pickMime();
      try {
        var ro = { videoBitsPerSecond: 6000000 };
        if (mime) ro.mimeType = mime;
        state.recorder = new MediaRecorder(toRecord, ro);
      } catch (e) {
        try { state.recorder = new MediaRecorder(toRecord); }
        catch (e2) {
          setStatus('Recording is not supported here.');
          setAudioSessionType('ambient');
          return;
        }
      }
      state.recMime = state.recorder.mimeType || mime || 'video/webm';
      state.recorder.ondataavailable = function (ev) {
        if (ev && ev.data && ev.data.size) state.chunks.push(ev.data);
      };
      state.recording = true;
      state.recStart = (win.performance && performance.now) ? performance.now() : Date.now();
      try { state.recorder.start(200); }
      catch (e) {
        state.recording = false;
        setStatus('Could not start recording.');
        setAudioSessionType('ambient');
        return;
      }
      state.timer = setInterval(updateTimer, 200);
      state.sampleInterval = setInterval(sample, 250);
      updateTimer();
      drawOutput();
      updateButtons();
      setStatus('Recording...');
    }

    function finishTake() {
      var blob = new Blob(state.chunks, { type: state.recMime });
      if (!blob.size) return Promise.resolve(null);
      return computeVerdict().then(function (verdict) {
        var take = {
          id: 'take_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
          blob: blob,
          url: safeUrlCreate(blob),
          verdict: verdict,
          created: Date.now(),
          orient: orient
        };
        state.takes.push(take);
        state.replayUrls.push(take.url);
        state.current = take;
        var pill = doc.createElement('button');
        pill.type = 'button';
        pill.className = 'lec-pill';
        pill.textContent = 'Take ' + state.takes.length;
        pill.addEventListener('click', function () { selectTake(take); });
        take.pill = pill;
        takesEl.appendChild(pill);
        takesEl.scrollLeft = takesEl.scrollWidth;
        selectTake(take);
        storeTake(blob, verdict, orient).catch(noop);
        if (state.autoUseAfterStop) { state.autoUseAfterStop = false; useCurrent(); }
        return take;
      });
    }

    function stopRecording() {
      if (!state.recording) return Promise.resolve(null);
      state.recording = false;
      clearInterval(state.timer); state.timer = null;
      clearInterval(state.sampleInterval); state.sampleInterval = null;
      if (state.drawRaf) { try { cancelRaf(state.drawRaf); } catch (e) {} state.drawRaf = 0; }
      if (state.outputStream && state.outputStream.getTracks) stopTracks(state.outputStream.getTracks());
      state.outputStream = null;
      setAudioSessionType('ambient');
      return new Promise(function (resolve) {
        var rec = state.recorder, done = false;
        function complete() {
          if (done) return;
          done = true;
          finishTake().then(resolve, function () { resolve(null); });
        }
        if (!rec || rec.state === 'inactive') { complete(); return; }
        rec.onstop = complete;
        try { rec.stop(); } catch (e) { complete(); }
        setTimeout(complete, 5000); // defensive: never hang the UI
      });
    }

    function selectTake(take) {
      if (!take) return;
      state.current = take;
      try { replay.src = take.url; } catch (e) {}
      verdictEl.textContent = take.verdict.text || '';
      state.takes.forEach(function (t) { if (t.pill) t.pill.classList.toggle('lec-active', t === take); });
      updateButtons();
    }

    function resetToIdle() {
      state.current = null;
      try { replay.removeAttribute('src'); replay.load(); } catch (e) {}
      verdictEl.textContent = '';
      setStatus('Ready - frame yourself in the oval');
      updateButtons();
    }

    function cancelCountdown() {
      if (state.countdown) { clearInterval(state.countdown); state.countdown = null; }
      countdown.textContent = '';
      updateButtons();
    }

    function beginCountdown() {
      if (state.recording || state.countdown || !state.stream) return;
      var n = 3;
      countdown.textContent = '3';
      recBtn.textContent = 'Cancel';
      setStatus('Get ready...');
      state.countdown = setInterval(function () {
        n--;
        if (n > 0) { countdown.textContent = String(n); return; }
        clearInterval(state.countdown);
        state.countdown = null;
        countdown.textContent = '';
        startRecording();
      }, 1000);
    }

    function useCurrent() {
      if (state.closed) return false;
      if (state.recording) { state.autoUseAfterStop = true; stopRecording(); return true; }
      var take = state.current;
      if (!take) return false;
      try { onUse(take.blob, take.verdict); } catch (e) {}
      if (take.pill) take.pill.classList.add('lec-used');
      resetToIdle(); // keep the camera open for another take
      return true;
    }

    function close() {
      if (state.closed) return;
      state.closed = true;
      if (state.countdown) { clearInterval(state.countdown); state.countdown = null; }
      if (state.timer) { clearInterval(state.timer); state.timer = null; }
      if (state.sampleInterval) { clearInterval(state.sampleInterval); state.sampleInterval = null; }
      if (state.drawRaf) { try { cancelRaf(state.drawRaf); } catch (e) {} state.drawRaf = 0; }
      if (state.recorder && state.recorder.state !== 'inactive') {
        try { state.recorder.stop(); } catch (e) {}
      }
      if (state.outputStream && state.outputStream.getTracks) stopTracks(state.outputStream.getTracks());
      if (state.stream && state.stream.getTracks) stopTracks(state.stream.getTracks());
      if (state.audioCtx) { try { state.audioCtx.close().catch(noop); } catch (e) {} }
      state.replayUrls.forEach(safeUrlRevoke);
      try { replay.removeAttribute('src'); preview.srcObject = null; } catch (e) {}
      setAudioSessionType('ambient');
      try { if (root.parentNode) root.parentNode.removeChild(root); } catch (e) {}
      onClose();
    }

    recBtn.addEventListener('click', function () {
      if (state.countdown) { cancelCountdown(); return; }
      if (state.recording) { stopRecording(); return; }
      beginCountdown();
    });
    retakeBtn.addEventListener('click', function () {
      if (state.current) deleteTake(state.current.id).catch(noop);
      resetToIdle();
      setStatus('Retake - record again');
    });
    useBtn.addEventListener('click', useCurrent);
    q('.lec-close').addEventListener('click', close);
    q('.lec-done').addEventListener('click', close);

    startCamera().catch(noop);
    updateButtons();

    return {
      close: close,
      useCurrent: useCurrent,
      takes: function () { return state.takes.slice(); },
      get current() { return state.current; }
    };
  }

  // ---------------------------------------------------------------------------
  // Seek-safe canvas preview (muted; export carries the real audio)
  // ---------------------------------------------------------------------------
  function createPreview(options) {
    options = options || {};
    var canvas = options.canvas;
    if (!canvas || typeof canvas.getContext !== 'function') {
      return Promise.reject(new Error('createPreview requires a canvas'));
    }
    var edit = options.edit || {};
    var sourceClips = Array.isArray(edit.clips) ? edit.clips : options.clips;
    var size = targetSize(edit.format || options.format);
    canvas.width = size.w;
    canvas.height = size.h;
    var ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return Promise.reject(new Error('Canvas is not available'));

    var timeline = model().normalizeTimeline(sourceClips, {
      defaultDuration: 6,
      look: edit.look || options.look || 'classic',
      format: edit.format || options.format || 'vertical',
      musicMode: edit.musicMode || options.musicMode || 'source'
    });
    var opts = Object.assign({}, edit, options, {
      clips: timeline.clips,
      captions: edit.captions || options.captions || [],
      hook: edit.hook || options.hook || null,
      cta: edit.cta || options.cta || null,
      plan: options.plan || edit.plan || null,
      look: edit.look || options.look || 'classic'
    });
    var refs = [];
    var t = 0;
    var index = 0;
    var playing = false;
    var raf = 0;
    var last = 0;
    var destroyed = false;
    var rafFn = win.requestAnimationFrame || function (cb) { return setTimeout(function () { cb(Date.now()); }, 33); };
    var cancelRaf = win.cancelAnimationFrame || function (id) { clearTimeout(id); };
    var onTime = typeof options.onTime === 'function' ? options.onTime : noop;

    function syncClip(i, time, hard) {
      var c = timeline.clips[i];
      if (!c || !c.element) return;
      var local = clamp(time - c.timelineStart, 0, Math.max(0, c.duration - 0.02));
      var target = c.inPoint + local;
      var current = finite(c.element.currentTime);
      if (hard || Math.abs(current - target) > 0.6) {
        try { c.element.currentTime = target; } catch (e) {}
      }
    }

    function draw(time) {
      t = clamp(num(time, 0), 0, timeline.total);
      index = activeClipIndex(timeline.clips, t);
      syncClip(index, t, !playing);
      if (index > 0) syncClip(index - 1, t - 0.01, true);
      try { renderTimelineFrame(ctx, timeline.clips, index, t, opts, size.w, size.h, 0); }
      catch (e) { /* a transient seek frame is safe to skip */ }
      onTime(t, index);
    }

    function loop(now) {
      if (!playing || destroyed) return;
      var dt = last ? Math.min(0.25, Math.max(0, (now - last) / 1000)) : 0;
      last = now;
      draw(t + dt);
      if (t >= timeline.total - 0.001) { playing = false; return; }
      raf = rafFn(loop);
    }

    return Promise.all(timeline.clips.map(function (c) { return acquireSource(c.url); }))
      .then(function (loaded) {
        loaded.forEach(function (r, i) {
          if (!r) return;
          refs.push(r);
          timeline.clips[i].element = r.element;
          timeline.clips[i].ref = r;
          try { r.element.muted = true; } catch (e) {}
        });
        if (!timeline.clips.some(function (c) { return !!c.element; })) {
          throw new Error('No playable clips in this edit');
        }
        draw(0);
        return {
          duration: function () { return timeline.total; },
          currentTime: function () { return t; },
          seek: function (v) {
            var target = clamp(num(v, 0), 0, timeline.total);
            var i = activeClipIndex(timeline.clips, target);
            var c = timeline.clips[i];
            if (!c || !c.element) return Promise.resolve();
            var local = clamp(target - c.timelineStart, 0, Math.max(0, c.duration - 0.02));
            return seekTo(c.element, c.inPoint + local).then(function () { draw(target); });
          },
          play: function () {
            if (destroyed || playing) return;
            if (t >= timeline.total - 0.01) draw(0);
            playing = true;
            last = 0;
            try { playMedia(timeline.clips[index].element).catch(noop); } catch (e) {}
            raf = rafFn(loop);
          },
          pause: function () {
            playing = false;
            if (raf) { try { cancelRaf(raf); } catch (e) {} raf = 0; }
            timeline.clips.forEach(function (c) { try { c.element.pause(); } catch (e) {} });
          },
          destroy: function () {
            if (destroyed) return;
            destroyed = true;
            playing = false;
            if (raf) { try { cancelRaf(raf); } catch (e) {} raf = 0; }
            timeline.clips.forEach(function (c) { try { c.element.pause(); } catch (e) {} });
            refs.forEach(function (r) { releaseSource(r); });
            refs = [];
          }
        };
      });
  }

  // ---------------------------------------------------------------------------
  // Public surface
  // ---------------------------------------------------------------------------
  win.LumiEditor = {
    probes: probes,
    measureFile: measureFile,
    loadSource: loadSource,
    exportVideo: exportVideo,
    createPreview: createPreview,
    makePoster: makePoster,
    openCamera: openCamera,
    drawCover: drawCover,
    looks: looks,
    fmtTime: fmtTime,
    extForBlob: extForBlob,
    renderTimelineFrame: renderTimelineFrame,
    // Optional helpers
    revoke: revoke,
    listTakes: listTakes,
    deleteTake: deleteTake
  };
})();



