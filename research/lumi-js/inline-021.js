
/* FILMLUMI106 [M5 Max MBP] 2026-11-01. Same numbers as ~/.lumo/lumi2/frame102.py where frame102 has one (MID, EDGE_CUT, MIN_FACE_H, the
   0.6 detection confidence); the rest come from the plan's live check table (close over 42% tall, far under 12%, headroom 8%).
   Coordinates are the RAW camera frame (what MediaRecorder writes and what frame102 later measures), the preview is only mirrored on screen. */
const FL106 = {
  MID: [0.30, 0.70], EDGE_CUT: 0.12, MIN_FACE_H: 0.06, CONF: 0.6,          // frame102.py
  CLOSE_H: 0.42, FAR_H: 0.12, HEADROOM: 0.08, HEAD_EXTRA: 0.40,           // plan section 3 table
  DARK: 70, BACKLIT_GAP: 45, BACKLIT_FACE: 120, SHAKE: 0.08, QUIET_DB: -45, FAIL_SHARE: 0.12, MIN_TAKE_S: 2,
  MP: "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14",
  MODEL: "/filmlumi/blaze_face_short_range.tflite",
  LINES: { setup: "Prop your phone at eye level, about an arm and a half away.", left: "Move a little left.", right: "Move a little right.",
    back: "Step back a bit.", closer: "Come a little closer.", raise: "Raise the phone a little.", window: "Turn toward a window.",
    backlit: "Turn so the light is in front of you.", upright: "Hold the phone upright.", steady: "Hold the phone still.",
    louder: "Speak up a little.", ready: "Looks great, tap record.", good: "That's the one.", again: "Let's do one more." }
};
function fl106On() { try { return !!(S && S.data && S.data.film106 === true); } catch { return false; } }
function fl106Btn() { return fl106On() ? `<button type="button" class="btn line block nf106" id="fl106btn">Film with Lumi</button>` : ""; }
// one face box -> what is wrong with it (raw frame coords, 0..1). Exported for the test page.
function fl106Judge(f) {
  const bad = [];
  if (!f) return { bad: ["face"], first: "face" };
  const cx = f.x + f.w / 2, top = f.y - FL106.HEAD_EXTRA * f.h;
  const off = Math.max(0, -f.x) + Math.max(0, f.x + f.w - 1), touch = f.x <= 0.004 || f.x + f.w >= 0.996;   // the detector clamps its box to the frame, so touching the edge counts as cut
  if (off >= FL106.EDGE_CUT * Math.max(1e-6, f.w) || touch) bad.push("edge");
  if (f.h > FL106.CLOSE_H) bad.push("close"); else if (f.h < FL106.FAR_H) bad.push("far");
  if (cx < FL106.MID[0] || cx > FL106.MID[1]) bad.push("center");
  if (top < FL106.HEADROOM && !bad.includes("close")) bad.push("headroom");
  return { bad, cx, top, first: bad[0] || "" };
}
function fl106LineFor(k, f) {
  const cx = f ? f.x + f.w / 2 : 0.5;
  // raw frame: a face on the image LEFT is off to the person's RIGHT, so they move to their left (and the mirrored preview agrees)
  return { face: "setup", edge: cx < 0.5 ? "left" : "right", center: cx < 0.5 ? "left" : "right", close: "back", far: "closer", headroom: "raise",
    dark: "window", backlit: "backlit", upright: "upright", shaky: "steady" }[k] || "";
}
const FLS = { on: false };
window.__fl106 = FLS;
function fl106Html() {
  return `<div id="fl106" role="dialog" aria-label="Film with Lumi"><div class="flt"><b>Film with Lumi</b><button class="flx" id="fl106x" aria-label="Close">&times;</button></div><div class="flbody" id="fl106body"></div></div>`;
}
function fl106Open(dr) {
  if (!fl106On()) return;                                                  // the gate, again, at the door
  fl106Close(true);
  Object.assign(FLS, { on: true, dr: dr || S.draft, phase: "intro", said: [], log: [], lastSay: 0, lastKey: "", badSince: {}, greenSince: 0, readySaid: false, take: null, err: "", sess: null, orient: "tall", orManual: false, doneSess: null });   // FILMLUMI111: a fresh session
  document.body.insertAdjacentHTML("beforeend", fl106Html());
  $("#fl106x").onclick = () => fl106Close();
  fl106Intro();
}
function fl106Intro() {
  FLS.phase = "intro";
  $("#fl106body").innerHTML = `<div class="flintro"><h2>Lumi helps you film.</h2>
    <ol><li>Prop your phone upright at eye level, about an arm and a half away.</li><li>Lumi watches the camera and tells you out loud how to fix the shot. When every tick is green, tap Record.</li>
    <li>Lumi stays quiet while you record. After the take it checks it and says retake or that's the one.</li><li>Tap Use this take and it uploads in the background while you film the next one. Film as many takes as you like.</li><li>Tap Done, edit my reel when you have them all.</li></ol>
    <p style="color:#a9a9b2;font-size:13px;margin:0 0 16px">Tap Start, then allow the camera and the microphone. Turn your sound on to hear Lumi.</p>
    <button class="flbtn" id="fl106start">Start</button><p id="fl106err" style="color:#ff8a82;font-size:14px;margin:12px 0 0">${esc(FLS.err || "")}</p></div>`;
  $("#fl106start").onclick = fl106Start;
}
function fl106Say(key, force) {
  // pre-made ElevenLabs lines, never while counting down or recording (the mic would catch Lumi)
  if (!key || FLS.phase === "count" || FLS.phase === "rec") return;
  const now = Date.now();
  if (!force && (now - FLS.lastSay < 3500 || (key === FLS.lastKey && now - FLS.lastSay < 7000))) return;
  const rec = { key, at: now, phase: FLS.phase, played: false }; FLS.lastSay = now; FLS.lastKey = key; FLS.said.push(rec);
  try { const a = FLS.audio || (FLS.audio = new Audio()); a.src = "/filmlumi/" + key + ".mp3"; const p = a.play(); if (p && p.then) p.then(() => { rec.played = true; }, e => { rec.err = String(e && e.name || e); }); } catch (e) { rec.err = String(e); }
}
async function fl106Start() {
  const b = $("#fl106start"); if (b) { b.disabled = true; b.textContent = "Starting the camera..."; }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === "undefined") { FLS.err = "This browser cannot film here. Open lumiedits.app in Safari on your iPhone."; return fl106Intro(); }
  // FL106CAM [M5 Max MBP] 2026-11-01 (Nick TG 21703 "Not working", iPhone home-screen app showed the permission error): ask for the camera
  // FIRST (no sound playing yet, iOS audio session clash), then step down to simpler requests, and show the real error name so we can see it
  if (window.lumiRecOn) window.lumiRecOn();   // FL106REC: mic needs the play-and-record session on iPhone
  const tries = [
    // FL106RES [M5 Max MBP] 2026-11-01: Nick's first tall take was only 608x1080 (iPhone gave a 1920x1080 stream). Ask for 4K first so the
    // centre 9:16 crop can be a full 1080x1920; iPhone falls back to the nearest size it has
    { video: { facingMode: "user", width: { ideal: 3840 }, height: { ideal: 2160 }, frameRate: { ideal: 30 } }, audio: true },
    { video: { facingMode: "user", width: { ideal: 1080 }, height: { ideal: 1920 } }, audio: true },
    { video: { facingMode: "user" }, audio: true },
    { video: true, audio: true }];
  let lastErr = null;
  for (const c of tries) { try { FLS.stream = await navigator.mediaDevices.getUserMedia(c); break; } catch (e) { lastErr = e; if (e && e.name === "NotAllowedError") break; } }
  if (!FLS.stream) {
    const ua = navigator.userAgent, where = (navigator.standalone || matchMedia("(display-mode: standalone)").matches) ? "home screen app" : /CriOS/.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "in-app browser";
    const n = String(lastErr && lastErr.name || lastErr || "unknown") + ", " + where;   // FL106CAM: tells us where it ran (Nick could not tell Safari from Chrome)
    let camOnly = false;   // FL106CAM: is the mic held by another app (Nick's screenshots show the orange mic dot from another app)?
    if (!/^NotAllowedError/.test(n)) { try { const v = await navigator.mediaDevices.getUserMedia({ video: true }); v.getTracks().forEach(t => t.stop()); camOnly = true; } catch {} }
    FLS.err = camOnly ? "The camera works but the microphone is busy in another app (the orange dot at the top of your screen, often a dictation keyboard or a call). Close that app, then tap Start again. (" + n + ")"
      : /^NotAllowedError/.test(n)
      ? "Lumi needs the camera and the microphone. On iPhone: Settings, Apps, Safari, Camera and Microphone, set to Ask or Allow. Then close this and tap Start again. (" + n + ")"
      : "The camera did not start (" + n + "). Close other apps using the camera or mic, then tap Start again.";
    if (window.lumiRecOff) window.lumiRecOff();
    return fl106Intro();
  }
  try { const a = FLS.audio || (FLS.audio = new Audio()); a.muted = true; a.src = "/filmlumi/ready.mp3"; await a.play().catch(() => {}); a.pause(); a.muted = false; } catch {}   // unlock sound after the camera is live
  if (!FLS.on) { fl106Stop(); return; }
  fl106Camera();
  try { const AC = window.AudioContext || window.webkitAudioContext; FLS.ac = new AC(); const src = FLS.ac.createMediaStreamSource(FLS.stream);
    FLS.an = FLS.ac.createAnalyser(); FLS.an.fftSize = 2048; src.connect(FLS.an); FLS.abuf = new Float32Array(FLS.an.fftSize); } catch {}
  fl106Say("setup", true);
  try { await fl106Detector(); } catch (e) { FLS.detErr = String(e && e.message || e); const h = $("#fl106hint"); if (h) h.textContent = "The face guide did not load. You can still record."; }
  FLS.tick = setInterval(fl106Tick, 100);
}
async function fl106Detector() {
  if (FLS.det) return FLS.det;
  const mp = window.__fl106mp || (window.__fl106mp = await import(FL106.MP + "/vision_bundle.mjs"));
  const fs = await mp.FilesetResolver.forVisionTasks(FL106.MP + "/wasm");
  const mk = d => mp.FaceDetector.createFromOptions(fs, { baseOptions: { modelAssetPath: FL106.MODEL, delegate: d }, runningMode: "VIDEO", minDetectionConfidence: FL106.CONF });
  try { FLS.det = await mk("GPU"); FLS.delegate = "GPU"; } catch { FLS.det = await mk("CPU"); FLS.delegate = "CPU"; }
  return FLS.det;
}
function fl106Camera() {
  FLS.phase = "live";
  $("#fl106body").innerHTML = `<div class="flstage" id="fl106stage"><div class="flcam" id="fl106cam"><video id="fl106v" playsinline muted autoplay></video>
      <div class="flguide" id="fl106guide"></div><div class="flface" id="fl106face"></div><div class="flhint" id="fl106hint">Getting the camera ready</div>
      <div class="flcount" id="fl106count"></div><div class="flrecdot" id="fl106dot"><i></i><span id="fl106time">0:00</span></div></div></div>
    <div class="flor" id="fl111or"><button type="button" data-or111="tall">Tall</button><button type="button" data-or111="wide">Wide</button></div>
    <div class="flchips" id="fl106chips"></div><div class="flmeter"><i id="fl106lvl"></i></div><div class="fltakes" id="fl111takes"></div>
    <div class="fldock"><button class="flbtn rec" id="fl106rec">Record</button><button class="flbtn ln fldone" id="fl111done" style="display:none">Done, edit my reel</button></div>`;
  const v = $("#fl106v"); v.srcObject = FLS.stream; v.play().catch(() => {});
  v.onloadedmetadata = fl106Fit; window.addEventListener("resize", fl106Fit);
  $("#fl106rec").onclick = () => FLS.phase === "rec" ? fl106StopRec() : fl106Count();
  document.querySelectorAll("[data-or111]").forEach(b => b.onclick = () => { if (FLS.phase !== "live") return; FLS.orManual = true; fl111SetOr(b.dataset.or111); });   // FILMLUMI111: the switch always wins
  $("#fl111done").onclick = fl111Done;
  fl111AutoOr(true); fl111Paint();
}
function fl106Fit() {
  const v = $("#fl106v"), st = $("#fl106stage"), cam = $("#fl106cam"); if (!v || !st || !cam || !v.videoWidth) return;
  fl111AutoOr();
  const ar = fl111Crop(v.videoWidth, v.videoHeight).A, W = st.clientWidth - 16, H = st.clientHeight - 8;   // FL106TALL + FILMLUMI111: the box is always the take (9:16 Tall, 16:9 Wide), the video fills it with object-fit cover = the same centre crop
  let w = W, h = W / ar; if (h > H) { h = H; w = H * ar; }
  cam.style.width = Math.round(w) + "px"; cam.style.height = Math.round(h) + "px";
}
function fl106Frame(v) {
  // brightness of the whole frame and of the face box, from a 48 px wide copy (cheap enough for 10 times a second)
  const c = FLS.cv || (FLS.cv = document.createElement("canvas")), W = 48, H = Math.max(1, Math.round(48 * (v.videoHeight || v.height) / (v.videoWidth || v.width)));   // FL106TALL: also takes the 9:16 crop canvas
  c.width = W; c.height = H; const x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(v, 0, 0, W, H);
  return { d: x.getImageData(0, 0, W, H).data, W, H };
}
function fl106Luma(fr, box) {
  let s = 0, n = 0, fs = 0, fn = 0;
  for (let y = 0; y < fr.H; y++) for (let x = 0; x < fr.W; x++) { const i = (y * fr.W + x) * 4, l = 0.299 * fr.d[i] + 0.587 * fr.d[i + 1] + 0.114 * fr.d[i + 2]; s += l; n++;
    if (box && x / fr.W >= box.x && x / fr.W <= box.x + box.w && y / fr.H >= box.y && y / fr.H <= box.y + box.h) { fs += l; fn++; } }
  return { all: n ? s / n : 0, face: fn ? fs / fn : null };
}
function fl106Db() {
  if (!FLS.an) return null; FLS.an.getFloatTimeDomainData(FLS.abuf); let s = 0; for (const x of FLS.abuf) s += x * x;
  return 20 * Math.log10(Math.sqrt(s / FLS.abuf.length) + 1e-9);
}
function fl106Tick() {
  const v = $("#fl106v"); if (!FLS.on || !v || v.readyState < 2 || !v.videoWidth) return;
  const now = performance.now(), vw = v.videoWidth, vh = v.videoHeight; let face = null, nf = 0;
  // FL106TALL: a wide stream is judged on its centre 9:16 (that is the take), and the face finder runs on that crop so a face is not too small to find
  // FILMLUMI111: the take window is the centre crop for the chosen shape (Tall 9:16 or Wide 16:9); every check runs on exactly that window
  const cr = fl111Crop(vw, vh);
  let src = v, sw = vw, sh = vh;
  if (!cr.full) { const dc = FLS.dc || (FLS.dc = document.createElement("canvas")); if (dc.width !== cr.cw || dc.height !== cr.ch) { dc.width = cr.cw; dc.height = cr.ch; }
    try { dc.getContext("2d").drawImage(v, cr.sx, cr.sy, cr.cw, cr.ch, 0, 0, cr.cw, cr.ch); src = dc; sw = cr.cw; sh = cr.ch; } catch {} }
  // FILMLUMI111: the short-range face finder squeezes a 16:9 frame to a square and loses the face, so Wide looks in the centre square of the
  // take and maps the box back to full-frame numbers (a face outside that square is off-centre anyway)
  let dsrc = src, ox = 0, dw = sw;
  if (cr.A > 1 && sw > sh) { const q = sh, qx = Math.round((sw - q) / 2), dq = FLS.dq || (FLS.dq = document.createElement("canvas")); if (dq.width !== q || dq.height !== q) { dq.width = q; dq.height = q; }
    try { dq.getContext("2d").drawImage(src === v ? v : src, (src === v ? cr.sx : 0) + qx, src === v ? cr.sy : 0, q, q, 0, 0, q, q); dsrc = dq; ox = qx; dw = q; } catch {} }
  if (FLS.det) { try { const r = FLS.det.detectForVideo(dsrc, now);
      const fs = (r.detections || []).map(d => ({ x: (ox + d.boundingBox.originX * (dw / (dsrc.width || dw))) / sw, y: d.boundingBox.originY / sh, w: d.boundingBox.width / sw, h: d.boundingBox.height / sh,
        s: (d.categories && d.categories[0] && d.categories[0].score) || 0 })).filter(f => f.h >= FL106.MIN_FACE_H);
      nf = fs.length; face = fs.sort((a, b) => b.w * b.h - a.w * a.h)[0] || null; } catch (e) { FLS.detErr = String(e && e.message || e); } }
  // FL106TALL [M5 Max MBP] 2026-11-01 (Nick's first iPhone take, Flea market finds, came out 1920x1080 landscape while he held the phone upright:
  // iPhone hands the page a wide camera stream). Every take is the centre 9:16 of the stream, so face numbers above are already inside that window.
  const j = fl106Judge(face), fr = fl106Frame(src), L = fl106Luma(fr, face), db = fl106Db();
  const upright = FLS.orient === "wide" ? true : window.innerHeight >= window.innerWidth;   // FL106TALL: the stream may be wide on an upright phone; the take is cropped tall. FILMLUMI111: Wide needs no upright phone
  // steady: how far the face box centre jumps between checks, relative to the face height (median of the last 10)
  const hist = FLS.hist || (FLS.hist = []); if (face) hist.push({ cx: face.x + face.w / 2, cy: face.y + face.h / 2, h: face.h }); else hist.length = 0; if (hist.length > 11) hist.shift();
  const jumps = []; for (let i = 1; i < hist.length; i++) jumps.push(Math.hypot(hist[i].cx - hist[i - 1].cx, hist[i].cy - hist[i - 1].cy) / Math.max(0.05, hist[i].h));
  const shake = jumps.length >= 5 ? jumps.sort((a, b) => a - b)[Math.floor(jumps.length / 2)] : 0;
  const dark = face && L.face !== null && L.face < FL106.DARK, backlit = face && L.face !== null && !dark && L.all - L.face > FL106.BACKLIT_GAP && L.face < FL106.BACKLIT_FACE;
  const sndHist = FLS.snd || (FLS.snd = []); if (db !== null) { sndHist.push(db); if (sndHist.length > 30) sndHist.shift(); }
  const heard = sndHist.some(x => x > FL106.QUIET_DB);
  const st = { face: !!face, center: face && !j.bad.includes("center"), dist: face && !j.bad.includes("close") && !j.bad.includes("far"), head: face && !j.bad.includes("headroom") && !j.bad.includes("close"),
    edge: face && !j.bad.includes("edge"), light: face && !dark && !backlit, upright, steady: shake <= FL106.SHAKE, sound: heard };
  // what Lumi says first, in this order
  const order = [["upright", !upright], ["face", !face], ["close", j.bad.includes("close")], ["edge", j.bad.includes("edge")], ["far", j.bad.includes("far")],
    ["center", j.bad.includes("center")], ["headroom", j.bad.includes("headroom")], ["dark", dark], ["backlit", backlit], ["shaky", face && shake > FL106.SHAKE]];
  const top = (order.find(o => o[1]) || [""])[0];
  const t = FLS.t0 ? (Date.now() - FLS.t0) / 1000 : 0;
  const framingBad = !face || j.bad.length > 0;
  const row = { t: Math.round(t * 10) / 10, phase: FLS.phase, face: face ? [+face.x.toFixed(3), +face.y.toFixed(3), +face.w.toFixed(3), +face.h.toFixed(3)] : null, nf, bad: face ? j.bad : ["face"],
    framingBad, or: FLS.orient || "tall", dark: !!dark, backlit: !!backlit, upright, shake: +shake.toFixed(3), db: db === null ? null : Math.round(db), luma: Math.round(L.all), fluma: L.face === null ? null : Math.round(L.face), top };
  FLS.last = row;
  if (FLS.phase === "rec") FLS.log.push(row);
  // paint
  const fb = $("#fl106face"), g = $("#fl106guide");
  if (fb) { if (face) { fb.style.display = "block"; fb.style.left = ((1 - face.x - face.w) * 100) + "%"; fb.style.top = (face.y * 100) + "%"; fb.style.width = (face.w * 100) + "%"; fb.style.height = (face.h * 100) + "%"; fb.classList.toggle("ok", !framingBad); } else fb.style.display = "none"; }
  if (g) g.classList.toggle("ok", !top);
  const chips = $("#fl106chips");
  if (chips) chips.innerHTML = [["Face found", st.face], ["Centered", st.center], ["Distance", st.dist], ["Headroom", st.head], ["Edges", st.edge], ["Light", st.light], [FLS.orient === "wide" ? "Wide" : "Upright", st.upright], ["Steady", st.steady], ["Sound", st.sound]]
    .map(([n, ok]) => `<span class="${ok ? "ok" : (n === "Sound" ? "" : "bad")}">${ok ? "✓ " : ""}${n}</span>`).join("");
  const lv = $("#fl106lvl"); if (lv && db !== null) lv.style.width = Math.max(0, Math.min(100, (db + 60) * 100 / 50)) + "%";
  const hint = $("#fl106hint");
  if (FLS.phase === "live") {
    const key = top ? fl106LineFor(top, face) : "ready";
    if (hint) hint.textContent = top ? FL106.LINES[key] : "Looks great. Tap Record.";
    const nowMs = Date.now();
    if (top) { FLS.greenSince = 0; const k = top + key; if (!FLS.badSince[k]) FLS.badSince = { [k]: nowMs }; if (nowMs - FLS.badSince[k] >= 1500) { fl106Say(key); FLS.readySaid = false; } }
    else { FLS.badSince = {}; if (!FLS.greenSince) FLS.greenSince = nowMs; if (nowMs - FLS.greenSince >= 1200 && !FLS.readySaid) { FLS.readySaid = true; fl106Say("ready", true); } }
  } else if (FLS.phase === "rec" && hint) hint.textContent = "";
}
function fl106Count() {
  if (FLS.phase !== "live") return;
  try { FLS.audio && FLS.audio.pause(); } catch {}
  FLS.phase = "count"; fl111OrLock(); fl111Paint(); const c = $("#fl106count"), b = $("#fl106rec"); b.disabled = true; c.style.display = "flex"; let n = 3; c.textContent = n;
  const h = $("#fl106hint"); if (h) h.textContent = "";
  FLS.countT = setInterval(() => { n--; if (n > 0) { c.textContent = n; return; } clearInterval(FLS.countT); c.style.display = "none"; fl106Rec(); }, 1000);
}
function fl106Rec() {
  if (!FLS.on || !FLS.stream) return;
  const mt = ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4", "video/webm;codecs=vp8,opus", "video/webm"].find(t => { try { return MediaRecorder.isTypeSupported(t); } catch { return false; } }) || "";
  let recStream = FLS.stream;
  try {   // FL106TALL: draw the centre 9:16 of a wide camera stream into a 1080x1920 canvas and record that, with the mic track
    const v = $("#fl106v"), vw = v && v.videoWidth, vh = v && v.videoHeight, cr0 = vw && vh ? fl111Crop(vw, vh) : null;
    if (cr0 && !cr0.full && HTMLCanvasElement.prototype.captureStream) {   // FILMLUMI111: Tall = 9:16 up to 1080x1920, Wide = 16:9 up to 1920x1080
      const wide = cr0.A > 1, ow = wide ? Math.round(Math.min(1920, cr0.cw) / 2) * 2 : Math.round(Math.min(1920, cr0.ch) * 9 / 16 / 2) * 2, oh = wide ? Math.round(ow * 9 / 16 / 2) * 2 : Math.round(Math.min(1920, cr0.ch) / 2) * 2;
      const c = FLS.rc || (FLS.rc = document.createElement("canvas")); c.width = ow; c.height = oh; const x = c.getContext("2d");
      const draw = () => { if (FLS.phase !== "rec" && FLS.phase !== "count" && FLS.phase !== "checking") return; try { const q = fl111Crop(v.videoWidth, v.videoHeight); x.drawImage(v, q.sx, q.sy, q.cw, q.ch, 0, 0, ow, oh); } catch {} FLS.rcRaf = requestAnimationFrame(draw); };
      FLS.phase = "rec"; draw();
      recStream = new MediaStream([...c.captureStream(30).getVideoTracks(), ...FLS.stream.getAudioTracks()]);
      FLS.cropped = [ow, oh];
    } else FLS.cropped = cr0 ? [vw, vh] : null;
  } catch (e) { recStream = FLS.stream; FLS.cropped = null; }
  FLS.recOr = FLS.orient || "tall"; fl111OrLock();
  try { FLS.mr = new MediaRecorder(recStream, mt ? { mimeType: mt } : undefined); } catch (e) { toast("Recording did not start. Close and try again."); FLS.phase = "live"; $("#fl106rec").disabled = false; return; }
  FLS.mime = FLS.mr.mimeType || mt || "video/mp4"; FLS.chunks = []; FLS.log = [];
  FLS.mr.ondataavailable = e => { if (e.data && e.data.size) FLS.chunks.push(e.data); };
  FLS.mr.onstop = fl106Check;
  FLS.mr.start(1000); FLS.t0 = Date.now(); FLS.phase = "rec";
  const b = $("#fl106rec"); b.disabled = false; b.textContent = "Stop"; b.className = "flbtn";
  $("#fl106dot").style.display = "flex";
  FLS.clock = setInterval(() => { const s = Math.floor((Date.now() - FLS.t0) / 1000), el = $("#fl106time"); if (el) el.textContent = Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }, 250);
}
function fl106StopRec() {
  if (FLS.phase !== "rec" || !FLS.mr) return;
  FLS.dur = (Date.now() - FLS.t0) / 1000; FLS.phase = "checking"; clearInterval(FLS.clock);
  const b = $("#fl106rec"); if (b) { b.disabled = true; b.textContent = "Checking your take..."; }
  try { FLS.mr.stop(); } catch { fl106Check(); }
  setTimeout(() => { try { cancelAnimationFrame(FLS.rcRaf); } catch {} }, 600);   // FL106TALL: stop drawing once the recorder has flushed
}
// After the take: replay the face log. More than 12% of the checks failing framing = retake.
function fl106Verdict(log, dur) {
  const n = log.length, cnt = k => log.filter(r => (r.bad || []).includes(k)).length, share = x => n ? x / n : 0;
  const framingFail = log.filter(r => r.framingBad).length, fs = share(framingFail);
  const reasons = { face: "Your face was out of the shot", close: "You were too close", edge: "Your face was cut off by the edge", far: "You were too far away",
    center: "You were off to the side", headroom: "There was no room above your head" };
  let main = "", fix = "";
  if (n && fs > FL106.FAIL_SHARE) {
    const k = Object.keys(reasons).map(k => [k, cnt(k)]).sort((a, b) => b[1] - a[1])[0][0];
    const firstBad = log.find(r => (r.bad || []).includes(k)), f = firstBad && firstBad.face ? { x: firstBad.face[0], w: firstBad.face[2] } : null;
    const side = f ? (f.x + f.w / 2 < 0.5 ? "left" : "right") : "";
    main = reasons[k] + " for " + Math.round(share(cnt(k)) * 100) + "% of the take" + (firstBad ? (firstBad.t < 1 ? ", from the start" : ", from " + firstBad.t.toFixed(0) + " s in") : "") + ".";
    fix = { face: "Prop the phone so your face is inside the oval, then film again.", edge: "Move a little " + side + " and film again.", close: "Step back a bit and film again.",
      far: "Come a little closer and film again.", center: "Move a little " + side + " and film again.", headroom: "Raise the phone a little and film again." }[k];
  }
  const tooShort = dur < FL106.MIN_TAKE_S;
  const darkS = share(log.filter(r => r.dark || r.backlit).length), shakeS = share(log.filter(r => r.shake > FL106.SHAKE).length);
  const dbs = log.map(r => r.db).filter(x => x !== null).sort((a, b) => a - b), loud = dbs.length ? dbs[Math.floor(dbs.length * 0.9)] : null;
  const rows = [
    ["Framing", fs > FL106.FAIL_SHARE ? "r" : "g", n ? Math.round((1 - fs) * 100) + "% of the take in frame" : "no face checks"],
    ["Length", tooShort ? "r" : "g", dur.toFixed(1) + " s"],
    ["Light", darkS > 0.3 ? "a" : "g", darkS > 0.3 ? "a bit dark, face a window next time" : "good"],
    ["Steady", shakeS > 0.3 ? "a" : "g", shakeS > 0.3 ? "shaky, rest the phone on something" : "steady"],
    ["Sound", loud === null ? "a" : loud < FL106.QUIET_DB ? "a" : "g", loud === null ? "not measured" : loud < FL106.QUIET_DB ? "quiet, speak up a little" : "good"]];
  const ok = !!n && fs <= FL106.FAIL_SHARE && !tooShort;
  if (!n && !tooShort) { main = "Lumi could not check your face in this take."; fix = "Film again with your face inside the oval."; }
  if (tooShort) { main = "That take was very short."; fix = "Film again and keep going a little longer."; }
  return { ok, n, framingShare: +fs.toFixed(3), main, fix, rows, dur: +dur.toFixed(2) };
}
function fl106Check() {
  const blob = new Blob(FLS.chunks || [], { type: (FLS.mime || "video/mp4").split(";")[0] });
  const v = fl106Verdict(FLS.log || [], FLS.dur || 0); FLS.take = { blob, verdict: v, mime: blob.type, size: blob.size, or: FLS.recOr || "tall", dims: FLS.cropped }; FLS.phase = "result";
  fl111Keep(FLS.take);   // FILMLUMI111: on the phone (IndexedDB) the moment it is recorded, so a crash or a closed app loses nothing
  try { FLS.url && URL.revokeObjectURL(FLS.url); } catch {} FLS.url = URL.createObjectURL(blob);
  $("#fl106body").innerHTML = `<div class="flres"><video id="fl106play" src="${FLS.url}" controls playsinline></video>
    <div class="flverd ${v.ok ? "ok" : "bad"}" id="fl106verdict">${v.ok ? "That's the one." : "Let's do one more."}</div>
    <p class="flwhy" id="fl106why">${v.ok ? "Your face stayed in frame for the whole take. Use it, or film another." : esc(v.main + " " + v.fix)}</p>
    <ul class="flrows">${v.rows.map(r => `<li><b>${r[0]}</b><span class="${r[1]}">${esc(r[2])}</span></li>`).join("")}</ul></div>
    <div class="fldock"><div class="flrow2"><button class="flbtn ln" id="fl106retake">Retake</button><button class="flbtn" id="fl106use">Use this take</button></div></div>`;
  fl106Say(v.ok ? "good" : "again", true);
  $("#fl106retake").onclick = () => { if (FLS.take && FLS.take.id) { const id = FLS.take.id; Promise.resolve(FLS.take.saved).then(() => fl111Del(id)); } FLS.take = null; FLS.readySaid = false; FLS.log = []; FLS.t0 = 0; fl106Camera(); };
  $("#fl106use").onclick = fl106Use;
}
function fl106Use() {
  // FILMLUMI111 [M5 Max MBP] 2026-11-01 (Nick TG 3:43 pm: "most times they're recording multiple clips ... auto-upload but stay on that same page"):
  // the take goes up IN THE BACKGROUND through the same upload queue as Choose your clips (upAdd), into this session's one batch, and the
  // camera comes straight back for the next take. The phone copy (IndexedDB) is dropped only once the server has the file.
  if (!FLS.take || !FLS.take.blob.size) return;
  const t = FLS.take, s = fl111Sess(), file = new File([t.blob], t.name, { type: t.mime || "video/mp4", lastModified: t.lm });
  s.n++; t.no = s.n; s.takes.push({ no: s.n, lid: t.id, name: t.name, size: file.size, ok: t.verdict.ok });
  FLS.used = { name: t.name, size: file.size, type: file.type, verdict: t.verdict.ok, batch: s.batch, no: s.n };
  Promise.resolve(t.saved).then(() => { if (t.id) fl111Tx("readwrite", st => st.put(Object.assign({}, t.rec || {}, { state: "use", no: s.n }))).catch(() => {}); });
  const dr = S.draft || FLS.dr;
  if (dr) { const pend = upList(nfUpReel()).filter(x => x.state === "up" || x.state === "wait").length;
    dr.uploadTapped = true; dr.upAt = dr.upAt && Date.now() - dr.upAt < 6 * 3600000 ? dr.upAt : Date.now(); dr.popped = false; dr.at = Date.now();
    try { dr.upExpect = Math.max(1, nfFacts(dr).arr.n + pend + 1); } catch {} try { store("draft", dr); } catch {} }
  upAdd([file], { reel: s.reel, batch: s.batch, of: 1, lid: "t" + s.n + "_", idb: [t.id || ""] }); FLS.usedVia = "upAdd";
  FLS.take = null; FLS.readySaid = false; FLS.log = []; FLS.t0 = 0;
  fl106Camera();
}
/* FILMLUMI111 helpers. Session = one draft reel: the first used take makes its upload batch, every later take joins it, Done hands over
   to New reel (name, style or Let Lumi choose, Start editing), which sends the brief with that batch id like any upload. */
