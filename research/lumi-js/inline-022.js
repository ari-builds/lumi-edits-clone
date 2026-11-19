/* LONG196 [M5 Max MBP] 2026-11-11 lane LONG196 (Nick, Telegram 24361). Three things in the New reel flow and one question at first sign-in:
   1. PASTE A LINK: a third way in beside "Choose your clips" and "Film with Lumi". The link rides the brief ("Video: at this link, ...",
      the line the Mac already reads); the Mac downloads it (linkin196.py) and the reel goes on like an uploaded clip.
   2. VERTICAL OR HORIZONTAL: asked only when the footage is horizontal (each picked clip is measured on this phone; a link is measured by
      api/upload action "linkinfo" when the site tells us, otherwise the question reads "If your video is horizontal"). Under 3 minutes
      vertical is preselected; longer = they must choose. The answer is one brief line aspect183.py reads: "Format: vertical 9:16 for
      Reels and TikTok" or "Format: keep it horizontal 16:9". Vertical footage is never asked.
   3. LONG VIDEO: 5 minutes or longer, or an account that said "Long videos": "Cut this into shorts" with 3, 5 or 10 and optional notes
      (brief lines "Long video: cut this into shorts", "Shorts: N", "Shorts notes: ..."; the Mac's longform196.py does the rest).
   4. FIRST SIGN-IN: "What will you mostly send us?" once per account (snapshot account.send196, intent kind sendtype196), changeable in
      the account sheet. Everything here is additive: a draft with no link, no horizontal clip and no long video writes no new brief line. */
const L196 = { LONG_S: 300, DEF_S: 180, VERT: "Format: vertical 9:16 for Reels and TikTok", HORIZ: "Format: keep it horizontal 16:9" };
function l196Url(s) { s = String(s || "").trim(); if (!s) return ""; if (/\s/.test(s)) return null;
  const u = /^[a-z][a-z0-9+.\-]*:\/\//i.test(s) ? s : "https://" + s.replace(/^\/+/, "");
  try { const x = new URL(u), h = x.hostname.toLowerCase();
    if (x.protocol !== "https:" || x.username || x.password || (x.port && x.port !== "443")) return null;
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(h) || /^\d+(\.\d+){3}$/.test(h) || /\.(local|internal|lan|home|test|invalid|localhost)$/.test(h) || !/[a-z]{2,}$/.test(h)) return null;
    return x.href; } catch (e) { return null; } }
function l196S(dr) { return dr.l196 || (dr.l196 = {}); }
function l196Send() { try { return ((S.data || {}).account || {}).send196 || fetchStore("send196", "") || ""; } catch (e) { return ""; } }
function l196Facts(dr) { const s = l196S(dr), fl = Object.values(s.files || {}), u = l196Url(dr.videoUrl), lk = u && s.link && s.link.url === u ? s.link : null;
  const hasLink = !!u, land = fl.some(x => x.w > x.h * 1.1) || !!(lk && lk.w > lk.h * 1.1), linkSized = !!(lk && lk.w && lk.h);
  const linkVert = !!(lk && linkSized && lk.h > lk.w * 1.1), dur = Math.max(0, ...fl.map(x => x.dur || 0), (lk && lk.dur) || 0), durKnown = fl.length > 0 || !!(lk && lk.dur);
  const linkUnknown = hasLink && !linkSized, acct = l196Send(), long = dur >= L196.LONG_S, has = fl.length > 0 || hasLink;
  return { has, hasLink, land, linkUnknown, linkVert, dur, durKnown, long, acct, askOrient: land || linkUnknown, offerShorts: has && (long || acct === "long" || (hasLink && !durKnown)), lk }; }
function l196Orient(dr) { const s = l196S(dr), f = l196Facts(dr); if (!f.askOrient) return ""; if (s.orient === "v" || s.orient === "h") return s.orient;
  return f.land && f.durKnown && f.dur < L196.DEF_S ? "v" : ""; }