function fl111Sess() { return FLS.sess || (FLS.sess = { batch: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), n: 0, takes: [], reel: (() => { try { return nfUpReel(); } catch { return "new"; } })() }); }
function fl111Crop(vw, vh) {
  const A = FLS.orient === "wide" ? 16 / 9 : 9 / 16; vw = vw || 1; vh = vh || 1;
  let cw, ch; if (vw / vh > A) { ch = vh; cw = Math.round(vh * A); } else { cw = vw; ch = Math.round(vw / A); }
  return { A, cw, ch, sx: Math.round((vw - cw) / 2), sy: Math.round((vh - ch) / 2), full: Math.abs(cw - vw) <= 2 && Math.abs(ch - vh) <= 2 };
}
function fl111SetOr(o) {
  o = o === "wide" ? "wide" : "tall"; const ch = FLS.orient !== o; FLS.orient = o; FLS.hist = [];
  document.querySelectorAll("[data-or111]").forEach(b => b.classList.toggle("on", b.dataset.or111 === o));
  if (ch) { FLS.badSince = {}; FLS.greenSince = 0; FLS.readySaid = false; requestAnimationFrame(fl106Fit); }
}
function fl111AutoOr(force) {   // turning the phone sideways picks Wide, upright picks Tall, unless the switch was tapped
  if (!FLS.on) return; if (!FLS.orient) FLS.orient = "tall";
  if (!FLS.orManual && FLS.phase === "live") { const want = window.innerWidth > window.innerHeight ? "wide" : "tall"; if (want !== FLS.orient || force) { fl111SetOr(want); return; } }
  if (force) fl111SetOr(FLS.orient);
  fl111OrLock();
}
function fl111OrLock() { const lock = FLS.phase === "count" || FLS.phase === "rec" || FLS.phase === "checking"; document.querySelectorAll("[data-or111]").forEach(b => b.disabled = lock); }
function fl111Name(t) { const d = new Date(), p = n => String(n).padStart(2, "0");
  return "Film with Lumi " + d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds()) + "." + (/mp4/.test(t.mime) ? "mp4" : "webm"); }
let FL111DBP = null;
function fl111Db() { return FL111DBP || (FL111DBP = new Promise((res, rej) => { try { const r = indexedDB.open("lumi_fl111", 1);
  r.onupgradeneeded = () => { try { r.result.createObjectStore("takes", { keyPath: "id" }); } catch {} }; r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); } catch (e) { rej(e); } }).catch(e => { FL111DBP = null; throw e; })); }
async function fl111Tx(mode, fn) { const db = await fl111Db();
  return new Promise((res, rej) => { const t = db.transaction("takes", mode), q = fn(t.objectStore("takes")); let out; if (q) q.onsuccess = () => { out = q.result; }; t.oncomplete = () => res(out); t.onerror = t.onabort = () => rej(t.error); }); }
function fl111Del(id) { if (!id) return Promise.resolve(); return fl111Tx("readwrite", st => st.delete(id)).catch(() => {}); }
function fl111Keep(t) {
  const s = fl111Sess(); t.name = fl111Name(t); t.lm = Date.now(); t.id = "t" + t.lm.toString(36) + Math.random().toString(36).slice(2, 6);
  t.rec = { id: t.id, k: typeof K === "string" ? K : "", at: t.lm, name: t.name, type: t.mime || "video/mp4", lm: t.lm, size: t.blob.size, reel: s.reel, batch: s.batch, or: t.or, ok: !!t.verdict.ok, state: "recorded", blob: t.blob };
  t.saved = fl111Tx("readwrite", st => st.put(t.rec)).then(() => true).catch(async () => {   // some iPhones refuse a Blob in IndexedDB: keep the bytes instead
    try { const buf = await t.blob.arrayBuffer(); t.rec = Object.assign({}, t.rec, { blob: null, buf }); await fl111Tx("readwrite", st => st.put(t.rec)); return true; } catch { return false; } });
  t.saved.then(ok => { FLS.lastSaved = ok; });
  return t.saved;
}
// next time the app opens: every take still on the phone (recorded, not confirmed uploaded) goes up into its own session batch
async function fl111Resume() {
  if (S.fl111Resumed || typeof indexedDB === "undefined" || !K || K.length !== 24) return; S.fl111Resumed = true;
  let all = []; try { all = (await fl111All()) || []; } catch { return; }
  const live = new Set(upState().items.map(x => x.idb).filter(Boolean)), mine = all.filter(r => r && r.k === K && !live.has(r.id) && !(FLS.take && FLS.take.id === r.id)).sort((a, b) => a.at - b.at);
  if (!mine.length) return;
  const dr = S.draft || (S.draft = { ...DEFAULT_DRAFT(), ...fetchStore("draft", {}) }); dr.uploadTapped = true; dr.upAt = Date.now(); dr.popped = false; try { store("draft", dr); } catch {}
  for (const r of mine) { const b = r.blob || (r.buf ? new Blob([r.buf], { type: r.type }) : null); if (!b || !b.size) { fl111Del(r.id); continue; }
    upAdd([new File([b], r.name, { type: r.type || "video/mp4", lastModified: r.lm })], { reel: r.reel || "new", batch: r.batch, of: 1, lid: "r", idb: [r.id] }); }
  S.fl111Resumed = mine.length;
  try { toast(mine.length === 1 ? "Lumi kept your take from last time. Uploading it now." : "Lumi kept your " + mine.length + " takes from last time. Uploading them now."); } catch {}
  try { render(); } catch {}
}
function fl111All() { return fl111Tx("readonly", st => st.getAll()); }
// the strip under the camera: one pill per used take, with its upload state
function fl111Paint() {
  const el = document.getElementById("fl111takes"), dn = document.getElementById("fl111done"); if (!el) return;
  const s = FLS.sess; if (!s || !s.takes.length) { el.innerHTML = ""; if (dn) dn.style.display = "none"; return; }
  const its = upState().items;
  el.innerHTML = s.takes.map(t => { const it = its.find(x => x.idb === t.lid) || its.find(x => x.name === t.name);
    const st = !it ? "wait" : it.state, pct = it && it.size ? Math.min(99, Math.floor(it.sent / it.size * 100)) : 0;
    const lab = st === "done" ? "✓ Take " + t.no + " uploaded" : st === "fail" ? "! Take " + t.no + " failed, tap to retry" : st === "up" ? "Take " + t.no + " uploading " + pct + "%" : "Take " + t.no + " waiting";
    return `<span class="${st}" data-take111="${t.no}" data-st="${st}">${esc(lab)}</span>`; }).join("");
  el.querySelectorAll("span.fail").forEach(x => x.onclick = () => { upRetryFailed(); fl111Paint(); });
  if (dn) { dn.style.display = ""; dn.disabled = FLS.phase !== "live"; }
}
window.__fl111Paint = () => { if (FLS.on) fl111Paint(); };
function fl111Done() {
  // finish the session: the camera closes, New reel lists every take (still uploading ones keep going) and asks for the reel's name,
  // then the usual style pages (a template, Let Lumi choose, or custom) and Start editing send the brief with this session's batch
  if (FLS.phase !== "live") return;
  FLS.doneSess = FLS.sess ? { batch: FLS.sess.batch, n: FLS.sess.n } : null;
  fl106Close(); FLS.sess = null;
  if (!(S.view === "new" && S.step === 1)) { try { go("new"); } catch {} } else render();
}
function fl106Stop() {
  clearInterval(FLS.tick); clearInterval(FLS.countT); clearInterval(FLS.clock);
  try { if (FLS.mr && FLS.mr.state !== "inactive") { FLS.mr.onstop = null; FLS.mr.stop(); } } catch {}
  try { FLS.stream && FLS.stream.getTracks().forEach(t => t.stop()); } catch {} FLS.stream = null; if (window.lumiRecOff) window.lumiRecOff();   // FL106REC
  try { FLS.ac && FLS.ac.close(); } catch {} FLS.ac = null; FLS.an = null;
  try { FLS.audio && FLS.audio.pause(); } catch {}
  window.removeEventListener("resize", fl106Fit);
}
function fl106Close(quiet) {
  fl106Stop(); FLS.on = false; FLS.phase = "closed"; const el = $("#fl106"); if (el) el.remove();
  if (!quiet && FLS.sess && FLS.sess.takes.length) { FLS.sess = null; try { if (S.view === "new") render(); } catch {} }   // FILMLUMI111: closing with takes = they are in New reel
  if (!quiet && FLS.take && FLS.take.id) { const t = FLS.take; Promise.resolve(t.saved).then(() => fl111Del(t.id)); }   // closing on the take screen = not wanted, like Retake (a crash or a closed app keeps it)
  if (!quiet) FLS.take = null;
}