function l196Mode(dr) { const s = l196S(dr), f = l196Facts(dr); if (!f.offerShorts) return "one"; if (s.mode === "shorts" || s.mode === "one") return s.mode; return f.long || f.acct === "long" ? "shorts" : "one"; }
function l196Lines(d) { const f = l196Facts(d), s = l196S(d), out = [];
  if (f.offerShorts && l196Mode(d) === "shorts") { out.push("Long video: cut this into shorts"); out.push("Shorts: " + ([3, 5, 10].includes(s.count) ? s.count : 5));
    const n = String(s.notes || "").replace(/\s+/g, " ").trim().slice(0, 1500); if (n) out.push("Shorts notes: " + n); }
  const o = l196Orient(d); if (o === "v") out.push(L196.VERT); else if (o === "h") out.push(L196.HORIZ);
  return out; }
function l196Block(dr) { if (String(dr.videoUrl || "").trim() && l196Url(dr.videoUrl) === null) return "That link does not look right. Paste the full link, or clear it.";
  const f = l196Facts(dr); if (f.askOrient && !l196Orient(dr)) return "One more thing: vertical or horizontal? Pick one.";
  return ""; }
const l196Dur = t => { t = Math.round(t || 0); const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60; return h ? h + " h " + m + " min" : m ? m + " min" + (m < 10 && s ? " " + s + " s" : "") : s + " s"; };
function l196LinkLine(dr) { const raw = String(dr.videoUrl || "").trim(), u = l196Url(raw); if (!raw) return "";
  if (u === null) return "That link does not look right. Paste the full link, starting with https.";
  const f = l196Facts(dr), lk = f.lk; if (lk && lk.state === "private") return "That video looks private. Make it public or unlisted, or upload the file instead.";
  if (lk && lk.state === "gone") return "We can't find a video at that link. Check it, or upload the file instead.";
  if (lk && lk.title) return "Found it: " + lk.title + (lk.dur ? " (" + l196Dur(lk.dur) + ")" : "") + ". We download it when you send your brief.";
  return "Got your link. We download it when you send your brief."; }
function l196LinkHtml(dr) { const s = l196S(dr), open = !!(String(dr.videoUrl || "").trim() || s.open), bad = l196Url(dr.videoUrl) === null;
  return `<button type="button" class="btn line block l196btn" id="l196btn" aria-expanded="${open ? "true" : "false"}">Paste a link</button>
    <div class="card l196link${open ? "" : " l196off"}" id="l196link"><b>Paste a link</b><p class="muted">YouTube, Instagram, TikTok, Vimeo, Google Drive or Dropbox. We download the video and edit it for you.</p>
      <input class="text" id="vurl" inputmode="url" autocapitalize="off" autocorrect="off" autocomplete="off" spellcheck="false" aria-label="Link to your video" placeholder="https://youtube.com/watch?v=..." value="${esc(dr.videoUrl)}">
      <p class="muted l196st${bad ? " bad" : ""}" id="l196st" aria-live="polite">${esc(l196LinkLine(dr))}</p></div>
    <div id="l196ask">${l196AskInner(dr)}</div>`; }
function l196AskInner(dr) { const f = l196Facts(dr), s = l196S(dr); let h = "";
  if (f.offerShorts) { const m = l196Mode(dr), n = [3, 5, 10].includes(s.count) ? s.count : 5;
    h += `<div class="card l196card" id="l196shorts"><b>${f.long ? "This is a long video (" + esc(l196Dur(f.dur)) + ")." : "Is this a long video?"}</b><p class="muted">We can cut it into shorts for Reels and TikTok. Each one gets a hook, a reason to keep watching and a payoff, 10 to 45 seconds.</p>
      <div class="l196opts"><button type="button" class="l196opt${m === "shorts" ? " on" : ""}" data-l196m="shorts">Cut this into shorts</button><button type="button" class="l196opt${m === "one" ? " on" : ""}" data-l196m="one">Make one reel</button></div>
      ${m === "shorts" ? `<p class="l196sub">How many shorts?</p><div class="l196opts three">${[3, 5, 10].map(x => `<button type="button" class="l196opt${n === x ? " on" : ""}" data-l196n="${x}">${x}</button>`).join("")}</div>
      <textarea class="text" id="l196notes" rows="2" aria-label="Notes for your shorts" placeholder="Anything we should look for? (optional)">${esc(s.notes || "")}</textarea>` : ""}</div>`; }
  if (f.askOrient) { const o = l196Orient(dr);
    h += `<div class="card l196card" id="l196orient"><b>${f.land ? "Your video is horizontal. How do you want it?" : "If your video is horizontal, how do you want it?"}</b>
      <div class="l196opts"><button type="button" class="l196opt${o === "v" ? " on" : ""}" data-l196o="v">Vertical<small>for Reels and TikTok</small></button><button type="button" class="l196opt${o === "h" ? " on" : ""}" data-l196o="h">Keep it horizontal<small>wide, as filmed</small></button></div>
      ${o ? "" : `<p class="l196need">Pick one to go on.</p>`}</div>`; }
  return h; }
function l196Save() { try { store("draft", S.draft); } catch (e) {} }
function l196Paint() { const dr = S.draft; if (!dr) return; const st = document.getElementById("l196st"), ask = document.getElementById("l196ask");
  if (st) { st.textContent = l196LinkLine(dr); st.classList.toggle("bad", l196Url(dr.videoUrl) === null); } if (ask) ask.innerHTML = l196AskInner(dr); }
let _l196t = 0;
function l196Info(dr) { const u = l196Url(dr.videoUrl), s = l196S(dr); clearTimeout(_l196t); if (!u) return; if (s.link && s.link.url === u) return;
  if (!/(^|\.)(youtube\.com|youtu\.be|vimeo\.com|tiktok\.com)$/i.test(new URL(u).hostname)) return;
  _l196t = setTimeout(async () => { try { const r = await fetch("/api/upload", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ k: K, action: "linkinfo", url: u }) }); const j = await r.json();
      if (j && j.ok && l196Url((S.draft || {}).videoUrl) === u) { l196S(S.draft).link = { url: u, w: Number(j.w) || 0, h: Number(j.h) || 0, dur: Number(j.dur) || 0, title: String(j.title || "").slice(0, 140), site: j.site || "", state: j.state || "" }; l196Save(); l196Paint(); } } catch (e) {} }, 700); }
function l196Measure(file) { return new Promise(res => { let done = false, u = "", v = null; const fin = x => { if (done) return; done = true; try { v && v.remove(); } catch (e) {} try { URL.revokeObjectURL(u); } catch (e) {} res(x); };
  if (!file || (!/^video\//.test(file.type || "") && !/\.(mp4|mov|m4v|mkv|webm|avi)$/i.test(file.name || ""))) return res(null);
  // the same hidden, muted, inline video the upload thumbnails use (that way of reading a picked clip is proven on iPhones): its real picture size, rotation applied
  try { u = URL.createObjectURL(file); } catch (e) { return res(null); }
  v = document.createElement("video"); v.muted = true; v.defaultMuted = true; v.playsInline = true; v.setAttribute("playsinline", ""); v.setAttribute("webkit-playsinline", ""); v.setAttribute("muted", ""); v.preload = "auto";
  v.style.cssText = "position:fixed;left:0;top:0;width:8px;height:8px;opacity:0.01;pointer-events:none;z-index:-1"; try { document.body.appendChild(v); } catch (e) {}
  const ok = () => { if (v.videoWidth && v.videoHeight) fin({ w: v.videoWidth, h: v.videoHeight, dur: isFinite(v.duration) ? Math.round(v.duration * 10) / 10 : 0 }); };
  v.onloadedmetadata = ok; v.onloadeddata = ok; v.onerror = () => fin(null); setTimeout(() => fin(null), 12000); v.src = u; try { v.load(); } catch (e) {} }); }
document.addEventListener("change", e => { const t = e.target; if (!t || t.id !== "upfile" || !t.files || !t.files.length) return; const fs = [...t.files];
  Promise.all(fs.map(l196Measure)).then(ms => { const dr = S.draft; if (!dr) return; const s = l196S(dr); s.files = s.files || {}; let any = false;
    ms.forEach((m, i) => { if (m) { s.files[(fs[i].name || "clip") + ":" + fs[i].size] = m; any = true; } });
    if (any) { l196Save(); if (S.view === "new" && document.getElementById("l196ask")) l196Paint(); } }); }, true);
document.addEventListener("input", e => { const t = e.target, dr = S.draft; if (!t || !dr) return;
  if (t.id === "vurl") { setTimeout(() => { l196Paint(); l196Info(dr); }, 0); }
  if (t.id === "l196notes") { l196S(dr).notes = t.value; l196Save(); } });
document.addEventListener("click", e => { const b = e.target && e.target.closest ? e.target.closest("#l196btn,[data-l196o],[data-l196m],[data-l196n],[data-s196]") : null; if (!b) return;
  if (b.dataset.s196) { const v = b.dataset.s196; store("send196", v); try { (S.data.account || (S.data.account = {})).send196 = v; } catch (e2) {}
    try { sendQuiet({ kind: "sendtype196", choice: v }); } catch (e2) {}
    document.querySelectorAll("[data-s196]").forEach(x => x.classList.toggle("on", x === b));
    if (b.closest(".s196first")) { try { closeSheet(); } catch (e2) {} toast(v === "long" ? "Got it. Send a long video and we cut the shorts." : "Got it. Thank you."); }
    return; }
  const dr = S.draft; if (!dr) return; const s = l196S(dr);
  if (b.id === "l196btn") { const c = document.getElementById("l196link"); if (!c) return; const openNow = !c.classList.contains("l196off");
    s.open = String(dr.videoUrl || "").trim() ? true : !openNow; c.classList.toggle("l196off", !s.open); b.setAttribute("aria-expanded", s.open ? "true" : "false");
    if (s.open) { const i = document.getElementById("vurl"); if (i) i.focus(); } l196Save(); return; }
  if (b.dataset.l196o) s.orient = b.dataset.l196o; if (b.dataset.l196m) s.mode = b.dataset.l196m; if (b.dataset.l196n) s.count = Number(b.dataset.l196n);
  l196Save(); l196Paint(); });
const L196_SEND = [["short", "Short clips", "under 5 minutes each"], ["long", "Long videos to cut into shorts", "5 minutes or more: sermons, podcasts, talks"], ["both", "Both", "some of each"]];
function l196SendOpts(cur) { return L196_SEND.map(([k, t, sub]) => `<button type="button" class="l196opt${cur === k ? " on" : ""}" data-s196="${k}">${t}<small>${sub}</small></button>`).join(""); }
function l196AcctHtml() { return `<div class="eyebrow" style="margin:4px 0 8px">What you mostly send us</div><div class="s196 s196row">${l196SendOpts(l196Send())}</div>`; }
function l196First() { const d = S.data; if (!d || !d.account || !K || S._l196asked || d.account.send196 || fetchStore("send196", "")) return;
  if (S.view !== "home" || document.getElementById("celebrate") || document.querySelector("#sheet.on")) return;
  S._l196asked = true;
  setTimeout(() => { if (document.querySelector("#sheet.on") || document.getElementById("celebrate") || S.view !== "home") { S._l196asked = false; return; }
    sheet(`<div class="s196 s196first"><h3 style="font-size:22px;font-family:var(--serif);font-weight:400;margin:0 0 6px">What will you mostly send us?</h3><p class="muted" style="margin:0 0 14px">So we set Lumi up for you. You can change it any time in your account.</p>${l196SendOpts("")}</div>`); }, 900); }
