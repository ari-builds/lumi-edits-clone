
var SHOW_COLOR = false;   // APPCOLOR178 [M5 Max MBP] 2026-11-04 19:00 PST: client color picks hidden for now (Nick TG Nov 4). See the APPCOLOR178 note above STAB.
// [M5 Max MBP] 2026-10-01 06:50 PDT qafix: ?theme= is read by the appearance script in <head> now (it used to set data-theme, which nothing styled from)
/* ---------- sign in: NO PASSWORDS (Nick 2026-09-25). Email -> one-tap link -> this phone stays signed in for a year. ---------- */
const SESSION = "lumi_session";
function getSession() { try { const x = JSON.parse(localStorage.getItem(SESSION)); return x && x.k && x.exp > Date.now() ? x : null; } catch { return null; } }
function setSession(k) { try { localStorage.setItem(SESSION, JSON.stringify({ k, exp: Date.now() + 365 * 864e5 })); } catch {}
  // [M5 Max MBP] 2026-09-26: a sign-in that succeeds from the ?signin=1 preview must leave preview mode, else load() showed the email screen again ("entered the code and nothing happened")
  try { if (QS.get("signin") === "1") { QS.delete("signin"); history.replaceState(null, "", location.pathname + (QS.toString() ? "?" + QS : "")); } } catch {} }
// Device token (Nick 2026-09-26: a 6-digit code the first time on a new phone): random, stays on this device, lets the server remember it.
function devId() { try { let d = localStorage.getItem("lumi_dev"); if (!/^[a-f0-9]{32}$/.test(d || "")) { d = [...crypto.getRandomValues(new Uint8Array(16))].map(x => x.toString(16).padStart(2, "0")).join(""); localStorage.setItem("lumi_dev", d); } return d; } catch { return [...crypto.getRandomValues(new Uint8Array(16))].map(x => x.toString(16).padStart(2, "0")).join(""); } }
async function signinPost(body) { const r = await fetch("/api/signin", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...body, dev: devId() }) }); try { return await r.json(); } catch { return { ok: false, error: "Please try again." }; } }
// [M5 Max MBP] 2026-09-29 sweep: signing out of this phone ROTATES the device token (so the server no longer knows this phone and the
// next sign-in needs the 6-digit code again) and removes every cached key of that account (sent chat text, read markers, drafts).
function signOut() { try { const k = K || (getSession() || {}).k || ""; localStorage.removeItem(SESSION);
    const d = [...crypto.getRandomValues(new Uint8Array(16))].map(x => x.toString(16).padStart(2, "0")).join(""); localStorage.setItem("lumi_dev", d);
    const drop = []; for (let i = 0; i < localStorage.length; i++) { const n = localStorage.key(i) || ""; if ((k && n.includes(k)) || n === "lumi_presence_at" || n === "lumi_newacct") drop.push(n); }
    drop.forEach(n => localStorage.removeItem(n)); } catch {} location.href = "/"; }
// ADSBTN50 [M5 Max MBP] 2026-10-26 09:55 PDT: what the "Upload for Sabbir" button shows (owner accounts only), from the snapshot's ads_sync status
function adsSyncLine() { const a = (S.data || {}).ads_sync; if (!a || !a.text) return "Checks your approved ads against his folder, uploads what is missing, and tells him only when something new went up.";
  if (a.state === "checking" && Date.now() - (Number(a.at) || 0) * 1000 > 20 * 60000) return "The last check did not finish. Tap again."; return String(a.text); }
// UPADS145 [M5 Max MBP] 2026-11-02 09:0x PST (Nick TG 22036 + correction 22040): what the "Upload ads" (TikTok) button shows, owner accounts only.
// One tap, no file picker: the Mac uploads every approved ad not yet in the Drive folder "Lumi TikTok Ads" and pings Lumo's TikTok loop.
function ttAdsLine() { const a = (S.data || {}).tt_ads; if (!a || !a.text) return "Adds your approved ads that are not in the TikTok folder yet. Lumo posts from that folder, never the same ad twice.";
  if (a.state === "checking" && Date.now() - (Number(a.at) || 0) * 1000 > 20 * 60000) return "The last check did not finish. Tap again."; return String(a.text); }
// [M5 Max MBP] 2026-10-01 06:49 PDT qafix: Sign out asks first (one stray tap used to sign the phone out and need a new code)
function confirmSignOut() {
  sheet(`<h3 style="font-size:22px;font-family:var(--serif);font-weight:400;margin:0 0 10px">Sign out of Lumi?</h3><p class="muted" style="margin:0 0 16px">Type your email again to sign back in on this phone.</p>
    <div class="row"><button class="btn line" id="socancel" style="flex:1">Cancel</button><button class="btn primary" id="soyes" style="flex:1">Sign out</button></div>`);
  $("#soyes").onclick = signOut; $("#socancel").onclick = () => closeSheet();
}
// [M5 Max MBP] 2026-09-29 sweep: header and tabs only work once the account has loaded. Before that (sign in, Setting up, Could not load)
// the inbox button and tabs are hidden and the avatar offers Sign out, instead of dead controls.
// AVATAR50 2026-10-26 09:17 PDT (Nick TG 08:38 + 09:17): one coloured initials avatar per client, used in the header AND in the chat
function myAvatar() { const d = S.data || {}, full = String(d.full_name || d.name || "").trim(), w = full.split(/\s+/).filter(Boolean);
  const g1 = x => Array.from(String(x || ""))[0] || ""; const ini0 = (w.length > 1 ? (g1(w[0]) + g1(w[w.length - 1])) : (w[0] ? g1(w[0]) : "·")).toLocaleUpperCase(); const ini = Array.from(ini0).slice(0, 2).join("") || "·";   // [M5 Max MBP] 2026-10-26 09:38 PDT SWEEP2: whole glyphs (emoji, accents), never more than 2 characters
  let h = 0; for (const c of (full || "lumi").toLowerCase()) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const PAL = ["#5B7CFA", "#E5677D", "#2BA88A", "#F2994A", "#9B6BDE", "#1F9BCF", "#D9A426", "#E0569B", "#4CAF6A", "#7A86F0", "#C8553D", "#3D9DA6"];
  return { ini, color: PAL[h % PAL.length] }; }
function preChrome(avatarOn) {
  document.querySelectorAll("nav, #hinbox").forEach(el => el.style.display = "none");
  const a = $("#avatar"); if (!a) return; a.style.display = avatarOn ? "" : "none"; a.textContent = "·";
  a.onclick = () => { sheet(`<h3 style="font-size:22px;font-family:var(--serif);font-weight:400;margin:0 0 10px">Your account</h3><p class="muted" style="margin:0 0 14px">Your account has not loaded yet.</p><div class="row"><button class="btn line" id="so" style="flex:1">Sign out of this phone</button><button class="btn primary" id="close">Close</button></div><p class="privl"><a href="/privacy">Privacy</a></p>`); $("#so").onclick = confirmSignOut; $("#close").onclick = closeSheet; };
}
const QS = new URLSearchParams(location.search);
// CONV50 [M5 Max MBP] 2026-10-29: FIRST-TOUCH SOURCE. A visit with ?ref=CODE (a client's referral link) or utm_* / fbclid (ads) is kept on this
// phone (30 days; a referral beats a plain ad source) and sent once with a NEW sign-up (api/signin.js -> app_signin -> conv50: referral credit +
// board attribution). Nothing else reads it.
const SRC50K = ["ref", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
(() => { try { const got = {}; SRC50K.forEach(k => { const v = QS.get(k); if (v) got[k] = String(v).replace(/[^A-Za-z0-9._:\/ -]/g, "").slice(0, 80); }); if (QS.get("fbclid")) got.fbclid = "1";
  if (!Object.keys(got).length) return; let old = null; try { old = JSON.parse(localStorage.getItem("lumi_src") || "null"); } catch {}
  if (!old || (got.ref && !old.ref) || Date.now() - (Number(old.first_at) || 0) > 30 * 864e5) localStorage.setItem("lumi_src", JSON.stringify({ ...got, landing: location.pathname.slice(0, 60), first_at: Date.now() })); } catch {} })();
const srcOf = () => { try { const o = JSON.parse(localStorage.getItem("lumi_src") || "null"); return o && typeof o === "object" ? o : undefined; } catch { return undefined; } };
let K = (QS.get("k") || "").replace(/[^a-f0-9]/g, "").slice(0, 24);
if (K.length === 24) setSession(K); else K = (getSession() || {}).k || "";
// [M5 Max MBP] 2026-09-27 19:25 PDT: the key never stays in the address bar (screenshots, shared links, history). Saved above, then removed.
if (QS.has("k") && getSession()) { try { QS.delete("k"); history.replaceState(null, "", location.pathname + (QS.toString() ? "?" + QS : "") + location.hash); } catch {} }
// HANDOFF178 [M5 Max MBP] 2026-11-05 7:58 PM PST: PHONE HAND-OFF. The Lumi Mac app's QR carries ?h=<token> (8 to 16 letters/digits, made on the Mac, never the account key).
// Kept on this phone for 2 hours (survives sign-in), then taken out of the address bar. Only the QR path has one; nothing else reads it.
const HO178 = (() => { let t = "", at = 0; try { const q = String(QS.get("h") || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 16);
  if (q.length >= 8) { localStorage.setItem("lumi_h178", JSON.stringify({ t: q, at: Date.now() })); QS.delete("h"); history.replaceState(null, "", location.pathname + (QS.toString() ? "?" + QS : "") + location.hash); }
  const o = JSON.parse(localStorage.getItem("lumi_h178") || "null"); if (o && o.t && Date.now() - (o.at || 0) < 2 * 3600000) { t = o.t; at = o.at; } else localStorage.removeItem("lumi_h178"); } catch {}
  return { t, at, last: 0, opened: false, sentAt: 0, busy: false, again: false }; })();
// [M5 Max MBP] 2026-09-29 sweep50: /api/me gives up after 20 s (a hung request left the page blank and stalled the poll loop for good)
const meFetch = () => { const ac = typeof AbortController === "function" ? new AbortController() : null; const t = ac ? setTimeout(() => ac.abort(), 20000) : 0;
  return fetch("/api/me", { cache: "no-store", headers: { "x-lumi-k": K }, ...(ac ? { signal: ac.signal } : {}) }).finally(() => clearTimeout(t)); };
// [M5 Max MBP] 2026-09-29 sweep50: a small banner when the phone is offline or refreshes keep failing, so old data is never shown as live
function netState(ok, why) { let b = document.getElementById("netbanner");
  if (ok) { window.__netFails = 0; if (b) b.remove(); return; }
  if (!b) { b = document.createElement("div"); b.id = "netbanner"; b.setAttribute("role", "status"); document.body.appendChild(b); }
  b.textContent = why || "Could not refresh. Showing what we had.";
  // [M5 Max MBP] 2026-10-01 06:50 PDT qafix: sit just under the header (which grows by the "Save the Lumi app" banner), never on top of it
  try { const h = document.querySelector("header.top"); if (h) { const y = Math.round(h.getBoundingClientRect().bottom); if (y > 0) b.style.top = (y + 8) + "px"; } } catch {} }
window.addEventListener("offline", () => { if (S.data) netState(false, "You are offline. Showing what we had."); });
window.addEventListener("online", () => netState(true));   // the next background refresh brings the data up to date
const S = { data: null, cat: null, view: "home", reel: null, ver: null, pending: {}, rangeIn: null, step: 1, filter: "all", book: "all", draft: null, sent: false };
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const tc = t => { t = Math.max(0, Number(t) || 0); return String(Math.floor(t / 60)).padStart(2, "0") + ":" + (t % 60).toFixed(1).padStart(4, "0"); };
const when = ts => { const d = new Date(ts * 1000), n = new Date(); return d.toDateString() === n.toDateString() ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : d.toLocaleDateString([], { month: "short", day: "numeric" }); };
const ST = { received: ["Received", "We have your video."], editing: ["Editing", "Your reel is in the edit."], review: ["Ready for your review", "Watch it, drop notes on any second, or approve it."], done: ["Approved", "Approved. Post it and tag us."],
  cancelled: ["Cancelled", "This reel was cancelled. Changed your mind? Ask us to undo it within 24 hours."],
  waiting: ["Waiting on you", "We asked you a question about this reel. Answer in Chat or reply to our email and we start."] };   // WAITYOU15 [M5 Max MBP] 2026-10-23: waiting on the client is never "In the edit"   // [M5 Max MBP] 2026-10-01 07:26 PDT qa2fix #7: a cancelled reel never crashes a ST lookup
// [M5 Max MBP] 2026-10-01 (client-app QA, chat BLOCKER): "Use this upload link: https://www.dropbox.com/request/xyz." linked the full stop too,
// and Dropbox answered "This file request has been closed, deleted, or never existed". Trailing . , ; : ! ? ) ] and quotes stay outside the link.
// [M5 Max MBP] 2026-10-01 07:26 PDT qa2fix #9: the URL runs over ESCAPED text, so it stops at an entity (&lt; &gt; &quot; &#39;) instead of swallowing it ("<https://x>" linked
// "x&gt" and left a stray ";"). &amp; inside a URL is a real "&" and stays in. A closing ")" stays when the URL has a matching "(" (Wikipedia style).
const linkify = t => esc(t).replace(/https?:\/\/(?:[^\s<&]|&amp;)+/g, u => { let c = u;
  for (;;) { const m = c.match(/(?:[.,;:!?\]'"]|&amp;|&quot;|&#39;)$/); if (m) { c = c.slice(0, -m[0].length); continue; }
    if (c.endsWith(")") && (c.split("(").length < c.split(")").length)) { c = c.slice(0, -1); continue; } break; }
  if (!/^https?:\/\/[^/]/.test(c)) return u;
  return '<a href="' + c + '" target="_blank" rel="noopener">' + c + '</a>' + u.slice(c.length); });
// [M5 Max MBP] 2026-10-01 07:26 PDT qa2fix #1/#2: one tap at a time. A second tap on the same action inside ms is ignored (a double tap used to skip a step, send twice, open two tabs).
function tapOk(key, ms = 800) { const o = window.__tapAt || (window.__tapAt = {}), t = Date.now(); if (o[key] && t - o[key] < ms) return false; o[key] = t; return true; }
// [M5 Max MBP] 2026-10-01 07:26 PDT qa2fix #8: a pay link is only ever shown when it is Stripe or our own branded pay page
const payUrlOk = u => /^https:\/\/((buy|checkout)\.stripe\.com|lumiedits\.vercel\.app\/pay|(www\.)?lumiedits\.app\/pay)\//i.test(String(u || ""));   // audit 2026-10-07: + lumiedits.app/pay (brand base swap)
// audit 2026-10-07 [M5 Max MBP]: ONE revision sentence everywhere (revision_limit: 5 per reel, 10 once it is paid), and comped / reward-credit
// accounts are never shown prices (app_push sends account.comped; rewards.credits.left).
// revcap10 [M5 Max MBP] 2026-10-09 18:12 PDT (Nick TG 18:10): the sentence is PER CLIENT now (app_push account.revision_line / revision_cap /
// revisions_unlimited from revision_limit.py): 5 per reel never paid, 10 per reel once they have paid for any reel, and Nick's unlimited list
// (Vanessa) never sees a number. Supersedes 2026-10-08 "unlimited once paid".
const revLine = () => { const a = ((S && S.data) || {}).account || {};
  if (a.revisions_unlimited || a.comped) return "Your reels include unlimited revisions.";
  if (a.revision_line) return String(a.revision_line);
  return Number(a.revision_cap) === 10 ? "Every reel includes up to 10 revisions." : "Every reel includes up to 5 revisions, and up to 10 once you have paid for a reel."; };
const isComped = d => !!(d && d.account && d.account.comped);
// [M5 Max MBP] 2026-10-26 09:38 PDT SWEEP2 FILMPRICE50 (Nick 2026-10-24): the snapshot carries price.film, free_max_s and film_max_s. One sentence wherever the per-reel price is explained; nothing when the Mac does not send a film price.
const filmMmss = s => { s = Math.max(0, Number(s) || 0); return Math.floor(s / 60) + ":" + String(Math.round(s % 60)).padStart(2, "0"); };
const filmLine = d => { const p = (d || {}).price || {}; if (!(Number(p.film) > 0)) return ""; return `Free edits and the $${Number(p.reel) || 20} price cover a vertical reel up to ${filmMmss(p.free_max_s || 90)}. A longer or horizontal film, up to ${filmMmss(p.film_max_s || 300)}, is $${Number(p.film)}.`; };
const rwCreditsLeft = d => { const c = ((d || {}).rewards || {}).credits || {}; return Math.max(0, Number(c.left) || 0); };
// [M5 Max MBP] 2026-10-01 07:26 PDT qa2fix #8: only a reel with a delivered version is ever asked to pay (the reel page already hid the button, the Pay tab and badge did not)
// [M5 Max MBP] 2026-10-01 22:47 PDT qa20fix: a reel covered by a gift from Nick never owes. While gift reels are left, every delivered reel
// after the gift's starting point (gift.after, 0 for "your first 3 reels") is a gift reel. The server hides these pay links too (app_push._pay).
function giftCovered(r) { const g = (S.data || {}).gift; if (!g || !(Number(g.free_reels) > 0) || !(Number(g.left) > 0) || !r) return false;
  const after = Number(g.after) || 0; if (!after) return true;
  const firstAt = x => Math.min(...((x.versions || []).map(v => Number(v.at) || Infinity)), Infinity);
  const order = ((S.data || {}).reels || []).filter(x => (x.versions || []).length).sort((a, b) => firstAt(a) - firstAt(b));
  const i = order.indexOf(r); return i < 0 || i >= after; }
const owes = r => !!(r && r.pay && r.status !== "cancelled" && (r.versions || []).length && !giftCovered(r));
// [M5 Max MBP] 2026-10-02 17:36 PDT paylater, Nick: a "paid for" stamp on reels as they are generating and "needs to pay" on the other one. reel.pay_state is computed on the
// Mac (lumi_pay.pay_state) for every reel; the label is shown as sent. A reel covered here by Rewards or a gift says so instead.
const PSTAMP = { paid: "Paid", needs_pay: "Needs to pay", free: "Free", gift: "Gift", comped: "Comped" };
function payStamp(r) { if (!r || r.status === "cancelled") return ""; let ps = r.pay_state; if (!ps || !PSTAMP[ps.key]) return "";
  if (ps.key === "needs_pay" && (r.pay_gift || giftCovered(r))) ps = { key: "gift", label: "Gift" };
  else if (ps.key === "needs_pay" && r.pay_covered) ps = { key: "free", label: "Free" };
  return `<span class="pstamp ps-${esc(ps.key)}">${esc(ps.label || PSTAMP[ps.key])}</span>`; }
// [M5 Max MBP] 2026-10-01 07:26 PDT qa2fix #8: gift wording (snapshot.gift from gifts.py), used on Start, the tour, New reel step 4 and Pay so they all agree
function giftOf(d) { const g = (d || {}).gift; return g && Number(g.free_reels) > 0 ? { n: Number(g.free_reels), left: Math.max(0, Number(g.left) || 0), from: g.from || "Nick", head: g.headline || ("A gift from " + (g.from || "Nick") + ": " + g.free_reels + " free reels") } : null; }
// [M5 Max MBP] 2026-10-01 07:26 PDT qa2fix #10: the first letter of a name as a whole glyph (an emoji-first name used to show half a surrogate pair)
function firstGlyph(n) { n = String(n || "").trim(); if (!n) return "?"; try { if (window.Intl && Intl.Segmenter) { const it = new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(n)[Symbol.iterator]().next(); if (!it.done) return it.value.segment.toUpperCase(); } } catch {} return (Array.from(n)[0] || "?").toUpperCase(); }
const ICON_BACK = '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>';
const CHK = '<svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg>';
const DEFAULT_DRAFT = () => ({ title: "", video: "link", videoUrl: "", lookMode: "pick", look: null, reference: "", refMatch: "", hook: null, glass: null, vine: null, motion: null, captions: "Captions on", music: "Music, plus a version without", musicLink: "", musicNote: "", broll: "No b-roll, just me", brollKind: "", background: "Keep it as filmed", colour: "", notes: "", uploadTapped: false, uploaded: false, videoType: "", intensity: "", brollSet: false });
/* [M5 Max MBP] 2026-10-01 10:52 PDT defaults2: EDITING INTENSITY. One clear choice on every New reel brief: how much editing.
   19 clients said "too basic" and 15 said "too much"; the brief never said which they wanted. New clients default to Polished, a
   returning client to the level of their last approved reel (account.intensity from the Mac). It travels as one brief line. */
const INTENSITY = [["Clean", "Tight cut and captions. No B-roll, zooms or effects."], ["Polished", "Plus light B-roll, gentle zooms and a music bed."],
  ["Punchy", "Faster cuts, more emphasis, sound effects."], ["Full Sauce", "Everything: fastest cuts, B-roll, zooms, motion graphics, SFX and music."]];
const INT_KEY = { clean: "Clean", polished: "Polished", punchy: "Punchy", full_sauce: "Full Sauce" };
function intensityDefault() { const a = ((S.data || {}).account || {}).intensity; return INT_KEY[a] || "Polished"; }
function intensityOf(d) { return INTENSITY.some(x => x[0] === d.intensity) ? d.intensity : intensityDefault(); }
function intensityBlurb(v) { return (INTENSITY.find(x => x[0] === v) || [, ""])[1]; }
function brollVal(dr) {   // what the B-roll row says; untouched B-roll follows the editing level
  if (ringLook(dr) && dr.ring) { const n = brollGot().n; return dr.ring === "own" ? "Carousel: my photos or clips" + (n ? " (" + n + " in)" : "") : "Carousel: Lumi chooses"; }   // [M5 Max MBP] 2026-10-07 carousel2
  if (dr.broll.startsWith("Add")) { const f = brollFillOf(dr), s = brollSrcOf(dr), n = brollGot().n;   // [M5 Max MBP] 2026-10-05 brollpick
    const nm = { own: "My own" + (n ? " (" + n + " in)" : ""), stock_video: "Stock videos", photos: "Photos / images" };
    return f === "auto" ? "You pick for me" : f === "mix" ? "A mix: " + s.map(x => nm[x]).join(", ") : nm[f] || "You pick for me"; }
  if (dr.brollSet) return "No B-roll";
  return intensityOf(dr) === "Clean" ? "None, it is a Clean edit" : "Our call, light and only where it fits";
}
function toast(m) { const t = document.createElement("div"); t.className = "toast"; t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 2600); }
// [M5 Max MBP] 2026-10-06 08:3x PDT (uploadwall). Sabbir (Android Chrome) tapped Upload clips and landed on a Dropbox sign in, then a
// "Dropbox Plus, Free trial" card checkout. The file request itself needs no account (proven: a real upload in headless iPhone and Pixel
// finished with no login). On Android, dropbox.com is a verified App Link of the Dropbox app (assetlinks handle_all_urls), so when that
// app is installed it grabs the link and demands a sign in, then sells Plus. Fix: on Android every Dropbox file request link is opened
// with an explicit browser intent, so the web upload page loads and the Dropbox app never gets the tap. Capture phase, so it covers
// every upload, b-roll and rewards link without touching each button; the buttons' own click handlers still run.
(function () {
  const andr = /Android/i.test(navigator.userAgent);
  if (!andr) return;
  document.addEventListener("click", e => {
    const a = e.target && e.target.closest ? e.target.closest("a[href]") : null; if (!a) return;
    const href = a.getAttribute("href") || "";
    if (!/^https:\/\/(www\.)?dropbox\.com\/request\//i.test(href)) return;
    e.preventDefault();
    const rest = href.replace(/^https:\/\//i, "");
    const pkg = /SamsungBrowser/i.test(navigator.userAgent) ? "com.sec.android.app.sbrowser" : /Firefox/i.test(navigator.userAgent) ? "org.mozilla.firefox" : "com.android.chrome";
    location.href = "intent://" + rest + "#Intent;scheme=https;package=" + pkg + ";S.browser_fallback_url=" + encodeURIComponent(href) + ";end";
  }, true);
})();
function copyUpLink(u) { try { navigator.clipboard.writeText(u).then(() => toast("Link copied. Paste it into Chrome or Safari."), () => prompt("Copy this link:", u)); } catch (e) { prompt("Copy this link:", u); } }
function store(k, v) { try { localStorage.setItem("lumi_" + k + "_" + K, JSON.stringify(v)); } catch {} }
function fetchStore(k, d) { try { return JSON.parse(localStorage.getItem("lumi_" + k + "_" + K)) ?? d; } catch { return d; } }
function empty(title, text) { return `<div class="empty"><img class="dance" src="/lumi/wait.webp" alt=""><b>${esc(title)}</b>${esc(text)}</div>`; }
/* FXLOOKS194 [M5 Max MBP] 2026-11-11 (Nick TG 24171: "You could put it next to motion graphics, like visual effects"; the birds "next to I Tried 12 New Spots" = the Top Stack tile).
   Visual effects = real footage with elements composited in (engine vfx194). They ride the motion graphics pick (role "motion", draft.motion, up to 4)
   so every existing path carries them; section "Visual effects" gives them their own Styles tab. An entry with the same code in looks.json wins. */
/* LEARN196 [M5 Max MBP] 2026-11-11 (Nick TG 24340): VFX4 Spotlight, VFX5 Type wall, VFX7 Clone added first, newest on top */
const VFX194 = [{"code": "VFX4", "ask": "VFX4", "name": "Spotlight", "family": "motion", "book": "any", "role": "motion", "section": "Visual effects", "desc": "The room behind you dims and goes soft for one line while you stay fully lit, then it eases back. It is your real footage, so your face and your words stay exactly as you filmed them. Best on a steady shot of one person, on the line that matters most.", "video": "/vfx/VFX4_ex.mp4?v=lr196", "poster": "/vfx/VFX4_ex.jpg?v=lr196", "solid_video": "/vfx/VFX4_sq.mp4?v=lr196", "solid_poster": "/vfx/VFX4_sq.jpg?v=lr196", "accent": "#E2582A", "head_top": 0.14, "added": "2026-11-11T12:45:00-08:00", "source_ref": "LEARN196 [M5 Max MBP] 2026-11-11 (Nick TG 24340 learnings); example = vfx196 spotlight on Nick's own No Catch RAW 01 (engine grade, COLORGATE194 tile gate pass, frag91 no spans)"}, {"code": "VFX5", "ask": "VFX5", "name": "Type wall", "family": "motion", "book": "any", "role": "motion", "section": "Visual effects", "desc": "The words you are saying fill the space behind you in rows of very large letters, in your caption font, while you stay in front. Each word changes as you say it. Best on a steady shot of one person with some room above or beside them, on one to four short words.", "video": "/vfx/VFX5_ex.mp4?v=lr196", "poster": "/vfx/VFX5_ex.jpg?v=lr196", "solid_video": "/vfx/VFX5_sq.mp4?v=lr196", "solid_poster": "/vfx/VFX5_sq.jpg?v=lr196", "accent": "#E2582A", "head_top": 0.14, "added": "2026-11-11T12:45:00-08:00", "source_ref": "LEARN196 [M5 Max MBP] 2026-11-11 (Nick TG 24340 learnings); example = vfx196 typewall on Nick's own No Catch RAW 01 (engine grade, COLORGATE194 tile gate pass, frag91 no spans)"}, {"code": "VFX7", "ask": "VFX7", "name": "Clone", "family": "motion", "book": "any", "role": "motion", "section": "Visual effects", "desc": "A second you steps out beside you for a beat, then steps back. It is cut from your own footage, so both of you move and speak together. Best on a steady shot with some empty room on one side of you.", "video": "/vfx/VFX7_ex.mp4?v=lr196", "poster": "/vfx/VFX7_ex.jpg?v=lr196", "solid_video": "/vfx/VFX7_sq.mp4?v=lr196", "solid_poster": "/vfx/VFX7_sq.jpg?v=lr196", "accent": "#E2582A", "head_top": 0.145, "added": "2026-11-11T12:45:00-08:00", "source_ref": "LEARN196 [M5 Max MBP] 2026-11-11 (Nick TG 24340 learnings); example = vfx196 clone on Nick's own No Catch RAW 01 (engine grade, COLORGATE194 tile gate pass, frag91 no spans)"}, {"code": "VFX1", "ask": "VFX1", "name": "Flying things", "family": "motion", "book": "any", "role": "motion", "section": "Visual effects", "beside": "F79", "desc": "Small birds circle your head while you talk, passing in front of you and behind you. It is your real footage with the birds added in, so your face and your words stay exactly as you filmed them. Best on a steady shot of one person.", "video": "/vfx/VFX1_ex.mp4?v=fx194", "poster": "/vfx/VFX1_ex.jpg?v=fx194", "solid_video": "/vfx/VFX1_sq.mp4?v=fx194", "solid_poster": "/vfx/VFX1_sq.jpg?v=fx194", "accent": "#C8553D", "head_top": 0.13, "added": "2026-11-11T07:30:00-08:00", "source_ref": "FXLOOKS194 [M5 Max MBP] 2026-11-11 (Nick TG 24171); example = the VFX194 bird shot on Nick's own RAW 01 (engine grade, COLORGATE194 tile gate pass)"}];
const isVfx194 = l => !!(l && l.section === "Visual effects");
let _vx194 = null;
const looks = () => { const L = (S.cat && S.cat.looks) || []; if (!L.length || !VFX194.length) return L; if (!_vx194 || _vx194.src !== L) _vx194 = { src: L, out: [...VFX194.filter(v => !L.some(l => l.code === v.code)), ...L] }; return _vx194.out; };
const byCode = c => looks().find(l => l.code === c);
// [M5 Max MBP] 2026-10-07 20:5x carouselmerge (Nick TG 20:49 "carousel wrap and carousel should be in the same card"): a look with
// variant_of (F36 Carousel Wrap -> F35) is never its own card in Styles, Home, the new-reel grid or the NEW banner. It stays in looks.json
// for the pipeline and is reached by swiping the parent's sheet and through the "Which carousel?" Ring / Wrap step.
const variantsOf = l => l ? looks().filter(x => x.variant_of === l.code) : [];
const FAM = { newest: "Newest", softer: "Softer book", bolder: "Bolder book", glass: "Glass word and blossom vine", motion: "Motion graphics add-ons", hooks: "How your hook lands" };

/* ---------- motion tiles: play only what is on screen ---------- */
// CAPLAG55 [M5 Max MBP] 2026-10-29 (Nick TG: "Caption page is super laggy and slow"): the caption grid has ~90 tiles. Every tile in view used to
// load and play its video (12 at once, each a transparent HEVC/VP9 with a drop-shadow filter) and every loaded video stayed loaded (66 after one
// scroll, ~30 MB). Now: at most PLAYMAX tiles play, the ones nearest the middle of the screen, picked after scrolling settles; a tile that leaves
// the screen drops its video (the lazy <img> still shows); tiles pause while a sheet is open. tile() no longer puts poster= on the <video>: a
// poster attribute loads at once, so all ~90 PNG stills (~10 MB) downloaded on opening the step; the lazy <img> is the still now.
const PLAYMAX = 3, ioVis = new Set(); let ioT = 0;
function ioDrop(el, keep) { const v = el.querySelector("video"); if (!v) return; v.pause(); if (keep || !v.getAttribute("src")) return; el.classList.remove("mvpl"); v.removeAttribute("src"); try { v.load(); } catch {} }
function ioSync() {
  ioT = 0; const vh = innerHeight, vw = innerWidth, sh = document.getElementById("sheet"), sheetOn = !!(sh && sh.classList.contains("on"));
  const sc = el => { const r = el.getBoundingClientRect(); if (!r.width || r.bottom <= 0 || r.top >= vh || r.right <= 0 || r.left >= vw) return Infinity; return Math.abs((r.top + r.bottom) / 2 - vh / 2) + Math.abs((r.left + r.right) / 2 - vw / 2); };
  const live = [...ioVis].filter(el => el.isConnected || (ioVis.delete(el), io.unobserve(el), ioDrop(el), false));
  const pick = new Set(sheetOn ? [] : live.map(el => [sc(el), el]).filter(x => x[0] < Infinity).sort((a, b) => a[0] - b[0]).slice(0, PLAYMAX).map(x => x[1]));
  live.forEach(el => { if (!pick.has(el)) ioDrop(el, sheetOn); });
  pick.forEach(el => { const v = el.querySelector("video"); if (!v) return; if (!v.getAttribute("src") && v.dataset.src) v.src = v.dataset.src; if (v.paused) v.play().catch(() => {}); });
}
const ioLater = (ms = 160) => { clearTimeout(ioT); ioT = setTimeout(ioSync, ms); };
const io = new IntersectionObserver(es => { es.forEach(e => {
  if (!e.target.querySelector("video")) return;
  if (e.isIntersecting) { if (e.target.dataset.ht != null) fitHead(e.target); ioVis.add(e.target); } else { ioVis.delete(e.target); ioDrop(e.target); }
}); ioLater(); }, { rootMargin: "0px", threshold: [0, 0.5] });
document.addEventListener("scroll", () => { if (ioVis.size) ioLater(); }, { capture: true, passive: true });
document.addEventListener("playing", e => { const t = e.target, p = t && t.parentElement; if (t.tagName === "VIDEO" && p && p.classList.contains("mv")) p.classList.add("mvpl"); }, true);
try { new MutationObserver(() => ioLater(60)).observe(document.getElementById("sheet"), { attributes: true, attributeFilter: ["class"] }); } catch {}
// SOLIDCAPS [M5 Max MBP] 2026-10-28 22:3x PDT (Nick TG: "before I click into any of them, they should all pop up on solid backgrounds. Then when I
// click into them, I should be able to scroll over to see how they've been used in a video"): opts.solid = the tile plays the look's
// caption-only / graphic-only preview on a plain background (looks.json solid_video / solid_poster); a look without one keeps its footage demo.
// Tapping still opens the sheet with the footage demo + real reels to swipe through (openLook is unchanged).
function tile(l, opts = {}) {
  const sol = !!(opts.solid && l.solid_video && l.solid_poster), um = sol && typeof uiMedia === "function" ? uiMedia(l) : null, pv = um ? um.poster : sol ? l.solid_poster : l.poster, vv = um ? um.video : sol ? l.solid_video : l.video, hp = sol ? "" : htPos(l);   // STYLES50: captions on the app UI
  const cls = ["mv", opts.size || "", opts.on ? "on" : "", isFresh(l) ? "fresh" : "", sol ? "solid" : "", sol && opts.ui && !(um && um.al) ? "ui" : "", um && um.sq ? "sq" : "", um && um.al ? "al" : "", um && um.al && um.inkL ? "inkL" : ""].join(" ");   // STYLES50: ui = over the app gradient
  return `<div class="${cls}" data-code="${esc(l.code)}" data-act="${esc(opts.act || "open")}"${l.head_top != null && !sol ? ` data-ht="${Number(l.head_top)}"` : ""}>
    <img src="${esc(pv)}" alt="" loading="lazy" decoding="async"${hp}><video muted playsinline loop preload="none" data-src="${esc(vv)}"${hp}></video>
    <div class="shade"></div><span class="sw" style="background:${esc(l.accent)}"></span><span class="newb">NEW</span><span class="chk">${CHK}</span>
    ${opts.nocap ? "" : `<div class="cap">${esc(l.name)}${dispCode(l) ? ` <span class="lcode">(${esc(dispCode(l))})</span>` : ""}${opts.sub ? `<small>${esc(opts.sub)}</small>` : ""}</div>`}</div>`;
}
function armTiles(root = document) { root.querySelectorAll(".mv").forEach(el => io.observe(el)); root.querySelectorAll("[data-ht]").forEach(fitHead); }
/* [M5 Max MBP] 2026-10-07 18:3x PDT newstyle agent. Nick TG 18:17: "The thumbnail for the carousel one that's in Styles in the client app is
   cutting off her head so it needs to be lowered a little bit." A look can carry head_top in looks.json (where the top of the head sits in
   its 9:16 card video, 0 to 1). Every card that crops the video (Styles grid ~1:1, Home strip 16:10, the banner thumb) is framed from the
   card's REAL size so the whole head shows with ~6% of the frame above it. 9:16 cards are not cropped and are left alone. */
// [M5 Max MBP] 2026-10-07 20:2x Nick TG 20:19 "This still isn't right": the Styles tab is drawn while hidden, so fitHead saw clientWidth 0 and
// skipped, leaving the default centre crop (head cut). Baseline inline position for a near-square card, refined by fitHead when visible.
// [M5 Max MBP] 2026-10-07 20:5x Nick TG 20:49 "Now there's too much headroom": head_top is now MEASURED (highest hair point across every
// frame of the card video) and ONE rule frames every card: the hair sits HT_GAP (5%) of the CARD's height below the card top. htPos is the
// same rule for the Styles grid card (1:1.08, r = 0.6075) so the first paint and fitHead agree.
const HT_GAP = 0.05;
function htP(ht, r) { return Math.max(0, Math.min(1, (ht - HT_GAP * r) / (1 - r))); }
function htPos(l) { if (l.head_top == null) return ""; return ` style="object-position:50% ${(htP(Number(l.head_top), 1.08 / (16 / 9)) * 100).toFixed(1)}%"`; }
function fitHead(el) {
  try {
    const ht = Number(el.dataset.ht), w = el.clientWidth, h = el.clientHeight; if (!Number.isFinite(ht) || !w || !h) return;
    const r = h / (w * 16 / 9); if (r >= 0.99) return;   // the source is 9:16; r = share of its height the card shows
    const p = htP(ht, r);
    el.querySelectorAll("img,video").forEach(m => { m.style.objectPosition = "50% " + (p * 100).toFixed(1) + "%"; });
  } catch {}
}
window.addEventListener("resize", () => { clearTimeout(window.__fitT); window.__fitT = setTimeout(() => document.querySelectorAll("[data-ht]").forEach(fitHead), 150); });
/* [M5 Max MBP] 2026-10-07 18:4x PDT newstyle agent. Nick TG 18:17: "when new styles land I want people to get a pop-up ... 'New style has
   landed. Check it out here,' and then the name of it ... That goes globally and once they've clicked on it once, it goes away for good."
   and "The new ones need to have a shimmering iridescent background for 3 days after they've been added and then it goes back to normal."
   ALL DATA DRIVEN from looks.json "added" (build_looks.py stamps a brand-new code with its build time): no code change for the next style.
   Banner: the newest look/effect added in the last 14 days that this ACCOUNT has not dismissed. Tap = opens it in Styles; X = gone too.
   Either way it is gone for good: localStorage (fast) + /api/seen (on the account, so other phones and reloads agree). */
const FRESH_MS = 3 * 86400000, ANN_MS = 14 * 86400000;
const addedAt = l => { const t = Date.parse((l && l.added) || ""); return Number.isFinite(t) ? t : 0; };
// STYLES51 [M5 Max MBP] 2026-10-29: NEW is opt-in. Only looks.json entries with "announce": true count (shimmer, NEW tag, tab dots, banner),
// the newest 3 of them at most. Nick: "I don't need all of these to shimmer as new for every single person ... we're flooding the app".
function announced() { return looks().filter(x => x && x.announce === true && !x.variant_of && addedAt(x)).sort((a, b) => addedAt(b) - addedAt(a)).slice(0, 3).map(x => x.code); }
// NEWGLASS89 [M5 Max MBP] 2026-10-31 (Nick TG: "it should say 'new' in the top corner. When you click on it it's not new anymore ... it still has this
// outline box around it, which it shouldn't have anymore"): a look added in the last 7 days wears NEW until THIS person opens it, then never again.
function lookOpened(code) { try { return Object.prototype.hasOwnProperty.call(fetchStore("lookseen", {}) || {}, code); } catch { return false; } }
function isFresh(l) { const t = addedAt(l), n = Date.now(); return !!l && t > 0 && n >= t && (announced().includes(l.code) ? n - t < FRESH_MS : n - t < 7 * 86400000) && !lookOpened(l.code); }
const annId = l => "style:" + l.code;
const annKind = l => l.role === "motion" ? "effect" : l.role === "hook" ? "hook" : "style";
function annList() {
  const n = Date.now(), names = new Set();
  const ok = new Set(announced());
  return looks().filter(l => { const t = addedAt(l); return ok.has(l.code) && !l.variant_of && t && n >= t && n - t < ANN_MS; }).sort((a, b) => addedAt(b) - addedAt(a))
    .filter(l => { const k = String(l.name || "").toLowerCase(); if (names.has(k)) return false; names.add(k); return true; });   // F17 + M14 twins announce once
}
function annSeen() { return fetchStore("annseen", {}) || {}; }
async function annServer() {
  if (S._annSrv) return S._annSrv;
  try { const r = await fetch("/api/seen", { headers: { "x-lumi-k": K }, cache: "no-store" }); const j = await r.json();
    if (j && j.ok) { S._annSrv = j.ids || []; const loc = annSeen(); for (const id of S._annSrv) if (!loc[id]) loc[id] = 1; store("annseen", loc); } } catch {}
  return S._annSrv || [];
}
async function annFlush() {
  if (S._annFl) return; S._annFl = true;
  try { for (const id of fetchStore("annq", [])) {
      let drop = false;
      try { const r = await fetch("/api/seen", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ k: K, id }) }); drop = r.ok || (r.status >= 400 && r.status < 500 && r.status !== 429); } catch {}
      if (!drop) break;
      store("annq", fetchStore("annq", []).filter(x => x !== id)); } } finally { S._annFl = false; }
}
function annMark(l) {
  const nm = String(l.name || "").toLowerCase(), ids = looks().filter(x => (String(x.name || "").toLowerCase() === nm || x.variant_of === l.code) && addedAt(x)).map(annId);   // carouselmerge: dismissing Carousel covers Carousel Wrap
  const loc = annSeen(), q = fetchStore("annq", []);
  for (const id of ids) { loc[id] = Date.now(); if (!q.includes(id)) q.push(id); }
  store("annseen", loc); store("annq", q); annFlush();
}
function annHide(el) { el.classList.remove("on"); setTimeout(() => el.remove(), 520); }
function annOpen(l) {
  try { closeSheet(); } catch {}
  S.reel = null; S.book = "all"; S.cfam = "all"; S.stab = stabOf(l) || "templates"; S.filter = l.role === "motion" ? "motion" : l.role === "hook" ? "hooks" : (l.role === "glass" || l.role === "vine") ? "glass" : l.family === "newest" ? "newest" : "all";
  go("looks");
  setTimeout(() => { const t = document.querySelector('.mv[data-code="' + l.code + '"]'); if (t) t.scrollIntoView({ block: "center" }); openLook(l.code); }, 380);
}
let ANN_TRIES = 0;
async function annMaybe() {
  try {
    if (K.length !== 24 || !S.data || document.getElementById("nsban")) return;
    await loadCat(); annFlush();
    let cand = annList().filter(l => !annSeen()[annId(l)]); if (!cand.length) return;
    const srv = new Set(await annServer()); cand = cand.filter(l => !srv.has(annId(l)) && !annSeen()[annId(l)]); if (!cand.length) return;
    if (document.querySelector("#coach, #celebrate, .titlepop, .revpop, .promopop, #sheet.on")) { if (ANN_TRIES++ < 75) setTimeout(annMaybe, 4000); return; }
    const l = cand[0], kind = annKind(l), Kd = kind[0].toUpperCase() + kind.slice(1);
    const el = document.createElement("div"); el.id = "nsban"; el.className = "nsban"; el.setAttribute("role", "button"); el.setAttribute("tabindex", "0");
    el.setAttribute("aria-label", "New " + kind + " has landed: " + l.name + ". Open it in Styles.");
    el.innerHTML = `<span class="ni"${l.head_top != null ? ` data-ht="${Number(l.head_top)}"` : ""}><img src="${esc(l.poster)}" alt=""></span><div class="t"><b>New ${kind} has landed. Check it out here</b><span>New ${esc(l.name)} ${Kd}</span></div><button class="x" type="button" aria-label="Dismiss">×</button>`;
    document.body.appendChild(el); fitHead(el.querySelector(".ni"));
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("on")));
    const annAll = () => cand.forEach(annMark);   // ANNAUTO50 [M5 Max MBP] 2026-10-29: one banner per batch of new looks, not one per look per visit
    el.querySelector(".x").onclick = e => { e.stopPropagation(); annAll(); annHide(el); };
    el.onclick = e => { if (e.target.closest(".x")) return; annAll(); annHide(el); annOpen(l); };
    setTimeout(() => { if (el.isConnected) { annAll(); annHide(el); } }, 7000);   // ANNAUTO50: it sat over the top bar until closed (QA 2026-10-29)
    el.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); el.onclick(e); } };
  } catch {}
}
function strip(list, opts = {}) { return `<div class="strip">${list.map(l => tile(l, { ...opts, on: opts.sel ? opts.sel(l) : false, sub: opts.sub ? opts.sub(l) : null })).join("")}</div>`; }

/* ---------- data ---------- */
const CSS_LAND = `<style id="landcss">.land{position:fixed;inset:0;z-index:0;overflow:hidden;background:var(--bg)}
.land .cg{position:absolute;top:-4%;left:-4%;right:-4%;bottom:auto;display:grid;grid-template-columns:repeat(3,1fr);gap:6px;opacity:.26;transform:rotate(-4deg) scale(1.08)}
.land .cg div{aspect-ratio:9/16;border-radius:12px;overflow:hidden;background:#0002}.land .cg img,.land .cg video{width:100%;height:100%;object-fit:cover;display:block}
.land .fade{position:absolute;inset:0;background:linear-gradient(180deg,var(--bg) 0%,transparent 22%,transparent 82%,var(--bg) 100%)}
.gate{position:relative;z-index:1;max-width:420px;margin:0 auto;padding:12vh 20px 40px;text-align:center}
.gate .dance{width:150px;height:150px}.gate h1{margin:6px 0 8px}.gate .sub{margin:0 auto 18px;max-width:340px}
.gate .text{text-align:center;font-size:17px}.gate .card{background:var(--bg);border-radius:18px;padding:18px;box-shadow:0 10px 40px #0002}
@media (prefers-reduced-motion:reduce){.gate .dance{animation:none}}</style>`;
function collage() {
  const c = S.cat || {}, tiles = [...(c.real || []).map(r => ({ p: r.poster, v: r.video })), ...(c.looks || []).filter(l => l.role === "look").map(l => ({ p: l.poster, v: l.video }))].filter(t => t.p).slice(0, 18);
  // [M5 Max MBP] 2026-10-03 17:3x PDT Nick: "Why is this background not a full-screen background?" Few posters = 3 rows and an empty bottom third. Cycle the tiles to 30 so the grid always covers the whole screen.
  const full = tiles.length ? Array.from({ length: 30 }, (_, i) => tiles[i % tiles.length]) : [];
  return `<div class="land"><div class="cg">${full.map((t, i) => `<div>${i < 4 && t.v ? `<video src="${esc(t.v)}" poster="${esc(t.p)}" muted playsinline loop autoplay preload="none"></video>` : `<img src="${esc(t.p)}" alt="">`}</div>`).join("")}</div><div class="fade"></div></div>`;
}
function signInScreen(msg, keepSession) {
  if (!document.getElementById("landcss")) document.head.insertAdjacentHTML("beforeend", CSS_LAND);
  // GUEST54 [M5 Max MBP] 2026-10-29: a guest signs in from a sheet over the page they are on (same email, code and name steps, no password)
  const g54 = !!(typeof S !== "undefined" && S.guest);
  if (!g54) { dock(""); preChrome(false); document.documentElement.classList.add("gatev"); }   // [M5 Max MBP] 2026-10-01 07:26 PDT qa2fix newclient C: compact sign-in layout (CSS html.gatev)
  const gateHtml = `<img class="dance" src="/lumi/welcome.webp" alt="Lumi">
    ${g54 ? `<h1>${esc(S._g54line || "Sign in to Lumi")}</h1><p class="sub">Put in your email. New here? You are set up in a few seconds, no password.</p>` : `<h1>Your reels, <i>all in one place.</i></h1><p class="sub">Put in your email and everything Lumi has made for you opens right here.</p>`}${(srcOf() || {}).ref ? `<p class="sub" id="invited50" style="margin-top:-4px"><b>A friend invited you.</b> Your first reel is free.</p>` : ""}
    <div class="card"><input class="text" id="em" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com" style="margin-bottom:10px">
    <button class="btn primary block" id="go">${g54 ? "Continue" : "Open my Lumi"}</button><p class="muted" id="smsg" style="font-size:14px;margin:10px 0 0;min-height:18px">${esc(msg || "")}</p></div>${keepSession ? `<p style="margin:14px 0 0"><a href="/" id="backacct" style="font-weight:800">Back to my account</a></p>` : ""}<p class="privl"><a href="/privacy">Privacy</a></p>`;
  if (g54) sheet(`<div class="gate g54">${gateHtml}</div>`); else $("#main").innerHTML = collage() + `<div class="gate">${gateHtml}</div>`;   // [M5 Max MBP] 2026-10-01 08:57 PDT privacy footer link, under the card so the button never moves
  // [M5 Max MBP] 2026-10-01 06:48 PDT qafix #3: email-step messages go through smsg() so they scroll into view instead of sitting below the fold.
  const go = async () => {
    // [M5 Max MBP] 2026-09-29 sweep50: an empty email says so instead of a dead button
    const email = ($("#em").value || "").trim(); if (!email) { smsg("Please enter your email."); $("#em").focus(); return; }
    if ($("#go").disabled) return;
    $("#go").disabled = true; smsg("One moment…");
    try { const j = await signinPost({ email });
          if (j.ok && j.known && j.k) { K = j.k; setSession(K); pendingEmail(null); return load(); }
          if (j.ok && j.vt) { pendingEmail(email); return welcome(email, j.vt); }   // EMAILONLY41 2026-10-25 21:14 PDT: new email = name + phone form, no code
          if (j.ok && j.step === "code") { pendingEmail(email); return codeScreen(email); }
          // [M5 Max MBP] 2026-09-28: a rate-limit answer (429, "we just sent you a few codes") used to leave only this line of
          // text, so someone holding a valid code from an earlier email had nowhere to type it. Open the code box with the note.
          // [M5 Max MBP] 2026-09-29 sweep50: only when the answer is about codes. The IP limit ("Too many tries. Please wait") comes
          // back before any code is made, so it stays on the email step instead of promising a code that was never sent.
          if (j.error && /\bcodes?\b/i.test(j.error)) { pendingEmail(email); return codeScreen(email, j.error); }
          smsg(j.error || "Please try again."); }
    catch { smsg("Could not reach Lumi, please try again."); }
    $("#go").disabled = false;
  };
  $("#go").onclick = go; $("#em").onkeydown = e => { if (e.key === "Enter") go(); };
  if (msg) setTimeout(() => smsg(msg), 60);
}
// [M5 Max MBP] 2026-09-29 sweep50: the email waiting for its code survives a reload (iOS drops the tab while the client reads the code in
// Mail). Kept 15 minutes in this tab only, cleared on sign in or "Use a different email".
function pendingEmail(e) { try { if (e === undefined) { const p = JSON.parse(sessionStorage.getItem("lumi_pending_email") || "null"); return p && Date.now() - p.at < 15 * 60000 ? p.email : ""; }
  if (e) sessionStorage.setItem("lumi_pending_email", JSON.stringify({ email: e, at: Date.now() })); else sessionStorage.removeItem("lumi_pending_email"); } catch { return ""; } }
// [M5 Max MBP] 2026-10-26 09:38 PDT SWEEP2: the email that was mid sign-in when the page reloaded (iOS drops the tab) is asked again, and the answer routes the same way as a
// fresh tap: known = in, new = the name and phone form, a code account = the code screen. Anything else leaves the email filled in.
async function resumePending(pe) { const e = $("#em"); if (e) e.value = pe; smsg("One moment…");
  try { const j = await signinPost({ email: pe }); if (j.ok && j.known && j.k) { K = j.k; setSession(K); pendingEmail(null); return load(); }
    if (j.ok && j.vt) return welcome(pe, j.vt); if (j.ok && j.step === "code") return codeScreen(pe, "Your code is in your email. Type it here, or tap Resend code.");
    smsg(j.error || ""); } catch { smsg(""); } }
// sign-in messages sit under the fold on a phone: every message scrolls itself (and the links under it) into view
function smsg(t) { const m = $("#smsg"); if (!m) return; m.textContent = t; if (t) { const card = m.closest(".card") || m; try { card.scrollIntoView({ block: "end", behavior: "smooth" }); } catch {} } }
function codeScreen(email, note) {
  $(".gate").innerHTML = `<img class="dance" src="/lumi/wait.webp" alt="Lumi"><h1>Check your <i>email.</i></h1>
    <p class="sub">We sent a 6-digit code to <b>${esc(email)}</b>. Type it here to open Lumi on this phone. You only do this once per phone.</p>
    <div class="card"><input class="text code6" id="cd" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="20" pattern="[0-9 ]*" placeholder="123456" style="margin-bottom:10px">
    <button class="btn primary block" id="cgo">Open my Lumi</button><p class="muted" id="smsg" style="font-size:14px;margin:10px 0 0;min-height:18px">${esc(note || "")}</p>
    <div class="row" style="justify-content:space-between;margin-top:6px"><button class="linkbtn" id="resend" type="button">Resend code</button><button class="linkbtn" id="other" type="button">Use a different email</button></div></div>`;
  const cd = $("#cd"); cd.focus();
  // [M5 Max MBP] 2026-09-29 sweep50: one check at a time. Typing the 6th digit auto-submits, and Enter/Go (or a tap) right after it used to
  // send the same code again, spending 2 of the 5 tries. A pasted " 123 456" is read as 123456 (maxlength no longer cuts it first).
  // The same code the server just turned down is not sent again (Enter after a wrong code spent another try).
  let checking = false, lastBad = "", lastErr = "";
  const check = async () => {
    if (checking) return;
    const code = (cd.value || "").replace(/\D/g, ""); if (code.length !== 6) { smsg("The code has 6 digits."); return; }
    if (code === lastBad) { smsg(lastErr || "That code is not right."); cd.select(); return; }
    checking = true; $("#cgo").disabled = true; smsg("Checking…");
    try { const j = await signinPost({ email, code });
          if (j.ok && j.k) { K = j.k; setSession(K); pendingEmail(null); return load(); }
          if (j.ok && j.vt) return welcome(email, j.vt);
          if (/not right|wrong|expired/i.test(j.error || "")) { lastBad = code; lastErr = j.error; }
          smsg(j.error || "Please try again."); }
    catch { smsg("Could not reach Lumi, please try again."); }
    finally { checking = false; }
    const b = $("#cgo"); if (b) b.disabled = false; if (cd.isConnected) cd.select();
  };
  $("#cgo").onclick = check;
  cd.oninput = () => { const dg = cd.value.replace(/\D/g, ""); if (dg.length >= 6 && cd.value !== dg.slice(0, 6)) cd.value = dg.slice(0, 6); if (dg.length === 6) check(); };
  cd.onkeydown = e => { if (e.key === "Enter") check(); };
  $("#resend").onclick = async () => { $("#resend").disabled = true; $("#smsg").textContent = "Sending a new code…";
    try { const j = await signinPost({ email }); $("#smsg").textContent = j.ok ? (j.k || j.vt ? "" : "A new code is on its way.") : (j.error || "Please try again."); if (j.ok && j.k) { K = j.k; setSession(K); return load(); } if (j.ok && j.vt) return welcome(email, j.vt); /* [M5 Max MBP] 2026-10-26 09:38 PDT SWEEP2: an email-only answer (vt) goes on to the name form */ } catch { $("#smsg").textContent = "Could not reach Lumi, please try again."; }
    setTimeout(() => { const b = $("#resend"); if (b) b.disabled = false; }, 20000); };
  $("#other").onclick = () => { pendingEmail(null); signInScreen(""); };
}
function welcome(email, vt) {
  $(".gate").innerHTML = `<img class="dance" src="/lumi/welcome.webp" alt="Lumi"><h1>Welcome to <i>Lumi.</i></h1>
    <p class="sub">We're so glad you're here. Put in your name and phone number and we'll add you to our system. Any time you open this link, just put in your email and your design profile and reels will be right here.</p>
    <div class="card"><input class="text" id="fn" autocomplete="given-name" placeholder="First name" maxlength="60" style="margin-bottom:8px"><input class="text" id="ln" autocomplete="family-name" placeholder="Last name" maxlength="60" style="margin-bottom:8px"><input class="text" id="ph" type="tel" inputmode="tel" autocomplete="tel" placeholder="Phone number" maxlength="40" style="margin-bottom:10px">
    <button class="btn primary block" id="join">Add me to Lumi</button><p class="muted" id="smsg" style="font-size:14px;margin:10px 0 0;min-height:18px"></p>
    <div class="row" style="justify-content:center;margin-top:6px"><button class="linkbtn" id="other" type="button">Use a different email</button></div></div>`;
  // [M5 Max MBP] 2026-09-29 sweep50: the welcome step had no way back. "Use a different email" (and "Start again" after an expired step)
  // go back to the email screen for a fresh code.
  const restart = () => { pendingEmail(null); signInScreen("", false); const e = $("#em"); if (e) { e.value = email; e.focus(); } };
  $("#other").onclick = restart;
  $("#join").onclick = async () => {
    if ($("#join").disabled) return;
    const first = ($("#fn").value || "").trim(), last = ($("#ln").value || "").trim(), phone = ($("#ph").value || "").trim();
    // [M5 Max MBP] 2026-09-29 Nick: a new signup must give first name, last name AND phone number, all mandatory
    if (!first || !last || !phone) { smsg("Please add your first name, last name and phone number."); return; }
    // [M5 Max MBP] 2026-09-29 sweep50: the same 7 to 15 digit rule as api/signin.js (which counts digits in the first 40 characters)
    const pd = (phone.slice(0, 40).match(/\d/g) || []).length;
    if (pd < 7) { smsg("Please add a full phone number."); return; }
    if (pd > 15) { smsg("That phone number looks too long. Please check it."); return; }
    $("#join").disabled = true; smsg("Setting up your Lumi…");
    try { const r = await fetch("/api/signin", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, first, last, phone, vt, dev: devId(), src: srcOf() }) }); const j = await r.json();   // CONV50: + first-touch source
          if (j.ok && j.k) { K = j.k; setSession(K); pendingEmail(null); if (j.created) { try { localStorage.setItem("lumi_newacct", K); } catch {} } return load(); }
          if (/expired|start again/i.test(j.error || "")) {
            smsg("That step expired. Tap Start again for a new code.");
            $("#join").textContent = "Start again"; $("#join").disabled = false; $("#join").onclick = restart; return; }
          smsg(j.error || "Please try again."); }
    catch { smsg("Could not reach Lumi, please try again."); }
    $("#join").disabled = false;
  };
  // [M5 Max MBP] 2026-09-29 sweep: Enter (Go on the phone keyboard) submits, like the email and code screens
  $("#fn").onkeydown = e => { if (e.key === "Enter") $("#ln").focus(); };
  $("#ln").onkeydown = e => { if (e.key === "Enter") $("#ph").focus(); };
  $("#ph").onkeydown = e => { if (e.key === "Enter" && !$("#join").disabled) $("#join").click(); };
}
// [M5 Max MBP] 2026-09-29 22:40 PDT formats: the video types the Mac publishes from the brain's format library (formats.py publish)
// [M5 Max MBP] 2026-10-01 07:26 PDT qa2fix #10: looks.json and formats.json load IN PARALLEL with /api/me, and "Loading your reels" shows first (slow 3G was blank 3 to 5 s)
function loadCat() { return S.cat ? Promise.resolve() : (S._catP || (S._catP = fetch("/looks.json", { cache: "no-store" }).then(r => r.json()).catch(() => ({ looks: [], real: [] })).then(c => { S.cat = c || { looks: [], real: [] }; S._catP = null; }))); }
function loadFmts() { return S.fmts ? Promise.resolve() : (S._fmtP || (S._fmtP = fetch("/formats.json", { cache: "no-store" }).then(r => r.json()).then(j => (j.formats || []).filter(f => f && f.id && f.label)).catch(() => []).then(f => { S.fmts = f; S._fmtP = null; }))); }
async function load() {
  const catP = loadCat(), fmtP = loadFmts();
  if (QS.get("signin") === "1") { await catP; return signInScreen("", K.length === 24); }   // [M5 Max MBP] 2026-09-26: preview the sign-in screen, session kept
  if (K.length !== 24) { await catP; return g54Boot(); }   // GUEST54 [M5 Max MBP] 2026-10-29: no session opens the app as a guest (was the full-screen sign in)
  if (S.guest) g54Leave();   // GUEST54: just signed in from the guest sheet   // [M5 Max MBP] 2026-10-26 09:38 PDT SWEEP2: a reload mid name-form used to open the code screen, which no longer leads anywhere
  // [M5 Max MBP] 2026-10-03 appfix A15: after a sign in, #main still held the sign-in collage, so removing landcss first left a blank,
  // 17,500 px page until /api/me answered. The "Loading your reels" placeholder now goes in BEFORE the sign-in styles come off.
  if (!S.data) $("#main").innerHTML = empty("Loading your reels", "One moment.");
  document.getElementById("landcss")?.remove(); document.documentElement.classList.remove("gatev"); if (!S.data) preChrome(true);
  const firstLoad = !S.data;   // [M5 Max MBP] 2026-10-02 22:55 PDT adsignup: the first screen after sign in (e.g. #new from the ad button) starts at the top, not where the code box had scrolled
  // [M5 Max MBP] 2026-09-29 sweep50: first load says it is loading at once (a slow /api/me left a blank page with only the header)
  if (!S.data && !$("#main").textContent.trim()) $("#main").innerHTML = empty("Loading your reels", "One moment.");
  try {
    const [r] = await Promise.all([meFetch(), catP, fmtP]);
    // [M5 Max MBP] 2026-10-01 06:49 PDT qafix: a bad or revoked key used to say "Setting up your account" and retry every 20 s forever.
    // A new account's snapshot is written at sign up (api/signin.js), so after 3 misses in a row it says the link expired and offers sign in.
    if (r.status === 404) { window.__me404 = (window.__me404 || 0) + 1; preChrome(true);
      if (window.__me404 >= 3) { $("#main").innerHTML = empty("This link has expired", "Sign in again with your email and you are back in.") + `<p style="text-align:center"><button class="btn primary" id="expsign" onclick="signOut()">Sign in again</button></p>`; return; }
      $("#main").innerHTML = empty("Setting up your account", "Give it a minute: your account is being created. This page updates by itself.") + `<p style="text-align:center"><button class="btn line" onclick="confirmSignOut()">Sign out</button></p>`; setTimeout(load, [5000, 10000][window.__me404 - 1] || 20000); return; }
    window.__me404 = 0;
    // [M5 Max MBP] 2026-09-29 sweep50: a 500/502 JSON error ({ok:false,error}) is an error, never account data
    if (!r.ok) throw new Error("me " + r.status);
    const _t = await r.text(); const _d = JSON.parse(_t);
    if (!_d || _d.ok === false || !Array.isArray(_d.reels)) throw new Error("me: not account data");
    S._lastMe = _t; S.data = _d; netState(true);
    try { if (firstLoad) { lk183cDefault(_d); if (!_d.guest) setTimeout(() => { try { lk183cHint(); } catch {} }, 1800); } } catch {}   // LOOKS183C: default look for someone with none saved + the one-time look hint
    if (firstLoad) setTimeout(() => { try { fl111Resume(); } catch {} }, 1200);   // FILMLUMI111: takes that were recorded but not uploaded when the app closed
    { const st = $("#ttadst"); if (st && S.data.tt_ads) { st.textContent = ttAdsLine(); const tb = $("#ttadbtn"); if (tb && S.data.tt_ads.state !== "checking") tb.disabled = false; } }   // UPADS145: the open account sheet follows the Mac's status
    { const st = $("#adsst"); if (st && S.data.ads_sync) { st.textContent = adsSyncLine(); const ab = $("#adsbtn"); if (ab && S.data.ads_sync.state !== "checking") ab.disabled = false; } }   // ADSBTN50: the open account sheet follows the Mac's status
    // [M5 Max MBP] 2026-10-01 07:26 PDT qa2fix #3: what the SERVER says about each reel, read before any local change. A local Approve / change-request marker is only cleared
    // when this confirms it (it used to compare against the locally changed status and cleared itself at once).
    S.srv = {}; (_d.reels || []).forEach(x => { if (x && x.id) S.srv[x.id] = { status: x.status, nv: (x.versions || []).length, run: !!(x.run && x.run.kind), prog: !!x.progress, approved: !!x.approved }; });
    numberReels(S.data.reels || []);
    // [M5 Max MBP] 2026-09-29 sweep: an automated sender (the board-to-Inbox "Lumi selftest") is never shown to a client as a team member
    // [M5 Max MBP] 2026-09-29 sweep50: selftest traffic is not shown at all. Its messages are dropped from the team thread (they used to
    // show as a team member called "Lumi"), and the Inbox row for the thread shows the newest REAL message or goes if there is none.
    { const bot = n => /self\s*-?\s*test/i.test(String(n || "")); const tm = S.data.team;
      if (tm && Array.isArray(tm.messages)) tm.messages = tm.messages.filter(m => !(bot(m.name) || (m.from === "team" && bot(m.text))));
      const real = ((tm || {}).messages || []), lastReal = real[real.length - 1];
      const ib = S.data.inbox, items = Array.isArray(ib) ? ib : ((ib || {}).items || []);
      const keepIt = items.filter(it => { if (!it) return false; const selfy = bot(it.from) || bot(it.subject) || bot(it.preview);
        if (!selfy) return true; if (it.kind !== "team" || !lastReal) return false;
        const nm = lastReal.from === "client" ? "You" : (lastReal.name || "The Lumi team");
        Object.assign(it, { from: (lastReal.from === "team" && lastReal.name ? lastReal.name + " · " : "") + "Lumi team", subject: "Message from " + (lastReal.from === "team" && lastReal.name ? lastReal.name : "the Lumi team"), preview: (nm === "You" ? "You: " : "") + String(lastReal.text || ""), at: lastReal.at || it.at });
        return true; });
      if (Array.isArray(ib)) S.data.inbox = keepIt; else if (ib) ib.items = keepIt; }
    // [M5 Max MBP] 2026-09-29 sweep50: a cancelled reel is never offered for payment (the Pay tab badge already skipped it, the page did not)
    // [M5 Max MBP] 2026-10-01 22:47 PDT qa20fix: reel titles come from file names and can carry em or en dashes; shown as " - " (brand rule)
    (S.data.reels || []).forEach(r => { ["title", "name"].forEach(f => { if (typeof r[f] === "string") r[f] = r[f].replace(/\s*[\u2014\u2013]\s*/g, " - "); }); });
    (S.data.reels || []).forEach(r => { if (r.status === "cancelled") r.pay = null; });
    // newreel 2026-10-03 (Nick TG 11:23, Beth: "the reel did not show up" after the confetti). The moment Start editing is tapped the reel is
    // listed, with its title, its clip's still and "Brief received, starting your edit", BEFORE the Mac's push. The server's own row replaces
    // it as soon as it lists the reel; unconfirmed after 5 min it says so and offers Send again (Home card). Never a silent ghost.
    nfOptimistic();
    // newreel 2026-10-03: a reel whose brief is in (chat fast path, or sent from this phone) never shows the old "Waiting on your brief" needs-you bar
    (S.data.reels || []).forEach(r => { if (r.needs_brief === true && (briefSent(r) || briefInChat(r)) && r.progress && /brief/i.test(r.progress.stage || "")) {
      r.progress = { stage: "Reading your brief", pct: null, eta_min: null, needs_you: false, mood: "plan", synth: true }; if (r.status === "received") r.status = "editing"; } });
    // [M5 Max MBP] 2026-10-01 07:26 PDT qa2fix #7: a reel cancelled from the board stays listed for its 24 h undo window (r.shelf.kind "cancel"). It reads Cancelled, never "in the edit".
    (S.data.reels || []).forEach(r => { if (r.shelf && r.shelf.kind === "cancel") { r.status = "cancelled"; r.pay = null; r.progress = null; r.run = null; r.needs_brief = false; } });
    // [M5 Max MBP] 2026-10-01 07:26 PDT qa2fix #8: a monthly link is only shown when it is a Stripe or branded pay URL
    if (S.data.price && S.data.price.monthly_link && !payUrlOk(S.data.price.monthly_link)) S.data.price.monthly_link = "";
    // [M5 Max MBP] 2026-09-29 sweep: money. A pay button only ever opens a Stripe checkout (a non-Stripe pay URL, e.g. an old app domain,
    // is held back and shown as "on its way"), and a reel covered by an approved Rewards credit is never asked to pay.
    { const rw = S.data.rewards || {}, cr = (rw.status === "approved" && rw.credits && Array.isArray(rw.credits.reels)) ? rw.credits.reels.map(String) : [];
      (S.data.reels || []).forEach(r => { if (!r.pay) return;
        if (cr.includes(no3(r.n)) || cr.includes(String(r.n))) { r.pay_covered = true; r.pay = null; return; }
        if (r.status !== "cancelled" && (r.versions || []).length && giftCovered(r)) { r.pay_gift = true; r.pay = null; return; }   // qa20fix [M5 Max MBP] 2026-10-01 22:47 PDT: gift reel, nothing to pay
        // [M5 Max MBP] 2026-10-01 06:4x PDT (client-app QA, pay): every pay link the Mac makes is BRANDED, https://lumiedits.vercel.app/pay/<slug>,
        // which 307s to buy.stripe.com. Only raw Stripe URLs were trusted, so all 13 owed reels showed "on its way" and no Pay button.
        if (!payUrlOk(r.pay)) { r.pay_pending = true; r.pay = null; } });
      // [M5 Max MBP] 2026-10-03 appfix A6: a delivered reel stamped Needs to pay with no pay link said "Nothing due" in the Pay tab.
      // It now shows "Your payment link is on its way" there, so the stamp and the tab agree.
      (S.data.reels || []).forEach(r => { if (!r.pay && !r.pay_covered && !r.pay_gift && r.status !== "cancelled" && (r.versions || []).length
        && r.pay_state && r.pay_state.key === "needs_pay" && !giftCovered(r)) r.pay_pending = true; }); }
    // what you typed stays on screen until the server has it (the round trip is up to a minute)
    // [M5 Max MBP] 2026-09-29 sweep50: a sent message is only "already on the server" when the server has the same text from around the
    // time it was sent. Matching ANY earlier message hid a repeated "can I talk to a human?" (or "ok", "thanks") and stopped the typing dots.
    const same = (a, b) => (a || "").trim().slice(0, 60) === (b || "").trim().slice(0, 60);
    const mine = fetchStore("sentmsgs", []).filter(m => Date.now() / 1000 - m.at < 600);
    const srvYou = (S.data.messages || []).filter(m => m.who === "you");
    S.data.messages = [...(S.data.messages || []), ...mine.filter(m => !srvYou.some(s => same(s.text, m.text) && (s.at || 0) >= m.at - 90))].sort((a, b) => a.at - b.at);
    store("sentmsgs", mine);
    // same for replies to the team: they stay on screen until the server snapshot has them
    { const tmine = fetchStore("sentteam", []).filter(m => Date.now() / 1000 - m.at < 900), tm = S.data.team || (S.data.team = { messages: [] }); tm.messages = tm.messages || [];
      const srv = tm.messages.filter(m => m.from === "client");
      tm.messages = [...tm.messages, ...tmine.filter(m => !srv.some(s => same(s.text, m.text) && (s.at || 0) >= m.at - 90))].sort((a, b) => (a.at || 0) - (b.at || 0));
      store("sentteam", tmine); }
    document.querySelectorAll("nav, #avatar, #hinbox").forEach(el => el.style.display = "");
    { const av = $("#avatar"), m = myAvatar(); av.textContent = m.ini; av.style.background = m.color; av.style.color = "#fff"; }   // AVATAR50
    $("#avatar").onclick = () => { const a = S.data.account || {}; const since = a.member_since ? new Date(a.member_since * 1000).toLocaleDateString([], { month: "long", year: "numeric" }) : "";
      sheet(`<h3 style="font-size:22px;font-family:var(--serif);font-weight:400;margin:0 0 10px">${esc(S.data.full_name || S.data.name || "Your account")}</h3>
        <p class="muted" style="margin:0 0 6px">${esc(String((S.data.reels || []).length))} reel${(S.data.reels || []).length === 1 ? "" : "s"}${since ? " · with us since " + esc(since) : ""}</p>
        ${a.look ? `<p style="margin:0 0 16px">Your look: <b>${esc(a.look)}</b></p>` : ""}
        ${l196AcctHtml()}<div class="eyebrow" style="margin:4px 0 8px">Appearance</div><div class="appear" id="appear">${[["light", "Light"], ["dark", "Dark"], ["auto", "Match phone"]].map(([k, n]) => `<button data-ap="${k}" class="${(window.lumiAppearance ? lumiAppearance.get() : "auto") === k ? "on" : ""}">${n}</button>`).join("")}</div>
        <button class="btn line block rwentry" id="rwopen" style="margin:0 0 10px">🎁 ${rwState().flow === "legacy" ? "Rewards" : "Influencer program"} <span class="rwbeta">beta</span><small>${esc(rwLine())}</small></button>
        <button class="btn line block" id="replaytour" style="margin:0 0 10px">Replay the tour</button>
        ${S.data.owner === true ? `<button class="btn line block" id="adsbtn" style="margin:0 0 4px;white-space:normal;height:auto;line-height:1.25;padding-top:10px;padding-bottom:10px">Upload for Sabbir<small>Approved ads to his Meta ads Drive folder</small></button><p class="muted" id="adsst" style="margin:0 0 10px;font-size:13px">${esc(adsSyncLine())}</p>` : ""}
        ${S.data.owner === true ? `<button class="btn line block" id="ttadbtn" style="margin:0 0 4px;white-space:normal;height:auto;line-height:1.25;padding-top:10px;padding-bottom:10px">Upload ads<small>Approved ads to the TikTok folder</small></button><p class="muted" id="ttadst" style="margin:0 0 10px;font-size:13px">${esc(ttAdsLine())}</p>` : ""}
        <div class="row"><button class="btn line" id="so" style="flex:1">Sign out of this phone</button><button class="btn primary" id="close">Close</button></div><p class="privl"><a href="/privacy">Privacy</a></p>`);
      // ADSBTN50 [M5 Max MBP] 2026-10-26 09:55 PDT (Nick TG 09:40): owner accounts only (snapshot owner flag, checked again by api/intent.js and the Mac).
      // The tap queues one ads_sync intent; the Mac uploads every approved ad Sabbir's folder lacks and tells him once, only when something new went up.
      { const ab = $("#adsbtn"); if (ab) ab.onclick = async () => { if (!tapOk("adssync", 4000)) return; ab.disabled = true; const st = $("#adsst"); if (st) st.textContent = "Checking..."; S._adsTapAt = Date.now();
          const ok = await send({ kind: "ads_sync" }); if (!ok && st) { st.textContent = "Could not start the check. Try again."; ab.disabled = false; } }; }
      // UPADS145 [M5 Max MBP] 2026-11-02 (Nick TG 22040): Upload ads = one tap, one tt_ads_sync intent (owner only: api/intent.js checks the snapshot, the Mac the address)
      { const tb = $("#ttadbtn"); if (tb) tb.onclick = async () => { if (!tapOk("ttads", 4000)) return; tb.disabled = true; const st = $("#ttadst"); if (st) st.textContent = "Checking...";
          const ok = await send({ kind: "tt_ads_sync" }); if (!ok && st) { st.textContent = "Could not start the check. Try again."; tb.disabled = false; } }; }
      document.querySelectorAll("#appear button").forEach(b => b.onclick = () => { if (window.lumiAppearance) lumiAppearance.set(b.dataset.ap); document.querySelectorAll("#appear button").forEach(x => x.classList.toggle("on", x === b)); });
      $("#replaytour").onclick = () => { closeSheet(); if (window.lumiTour) lumiTour.start(true); };
      $("#rwopen").onclick = () => rewardsSheet();
      $("#so").onclick = confirmSignOut; $("#close").onclick = () => closeSheet && closeSheet(); };
    if (!S.draft) S.draft = { ...DEFAULT_DRAFT(), ...fetchStore("draft", {}) };
    render(); inboxTab();
    if (firstLoad) { try { setPageY(0); } catch {} }
    if (S._after54) { const f = S._after54; S._after54 = null; try { f(); } catch (e) { console.error("guest54 after", e); } }   // GUEST54: the action tapped as a guest carries on
    nameGate();   // NAMEREQ50: an account with no real first + last name gives one before anything else (kept up on every poll until saved)
    helloMaybe();   // [M5 Max MBP] 2026-10-02 inapphello: the one-time welcome card, after the account has rendered
    if (!window.__annArmed) { window.__annArmed = true; setTimeout(annMaybe, 1400); }   // [M5 Max MBP] 2026-10-07 newstyle: "New style has landed" banner
    if (!window.__noticeArmed) { window.__noticeArmed = true; setTimeout(noticeMaybe, 1800); }   // newreel 2026-10-03: a one-time notice (apology + next step)
    if (!window.__promoArmed) { window.__promoArmed = true; PROMO_T = setTimeout(promoMaybe, 9000); }   // [M5 Max MBP] 2026-10-02 influpop: once per page load
  } catch (e) {
    // [M5 Max MBP] 2026-09-29 10:05 PDT Nick: "My reels aren't loading ... Says could not load". A single slow or failed fetch (the Mac
    // under load) stranded him on this screen. Retry by itself (2 s, 5 s, 10 s) before giving up, keep what was already on screen if we
    // had data, and give a Try again button. The error text is kept in console for debugging.
    console.error("load failed", e);
    window.__loadTries = (window.__loadTries || 0) + 1;
    if (window.__loadTries <= 3) { setTimeout(() => { try { load(); } catch (_) {} }, [2000, 5000, 10000][window.__loadTries - 1]); if (S.data) return;
      // [M5 Max MBP] 2026-09-29 sweep: nothing on screen yet and a retry is scheduled: say we are still loading, not "Could not load"
      preChrome(true); $("#main").innerHTML = empty("Loading your reels", "Taking a little longer than usual. Trying again by itself."); return; }
    if (S.data) { try { render(); return; } catch (_) {} }
    preChrome(true);
    $("#main").innerHTML = empty("Could not load", "Check your connection, then tap Try again.") + `<p style="text-align:center"><button class="btn primary" onclick="window.__loadTries=0;load()">Try again</button></p>`;
    return;
  }
  window.__loadTries = 0;
}
function numberReels(reels) {
  // reels arrive newest first; give every reel a distinct number by the order it started, never two "01"s
  // REELID [M5 Max MBP] 2026-10-19: the reel number comes from the Mac's record (reel_identity, video_number) and is never invented here.
  // A reel that has no number yet (not rendered) shows without one; the old rule renumbered duplicates by order and made up numbers.
  reels.forEach(r => r.title = (r.title || "").replace(/\s*\((reel|video)\s*\d+\)\s*/i, " ").trim());
  // [M5 Max MBP] 2026-10-01 06:48 PDT qafix #4: a title saved on this phone holds until the Mac's push catches up (r.titled from the server wins after that)
  { const t = fetchStore("titled", {}); reels.forEach(r => { if (!r.titled && t[r.id] && !(r.versions || []).length) { r.title = t[r.id]; r.name = localReelName(r, t[r.id]); } }); }
}
/* NAME THIS REEL [M5 Max MBP] 2026-10-02 18:10 PDT namereel, Nick TG 17:51: "it should be mandatory that they have to name it in the app
   ... we automatically add the 00 whatever after, based on previous reels or no reel history. If there's no reel history it's 001."
   nextNo(): the Mac's next_n (app_push: Drive history + every number shown), never below the highest number on screen + 1, 001 with none. */
function nextNo() { const d = S.data || {}, rs = d.reels || [];
  const hi = Math.max(0, ...rs.map(r => { const m = String(r.name || "").match(/ - (\d{3})$/); return Number.isInteger(r.n) ? r.n : m ? +m[1] : 0; }));
  return Math.max(+d.next_n || 0, hi + 1, 1); }
function newReelName(title) { const d = S.data || {}, full = (d.full_name || d.name || "").trim();
  return [full && full !== "there" ? full : "", String(title || "").trim(), no3(nextNo())].filter(Boolean).join(" - "); }
function localReelName(r, title) {
  const d = S.data || {}, full = ((r.name || "").split(" - ")[0] || d.full_name || d.name || "").trim();
  return [full, title, r.n ? no3(r.n) : ""].filter(Boolean).join(" - ");
}
function receivedFiles() {
  // the newest reel with no delivery yet: what the upload watcher has handed to us (app channel only)
  // [M5 Max MBP] 2026-10-03 appfix A2: only a reel still WAITING for its brief counts. A reel already in the edit used to show its clip as
  // "Received" on New reel, hide the Upload button, and the new brief then went to (and overwrote) that running reel.
  const r = receivedReel();
  return r ? r.files || [] : [];
}
function receivedReel() { const r = briefReel(); return r && (r.files || []).length ? r : null; }
function lastLook() { const r = (S.data.reels || []).find(x => x.look); return r ? r.look : null; }
/* ---------- THE BRIEF IS MANDATORY. [M5 Max MBP] 2026-09-28 21:3x PDT (brief-mandatory agent). Nick TG 21:09: a client "added a new reel in the
   app and uploaded her footage but it didn't prompt her to put in her styles or her brief ... It should be mandatory for the client to give a
   brief." An upload alone never starts an edit (concierge._ready waits for app_brief.raw), but the app showed such a reel as queued at 7%
   with no way back to the brief. Now: footage in + no brief = "Finish your brief to start editing" everywhere, and a button to the brief.
   Contract with the Mac: reel.needs_brief (boolean) wins when app_push sends it; otherwise the brief message (kind "brief") on that reel. ---------- */
// [M5 Max MBP] 2026-10-03 newreel (Nick TG 11:16, Beth: "needs you" after a complete brief). The chat fast path carries the client's own
// brief message the second the Mac takes it; a snapshot built before that still says needs_brief. The brief in the chat wins.
function briefInChat(r) { const sa = Number((S.data || {}).at) || 0; return !!(r && (S.data && S.data.messages || []).some(m => m && m.kind === "brief" && m.reel === r.id && (Number(m.at) || 0) >= sa - 5)); }
function briefSent(r) { const b = fetchStore("briefsent", null), age = b && b.at ? Date.now() - b.at : 1e12;   // newreel: held 6 h for the reel it named (until the Mac's push agrees), 20 min when it named none
  return b && (age < 20 * 60000 || (age < 6 * 3600000 && r && b.reel && b.reel === r.id)) && (!r || !b.reel || b.reel === r.id) ? b : null; }
// RESUME50 [M5 Max MBP] 2026-10-29 18:4x PDT. Nick TG: in New reel (Captions) he switched apps, came back, was asked for a title again, and
// Reels showed the upload as "Queued for your editor" with no way back into the brief. The Mac shows clips uploaded INSIDE the app as a
// just-landed placeholder (dbx:landed_..., channel "email", has_brief true) until the upload batch becomes a job, and that placeholder said
// "has a brief". It never had one: no edit starts until the brief is in. Such a reel now asks for its brief (Finish your brief), and the
// brief goes by the upload batch ids (ISS-393), never by the placeholder id.
function appLanded(r) {
  if (!r || !String(r.id || "").startsWith("dbx:landed_") || (r.versions || []).length || ["done", "review", "cancelled"].includes(r.status)) return false;
  const d = S.data || {}, fs = new Set(r.files || []), t0 = Number(String(r.id).split("_").pop()) || 0;
  if (((d.arrivals || {}).files || []).some(f => f && f.up && fs.has(f.raw))) return true;
  return (d.uploads || []).some(u => u && (u.reel || "new") === "new" && Math.abs((Number(u.at) || 0) - t0) < 3 * 3600);
}
function landedBatches(r) { if (!appLanded(r)) return []; const t0 = Number(String(r.id).split("_").pop()) || 0;
  return [...new Set(((S.data || {}).uploads || []).filter(u => u && u.batch && (u.reel || "new") === "new" && Math.abs((Number(u.at) || 0) - t0) < 3 * 3600).map(u => String(u.batch)))]; }
// RESUME50: a brief already started on this phone (title, picks) says Finish, and opens at the saved step with every pick
function briefLbl() { const dr = S.draft || fetchStore("draft", {}) || {}; return (String(dr.title || "").trim() || (dr.p122 && dr.p122.path)) ? "Finish your brief" : "Start your brief"; }
function needsBrief(r) {
  if (!r || r.status === "cancelled") return false;
  if (appLanded(r)) return !briefSent(r) && !briefInChat(r);   // RESUME50
  // [M5 Max MBP] 2026-10-01 07:26 PDT qa2fix #6: app_push now sends needs_brief / has_brief from the job record (app_brief.raw), so a capped-away chat message can no longer
  // bring back a false "Finish your brief". A brief just sent from this phone holds until the Mac's push catches up.
  if (typeof r.needs_brief === "boolean") return r.needs_brief && !briefSent(r) && !briefInChat(r);
  if (r.has_brief === true) return false;
  if (r.channel !== "app" || String(r.id).startsWith("drive:") || (r.versions || []).length || r.status === "done" || r.status === "review") return false;
  if (r.has_brief || r.brief) return false;
  const p = r.progress || {};
  if (p.live || p.stalled) return false;                           // building (never without a brief)
  if (p.needs_you && !/brief/i.test(p.stage || "")) return false;  // asking something else (the Mac says "Waiting on your brief" when it is this)
  if (!(r.files || []).length) return false;
  if ((S.data.messages || []).some(m => m.kind === "brief" && m.reel === r.id)) return false;
  return !briefSent(r);
}
function briefCard(r) {
  return lumiCard("ask", "Your clips are in. Start your brief.", "Name it and tell us what you want in your brief. We start editing the moment you tap Start editing.",
    `<div class="row" style="gap:8px;margin-top:10px;flex-wrap:wrap"><button class="btn sm primary tobrief" data-reel="${esc(r.id)}">${briefLbl()}</button>${footageOf(r).length ? `<button class="btn sm line seefoot" data-reel="${esc(r.id)}">See your footage (${footageOf(r).length})</button>` : ""}</div>`);
}
/* ---------- SEE YOUR FOOTAGE. [M5 Max MBP] 2026-09-28 22:3x PDT (brief-mandatory agent). Nick TG 22:13: "they can click on a button to see
   their footage so they know which footage the brief is attached to (just in case they're sending in a lot of different things)."
   reel.footage comes from app_push (footage_preview.py): per uploaded clip {name, dur, poster, video (light H.264 preview), ready}.
   Falls back to reel.files (names only) until the previews are made. ---------- */
// [M5 Max MBP] 2026-09-30 (walkthrough agent): a clip's still, whichever field app_push sends (poster, or thumb)
function footPoster(x) { return (x && (x.poster || x.thumb)) || ""; }
function footageOf(r) { if (!r) return []; return (r.footage && r.footage.length) ? r.footage : (r.files || []).map(n => ({ name: n, ready: false })); }
const mmss = t => { t = Math.round(Number(t) || 0); return Math.floor(t / 60) + ":" + String(t % 60).padStart(2, "0"); };
// UPREEL51 [M5 Max MBP] 2026-10-29 19:4x PDT (reel 057: "Finish your brief -> Add more clips" went up as a NEW-reel batch and made an empty
// reel). While finishing the brief of an EXISTING reel, every upload from New reel goes to THAT reel (the "Add videos to this edit" path,
// opts.reel), and the brief is tagged with it. A just-landed placeholder (dbx:landed_) has no job yet: its clips stay "new" and the brief
// pairs them by batch ids (RESUME50).
function nfUpReel() { try { const id = S.briefFor || (S.draft || {}).briefFor, r = id && reelById(id);
  return r && !appLanded(r) && !String(r.id).startsWith("dbx:") && !(r.versions || []).length && needsBrief(r) ? r.id : "new"; } catch { return "new"; } }
function briefReel() {
  const rs = (S.data && S.data.reels) || [], bf = S.briefFor || (S.draft || {}).briefFor, f = bf && reelById(bf);   // UPREEL51: the reel being briefed survives a reload
  if (f && !(f.versions || []).length && needsBrief(f)) return f;
  return rs.find(r => needsBrief(r) && !nfIsAside(r)) || null;    // appfix A2 2026-10-03: never a reel that already has its brief   // BETHFIX81 [M5 Max MBP] 2026-10-31: nor one set aside by Start a new reel
}
/* BETHFIX81 [M5 Max MBP] 2026-10-31 10:2x PDT. Nick TG ~09:57: Beth tapped a caption on Styles ("This is how your words..." preview) and New reel; both
   opened "Add a title" over the clip she had uploaded at 09:48 (IMG_1868, reel 1793465413, no brief), and closing the app brought it
   back every time. ROOT CAUSE: briefReel() falls back to ANY reel waiting for its brief, so every way into New reel (tab, Styles "Use
   these captions", a format, Your style, the app reopening on #new) resumed that reel and its clip, with no way to start fresh (Cancel
   this reel cleared the picks, the server reel still waited, the clip came straight back). Now: entering New reel while a reel is in
   progress (clips on a reel waiting for its brief, or clips this phone is uploading) asks first: Continue this reel (its clip thumbnail
   and name shown) or Start a new reel. Start new sets that reel aside ON THIS PHONE only (it stays in Reels with Finish your brief,
   nothing deleted), starts a clean draft (a style just picked on Styles comes along), and its clips never ride into the new reel.
   In-app uploads already go to their own reel by batch id (concierge ISS-393), so the new reel's clips can not join the old one. */
const NF81_STYLE = ["look", "look2", "lookMode", "single", "fromStyle", "p122", "motion", "mgMode", "mgCarousel", "hook", "glass", "vine", "captions", "cap122", "videoType", "vtChosen", "vtTell", "vtDecide", "grade", "simple", "changeLook", "custom", "tplMg"];
function nfAside() { const a = fetchStore("nfaside", null) || {}; return { ids: Array.isArray(a.ids) ? a.ids : [], files: Array.isArray(a.files) ? a.files : [] }; }
const nf81Base = x => String(x || "").split("/").pop();
function nfIsAside(r) { if (!r || !r.id) return false; const a = nfAside(); if (a.ids.includes(r.id)) return true; try { if (nf82Del().ids.includes(r.id)) return true; } catch {}
  const fs = (r.files || []).map(nf81Base).filter(Boolean); return fs.length > 0 && fs.every(x => a.files.includes(x)); }   // a just-landed placeholder becomes a job with a new id: its clips still say it was set aside
function nfSetAside(r, files) { const a = nfAside(); if (r && r.id) a.ids = [...new Set([...a.ids, r.id])].slice(-40);
  a.files = [...new Set([...a.files, ...((r && r.files) || []).map(nf81Base), ...(files || []).map(nf81Base)].filter(Boolean))].slice(-200); store("nfaside", a); }
function nfUnaside(id) { const r = reelById(id), a = nfAside(), fs = new Set(((r && r.files) || []).map(nf81Base));
  a.ids = a.ids.filter(x => x !== id); a.files = a.files.filter(x => !fs.has(x)); store("nfaside", a); }
// The reel in progress, or null: a reel on the server waiting for this brief (with its clips), or clips this phone uploaded / is uploading.
function nfInProg() {
  try { nfDrafts(); } catch {}   // NEWREEL82 [M5 Max MBP] 2026-10-31
  try {
    if (!S.data || S.guest || S.sent) return null;
    const dr = { ...DEFAULT_DRAFT(), ...(S.draft || fetchStore("draft", {}) || {}) }, r = receivedReel(), f = nfFacts(dr);
    const busy = upList(nfUpReel()).filter(x => x.state === "up" || x.state === "wait").length;
    if (!r && !f.arr.n && !busy) return null;
    const clips = nfClips(dr), named = r && (fetchStore("titled", {})[r.id] || (r.titled && r.title && !GENERIC_TITLE.test(String(r.title).trim()) ? r.title : ""));
    const thumb = (clips.find(c => c.thumb) || {}).thumb || (r && (footPoster(footageOf(r)[0]) || (r.run || {}).poster)) || "";
    return { r, dr, clips, busy, thumb, title: String(dr.title || "").trim() || String(named || "").trim(), n: Math.max(clips.length, busy) };
  } catch { return null; }
}
// Per-reel drafts: a draft set aside with its reel comes back when the client continues that reel (Reels, Finish your brief).
function nfStash(key, dr) { if (!key || !dr) return; const m = fetchStore("draftfor", {}) || {}; m[key] = Object.assign({}, dr, { at: Date.now() });
  Object.keys(m).sort((a, b) => (m[b].at || 0) - (m[a].at || 0)).slice(12).forEach(k => delete m[k]); store("draftfor", m); }
function nfUnstash(key) { const m = fetchStore("draftfor", {}) || {}, d = m[key]; if (d) { delete m[key]; store("draftfor", m); } return d || null; }
function nfFresh(ip, keepStyle) {
  const old = S.draft || {}, key = ip && ip.r ? ip.r.id : ((old.batches || []).length ? "b:" + old.batches[0] : "");   // NEWREEL82 [M5 Max MBP] 2026-10-31: a phone-only draft too
  if (key) nfStash(key, Object.assign({}, old, { briefFor: ip && ip.r ? key : "" }));
  try { if ((old.batches || []).length) store("sentb", [...new Set([...nf82Sent(), ...old.batches.map(String)])].slice(-80)); } catch {}   // NEWREEL82: its uploads stay ITS clips (continuing it still counts them)
  nfSetAside(ip && ip.r, ((ip && ip.clips) || []).map(c => c.key));
  try { const u = upState(); u.items = u.items.filter(x => !(x.state === "done" && ((x.reel || "new") === "new" || (key && x.reel === key)))); } catch {}
  const nd = { ...DEFAULT_DRAFT(), freshAt: Date.now() };
  if (keepStyle) NF81_STYLE.forEach(k => { if (old[k] !== undefined) nd[k] = JSON.parse(JSON.stringify(old[k])); });
  S.briefFor = null; S.reel = null; S.draft = nd; store("draft", nd); S.f122cut = false;
}
function nfStartAsk(ip, extra, keepStyle) {
  const nm = ip.title || (ip.r ? "Your reel in progress" : "Your clips in progress");
  const names = ip.clips.map(c => c.name).filter(Boolean), line = ip.busy ? ip.busy + (ip.busy === 1 ? " clip still uploading" : " clips still uploading")
    : (ip.n + (ip.n === 1 ? " clip" : " clips") + (names.length ? ": " + names.slice(0, 2).join(", ") + (names.length > 2 ? " and " + (names.length - 2) + " more" : "") : ""));
  sheet(`<button type="button" class="nf82x" id="nf82x" aria-label="Close">×</button><h3 style="font-size:24px;font-family:var(--serif);font-weight:400;margin:0 44px 4px 0">You have a reel in progress</h3>
    <p class="muted" style="margin:0 0 10px">Pick up where you left off, or start a new reel. Starting new never deletes this one. It waits in Drafts on New reel until you finish its brief.</p>
    <div class="pickl" id="nf81card"><button type="button" id="nf81go"><div class="th">${ip.thumb ? `<img src="${esc(ip.thumb)}" alt="" onerror="this.remove()">` : "▶"}</div><div class="tx"><b>${esc(nm)}</b><span>${esc(line)}</span></div><i class="chev" aria-hidden="true">›</i></button></div>${nf82Strip(ip.clips)}
    <button class="btn primary block" id="nf81cont" type="button">Continue this reel</button>
    <button class="btn line block" id="nf81new" type="button" style="margin-top:8px"${ip.busy ? " disabled" : ""}>Start a new reel</button>
    ${ip.busy ? `<p class="muted" style="margin:8px 0 0;font-size:13px">Your clips are still uploading to this reel. You can start a new one once they finish.</p>` : ""}
    <button class="btn line block" id="nf81x" type="button" style="margin-top:8px">${ip.busy ? "Close" : "Not now, keep it in Drafts"}</button>`, () => nf82Dismiss(ip, keepStyle));   // NEWREEL82 [M5 Max MBP] 2026-10-31: tap outside, X, swipe or Close = it goes to Drafts
  const cont = () => { window.__sheetDismiss = null; closeSheet(); if (ip.r) { S.briefFor = ip.r.id; const dr = S.draft || (S.draft = { ...DEFAULT_DRAFT(), ...fetchStore("draft", {}) }); dr.briefFor = ip.r.id; store("draft", dr); }
    go("new", Object.assign({}, extra || {}, { step: nfResumeStep(S.draft), __nfok: 1 })); };
  $("#nf81go").onclick = cont; $("#nf81cont").onclick = cont;
  $("#nf81new").onclick = () => { if (ip.busy) return; window.__sheetDismiss = null; closeSheet(); nfFresh(ip, keepStyle); go("new", { step: 1, __nfok: 1 }); toast("New reel started. Your other reel waits in Drafts."); };
  $("#nf81x").onclick = sheetUserClose; $("#nf82x").onclick = sheetUserClose;
}
/* RAWCLIPS50 [M5 Max MBP] 2026-10-26 19:10 PDT. Nick TG 18:50: "give an option to view footage uploaded when they're reviewing the reel, like
   'view raw clips' ... They don't even remember which ones they uploaded." reel.raw (app_push, footage_preview.raw_for): every file the client
   uploaded for the reel {name, kind, dur, poster, video, ready, missing, too_big}. Opens the same sheet as See your footage, in "raw" mode. */
function rawOf(r) { return (r && r.raw && r.raw.length) ? r.raw : []; }
function openFootage(reelId, mode, start) {
  const raw = mode === "raw";
  const r = reelById(reelId) || (raw ? null : briefReel()), fs = raw ? rawOf(r) : footageOf(r); if (!r || !fs.length) return;
  let cur = (Number.isInteger(start) && start >= 0 && start < fs.length) ? start : Math.max(0, fs.findIndex(x => x.video)), muted = true;   // YOURCLIPS51: open on the tapped clip
  // [M5 Max MBP] 2026-09-30 (walkthrough agent): the preview never loaded for Nick. Show the still (poster/thumb) at once, a tidy name tile
  // when there is none, and if the preview video has not started playing within 3 s (or errors) swap it for the still. Never a broken player.
  const still = c => footPoster(c) ? `<img src="${esc(footPoster(c))}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'fwait',textContent:'Preview on its way. Your clip is safe with us.'}))"><span class="fwait" style="bottom:10px;left:0;right:0">${c.video ? "Preview on its way" : c.ready === false ? "Making the preview" : ""}</span>`
    : `<div class="fph"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10 9.5v5l4-2.5z"/></svg><b>${esc(c.name || "Your clip")}</b><span>${c.missing ? "No preview for this file. It was part of your upload." : c.too_big ? "This file is too large to preview here. It was part of your upload." : "Preview on its way. Your clip is safe with us."}</span></div>`;
  const draw = () => {
    const c = fs[cur] || {};
    sheet(`<h3 style="font-size:24px;font-family:var(--serif);font-weight:400;margin:0 0 2px">${raw ? "Your raw clips" : "Your footage"}</h3>
      <p class="muted" style="margin:0 0 12px;font-size:14px">${raw ? `${fs.length === 1 ? "The file" : "All " + fs.length + " files"} you uploaded for <b>${esc(reelLabel(r))}</b>. Tap one to watch it.` : `${fs.length === 1 ? "The clip" : "The " + fs.length + " clips"} in <b>${esc(reelLabel(r))}</b>. Your brief goes with ${fs.length === 1 ? "this clip" : "these clips"}.`}</p>
      <div class="fplay" id="fplay">${c.video ? `<video id="fpv" src="${esc(c.video)}" poster="${esc(footPoster(c))}" playsinline autoplay loop ${muted ? "muted" : ""}></video><button class="fsnd" id="fsnd" aria-label="${muted ? "Sound on" : "Sound off"}">${muted ? "Sound off · tap for sound" : "Sound on"}</button>` : still(c)}</div>
      ${c.video ? `<div class="fscrubw" id="fscrubw"><button type="button" class="fpp" id="fpp" aria-label="Pause"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg></button><div class="tl fscrub"><div class="track"></div><div class="fill" id="ffill"></div><input type="range" id="fsr" min="0" max="1000" value="0" step="1" aria-label="Scrub through this clip"></div><span class="ftm" id="ftm">${c.dur ? "0:00 / " + mmss(c.dur) : "0:00"}</span></div>` : ""}
      <div class="flist">${fs.map((x, i) => `<button class="fitem ${i === cur ? "on" : ""}" data-i="${i}"><span class="fth">${footPoster(x) ? `<img src="${esc(footPoster(x))}" alt="" onerror="this.remove()">` : `<span class="fthn"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10 9.5v5l4-2.5z"/></svg></span>`}</span><span class="ftx"><b>${esc(x.name)}</b><span>${x.dur ? mmss(x.dur) + (x.clipped ? " · preview shows the first 1:30" : "") : x.photo ? "Photo" : x.missing ? "No preview" : x.too_big ? "Too large to preview" : x.ready ? "" : "Making the preview"}</span></span></button>`).join("")}</div>
      <button class="btn line block" id="fclose" style="margin-top:12px">Close</button>`);
    document.querySelectorAll(".fitem").forEach(b => b.onclick = () => { cur = Number(b.dataset.i); draw(); });
    { const v = $("#fpv"), me = cur; if (v) { const fall = () => { if (cur !== me || !document.body.contains(v)) return; const box = $("#fplay"); if (box) box.innerHTML = still(c); const sw = $("#fscrubw"); if (sw) sw.remove(); };
        v.addEventListener("error", fall); setTimeout(() => { if (v.readyState < 2 || v.error) fall(); }, 3000); } }
    /* RAWVIEW50 [M5 Max MBP] 2026-10-27 (Nick TG 08:57: "you can't currently scrub through it. I want to be able to scrub through raw footage as
       well"). A scrub bar under each clip. The clip is the light 540 px preview (new previews have a keyframe every second), and a drag only
       ever has ONE seek in flight: the newest finger position waits for the previous "seeked", so the frame follows the finger with no queue. */
    { const v = $("#fpv"), sr = $("#fsr"), fill = $("#ffill"), tm = $("#ftm"), pp = $("#fpp");
      if (v && sr) {
        let drag = false, want = null, seeking = false, was = false;
        const dur = () => (isFinite(v.duration) && v.duration > 0) ? v.duration : (Number(c.dur) || 0);
        const show = t => { const d = dur(), p = d ? Math.max(0, Math.min(1, t / d)) : 0; if (!drag) sr.value = Math.round(p * 1000); if (fill) fill.style.width = (p * 100) + "%"; if (tm) tm.textContent = mmss(t) + (d ? " / " + mmss(d) : ""); };
        const icon = () => { if (!pp) return; const on = !v.paused || (drag && was); pp.setAttribute("aria-label", on ? "Pause" : "Play"); pp.innerHTML = on ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>' : '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="pl" d="M8 5l11 7-11 7z"/></svg>'; };
        const seek = () => { if (want == null || seeking) return; seeking = true; const t = want; want = null; try { v.currentTime = t; } catch { seeking = false; } };
        const hold = () => { if (drag) return; drag = true; was = !v.paused; v.pause(); };
        v.addEventListener("seeked", () => { seeking = false; seek(); });
        v.addEventListener("timeupdate", () => { if (!drag && !seeking) show(v.currentTime); });
        v.addEventListener("loadedmetadata", () => show(v.currentTime || 0));
        v.addEventListener("play", icon); v.addEventListener("pause", icon);
        sr.addEventListener("pointerdown", hold); sr.addEventListener("touchstart", hold, { passive: true });
        sr.oninput = () => { hold(); const d = dur(); if (!d) return; want = Math.min(d - 0.05, sr.value / 1000 * d); show(want); seek(); };
        sr.onchange = () => { const d = dur(); if (d) { want = Math.min(d - 0.05, sr.value / 1000 * d); seek(); } drag = false; if (was) v.play().catch(() => {}); icon(); };
        if (pp) pp.onclick = () => { if (v.paused) v.play().catch(() => {}); else v.pause(); };
        icon();
      } }
    const sn = $("#fsnd"); if (sn) sn.onclick = () => { muted = !muted; try { window.lumiSound && lumiSound(!muted); } catch {} const v = $("#fpv"); if (v) { v.muted = muted; v.play().catch(() => {}); } sn.textContent = muted ? "Sound off · tap for sound" : "Sound on"; };
    $("#fclose").onclick = closeSheet;
  };
  draw();
}
function openBrief(reelId) {
  // [M5 Max MBP] 2026-10-03 newreel (Nick TG 11:00): "Start your brief" opens the same flow at the right step: the clips + title pop-up
  // when the reel has no name yet, else the first step still owed (type, look, notes).
  // BETHFIX81 [M5 Max MBP] 2026-10-31: continuing a reel brings back ITS draft (set aside by Start a new reel) and keeps the other reel's draft for later
  if (reelId) { nfUnaside(reelId); const cur = S.draft || { ...DEFAULT_DRAFT(), ...fetchStore("draft", {}) }, ck = cur.briefFor || ((receivedReel() || {}).id) || "";
    if (ck && ck !== reelId) { nfStash(ck, Object.assign({}, cur, { briefFor: ck })); S.draft = { ...DEFAULT_DRAFT(), ...(nfUnstash(reelId) || {}), briefFor: reelId }; store("draft", S.draft); }
    else if (!ck) { const back = nfUnstash(reelId); if (back) { S.draft = { ...DEFAULT_DRAFT(), ...back, briefFor: reelId }; store("draft", S.draft); } } }
  if (reelId) S.briefFor = reelId;
  if (reelId && S.draft && !(S.draft.batches || []).length && !String(S.draft.title || "").trim()) { const back = nfUnstash(reelId);   // NEWREEL82 [M5 Max MBP] 2026-10-31
    if (back) S.draft = { ...DEFAULT_DRAFT(), ...back, briefFor: reelId }; else delete S.draft.freshAt; store("draft", S.draft); }
  const dr = S.draft || (S.draft = { ...DEFAULT_DRAFT(), ...fetchStore("draft", {}) });
  if (reelId) dr.briefFor = reelId;   // UPREEL51
  if (receivedFiles().length) { dr.uploaded = true; dr.video = "uploaded"; }
  const r = reelById(reelId) || briefReel(), done = fetchStore("titled", {});
  const named = r && (done[r.id] || (r.titled && r.title && !GENERIC_TITLE.test(String(r.title).trim()) ? r.title : ""));
  if (named && !String(dr.title || "").trim()) dr.title = String(named).trim();
  if (!String(dr.title || "").trim()) dr.popped = false;
  store("draft", dr); S.reel = null; S.sent = false; closeSheet(); go("new", { step: nfResumeStep(dr), __nfok: 1 });
  if (!String(dr.title || "").trim()) setTimeout(() => { if (S.view === "new") nfClipsPop(dr); }, 400);
}
function savedLook() {
  const d = S.data || {}, c = (d.design || {}).current, an = (d.account || {}).look;
  const name = (c && c.name) || (an && an !== "Your approved look" ? an : null) || lastLook() || an || "Your approved look";
  const l = lookByName(name);
  return { name, poster: (c && c.poster) || (l && l.poster) || "" };
}
/* ---------- Lumi, per state (Nick 2026-09-26: "I want people to feel like Lumi is actually editing their video") ---------- */
const MOOD = {
  // GIF54 [M5 Max MBP] 2026-10-29: animated images, never <video> (Low Power Mode blocks video autoplay). edit = the Seedance laptop loop.
  // LUMIWALL200 [M5 Max MBP] 2026-11-16: edit = Lumi cutting a floating timeline, looks back, nods, thumbs up (Seedance, keyed to alpha; old laptop loop kept on disk).
  edit: { i: "/lumi_scenes/lumi_timeline_edit_loop.webp?v=w200", scene: 1, alpha: 1 }, plan: { i: "/lumi/plan.webp?v=g54" }, happy: { i: "/lumi/happy.webp?v=g54" },
  wait: { i: "/lumi/wait.webp" }, got: { i: "/lumi/got.webp" }, ask: { i: "/lumi/ask.webp" }, sad: { i: "/lumi/sad.webp" }, welcome: { i: "/lumi/welcome.webp" } };
function lumiFace(mood) {
  const m = MOOD[mood] || MOOD.wait;
  if (m.v) return `<div class="face"><video src="${m.v}" poster="${m.p}" muted loop autoplay playsinline></video></div>`;
  return `<div class="face ${m.sad ? "sad" : ""}${m.scene ? " scene" : ""}${m.alpha ? " alpha" : ""}"><img class="wave" src="${m.i}" alt="">${m.bub ? `<span class="bub ${m.bub === "ok" ? "ok" : ""}">${m.bub === "ok" ? "✓" : "?"}</span>` : ""}</div>`;
}
function statusCard(title, sub) { return `<div class="card statusc"><span class="spk" aria-hidden="true">✦</span><div class="txt"><b>${esc(title)}</b>${sub ? `<span>${esc(sub)}</span>` : ""}</div><span class="cloud" aria-hidden="true"></span></div>`; }
function lumiCard(mood, title, sub, extra) { return `<div class="card lumic" style="margin-bottom:14px">${lumiFace(mood)}<div class="txt"><b>${esc(title)}</b>${sub ? `<span>${esc(sub)}</span>` : ""}${extra || ""}</div></div>`; }
function moodOf(r) {
  if (!r) return "wait";
  if (r.progress && r.progress.mood) return r.progress.mood;
  if (r.status === "done" || r.status === "review") return "happy";
  if (r.status === "received") return "got";
  return "wait";
}
// [M5 Max MBP] 2026-09-29 sweep50: progress is only shown as live while the snapshot is fresh. An old snapshot (the Mac stopped pushing)
// keeps its bar but drops "about N min to go" and "Lumi is editing". (The % itself freezing inside a long render is on the Mac, app_push.)
function staleSnap() { const at = Number((S.data || {}).at) || 0; return at > 0 && Date.now() / 1000 - at > 600; }
function etaOf(p) { return p && p.eta_min && !staleSnap() ? p.eta_min : 0; }
// PAYFIRST194 [M5 Max MBP] 2026-11-10 (Nick TG: reel 2 is pay first, tested on the next 20 returning clients). The Mac sends reel.pay_first
// {amount, line, sub, state:"waiting"} plus the pay link in the existing reel.pay while a new reel waits for its payment, and
// snapshot.pay_first_next {amount, line, sub} when this client's next new reel will be pay first. No field = the app is exactly as before.
// The reel shows "Pay to start your edit" (never an error face, never a made-up percent) and goes back to the normal card by itself
// the moment the Mac drops pay_first.
const PF194_LINE = "This one is $20. Your first reel was free.";
const PF194_SUB = "Pay to start your edit. It starts by itself the moment your payment lands.";
const PF194_NEXT_SUB = "You pay after you send your clips and brief, and the edit starts the moment the payment lands.";
function pf194(r) { const p = r && r.pay_first; return p && typeof p === "object" && String(p.state || "waiting") === "waiting" && r.status !== "cancelled" && !(r.versions || []).length && !needsBrief(r) ? p : null; }
function pf194Next() { const p = S.data && S.data.pay_first_next; return p && typeof p === "object" && !isComped(S.data) ? p : null; }
// The Pay button is the app's existing pay link flow: the same reel.pay link (already checked by payUrlOk when the snapshot loads), the
// account email prefilled (CONV50 payPrefill50) and one checkout tab per tap (tapOk), through one listener for every screen.
function pf194Href(u) { try { const em = (((S.data || {}).account) || {}).email; u = String(u || ""); if (!em || !payUrlOk(u) || /[?&]prefilled_email=/.test(u)) return u; return u + (u.includes("?") ? "&" : "?") + "prefilled_email=" + encodeURIComponent(em); } catch { return String(u || ""); } }
document.addEventListener("click", e => { const a = e.target && e.target.closest ? e.target.closest("a.pf194pay") : null; if (!a) return;
  if (!tapOk("pay:" + a.href, 2500)) { e.preventDefault(); return; } try { funnel50("funnel50_tap_reel", 0); } catch {} });
function pf194Btn(r, cls) { const p = pf194(r) || {}, a = Number(p.amount);
  return r.pay ? `<a class="btn primary ${cls || ""} pf194pay" href="${esc(pf194Href(r.pay))}" target="_blank" rel="noopener" style="margin-top:10px">${a > 0 ? "Pay $" + esc(a) + " to start" : "Pay to start"}</a>`
    : `<span class="muted pf194wait" style="display:block;margin-top:8px;font-size:13px">Your pay link is on its way. It shows here in a moment.</span>`; }
function pf194Card(r) { const p = pf194(r);
  return lumiCard("ask", "Pay to start your edit", String(p.line || PF194_LINE), `<span class="pf194sub" style="display:block;margin-top:4px">${esc(String(p.sub || PF194_SUB))}</span><div>` + pf194Btn(r, "sm") + `</div>`).replace('class="card lumic"', 'class="card lumic pf194" data-pf194="' + esc(r.id) + '"'); }
function progressCard(r) {
  if (needsBrief(r)) return briefCard(r);
  if (pf194(r)) return pf194Card(r);   // PAYFIRST194
  const p0 = r.progress; if (!p0) return "";
  const p = Object.assign({}, p0, { eta_min: etaOf(p0), live: p0.live && !staleSnap() });
  const bar = p.eta_min ? `<div class="prog2${pcls(p)}"><i style="width:${p.pct}%"></i></div><div class="eta"><span>${p.pct}%</span><span>about ${p.eta_min} min to go</span></div>` : (p.pct ? `<div class="prog2${pcls(p)}"><i style="width:${p.pct}%"></i></div>` : "");
  const add = r.status !== "done" && !p.needs_you && !(p.synth && r.channel !== "app") ? `<button class="btn sm line addv" data-reel="${esc(r.id)}" style="margin-top:10px">Add videos to this edit</button>` : "";
  const ans = p.needs_you ? `<button class="btn sm primary tochat" data-reel="${esc(r.id)}" style="margin-top:10px">Answer in Chat</button>` : "";
  const title = p.needs_you ? "Lumi needs you" : p.stalled ? "Still on it" : p.live ? "Lumi is editing" : "Lumi has it";
  // [M5 Max MBP] 2026-10-04 Nick TG: the stage line names the reel and the version being made ("Cutting your reel: <title> (V2)"), app-wide.
  const vNext = (r.versions || []).length + 1;
  const stage = p.stage && !p.needs_you ? `${p.stage}: ${runTitle(r)} (V${vNext})` : p.stage;
  return lumiCard(p.mood || moodOf(r), title, stage, bar + add + ans);
}
// RUNNING NOW CARD [M5 Max MBP] 2026-09-28 21:3x PDT (running-now agent). The reel's title large, the real status line from app_push
// (r.run.line: "Revision 2 of 5: applying your notes", "New reel: cutting"), a thumbnail of the actual footage and a cut-out Lumi at work.
const GENERIC_TITLE = /^(new reel|your reel|first reel|reel|untitled)?$/i;
function runTitle(r) { const t = String(r.title || "").trim(); return GENERIC_TITLE.test(t) ? reelLabel(r) : t; }   // namereel 2026-10-02: an untitled reel shows its name "<Client> - NNN"
function runLine(r) {
  if (r.run && r.run.line) return r.run.line;
  const p = r.progress || {}, rev = (r.versions || []).length > 0;
  return "V" + Math.max(1, (r.versions || []).length + (rev ? 1 : 0)) + (p.stage ? ": " + p.stage.charAt(0).toLowerCase() + p.stage.slice(1) : "");   // [M5 Max MBP] 2026-10-19 Nick TG: V1/V2/V3, never "Revision"
}
function runCard(r) {
  const p = r.progress || {}, run = r.run || {};
  const nb = needsBrief(r), fts = footageOf(r);
  const pic = posterOf(r) || run.poster || "";   // gradedthumbs 2026-10-07: no raw footage still as the reel's picture
  const rev = run.kind ? run.kind === "revision" : (r.versions || []).length > 0;
  const you = !!p.needs_you, req = !!run.requested;
  const vnum = Math.max(1, (r.versions || []).length + (rev ? 1 : 0)); const kind = nb ? "Needs your brief" : you ? "Needs you" : "V" + vnum + " \u00b7 " + (req ? "Changes in" : "Editing");   // [M5 Max MBP] 2026-10-19 Nick TG: no "Revision" tag; show V1/V2/V3 + the stage
  // [M5 Max MBP] 2026-09-30 (walkthrough agent): New reel and Revision tags get their own colours, and every running reel shows a bar:
  // the real % when the Mac sends one, otherwise an animated bar with the stage, so the client always sees something is happening.
  const kcls = you || nb ? "you" : req ? "req" : rev ? "rev" : "new";
  const bar = p.pct ? `<div class="prog2${pcls(p)}"><i style="width:${p.pct}%"></i></div>${etaOf(p) ? `<div class="eta"><span>${p.pct}%</span><span>about ${etaOf(p)} min to go</span></div>` : `<div class="eta"><span>${p.pct}%</span><span></span></div>`}`
    : you ? "" : `<div class="prog2 ind${pcls(p)}"><i></i></div><div class="pstage"><span>${esc(p.stage || (r.status === "received" ? "In the queue" : "In the edit"))}</span></div>`;
  const add = r.status !== "done" && !you && !(p.synth && r.channel !== "app") && r.channel === "app" ? `<button class="btn sm line addv" data-reel="${esc(r.id)}" style="margin-top:6px;align-self:flex-start">Add videos to this edit</button>` : "";
  const ans = you ? `<button class="btn sm primary tochat" data-reel="${esc(r.id)}" style="margin-top:6px;align-self:flex-start">Answer in Chat</button>` : "";
  const t = runTitle(r);
  if (nb) {
    const nbtn = `<div class="row" style="gap:8px;margin-top:6px;flex-wrap:wrap"><button class="btn sm primary tobrief" data-reel="${esc(r.id)}">${briefLbl()}</button>${fts.length ? `<button class="btn sm line seefoot" data-reel="${esc(r.id)}">See your footage (${fts.length})</button>` : ""}</div>`;
    return `<div class="card runc" data-run="${esc(r.id)}"><div class="rth"><div class="rimg">${pic ? `<img src="${esc(pic)}" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'rph',textContent:'${no3(r.n)}'}))">` : `<span class="rph">${esc(no3(r.n))}</span>`}</div><img class="rlumi" src="/lumi/runedit.webp" alt="Lumi editing"></div>
    <div class="rtx"><span class="rkind you">${esc(kind)}</span>${payStamp(r)}<b class="rtitle">${esc(t)}</b><span class="rline">Your clips are in. Start your brief and we start editing.</span><span class="rname">${esc(reelLabel(r))}</span>${nbtn}${nameBtn(r)}</div></div>`;
  }
  if (pf194(r)) {   // PAYFIRST194: waiting for its payment. No bar, no percent, one Pay button.
    const pf = pf194(r);
    return `<div class="card runc pf194" data-run="${esc(r.id)}" data-pf194="${esc(r.id)}"><div class="rth"><div class="rimg">${pic ? `<img src="${esc(pic)}" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'rph',textContent:'${no3(r.n)}'}))">` : `<span class="rph">${esc(no3(r.n))}</span>`}</div></div>
    <div class="rtx"><span class="rkind you">Pay to start your edit</span><b class="rtitle">${esc(t)}</b><span class="rline">${esc(String(pf.line || PF194_LINE))}</span><span class="muted pf194sub" style="display:block;font-size:13px;line-height:1.35;white-space:normal;margin-top:2px">${esc(String(pf.sub || PF194_SUB))}</span><div>${pf194Btn(r, "sm")}</div>${nameBtn(r)}</div></div>`;
  }
  const sub = GENERIC_TITLE.test(String(r.title || "").trim()) ? (run.upload ? "From your clip: " + run.upload : "") : reelLabel(r);   // namereel: the title line already shows the name
  return `<div class="card runc" data-run="${esc(r.id)}"><div class="rth"><div class="rimg">${pic ? `<img src="${esc(pic)}" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'rph',textContent:'${no3(r.n)}'}))">` : `<span class="rph">${esc(no3(r.n))}</span>`}</div><img class="rlumi" src="/lumi/runedit.webp" alt="Lumi editing"></div>
    <div class="rtx"><span class="rkind ${kcls}">${esc(kind)}</span>${payStamp(r)}<b class="rtitle">${esc(t)}</b><span class="rline">${esc(runLine(r))}</span><span class="rname">${esc(sub)}</span>${bar}${add}${ans}${nameBtn(r)}</div></div>`;
}
function placeBig() {
  const bg = document.getElementById("big"), pl = document.getElementById("player"); if (!bg || !pl || !bg.firstElementChild) return;
  const pr = pl.getBoundingClientRect(); if (!pr.height) return;
  let lim = innerHeight; document.querySelectorAll("#dock .actions .in, #tabs").forEach(e => { const r = e.getBoundingClientRect(); if (r.height && r.top > 0) lim = Math.min(lim, r.top); });
  const top = Math.max(pr.top, 0), bot = Math.min(pr.bottom, lim);
  let y = bot - top >= 100 ? (top + bot) / 2 - pr.top : pr.height / 2; y = Math.max(46, Math.min(pr.height - 46, y));
  bg.firstElementChild.style.transform = "translateY(" + Math.round(y - pr.height / 2) + "px)";
}
// A change request shows up the second it is sent, before the next snapshot (the server keeps it from then on).
function applyRevReq(reels) {
  // [M5 Max MBP] 2026-10-01 07:26 PDT qa2fix #3: markers are cleared only on what the SERVER snapshot says (S.srv, read in load() before any local change). Comparing with the
  // reel itself cleared them at once: Approve sets r.status "done" locally, and the change request matched its own synthetic r.run.
  const srv = id => (S.srv || {})[id] || null;
  { const ap = fetchStore("approvedreels", {}); let dd = false; const nw = Date.now();   // an Approve tap shows Done at once, before the Mac's next push
    for (const id of Object.keys(ap)) { const r = reels.find(x => x.id === id), sv = srv(id);
      if (!r || nw - ap[id] > 30 * 60 * 1000 || (sv && (sv.status === "done" || sv.approved))) { delete ap[id]; dd = true; continue; } r.status = "done"; r.approved = true; }
    if (dd) store("approvedreels", ap); }
  const rq = fetchStore("revreq", {}); let dirty = false; const now = Date.now();
  for (const id of Object.keys(rq)) {
    const r = reels.find(x => x.id === id), q = rq[id], sv = srv(id), last = sv ? sv.nv : 0;
    if (!r || now - q.at > 30 * 60 * 1000 || (sv && (last > q.n || sv.run || sv.prog || sv.status === "editing" || sv.status === "received"))) { delete rq[id]; dirty = true; continue; }
    r.status = "editing";
    { const n = revUsedOf(r) + 1, cap = Math.max(1, Number(r.revision_limit || 5)); r.run = { kind: "revision", requested: true, rev: n, line: "V" + (n + 1) + ": changes requested, starting soon" };   /* [M5 Max MBP] 2026-10-19 Nick TG: V numbers, never "Revision" */ }   // [M5 Max MBP] 2026-10-01 14:32 PDT notefix: exempt = no cap shown
  }
  if (dirty) store("revreq", rq);
}
/* REVISION ON TOP + NEW VERSION SHIMMER. [M5 Max MBP] 2026-10-08 21:3x PDT (revtop), Nick TG 21:05: "if someone requests an edit from an older
   video that's far down in there and then it renders a new video, the new video needs to pop up as the latest reel. It needs to have a
   shimmering iridescent outline until they click on it ... It should be at the top also." (1) reelOrder: reels being edited or revised
   first, then by most recent activity (r.act from the Mac = newest version or, while in the edit, the last move; a change request sent
   from this phone counts at once). (2) A reel whose newest version (v2+, or a first cut, delivered in the last 7 days) is unopened gets the
   iridescent outline and a "New version" badge until the reel is opened. Seen = the account's /api/seen list (ids "rv<hash>v<n>",
   same store as the new-style banner, so another phone agrees) + localStorage, every access wrapped. */
const secs = t => { t = Number(t) || 0; return t > 1e12 ? t / 1000 : t; };
function actOf(r) { let a = Math.max(secs(r.act), ...((r.versions || []).map(v => secs(v.at))), 0);
  try { const q = fetchStore("revreq", {})[r.id]; if (q && q.at) a = Math.max(a, secs(q.at)); } catch {}
  if (!a) a = secs(r.updated); return a; }
function reelOrder(reels) { try { const run = r => isRunning(r) ? 1 : 0; reels.sort((a, b) => (run(b) - run(a)) || (actOf(b) - actOf(a))); } catch {} return reels; }
const rvId = (r, n) => "rv" + hash32(String(r.id)).toString(36) + "v" + n;
function isNewVer(r) { try { const vs = r && r.versions || []; if (!vs.length || ["done", "cancelled"].includes(r.status) || isRunning(r)) return false;
    const v = vs[vs.length - 1]; if (Date.now() / 1000 - secs(v.at) > 7 * 86400) return false;
    if (secs(v.at) < (Number(S.rvFrom) || 1791486000)) return false;     // rollout 2026-10-08 12:00 PDT: older deliveries never light up all at once
    const id = rvId(r, vs.length); if (annSeen()[id]) return false; if ((S._annSrv || []).includes(id)) return false; return true; } catch { return false; } }
function markVerSeen(r) { try { const vs = r && r.versions || []; if (!vs.length) return; const id = rvId(r, vs.length), loc = annSeen(); if (loc[id]) return;
    loc[id] = Date.now(); store("annseen", loc); const q = fetchStore("annq", []); if (!q.includes(id)) q.push(id); store("annq", q); annFlush(); } catch {} }
const no3 = n => String(n || "").padStart(3, "0");
// [M5 Max MBP] 2026-09-29 sweep: the 3-column grid has room for ~2 short lines, so it drops the leading "<client name> - " and shows the reel's own title
function gridLabel(r) { const L = reelLabel(r), d = S.data || {}; for (const n of [d.full_name, d.name, firstName()].filter(Boolean)) { const p = String(n).trim() + " - "; if (L.toLowerCase().startsWith(p.toLowerCase()) && L.length > p.length) return L.slice(p.length); } return L; }
function firstName() { const n = ((S.data && S.data.name) || "").trim(); return n && n !== "there" ? n.split(" ")[0] : ""; }
// ONE NAME EVERYWHERE (Nick 2026-09-26): the reel is called exactly what its delivered file is called, "<Client Full Name> - <Title> - <NNN>".
function reelLabel(r) { return r ? (r.name || [firstName(), r.title, no3(r.n)].filter(Boolean).join(" - ")) : ""; }
function isLand(v) { return !!(v && Number(v.w) > 0 && Number(v.w) > Number(v.h)); }   // HORIZ183 [M5 Max MBP] 2026-11-07 (Nick TG 23581): a 1920x1080 version plays landscape
function posterOf(r) { const v = (r.versions || [])[(r.versions || []).length - 1]; return (v && v.poster) || (r.preview && r.preview.poster) || (r.run && r.run.poster) || ""; }   // [M5 Max MBP] 2026-10-07 gradedthumbs (Nick: "let's not show thumbnails that aren't colored"): a reel's cover is the delivered cut, the graded first look, or the graded first-pass still. Never the client's raw clip (that stays in See your footage, labelled as their upload); none yet = the placeholder tile
/* [M5 Max MBP] 2026-10-07 07:2x PDT paperclip (Nick TG 07:11): "I can't click on the reels that are already sent to add files, and not all
   of them are popping up here." Root cause: the picker showed only the first 8 reels (slice(0, 8)), hid every Drive reel, and a tap on a
   lower tile redrew the sheet scrolled back to the top with the upload button below 8 tall tiles, so the tap looked dead.
   Now: "A new reel" first, then EVERY reel (in the works and delivered, Drive ones too) newest first as compact rows, 12 at a time with
   "Show all". A tap opens that reel's own step with the upload button on top. Files added to a delivered reel start a revision of that
   same reel (concierge clips_added: revision cap and approval reopen handled on the Mac). */
function addHint(r) {
  if (!r) return "";
  const delivered = r.status === "done" || r.status === "review" || String(r.id).startsWith("drive:") || (r.versions || []).length > 0;
  if (!delivered) return r.status === "cancelled" ? "" : "Goes into the edit that is in the works.";
  if (r.revision_exempt) return "Starts a new version of this reel.";
  const n = revUsedOf(r) + 1, cap = Math.max(1, Number(r.revision_limit || 5));
  return n > cap ? "This reel has used its " + cap + " included revisions. Send them anyway and the team will message you here about it."
    : "Starts revision " + n + " of " + cap + " on this reel.";
}
function addStatus(r) { return r.status === "done" ? (String(r.id).startsWith("drive:") ? "Delivered" : "Approved") : r.status === "review" ? "Delivered, ready for review" : (ST[r.status] || ST.editing)[0]; }
function openAdd(reelId) {
  const reels = (S.data.reels || []).filter(r => r.status !== "cancelled");
  let pick = reelId && reelById(reelId) ? reelId : null, all = false;
  const thumb = x => posterOf(x) ? `<img src="${esc(posterOf(x))}" alt="" loading="lazy">` : esc(no3(x.n));
  const draw = () => {
    const r = pick ? reelById(pick) : null;
    if (!r) {
      const shown = all ? reels : reels.slice(0, 12);
      sheet(`<h3 style="font-size:24px;font-family:var(--serif);font-weight:400;margin:0 0 4px">Add to a reel</h3>
      <p class="muted" style="margin:0 0 10px">Clips, photos or a voiceover. Pick the reel they belong to, then send the files.</p>
      <div class="pickl"><button data-r="new" class="pnew"><div class="th">+</div><div class="tx"><b>A new reel</b><span>Start a fresh edit</span></div></button>
      ${shown.map(x => `<button data-r="${esc(x.id)}"><div class="th">${thumb(x)}</div><div class="tx"><b>${esc(reelLabel(x))}</b><span class="st ${esc(x.status || "")}">${esc(addStatus(x))}</span></div><i class="chev" aria-hidden="true">›</i></button>`).join("")}</div>
      ${!all && reels.length > shown.length ? `<button class="btn line block" id="pall">Show all ${reels.length} reels</button>` : ""}
      <button class="btn line block" id="cx" style="margin-top:10px">Close</button>`);
      document.querySelectorAll(".pickl [data-r]").forEach(b => b.onclick = () => { if (b.dataset.r === "new") { closeSheet(); go("new", { step: 1 }); return; } pick = b.dataset.r; draw(); });
      const pa = $("#pall"); if (pa) pa.onclick = () => { const st = $("#sheet").scrollTop; all = true; draw(); $("#sheet").scrollTop = st; };
      $("#cx").onclick = closeSheet;
      return;
    }
    const hint = addHint(r);
    sheet(`<button class="pback" id="pback" type="button">‹ All reels</button>
      <h3 id="addh" style="font-size:24px;font-family:var(--serif);font-weight:400;margin:6px 0 10px">Add to this reel</h3>
      <div class="pickl one"><div class="prow"><div class="th">${thumb(r)}</div><div class="tx"><b>${esc(reelLabel(r))}</b><span class="st ${esc(r.status || "")}">${esc(addStatus(r))}</span></div></div></div>
      ${hint ? `<p class="phint">${esc(hint)}</p>` : ""}
      <label class="btn primary block" for="upfile2" role="button">Choose photos and videos</label><input type="file" id="upfile2" class="vh" multiple accept="image/*,video/*">
      <label class="btn line block" for="upfile3" role="button" style="margin-top:8px">Add a voiceover or audio file</label><input type="file" id="upfile3" class="vh" multiple accept="audio/*">
      <p class="muted" id="upmany" style="font-size:13px;margin:8px 0 0">Tip: tap as many as you like in your Photos before you tap Add. You can also come back and add more while these upload.</p>
      <ul class="nffiles" id="upsheet">${upList(r.id).map(upRow).join("")}</ul>
      <div id="updone"></div>
      <p style="font-size:14px;margin:12px 0">Record in your Camera app first, then choose from your Photos. Once they land, I ask you in Chat where they go in <b>${esc(reelLabel(r))}</b>. Same reel, no new title needed.</p>${quotaBar(r)}
      <button class="btn line block" id="cx" style="margin-top:10px">Close</button>`);
    $("#pback").onclick = () => { pick = null; draw(); };
    $("#cx").onclick = closeSheet;
    // inappupload 2026-10-11: the files upload right here, with a bar each.
    // ADDAPPROVED50 [M5 Max MBP] 2026-10-26 21:03 PDT (Nick TG 8:59 pm, adding photos to his approved reel 049): the sheet used to close itself
    // 0.9 s after the last file finished and jump to Chat, so a 1 MB photo "just disappeared" and he had to reopen it for each photo (two batches
    // of one). Now the sheet stays open with every row and its bar, "Add more" keeps working, and Chat is one tap ("Go to Chat") when they are done.
    // The files stay on THIS reel (reel id on every upload call) and the phone remembers it, so no new-reel title pop-up asks for a name.
    const pickFiles = inp => { const fs = [...(inp.files || [])]; inp.value = ""; if (!fs.length) return; const rid = pick;
      store("addedto", { reel: rid, at: Date.now() });
      upAdd(fs, { reel: rid, onAll: items => { const k = items.filter(x => x.reel === rid).length; toast(`Got your ${k} file${k === 1 ? "" : "s"}. Lumi asks you in Chat where they go.`); store("addedto", { reel: rid, at: Date.now() }); paintSheet(); } }); paintSheet(); };
    ["#upfile2", "#upfile3"].forEach(id => { const inp = $(id); if (inp) inp.onchange = () => pickFiles(inp); });
    const paintSheet = () => { const ul = $("#upsheet"); if (!ul || !pick) return; ul.innerHTML = upList(pick).map(upRow).join("");
      const its = upList(pick), dn = $("#updone"); if (!dn) return;
      const allIn = its.length && its.every(x => x.state === "done");
      { const ah = $("#addh"), busy = its.some(x => x.state === "up" || x.state === "wait"), was = ah && ah.dataset.busy === "1";   // UPDOTS50 [M5 Max MBP] 2026-10-29
        if (ah && busy !== was) { ah.dataset.busy = busy ? "1" : ""; ah.innerHTML = busy ? 'Uploading now<span class="updots" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span>' : "Add to this reel"; } }
      dn.innerHTML = allIn ? `<p class="phint" style="margin:10px 0 6px">All ${its.length} in on <b>${esc(reelLabel(reelById(pick) || { id: pick }))}</b>. Lumi asks you in Chat where they go.</p><button class="btn primary block" id="upgochat" type="button">Go to Chat</button>` : "";
      const gc = $("#upgochat"); if (gc) gc.onclick = () => { closeSheet(); go("msgs"); }; };
    window.__upSheetPaint = paintSheet;
  };
  draw();
}
function quotaBar(r, label) {
  const q = r && r.quota; if (!q || !q.cap_gb) return "";
  const pct = Math.min(100, Math.round(q.used_gb / q.cap_gb * 100));
  return `<div class="quota ${pct > 80 ? "high" : ""}"><span>${q.used_gb < 0.1 ? "<0.1" : q.used_gb} of ${q.cap_gb} GB ${esc(label ? "uploaded for " + label : q.kind)}</span><div class="qb"><i style="width:${Math.max(2, pct)}%"></i></div></div>`;
}
/* Lumi nods the moment something is actually saved (the send came back ok from the server). Never on a guess. */
/* [M5 Max MBP] 2026-09-29 07:25 PDT Nick: "not super clear ... when they send in revisions ... I would love a pop-up box or Lumi to do
   a backflip and say 'Got your revisions. We're working on it'". Full-screen card, Lumi flips, confetti, closes itself after 5 s. */
/* [M5 Max MBP] 2026-09-29 08:18 PDT Nick: after Approve "I would love to get an actual Lumi dance going". Lumi's happy loop dances,
   confetti rains, closes itself after 5 s. */
function approvePop() {
  document.querySelectorAll(".revpop").forEach(x => x.remove());
  const o = document.createElement("div"); o.className = "revpop appr";
  const rain = Array.from({ length: 26 }, (_, i) => `<i style="left:${Math.round((i * 37) % 100)}%;--c:${["#6aa6ff", "#a98bf5", "#ffc371", "#5bd39b", "#ff8fc8"][i % 5]};animation-delay:${(i % 9) * .12}s;animation-duration:${1.6 + (i % 5) * .25}s"></i>`).join("");
  o.innerHTML = `<div class="rain">${rain}</div><div class="rpc" role="dialog" aria-live="polite"><div class="dance"><video src="/lumi/happy.mp4" poster="/lumi/happy.jpg" autoplay muted loop playsinline></video></div>
    <h2>Approved! 🎉</h2><p>Lumi is doing a happy dance. Your reel is done and yours to post. Tag us, we love seeing them out in the wild.</p>
    <button class="btn primary block" type="button">Yay</button></div>`;
  const close = () => { o.classList.add("out"); setTimeout(() => o.remove(), 250); };
  o.onclick = e => { if (e.target === o || e.target.closest("button")) close(); };
  document.body.appendChild(o); requestAnimationFrame(() => o.classList.add("in"));
  setTimeout(close, 5500);
}
function revPop(n, joined) {
  document.querySelectorAll(".revpop").forEach(x => x.remove());
  const o = document.createElement("div"); o.className = "revpop";
  const bits = Array.from({ length: 18 }, (_, i) => `<i style="--x:${Math.round(Math.cos(i / 18 * 6.283) * (90 + (i % 3) * 30))}px;--y:${Math.round(Math.sin(i / 18 * 6.283) * (90 + (i % 3) * 30))}px;--c:${["#6aa6ff", "#a98bf5", "#ffc371", "#5bd39b", "#ff8fc8"][i % 5]};animation-delay:${.55 + (i % 4) * .03}s"></i>`).join("");
  o.innerHTML = `<div class="rpc" role="dialog" aria-live="polite"><div class="rpl"><div class="rpb">${bits}</div><img src="/lumi/rush.gif" alt="Lumi rushing to his desk" style="border-radius:18px"></div>
    <h2>${joined ? "Got your notes!" : "Got your revisions!"}</h2><p><b>Okay, I'm on it. I'm totally on it.</b> ${joined ? "We're adding them to the edit that is already running. " : n ? "Revision " + n + " is in the edit. " : ""}We're working on it now and you'll get a message the second it's ready.</p>
    <button class="btn primary block" type="button">Sounds good</button></div>`;
  const close = () => { o.classList.add("out"); setTimeout(() => o.remove(), 250); };
  o.onclick = e => { if (e.target === o || e.target.closest("button")) close(); };
  document.body.appendChild(o); requestAnimationFrame(() => o.classList.add("in"));
  setTimeout(close, 7000);   // [M5 Max MBP] 2026-09-30: let the 5 s rush animation finish
}
/* NAME YOUR REEL. [M5 Max MBP] 2026-09-30 08:3x PDT, Nick: once the upload turns green they MUST give the reel a title, in a dialog they
   cannot click off; editing carries on behind it. The name becomes "<Their Name> - <Title> - NNN" (app_intents "title" -> app_push). */
function titleGate() {
  try {
    if (!S.data || document.querySelector(".titlepop")) return;
    // [M5 Max MBP] 2026-09-30 (walkthrough agent): Nick saw this pop up "randomly" mid-brief. It now only shows on step 1 once the upload is
    // green, or anywhere outside the new-reel flow (app open with an untitled received reel). Never on steps 2 to 4, never over a sheet.
    // [M5 Max MBP] 2026-10-03 newreel: inside New reel the name is asked by the flow's own clips pop-up, never by this one.
    if (S.view === "new") return;
    { const ns = fetchStore("nfsent", null); if (ns && ns.at && Date.now() - ns.at < 15 * 60000) return; }   // the reel just sent is named by its brief
    if (document.querySelector("#sheet.on, .nfpop")) return;
    // ADDAPPROVED50 [M5 Max MBP] 2026-10-26 21:03 PDT: files this phone just added to an EXISTING reel (approved or not) are that reel's. For
    // a couple of minutes the Mac could list them as a just-landed "received" upload (dbx:...), and this pop-up asked Nick to title a "new"
    // reel. While an add to an existing reel is fresh (30 min), a just-landed placeholder is never asked for a name.
    const addTo = fetchStore("addedto", null), addFresh = !!(addTo && addTo.reel && addTo.reel !== "new" && Date.now() - (Number(addTo.at) || 0) < 30 * 60000);
    // [M5 Max MBP] 2026-10-02 18:10 PDT namereel, Nick TG 17:51: naming is MANDATORY. (1) The New reel flow now asks for the name before the
    // upload (S.draft.title); when that upload lands, the name goes to the Mac on its own, no pop-up. (2) Every unnamed reel still in the
    // works (no version yet: footage in, or the edit running) is asked for a name once, on open. The build carries on behind it.
    const done = fetchStore("titled", {});
    const inWork = x => reelInWork(x, done, addFresh, addTo) && true;
    // appfix A2/A9 2026-10-03: on New reel the upload that just landed (receivedReel) is the one the step 1 name belongs to
    const rr0 = !S.sent ? receivedReel() : null;
    const r = (rr0 && inWork(rr0)) ? rr0 : (S.data.reels || []).find(inWork);
    if (!r) return;
    const dt = String((S.draft || {}).title || "").trim();
    // [M5 Max MBP] 2026-10-03 newreel (Nick TG 11:00): clips in, no title, they left and came back: the SAME clips + title pop-up shows on
    // their next open (once per app open), and Next takes them on into the brief.
    // NONAG51 [M5 Max MBP] 2026-10-29 (Nick TG ~18:55: "it just popped up in my face ... I didn't even know what I was saving. What is
    // 'shooting in the rain'?"): NEVER a pop-up on open. The clips + title pop-up on open is gone (RESUME50 reopens the flow, the Reels card
    // says Finish your brief). A reel that already has a usable title (AI or typed) keeps it silently. A reel with no usable title shows a
    // small "Name this reel" button on its own card (thumbnail + when its clips came in); the dialog opens only when they tap it.
    if (dt && (r.files || []).length && !S.sent && r === rr0 && ((S.draft || {}).upAt || (S.draft || {}).popped)) {
      // the name typed on step 1 belongs to the upload that just landed
      done[r.id] = dt; store("titled", done); r.titled = true; r.title = dt; r.name = localReelName(r, dt);
      send({ kind: "title", reel: r.id, text: dt }).catch(() => {});
      return;
    }
    const pre = GENERIC_TITLE.test(String(r.title || "").trim()) ? "" : String(r.title || "").trim();
    if (pre) { done[r.id] = pre; store("titled", done); r.titled = true; return; }
  } catch {}
}
function reelInWork(x, done, addFresh, addTo) { return !!x && !(x.versions || []).length && !x.titled && !(done || {})[x.id] && !(addFresh && (x.id === addTo.reel || String(x.id || "").startsWith("dbx:"))) && !!((x.files || []).length || x.progress || x.run || ["received", "editing"].includes(x.status)); }
// NONAG51: the reel card's "Name this reel" button (only a reel with no usable title, still in the works, not the one being briefed now)
function reelNeedsName(r) { try { const done = fetchStore("titled", {}); return reelInWork(r, done, false, null) && GENERIC_TITLE.test(String(r.title || "").trim()); } catch { return false; } }
function reelWhen(r) { const t = Number(r.at || r.received_at || r.created || 0) || Number(String(r.id || "").split("_").pop()) || 0; if (t < 1.6e9) return "";
  const d = new Date(t * (t < 1e12 ? 1000 : 1)), now = new Date(), hm = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).toLowerCase().replace(/\s/g, " ");
  return d.toDateString() === now.toDateString() ? "at " + hm : "on " + d.toLocaleDateString([], { month: "short", day: "numeric" }) + " at " + hm; }
function nameBtn(r) { return reelNeedsName(r) ? `<button type="button" class="btn sm line namereel" data-reel="${esc(r.id)}" style="margin-top:6px;align-self:flex-start">Name this reel</button>` : ""; }
function nameReelAsk(rid) {
  try {
    const r = reelById(rid); if (!r || document.querySelector(".titlepop")) return;
    const pic = posterOf(r) || (r.run || {}).poster || "", when = reelWhen(r);
    const fresh = false;
    const pre = GENERIC_TITLE.test(String(r.title || "").trim()) ? "" : String(r.title || "").trim();
    const o = document.createElement("div"); o.className = "titlepop";
    o.innerHTML = `<div class="tpc" role="dialog" aria-modal="true" aria-labelledby="tph">${pic ? `<img src="${esc(pic)}" alt="" style="width:72px;height:128px;object-fit:cover;border-radius:12px">` : `<img src="/lumi/got.webp" alt="">`}
      <h2 id="tph">Name this reel</h2><p>${when ? "For the clips you uploaded " + esc(when) + ". " : ""}Every reel gets a name. Your editor keeps working while you type.</p>
      <input id="tpi" type="text" maxlength="80" placeholder="e.g. Morning routine" autocomplete="off" enterkeyhint="done" value="${esc(pre)}">
      <p class="tpprev" id="tpp"></p>
      <button class="btn primary block" type="button" id="tpb" disabled>Save title</button></div>`;
    document.body.appendChild(o);
    const i = o.querySelector("#tpi"), b = o.querySelector("#tpb");
    const pv = o.querySelector("#tpp");
    i.oninput = () => { b.disabled = !i.value.trim(); pv.innerHTML = i.value.trim() ? `Saved as <b>${esc(localReelName(Object.assign({}, r, { name: "" }), i.value.trim().replace(/\s+/g, " ")))}</b>` : ""; };
    i.oninput();
    const save = async () => {
      const v = i.value.trim().replace(/\s+/g, " "); if (!v || o.dataset.saving) return; o.dataset.saving = "1";   // [M5 Max MBP] 2026-10-01 07:26 PDT qa2fix #1: one save
      b.disabled = true; b.textContent = "Saving...";
      try { await send({ kind: "title", reel: r.id, text: v }); } catch {}
      const d2 = fetchStore("titled", {}); d2[r.id] = v; d2._last = Date.now(); store("titled", d2);
      // [M5 Max MBP] 2026-10-01 06:48 PDT qafix #4: reelLabel() prefers r.name, so the new title showed nowhere until the Mac pushed. Rename locally too,
      // the same way app_push.py names it: "<Client full name> - <Title> - NNN".
      r.titled = true; r.title = v; r.name = localReelName(r, v); o.remove(); try { lumiNod("Saved: " + v); } catch {}
      // [M5 Max MBP] 2026-10-03 appfix A9: on New reel the pop-up's title IS the step 1 name (it used to stay empty and REQUIRED there)
      if (S.view === "new" && !S.sent && S.draft && !String(S.draft.title || "").trim() && (!receivedReel() || receivedReel() === r)) { S.draft.title = v; store("draft", S.draft); }
      if (["home", "inbox", "msgs", "new"].includes(S.view)) try { render(); } catch {}
    };
    b.onclick = save; i.onkeydown = e => { if (e.key === "Enter") save(); };
    setTimeout(() => { try { i.focus(); } catch {} }, 150);
  } catch {}
}
document.addEventListener("click", e => { const b = e.target.closest && e.target.closest(".namereel"); if (b) { e.preventDefault(); e.stopPropagation(); nameReelAsk(b.dataset.reel); } }, true);   // NONAG51
setInterval(titleGate, 3000);
function pcls(p) { return !p ? "" : p.active === true ? " live" : p.active === false ? " idle" : ""; }   // [M5 Max MBP] 2026-09-30 live/idle bar
function lumiNod(text) {
  document.querySelectorAll(".nod").forEach(n => n.remove());
  const n = document.createElement("div"); n.className = "nod"; n.innerHTML = `<img src="/lumi/got.webp" alt=""><span class="nt"><span class="ck">✓</span>${esc(text)}</span>`;
  document.body.appendChild(n); setTimeout(() => n.remove(), 2200);
}
/* Share a delivered reel: download it to the phone first (Lumi shows the progress), then the phone's own share sheet (Instagram,
   Save Video...). If this phone cannot share files, it saves the file instead. Nick 2026-09-26. */
// [M5 Max MBP] 2026-09-30 (walkthrough agent, item 11): opts.save = the in-app Download button. Same download with progress, then the file is
// SAVED (an <a download> with an object URL; on iPhone, where that attribute is unreliable, the share sheet with Save Video comes first).
// opts.url picks another file (the no-music copy), opts.suffix goes on the file name. File name = the reel's own name.
// [M5 Max MBP] 2026-10-01 11:55 PDT postkit: the Post kit card and its Copy / Save buttons.
function postKitCard(r, k, fromV) {
  S.pkOpen = S.pkOpen || {};
  const tags = (k.hashtags || []).filter(Boolean), hooks = (k.hooks || []).filter(Boolean);
  const fig = (u, cls, cap, nm) => u ? `<figure><img class="${cls}" src="${esc(u)}" alt="${esc(cap)}" loading="lazy"><figcaption>${esc(cap)}</figcaption><button class="pkcopy pksave" type="button" data-u="${esc(u)}" data-n="${esc(nm)}">Save</button></figure>` : "";
  const base = reelLabel(r).replace(/[\/:*?"<>|]/g, "");
  return `<details class="card pkit" id="pkit"${S.pkOpen[r.id] ? " open" : ""}><summary><span class="pkic" aria-hidden="true">✦</span><span class="pkhd"><b>Post kit</b><small>Cover, caption, hashtags, hooks</small></span><svg class="pkchev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></summary>
    <div class="pkbody">${fromV ? `<p class="muted pknote">Made for v${esc(String(fromV))}.</p>` : ""}
      ${(k.options || []).length ? coverEditorHtml(r, k) : k.cover || k.cover34 ? `<div class="pkcovers">${fig(k.cover, "r916", "Reel cover 9:16", base + " - Cover.jpg")}${fig(k.cover34, "r34", "Profile grid 3:4", base + " - Grid cover.jpg")}</div>` : ""}
      <div class="pksec"><div class="pkh"><span class="eyebrow">Caption</span><button class="pkcopy" type="button" data-copy="cap">Copy</button></div><p class="pktext">${esc(k.caption)}</p></div>
      ${tags.length ? `<div class="pksec"><div class="pkh"><span class="eyebrow">Hashtags</span><button class="pkcopy" type="button" data-copy="tags">Copy</button></div><div class="pktags">${tags.map(t => `<span>${esc(t)}</span>`).join("")}</div></div>` : ""}
      ${hooks.length ? `<div class="pksec"><div class="pkh"><span class="eyebrow">Other hooks</span></div>${hooks.map((t, i) => `<div class="pkhook"><span>${esc(t)}</span><button class="pkcopy" type="button" data-copy="hook${i}">Copy</button></div>`).join("")}</div>` : ""}
    </div></details>`;
}
async function copyText(t) {
  try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(t); return true; } } catch {}
  try { const a = document.createElement("textarea"); a.value = t; a.setAttribute("readonly", ""); a.style.cssText = "position:fixed;top:-1000px;opacity:0"; document.body.appendChild(a); a.select(); a.setSelectionRange(0, t.length); const ok = document.execCommand("copy"); a.remove(); return ok; } catch { return false; }
}
async function saveImage(u, name) {
  try {
    const res = await fetch(u, { cache: "no-store" }); if (!res.ok) throw new Error("http " + res.status);
    const file = new File([await res.blob()], name, { type: "image/jpeg" });
    const ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (ios && navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: name }); } catch (e) { if (e && e.name !== "AbortError") throw e; } return; }
    const url = URL.createObjectURL(file), a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000); toast("Saved");
  } catch { window.open(u, "_blank", "noopener"); }
}
function bindPostKit(r, k) {
  const d = $("#pkit"); if (!d || !k) return;
  d.addEventListener("toggle", () => { S.pkOpen = S.pkOpen || {}; S.pkOpen[r.id] = d.open; });
  const txt = { cap: k.caption || "", tags: (k.hashtags || []).join(" "), hook0: (k.hooks || [])[0] || "", hook1: (k.hooks || [])[1] || "" };
  d.querySelectorAll("[data-copy]").forEach(b => b.onclick = async e => { e.preventDefault(); const ok = await copyText(txt[b.dataset.copy] || "");
    if (ok) { b.textContent = "Copied"; b.classList.add("ok"); setTimeout(() => { b.textContent = "Copy"; b.classList.remove("ok"); }, 1600); } else toast("Could not copy. Press and hold the text to copy it."); });
  d.querySelectorAll(".pksave").forEach(b => b.onclick = e => { e.preventDefault(); saveImage(b.dataset.u, b.dataset.n); });
  if ((k.options || []).length) bindCoverEditor(r, k);
}
// [M5 Max MBP] 2026-10-01 14:0x PDT cover editor (Nick TG 13:21: "regenerate different images and get the one they like the best ... add a
// title ... stylize it ... a checker background"). The Mac pre-picks up to 18 caption-free face frames with a person matte each
// (postkit.cover_options, Apple Vision, free). Everything else (title, style, position, size, background) is drawn here in a canvas,
// so changing it is instant and costs nothing. The choice is saved per reel (intent kind "cover", postkit/choices.json).
const CV_STYLES = [["yours", "Your style"], ["bold", "Bold"], ["box", "Highlight"], ["two", "Two-tone"], ["min", "Minimal"]];
const CV_POS = [["auto", "Smart"], ["top", "Top"], ["mid", "Middle"], ["low", "Lower third"]];
const CV_SIZE = [["s", "S"], ["m", "M"], ["l", "L"]];
const CV_BG = [["orig", "Original"], ["check", "Checker"], ["blur", "Blur"], ["grad", "Gradient"]];
const cvTs = k => Object.assign({ font: "Montserrat", google: true, weight: 800, fill: "#FFFFFF", accent: "#000000", glow: false, case: "", brand: [] }, k.title_style || {});
function cvColors(k, bg) {
  const b = cvTs(k).brand || [];
  if (bg === "check") return [...b.map(c => [c, "#FFFFFF"]), ["#141414", "#FFFFFF"], ["#FF7AB6", "#FFFFFF"], ["#6AA6FF", "#FFFFFF"], ["#F2B33D", "#FFFFFF"]].slice(0, 6);
  if (bg === "grad") return [...(b.length >= 2 ? [[b[0], b[1]]] : b.length ? [[b[0], "#FFFFFF"]] : []), ["#6AA6FF", "#A98BF5"], ["#FF9A8B", "#FF6A88"], ["#1E2247", "#5B8DEF"], ["#F6D365", "#FDA085"], ["#0F2027", "#2C5364"]].slice(0, 6);
  return [];
}
function cvState(r, k) {
  S.cv = S.cv || {};
  if (!S.cv[r.id]) {
    const saved = (() => { try { return JSON.parse(localStorage.getItem("lumi_cover_" + r.id) || "null"); } catch { return null; } })();
    const srv = r.cover_choice || null, base = { o: k.options[0].id, title: (k.hooks || [])[0] || "", style: "yours", pos: "auto", size: "m", bg: "orig", bgc: "0", page: 0 };
    const pick = (saved && (!srv || (saved.at || 0) >= (srv.at || 0))) ? saved : srv;
    S.cv[r.id] = Object.assign(base, pick || {});
    if (!k.options.some(o => o.id === S.cv[r.id].o)) S.cv[r.id].o = k.options[0].id;
    const i = k.options.findIndex(o => o.id === S.cv[r.id].o); S.cv[r.id].page = Math.max(0, Math.floor(i / 6));
  }
  return S.cv[r.id];
}
function coverEditorHtml(r, k) {
  const st = cvState(r, k), opt = k.options.find(o => o.id === st.o) || k.options[0];
  const chips = (key, arr, dis) => `<div class="cvchips" data-k="${key}">${arr.map(([v, n]) => `<button type="button" data-v="${v}" class="${String(st[key]) === v ? "on" : ""}"${dis && dis(v) ? " disabled" : ""}>${esc(n)}</button>`).join("")}</div>`;
  const noMask = !opt.mask;
  return `<div class="cved" id="cved">
    <div class="pkh"><span class="eyebrow">Cover</span><span class="muted cvhint">Tap a frame, add a title, pick a look</span></div>
    <div class="cvprev"><canvas id="cv916" width="1080" height="1920" aria-label="Cover preview 9:16"></canvas><div class="cv34w"><canvas id="cv34" width="1080" height="1440" aria-label="Profile grid preview 3:4"></canvas><small>Profile grid 3:4</small></div></div>
    <p class="muted cvnote cvmoved" id="cvmoved" hidden>Moved off the face</p>
    <div class="cvstrip" id="cvstrip">${cvStripHtml(k, st)}</div>
    ${k.options.length > 6 ? `<button type="button" class="pkcopy cvmore" id="cvmore">More options</button>` : ""}
    <label class="eyebrow cvlab" for="cvtitle">Title</label>
    <input class="text cvtitle" id="cvtitle" maxlength="80" autocomplete="off" placeholder="Add a title" value="${esc(st.title)}">
    <div class="eyebrow cvlab">Style</div>${chips("style", CV_STYLES)}
    <div class="cvtwo"><div><div class="eyebrow cvlab">Position</div>${chips("pos", CV_POS)}</div><div><div class="eyebrow cvlab">Size</div>${chips("size", CV_SIZE)}</div></div>
    <div class="eyebrow cvlab">Background</div>${chips("bg", CV_BG, v => v !== "orig" && noMask)}
    <div class="cvsw" id="cvsw">${cvSwatchHtml(k, st)}</div>
    ${noMask ? `<p class="muted cvnote">This frame has no clean cut-out, so it keeps its own background.</p>` : ""}
    <button type="button" class="btn primary block" id="cvsave" style="margin-top:14px">Save cover</button>
    <p class="muted cvnote" style="text-align:center">Saves the 9:16 cover and the 3:4 grid crop.</p></div>`;
}
function cvStripHtml(k, st) {
  const page = k.options.slice(st.page * 6, st.page * 6 + 6);
  return page.map(o => `<button type="button" class="cvth${o.id === st.o ? " on" : ""}" data-o="${esc(o.id)}" aria-label="Use this frame"><img src="${esc(o.url)}" alt="" loading="lazy" crossorigin="anonymous"></button>`).join("");
}
function cvSwatchHtml(k, st) {
  const cs = cvColors(k, st.bg); if (!cs.length) return "";
  return cs.map((c, i) => `<button type="button" class="cvsc${String(st.bgc) === String(i) ? " on" : ""}" data-i="${i}" aria-label="Colour ${i + 1}" style="background:${st.bg === "check" ? `repeating-conic-gradient(${c[0]} 0 25%, ${c[1]} 0 50%) 50% / 14px 14px` : `linear-gradient(135deg, ${c[0]}, ${c[1]})`}"></button>`).join("");
}
const __cvImgs = {}, __cvMasks = {}, __cvFonts = {};
function cvImg(u) { if (!__cvImgs[u]) __cvImgs[u] = new Promise((ok, no) => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => ok(i); i.onerror = no; i.src = u; }); return __cvImgs[u]; }
async function cvPerson(o) {
  if (!o.mask) return null;
  if (!__cvMasks[o.id + o.mask]) __cvMasks[o.id + o.mask] = (async () => {
    const [f, m] = await Promise.all([cvImg(o.url), cvImg(o.mask)]);
    const a = document.createElement("canvas"); a.width = 1080; a.height = 1920; const ax = a.getContext("2d", { willReadFrequently: true });
    ax.drawImage(m, 0, 0, 1080, 1920); const d = ax.getImageData(0, 0, 1080, 1920), px = d.data;
    for (let i = 0; i < px.length; i += 4) { px[i + 3] = px[i]; px[i] = px[i + 1] = px[i + 2] = 0; }
    ax.putImageData(d, 0, 0);
    const p = document.createElement("canvas"); p.width = 1080; p.height = 1920; const px2 = p.getContext("2d");
    px2.drawImage(f, 0, 0, 1080, 1920); px2.globalCompositeOperation = "destination-in"; px2.drawImage(a, 0, 0); return p;
  })();
  return __cvMasks[o.id + o.mask];
}
function cvFont(fam, wt) {
  const key = fam + wt; if (__cvFonts[key]) return __cvFonts[key];
  const sys = /helvetica|arial|sf pro|system/i.test(fam);
  if (!sys && !document.querySelector(`link[data-cvf="${fam}"]`)) { const l = document.createElement("link"); l.rel = "stylesheet"; l.dataset.cvf = fam; l.href = "https://fonts.googleapis.com/css2?family=" + encodeURIComponent(fam).replace(/%20/g, "+") + ":wght@" + wt + "&display=swap"; document.head.appendChild(l); }
  __cvFonts[key] = sys ? Promise.resolve() : (async () => { for (let i = 0; i < 20; i++) { try { if (await document.fonts.load(`${wt} 64px "${fam}"`, "Ab").then(x => x.length)) return; } catch {} await new Promise(r => setTimeout(r, 150)); } })();
  return __cvFonts[key];
}
function cvStyleOf(k, style) {
  const ts = cvTs(k), b = ts.brand || [];
  if (style === "bold") return { fam: "Anton", wt: 400, fill: "#FFFFFF", stroke: "#000000", sw: 16, kase: "upper", px: 112, lh: 1.08 };
  if (style === "box") return { fam: "Archivo Black", wt: 400, fill: "#111111", box: b[0] || "#FFE14D", px: 84, lh: 1.25, kase: "" };
  if (style === "two") return { fam: "Anton", wt: 400, fill: "#FFFFFF", fill2: b[0] || "#FFD23F", stroke: "#000000", sw: 12, kase: "upper", px: 132, lh: 1.04 };
  if (style === "min") return { fam: "Inter Tight", wt: 700, fill: "#FFFFFF", shadow: "rgba(0,0,0,.55)", px: 70, lh: 1.18, kase: "" };
  return { fam: ts.font, wt: ts.weight || 800, fill: ts.fill, stroke: ts.glow ? null : ts.accent, sw: ts.glow ? 0 : 12, glow: ts.glow ? ts.accent : null, kase: ts.case, px: 96, lh: 1.12 };
}
function cvWrap(ctx, text, maxW) {
  const words = text.split(/\s+/).filter(Boolean), lines = []; let cur = "";
  // [M5 Max MBP] 2026-10-01 22:47 PDT qa20fix: a word wider than the line (e.g. 42 W's, no spaces) is broken into pieces that fit, so the
  // fit loop can always succeed and Save cover always works. It used to stay one too-wide line, fit() returned null and cvDraw threw.
  const pieces = []; for (const w of words) { if (ctx.measureText(w).width <= maxW) { pieces.push(w); continue; }
    let part = ""; for (const ch of w) { if (part && ctx.measureText(part + ch).width > maxW) { pieces.push(part); part = ch; } else part += ch; } if (part) pieces.push(part); }
  for (const w of pieces) { const t = cur ? cur + " " + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur); return lines;
}
async function cvDraw(r, k) {
  const st = cvState(r, k), o = k.options.find(x => x.id === st.o) || k.options[0];
  const c = document.getElementById("cv916"), c3 = document.getElementById("cv34"); if (!c || !c3) return null;
  const token = (window.__cvTok = (window.__cvTok || 0) + 1);
  const sy = cvStyleOf(k, st.style);
  let frame; try { frame = await cvImg(o.url); } catch { return null; }
  const person = st.bg !== "orig" ? await cvPerson(o).catch(() => null) : null;
  await cvFont(sy.fam, sy.wt);
  if (token !== window.__cvTok) return null;
  const x = c.getContext("2d"); x.save(); x.clearRect(0, 0, 1080, 1920);
  const cs = cvColors(k, st.bg)[Number(st.bgc) || 0] || ["#141414", "#FFFFFF"];
  if (!person || st.bg === "orig") x.drawImage(frame, 0, 0, 1080, 1920);
  else {
    if (st.bg === "check") { const s = 120; for (let yy = 0; yy < 1920; yy += s) for (let xx = 0; xx < 1080; xx += s) { x.fillStyle = ((xx + yy) / s) % 2 ? cs[1] : cs[0]; x.fillRect(xx, yy, s, s); } }
    else if (st.bg === "grad") { const g = x.createLinearGradient(0, 0, 1080, 1920); g.addColorStop(0, cs[0]); g.addColorStop(1, cs[1]); x.fillStyle = g; x.fillRect(0, 0, 1080, 1920); }
    else { // soft blur without ctx.filter (older iOS): shrink hard, then grow back in 2x steps so every step is a smooth bilinear pass
      let w = 34, h = 60, t = document.createElement("canvas"); t.width = w; t.height = h; t.getContext("2d").drawImage(frame, 0, 0, w, h);
      while (w < 1080) { const n = document.createElement("canvas"); n.width = Math.min(1160, w * 2); n.height = Math.min(2060, h * 2); const nx = n.getContext("2d"); nx.imageSmoothingEnabled = true; nx.imageSmoothingQuality = "high"; nx.drawImage(t, 0, 0, n.width, n.height); t = n; w = n.width; h = n.height; }
      x.imageSmoothingEnabled = true; x.imageSmoothingQuality = "high"; x.drawImage(t, -40, -70, 1160, 2060); x.fillStyle = "rgba(0,0,0,.12)"; x.fillRect(0, 0, 1080, 1920); }
    x.save(); x.shadowColor = "rgba(0,0,0,.28)"; x.shadowBlur = 60; x.shadowOffsetY = 14; x.drawImage(person, 0, 0); x.restore();
  }
  // title
  let tTop = null, tBot = null;
  const raw = (st.title || "").trim();
  if (raw) {
    const txt = sy.kase === "upper" ? raw.toUpperCase() : sy.kase === "lower" ? raw.toLowerCase() : raw;
    // [M5 Max MBP] 2026-10-01 21:2x PDT TITLE SAFE ZONES (Nick TG 21:15: "The text is too close to the top. You need to think about
    // safety margins"). One box that is safe in BOTH outputs: the 9:16 cover clears Instagram's top UI band (~14%, 270 px) and the
    // bottom 22% (y 1498); the 3:4 grid tile is the centre crop (y 240..1680) with an 8% inner margin (115 px): y 355..1565; sides 6%.
    // So the title's INK (stroke and highlight box included) lives in x 65..1015, y 360..1498. Top = first line at 360, Middle = centred
    // in the box, Lower third = last line ends at 1498. Every size shrinks until it fits.
    const SB = { x0: 65, x1: 1015, y0: 360, y1: 1498 };
    // [M5 Max MBP] 2026-10-01 21:5x PDT NEGATIVE SPACE (HARD RULE: captions go in the empty part of the frame, measured per shot, never a
    // fixed y, no dead gap). Each frame carries its head box (face + hair from the Apple Vision matte, postkit.head_box). The title is
    // fitted only into the bands of the safe box above or below the head; "Smart" (default) takes the roomier band and hugs the head;
    // Top / Middle / Lower third are honoured when they stay off the head, otherwise moved to the nearest free band (hint shown).
    x.textAlign = "center"; x.textBaseline = "middle"; x.lineJoin = "round";
    const inkPad = p => Math.max(sy.stroke && sy.sw ? sy.sw * p / 96 / 2 : 0, sy.box ? p * 0.3 : 0) + (sy.glow ? p * 0.06 : 0);
    const want = Math.round(sy.px * ({ s: 0.78, m: 1, l: 1.28 }[st.size] || 1));
    const MINPX = Math.max(52, Math.round(want * 0.62));      // never shrink a title into an unreadable sliver to squeeze it into a band
    const fit = (maxH, minPx = 30) => { let p = want; for (let i = 0; i < 40 && p >= minPx; i++) {
        x.font = `${sy.wt} ${p}px "${sy.fam}", "Helvetica Neue", Arial, sans-serif`;
        const pd = inkPad(p), ls = cvWrap(x, txt, (SB.x1 - SB.x0) - 2 * pd), l = p * sy.lh, h = ls.length * l + (sy.box ? p * 0.15 : 0) + 2 * pd;
        const wm = Math.max(...ls.map(q => x.measureText(q).width)) + 2 * pd;
        if (ls.length <= 4 && h <= maxH && wm <= SB.x1 - SB.x0) return { px: p, lines: ls, lh: l, H: h, pad: pd, wmax: wm };
        p = Math.round(p * 0.92); } return null; };
    const GAP = 36, hb = o.head ? { y0: o.head[1] - GAP, y1: o.head[3] + GAP } : null;
    const zones = !hb ? [{ a: SB.y0, b: SB.y1, k: "all" }] : [{ a: SB.y0, b: Math.min(SB.y1, hb.y0), k: "above" }, { a: Math.max(SB.y0, hb.y1), b: SB.y1, k: "below" }].filter(z => z.b - z.a > 40);
    const hits = (t, h) => hb && t < hb.y1 && t + h > hb.y0;
    let L = fit(SB.y1 - SB.y0), bt = 0, moved = false;
    const want0 = L ? (st.pos === "low" ? SB.y1 - L.H : st.pos === "mid" ? Math.round((SB.y0 + SB.y1) / 2 - L.H / 2) : SB.y0) : SB.y0;
    if (L && st.pos !== "auto" && !hits(want0, L.H)) bt = want0;
    else {
      let cands = zones.map(z => ({ z, L: fit(z.b - z.a, MINPX) })).filter(c => c.L);
      if (!cands.length) cands = zones.map(z => ({ z, L: fit(z.b - z.a) })).filter(c => c.L);
      let pick = null;
      if (st.pos === "auto") pick = cands.sort((m, n) => (n.L.px - m.L.px) || ((n.z.b - n.z.a) - (m.z.b - m.z.a)))[0];
      else { const c0 = want0 + (L ? L.H : 0) / 2; pick = cands.sort((m, n) => Math.abs((m.z.a + m.z.b) / 2 - c0) - Math.abs((n.z.a + n.z.b) / 2 - c0))[0]; moved = !!pick; }
      if (pick) { L = pick.L; const z = pick.z;
        // hug the head (no dead gap): above it the title's last line sits just over the hair, below it the first line just under the chin
        bt = z.k === "above" ? z.b - L.H : z.k === "below" ? z.a : (st.pos === "low" ? z.b - L.H : st.pos === "mid" ? Math.round((z.a + z.b) / 2 - L.H / 2) : z.a);
        if (st.pos === "low" && z.k === "below") bt = z.b - L.H;
        }
      else { L = fit(Math.max(...zones.map(z => z.b - z.a), 60)) || fit(SB.y1 - SB.y0) || fit(SB.y1 - SB.y0, 8); const z = zones.sort((m, n) => (n.b - n.a) - (m.b - m.a))[0] || { a: SB.y0, b: SB.y1 }; bt = L ? z.b - L.H : SB.y0; moved = true; }
    }
    if (!L) L = fit(SB.y1 - SB.y0, 8) || fit(1e6, 8);   // qa20fix: last resort, never read L.H off null
    if (!L) { x.font = `${sy.wt} 30px "${sy.fam}", "Helvetica Neue", Arial, sans-serif`; const ls = cvWrap(x, txt, SB.x1 - SB.x0).slice(0, 8);
      L = { px: 30, lines: ls, lh: 30 * sy.lh, H: ls.length * 30 * sy.lh, pad: 0, wmax: SB.x1 - SB.x0 }; bt = SB.y0; }
    const { px, lines, lh, H, pad, wmax } = L;
    bt = Math.max(SB.y0, Math.min(SB.y1 - H, bt));
    x.font = `${sy.wt} ${px}px "${sy.fam}", "Helvetica Neue", Arial, sans-serif`;
    const y0 = bt + pad + (sy.box ? px * 0.075 : 0) + lh / 2;
    tTop = bt; tBot = bt + H;
    window.__cvMoved = moved && st.pos !== "auto";
    window.__cvBox = { x0: Math.round(540 - wmax / 2), x1: Math.round(540 + wmax / 2), y0: Math.round(bt), y1: Math.round(bt + H), px }; window.__cvHead = o.head || null;
    lines.forEach((ln, i) => {
      const yy = y0 + i * lh;
      if (sy.box) { const w = x.measureText(ln).width + px * 0.6, hh = px * 1.15; x.fillStyle = sy.box; const rx = 540 - w / 2, ry = yy - hh / 2; x.beginPath(); if (x.roundRect) x.roundRect(rx, ry, w, hh, px * 0.18); else x.rect(rx, ry, w, hh); x.fill(); }
      const fill = sy.fill2 && i >= Math.ceil(lines.length / 2) ? sy.fill2 : sy.fill;
      if (sy.glow) { x.save(); x.shadowColor = "rgba(70,0,25,.5)"; x.shadowBlur = px * 0.08; x.shadowOffsetY = px * 0.04; x.fillStyle = fill; x.fillText(ln, 540, yy); x.shadowColor = sy.glow; x.shadowBlur = px * 0.45; x.shadowOffsetY = 0; x.fillText(ln, 540, yy); x.fillText(ln, 540, yy); x.restore(); }
      if (sy.shadow) { x.save(); x.shadowColor = sy.shadow; x.shadowBlur = px * 0.35; x.shadowOffsetY = px * 0.06; x.fillStyle = fill; x.fillText(ln, 540, yy); x.restore(); }
      if (sy.stroke && sy.sw) { x.lineWidth = sy.sw * px / 96; x.strokeStyle = sy.stroke; x.strokeText(ln, 540, yy); }
      x.fillStyle = fill; x.fillText(ln, 540, yy);
    });
  } else { window.__cvBox = null; window.__cvMoved = false; }
  x.restore();
  // 3:4 grid crop: with a title it is Instagram's own centre crop (y 240), the box the title was laid out for; without one, framed on the face
  let y34 = tTop != null ? 240 : (o.face ? Math.round(Math.max(0, Math.min(480, o.face[1] * 1920 - 0.40 * 1440))) : 240);
  window.__cvY34 = y34;
  { const h = document.getElementById("cvmoved"); if (h) h.hidden = !window.__cvMoved; }
  const x3 = c3.getContext("2d"); x3.clearRect(0, 0, 1080, 1440); x3.drawImage(c, 0, y34, 1080, 1440, 0, 0, 1080, 1440);
  return { c, c3 };
}
function bindCoverEditor(r, k) {
  const st = cvState(r, k), ed = $("#cved"); if (!ed) return;
  const keep = () => { st.at = Math.floor(Date.now() / 1000); try { localStorage.setItem("lumi_cover_" + r.id, JSON.stringify(st)); } catch {} cvQueueSave(r, k); };
  const redraw = () => cvDraw(r, k);
  const rebind = () => { ed.querySelectorAll(".cvth").forEach(b => b.onclick = () => { st.o = b.dataset.o; ed.querySelectorAll(".cvth").forEach(x => x.classList.toggle("on", x === b));
      const o = k.options.find(x => x.id === st.o) || {}; const bgc = ed.querySelector('.cvchips[data-k="bg"]');
      if (!o.mask && st.bg !== "orig") { st.bg = "orig"; }
      if (bgc) bgc.querySelectorAll("button").forEach(x => { x.disabled = x.dataset.v !== "orig" && !o.mask; x.classList.toggle("on", x.dataset.v === st.bg); });
      $("#cvsw").innerHTML = cvSwatchHtml(k, st); bindSw(); keep(); redraw(); }); };
  const bindSw = () => ed.querySelectorAll(".cvsc").forEach(b => b.onclick = () => { st.bgc = b.dataset.i; ed.querySelectorAll(".cvsc").forEach(x => x.classList.toggle("on", x === b)); keep(); redraw(); });
  rebind(); bindSw();
  const more = $("#cvmore"); if (more) more.onclick = () => { const pages = Math.ceil(k.options.length / 6); st.page = (st.page + 1) % pages; $("#cvstrip").innerHTML = cvStripHtml(k, st); rebind(); $("#cvstrip").scrollLeft = 0; };
  ed.querySelectorAll(".cvchips").forEach(g => g.querySelectorAll("button").forEach(b => b.onclick = () => { if (b.disabled) return; st[g.dataset.k] = b.dataset.v;
    g.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b));
    if (g.dataset.k === "bg") { st.bgc = "0"; $("#cvsw").innerHTML = cvSwatchHtml(k, st); bindSw(); }
    keep(); redraw(); }));
  let tt = 0; const ti = $("#cvtitle"); if (ti) ti.oninput = () => { st.title = ti.value.replace(/[\u2014\u2013]/g, ","); clearTimeout(tt); tt = setTimeout(() => { keep(); redraw(); }, 120); };
  const sv = $("#cvsave"); if (sv) sv.onclick = async () => { sv.disabled = true; try { await cvExport(r, k); cvQueueSave(r, k, true); } finally { sv.disabled = false; } };
  redraw();
}
let __cvSaveT = 0;
function cvQueueSave(r, k, now) {
  clearTimeout(__cvSaveT);
  const go = async () => { const st = cvState(r, k), body = { o: st.o, title: st.title, style: st.style, pos: st.pos, size: st.size, bg: st.bg, bgc: String(st.bgc) };
    const key = JSON.stringify(body); if (st.__sent === key) return;
    // [M5 Max MBP] 2026-10-03 appfix A7: cover saves have their own rate bucket on the server (they used to use up the 20 per 10 min
    // that Approve, Request changes and Chat need), autosave waits for 8 s of quiet, and a failed save is retried and, on Save cover, said.
    let okS = false, slow = false;
    try { const res = await fetch("/api/intent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ k: K, kind: "cover", reel: r.id, version: (k.for_version || null), text: key }) });
      okS = res.ok; slow = res.status === 429; if (okS) st.__sent = key; } catch {}
    if (!okS) { if (now) toast(slow ? "Your cover is saved on this phone. We sync it in a few minutes." : "Could not save your cover choice. We try again shortly.");
      clearTimeout(__cvSaveT); __cvSaveT = setTimeout(go, slow ? 120000 : 20000); } };
  if (now) go(); else __cvSaveT = setTimeout(go, 8000);
}
async function cvExport(r, k) {
  const out = await cvDraw(r, k); if (!out) { toast("The cover is still loading. Try again in a moment."); return; }
  const base = reelLabel(r).replace(/[\/:*?"<>|]/g, "");
  const blob = c => new Promise(ok => c.toBlob(ok, "image/jpeg", 0.92));
  const [b1, b2] = await Promise.all([blob(out.c), blob(out.c3)]);
  if (!b1 || !b2) { toast("Could not make the image. Try again."); return; }
  const f1 = new File([b1], base + " - Cover.jpg", { type: "image/jpeg" }), f2 = new File([b2], base + " - Grid cover.jpg", { type: "image/jpeg" });
  const ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (ios && navigator.canShare && navigator.canShare({ files: [f1, f2] })) { try { await navigator.share({ files: [f1, f2], title: base }); } catch (e) { if (e && e.name !== "AbortError") toast("Could not open the share sheet."); } return; }
  for (const f of [f1, f2]) { const u = URL.createObjectURL(f), a = document.createElement("a"); a.href = u; a.download = f.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 5000); }
  toast("Cover saved");
}
async function shareReel(r, v, opts = {}) {
  // [M5 Max MBP] 2026-09-29 sweep50: closing the sheet cancels the download (it used to keep pulling ~60 MB and write into the next sheet's
  // bar); every update checks it still belongs to THIS sheet; a failure says what happened and offers Try again plus a different source;
  // no content-length shows the MB received; the % never passes 100; the line under "Ready" changes too.
  const src = opts.url || v.url;
  const name = (opts.name || (opts.save ? reelLabel(r) + (opts.suffix || "") + ".mp4" : "") || v.name || (reelLabel(r) + ".mp4")).replace(/[\/:*?"<>|]/g, "");   // TRIALPACK155: opts.name = the file's own delivered name
  try { window.__shareAbort && window.__shareAbort(); } catch {}
  const tok = {}; window.__shareTok = tok; const ac = typeof AbortController === "function" ? new AbortController() : null;
  window.__shareAbort = () => { try { ac && ac.abort(); } catch {} if (window.__shareTok === tok) window.__shareTok = null; };
  const mine = () => window.__shareTok === tok;
  sheet(`<div id="shcard">${lumiCard("edit", "Getting your reel", "Downloading to this device", `<div class="prog2"><i id="shp" style="width:2%"></i></div><div class="eta"><span id="shpt">0%</span><span></span></div>`)}</div><div id="shbtn"></div>`);
  const setTxt = (t, sub) => { if (!mine()) return; const b = document.querySelector("#shcard .lumic .txt b"), sp = document.querySelector("#shcard .lumic .txt > span"); if (b) b.textContent = t; if (sp && sub != null) sp.textContent = sub; };
  try {
    const res = await fetch(src, { cache: "no-store", ...(ac ? { signal: ac.signal } : {}) }); if (!res.ok) { const e = new Error("download " + res.status); e.status = res.status; throw e; }
    const total = Number(res.headers.get("content-length")) || 0, rd = res.body.getReader(), parts = []; let got = 0;
    for (;;) { const { done, value } = await rd.read(); if (done) break; if (!mine()) { try { rd.cancel(); } catch {} return; } parts.push(value); got += value.length;
      const a = $("#shp"), b = $("#shpt");
      if (total) { const p = Math.min(100, Math.round(got / total * 100)); if (a) a.style.width = Math.max(2, p) + "%"; if (b) b.textContent = p + "%"; }
      else { if (b) b.textContent = (got / 1048576).toFixed(1) + " MB"; if (a) a.style.width = Math.min(90, 2 + Math.log10(1 + got / 65536) * 30) + "%"; } }
    if (!mine()) return;
    const file = new File(parts, name, { type: "video/mp4" });
    try { window.e115 && window.e115(opts.save ? "download" : "share", { reel: r.id, v: v && v.v }); } catch {}   // ENGAGE115: the file reached their device
    const box = $("#shbtn"); if (!box) return;
    { const a = $("#shp"), b = $("#shpt"); if (a) a.style.width = "100%"; if (b) b.textContent = "100%"; }
    const canSh = !!(navigator.canShare && navigator.canShare({ files: [file] }));
    if (opts.save) {
      const ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1), url = URL.createObjectURL(file);
      const dl = `<a class="btn ${ios && canSh ? "line" : "primary"} block" id="dlsave" href="${url}" download="${esc(name)}"${ios && canSh ? ' style="margin-top:10px"' : ""}>${ios ? "Save to Files" : "Save to this device"}</a>`;
      const sh = canSh ? `<button class="btn ${ios ? "primary" : "line"} block" id="shgo"${ios ? "" : ' style="margin-top:10px"'}>${ios ? "Save to Photos" : "Share"}</button>` : "";
      box.innerHTML = (ios ? sh + dl : dl + sh) + `<p class="muted" style="font-size:13px;text-align:center;margin:8px 0 0">${esc(name)}</p>`;
      const sg = $("#shgo"); if (sg) sg.onclick = async () => { try { await navigator.share({ files: [file], title: reelLabel(r) }); closeSheet(); } catch (e) { if (e && e.name !== "AbortError") toast("Could not open the share sheet. Try Save to Files."); } };
      if (!ios) { try { $("#dlsave").click(); } catch {} setTxt("Downloaded", "Saved to your Downloads. Tap Save again if it did not start."); }
      else setTxt("Ready", canSh ? "Tap Save to Photos, then Save Video." : "Tap Save to Files.");
      return;
    }
    if (canSh) {
      box.innerHTML = `<button class="btn primary block" id="shgo">Share or save</button><p class="muted" style="font-size:13px;text-align:center;margin:8px 0 0">Pick Instagram, Save Video, or anywhere else.</p>`;
      $("#shgo").onclick = async () => { try { await navigator.share({ files: [file], title: reelLabel(r) }); closeSheet(); } catch (e) { if (e && e.name !== "AbortError") toast("Could not share. Try Save instead."); } };
      setTxt("Ready", "Saved on this device. Tap Share or save.");
    } else {
      const url = URL.createObjectURL(file); box.innerHTML = `<a class="btn primary block" href="${url}" download="${esc(name)}">Save to this device</a>`;
      setTxt("Ready", "Downloaded. Tap Save to this device.");
    }
  } catch (e) {
    if (!mine() || (e && e.name === "AbortError")) return;
    const off = navigator.onLine === false || (e instanceof TypeError);
    setTxt("Download did not finish", off ? "You look offline, or the connection dropped. Check it and try again." : e && e.status === 404 ? "This file is not available right now. Try the other link, or ask us in Chat." : "Something went wrong getting the file. Try again in a moment.");
    const alt = (Array.isArray(v.links) && v.links.find(u => u && u !== v.url)) || (v.drive ? "/api/dv?k=" + encodeURIComponent(K) + "&id=" + encodeURIComponent(v.drive) : "");
    const box = $("#shbtn"); if (box) box.innerHTML = `<button class="btn primary block" id="shretry" type="button">Try again</button>${alt ? `<a class="btn line block" style="margin-top:10px" href="${esc(alt)}" target="_blank" rel="noopener" download>Open the file another way</a>` : ""}`;
    const rt = $("#shretry"); if (rt) rt.onclick = () => shareReel(r, v, opts);
  }
}
function bindAdd(root = document) {
  root.querySelectorAll(".addv").forEach(b => b.onclick = e => { e.preventDefault(); e.stopPropagation(); openAdd(b.dataset.reel); });
  root.querySelectorAll(".tobrief").forEach(b => b.onclick = e => { e.preventDefault(); e.stopPropagation(); openBrief(b.dataset.reel); });
  root.querySelectorAll(".seefoot").forEach(b => b.onclick = e => { e.preventDefault(); e.stopPropagation(); openFootage(b.dataset.reel); });
  root.querySelectorAll(".tochat").forEach(b => b.onclick = e => { e.preventDefault(); e.stopPropagation(); openAsk(b.dataset.reel || S.reel); });   // appfix A20 + replyto 2026-10-05: jump to the exact message
}

/* ---------- shell ---------- */
function dock(html, cls) { $("#dock").innerHTML = html || ""; document.body.className = cls || ""; chatLayout(); }
// [M5 Max MBP] 2026-09-30 (chat layout agent): Chat and Team use the app shell layout (html.chatlay, see the CSS). There #main scrolls, not
// the window, so every "where is the page scrolled" question goes through these helpers.
function isChatView() { return typeof S !== "undefined" && (S.view === "msgs" || S.view === "team") && !!document.querySelector("#main .chatv"); }
// [M5 Max MBP] 2026-10-10 footerfix: EVERY view is the app shell now (not just Chat/Team), so #main is always the page scroller and the window never scrolls.
function chatScroller() { return document.getElementById("main"); }
function pageScrollBy(d) { const s = chatScroller(); if (s) s.scrollTop += d; else window.scrollBy(0, d); }
function pageY() { const s = chatScroller(); return s ? s.scrollTop : window.scrollY; }
function pageMaxY() { const s = chatScroller(); return s ? Math.max(0, s.scrollHeight - s.clientHeight) : Math.max(0, document.documentElement.scrollHeight - innerHeight); }
function setPageY(y, smooth) { const s = chatScroller(), o = { top: y, behavior: smooth ? "smooth" : "auto" }; if (s) s.scrollTo(o); else window.scrollTo(o); }
function chatLayout() { const R = document.documentElement, on = isChatView();
  if (on !== R.classList.contains("chatlay")) { R.classList.toggle("chatlay", on); window.scrollTo(0, 0); }
  if (window.lumiFitVV) { window.lumiFitVV(); if (on) [150, 500].forEach(ms => setTimeout(window.lumiFitVV, ms)); } }   // chatjump 2026-10-08: re-measure after opening Chat
// [M5 Max MBP] 2026-10-01 07:26 PDT qa2fix #10 + newclient B: after every redraw the keyboard state is worked out again (a re-rendered chat box fires no focusout, so html.kbd
// stayed on and the tab bar stayed hidden), and a video on the page being left is paused and unhooked first.
function render() { try { l196First(); } catch (e) {}   /* LONG196: the once-per-account question */ try { if (S.data) store("where", { view: S.view, at: Date.now() }); } catch {}   // RESUME50
  try { document.querySelectorAll("#main video").forEach(v => { try { v.pause(); } catch {} }); } catch {}
  try { return renderNow(); } finally { try { helloMount(); } catch {} try { if (S.view !== "looks") r113Card(); } catch {} setTimeout(() => { try { window.lumiKbdUpd && window.lumiKbdUpd(); } catch {} }, 0); } }
/* IN-APP WELCOME. [M5 Max MBP] 2026-10-02 23:05 PDT inapphello, Nick (Telegram 22:4x): "welcome them to the app when they sign in".
   A short welcome card, ONCE per client, on their first sign in: who we are, what to do next, the price. Not an email. It sits inline at
   the top of whatever screen they land on (an ad lead on #new still lands on the upload screen), and closes with a tap.
   Who: the Mac decides (snapshot hello.show: never staff, comped/test accounts, or anyone with reels or a used free reel); the page
   checks that again. Once: a server flag per client (api/tour kind=hello, written when it is shown) plus this phone's localStorage.
   helloDecide is pure (tests_inapphello.py runs it in node). */
function helloDecide(x) {
  if (!x.signedIn) return { show: false, why: "not signed in" };
  if (!x.hello || x.hello.show !== true) return { show: false, why: "not for this account" };
  if ((x.reels || 0) > 0 || x.free_used || x.returning) return { show: false, why: "already a client" };
  if (x.seenLocal) return { show: false, why: "seen on this phone" };
  if (x.seenServer) return { show: false, why: "seen" };
  return { show: true, why: "ok" };
}
function helloText(d) {
  const pr = (d && d.price) || {}, reel = Number(pr.reel) || 20, mo = Number(pr.monthly) || 60, n = Number(pr.monthly_reels) || 10;
  const gf = typeof giftOf === "function" ? giftOf(d) : null;
  const price = isComped(d) ? "Your reels are on us." : gf && gf.left > 0 ? `${gf.head}. You only pay for a reel after you have seen it.`
    : `Your first reel is free. After that it is $${reel} a reel, or $${mo} a month for ${n} reels, and you only pay after you have seen your reel.` + (typeof filmLine === "function" && filmLine(d) ? " " + filmLine(d) : "");
  return { title: `Hi ${(d && d.name && d.name !== "there") ? d.name : "there"}, welcome to Lumi.`,
    who: "We are Lumi Edits, a small team of editors. Send us a clip of you talking to camera and we turn it into a finished reel, cut, captioned and ready to post.",
    steps: ["Upload your clip.", "Name your reel.", "We edit it and it comes back right here in the app."], price };
}
function helloMount() {
  if (!window.__helloOpen || !S.data) return; const m = $("#main"); if (!m || m.querySelector(".hellocard")) return;
  const t = helloText(S.data), onNew = S.view === "new";
  const c = document.createElement("div"); c.className = "card hellocard"; c.setAttribute("role", "region"); c.setAttribute("aria-label", "Welcome to Lumi");
  c.innerHTML = `<button class="hx" type="button" aria-label="Close">&times;</button><div class="hhead"><img src="/lumi/head.png" alt=""><div><div class="eyebrow">Welcome</div><h3>${esc(t.title)}</h3></div></div>
    <p>${esc(t.who)}</p>${onNew ? `<p class="hprice">${esc(t.price)}</p><div class="row" style="margin-bottom:10px"><button class="btn primary" type="button" id="hgot">Let's go</button></div>` : ""}<ol>${t.steps.map(x => `<li>${esc(x)}</li>`).join("")}</ol>${onNew ? "" : `<p class="hprice">${esc(t.price)}</p>`}
    ${onNew ? "" : `<div class="row"><button class="btn line" type="button" id="hgot">Got it</button><button class="btn primary" type="button" id="hup">Upload my clip</button></div>`}`;   // appfix A22 2026-10-03: on #new "Let's go" sits above the fixed recipe dock
  const close = () => { window.__helloOpen = false; c.remove(); };
  c.querySelector(".hx").onclick = close; c.querySelector("#hgot").onclick = close;
  const up = c.querySelector("#hup"); if (up) up.onclick = () => { close(); S.reel = null; go("new", { step: 1 }); };
  m.insertBefore(c, m.firstChild);
}
// NAMEREQ50 [M5 Max MBP] 2026-10-29 17:3x PDT, Nick: every client gives a real first and last name, and we capture it. An account the
// Mac marks name_needed (a Meta lead account made for them, an email client, anyone with no real first + last name on file) gets this step
// before anything else: First name + Last name (prefilled with anything usable), no close button, no tap-outside, Escape does nothing.
// Saved through api/signin.js (step "name", checked there and again on the Mac with person_name), then the account carries on.
function nameGateNeeded() { const d = S.data || {}; return d.name_needed === true && K.length === 24; }
function nameGate() {
  const old = document.getElementById("namegate");
  if (!nameGateNeeded()) { if (old && !old.dataset.saving) old.remove(); return; }
  if (old) { const e = (S.data || {}).name_error; if (e && !old.dataset.saving) { const m = old.querySelector("#ngm"); if (m && !m.textContent) m.textContent = e; } return; }
  const pf = (S.data || {}).name_prefill || {};
  const o = document.createElement("div"); o.className = "namegate"; o.id = "namegate";
  o.innerHTML = `<div class="ngc" role="dialog" aria-modal="true" aria-labelledby="ngh"><img src="/lumi/wave.png" alt="">
    <h2 id="ngh">What's your name?</h2><p class="ngs">So we know who we're making reels for. It only takes a second.</p>
    <input class="text" id="ngf" autocomplete="given-name" autocapitalize="words" placeholder="First name" maxlength="60" enterkeyhint="next" value="${esc(pf.first || "")}">
    <input class="text" id="ngl" autocomplete="family-name" autocapitalize="words" placeholder="Last name" maxlength="60" enterkeyhint="done" value="${esc(pf.last || "")}">
    <p class="ngm" id="ngm" role="alert">${esc((S.data || {}).name_error || "")}</p>
    <button class="btn primary block" type="button" id="ngb">Continue</button></div>`;
  document.body.appendChild(o);
  try { document.activeElement && document.activeElement.blur && document.activeElement.blur(); } catch {}
  const f = o.querySelector("#ngf"), l = o.querySelector("#ngl"), b = o.querySelector("#ngb"), m = o.querySelector("#ngm");
  o.addEventListener("keydown", e => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); } }, true);
  o.addEventListener("click", e => e.stopPropagation());
  const save = async () => {
    if (o.dataset.saving) return;
    const fv = f.value.replace(/\s+/g, " ").trim(), lv = l.value.replace(/\s+/g, " ").trim();
    if (!fv || !lv) { m.textContent = "Please add your first and last name."; (fv ? l : f).focus(); return; }
    if (/@/.test(fv + lv)) { m.textContent = "Please put your name, not an email address."; return; }
    if (!/\p{L}/u.test(fv) || !/\p{L}/u.test(lv)) { m.textContent = "Please use letters only for your name."; return; }
    o.dataset.saving = "1"; b.disabled = true; b.textContent = "Saving..."; m.textContent = "";
    let j = null; try { j = await signinPost({ step: "name", k: K, first: fv, last: lv }); } catch {}
    if (j && j.ok) {
      S.data.name = j.first; S.data.full_name = j.first + " " + j.last; S.data.name_needed = false; delete S.data.name_error; delete S.data.name_prefill;
      o.remove(); try { const av = $("#avatar"), mm = myAvatar(); if (av) { av.textContent = mm.ini; av.style.background = mm.color; } } catch {}
      try { lumiNod("Thanks, " + j.first + "!"); } catch {} try { render(); } catch {} return; }
    delete o.dataset.saving; b.disabled = false; b.textContent = "Continue";
    m.textContent = (j && j.error) || "Could not reach Lumi, please try again.";
  };
  b.onclick = save;
  f.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); l.focus(); } };
  l.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); save(); } };
  setTimeout(() => { try { (f.value ? l : f).focus(); } catch {} }, 200);
}
async function helloMaybe() {
  try {
    if (window.__helloChecked || !S.data || K.length !== 24) return;
    // [M5 Max MBP] 2026-10-03 appfix A21: a brand-new account got the full-screen celebration and this card at the same time. While the
    // first-run tour is due or on screen (lumi_newacct, #celebrate, #coach), the card waits and shows after it (checked every 2 s, up to 5 min).
    let nw = ""; try { nw = localStorage.getItem("lumi_newacct") || ""; } catch {}
    if (nw === K || window.__tourPending || document.getElementById("celebrate") || document.getElementById("coach") || document.querySelector(".celebrate, .coach")) {
      window.__helloWaits = (window.__helloWaits || 0) + 1; if (window.__helloWaits < 150) setTimeout(helloMaybe, 2000); return; }
    window.__helloChecked = true;
    let seenLocal = false; try { seenLocal = !!localStorage.getItem("lumi_hello_" + K); } catch {}
    const d = S.data, base = { signedIn: true, hello: d.hello, reels: (d.reels || []).length, free_used: d.free_used, returning: !!(d.account || {}).returning, seenLocal };
    if (!helloDecide(base).show) { window.__helloWhy = helloDecide(base).why; return; }
    let seenServer = false; try { seenServer = !!(await (await fetch("/api/tour?kind=hello&k=" + K, { cache: "no-store" })).json()).seen; } catch { return; }
    const v = helloDecide({ ...base, seenServer }); window.__helloWhy = v.why;
    try { localStorage.setItem("lumi_hello_" + K, "1"); } catch {}
    if (!v.show) return;
    try { fetch("/api/tour", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ k: K, kind: "hello" }) }).catch(() => {}); } catch {}
    window.__helloOpen = true; helloMount();
  } catch {}
}
function refocus(sel) { const el = $(sel); if (el) { try { el.focus({ preventScroll: true }); } catch { try { el.focus(); } catch {} } } }
function renderNow() {
  const d = S.data; if (!d) return;
  if (S.guest && (GATE54[S.view] || S.reel)) { S.view = "home"; S.reel = null; }   // GUEST54: never an account-only page for a guest
  try { window.lumiSwipeCancel && window.lumiSwipeCancel(); } catch {}
  document.querySelectorAll("#tabs button").forEach(b => b.classList.toggle("on", b.dataset.v === S.view || (S.view === "team" && b.dataset.v === "inbox") || (S.view === "car" && b.dataset.v === "home")));
  if (S.view !== "inbox") S.mail = null;
  { const hb = document.getElementById("hinbox"); if (hb) hb.classList.toggle("on", S.view === "inbox" || S.view === "team"); }
  dock("");
  closeSheet();
  const m = $("#main"); if (!window.__lumiQuiet) { m.classList.remove("screen"); void m.offsetWidth; m.classList.add("screen"); }   // [M5 Max MBP] 2026-09-28 app test 5: a quiet background refresh replayed this fade-in 3 to 4 times in 3 min idle
  if (!(S.view === "home" && S.reel)) { S.rangeIn = null; S.sel = null; S.box = null; S.boxMode = false; S.rangeKey = null; }   // [M5 Max MBP] 2026-10-01 qafix #8: leaving the reel drops a half-marked section
  if (S.guest && S.view === "home") return renderHome();   // GUEST54: the guest Home
  if (S.guest && S.view === "pay") return g54Pay();
  if (S.view === "music") return g54Music();
  if (S.view === "car") return renderCar();   // cherylcar 2026-10-18 [M5 Max MBP]: a photo carousel
  if (S.view === "home" && !S.reel) window.__chgOpenKey = null;   // CHGCLOSED50: leaving the reel closes What changed for next time
  if (S.view === "home") return S.reel ? renderReel() : ((d.reels || []).length ? renderHome() : renderStart());
  if (S.view === "start") return renderStart();
  if (S.view === "looks") return renderLooks();
  if (S.view === "new") return renderNew();
  if (S.view === "msgs") { store("chatread2", Math.max(fetchStore("chatread2", 0) || 0, chatLastLumi())); tabBadges(); return renderMsgs(); }
  if (S.view === "team") return renderTeam();
  if (S.view === "inbox") return renderInbox();
  if (S.view === "pay") return renderPay();
}
/* ---------- INBOX. [M5 Max MBP] 2026-09-28 19:55 PDT (inbox agent). Nick, Sep 27 17:59: "a mail section where they are going to get
   notifications and mail from us. This is not the AI agent section ... When the client gets a message in their inbox on their Lumi app,
   it says who the message is from." Sep 28: "THAT'S NOT WHAT THAT TAB DOES" / "WHERE IS THE INBOX SECTION".
   [M5 Max MBP] 2026-09-30 21:05 PDT (inboxhumans agent), Nick TG 20:51: NOW HUMANS ONLY. The Inbox lists the team conversations and
   nothing else; ready notices, approvals, receipts and other updates are posted in Chat (app_chat.post_notices). Was: every email Lumi sent them, every in-app notice (reel ready, new version, changes started, payment received) and the conversations
   with the team (Sabbir / Nick · Lumi team), newest first. Records never go away. The team conversation opens as a chat with a reply box.
   Data: snapshot.inbox (app_mail.py on the Mac) + snapshot.team (team_mail.py). Read state: inbox_read / team_read intents. ---------- */
const MAILICON = '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3.5 7l8.5 6 8.5-6"/></svg>';
function inboxRead() { return new Set(fetchStore("inboxread", [])); }
/* [M5 Max MBP] 2026-10-08 19:5x PDT threads (Nick TG 19:36): one conversation per person on the team. Nick's messages and Lumo's messages
   (and Sabbir's) are separate threads, never mixed. Every team message carries m.box ("nick", "lumo", "sabbir"); the Inbox lists one row per
   box (item.box); a reply and a read receipt name their box (choice), so a reply lands in the thread it was written in. Read marks per box. */
function tBoxOf(m) { return (m && m.box) || ""; }
function teamMark(box) { const t = (S.data || {}).team || {}, b = (t.boxes || []).find(x => x.box === box) || {};
  return Math.max(fetchStore("teamread", 0) || 0, t.read_at || 0, b.read_at || 0, (fetchStore("teamreadb", {}) || {})[box] || 0); }
function teamMsgs(box) { const ms = ((S.data || {}).team || {}).messages || []; return box ? ms.filter(m => (tBoxOf(m) || box) === box) : ms; }
function inboxItems() {
  const d = S.data || {}, ib = d.inbox || { items: [] }, rd = inboxRead(), base = fetchStore("inboxbase2", 0), wk = Date.now() / 1000 - 7 * 86400;
  const t = d.team || {};
  // [M5 Max MBP] 2026-09-28 20:0x PDT link check: the team item also honours THIS phone's own read mark ("teamread", set when the thread
  // is opened). The snapshot only learns about the read a minute later (team_read intent -> Mac -> next push), so closing and reopening
  // the app inside that minute brought the badge back for a message the client had already read.
  // [M5 Max MBP] 2026-10-01 06:49 PDT qafix #10: the server's read mark (t.read_at) counts here too, the same as inboxUnreadN, so the row and the badge agree
  const tr = Math.max(fetchStore("teamread", 0) || 0, t.read_at || 0), lastTeam = Math.max(0, ...((t.messages || []).filter(m => m.from === "team").map(m => m.at || 0)));
  // [M5 Max MBP] 2026-09-29 07:12 PDT Nick: "A client's inbox should not have anything in it other than 'Your reel is ready' and chats
  // with the Lumi team". Emails, receipts and other updates stay in the record (nothing deleted), they just never show here.
  // [M5 Max MBP] 2026-09-29 sweep50: a "delivery" email keeps its raw thread subject ("Re: Can you edit my reel?"), so it passes only when
  // it reads as a ready notice too, the same as an in-app notice. The "Your reel is ready" notice for that reel already covers it.
  // [M5 Max MBP] 2026-09-30 21:05 PDT (inboxhumans agent), Nick TG 20:51: "the inbox ... needs to just be communication between Lumi employees
  // and the client". HUMANS ONLY: the team conversation. "Your reel is ready", approvals and every other update are posted in Chat instead.
  const keep = it => it.kind === "team";
  const items = (ib.items || []).filter(keep).map(it => { if (it.kind === "team" && it.box) { const lt = Math.max(0, ...teamMsgs(it.box).filter(m => m.from === "team").map(m => m.at || 0));
      return Object.assign({}, it, { unread: !!(it.unread && it.at > wk && lt > teamMark(it.box)) }); }   // threads 2026-10-08: per thread
    return Object.assign({}, it, { unread: it.kind === "team" ? !!(it.unread && (t.unread || 0) > 0 && it.at > wk && lastTeam > tr) : !!(it.unread && it.at > base && !rd.has(it.id)) }); });
  // the team thread is always reachable, even before the first message
  return items;
}
function teamTab() { inboxTab(); }
/* [M5 Max MBP] 2026-09-28 20:3x PDT (linkfix agent): the Inbox badge counts unread MESSAGES, not conversations. Three messages from Sabbir
   in one conversation = 3. Team messages newer than both read marks (this phone's own and the Mac's) count one each; every other unread
   item (an email, an update, a receipt) counts 1. */
function inboxUnreadN(its) {
  const t = (S.data || {}).team || {}, mark = Math.max(fetchStore("teamread", 0), t.read_at || 0);
  const boxed = its.filter(i => i.kind === "team" && i.box);
  if (boxed.length) { const n = boxed.filter(i => i.unread).reduce((a, i) => a + Math.max(1, teamMsgs(i.box).filter(m => m.from === "team" && (m.at || 0) > teamMark(i.box)).length), 0); return n; }   // threads 2026-10-08
  const teamN = (t.messages || []).filter(m => m.from === "team" && (m.at || 0) > mark).length;
  return its.some(i => i.unread && i.kind === "team") ? Math.max(1, teamN) : 0;     // [M5 Max MBP] 2026-09-30 inboxhumans: only team messages count
}
/* PAY + CHAT BADGES. [M5 Max MBP] 2026-09-28 (Nick, Telegram 19:33): a red number on Pay when a reel is waiting to be paid for, and on
   Chat when the Lumi agent wrote since they last opened Chat. Same style as the Inbox badge. */
function setBadge(btn, n) {
  if (!btn) return; let bd = btn.querySelector(".tbadge");
  if (n) { if (!bd) { bd = document.createElement("span"); bd.className = "tbadge"; btn.appendChild(bd); } bd.textContent = n > 9 ? "9+" : n; }
  else if (bd) bd.remove();
}
function chatLastLumi() { const ms = (S.data || {}).messages || []; return ms.filter(m => m.who === "lumo" || m.who === "lumi").reduce((a, m) => Math.max(a, m.at || 0), 0); }
function tabBadges() {
  const d = S.data || {}, nav = $("#tabs"); if (!nav) return;
  setBadge(nav.querySelector('button[data-v="pay"]'), (d.reels || []).filter(owes).length);
  const ms = d.messages || [];
  let mark = fetchStore("chatread2", null);
  if (mark === null) { mark = chatLastLumi(); store("chatread2", mark); }      // first open: existing agent messages count as read (0), only new ones count
  if (S.view === "msgs") { mark = Math.max(mark, chatLastLumi()); store("chatread2", mark); if (ms.some(m => m.kind === "gift")) store("giftseen", 1); }
  // [M5 Max MBP] 2026-10-03 appfix A23: the gift welcome was marked read by the first-open baseline, so Chat never showed it as new.
  // A gift message stays unread until Chat is opened once.
  const giftSeen = !!fetchStore("giftseen", 0);
  try { stylesNavDot(); } catch {}   // STYLES50
  setBadge(nav.querySelector('button[data-v="msgs"]'), ms.filter(m => (m.who === "lumo" || m.who === "lumi") && ((m.at || 0) > mark || (m.kind === "gift" && !giftSeen))).length);
}
function inboxBanner(it, n) {
  document.querySelector(".ibanner")?.remove();
  const d = document.createElement("button"); d.className = "ibanner"; d.type = "button";
  d.innerHTML = `${mailAv(it)}<span><b>${esc(it.from || "Lumi")}</b><em>${esc(n > 1 ? n + " new messages in your Inbox" : (it.subject || "New message"))}</em></span>`;
  d.onclick = () => { d.remove(); S.reel = null; if (it.kind === "team") return go("team", { tbox: it.box || null }); S.mail = null; go("inbox"); };
  document.body.appendChild(d); requestAnimationFrame(() => d.classList.add("in"));
  setTimeout(() => { d.classList.remove("in"); setTimeout(() => d.remove(), 400); }, 6000);
}
function inboxTab() {
  const nav = $("#tabs"); if (!nav || !S.data) return;
  // first time this phone opens the app: history older than 3 days arrives already read (a back-filled inbox is not 60 new messages)
  // first open on this phone: everything already there counts as read; only items that arrive after this count (a team message from the last 7 days still does)
  if (!fetchStore("inboxbase2", 0)) { const b = Math.floor(Date.now() / 1000); store("inboxbase2", b); if (!((S.data.inbox || {}).read_all_at)) store("inboxbase_q", b); }
  flushInboxRead();   // appfix A28 2026-10-03: the baseline and item receipts go quietly and are retried here until the server has them
  const b = document.getElementById("hinbox"); if (!b) return;
  b.onclick = () => { S.reel = null; S.mail = null; go("inbox"); };
  const its = inboxItems();
  // IN-APP NOTIFICATION: a new item that arrived while the app is open gets a banner (never for history on first load)
  // [M5 Max MBP] 2026-09-28 20:15 PDT linkcheck: a team conversation keeps ONE id for 72 h, so Sabbir's 2nd, 3rd... message in an
  // escalation never counted as "new" and showed no banner. Team items are keyed by id + time of the last message.
  const ikey = i => i.kind === "team" ? i.id + "@" + i.at : i.id;
  const seen = window.__inboxSeen; const ids = new Set(its.map(ikey));
  // [M5 Max MBP] 2026-10-01 07:26 PDT qa2fix #10: the banner counts MESSAGES (three from Sabbir = "3 new messages"), not conversations
  const tmAt = () => ((S.data.team || {}).messages || []).filter(m => m.from === "team").map(m => m.at || 0);
  if (seen) { const fresh = its.filter(i => !seen.has(ikey(i)) && i.unread);
    if (fresh.length) { const prevAt = window.__teamSeenAt || 0, nT = tmAt().filter(a => a > prevAt).length; inboxBanner(fresh[0], Math.max(fresh.filter(i => i.kind !== "team").length + (fresh.some(i => i.kind === "team") ? Math.max(1, Math.min(nT, inboxUnreadN(its) || nT)) : 0), 1)); } }
  window.__inboxSeen = ids; window.__teamSeenAt = Math.max(0, ...tmAt());
  tabBadges();
  let bd = b.querySelector(".tbadge"); const n = inboxUnreadN(its);
  if (n) { if (!bd) { bd = document.createElement("span"); bd.className = "tbadge"; b.appendChild(bd); } bd.textContent = n > 9 ? "9+" : n; }
  else if (bd) bd.remove();
}
function mailAv(it) {
  if (it.kind === "team") { const nm = (it.from || "L").trim(); return `<span class="mav team">${esc(firstGlyph(nm))}</span>`; }
  if (/Nick/.test(it.from || "")) return `<span class="mav team">N</span>`;
  return `<span class="mav"><img src="/lumi/head.png" alt=""></span>`;
}
const MAILKIND = { delivery: "Delivery", email: "Email", notice: "Update", receipt: "Receipt", team: "Team" };   // [M5 Max MBP] 2026-10-01 qafix: the team row reads TEAM, not CHAT (Chat is the Lumi tab)
function mailWhen(ts) { const d = new Date(ts * 1000); return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }) + " at " + d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); }
function renderInbox() {
  const items = inboxItems();
  if (S.mail) { const it = items.find(x => x.id === S.mail); if (it) return renderMail(it); S.mail = null; }
  const n = inboxUnreadN(items);
  let h = `<div class="inboxv"><div class="ihead"><h1>Inbox</h1>${n ? `<span class="icount">${n} new</span>` : ""}</div>
    <p class="isub">Messages between you and the real people on the Lumi team. Reel updates and approvals are in Chat.</p>`;
  const hasTeam = items.some(i => i.kind === "team");
  if (!items.length) h += empty("Nothing here yet", "When someone from the Lumi team writes to you, it shows up here. Reel updates are in Chat.");
  else {
    h += '<div class="mlist">';
    items.forEach(it => {
      h += `<button class="mrowi ${it.unread ? "unread" : ""}" data-mail="${esc(it.id)}">${mailAv(it)}<span class="mtx">
        <span class="mtop"><b class="mfrom">${esc(it.from || "Lumi")}</b><span class="mtime">${esc(when(it.at))}</span></span>
        <span class="msubj">${it.unread ? '<i class="udot" aria-label="unread"></i>' : ""}${esc(it.subject || "")}</span>
        <span class="mprev"><em class="mkind k-${esc(it.kind)}">${esc(MAILKIND[it.kind] || "")}</em>${esc(it.preview || "")}</span></span></button>`;
    });
    h += "</div>";
  }
  if (!hasTeam) h += `<button class="btn line block mteam" id="mteam">${MAILICON}Write to the Lumi team</button>`;
  h += "</div>";
  $("#main").innerHTML = h;
  document.querySelectorAll("[data-mail]").forEach(b => b.onclick = () => {
    const it = items.find(x => x.id === b.dataset.mail); if (!it) return;
    if (it.kind === "team") return go("team", { tbox: it.box || null });
    markMailRead(it); S.mail = it.id; setPageY(0); render();
  });
  const mt = $("#mteam"); if (mt) mt.onclick = () => go("team", { tbox: "nick" });
}
function markMailRead(it) {
  if (!it || !it.unread || it.kind === "team") return;
  const rd = inboxRead(); rd.add(it.id); store("inboxread", [...rd].slice(-400)); inboxTab();
  { const q = new Set(fetchStore("inboxreadq", [])); q.add(it.id); store("inboxreadq", [...q].slice(-100)); flushInboxRead(); }   // appfix A28: quiet, retried
}
function renderMail(it) {
  let h = `<div class="inboxv mailv"><button class="back" id="mback">‹ Inbox</button>
    <h1 class="msubjh">${esc(it.subject || "")}</h1>
    <div class="mfromrow">${mailAv(it)}<div><b>${esc(it.from || "Lumi")}</b><span>${it.via === "email" ? "Emailed to you" : "In the app"} · ${esc(mailWhen(it.at))}</span></div></div>
    <div class="mbody">${linkify(it.body || it.preview || "")}</div>`;
  if (it.reel && (S.data.reels || []).some(r => r.id === it.reel)) h += `<button class="btn primary block" id="mreel" style="margin-top:14px">Open this reel in the app</button>`;
  h += `<p class="mfoot">Questions about this? <a href="#" id="mchat">Ask in Chat</a> or <a href="#" id="mtm">write to the team</a>.</p></div>`;
  $("#main").innerHTML = h;
  $("#mback").onclick = () => { S.mail = null; setPageY(0); render(); };
  const r = $("#mreel"); if (r) r.onclick = () => { S.mail = null; go("home", { reel: it.reel, ver: null, reelFrom: { reel: it.reel, view: "inbox", mail: it.id } }); };
  $("#mchat").onclick = e => { e.preventDefault(); S.mail = null; go("msgs"); };
  $("#mtm").onclick = e => { e.preventDefault(); S.mail = null; go("team", { tbox: S.tbox || "nick" }); };
}
/* the team conversation: human mail from the Lumi team, signed by the person ("Sabbir · Lumi team"). Opened from the Inbox. */
function renderTeam() {
  const t = S.data.team || { messages: [] }; const box = S.tbox || ((inboxItems().find(i => i.kind === "team" && i.box) || {}).box) || null; if (box) S.tbox = box; const ms = teamMsgs(box);   // threads 2026-10-08: only THIS person's thread
  const names = [...new Set(ms.filter(m => m.from === "team" && m.name && !/self\s*-?\s*test/i.test(m.name)).map(m => m.name))];   // [M5 Max MBP] 2026-09-29 sweep50: an unnamed sender is never listed as a person called "Lumi"
  let h = `<div class="chatv teamv"><div class="teamtop"><button class="back" id="tback">‹ Inbox</button><div class="chathead"><img src="/lumi/head.png" alt=""><h1>${names.length ? esc(names.join(" & ")) : "The Lumi team"}</h1></div></div>
    <div class="intro"><img src="/lumi/wave.png" alt=""><p>${box === "lumo" ? "Lumo, the Lumi team's assistant. Nick and the team can read this thread too." : names.length ? esc(names.join(" and ")) + " from the Lumi team. A real person reads your replies here." : "Write to the people on the Lumi team. A real person reads this, not the AI."}</p></div>`;
  if (!ms.length) h += empty("No messages yet", "When someone from the team writes to you, it shows up here.");
  else {
    h += '<div class="thread">';
    ms.forEach(m => {
      const you = m.from === "client";
      h += `<div class="mrow ${you ? "you" : "lumi"}"><div class="msg ${you ? "you" : "team"}">${you ? "" : `<span class="sig">${m.name ? esc(m.name) + " · " : ""}Lumi team</span>`}${linkify(m.text)}<span class="when">${you ? "You" : esc(m.name || "Lumi team")} · ${when(m.at)}</span></div></div>`;
    });
    h += "</div>";
  }
  h += "</div>";
  $("#main").innerHTML = h;
  // [M5 Max MBP] 2026-09-29 sweep: "‹ Inbox" goes BACK (pops history) instead of pushing, so Back from Inbox returns to where the user came from
  $("#tback").onclick = () => { const hh = S.hist || []; while (hh.length && hh[hh.length - 1] === "team") hh.pop(); if (hh[hh.length - 1] === "inbox") hh.pop(); go("inbox", { __back: 1 }); };
  dock(`<div class="compose"><div class="in"><input type="text" id="ttext" maxlength="12000" placeholder="${box ? "Reply to " + esc(((t.boxes || []).find(x => x.box === box) || {}).name || (box[0].toUpperCase() + box.slice(1))) : "Reply to the team"}"><button class="btn primary send" id="tsend" aria-label="Send"><svg viewBox="0 0 24 24"><path d="M21 3L10 14"/><path d="M21 3l-7 18-4-7-7-4z"/></svg></button></div></div>`, "has-compose");
  if (ms.length) setPageY(1e7);   // [M5 Max MBP] 2026-09-30 (chat layout agent): the chat list scrolls, not the window
  // [M5 Max MBP] 2026-10-03 appfix A28: read receipts go quietly (a network blip showed "Could not send" on just opening a thread), and the
  // receipt is retried on the next open until the server has it ("teamread_sent"). "teamread" stays this phone's own display mark.
  if (box) { const last = ms.length ? ms[ms.length - 1].at : 0, rb = fetchStore("teamreadb", {}) || {}, bx = (t.boxes || []).find(x => x.box === box);
    if ((rb[box] || 0) < last) { rb[box] = last; store("teamreadb", rb); }
    const want = rb[box] || 0, sb = fetchStore("teamread_sentb", {}) || {};
    if (want > (sb[box] || 0) && !S.teamReadSending) { S.teamReadSending = true; sendQuiet({ kind: "team_read", choice: box }).then(ok => { S.teamReadSending = false; if (ok) { const s2 = fetchStore("teamread_sentb", {}) || {}; s2[box] = want; store("teamread_sentb", s2); } }); }
    if (bx && bx.unread) { t.unread = Math.max(0, (t.unread || 0) - bx.unread); bx.unread = 0; } inboxTab(); }
  else { const last = ms.length ? ms[ms.length - 1].at : 0;
    if (t.unread && fetchStore("teamread", 0) < last) store("teamread", last);
    const want = fetchStore("teamread", 0) || 0;
    if (want > (fetchStore("teamread_sent", 0) || 0) && !S.teamReadSending) { S.teamReadSending = true; sendQuiet({ kind: "team_read" }).then(ok => { S.teamReadSending = false; if (ok) store("teamread_sent", want); }); }
    if (t.unread) { t.unread = 0; inboxTab(); } }
  // [M5 Max MBP] 2026-09-29 sweep50: one send at a time (a double Enter sent the reply twice), and the reply is kept in "sentteam" so a
  // background refresh or a reload before the Mac has it does not make it vanish.
  // [M5 Max MBP] 2026-10-01 07:26 PDT qa2fix #10: sending keeps the box focused (and the keyboard up); the redraw used to drop it after every send
  const go3 = async () => { const inp = $("#ttext"), x = inp.value.trim(); if (!x || S.teamSending) return; S.teamSending = true; $("#tsend").disabled = true; const hadF = document.activeElement === inp || window.__sendTapFocus; window.__sendTapFocus = false;
    let ok = false; try { ok = await send(Object.assign({ kind: "team_reply", text: x }, box ? { choice: box } : {})); } catch {} S.teamSending = false;
    if (ok) { const m = Object.assign({ from: "client", text: x, at: Date.now() / 1000 }, box ? { box } : {}); (S.data.team = S.data.team || { messages: [] }).messages.push(m); store("sentteam", [...fetchStore("sentteam", []), m].slice(-20)); if (S.view === "team") { renderTeam(); if (hadF) refocus("#ttext"); } toast("Sent to the team"); }
    else { const b = $("#tsend"); if (b) b.disabled = false; } };
  $("#tsend").onclick = go3; $("#ttext").onkeydown = e => { if (e.key === "Enter") go3(); };
}
/* ---------- GUEST54 [M5 Max MBP] 2026-10-29 21:2x PDT. Nick (Telegram): "people should be able to just open the app without signing in ...
   they can't make reels or pay, that will prompt them to sign in." No session = a guest: Home, Styles, Music and Prices work from the public
   files only (looks.json, formats.json, trending.json). No /api call is made for a guest. Anything that needs an account (New reel, uploads,
   the brief, Chat, the Inbox, a checkout) opens the sign-in sheet; after sign in the tapped action carries on, and a style picked as a guest is
   kept in the draft. A Sign in pill sits top right on every tab. ---------- */
const GATE54 = { new: "Sign in to make your reel", msgs: "Sign in to chat with Lumi", team: "Sign in to see your messages", inbox: "Sign in to see your messages" };
function g54Data() { return { ok: true, guest: true, name: "", reels: [], messages: [], team: { messages: [] }, inbox: { items: [] }, uploads: [], account: {}, price: { reel: 20, monthly: 60, monthly_reels: 10 } }; }
function g54Gate(line, after) { S._g54line = line || "Sign in to Lumi"; S._after54 = after || null; try { f122TrStop(); } catch {} signInScreen(""); }
function g54Boot() {
  S.guest = true; if (!S.data || !S.data.guest) S.data = g54Data();
  if (!S.draft) S.draft = { ...DEFAULT_DRAFT(), ...fetchStore("draft", {}) };
  document.documentElement.classList.remove("gatev"); document.querySelectorAll("nav, #hinbox, #avatar").forEach(el => el.style.display = "");
  const av = $("#avatar"); if (av) { av.textContent = "Sign in"; av.className = "avatar g54av"; av.style.background = ""; av.style.color = ""; av.setAttribute("role", "button"); av.setAttribute("tabindex", "0"); av.setAttribute("aria-label", "Sign in");
    av.onclick = () => g54Gate("Sign in to Lumi", null); av.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); av.click(); } }; }
  const hb = $("#hinbox"); if (hb) { hb.onclick = () => { S.reel = null; S.mail = null; go("inbox"); }; const bd = hb.querySelector(".tbadge"); if (bd) bd.remove(); }
  const want = S.view, wantStep = S.step;
  render();
  if (GATE54[want]) g54Gate(GATE54[want], () => go(want, { step: want === "new" ? 0 : wantStep }));
  else { const pe = pendingEmail(); if (pe) { g54Gate("Sign in to Lumi", null); resumePending(pe); } }   // a sign in that was mid-way when iOS dropped the tab
}
function g54Leave() {
  const gd = S.draft || null; S.guest = false; S.data = null; S._lastMe = null; S._g54line = "";
  const av = $("#avatar"); if (av) { av.classList.remove("g54av"); av.removeAttribute("role"); av.removeAttribute("tabindex"); av.removeAttribute("aria-label"); av.onkeydown = null; av.textContent = "·"; }
  // the picks made as a guest ride into this account's draft (a style chosen on Styles goes into the brief)
  try { const def = DEFAULT_DRAFT(), picks = {}; if (gd) Object.keys(gd).forEach(k => { if (JSON.stringify(gd[k]) !== JSON.stringify(def[k])) picks[k] = gd[k]; });
    S.draft = { ...def, ...fetchStore("draft", {}), ...picks }; store("draft", S.draft); localStorage.removeItem("lumi_draft_"); } catch { S.draft = gd; }
}
function g54Home(h) {
  const browse = styleOrder(looks().filter(l => l.role === "look" && l.family === "newest" && !l.variant_of && l.section !== "Female" && l.code !== "F75")).slice(0, 12);   // FEMALE57 [M5 Max MBP] 2026-10-29: Nick, the scrapbook pieces never lead the home row (they live in Styles, Female section)
  h += `<div class="g54cta"><button class="btn primary block" id="g54new" type="button">Make your first reel</button><p class="muted">Your first reel is free. You only pay after you have seen it.</p></div>`;
  h += `<h2>How it works</h2><div class="steps">
      <div class="step"><div class="n">1</div><div><h3>Upload your clip</h3><p class="muted" style="margin:0;font-size:14px">A video of you talking to camera, straight from your phone.</p></div></div>
      <div class="step"><div class="n">2</div><div><h3>Pick your look</h3><p class="muted" style="margin:0;font-size:14px">${SHOW_COLOR ? "Captions, motion graphics, music and color" : "Captions, motion graphics and music"}, all shown moving before you choose.</p></div></div>
      <div class="step"><div class="n">3</div><div><h3>Get it back here</h3><p class="muted" style="margin:0;font-size:14px">Your finished reel lands in the app, ready to post. Ask for changes on any second.</p></div></div></div>`;
  if (browse.length) h += `<div class="card stylecard"><div class="row sch"><span class="spk2" aria-hidden="true">✦</span><h2>Caption styles</h2><a href="#" id="alllooks" class="chev" aria-label="See all">›</a></div>${strip(browse, { act: "open" })}</div>`;
  h += `<div class="g54links"><button class="g54link" type="button" id="g54tpl"><span class="gi">✦</span><b>Templates</b><small>Fully built looks, in motion</small></button><button class="g54link" type="button" id="g54mus"><span class="gi">♫</span><b>Trending music</b><small>Tap to hear what is trending</small></button><button class="g54link" type="button" id="g54mg"><span class="gi">◎</span><b>Motion graphics</b><small>Graphics on top of your captions</small></button><button class="g54link" type="button" id="g54pr"><span class="gi">$</span><b>Prices</b><small>First reel free, then from $6 a reel</small></button></div>`;
  $("#main").innerHTML = h; armTiles(); bindTiles();
  $("#g54new").onclick = () => go2new(nfResumeStep());
  { const a = $("#alllooks"); if (a) a.onclick = e => { e.preventDefault(); S.stab = "captions"; go("looks"); }; }
  $("#g54tpl").onclick = () => { S.stab = "templates"; go("looks"); };
  $("#g54mg").onclick = () => { S.stab = "motion"; go("looks"); };
  $("#g54mus").onclick = () => go("music");
  $("#g54pr").onclick = () => go("pay");
}
function g54Pay() {
  const pr = Object.assign({ reel: 20, monthly: 60, monthly_reels: 10 }, (S.data || {}).price || {}), per = Number(pr.monthly) > 0 && Number(pr.monthly_reels) > 0 ? Math.round(Number(pr.monthly) / Number(pr.monthly_reels)) : 0;
  $("#main").innerHTML = `<h1>Prices.</h1><p class="sub">Your first reel is free. After that you only pay once you have seen your reel. Apple Pay and cards. ${revLine()}</p>
    <div class="card"><div class="eyebrow">Your first reel</div><div class="price">Free</div><p class="muted" style="margin:0 0 14px">Send a clip and see what we make. No card needed to start.</p><button class="btn primary block" id="g54pnew" type="button">Make your first reel</button></div>
    <h2>Plans</h2>
    <div class="card"><div class="eyebrow">Monthly</div><div class="price">$${esc(pr.monthly)}<small>/ month</small></div><p class="muted" style="margin:0 0 14px">Up to ${esc(pr.monthly_reels)} reels a month${per ? ` (about $${esc(String(per))} a reel)` : ""}, billed monthly through Stripe. Cancel any time. The monthly plan is for one person per account. Agencies: <a href="/agencies">lumiedits.app/agencies</a></p><button class="btn line block" id="g54pmo" type="button">Sign in to start monthly</button></div>
    <div class="card"><div class="eyebrow">Per reel</div><div class="price">$${esc(pr.reel)}<small>/ reel</small></div><p class="muted" style="margin:0">Billed when your reel is done, after your free one.</p></div>`;
  $("#g54pnew").onclick = () => go2new(nfResumeStep());
  $("#g54pmo").onclick = () => g54Gate("Sign in to start your plan", () => go("pay"));
}
function g54Music() {
  f122Trend(); const T = S.trend;
  let h = `<div class="g54mus"><h1>Trending <i>music.</i></h1><p class="sub">The songs we can put on your reel right now. Tap a cover to hear it.</p>`;
  h += !T ? `<p class="spd" style="margin-top:12px">Loading what is trending...</p>` : !T.length ? `<p class="spd" style="margin-top:12px">The trending list is not available right now. Try again soon.</p>`
    : `${f61Tabs(T)}<input class="text f122trs" id="trq122" type="search" placeholder="Search ${f61Shown(T).length} trending songs" value="${esc(S.trQ || "")}" autocomplete="off" autocapitalize="off">
      <div class="f122trl" id="trl122">${f61List(f61Shown(T), (t, i) => `<div class="trrow" data-trq="${esc((t.artist + " " + t.title).toLowerCase())}">${t.preview ? `<button type="button" class="trpl${S.trPlaying === t.id ? " on" : ""}" data-trplay="${esc(t.id)}" aria-label="${S.trPlaying === t.id ? "Pause" : "Play"} ${esc(t.title)}">${t.art ? `<img src="${esc(t.art)}" alt="" loading="lazy">` : ""}<i class="ic"></i></button>` : t.art ? `<img class="trart" src="${esc(t.art)}" alt="" loading="lazy">` : ""}<button type="button" class="trsel"${t.preview ? ` data-trplay2="${esc(t.id)}"` : ""}><span class="n">${i + 1}</span><span style="min-width:0;flex:1"><b>${esc(t.title)}</b><small>${esc(t.artist)}${t.platform ? " · " + esc(t.platform) : ""}</small><span class="trwv" data-wv="${esc(t.id)}" aria-hidden="true"></span></span></button></div>`)}<p class="none" id="trnone122" hidden>No match. Try another word.</p></div>`;   // MUSIC61: vibe tabs + Slow parts
  h += `<div class="g54cta" style="margin-top:16px"><button class="btn primary block" id="g54mnew" type="button">${S.guest ? "Make your first reel" : "Start a reel"}</button></div></div>`;
  $("#main").innerHTML = h;
  if (!T && S._trP) S._trP.then(() => { if (S.view === "music") render(); });
  document.querySelectorAll("[data-trplay]").forEach(b => b.onclick = e => { e.stopPropagation(); f122TrToggle(b.dataset.trplay); });
  document.querySelectorAll("[data-trplay2]").forEach(b => b.onclick = () => f122TrToggle(b.dataset.trplay2));
  f61Bind();   // MUSIC61: tabs + search that hides empty Slow parts
  $("#g54mnew").onclick = () => go2new(nfResumeStep());
  try { f122TrPaint(); } catch {}
}
function go(view, extra = {}) { if (S.guest && GATE54[view]) return g54Gate(GATE54[view], () => go(view, view === "new" ? Object.assign({}, extra, { step: 0 }) : extra));   // GUEST54
  { const ok = extra.__nfok, keep = extra.__pick; delete extra.__nfok; delete extra.__pick;   // BETHFIX81 [M5 Max MBP] 2026-10-31: Continue or Start new first
    if (view === "new" && S.view !== "new" && !ok) { const ip = nfInProg(); if (ip) { nfStartAsk(ip, extra, keep); return; } } }
  if (!extra.__back) { (S.hist = S.hist || []).push(S.view); if (S.hist.length > 20) S.hist.shift(); } delete extra.__back; try { window.__scrollSave && window.__scrollSave(); } catch {} Object.assign(S, extra); S.view = view; setPageY(0); render(); }

/* ---------- the opening page ---------- */
function renderStart() {
  const d = S.data, pick = ["F14", "M10", "F20"].map(byCode).filter(Boolean);
  const first = !(d.reels || []).length, gf = giftOf(d), pr = Object.assign({ reel: 20, monthly: 60, monthly_reels: 10 }, d.price || {});
  // [M5 Max MBP] 2026-10-01 07:26 PDT qa2fix newclient D: the main button sits right under the welcome line, above the fold on every phone (it was under the collage).
  // #8: a gift client (snapshot.gift) reads the gift, never "first reel free, then $20".
  const offer = isComped(d) ? `<b>Your reels are on us.</b>` : gf ? (gf.left > 0 ? `<b>${esc(gf.head)}.</b> ${esc(String(gf.left))} of them left.` : `Your free reels from ${esc(gf.from)} are used.`) : first ? `<b>Your first reel is on us.</b>` : "";
  let h = `<h1 class="starth">Send a video.<br>Get it back <i>cut like the reels you save.</i></h1>
    <p class="sub startsub">${first ? `Hi ${esc(d.name || "there")}. ` : ""}Pick the caption style you want from every look we make, watch it move before you choose, and tell us the rest in one go.</p>
    ${offer ? `<p style="margin:0 0 12px">${offer}</p>` : ""}
    <div class="row" style="gap:10px;margin-bottom:16px"><button class="btn primary" id="startnew" style="flex:1">${first ? "Make your first reel" : "Start a reel"}</button><button class="btn line" id="browse" style="flex:1">See every style</button></div>
    <div class="collage">${pick[1] ? tile(pick[1], { nocap: true }).replace('class="mv', 'class="mv a') : ""}${pick[0] ? tile(pick[0], { nocap: true }).replace('class="mv', 'class="mv b') : ""}${pick[2] ? tile(pick[2], { nocap: true }).replace('class="mv', 'class="mv c') : ""}</div>
    <h2>How it works</h2>
    <div class="steps">
      <div class="step"><div class="n">1</div><div><h3>Send us the video</h3><p class="muted" style="margin:0;font-size:14px">Your own private upload link. Any size, any format, portrait is best.</p></div></div>
      <div class="step"><div class="n">2</div><div><h3>Choose the look, in motion</h3><p class="muted" style="margin:0;font-size:14px">Every caption style we offer, playing the way it lands on screen. Add a hook style, music, b-roll and a background in the same breath.</p></div></div>
      <div class="step"><div class="n">3</div><div><h3>Review it here</h3><p class="muted" style="margin:0;font-size:14px">Watch the cut, pin a note to the exact second, approve when it is right. ${revLine()}</p></div></div>
    </div>
    <p class="muted" style="font-size:14px">${isComped(d) ? "Your reels are on us." : `${gf ? (gf.left > 0 ? esc(gf.head) + ". " : "") + "After your free reels" : "Your first reel is on us. After that"} it is $${esc(pr.reel)} a reel, or $${esc(pr.monthly)} a month for up to ${esc(pr.monthly_reels)}.`}</p>`;
  $("#main").innerHTML = h; armTiles();
  $("#startnew").onclick = () => go2new(nfResumeStep());   // newreel 2026-10-03: a reel left mid-way picks up where it was
  $("#browse").onclick = () => go("looks");
}

/* ---------- reels home ---------- */
function designCard(d) {
  // [M5 Max MBP] 2026-09-26 (Nick on a client's app: "the text goes behind the words"; make it tappable, see it up close)
  const g = d.design || {}, c = g.current, hist = g.history || [];
  if (!c && !hist.length) return "";
  if (!c) return "";
  return `<button class="card dcard" id="dcard" type="button" aria-label="Open your personal style">
    <span class="dth">${c.poster ? `<img src="${esc(c.poster)}" alt="">` : ""}</span>
    <span class="dtx"><span class="eyebrow">Your personal style</span><b>${esc(c.name || "Your look")}${c.code ? ` <em>${esc(c.code)}</em>` : ""}</b>
    <span class="dd">${esc(c.desc || "")}</span><span class="dgo">See your style ›</span></span></button>`;
}
function openProfile() {
  const g = (S.data && S.data.design) || {}, c = g.current; if (!c) return;
  const reels = S.data.reels || [], used = new Map();
  (g.history || []).filter(x => !c.code || x.code === c.code).forEach(x => { const r = reels.find(r => r.id === x.reel) || reels.find(r => (r.title || "").toLowerCase() === (x.title || "").toLowerCase()); if (r) used.set(r.id, r); });
  reels.filter(r => r.look && r.look === c.name).forEach(r => used.set(r.id, r));
  const list = [...used.values()];
  sheet(`<div class="pview">${c.video ? `<video src="${esc(c.video)}" poster="${esc(c.poster || "")}" muted loop autoplay playsinline></video>` : c.poster ? `<img src="${esc(c.poster)}" alt="">` : ""}</div>
    <div class="eyebrow">Your design profile</div><h3 class="ptitle">${esc(c.name || "Your look")}${c.code ? ` <em>${esc(c.code)}</em>` : ""}</h3>
    <p class="muted" style="margin:4px 0 14px">${esc(c.desc || "")} Every new reel of yours is built in this look.</p>
    <div class="eyebrow" style="margin-bottom:8px">Reels made with this look${list.length ? ` · ${list.length}` : ""}</div>
    ${list.length ? `<div class="plist">${list.map(r => `<button class="prow" data-id="${esc(r.id)}"><span class="pth">${posterOf(r) ? `<img src="${esc(posterOf(r))}" alt="">` : ""}</span><span class="ptx"><b>${esc(reelLabel(r))}</b><span>${r.status && ST[r.status] ? esc(ST[r.status][0]) : ""}</span></span><span class="pch">›</span></button>`).join("")}</div>` : `<p class="muted">Your next reel will be the first in this look.</p>`}
    <button class="btn line block" id="pclose" style="margin-top:14px">Close</button>`);
  $("#pclose").onclick = closeSheet;
  document.querySelectorAll(".prow").forEach(b => b.onclick = () => { closeSheet(); S.reel = b.dataset.id; S.ver = null; S.view = "home"; setPageY(0); render(); });
}

/* ---------- PHOTO CAROUSELS. cherylcar 2026-10-18 [M5 Max MBP]. Nick (TG 2026-10-18 09:58) for Cheryl: "I can see all the videos, but I can't
   see the carousels". A photo carousel is a set of Instagram slide images, not a video, so it never fit the reel player. The Mac puts them in
   the snapshot as d.carousels = [{id, title, at, slides: [{url, w, h}]}] (app_push.py, from app_carousels.json), and d.hide_reels lists reel
   ids that were really a carousel (their tile played one slide as a broken video). No field = nothing changes for anyone. ---------- */
function carList(d) { return ((d && d.carousels) || []).filter(c => c && c.id && Array.isArray(c.slides) && c.slides.some(s => s && /^https:\/\//.test(String(s.url || "")))); }
function carDate(at) { try { return new Date((at || 0) * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric" }); } catch { return ""; } }
/* CAROUSEL193 [M5 Max MBP] 2026-11-10 09:30 PST (Nick TG 23992/23997/23998). Nick: "put those [carousels] in the app, in a section for me
   personally ... so I can access those there and create new ones" / "make edits on individual slides" / "all the carousels stacked on top of each
   other, opened up a little bit like a deck of cards. Then I click into it and it should show me 4 slides on top, 4 slides below that ... Then I
   can click into the individual slides and leave notes there." Each carousel is a deck (its slides fanned, the top one fully visible, title under
   it). A deck opens to a 4-per-row numbered grid with a note box for the whole carousel; a tile opens that slide large with "Note for slide N".
   Notes go to the Mac as intent kind carousel_note {carousel, slide (0 = whole), text} and come back in the snapshot as c.notes (app_push.py +
   carousel_notes193.py); a note just sent is kept on this phone (store carnotes193) until the snapshot carries it. "New carousel" sends
   carousel_request {title, text, images} the same way and shows under the decks as Requested (snapshot carousel_requests). */
function carWhen(at) { try { return new Date((at || 0) * 1000).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); } catch { return ""; } }
function carLocalNotes() { const o = fetchStore("carnotes193", {}); return o && typeof o === "object" ? o : {}; }
function carNotes(c) {
  const srv = Array.isArray(c.notes) ? c.notes.filter(n => n && String(n.text || "").trim()) : [];
  const loc = (carLocalNotes()[c.id] || []).filter(n => n && String(n.text || "").trim());
  const keep = loc.filter(l => !srv.some(s => Number(s.slide) === Number(l.slide) && String(s.text).trim() === String(l.text).trim()));
  if (keep.length !== loc.length) { const o = carLocalNotes(); o[c.id] = keep; store("carnotes193", o); }   // the snapshot has it now, the local copy is done
  return srv.map(n => ({ at: Number(n.at) || 0, slide: Number(n.slide) || 0, text: String(n.text), status: String(n.status || "open") }))
    .concat(keep.map(n => ({ at: Number(n.at) || 0, slide: Number(n.slide) || 0, text: String(n.text), status: "sent" })))
    .sort((a, b) => a.at - b.at);
}
function carSlides(c) { return c.slides.filter(s => /^https:\/\//.test(String(s.url || ""))); }
function carReqs(d) {
  const srv = Array.isArray(d.carousel_requests) ? d.carousel_requests : [], loc = fetchStore("carreq193", []) || [];
  const keep = (Array.isArray(loc) ? loc : []).filter(l => !srv.some(s => String(s.title || "") === String(l.title || "") && Math.abs((Number(s.at) || 0) - (Number(l.at) || 0)) < 7200));
  if (Array.isArray(loc) && keep.length !== loc.length) store("carreq193", keep);
  return keep.map(r => Object.assign({}, r, { status: "sent" })).concat(srv).sort((a, b) => (Number(b.at) || 0) - (Number(a.at) || 0));
}
function carStatusWord(st) { return st === "sent" ? "Sent" : st === "done" ? "Done" : st === "working" ? "In the works" : "Received"; }
function carDeck(c) {
  const sl = carSlides(c), top = sl.slice(0, 4), notes = carNotes(c).length;
  const imgs = top.map((s, i) => `<img class="d${i}" src="${esc(s.url)}" alt="" loading="lazy">`).reverse().join("");
  return `<a class="c193deck" data-car="${esc(c.id)}" role="button" tabindex="0" aria-label="${esc(c.title)} carousel, ${sl.length} slides${notes ? ", " + notes + " notes" : ""}">
    <div class="c193stack">${imgs}</div>
    <div class="ct"><b>${esc(c.title)}</b><span>${notes ? `<i class="c193dot" aria-hidden="true"></i>${notes} note${notes === 1 ? "" : "s"} · ` : ""}${sl.length} slides${c.at ? " · " + esc(carDate(c.at)) : ""}</span></div></a>`;
}
/* CARGRID194 [M5 Max MBP] 2026-11-11 09:20 AM PST: one row of four, newest first; the button opens the rest and closes them again (kept per viewer in localStorage "lumi_cargrid194_<key>") */
function carGridOpen() { try { return fetchStore("cargrid194", "") === "open"; } catch { return false; } }
function carGridLabel(open, n) { return open ? "Show one row" : "Show all " + n + " carousels"; }
document.addEventListener("click", e => { const b = e.target && e.target.closest && e.target.closest("#cg194tog"); if (!b) return; e.preventDefault();
  const g = document.getElementById("c193decks"); if (!g) return; const open = !g.classList.contains("open"); g.classList.toggle("open", open); b.setAttribute("aria-expanded", open ? "true" : "false");
  const t = b.querySelector("span"); if (t) t.textContent = carGridLabel(open, g.querySelectorAll(".c193deck").length); try { store("cargrid194", open ? "open" : ""); } catch {}
  if (!open) { try { const r = document.getElementById("carsec").getBoundingClientRect(); if (r.top < 0) document.getElementById("carsec").scrollIntoView({ block: "start" }); } catch {} } });
function carSection(d) {
  const all = carList(d), reqs = carReqs(d);
  if (!all.length && !reqs.length) return "";
  // PHOTOPACK183 [M5 Max MBP] 2026-11-06 11:30 AM PST: kind "photos" = a photo pack (Nick's Sci-Fi BTS thumbnails), its own "Your photos" section first
  const pps = all.filter(c => c.kind === "photos"), cs = all.filter(c => c.kind !== "photos");
  let h = "";
  if (pps.length) {
    h += `<div class="dsec carsec" id="ppsec"><span class="spk2" aria-hidden="true">✦</span><h2>${esc(pps[0].section || "Your thumbnails")}</h2></div><div class="carlist">`;   // TITLES193 [M5 Max MBP] 2026-11-10 (Nick TG 24007): it is a thumbnail section
    for (const c of pps) {
      const sl = carSlides(c);
      h += `<a class="card carcard" data-car="${esc(c.id)}" role="button" tabindex="0" aria-label="${esc(c.title)}, ${sl.length} thumbnails"><div class="ct"><b>${esc(c.title)}</b><span>${sl.length} thumbnails${c.at ? " · " + esc(carDate(c.at)) : ""}</span></div>
      <div class="carstrip">${sl.map((s, i) => `<img src="${esc(s.url)}" alt="${esc(s.name || "Photo " + (i + 1))}" loading="lazy"${s.w && s.h ? ` style="aspect-ratio:${Number(s.w)}/${Number(s.h)}"` : ""}>`).join("")}</div></a>`;
    }
    h += "</div>";
  }
  if (!cs.length && !reqs.length) return h;
  h += `<div class="c193head" id="carsec"><div class="dsec carsec"><span class="spk2" aria-hidden="true">✦</span><h2>Your carousels</h2></div><button class="btn sm primary" type="button" id="c193new">New carousel</button></div>`;
  if (cs.length) { const srt = cs.map((c, i) => [Number(c.at) || 0, i, c]).sort((a, b) => b[0] - a[0] || a[1] - b[1]).map(x => x[2]), op = carGridOpen() && srt.length > 4;   // CARGRID194 [M5 Max MBP] 2026-11-11 09:20 AM PST
    h += `<div class="c193decks cg194${op ? " open" : ""}" id="c193decks">${srt.map(carDeck).join("")}</div>` + (srt.length > 4 ? `<button type="button" class="cg194tog" id="cg194tog" aria-expanded="${op ? "true" : "false"}" aria-controls="c193decks"><span>${carGridLabel(op, srt.length)}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>` : ""); }
  if (reqs.length) h += `<div class="carlist" id="c193reqs">${reqs.map(r => `<div class="card c193req"><div class="c193rq" aria-hidden="true">NEW</div><div style="flex:1;min-width:0"><b>${esc(r.title || "New carousel")}</b><span>${esc(carStatusWord(r.status))}${r.at ? " · asked " + esc(carWhen(r.at)) : ""}${Number(r.photos) ? " · " + Number(r.photos) + " photo" + (Number(r.photos) === 1 ? "" : "s") : ""}</span></div></div>`).join("")}</div>`;
  return h;
}
async function carNoteSend(c, slide, ta, btn) {
  const text = String(ta.value || "").trim(); if (!text) { toast("Write the note first."); ta.focus(); return; }
  const old = btn.textContent; btn.disabled = true; btn.textContent = "Sending...";
  const ok = await send({ kind: "carousel_note", carousel: c.id, slide: Number(slide) || 0, text });
  btn.disabled = false; btn.textContent = old;
  if (!ok) return;
  const o = carLocalNotes(); (o[c.id] = o[c.id] || []).push({ at: Math.floor(Date.now() / 1000), slide: Number(slide) || 0, text }); store("carnotes193", o);
  ta.value = ""; toast(slide ? "Sent. Note on slide " + slide + "." : "Sent. Note on the whole carousel.");
  render();
}
function carNotesHtml(c, slide) {
  const L = carNotes(c).filter(n => Number(n.slide) === Number(slide));
  if (!L.length) return `<p class="c193empty">${slide ? "No notes on this slide yet." : "No notes on the whole carousel yet."}</p>`;
  return `<div class="c193list">${L.map(n => `<div class="c193it"><div class="c193meta"><span class="c193when">${esc(carWhen(n.at))}</span><span class="c193st${n.status === "done" ? " done" : ""}">${esc(carStatusWord(n.status))}</span></div><p>${esc(n.text)}</p></div>`).join("")}</div>`;
}
function carNoteBox(c, slide) {
  const id = "c193ta" + (slide || 0);
  return `<div class="c193note"><label for="${id}">${slide ? "Note for slide " + slide : "Note for the whole carousel"}</label>
    <textarea id="${id}" class="tellbox" maxlength="4000" placeholder="${slide ? "e.g. Make the headline bigger, swap the photo, fix the typo in line two." : "e.g. Warmer colours on every slide, a stronger hook on slide 1, add my handle at the end."}" autocapitalize="sentences"></textarea>
    <div class="c193row"><button class="btn primary" type="button" data-c193send="${slide || 0}">Send</button></div></div>${carNotesHtml(c, slide)}`;
}
function carBindNotes(c) {
  document.querySelectorAll("[data-c193send]").forEach(b => b.onclick = () => { const s = Number(b.dataset.c193send) || 0; const ta = $("#c193ta" + s); if (ta) carNoteSend(c, s, ta, b); });
}
function renderCarSlide(c, i) {
  const sl = carSlides(c), s = sl[i]; if (!s) { S.carSlide = null; return renderCar(); }
  const n = i + 1, notes = carNotes(c), cnt = k => notes.filter(x => Number(x.slide) === k).length;
  let h = `<div class="carv c193slide"><div class="rhead"><button class="back" id="carback" aria-label="Back to the carousel">${ICON_BACK}<span>${esc(c.title)}</span></button><h1>Slide ${n}</h1></div>
    <div class="c193big"><img src="${esc(s.url)}" alt="${esc(c.title)}, slide ${n}"${s.w && s.h ? ` width="${Number(s.w)}" height="${Number(s.h)}"` : ""}></div>
    <div class="c193nav"><button class="btn sm line" type="button" id="c193prev"${i ? "" : " disabled"}>Previous</button><span class="c193pos">Slide ${n} of ${sl.length}${cnt(n) ? " · " + cnt(n) + " note" + (cnt(n) === 1 ? "" : "s") : ""}</span><button class="btn sm line" type="button" id="c193next"${i < sl.length - 1 ? "" : " disabled"}>Next</button></div>
    <button class="btn line block" type="button" id="c193save">Save this slide</button>
    ${carNoteBox(c, n)}</div>`;
  $("#main").innerHTML = h;
  $("#carback").onclick = () => { S.carSlide = null; setPageY(0); render(); };
  $("#c193prev").onclick = () => { if (i > 0) { S.carSlide = i - 1; setPageY(0); render(); } };
  $("#c193next").onclick = () => { if (i < sl.length - 1) { S.carSlide = i + 1; setPageY(0); render(); } };
  { const b = $("#c193save"); b.onclick = () => carSave(c, i, b); }
  carBindNotes(c);
}
function renderCar() {
  const d = S.data, c = carList(d).find(x => x.id === S.car);
  if (!c) { S.car = null; S.carSlide = null; S.view = "home"; return (d.reels || []).length ? renderHome() : renderStart(); }
  if (c.kind === "photos") return renderPhotos(c);   // PHOTOPACK183
  if (S.carSlide != null) return renderCarSlide(c, Number(S.carSlide) || 0);
  const sl = carSlides(c), notes = carNotes(c), cnt = k => notes.filter(x => Number(x.slide) === k).length;
  let h = `<div class="carv c193view"><div class="rhead"><button class="back" id="carback" aria-label="Back to reels">${ICON_BACK}<span>Reels</span></button><h1>${esc(c.title)}</h1></div>
    <p class="carhint">${sl.length} slides${c.at ? ", delivered " + esc(carDate(c.at)) : ""}${notes.length ? ", " + notes.length + " note" + (notes.length === 1 ? "" : "s") : ""}. Tap a slide to see it large and leave a note on it.</p>
    <div class="c193grid" id="c193grid">${sl.map((s, i) => `<button class="c193tile" type="button" data-c193s="${i}" aria-label="Slide ${i + 1}${cnt(i + 1) ? ", " + cnt(i + 1) + " notes" : ""}"><img src="${esc(s.url)}" alt="" loading="lazy"><span class="c193n">${i + 1}</span>${cnt(i + 1) ? `<span class="c193has">${cnt(i + 1)}</span>` : ""}</button>`).join("")}</div>
    ${sl.length > 1 ? `<button class="btn line block carall" type="button" id="carall">Save all ${sl.length} slides</button>` : ""}
    ${carNoteBox(c, 0)}</div>`;
  $("#main").innerHTML = h;
  $("#carback").onclick = () => { S.car = null; S.carSlide = null; go("home", { __back: 1 }); };
  { const a = $("#carall"); if (a) a.onclick = () => carSave(c, null, a); }
  document.querySelectorAll("[data-c193s]").forEach(b => b.onclick = () => { S.carSlide = Number(b.dataset.c193s) || 0; setPageY(0); render(); });
  carBindNotes(c);
}
/* "New carousel": title + what it should say + optional photos (api/photo, the same shrink + upload as a chat photo), sent as carousel_request. */
function carNewPics() { return S.c193imgs || (S.c193imgs = []); }
function carNewPicsHtml() {
  const L = carNewPics();
  return `<div class="c193pics" id="c193pics">${L.map(i => `<div class="c193pic${i.busy ? " busy" : ""}">${i.thumb ? `<img src="${esc(i.thumb)}" alt="">` : ""}<button type="button" data-c193px="${esc(i.id)}" aria-label="Remove photo">×</button></div>`).join("")}${L.length < 12 ? `<button class="c193add" type="button" id="c193addpic" aria-label="Add photos">+</button>` : ""}</div>`;
}
function carNewPicsDraw() {
  const old = $("#c193pics"); if (!old) return; old.outerHTML = carNewPicsHtml(); carNewPicsBind();
}
function carNewPicsBind() {
  const add = $("#c193addpic"), inp = $("#c193file");
  if (add && inp) add.onclick = () => inp.click();
  document.querySelectorAll("[data-c193px]").forEach(b => b.onclick = () => { S.c193imgs = carNewPics().filter(x => x.id !== b.dataset.c193px); carNewPicsDraw(); });
}
async function carNewAdd(files) {
  const L = carNewPics(), list = [...(files || [])].filter(Boolean);
  if (L.length + list.length > 12) toast("Up to 12 photos for one carousel.");
  for (const f of list.slice(0, Math.max(0, 12 - L.length))) {
    if (f.size > CHATIMG_RAW_MAX) { toast("That photo is too big."); continue; }
    if (f.type && !/^image\//.test(f.type)) { toast("Only photos can go in here."); continue; }
    const it = { id: Math.random().toString(36).slice(2, 9), busy: true, thumb: "", url: "", w: 0, h: 0 };
    L.push(it); carNewPicsDraw();
    try {
      const p = await shrinkPhoto(f); it.thumb = p.data; it.w = p.w; it.h = p.h; carNewPicsDraw();
      const r = await fetch("/api/photo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ k: K, data: p.data, w: p.w, h: p.h }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok || !j.url) throw new Error(j.error || "Upload failed. Please try again.");
      it.url = j.url; it.busy = false;
    } catch (e) {
      S.c193imgs = carNewPics().filter(x => x !== it);
      toast(e && e.message === "decode" ? "That photo could not be opened here. Try a JPG." : (e && e.message) || "Upload failed. Please try again.");
    }
    carNewPicsDraw();
  }
}
function carNewSheet() {
  const dr = fetchStore("cardraft193", {}) || {};
  sheet(`<div class="c193form"><h2>New carousel</h2><p class="c193sub">Tell me what it is about and what each slide should say. I make the slides and they show up here.</p>
    <label for="c193title">Title</label><input class="text" id="c193title" maxlength="140" placeholder="e.g. Why lighting is the new superpower" value="${esc(dr.title || "")}" autocapitalize="sentences">
    <label for="c193text">What it should say</label><textarea id="c193text" class="tellbox" maxlength="12000" placeholder="The hook, the points in order, the last slide. Paste a script or just the idea." autocapitalize="sentences">${esc(dr.text || "")}</textarea>
    <label>Photos (optional)</label>${carNewPicsHtml()}<input type="file" id="c193file" accept="image/*" multiple hidden>
    <div class="c193btns"><button class="btn line" type="button" id="c193cancel">Cancel</button><button class="btn primary" type="button" id="c193sendreq">Send</button></div></div>`, () => carNewDraft());
  const ti = $("#c193title"), tx = $("#c193text"), fi = $("#c193file");
  fi.onchange = () => { carNewAdd(fi.files); fi.value = ""; };
  carNewPicsBind();
  ti.oninput = tx.oninput = () => carNewDraft();
  $("#c193cancel").onclick = () => { carNewDraft(); closeSheet(); };
  $("#c193sendreq").onclick = async () => {
    const title = String(ti.value || "").trim(), text = String(tx.value || "").trim();
    if (!title && !text) { toast("Tell me what the carousel should say."); tx.focus(); return; }
    if (carNewPics().some(i => i.busy)) { toast("One photo is still uploading."); return; }
    const b = $("#c193sendreq"); b.disabled = true; b.textContent = "Sending...";
    const images = carNewPics().filter(i => i.url).map(i => ({ url: i.url, w: i.w, h: i.h }));
    const ok = await send({ kind: "carousel_request", title, text, images });
    if (!ok) { b.disabled = false; b.textContent = "Send"; return; }
    const loc = fetchStore("carreq193", []) || []; loc.push({ at: Math.floor(Date.now() / 1000), title: title || "New carousel", photos: images.length }); store("carreq193", loc);
    S.c193imgs = []; store("cardraft193", {}); closeSheet(); toast("Sent. Your new carousel is on the list."); render();
  };
}
function carNewDraft() { try { store("cardraft193", { title: String(($("#c193title") || {}).value || ""), text: String(($("#c193text") || {}).value || "") }); } catch {} }
function carFileName(c, i, u) { const sn = c.slides.filter(s => /^https:\/\//.test(String(s.url || "")))[i]; if (sn && sn.name) return String(sn.name).replace(/[\/\\:*?"<>|]+/g, "-");   // PHOTOPACK183: the pack's own file names
  const ext = /\.png(\?|$)/i.test(String(u)) ? "png" : "jpg"; return `${String(c.title || "Carousel").replace(/[^\w ]+/g, "").trim()} - Slide ${i + 1}.${ext}`; }
async function carFiles(c, idx) {
  const sl = c.slides.filter(s => /^https:\/\//.test(String(s.url || ""))), pick = idx == null ? sl.map((s, i) => i) : [idx];
  return Promise.all(pick.map(async i => { const r = await fetch(sl[i].url, { cache: "no-store" }); if (!r.ok) throw new Error("http " + r.status);
    const b = await r.blob(), nm = carFileName(c, i, sl[i].url); return new File([b], nm, { type: b.type || (nm.endsWith(".png") ? "image/png" : "image/jpeg") }); }));
}
async function carSave(c, idx, btn) {
  const sl = c.slides.filter(s => /^https:\/\//.test(String(s.url || "")));
  const old = btn ? btn.textContent : ""; if (btn) { btn.disabled = true; btn.textContent = "Getting it ready..."; }
  try {
    const files = await carFiles(c, idx);
    if (navigator.canShare && navigator.canShare({ files })) {
      try { await navigator.share({ files, title: c.title || "Carousel" }); } catch (e) { if (e && e.name !== "AbortError") throw e; }
    } else {
      for (const f of files) { const u = URL.createObjectURL(f), a = document.createElement("a"); a.href = u; a.download = f.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); }
      toast(files.length > 1 ? "Saved " + files.length + " slides" : "Saved");
    }
  } catch { window.open(sl[idx == null ? 0 : idx].url, "_blank", "noopener"); }
  finally { if (btn) { btn.disabled = false; btn.textContent = old; } }
}
// PHOTOPACK183 [M5 Max MBP] 2026-11-06 11:30 AM PST: Download all = the pack's one zip, original bytes (stored, not recompressed), saved under its real name.
async function ppZip(c, btn) {
  const z = c.zip || {}; if (!/^https:\/\//.test(String(z.url || ""))) return;
  const old = btn.textContent; btn.disabled = true; btn.textContent = "Getting it ready...";
  try {
    const r = await fetch(z.url, { cache: "no-store" }); if (!r.ok) throw new Error("http " + r.status);
    const f = new File([await r.blob()], z.name || "Photos.zip", { type: "application/zip" });
    const u = URL.createObjectURL(f), a = document.createElement("a"); a.href = u; a.download = f.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 8000);
    toast("Downloading " + f.name);
  } catch { location.href = z.url + (z.url.indexOf("?") < 0 ? "?" : "&") + "download=1"; }
  finally { btn.disabled = false; btn.textContent = old; }
}
function renderPhotos(c) {
  const sl = c.slides.filter(s => /^https:\/\//.test(String(s.url || ""))), hasZip = /^https:\/\//.test(String((c.zip || {}).url || ""));
  let h = `<div class="carv"><div class="rhead"><button class="back" id="carback" aria-label="Back to reels">${ICON_BACK}<span>Reels</span></button><h1>${esc(c.title)}</h1></div>
    <p class="carhint">${sl.length} photos, full quality${c.at ? ", added " + esc(carDate(c.at)) : ""}. Tap a photo to see it full size.</p>
    <div class="ppbtns">${hasZip ? `<button class="btn primary carall" type="button" id="ppzip">Download all ${sl.length} (zip)</button>` : ""}${sl.length > 1 ? `<button class="btn ${hasZip ? "line" : "primary"} carall" type="button" id="carall">Save all ${sl.length} to Photos</button>` : ""}</div><div class="ppgrid">`;
  sl.forEach((s, i) => { h += `<div class="carslide"><a href="${esc(s.url)}" target="_blank" rel="noopener"><img src="${esc(s.url)}" alt="${esc(s.name || c.title + ", photo " + (i + 1))}"${s.w && s.h ? ` width="${Number(s.w)}" height="${Number(s.h)}"` : ""} loading="lazy"></a><div class="cs"><span>${esc(String(s.name || "").replace(/\.[a-z0-9]+$/i, "").split(" - ").pop() || "Photo " + (i + 1))}</span><button class="btn sm line" type="button" data-cs="${i}">Save</button></div></div>`; });
  h += "</div></div>";
  $("#main").innerHTML = h;
  $("#carback").onclick = () => { S.car = null; go("home", { __back: 1 }); };
  { const z = $("#ppzip"); if (z) z.onclick = () => ppZip(c, z); }
  { const a = $("#carall"); if (a) a.onclick = () => carSave(c, null, a); }
  document.querySelectorAll("[data-cs]").forEach(b => b.onclick = () => carSave(c, Number(b.dataset.cs), b));
}
function renderHome() {
  const d = S.data, hidR = new Set(d.hide_reels || []), reels = (d.reels || []).filter(r => !hidR.has(r.id));   // cherylcar 2026-10-18 [M5 Max MBP]
  applyRevReq(reels);     // [M5 Max MBP] 2026-09-29 sweep50: BEFORE any count, so a change request just sent is never counted as both in the edit and ready for review
  reelOrder(reels);       // revtop 2026-10-08: being edited / newest activity first
  if (!S.guest && !S._annSrv && !S._rvAsk) { S._rvAsk = true; annServer().then(ids => { if ((ids || []).some(x => /^rv/.test(x)) && S.view === "home" && !S.reel) { try { render(); } catch {} } }); }
  const review = reels.filter(r => r.status === "review").length;
  const pick = ["F16", "M12", "F21"].map(byCode).filter(Boolean);
  // STYLE D on the client app. [M5 Max MBP] 2026-09-28 18:5x PDT (2-day asks agent). Nick, Sep 27 23:5x: "the client app doesn't have
  // any of the changes we've been talking about for the last 3 hours". Same Lumi Live look as the board: the working Lumi clip in a
  // square (never cropped), turning into the beach/margarita art when nothing is being edited, a speech bubble that says the day in
  // plain words, soft glass stat pills, and Running now at the top. Every word and number comes from this client's own snapshot.
  // [M5 Max MBP] 2026-09-28 20:0x PDT (inbox agent): ONE source for all three. Nick's home said "5 reels are in the edit" while Running now
  // said "Nothing being edited right now" and the badge said "Lumi is on a break": the count read status, the list read progress (which
  // email reels never carry). Every reel counted as in the edit is now listed under Running now and keeps the badge on "Lumi is editing".
  // [M5 Max MBP] 2026-09-29 sweep50: a reel that is Ready for review is not also "running" (it showed as "REVISION, Revision 1 of 5: waiting"
  // while the tile counted it under Ready for review). It only runs again once the Mac reports a real run on it.
  const running = reels.filter(r => isRunning(r) || pf194(r))   // PAYFIRST194: a reel waiting for its payment is never hidden
    .map(r => r.progress ? r : Object.assign(r, { progress: { stage: r.status === "received" ? "We have your video" : "Your reel is in the edit", pct: null, eta_min: null, mood: "wait", synth: true } }));
  const unbriefed = reels.filter(needsBrief);
  const inEdit = reels.filter(r => (r.status === "editing" || r.status === "received") && !needsBrief(r) && !pf194(r)).length;   // PAYFIRST194: not in the edit until it is paid
  const doneN = reels.filter(r => r.status === "done").length;
  const pfW = reels.filter(r => pf194(r));   // PAYFIRST194
  const needsYou = running.find(r => r.progress.needs_you) || unbriefed[0] || pfW[0];
  const nm = firstName();
  const plural = (n, one, many) => n + " " + (n === 1 ? one : many);
  const bits = [];
  if (inEdit) bits.push(plural(inEdit, "reel is in the edit", "reels are in the edit"));
  if (review) bits.push(plural(review, "reel is ready for your review", "reels are ready for your review"));
  if (doneN && !bits.length) bits.push(plural(doneN, "reel is finished", "reels are finished"));
  let say = (unbriefed.length ? "Your clips are in. Start your brief and I start editing." : (pfW.length && needsYou === pfW[0]) ? "One reel is waiting on its payment. Pay and I start editing." : needsYou ? "I need you on one thing in Chat." : bits.length ? bits.join(" and ") + "." : reels.length ? "Everything is finished. Ready for the next one." : "Send me your first video and I take it from there.");
  if (S.guest) say = "Send me a video of you talking and I turn it into a finished reel. Have a look around.";   // GUEST54
  const working = running.length > 0 && !needsYou;
  // HOME50 [M5 Max MBP] 2026-10-29 18:1x PDT: one Lumi scene per state, blended into the header (CSS .h50). edit = at the laptop,
  // ask = needs you, ready = a reel is waiting for review (thumbs up + sparkles), beach = nothing being edited. ?h50=<state> previews one (QA).
  // BEACHSEEN63 [M5 Max MBP] 2026-10-30 (Nick TG): confetti only while a reel still has an unopened "New version" tag; once every new one is opened, Lumi on vacation (beach loop)
  let st = needsYou ? "ask" : working ? "edit" : reels.some(r => isNewVer(r)) ? "ready" : "beach";
  { const q = (location.search.match(/[?&]h50=(edit|ask|ready|beach)\b/) || [])[1]; if (q) st = q; }
  // STYLES51 [M5 Max MBP] 2026-10-29 20:1x PDT: the sharp scenes (lumi_scenes/): laptop for editing, confetti for a reel ready, the night beach
  // in dark mode (the light beach stays for light idle). Same .h50art slot, so the blend, fade and fixed height are unchanged.
  // LOOPS51 [M5 Max MBP] 2026-10-29 20:4x PDT (Nick TG: "an animation of Lumi actually typing", same for the beach, and Lumi was cut off at
  // the top): Seedance 2.0 loops (lumi_scenes/lumi_<scene>_loop.mp4/.webm/.jpg, 720x540 with headroom, seamless 4.6 s). Muted autoplay loop
  // playsinline with the poster; reduced motion = the poster still. CSS .h50v fits the whole scene (contain) so the ears are never cut.
  const h50rm = (() => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; } })();
  // GIF54 [M5 Max MBP] 2026-10-29 (Nick TG: "STILL not moving ... make it a video and convert that to a gif"): his iPhone is in Low Power
  // Mode, which blocks every <video> autoplay. The Seedance loops are now animated WebP images (the GIF format, smaller and full colour),
  // which iOS animates even in Low Power Mode. Reduced motion = the still jpg.
  const h50loop = (n, cls, alt) => `<div class="h50vw${cls}"><img class="h50v" src="/lumi_scenes/lumi_${n}_loop.${h50rm ? "jpg" : "webp"}?v=g54" alt="${alt}"></div>`;
  // KARATE105 [M5 Max MBP] 2026-11-01 (Nick TG 9:52 AM: "Let's do it only for the dark version and let's do the theme of the karate thing. It looks too realistic and it needs to be more lightly themed against the dark background. Leave the lighter theme as is right now"): the DARK scene of every state is karate Lumi
  // (flat cel-shaded, white gi, electric blue belt, on a navy edit timeline, Seedance 2.0 loops in /lumi_karate/). Light scenes are exactly as before.
  const k105 = (n, alt) => `<div class="h50vw h50dk k105v"><img class="h50v" loading="lazy" src="/lumi_karate/${n}${h50rm ? ".jpg" : "_loop.webp"}?v=105" alt="${alt}"></div>`;
  const art = st === "edit" ? h50loop("laptop", " h50lt", "Lumi typing at the laptop") + k105("chop", "Lumi karate chopping a clip on the timeline")
    : st === "ask" ? `<img class="h50lt" src="/lumi/ask.webp" alt="">` + `<div class="h50vw h50dk k105v"><img class="h50v" loading="lazy" src="/lumi_karate/stance.jpg?v=105" alt="Lumi waiting on you"></div>` : st === "ready" ? `<picture class="h50lt"><source srcset="/lumi_scenes/lumi_celebrate_confetti${h50rm ? "" : "_loop"}.webp${h50rm ? "" : "?v=59"}" type="image/webp"><img src="/lumi_scenes/lumi_celebrate_confetti.png" alt="Lumi celebrating, your reel is ready"></picture>` + k105("land", "Lumi landing the finished reel")
    : h50loop("beach_day", " h50lt", "Lumi relaxing at the beach") + k105("flip", "Lumi backflipping over the playhead");
  // GIF54: no video fallback needed, the header art is an animated image.
  // LUMIANIM59 [M5 Max MBP] 2026-10-30 (Nick TG: the confetti Lumi was a still): ready = a Seedance 2.0 cheering loop from the same art, keyed to a
  // transparent animated WebP (reads on light and dark, plays in Low Power Mode). Reduced motion keeps the still.
  const pill = S.guest ? ["on", "Your first reel is free"] : { edit: ["on", "Lumi is editing"], ask: ["you", "Lumi needs you"], ready: ["on", "Ready for your review"], beach: ["", "All caught up"] }[st];
  window.__h50classic = art;   // LOOKS183B: the six new looks show their own Lumi loop instead (lk183Html), swapped live on a look change
  window.__h50st = st;   // LKEDIT200: lk183Html shows the look's editing Lumi while a reel is in the edit (st "edit")
  let h =`<div class="hero dhero h50 k105 st-${st}"><div class="h50art" data-lk="${esc(document.documentElement.dataset.look || "classic")}">${lk183Html() || art}</div><div class="h50txt"><span class="h50hi">Hi${nm ? "," : ""}</span>
    <h1 class="h50name${(nm || "there").length > 8 ? " lng" : ""}" data-nm="${esc(nm || "there")}">${esc(nm || "there")}</h1><div class="h50say say">${esc(say)}</div>
    <span class="dpill ${pill[0]}">${pill[1]}</span></div></div>`;
  if (S.guest) return g54Home(h);   // GUEST54: no reels, no stats, no fake data
  h += nfHomeCards();   // newreel 2026-10-03: a reel left mid-way, or one just sent
  // TILES183 [M5 Max MBP] 2026-11-06: the tiles are filters for the reel grid below (S.rfilt), never a jump into one reel
  if (!RF183[S.rfilt]) S.rfilt = null;
  const rfN = { edit: inEdit, review, done: doneN }, rfT = k => ` data-go="${k}" role="button" tabindex="0" aria-pressed="${S.rfilt === k}"`;
  h += `<div class="dstats"><div class="dstat${S.rfilt === "edit" ? " on" : ""}"${rfT("edit")}><b>${inEdit}</b><span>In the edit</span></div><div class="dstat ${review ? "hot" : ""}${S.rfilt === "review" ? " on" : ""}"${rfT("review")}><b>${review}</b><span>Ready for review</span></div><div class="dstat${S.rfilt === "done" ? " on" : ""}"${rfT("done")}><b>${doneN}</b><span>Approved</span></div></div>`;
  // FOLD196 [M5 Max MBP] 2026-11-11 (Nick TG 24445: "I need to be able to collapse these reels. I don't want an endless scroll. The Running Now section needs to be
  // collapsible and it needs to show how many are running, like a number next to Running Now"). Both home lists fold from their title, show a count, and open only
  // a first few until asked for all. The choice is kept per viewer (store "fold196").
  const f196 = fold196Get(), f196runAll = !!f196.runall || running.length <= F196_RUN, f196reelAll = !!f196.reelsall || reels.length <= F196_REEL;
  // FOLD196B [M5 Max MBP] 2026-11-11 (Nick TG 24457: "When I click Hide it should still show the top three. Then when I click Show Reels it should show all 200 of
  // them ... but I shouldn't be able to hide them completely"). Two states only: the top three, or all of them. Never nothing.
  const f196rT = running.length > F196_RUN, f196eT = reels.length > F196_REEL;
  h += `<div class="dsec${f196rT ? " fold196" : ""}" id="runsec"${f196rT ? ` data-fold="runall" data-n="${running.length}" role="button" tabindex="0" aria-expanded="${f196runAll}" aria-controls="runbody196"` : ""}><span class="spk2" aria-hidden="true">✦</span><h2>Running now</h2><b class="cnt196" aria-label="${running.length} running">${running.length}</b>${f196rT ? `<i class="fd196">${f196runAll ? "Hide" : "Show all " + running.length}</i>` : ""}</div>`;
  h += `<div class="fb196${f196runAll ? "" : " lim196"}" id="runbody196">`;
  if (running.length) running.forEach(r => { h += runCard(r); });   // audit2 2026-09-28: brief-needed reels get the big card too
  // SILENTIDLE194 [M5 Max MBP] 2026-11-10 15:01 PST (Nick TG 24115 "In Silent Power can you get rid of Clean Girl?"): the idle card showed the beach Lumi (robe, iced
  // drink) inside every look. In a skinned look the card shows that look's own Lumi still (lumi_looks/<look>.jpg), so Silent Power stays Silent Power.
  else { const _lk = document.documentElement.dataset.look || "", _own = /^(dojo|clay|cleangirl|strawberry|matcha|golden|silentpower|everybody)$/.test(_lk) ? `/lumi_looks/${_lk}.jpg?v=${(typeof LK183V !== "undefined" && LK183V[_lk]) || "183b"}` : "";
  h += `<div class="card dempty"><span class="dlw dlt"><img src="${_own || "/lumi_scenes/lumi_beach_day_card.webp?v=59"}" alt="${_own ? "Lumi" : "Lumi relaxing at the beach"}"${_own ? ' style="object-fit:cover"' : ""}></span><span class="dlw ddk k105e"><img loading="lazy" src="${_own || "/lumi_karate/flip_card.webp?v=105"}" alt="${_own ? "Lumi" : "Lumi backflipping"}"${_own ? ' style="object-fit:cover"' : ""}></span><span>${reels.length ? "Nothing being edited right now." : "Nothing yet. Your first reel shows up here the moment you send it."}</span></div>`; }   // LUMIANIM59 [M5 Max MBP] 2026-10-30: animated beach Lumi (day/night animated WebP), was the still idle wait.webp
  h += "</div>";   // FOLD196: end of the Running now body
  h += designCard(d);
  h += carSection(d);   // cherylcar 2026-10-18 [M5 Max MBP]
  if (reels.length) h += `<div class="dsec carsec${f196eT ? " fold196" : ""}" id="reelsec"${f196eT ? ` data-fold="reelsall" data-n="${reels.length}" role="button" tabindex="0" aria-expanded="${f196reelAll}" aria-controls="reelgrid"` : ""}><span class="spk2" aria-hidden="true">✦</span><h2>Your reels</h2><b class="cnt196" aria-label="${reels.length} reels">${reels.length}</b>${f196eT ? `<i class="fd196">${f196reelAll ? "Hide" : "Show all " + reels.length}</i>` : ""}</div>`;   // TITLES193 [M5 Max MBP] 2026-11-10 (Nick TG 24007): the reel grid gets its own title like the sections above it
  h += cat198Html(S.rfilt, rfN, reels.length);   // CAT198 [M5 Max MBP] 2026-11-12 (Nick TG 24785): the reel list sorts by category: Editing, Review, Approved
  h += `<div class="chips rfbar" id="rfbar"${S.rfilt ? "" : " hidden"}>${rfBarHtml(S.rfilt, rfN, reels.length)}</div>`;   // TILES183
  h += `<div class="grid reelgrid${f196reelAll ? "" : " lim196"}" id="reelgrid">`;   // FOLD196
  let f196i = 0;
  for (const r of reels) {
    const v = r.versions[r.versions.length - 1];
    const nv = isNewVer(r);
    const rk = rfKey(r);   // TILES183
    h += `<a class="poster${f196i++ >= F196_REEL ? " rx196" : ""}${nv ? " newver" : ""}${isLand(v) ? " land" : ""}${S.rfilt && rk !== S.rfilt ? " rfout" : ""}" data-id="${esc(r.id)}" data-rf="${rk}" role="button"${nv ? ' aria-label="New version ready to review"' : ""}>
      ${!v && r.live_preview ? `<video class="lpv" data-id="${esc(r.id)}" src="${esc(r.live_preview.url)}" muted loop autoplay playsinline style="width:100%;height:100%;object-fit:cover"></video><span class="lplab">Live preview</span>` : ""}${!v && r.live_preview ? "" : `${v && v.poster ? `<img src="${esc(v.poster)}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'num',textContent:'${no3(r.n)}'}))">` : r.preview && r.preview.poster ? `<img src="${esc(r.preview.poster)}" alt="" style="filter:saturate(.9)"><span class="lplab">First look</span>` : r.run && r.run.poster ? `<img src="${esc(r.run.poster)}" alt="">` : posterOf(r) ? `<img src="${esc(posterOf(r))}" alt="" onerror="this.remove()">` : `<div class="num ph"><img src="/lumi/wait.webp" alt=""><span>${esc(r.title)}</span></div>`}`}
      <div class="shade"></div>${payStamp(r)}<span class="ribbon">${nv ? `<span class="badge nv">New version</span>` : (r.progress && r.progress.needs_you || r.status === "waiting") && r.status !== "done" && r.status !== "review" ? `<span class="badge you">${r.status === "waiting" ? "Waiting on you" : "Needs you"}</span>` : `<span class="badge ${r.status}${r.status === "editing" && r.versions.length ? " revk" : ""}">${r.status === "review" ? "V" + Math.max(1, r.versions.length) + " \u00b7 Review" : r.status === "editing" && r.versions.length ? "V" + (r.versions.length + 1) + " \u00b7 Editing" : r.status === "done" && r.versions.length ? "V" + r.versions.length + " \u00b7 Approved" : (ST[r.status] || ST.editing)[0]}</span>`}</span>
      <div class="txt"><div class="m">${v || r.live_preview || (r.preview && r.preview.video) ? '<span class="pl" aria-hidden="true"></span>' : ""}${v ? `<span class="chip">v${v.v}</span>` : ""}${r.look ? `<span class="chip">${esc(r.look)}</span>` : ""}</div>${needsBrief(r) ? `<button class="btn sm primary tobrief" data-reel="${esc(r.id)}" style="margin-top:8px">${briefLbl()}</button>` : r.progress ? `<div class="chip" style="margin-top:8px;background:rgba(0,0,0,.35)">${esc(r.progress.stage)}${etaOf(r.progress) ? ` · about ${etaOf(r.progress)} min` : ""}</div>` : ""}</div>${r.progress && r.progress.pct && !needsBrief(r) ? `<div class="bar${pcls(r.progress)}"><i style="width:${r.progress.pct}%"></i></div>` : isRunning(r) && !needsBrief(r) && !(r.progress && r.progress.needs_you) ? `<div class="bar ind${pcls(r.progress)}"><i></i></div>` : ""}<div class="pt"><b title="${esc(reelLabel(r))}">${esc(gridLabel(r))}</b></div></a>`;
  }
  if (S.rfilt && !rfN[S.rfilt]) h += `<div class="rfempty">No reels here right now.</div>`;   // TILES183
  h += "</div>";
  h += `<div class="startcard" id="startcard"><div class="mini">${pick.map(l => tile(l, { nocap: true })).join("")}</div><div style="flex:1"><h3>Start your next reel</h3><p>Choose the look in motion, tell us the rest in one go.</p></div></div>`;
  const browse = styleOrder(looks().filter(l => l.role === "look" && l.family === "newest" && !l.variant_of && l.section !== "Female" && l.code !== "F75")).slice(0, 12);   // FEMALE57 [M5 Max MBP] 2026-10-29: Nick, the scrapbook pieces never lead the home row (they live in Styles, Female section)
  if (browse.length) h += `<div class="card stylecard"><div class="row sch"><span class="spk2" aria-hidden="true">✦</span><h2>Caption styles</h2><a href="#" id="alllooks" class="chev" aria-label="See all">›</a></div>${strip(browse, { act: "open" })}</div>`;
  $("#main").innerHTML = h; armTiles(); bindTiles(); bindAdd();
  { const nc = $("#nfcont"); if (nc) nc.onclick = () => { const dr = S.draft || {}; dr.popped = false; store("draft", dr); go2new(nfResumeStep(dr), { __nfok: 1 }); }; }   // newreel 2026-10-03
  { const rsb = $("#nfresend"); if (rsb) rsb.onclick = async () => { const ns = fetchStore("nfsent", null) || {}; rsb.disabled = true; rsb.textContent = "Sending...";
      const ok = await send({ kind: "brief", text: ns.text || "", ...(ns.reel ? { reel: ns.reel } : {}) }); if (ok) { ns.at = Date.now(); store("nfsent", ns); toast("Sent again. Starting your edit."); } render(); }; }
  // TILES183 [M5 Max MBP] 2026-11-06 (Nick TG): tapping a tile filters the grid to just those reels (tap it again, the chip's x or All = every reel).
  // Was: Ready for review / Approved opened the first matching reel, In the edit scrolled to Running now.
  try { cat198Bind(rfN, reels.length); } catch {}   // CAT198
  document.querySelectorAll(".dstat[data-go]").forEach(el => { el.onclick = () => rfSet(S.rfilt === el.dataset.go ? null : el.dataset.go, rfN, reels.length);
    el.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); el.click(); } }; });
  rfBindBar(rfN, reels.length);
  fold196Bind();
  const dc = $("#dcard"); if (dc) dc.onclick = () => { S.stab = "mine"; go("looks"); };   // STYLES50: Your personal style
  const al = $("#alllooks"); if (al) al.onclick = e => { e.preventDefault(); S.stab = "captions"; go("looks"); };   // QALOOKS183 [M5 Max MBP] 2026-11-06 11:37 PM PST: the Caption styles chevron opens the Captions tab (it landed on Templates or Your style)
  // [M5 Max MBP] 2026-10-03 appfix A29: the whole "Caption styles" header row opens the library (only the 16x30 px chevron did)
  { const sh = document.querySelector(".stylecard .sch"); if (sh) { sh.style.cursor = "pointer"; sh.setAttribute("role", "link"); sh.onclick = e => { if (e.target.closest("#alllooks")) return; e.preventDefault(); S.stab = "captions"; go("looks"); }; } }
  document.querySelectorAll(".poster").forEach(el => el.onclick = () => { try { window.__scrollSave && window.__scrollSave(); } catch {} S.reel = el.dataset.id; S.ver = null; setPageY(0); render(); });   // SCROLLBACK200: remember the list spot
  { const nb = $("#c193new"); if (nb) nb.onclick = () => carNewSheet(); }   // CAROUSEL193 [M5 Max MBP] 2026-11-10: New carousel
  document.querySelectorAll("[data-car]").forEach(el => { el.onclick = () => { S.reel = null; go("car", { car: el.dataset.car, carSlide: null }); }; el.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); el.click(); } }; });   // cherylcar 2026-10-18 [M5 Max MBP]
  document.querySelectorAll(".runc[data-run]").forEach(el => el.addEventListener("click", e => { if (e.target.closest("button")) return; S.reel = el.dataset.run; S.ver = null; setPageY(0); render(); }));
  $("#startcard").onclick = e => { if (e.target.closest(".mv")) return; go2new(nfResumeStep()); };   // [M5 Max MBP] 2026-09-29 sweep: a mini look tile opens its own sheet, the card must not close it
}
/* LOOKS183B [M5 Max MBP] 2026-11-06 10:58 PM PST (Nick TG 23477: "create videos of Lumi ... so they run as gifs at the top ... make sure no style is
   loading on top of another"). One hero loop per new look in /lumi_looks/ (Seedance 2.0, animated WebP like GIF54 so it moves in Low Power Mode,
   jpg still for reduced motion). Only the active look's image is ever in the DOM: a look change replaces the hero art, it never stacks. */
const LK183 = { dojo: "Lumi doing a karate kata in front of the red sun", clay: "Lumi at a pottery wheel", cleangirl: "Lumi in a robe laughing and raising an iced latte",
  strawberry: "Lumi hopping with a basket of strawberries", matcha: "Lumi in a knit sweater with a matcha", golden: "Lumi looking out at the sunset",
  silentpower: "Lumi in a navy coat and sunglasses", everybody: "Lumi in a pinstripe suit and cap", classic: "Lumi sitting with a laptop", glass: "Lumi leaning, arms crossed" };   // MATCHA184   // LOOKS183C
function lk183Html() { const k = document.documentElement.dataset.look; if (!LK183[k]) return "";
  const rm = (() => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; } })();
  // CLEANGIRL183 [M5 Max MBP] 2026-11-06 11:55 PM PST (Nick TG 23489 + 23492): Clean Girl Lumi happier, Golden Hour Lumi holds a coconut drink, not a camera.
  // Same filenames, so those two looks get a new ?v= and nobody keeps the old cached loop.
  const v = LK183V[k] || "183b";
  // LOOPS194 [M5 Max MBP] %s (Nick TG 24115 "The strawberry should be moving and animated. Same with matcha ... Golden Hours: same thing. Classic: same thing"):
  // the drawn Lumi of these looks is a Seedance 2.0 animation of the same drawing (alpha WebP, lumi_looks/<look>_drawn_loop.webp); reduced motion keeps the still.
  const LK194 = ["strawberry", "matcha", "golden", "classic"];
  // LKEDIT200 [M5 Max MBP] 2026-11-16 (Nick TG 25125 + 24473): while a reel is in the edit (home state "edit", same signal as the "Lumi is editing" pill), a look in
  // LKEDIT shows its Lumi at the timeline wall (lumi_looks/<look>_edit_loop.webp, same 720x540 frame as <look>_loop.webp); reduced motion = <look>_edit.jpg.
  // Add a look by dropping its two files and its name in LKEDIT.
  if (LKEDIT.includes(k) && window.__h50st === "edit") return `<div class="h50vw lk183v"><img class="h50v" src="/lumi_looks/${k}_edit${rm ? ".jpg" : "_loop.webp"}?v=200" alt="Lumi editing your reel on the timeline" decoding="async" onerror="this.onerror=null;this.src='/lumi_looks/${k}.jpg?v=${v}'"></div>`;
  if (LK194.includes(k) && !rm) return `<div class="h50vw lk183v"><img class="h50v" src="/lumi_looks/${k}_drawn_loop.webp?v=194b" alt="${LK183[k]}" decoding="async" onerror="this.onerror=null;this.src='/lumi_looks/${k}_drawn.webp?v=184'"></div>`;
  return `<div class="h50vw lk183v"><img class="h50v" src="${LK184.includes(k) ? `/lumi_looks/${k}_drawn.webp?v=184` : `/lumi_looks/${k}${rm ? "" : "_loop"}.${rm ? "jpg" : "webp"}?v=${v}`}" alt="${LK183[k]}" decoding="async" onerror="this.onerror=null;this.src='/lumi_looks/${k}.jpg?v=${v}'"></div>`; }
const LK184 = ["classic", "glass", "clay", "golden", "strawberry", "matcha"];   // MATCHA184: these looks show a drawn Lumi still
const LKEDIT = ["everybody"];   // LKEDIT200: looks that have an editing loop (lumi_looks/<look>_edit_loop.webp + <look>_edit.jpg)
const LK183V = { cleangirl: "cg183", golden: "cg183", silentpower: "183c", everybody: "183c" };
function lk183Swap() { const a = document.querySelector(".hero.h50 .h50art"), k = document.documentElement.dataset.look || "classic"; if (!a || a.dataset.lk === k) return;
  a.innerHTML = lk183Html() || window.__h50classic || ""; a.dataset.lk = k; }
/* TILES183 [M5 Max MBP] 2026-11-06: the home stat tiles filter the reel grid. Same rules as the tile counts in renderHome, so a tile's
   number always equals the reels it shows: edit = editing/received with a brief, review = delivered and not approved, done = approved. */
const RF183 = { edit: "In the edit", review: "Ready for review", done: "Approved" };
function rfKey(r) { return r.status === "done" ? "done" : r.status === "review" ? "review" : (r.status === "editing" || r.status === "received") && !needsBrief(r) ? "edit" : ""; }
function rfBarHtml(f, n, all) { return f ? `<button type="button" data-rf="all">All \u00b7 ${all}</button><button type="button" class="on" data-rf="off" aria-label="Show all reels">${RF183[f]} \u00b7 ${n[f]}<span class="rfx" aria-hidden="true">\u00d7</span></button>` : ""; }
/* CAT198 [M5 Max MBP] 2026-11-12 (Nick TG 24785: "When I go to your reels I should be able to organize them by category: editing, review, and approved").
   An always visible row of chips under "Your reels": All, Editing, Review, Approved, each with its count. A chip uses the same filter as the
   stat tiles (S.rfilt / rfSet), so tiles and chips always agree; tapping the active chip again shows all. */
function cat198Html(f, n, all) {
  const c = (k, label, num) => `<button type="button" class="c198${(f || "all") === k ? " on" : ""}" data-c198="${k}" aria-pressed="${(f || "all") === k}">${label} \u00b7 ${num}</button>`;
  return `<div class="chips cat198" id="cat198">${c("all", "All", all)}${c("edit", "Editing", n.edit || 0)}${c("review", "Review", n.review || 0)}${c("done", "Approved", n.done || 0)}</div>`;
}
function cat198Bind(n, all) {
  document.querySelectorAll("#cat198 [data-c198]").forEach(b => b.onclick = () => { const k = b.dataset.c198; rfSet(k === "all" || S.rfilt === k ? null : k, n, all); });
}
function cat198Sync() { document.querySelectorAll("#cat198 [data-c198]").forEach(b => { const on = b.dataset.c198 === (S.rfilt || "all"); b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); }); }
function rfBindBar(n, all) { document.querySelectorAll("#rfbar [data-rf]").forEach(b => b.onclick = () => rfSet(null, n, all)); }
/* FOLD196 [M5 Max MBP] 2026-11-11 (Nick TG 24445): the home lists fold. Tap "Running now" or "Your reels" to hide or show the whole list; the number beside the
   title is how many there are. A long list opens its first few with a "Show all" button under it. A filter tile still shows every matching reel. */
const F196_RUN = 3, F196_REEL = 8;   // FOLD196B: the top three running reels and the top eight reels always stay on screen (Nick TG 24457 / 24461)
function fold196Get() { try { const v = fetchStore("fold196", {}); return v && typeof v === "object" ? v : {}; } catch { return {}; } }
function fold196Set(k, on) { const v = fold196Get(); if (on) v[k] = 1; else delete v[k]; try { store("fold196", v); } catch {} }
function fold196Bind() {   // FOLD196B: the title switches between the top three and all of them
  document.querySelectorAll(".dsec.fold196[data-fold]").forEach(hd => {
    const tog = () => { const k = hd.dataset.fold, body = k === "runall" ? $("#runbody196") : $("#reelgrid"); if (!body) return;
      const all = body.classList.contains("lim196"); body.classList.toggle("lim196", !all); fold196Set(k, all); hd.setAttribute("aria-expanded", all ? "true" : "false");
      const l = hd.querySelector(".fd196"); if (l) l.textContent = all ? "Hide" : "Show all " + hd.dataset.n;
      if (!all) { try { hd.scrollIntoView({ block: "nearest" }); } catch {} } };
    hd.onclick = tog; hd.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tog(); } }; });
}
function rfSet(f, n, all) {
  S.rfilt = f || null;
  const rm = (() => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; } })();
  document.querySelectorAll(".dstat[data-go]").forEach(el => { const on = el.dataset.go === S.rfilt; el.classList.toggle("on", on); el.setAttribute("aria-pressed", on); });
  const g = $("#reelgrid"), bar = $("#rfbar"); if (!g || !bar) return;
  g.querySelectorAll(".poster[data-rf]").forEach(p => p.classList.toggle("rfout", !!S.rfilt && p.dataset.rf !== S.rfilt));
  { const e0 = g.querySelector(".rfempty"); if (e0) e0.remove(); if (S.rfilt && !n[S.rfilt]) g.insertAdjacentHTML("beforeend", `<div class="rfempty">No reels here right now.</div>`); }
  bar.innerHTML = rfBarHtml(S.rfilt, n, all); bar.hidden = !S.rfilt; rfBindBar(n, all);
  try { cat198Sync(); } catch {}   // CAT198
  if (!rm) { for (const el of [g, bar]) { el.classList.remove("rfanim"); void el.offsetWidth; el.classList.add("rfanim"); }
    let i = 0; g.querySelectorAll(".poster:not(.rfout)").forEach(p => { p.style.animationDelay = Math.min(i++, 12) * 28 + "ms"; }); }
  const tgt = S.rfilt ? bar : document.querySelector(".dstats");
  if (tgt) { const m = chatScroller(), hd = document.querySelector("header.top"), off = hd ? Math.max(0, hd.getBoundingClientRect().bottom) : 0;   // the header floats over #main
    setPageY(Math.max(0, (m ? m.scrollTop : scrollY) + tgt.getBoundingClientRect().top - (m ? m.getBoundingClientRect().top : 0) - off - 10), !rm); }
}
const reelById = id => (S.data.reels || []).find(r => r.id === id);
// [M5 Max MBP] 2026-09-29 sweep50: ONE rule for "being edited now" (home Running now, the reel page card, the Chat card)
function isRunning(r) { if (!r || r.status === "done" || r.status === "cancelled") return false; if (r.status === "review") return !!(r.run && r.run.kind);
  return !!(r.run || r.progress || r.status === "editing" || r.status === "received"); }
function showsProgress(r) { return !!(r && r.progress && (r.status !== "review" || (r.run && r.run.kind))); }
// revisions used on a reel: the best of r.revision, run.rev and the delivered versions (app_push can send revision 0 after revisions)
function revUsedOf(r) { return Math.max(Number(r.revision) || 0, Number(r.run && r.run.rev) || 0, ((r.versions || []).length || 1) - 1, 0); }

/* ---------- the style browser ---------- */
function filtered(fam) {
  const seen = new Set();
  return looks().filter(l => !l.variant_of && (fam === "all" ? l.role === "look" : l.family === fam) && (S.book === "all" || l.book === "any" || l.book === S.book))
    .filter(l => { const k = l.name.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });   // F17 + M14 are one Scoreboard to a client
}
/* [M5 Max MBP] 2026-10-07 20:5x Nick TG 20:53: "Leave the new ones up there for a whole week, even after the shimmer turns off. Under that ...
   I would love some other ones to pop up there so they can always see new ones." Styles order, per section, all from looks.json "added":
   (1) looks added in the last 7 days, newest first (the shimmer still stops after 3 days, isFresh); (2) the rest in a shuffle that changes
   every day, seeded by the date and this account (different clients see different ones), looks this client has not opened or used first. */
const TOP_MS = 7 * 86400000;
function dayKey(d = new Date()) { return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
function hash32(str) { let h = 2166136261 >>> 0; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } h ^= h >>> 15; h = Math.imul(h, 2246822507) >>> 0; h ^= h >>> 13; return h >>> 0; }
function lookSeenSet() { const s0 = new Set(Object.keys(fetchStore("lookseen", {}) || {})); try { for (const r of (S.data && S.data.reels) || []) if (r.look) s0.add(String(r.look)); } catch {} return s0; }
function styleOrder(list) {
  const n = Date.now(), dk = dayKey(), seed = dk + "|" + (typeof K === "string" ? K.slice(0, 12) : "");
  if (!S._seenSnap || S._seenSnap.dk !== dk) S._seenSnap = { dk, set: lookSeenSet() };   // one snapshot per day: opening a look never reshuffles the page under the finger
  const seen = S._seenSnap.set;
  const isTop = l => { const t = addedAt(l); return t > 0 && n >= t && n - t < TOP_MS; };
  const top = list.filter(isTop).sort((a, b) => addedAt(b) - addedAt(a));
  const rest = list.filter(l => !isTop(l)).map(l => [seen.has(l.code) ? 1 : 0, hash32(seed + "|" + l.code), l]).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map(x => x[2]);
  return [...top, ...rest];
}
/* [M5 Max MBP] 2026-10-07 21:0x Nick TG 20:58: "they should say Streamer Style, Open House, or Scoreboard, and then, in parentheses next to it
   ... the M29 or F8", matching the caption styles PDF in the welcome email. dispCode = the public code (looks.json "ask", which build_looks.py
   takes from the styles page's own label). Twins (F17 + M14 Scoreboard) show the code for the For her / For him filter, both under Everyone. */
function dispCode(l) {
  if (!l || !(l.role === "look" || l.role === "motion")) return "";
  const tw = l.role === "look" ? looks().filter(x => x.role === "look" && !x.variant_of && x.name.toLowerCase() === l.name.toLowerCase()) : [l];
  if (tw.length > 1) { const w = S.book === "male" ? "M" : S.book === "female" ? "F" : ""; const m = w && tw.find(x => String(x.ask || x.code).startsWith(w)); return m ? (m.ask || m.code) : tw.map(x => x.ask || x.code).join(" / "); }
  return l.ask || l.code;
}
const nameCode = l => { const c = dispCode(l); return c ? l.name + " (" + c + ")" : l.name; };
function askCode(l) { const twins = looks().filter(x => x.role === "look" && x.name.toLowerCase() === l.name.toLowerCase()); return twins.length > 1 ? twins.map(x => x.ask).join(" / ") : l.ask; }
/* ---------- STYLES50 [M5 Max MBP] 2026-10-29 18:2x PDT. Nick (TG 18:1x): "Instead of 'All Looks' put: Templates (fully structured looks),
   Captions, Motion graphics, Color ... captions animated against the app UI, click it and see them on actual videos ... the same with motion
   graphics ... 'For Her' and 'For Him' in the softer, bolder, glass look ... a new style = a little notification icon on that button, once you
   open it it is not new anymore ... a button that says 'Your personal style' that shows what they have used before."
   Tabs: S.stab = templates | captions | motion | color | mine. Templates = full looks without a plain-background preview (they need a person:
   F38-F44, carousel, founder, sauce, halo...) + video formats with an example. Captions = every other caption look + glass, vines, hooks.
   Motion graphics = MG*. Color = the engine's named grades (color_options.LOOKS) as stills graded from one approved ad frame (before/after).
   New dots: a tab shows a dot while it holds a look whose looks.json "added" is newer than the last time THIS PHONE opened that tab
   (localStorage via store(), 14 days max). The bottom-bar Styles button carries the same dot. ---------- */
// APPCOLOR178 [M5 Max MBP] 2026-11-04 19:00 PST (Nick TG Nov 4 "get rid of the color section on the client-facing app. I don't want that there right now"): one flag hides every client color pick
//   (Styles > Color tab, personal style Color row + its grade carry-over, brief Color line/summary, the reel brief Color row). true = all of it comes back. Engine color logic untouched.
//   SHOW_COLOR itself is declared at the top of this script (so g54Home and boot code can read it early).
const STAB = [["templates", "Templates", '<rect x="3" y="3" width="7" height="9" rx="2"/><rect x="14" y="3" width="7" height="5" rx="2"/><rect x="14" y="12" width="7" height="9" rx="2"/><rect x="3" y="16" width="7" height="5" rx="2"/>'],
  ["captions", "Captions", '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M7 11h4M13 11h4M7 15h7"/>'],
  ["motion", "Motion graphics", '<path d="M4 17l5-6 4 4 7-9"/><circle cx="20" cy="6" r="1.6"/>'],
  ["vfx", "Visual effects", '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>'],   // FXLOOKS194 [M5 Max MBP] 2026-11-11
  ["color", "Color", '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17M12 12l6-6"/>']].filter(t => SHOW_COLOR || t[0] !== "color");
const STAB_NEW_MS = 14 * 86400000;
const UI50 = new Set("F1,F11a,F11b,F13,F15,F16,F17,F18,F2,F20,F21,F22,F23,F24,F25,F26,F27,F28,F29,F3,F30,F31,F33,F34,F4,F45,F46,F47,F48,F49,F5,F6,F7,F8,F9,G_blue,G_emerald,G_gold,G_pink,G_red,G_violet,HK1,HK2,HK3,HK4,M1,M13,M14,M16,M2,M20,M21,M22,M23,M24,M25,M26,M3,M4,M5,M6,M7,M8,MG01,MG02,MG03,MG04,MG05,MG06,MG07,MG09,MG10,MG11,MG12,MG16,MG18,MG19,MG20,MG21,MG46,MG47,MG48,MG49,V1,V2".split(","));
// the caption preview on the app UI: <CODE>_ui.mp4 next to the solid one (big, centered, feathered shadow); a solid already on lilac is used as is
// STYLES51 [M5 Max MBP] 2026-10-29 19:5x PDT (Nick TG: "make it specific for the app", MGs "a SQUARE card"): every caption, hook, glass, vine and
// motion graphic is drawn natively by its own engine onto the app's canvas, 720x720, no cut-outs (scripts/native_previews.py) -> <CODE>_app.mp4.
// MGLAYOUT107 [M5 Max MBP] 2026-11-01 (Nick TG 11:29 AM "why are all these vertical and why are they against the UI of the app?"): MG69..MG77 + MG79
//   back in the original tile structure: picture graphics as APP51 squares (<CODE>_app, real footage crop like MG45/MG50), MG74 as an ALPHA52 transparent loop.
const APP51 = new Set("F1,F11a,F11b,F13,F15,F16,F17,F18,F2,F20,F21,F22,F23,F24,F25,F26,F27,F28,F29,F3,F30,F31,F33,F34,F4,F45,F46,F47,F48,F49,F5,F50,F51,F52,F53,F54,F55,F56,F57,F58,F59,F6,F60,F61,F62,F63,F64,F7,F8,F9,G_blue,G_emerald,G_gold,G_pink,G_red,G_violet,HK1,HK10,HK11,HK12,HK13,HK14,HK15,HK16,HK2,HK3,HK4,HK5,HK6,HK7,HK8,HK9,M1,M13,M14,M16,M2,M20,M21,M22,M23,M24,M25,M26,M3,M4,M5,M6,M7,M8,MG01,MG02,MG03,MG04,MG05,MG06,MG07,MG08,MG09,MG10,MG11,MG12,MG14,MG15,MG16,MG17,MG18,MG19,MG20,MG21,MG45,MG46,MG47,MG48,MG49,MG50,MG51,MG52,MG53,MG54,MG55,MG56,MG57,MG58,MG59,MG60,MG61,MG62,V1,V2,MG69,MG70,MG71,MG72,MG73,MG75,MG76,MG77,MG79,MG80,MG81,MG82".split(","));
const DEMO_BAD51 = new Set(["M6", "V1", "V2"]);   // their footage demo does not show that look's captions (audited 2026-10-29): never shown
// F80ALPHA [M5 Max MBP] 2026-10-31 15:10 PDT (Nick TG: "If you're in the caption sections, you would be clicking on it and then scrolling over and
//   then you see the girl talking about matcha. If you're just in the captions you should just be seeing the captions against the UI background"):
//   the one-slide F80 special case (ONE80) is gone. F80 is a transparent tile like HK18 (ALPHA52 + INKL52, F80_t.* by f80_alpha_previews.py),
//   the sheet is slide 1 the transparent captions, slide 2 the matcha example (F80.mp4).
const HIDE_MG51 = new Set(["MG13"]);              // Whip Transition is a transition, not a motion graphic (Nick); the engine keeps it
// STYLES52 [M5 Max MBP] 2026-10-29 21:xx PDT (Nick TG: "I don't want them to have a background. I want the background to be the background UI of
// the app. If you can't see it well then it would just be a drop shadow."): caption, hook, glass, vine and motion graphic previews are TRANSPARENT
// loops drawn natively by their engines (scripts/alpha_previews.py): <CODE>_t.mov (HEVC with alpha, Safari / every iPhone browser), _t.webm (VP9
// alpha, Chrome / Android), _t.png transparent poster. The app page shows through; a CSS drop shadow keeps light words readable on light UI.
const ALPHA52 = new Set("F80,HK17,HK18,F1,F11a,F11b,F13,F15,F16,F17,F18,F2,F20,F21,F22,F23,F24,F25,F26,F27,F28,F29,F3,F30,F31,F33,F34,F4,F45,F46,F47,F48,F49,F5,F50,F51,F52,F53,F54,F55,F56,F57,F58,F59,F6,F60,F61,F62,F63,F64,F7,F8,F9,G_blue,G_emerald,G_gold,G_pink,G_red,G_violet,HK1,HK10,HK11,HK12,HK13,HK14,HK15,HK16,HK2,HK3,HK4,HK5,HK6,HK7,HK8,HK9,M1,M13,M14,M16,M2,M20,M21,M22,M23,M24,M25,M26,M3,M4,M5,M6,M7,M8,MG01,MG02,MG03,MG05,MG06,MG07,MG09,MG10,MG11,MG12,MG16,MG18,MG19,MG20,MG21,MG46,MG47,MG48,MG49,MG51,MG52,MG53,MG54,MG55,MG56,MG57,MG58,MG59,MG60,MG61,MG62,V1,V2,MG74".split(","));
const INKL52 = new Set("F80,HK17,HK18,F1,F11a,F11b,F13,F15,F16,F18,F2,F20,F21,F22,F23,F24,F25,F26,F27,F28,F29,F3,F30,F31,F33,F34,F4,F45,F47,F48,F49,F50,F51,F53,F54,F55,F56,F57,F58,F59,F6,F60,F61,F62,F63,F64,F7,F8,F9,G_blue,G_emerald,G_gold,G_pink,G_red,G_violet,HK1,HK10,HK11,HK12,HK13,HK14,HK15,HK16,HK2,HK3,HK4,HK5,HK7,HK8,HK9,M1,M13,M16,M2,M20,M21,M22,M23,M24,M25,M3,M4,M5,M6,M8,MG01,MG02,MG03,MG05,MG06,MG07,MG10,MG11,MG12,MG16,MG18,MG19,MG20,MG21,MG47,MG48,MG51,MG52,MG53,MG55,MG57,MG58,MG59,MG60,MG61,MG62,V1,V2".split(","));      // light (white) ink: a stronger soft shadow on the light app, a faint one in dark mode
const MOV52 = (() => { try { return /^Apple/.test(navigator.vendor || ""); } catch { return false; } })();   // WebKit (Safari, every iPhone browser): HEVC alpha; Chromium/Firefox: VP9 alpha
// FEMALE56 [M5 Max MBP] 2026-10-29 23:0x PDT (Nick TG 23:04: "These need to not have backgrounds and they need to not be at the top", the section
// named "Female"): MG63..MG68 + F76 (looks.json section "Female") play as transparent loops (scripts/female56_alpha_previews.py, ?v=f56) and sit
// in their own "Female" section after everything else in Styles > Motion graphics and Captions, and last in the New reel steps.
const FEM56 = new Set(["MG63", "MG64", "MG65", "MG66", "MG67", "MG68", "F76"]), FEM56L = new Set(["MG63", "MG64", "MG66", "MG67", "MG68", "F76"]);   // FEMALE56
const isFem56 = l => !!(l && l.section === "Female"), femLast56 = list => [...list.filter(l => !isFem56(l)), ...list.filter(isFem56)];   // FEMALE56
const femSort56 = list => list.filter(isFem56).sort((a, b) => String(a.code).localeCompare(String(b.code), "en", { numeric: true }));   // FEMALE56
// LINEGRAPH87 [M5 Max MBP] 2026-11-02 15:5x PST: MG87 Line Graph added (transparent square tile MG87_t.*, alpha_previews, landed-frame poster).
// MGLAYOUT107 v2 [M5 Max MBP] 2026-11-01 (Nick TG 12:14 PM: "They shouldn't have a background. They should go against the UI of the app ... square like
//   everything else on the page"): these motion graphics play as transparent squares (scripts/mgalpha107.py: the real engine on a cut-out
//   speaker, two-plate alpha), the page shows through; tapping still opens the sheet, swipe for the real video.
const ALPHA107 = new Set(["MG04", "MG08", "MG14", "MG15", "MG17", "MG50", "MG69", "MG70", "MG71", "MG72", "MG73", "MG75", "MG76", "MG77", "MG79", "MG80", "MG81", "MG82", "MG87"]), INKL107 = new Set(["MG04", "MG08", "MG15", "MG17", "MG69", "MG70", "MG71", "MG72", "MG73", "MG75", "MG76", "MG79", "MG80", "MG81", "MG82"]);
// APPMG192 [M5 Max MBP] 2026-11-09 08:40 PST (Nick TG 23904 "Add them to the app if it makes sense"): MG89 Map Route, MG90 Product Teardown,
//   MG91 Swiss Grid, MG92 Globe Arcs, MG93 Pencil Sketch, MG88 Spike Split, MG40 Dot Grid Counter. Transparent square tiles (mgalpha107, graphic only)
//   served from this app at /motion/<CODE>_t.*; tap opens the sheet, swipe to the engine render on Nick's footage (/motion/<CODE>_ex.*).
const APPMG192 = new Set(["MG89", "MG90", "MG91", "MG92", "MG93", "MG88", "MG40"]);
const APPMG192L = new Set(["MG40", "MG89", "MG90"])   // MGFIX194 [M5 Max MBP] 2026-11-11: MG91 removed, MG90 tile has white ink;   // APPMG192b: light-ink tiles get the inkL drop shadow so white words read on the light UI
function uiMedia(l) { if (!l) return null;
  if (isVfx194(l)) return { video: l.solid_video, poster: l.solid_poster, sq: true };   // FXLOOKS194 [M5 Max MBP] 2026-11-11: square cut of the real example
  if (APPMG192.has(l.code)) return { video: "/motion/" + l.code + (MOV52 ? "_t.mov" : "_t.webm") + "?v=mg196", poster: "/motion/" + l.code + "_t.png?v=mg196", sq: true, al: true, inkL: APPMG192L.has(l.code) };   // APPMG192
  if (ALPHA107.has(l.code)) { const b = String(l.solid_video || l.video || "").replace(/\/motion\/[^/?]+(\?.*)?$/, "/motion/"); if (b) return { video: b + l.code + (MOV52 ? "_t.mov" : "_t.webm") + "?v=mg196", poster: b + l.code + "_t.png?v=mg196", sq: true, al: true, inkL: INKL107.has(l.code) }; }   // MGLAYOUT107
  if (FEM56.has(l.code)) { const b = String(l.solid_video || l.video || "").replace(/\/motion\/[^/?]+(\?.*)?$/, "/motion/"); if (b) return { video: b + l.code + (MOV52 ? "_t.mov" : "_t.webm") + "?v=f56", poster: b + l.code + "_t.png?v=f56", sq: true, al: true, inkL: FEM56L.has(l.code) }; }   // FEMALE56
  if (ALPHA52.has(l.code)) { const b = String(l.solid_video || l.video || "").replace(/\/motion\/[^/?]+(\?.*)?$/, "/motion/"); if (b) return { video: b + l.code + (MOV52 ? "_t.mov" : "_t.webm") + "?v=mg196", poster: b + l.code + "_t.png?v=mg196", sq: true, al: true, inkL: INKL52.has(l.code) }; }
  if (APP51.has(l.code)) { const b = String(l.solid_video || l.video || "").replace(/\/motion\/[^/?]+(\?.*)?$/, "/motion/"); if (b) return { video: b + l.code + "_app.mp4?v=a52", poster: b + l.code + "_app.jpg?v=a52", sq: true }; }
  if (!l.solid_video) return null; if (!UI50.has(l.code)) return { video: l.solid_video, poster: l.solid_poster };
  const sw = u => String(u).replace(/_solid\.(mp4|jpg)/, "_ui.$1").replace(/\?v=[^&]*/, "?v=ui50"); return { video: sw(l.solid_video), poster: sw(l.solid_poster) }; }
const S50_STYLES = "https://lumi-styles.vercel.app/motion/color/";
// The engine's named grades (~/.lumo/lumi2/color_options.py LOOKS). g = the brief's grade key: the three the New reel step already offers keep
// their key (natural / warm / bright); the rest send their own "Color:" line through f122Lines.
const COLOR50 = [
  { k: "natural", g: "natural", n: "Natural True Color", s: "True to life, gently cleaned up." },
  { k: "clean_punchy", g: "c50_clean_punchy", n: "Clean and Punchy", s: "Crisp, more contrast, colors that pop." },
  { k: "warm_film_v2", g: "warm", n: "Warm Film", s: "Soft, warm and filmic." },
  { k: "bright_airy", g: "bright", n: "Bright and Airy", s: "Light, clean and open." },
  { k: "soft_pastel", g: "c50_soft_pastel", n: "Soft Matte Pastel", s: "Soft, matte, gentle colors." },
  { k: "moody", g: "c50_moody", n: "Moody Muted", s: "Darker and muted, cool shadows." },
  { k: "golden", g: "c50_golden", n: "Golden Hour", s: "A warm sunset glow." },
  { k: "cool_crisp", g: "c50_cool_crisp", n: "Cool and Crisp", s: "Cool, clean and sharp." },
  { k: "rich_vibrant", g: "c50_rich_vibrant", n: "Rich and Vibrant", s: "Deep, rich, saturated colors." },
  { k: "cine_teal_orange", g: "c50_cine_teal_orange", n: "Cinematic Teal and Orange", s: "A movie look: teal shadows, warm skin." },
  { k: "cine_warm_film", g: "c50_cine_warm_film", n: "Cinematic Warm Film", s: "A movie look: deep blacks, warm film." },
  { k: "cine_deep_contrast", g: "c50_cine_deep_contrast", n: "Cinematic Deep Contrast", s: "A movie look: bold contrast, rich blacks." }];
const color50 = g => COLOR50.find(c => c.g === g) || null;
const IS52 = l => /^F(5\d|6[0-4])$/.test(String((l || {}).code || ""));   // STYLES52: the CAPS52 captions F50..F64 lead every caption list (Nick)
const numTile = (html, n) => n ? html.replace('<span class="chk">' + CHK + '</span>', '<span class="chk chkn">' + n + '</span>') : html;   // TWOCAPS52: picked order on the badge
const mgq64 = (html, l, on) => html.replace('<span class="chk">' + CHK + '</span>', '<span class="chk">' + CHK + '</span><span class="mgring"></span>' + (l ? `<button type="button" class="mgq" data-mgq="${esc(l.code)}" aria-pressed="${on ? "true" : "false"}" aria-label="${on ? "Remove " : "Add "}${esc(l.name)}"><i>${CHK}</i></button>` : `<span class="mgq" aria-hidden="true"><i>${CHK}</i></span>`));   // MGPICK64: corner quick-pick circle
const pickCount = (n, max, lead) => `<div class="f122cnt" role="status"><b>${lead}</b><span class="${n ? "on" : ""}">${n} of ${max} picked</span></div>`;
// NEWTOP77 [M5 Max MBP] 2026-10-31 (Nick TG: "New looks don't go at the bottom"): anything added in the last 7 days leads every list, newest
// first, in every picker (Styles sections and the new-reel brief); the rest keeps its own order.
const newFirst = list => { const n = Date.now(), isTop = l => { const t = addedAt(l); return t > 0 && n >= t && n - t < TOP_MS; };
  return [...list.filter(isTop).sort((a, b) => addedAt(b) - addedAt(a)), ...list.filter(l => !isTop(l))]; };
const top52 = list0 => { const list = newFirst(list0), n = Date.now(), top = list.filter(l => { const t = addedAt(l); return t > 0 && n >= t && n - t < TOP_MS; }), rest = list.filter(l => !top.includes(l));
  return [...top, ...rest.filter(IS52).sort((a, b) => parseInt(a.code.slice(1)) - parseInt(b.code.slice(1))), ...rest.filter(l => !IS52(l))]; };
// MG78TPL [M5 Max MBP] 2026-10-31 15:33 PDT (Nick TG: "No it needs to be in templates", about Block Cut): a motion entry with looks.json
// "template": true (MG78 Block Cut, the transition IS the whole look) sits in Templates, not Motion graphics. It keeps role "motion" so the
// engine never takes it as a caption profile; a Templates pick writes "Built-out style: Block Cut (MG78), a transition template ..." (f122Lines).
const isTemplate = l => !!(l && !l.variant_of && !l.solid_video && ((l.role === "look" && (l.family === "newest" || l.family === "other")) || (l.role === "motion" && l.template === true)));
// TAPPLAY93 [M5 Max MBP] 2026-10-31 (Nick TG "Why doesn't this play???", F80 sheet slide 2 frozen on his iPhone in Low Power Mode): iOS blocks
//   autoplay there, so a sheet video whose play() is refused shows a play button and starts on the first tap.
function tp93(v) { try { const box = v.closest(".prev") || v.parentElement; const q = v.play(); if (q && q.then) q.then(() => box && box.classList.remove("tp93")).catch(() => box && box.classList.add("tp93")); } catch {} }
document.addEventListener("click", e => { const box = e.target && e.target.closest && e.target.closest(".tp93"); if (!box) return; const v = box.querySelector("video"); if (v) { v.muted = true; v.play().then(() => box.classList.remove("tp93")).catch(() => {}); } }, true);
// SND95 [M5 Max MBP] 2026-10-31 (Nick TG: "I need to be able to toggle the sound on and off for the example matcha ... video"): every real-video
//   example slide in a look sheet gets a speaker button; tap = sound on/off for that sheet's videos (they start muted, as iOS requires).
const _snd95 = { on: false };
function snd95Paint(root) { (root || document).querySelectorAll(".sheet .prev:not(.al)").forEach(p => { if (!p.querySelector("video")) return; let b = p.querySelector(".snd95"); if (!b) { b = document.createElement("button"); b.type = "button"; b.className = "snd95"; b.setAttribute("aria-label", "Sound on or off"); p.appendChild(b); } b.classList.toggle("on", _snd95.on); }); }
document.addEventListener("click", e => { const b = e.target && e.target.closest && e.target.closest(".snd95"); if (!b) return; e.stopPropagation(); e.preventDefault(); _snd95.on = !_snd95.on; try { window.lumiSound && lumiSound(_snd95.on); } catch {} const p = b.closest(".prev"); document.querySelectorAll(".sheet .prev video").forEach(v => { v.muted = !(_snd95.on && v.closest(".prev") === p); }); const v = p && p.querySelector("video"); if (v && _snd95.on) v.play().catch(() => {}); snd95Paint(); }, true);
new MutationObserver(() => { if (document.querySelector(".sheet .prev:not(.al) video") && !document.querySelector(".sheet .prev:not(.al) .snd95")) snd95Paint(); else if (!document.querySelector(".sheet")) _snd95.on = false; }).observe(document.documentElement, { childList: true, subtree: true });
function stabOf(l) {
  if (!l || l.variant_of) return null;
  if (isTemplate(l)) return "templates";   // MG78TPL: before the motion check, so a template MG is in Templates only
  if (isVfx194(l)) return "vfx";   // FXLOOKS194 [M5 Max MBP] 2026-11-11
  if (l.role === "motion") return "motion";
  if (l.role === "look" || l.role === "glass" || l.role === "vine" || l.role === "hook") return "captions";
  return null;
}
function stabSeen() { const s = fetchStore("stabseen", {}); return s && typeof s === "object" ? s : {}; }
function stabNew(tab) {
  const seen = Number(stabSeen()[tab]) || 0, n = Date.now();
  const ok = new Set(announced());
  return looks().filter(l => { const t = addedAt(l); return ok.has(l.code) && t > seen && n >= t && n - t < STAB_NEW_MS && stabOf(l) === tab; }).length;
}
function stabMark(tab) { const s = stabSeen(); s[tab] = Date.now(); store("stabseen", s); }
function stylesNavDot() { const b = document.querySelector('#tabs button[data-v="looks"]'); if (!b) return; b.classList.toggle("s50new", STAB.some(([k]) => stabNew(k) > 0)); }
const fmtTemplates = () => (S.fmts || []).filter(f => f && f.example && !looks().some(l => isTemplate(l) && String(f.label || "").toLowerCase().startsWith(l.name.toLowerCase())));
function fmtTile(f) {
  return `<div class="mv" data-fmt="${esc(f.id)}" data-act="fmt"><img src="/${esc(f.poster || f.thumb || "")}" alt="" loading="lazy"><video muted playsinline loop preload="none" poster="/${esc(f.poster || f.thumb || "")}" data-src="/${esc(f.example)}"></video>
    <div class="shade"></div><span class="newb">NEW</span><span class="chk">${CHK}</span><div class="cap">${esc(f.label)}<small>Video format</small></div></div>`;
}
function renderLooks() {
  if (!S.fmts && typeof loadFmts === "function") loadFmts().then(() => { if (S.view === "looks" && (S.stab || "templates") === "templates") render(); }).catch(() => {});
  const tab = ["templates", "captions", "motion", "vfx", ...(SHOW_COLOR ? ["color"] : []), "mine"].includes(S.stab) ? S.stab : (S.stab = "templates");
  if (tab !== "mine") stabMark(tab);   // opening a tab clears its dot (this phone)
  const dr0 = S.draft || {}, picked = l => l.role === "look" ? (dr0.look === l.code || (dr0.lookMode === "pick" && dr0.look2 === l.code)) : l.role === "hook" ? dr0.hook === l.code : l.role === "glass" ? dr0.glass === l.code : l.role === "vine" ? dr0.vine === l.code : l.role === "motion" ? mgPicks(dr0).includes(l.code) : false;
  let h = `<div class="hero lhero s50h"><div class="ht"><h1>Every look, <i>in motion.</i></h1><p class="sub">${SHOW_COLOR ? "Templates, captions, motion graphics and color." : "Templates, captions and motion graphics."}</p></div><img class="hlumi" src="/lumi/welcome.webp" alt=""></div>
    <div class="looksv s50"><div class="stabs" id="stabs" role="tablist">${STAB.map(([k, n, ic]) => `<button type="button" role="tab" data-st="${k}" aria-selected="${tab === k}" class="${tab === k ? "on" : ""}"><svg viewBox="0 0 24 24" aria-hidden="true">${ic}</svg><span>${n}</span>${tab !== k && stabNew(k) ? `<i class="ndot" aria-label="New"></i>` : ""}</button>`).join("")}</div>
    <button type="button" class="mystyle${tab === "mine" ? " on" : ""}" id="mystyle"><span class="msi">✦</span><span class="mst"><b>Your personal style</b><small>What you have used and loved</small></span><span class="msc">›</span></button>`;
  let shown = 0;
  // RECIPE113 [M5 Max MBP] 2026-11-01: Captions and Motion graphics tiles get the corner circle (MGPICK64) as a real toggle that builds a recipe
  const grid = (list, o = {}) => `<div class="grid${o.ui ? " g3" : ""}${o.ui && (tab === "captions" || tab === "motion" || tab === "vfx") ? " r113g" : ""}" style="margin-bottom:8px">${list.map(l => { const t = tile(l, { on: picked(l), solid: !!o.ui, ui: !!o.ui, sub: o.sub ? o.sub(l) : null }); return o.ui && (tab === "captions" || tab === "motion" || tab === "vfx") && !isTemplate(l) ? mgq64(t, l, picked(l)) : t; }).join("")}</div>`;
  if (tab === "templates") {
    const tl = styleOrder(looks().filter(isTemplate)), fm = fmtTemplates(); { const vb = looks().filter(l => isVfx194(l) && l.beside), at = vb.length ? tl.findIndex(l => l.code === vb[0].beside) : -1; if (vb.length) tl.splice(at >= 0 ? at + 1 : 0, 0, ...vb); }   /* FXLOOKS194 [M5 Max MBP] 2026-11-11: the birds sit beside Top Stack */ shown = tl.length + fm.length;
    h += `<p class="s50lead">Fully built looks: captions, editing and motion graphics as one set. Tap one to see it on a real reel.</p>`;
    if (tl.length) h += `<h2 style="margin-top:14px">Templates</h2><div class="grid" style="margin-bottom:8px">${tl.map(l => tile(l, { on: picked(l) })).join("")}</div>`;
    if (fm.length) h += `<h2 style="margin-top:18px">Video formats</h2><p class="sub" style="margin:-4px 0 8px">A whole format, cut the way that type of video works.</p><div class="grid" style="margin-bottom:8px">${fm.map(fmtTile).join("")}</div>`;
    if ((S.cat.real || []).length) h += `<h2>Recent reels we cut</h2><p class="sub" style="margin-bottom:8px">Real deliveries, as they went out.</p>${strip(S.cat.real.map((r, i) => ({ code: "real" + i, name: "", poster: r.poster, video: r.video, accent: "transparent" })), { nocap: true, act: "none" })}`;
  } else if (tab === "captions") {
    const cf = ["all", "softer", "bolder", "glass"].includes(S.cfam) ? S.cfam : (S.cfam = "all");
    h += `<div class="chippanel"><div class="chips" id="bk">${[["all", "Everyone"], ["female", "For her"], ["male", "For him"]].map(([k, n]) => `<button data-b="${k}" class="${S.book === k ? "on" : ""}">${n}</button>`).join("")}</div>
      <div class="chips" id="cfam" style="padding-top:0">${[["all", "All"], ["softer", "Softer"], ["bolder", "Bolder"], ["glass", "Glass"]].map(([k, n]) => `<button data-cf="${k}" class="${cf === k ? "on" : ""}">${n}</button>`).join("")}</div></div>
      <p class="s50lead">Just the captions, moving the way they land. Tap one to see it on real video.</p>`;
    // NEWGLASS89 (Nick TG: "Everyone to For Her and For Him, they hardly change ... I want to see the glass caption styles ... a pink one [for girls]
    // ... for guys the blue one up top ... for Everyone close to the top"): glass leads For her / For him, and sits second for Everyone.
    const fams = cf === "all" ? ["newest", "softer", "bolder", "glass", "hooks"] : [cf];   // GLASSONE95: the rest of glass sits lower down
    // NEWSEC78 [M5 Max MBP] 2026-10-31 (Nick TG: "It's a new caption and I still do not see it. It should go at the top"): every caption, hook
    // and glass look added in the last 7 days leads the Captions page in its own "New" section, newest first, whatever section it belongs to.
    const _nT = Date.now(), _isNew = l => { const t = addedAt(l); return t > 0 && _nT >= t && _nT - t < TOP_MS; };
    // GLASSONE95 [M5 Max MBP] 2026-10-31 16:1x PDT (Nick TG: "That's too many glass words at the top ... one on the For Him section that's
    //   blue, one on the Girl section that's pink, and one on the All section that's blue. The rest can be down lower"): with All, ONE glass
    //   look leads the Captions page (Everyone: G_blue, For her: G_pink, For him: G_blue); every other glass look stays in its section lower down.
    const _glassTop = new Set(); let _glassOne = null;
    if (cf === "all") { const want = S.book === "female" ? "G_pink" : "G_blue"; _glassOne = filtered("glass").find(l => l.code === want && stabOf(l) === "captions") || null; if (_glassOne) _glassTop.add(_glassOne.code); }
    const _new78 = []; { const _s = new Set(_glassTop); for (const f of fams) for (const l of filtered(f)) if (stabOf(l) === "captions" && !isFem56(l) && _isNew(l) && !_s.has(l.code) && _s.add(l.code)) _new78.push(l); }
    _new78.sort((x, y) => addedAt(y) - addedAt(x)); if (_glassOne) _new78.unshift(_glassOne);   // GLASSONE95: the one glass look leads
    if (_new78.length) { shown += _new78.length; h += `<h2 style="margin-top:18px">New</h2>` + grid(_new78, { ui: true, sub: l => l.role === "hook" ? "hook" : l.role === "look" ? (l.book === "female" ? "for her" : l.book === "male" ? "for him" : "") : null }); }
    const _newSet78 = new Set([..._new78.map(l => l.code), ..._glassTop]);
    for (const f of fams) {
      let list = top52(styleOrder(filtered(f).filter(l => stabOf(l) === "captions" && !isFem56(l) && !_newSet78.has(l.code)))); if (!list.length) continue;
      { const pref = f === "glass" ? (S.book === "female" ? ["G_pink", "F8"] : S.book === "male" ? ["G_blue", "M1"] : ["G_pink", "G_blue"]) : [];   // NEWGLASS89
        const rank = l => { const i = pref.indexOf(l.code); return i >= 0 ? i : pref.length + (S.book !== "all" && l.book === S.book ? 0 : 1); };
        list = list.map((l, i) => [rank(l), i, l]).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map(x => x[2]); }   // her / him looks before "any" looks in every section
      shown += list.length;   // FEMALE56: Female pieces in their own section below
      h += `<h2 style="margin-top:18px">${f === "newest" ? "Newest captions" : FAM[f]}</h2>` + grid(list, { ui: true, sub: l => l.role === "look" ? (l.book === "female" ? "for her" : l.book === "male" ? "for him" : "") : null });
    }
    { const _fs = new Set(), fl = femSort56(fams.flatMap(f => filtered(f)).filter(l => stabOf(l) === "captions" && !_fs.has(l.code) && _fs.add(l.code))); if (fl.length) { shown += fl.length; h += `<h2 style="margin-top:18px">Female</h2>` + grid(fl, { ui: true, sub: l => l.role === "look" ? (l.book === "female" ? "for her" : l.book === "male" ? "for him" : "") : null }); } }   // FEMALE56
    if (!shown) h += `<div class="card" style="margin-top:18px;text-align:center"><p style="margin:0 0 12px">${cf === "softer" ? "The softer book is made for her." : cf === "bolder" ? "The bolder book is made for him." : "No captions match these filters."} Switch to Everyone to see it.</p><button class="btn line" id="bkall" type="button">Show everyone</button></div>`;
  } else if (tab === "motion") {
    const list = styleOrder(looks().filter(l => stabOf(l) === "motion" && !HIDE_MG51.has(l.code) && !isFem56(l))), fl56 = femSort56(looks().filter(l => stabOf(l) === "motion" && !HIDE_MG51.has(l.code))); shown = list.length + fl56.length;   // FEMALE56
    h += `<p class="s50lead">Graphics we add on top of your captions, up to four per reel. Tap one to see it on the app, then on real video.</p>` + grid(list, { ui: true }) + (fl56.length ? `<h2 style="margin-top:18px">Female</h2>` + grid(fl56, { ui: true }) : "");   // FEMALE56
  } else if (tab === "vfx") {   // FXLOOKS194 [M5 Max MBP] 2026-11-11
    const list = newFirst(looks().filter(l => stabOf(l) === "vfx")); shown = list.length;
    h += `<p class="s50lead">Things added into your real footage: your picture stays yours, the effect is built around you. Tap one to see it on real video.</p>` + grid(list, { ui: true });
  } else if (tab === "color") {
    const g = (S.draft || {}).grade;
    h += `<p class="s50lead">How your footage is colored. Each one is a different person, filmed flat, then graded by our color engine. Tap one to compare it with how it was filmed.</p>
      <div class="grid c50grid">${COLOR50.map(c => `<button type="button" class="c50t${g === c.g ? " on" : ""}" data-c50="${esc(c.k)}"><img src="${S50_STYLES}${esc(c.k)}.jpg?v=c114" alt="" loading="lazy"><span class="chk">${CHK}</span><span class="c50c"><b>${esc(c.n)}</b><small>${esc(c.s)}</small></span></button>`).join("")}</div>`;
    shown = COLOR50.length;
  } else h += mineHtml(S.data || {});
  h += `</div>`;
  $("#main").innerHTML = h; armTiles(); bindTiles(); bindAdd();
  document.querySelectorAll("#stabs button").forEach(b => b.onclick = () => { S.stab = b.dataset.st; render(); });
  $("#mystyle").onclick = () => { S.stab = S.stab === "mine" ? "templates" : "mine"; render(); };
  document.querySelectorAll("#bk button").forEach(b => b.onclick = () => { S.book = b.dataset.b; render(); });
  document.querySelectorAll("#cfam button").forEach(b => b.onclick = () => { S.cfam = b.dataset.cf; render(); });
  document.querySelectorAll(".mv[data-act='fmt']").forEach(el => el.onclick = () => openFmt(el.dataset.fmt));
  document.querySelectorAll("[data-c50]").forEach(el => el.onclick = () => openColor(el.dataset.c50));
  { const ba = $("#bkall"); if (ba) ba.onclick = () => { S.book = "all"; S.cfam = "all"; render(); }; }
  if (tab === "mine") bindMine();
  try { stylesNavDot(); } catch {}
  document.querySelectorAll(".r113g [data-mgq]").forEach(b => b.onclick = e => { e.stopPropagation(); e.preventDefault(); r113Toggle(b.dataset.mgq); });   // RECIPE113
  r113Card();
}
/* RECIPE113 [M5 Max MBP] 2026-11-01 4:1x PM PST (Nick TG 3:51 PM: "if I go to styles I should be able to select multiple different motion graphics and
   then have those be a recipe ... 'Building your reel, motion graphic added' ... a little thumbnail ... up to two captions at most ... They can't do the
   same with templates"). The corner circle on Captions and Motion graphics tiles toggles a pick straight into this phone's draft (the same fields the
   New reel steps use: motion up to 4, look + look2 up to 2, hook / glass / vine one each), with the order kept in draft.r113. A small card above
   the tabs shows the picks; "Use these in a new reel" opens New reel, and after the title the fork offers Build the rest with me (customize,
   picks pre-filled) or You build the rest (path "one", every pick in the brief, the rest decided by Lumi). Phone only: drafts are not synced. */
function r113Ls(dr) {
  dr = dr || S.draft || {}; const out = [], seen = new Set();
  const has = c => { const l = byCode(c); if (!l) return false; if (l.role === "motion") return mgPicks(dr).includes(c); if (l.role === "look") return dr.lookMode === "pick" && (dr.look === c || dr.look2 === c); return dr[l.role] === c; };
  (dr.r113 || []).forEach(c => { if (!seen.has(c) && has(c)) { seen.add(c); out.push(byCode(c)); } });
  // RECIPE113 fix [M5 Max MBP] 2026-11-01 4:4x PM PST (Nick 4:36 PM: 3 motion graphics + 2 captions picked, New reel said "Only this is chosen: Blue
  // glass"): a draft that started on the Styles page lists EVERY pick in its fields, whichever way it was picked (circle or the sheet's Use button)
  if (dr.single || (dr.r113 || []).length) {
    const add = c => { if (c && !seen.has(c) && byCode(c) && !isTemplate(byCode(c)) && has(c)) { seen.add(c); out.push(byCode(c)); } };
    mgPicks(dr).forEach(add); if (dr.lookMode === "pick") { if (dr.look && stabOf(byCode(dr.look) || {}) === "captions") add(dr.look); add(dr.look2); }
    ["hook", "glass", "vine"].forEach(k => add(dr[k])); if (dr.single) add(dr.single.code);
  }
  return out;
}
function r113Toggle(code) {
  const l = byCode(code); if (!l || isTemplate(l)) return;
  const dr = S.draft || (S.draft = { ...DEFAULT_DRAFT(), ...fetchStore("draft", {}) }); const list = (dr.r113 || []).filter(c => c !== code);
  const isCap = l.role === "look", cur = r113Ls(dr).some(x => x.code === code);
  let msg = "";
  if (cur) {
    if (l.role === "motion") dr.motion = mgPicks(dr).filter(c => c !== code);
    else if (isCap) { if (dr.look === code) dr.look = dr.look2 || null; dr.look2 = null; }
    else dr[l.role] = null;
    dr.r113 = list; msg = (l.role === "motion" ? "Motion graphic" : isCap ? "Caption" : "Pick") + " removed";
  } else {
    if (l.role === "motion") { const m = mgPicks(dr); if (m.length + (dr.mgCarousel ? 1 : 0) >= 4) { toast("Up to 4 motion graphics. Tap one you picked to remove it."); return; } dr.motion = [...m, code]; if (!dr.mgMode || dr.mgMode === "none" || dr.mgMode === "decide") dr.mgMode = "pick"; }
    else if (isCap) {
      const a = dr.lookMode === "pick" && dr.look && byCode(dr.look) && stabOf(byCode(dr.look)) === "captions" ? dr.look : null, b = a && dr.look2 && byCode(dr.look2) ? dr.look2 : null;
      if (a && b) { toast("Up to 2 caption styles. Tap one you picked to remove it."); return; }
      if (a) dr.look2 = code; else { dr.look = code; dr.look2 = null; }
      dr.lookMode = "pick"; dr.captions = "Captions on"; dr.cap122 = "yes"; if ((S.data && S.data.account || {}).returning) dr.changeLook = true;
    } else dr[l.role] = code;
    dr.r113 = [...list, code]; msg = l.role === "motion" ? "Motion graphic added" : isCap ? "Caption added" : l.role === "hook" ? "Hook added" : "Added";
  }
  const ls = r113Ls(dr);
  if (ls.length) { const f = ls[0]; dr.single = { code: f.code, role: f.role, name: f.name }; dr.fromStyle = null; dr.tplMg = null; dr.p122 = { path: "", page: "", ret: "" }; }
  else if (dr.single && dr.single.code === code) dr.single = null;
  dr.at = Date.now(); store("draft", dr);
  // repaint just the tiles of this code (no full redraw, the scroll stays)
  const on = ls.some(x => x.code === code);
  document.querySelectorAll(`.r113g .mv[data-code="${CSS.escape(code)}"]`).forEach(m => { m.classList.toggle("on", on); const q = m.querySelector(".mgq"); if (q) { q.setAttribute("aria-pressed", on ? "true" : "false"); q.setAttribute("aria-label", (on ? "Remove " : "Add ") + l.name); } });
  if (isCap && !on) document.querySelectorAll(".r113g .mv.on").forEach(m => { const c = m.dataset.code, x = byCode(c); if (x && x.role === "look" && !ls.some(y => y.code === c)) { m.classList.remove("on"); const q = m.querySelector(".mgq"); if (q) q.setAttribute("aria-pressed", "false"); } });
  r113Card(msg);
}
function r113Card(msg) {
  let el = document.getElementById("r113"); const ls = S.view === "looks" ? r113Ls() : [];
  document.body.classList.toggle("r113on", !!ls.length);
  if (!ls.length) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement("div"); el.id = "r113"; el.className = "r113"; el.setAttribute("role", "status"); document.body.appendChild(el); }
  const nm = ls.filter(l => l.role === "motion").length, nc = ls.filter(l => l.role === "look").length;
  const sub = msg || [nm ? nm + (nm === 1 ? " motion graphic" : " motion graphics") : "", nc ? nc + (nc === 1 ? " caption" : " captions") : "", ls.length - nm - nc ? (ls.length - nm - nc) + " more" : ""].filter(Boolean).join(", ");
  el.innerHTML = `<div class="f122pk"><span class="r113th">${ls.map(l => { const _p = (typeof uiMedia === "function" && uiMedia(l) || {}).poster || l.solid_poster || l.poster;
      return `<button type="button" class="f122pki" data-r113x="${esc(l.code)}" aria-label="Remove ${esc(l.name)}">${_p ? `<img src="${esc(_p)}" alt="">` : ""}<i class="f122pkc">×</i></button>`; }).join("")}</span>
    <span class="f122pkt"><small>Building your reel</small><b id="r113msg">${esc(sub)}</b></span>
    <button type="button" class="btn primary block" id="r113go">Use these in a new reel</button></div>`;
  el.querySelectorAll("[data-r113x]").forEach(b => b.onclick = () => r113Toggle(b.dataset.r113x));
  el.querySelector("#r113go").onclick = () => { const dr = S.draft; if (!dr) return; el.remove(); document.body.classList.remove("r113on"); go2new(nfResumeStep(dr), { __pick: 1 }); toast(ls.length === 1 ? ls[0].name + " picked. Upload your clips." : ls.length + " picks ready. Upload your clips."); };
}
// a sheet with sideways slides (same look and swipe as the style sheet): slides = [{video|img, poster, lab, ui}]
function s50Slides(slides) {
  return `<div class="exs" id="exs">${slides.map((e, i) => `<div class="prev${e.ui ? " ui" : ""}" data-i="${i}">${e.video ? `<video ${i ? `data-src="${esc(e.video)}" preload="none"` : `src="${esc(e.video)}" autoplay`} poster="${esc(e.poster || "")}" muted playsinline loop></video>` : `<img src="${esc(e.img)}" alt="">`}<span class="exl">${esc(e.lab || "")}</span></div>`).join("")}</div>
    <div class="exdots" id="exdots">${slides.map((e, i) => `<i class="${i ? "" : "on"}"></i>`).join("")}</div>`;
}
function s50Swipe(onSlide) {
  const ex = $("#exs"); if (!ex) return; let cur = 0; const slides = [...ex.querySelectorAll(".prev")], dots = [...document.querySelectorAll("#exdots i")];
  ex.addEventListener("scroll", () => { clearTimeout(ex.__t); ex.__t = setTimeout(() => {
    const mid = ex.scrollLeft + ex.clientWidth / 2; let best = 0, bd = 1e9;
    slides.forEach((s2, i) => { const d = Math.abs(s2.offsetLeft + s2.offsetWidth / 2 - mid); if (d < bd) { bd = d; best = i; } });
    if (best === cur) return; cur = best;
    slides.forEach((s2, i) => { const v = s2.querySelector("video"); if (!v) return; if (i === best) { if (!v.src && v.dataset.src) v.src = v.dataset.src; tp93(v); } else { try { v.pause(); } catch {} } });
    dots.forEach((d, i) => d.classList.toggle("on", i === best)); if (onSlide) onSlide(best); }, 90); }, { passive: true });
}
function openColor(k) {
  const c = COLOR50.find(x => x.k === k); if (!c) return;
  const on = (S.draft || {}).grade === c.g;
  sheet(`${s50Slides([{ img: S50_STYLES + c.k + ".jpg?v=c114", lab: c.n }, { img: S50_STYLES + "before_" + c.k + ".jpg?v=c114", lab: "As filmed" }])}<p class="exhint">Swipe to see it as filmed</p>
    <h3 style="font-size:22px;font-family:var(--serif);font-weight:400;margin:0">${esc(c.n)}</h3><p class="muted" style="margin:8px 0 16px;font-size:15px">${esc(c.s)} Every reel is graded on its own footage, so yours will look like you, in this color.</p>
    <div class="row lookfoot"><button class="btn primary" id="use" style="flex:1">${on ? "Remove this color" : "Use this color"}</button><button class="btn line" id="close">Close</button></div>`);
  s50Swipe(); $("#close").onclick = closeSheet;
  $("#use").onclick = () => { S.draft = S.draft || { ...DEFAULT_DRAFT(), ...fetchStore("draft", {}) }; S.draft.grade = on ? "" : c.g; store("draft", S.draft); closeSheet(); render(); toast(on ? c.n + " removed." : c.n + " will be used on your next reel."); };
}
function openFmt(id) {
  const f = (S.fmts || []).find(x => x.id === id); if (!f) return;
  const sl = [{ video: "/" + f.example, poster: "/" + (f.poster || f.thumb || ""), lab: "Example" }]; if (f.example_wide) sl.push({ video: "/" + f.example_wide, poster: "/" + (f.poster || f.thumb || ""), lab: "Horizontal" });
  const det = Array.isArray(f.details) ? f.details : [];
  sheet(`${sl.length > 1 ? s50Slides(sl) : `<div class="prev"><video src="${esc(sl[0].video)}" poster="${esc(sl[0].poster)}" muted playsinline loop autoplay></video></div>`}
    <h3 style="font-size:22px;font-family:var(--serif);font-weight:400;margin:0">${esc(f.label)}</h3><p class="muted" style="margin:8px 0 10px;font-size:15px">${esc(f.blurb || "")}</p>
    ${det.length ? `<ul class="s50det">${det.slice(0, 5).map(x => `<li>${esc(String(x).replace(/\u2014/g, ","))}</li>`).join("")}</ul>` : ""}${f.ask ? `<p class="muted" style="font-size:14px;margin:0 0 14px">${esc(String(f.ask).replace(/\u2014/g, ","))}</p>` : ""}
    <div class="row lookfoot"><button class="btn primary" id="use" style="flex:1">Start a reel in this format</button><button class="btn line" id="close">Close</button></div>`);
  s50Swipe(); $("#close").onclick = closeSheet;
  $("#use").onclick = () => { S.draft = S.draft || { ...DEFAULT_DRAFT(), ...fetchStore("draft", {}) }; const dr = S.draft; dr.tplMg = null; dr.videoType = f.id; dr.vtChosen = true; dr.vtTell = false; dr.vtDecide = false;
    const p = f122(dr); p.path = "built"; p.page = "review"; p.ret = ""; dr.at = Date.now(); store("draft", dr); closeSheet(); go2new(nfResumeStep(dr), { __pick: 1 }); toast(f.label + " picked."); };
}
/* ---------- YOUR PERSONAL STYLE (STYLES50). Built from the client's own record, never a preset: design.current + design.style (an approved
   profile's colors, fonts, grade; app_push _style_bits), design.history (every delivered reel's look) and each reel's own brief (my_brief.raw:
   caption style, motion graphics, hook, color, intensity). Nothing invented: a row without data is left out. ---------- */
function myStyle(d) {
  const g = (d && d.design) || {}, cur = g.current || null, sty = g.style || {}, cnt = new Map(), mg = new Map(), hooks = new Map();
  const bump = (m, k) => { if (k) m.set(k, (m.get(k) || 0) + 1); };
  let grade = sty.grade || "", inten = new Map(), bg = "";
  (g.history || []).forEach(x => bump(cnt, x.code && byCode(x.code) ? x.code : null));
  for (const r of (d && d.reels) || []) {
    const raw = String((r.my_brief && r.my_brief.raw) || "");
    if (raw) {
      const cs = raw.match(/^(?:Caption style|Built-out style): .*?\(([A-Z]+\d+[a-z]?)\)/m); if (cs && byCode(cs[1]) && !(g.history || []).some(x => x.reel === r.id)) bump(cnt, cs[1]);
      for (const m of raw.matchAll(/^Motion graphics add-on: .*?\((MG\d+)\)/gm)) if (byCode(m[1])) bump(mg, m[1]);
      const hk = raw.match(/^Hook style: .*?\(Hook (\d+)\)/m); if (hk && byCode("HK" + hk[1])) bump(hooks, "HK" + hk[1]);
      const co = raw.match(/^Color: ([^\n(]+)/m); if (co && !grade) grade = co[1].trim();
      const iv = raw.match(/^Editing intensity: (\w+)/m); if (iv) bump(inten, iv[1]);
      const b = raw.match(/^Background: ([^\n(]+)/m); if (b && !bg && !/as filmed|comes with my style/i.test(b[1])) bg = b[1].trim();
    } else if (r.look && !(g.history || []).some(x => x.reel === r.id)) { const l = lookByName(r.look); if (l) bump(cnt, l.code); }
  }
  const top = m => [...m.entries()].sort((a, b) => b[1] - a[1]).map(x => x[0]);
  const caps = top(cnt).map(byCode).filter(Boolean), mgs = top(mg).map(byCode).filter(Boolean), hk = top(hooks).map(byCode).filter(Boolean);
  const main = cur && cur.code && byCode(cur.code) ? byCode(cur.code) : caps[0] || null;
  let colors = (sty.colors || []).filter(c => /^#[0-9A-F]{6}$/i.test(c.hex || "")).map(c => ({ hex: c.hex, name: c.name || "" }));
  if (!colors.length) { const seen = new Set(); [main, ...caps].filter(Boolean).forEach(l => { const a = String(l.accent || ""); if (/^#[0-9a-f]{6}$/i.test(a) && !seen.has(a.toLowerCase())) { seen.add(a.toLowerCase()); colors.push({ hex: a, name: "", from: l.name }); } }); colors = colors.slice(0, 4); }
  return { cur, main, caps: caps.slice(0, 4), mgs: mgs.slice(0, 4), hooks: hk.slice(0, 2), colors, fonts: (sty.fonts || []).slice(0, 4), grade, intensity: top(inten)[0] || "", bg, approved: !!(cur && cur.approved), reels: ((d && d.reels) || []).length };
}
function mineHtml(d) {
  const m = myStyle(d), has = m.cur || m.caps.length || m.mgs.length;
  if (!has) return `<div class="card s50mine" style="text-align:center"><div class="eyebrow">Your personal style</div><h3 class="ptitle" style="margin:6px 0 8px">It starts with your first reel</h3>
    <p class="muted" style="margin:0 0 14px">As we make your reels, the colors, fonts, caption style and motion graphics you use and love collect here, so the next one is one tap.</p><button class="btn primary block" id="s50find" type="button">Find your caption style</button></div>`;
  const name = m.cur ? (m.cur.code ? m.cur.name : "Your own look") : m.main ? m.main.name : "Your look";
  const pv = m.cur && (m.cur.video || m.cur.poster) ? m.cur : m.main ? (uiMedia(m.main) ? { ...uiMedia(m.main), ui: true } : { video: m.main.video, poster: m.main.poster }) : null;
  const row = (lab, body) => body ? `<div class="s50row"><span class="s50lab">${lab}</span><div class="s50val">${body}</div></div>` : "";
  const chips = list => list.map(l => `<button type="button" class="s50chip" data-open="${esc(l.code)}">${esc(l.name)}</button>`).join("");
  return `<div class="card s50mine">
    <div class="s50top">${pv ? `<div class="s50pv${pv.ui ? " ui" : ""}">${pv.video ? `<video src="${esc(pv.video)}" poster="${esc(pv.poster || "")}" muted playsinline loop autoplay></video>` : `<img src="${esc(pv.poster)}" alt="">`}</div>` : ""}
      <div class="s50tx"><div class="eyebrow">Your personal style</div><h3 class="ptitle">${esc(name)}${m.cur && m.cur.code ? ` <em>${esc(m.cur.code)}</em>` : ""}</h3>
      ${m.approved ? `<span class="s50ok">✓ Approved by you</span>` : ""}<p class="muted s50d">${esc((m.cur && m.cur.desc) || (m.main && m.main.desc) || "")}</p></div></div>
    ${row("Your colors", m.colors.length ? `<div class="s50sw">${m.colors.map(c => `<span class="s50c"><i style="background:${esc(c.hex)}"></i>${esc(c.name || c.from || c.hex.toUpperCase())}</span>`).join("")}</div>${m.colors.some(c => c.from) ? `<small class="muted">The main color of each look you have used</small>` : ""}` : "")}
    ${row("Your fonts", m.fonts.length ? m.fonts.map(f => `<span class="s50f" style="font-family:'${esc(f.replace(/ (Black|ExtraBold|Extra Bold|SemiBold|Bold|Regular|Medium|Light|Italic)$/, ""))}',var(--sans)">${esc(f)}</span>`).join("") : "")}
    ${row("Caption style", m.caps.length ? chips(m.caps) : "")}
    ${row("Motion graphics", m.mgs.length ? chips(m.mgs) : "")}
    ${row("Hook", m.hooks.length ? chips(m.hooks) : "")}
    ${row("Color", SHOW_COLOR && m.grade ? esc(m.grade.charAt(0).toUpperCase() + m.grade.slice(1)) : "")}
    ${row("Editing", m.intensity ? esc(m.intensity) : "")}
    ${row("Background", m.bg ? esc(m.bg.charAt(0).toUpperCase() + m.bg.slice(1)) : "")}
    <button class="btn primary block" id="s50use" type="button" style="margin-top:14px">Use my style</button>
    <p class="muted" style="font-size:13px;margin:8px 0 0;text-align:center">Starts a new reel in your style. You can still change anything before we start.</p></div>`;
}
function bindMine() {
  const f = $("#s50find"); if (f) f.onclick = () => { S.stab = "captions"; render(); };
  document.querySelectorAll(".s50chip[data-open]").forEach(b => b.onclick = () => openLook(b.dataset.open));
  const u = $("#s50use"); if (!u) return;
  u.onclick = () => {
    const m = myStyle(S.data || {}); S.draft = S.draft || { ...DEFAULT_DRAFT(), ...fetchStore("draft", {}) }; const dr = S.draft, p = f122(dr);
    if (m.cur && !m.cur.code) { dr.lookMode = "same"; dr.changeLook = false; p.path = "same"; }   // an approved look of their own (no catalog code): Same as last time
    else if (m.main) { dr.look = m.main.code; dr.lookMode = "pick"; dr.fromStyle = m.main.code; if ((S.data && S.data.account || {}).returning) dr.changeLook = true; p.path = "built"; }
    if (m.mgs.length) dr.motion = m.mgs.slice(0, 4).map(l => l.code);
    if (m.hooks.length) dr.hook = m.hooks[0].code;
    if (SHOW_COLOR) { const gk = COLOR50.find(c => m.grade && (c.n.toLowerCase() === m.grade.toLowerCase() || (F122_COLOR.find(y => y[0] === c.g) || [])[1] === m.grade.charAt(0).toUpperCase() + m.grade.slice(1).toLowerCase())); if (gk) dr.grade = gk.g; }
    p.page = "review"; p.ret = ""; dr.at = Date.now(); store("draft", dr); go2new(nfResumeStep(dr), { __pick: 1 }); toast("Your style is set. Add your clips.");
  };
}
function bindTiles() {
  document.querySelectorAll(".mv[data-act='open']").forEach(el => el.onclick = () => openLook(el.dataset.code));
  document.querySelectorAll(".mv[data-act='pick']").forEach(el => el.onclick = () => openLook(el.dataset.code, true));
}
/* [M5 Max MBP] 2026-09-28 19:38 PDT. Nick: "choose up to two different motion graphic styles on one job but no more than that", none is fine. draft.motion is a list (an old saved single code still reads). */
function mgPicks(d) { const m = d && d.motion; return (Array.isArray(m) ? m : m ? [m] : []).filter(c => byCode(c)).slice(0, 4); }   // STYLES52 (Nick 2026-10-29): up to 4
function openLook(code, picking) {
  const l = byCode(code); if (!l) return;
  try { const ls = fetchStore("lookseen", {}) || {}; ls[code] = Date.now(); store("lookseen", ls); } catch {}   // styleOrder: opened looks rotate behind unseen ones
  const role = l.role, mine = S.draft || DEFAULT_DRAFT();
  // [M5 Max MBP] 2026-09-29 sweep: a picked hook, glass color or vine can be removed again (hook back to Our call, extras back to None)
  const isOn = (role === "hook" && mine.hook === code) || (role === "glass" && mine.glass === code) || (role === "vine" && mine.vine === code);
  // TWOCAPS52 [M5 Max MBP] 2026-10-29 (Nick TG: "people can choose two different types of captions. By the way they don't have to"): on the New
  // reel Captions step a client picks 1 or 2 caption styles (draft.look + draft.look2), never more; tapping a picked one unpicks it.
  const capStep = role === "look" && S.view === "new" && S.step === NF.BRIEF && (() => { try { return f122Page(mine) === "captions"; } catch { return false; } })();
  const capOn = capStep && mine.lookMode === "pick" && (mine.look === code || mine.look2 === code);
  const label = capOn ? "Remove these captions" : isOn ? (role === "hook" ? "Remove this hook" : role === "glass" ? "Remove this glass color" : "Remove this vine") : role === "hook" ? "Use this hook" : role === "glass" ? "Use this glass color" : role === "vine" ? "Use this vine" : role === "motion" ? (mgPicks(mine).includes(code) ? (isTemplate(l) ? "Remove this template" : isVfx194(l) ? "Remove this visual effect" : "Remove this motion graphic") : (isTemplate(l) ? "Use this template" : isVfx194(l) ? "Use this visual effect" : "Use this motion graphic")) : stabOf(l) === "templates" ? "Use this template" : "Use these captions";   // STYLES51 (Nick: "That's not a style. It's just captions")   // FLOW122: Nick's wording   // MGPICK64: "Use this motion graphic"
  // [M5 Max MBP] 2026-10-07 newstyle (Nick TG 18:18): "scroll through and see different examples of that style: different people who have
  // used that style". Slide 1 is the card demo, then looks.json "examples" (build_examples.py). One example = the old single preview.
  const vars = role === "look" ? variantsOf(l) : [];   // carouselmerge: slide 1 = Carousel, slide 2 = Carousel Wrap
  const solid50 = !!(l.solid_video || APP51.has(l.code)) && stabOf(l) !== "templates" && !isVfx194(l);   /* FXLOOKS194 [M5 Max MBP] 2026-11-11: a visual effect shows its real example only */   // Styles and the New reel steps alike (Nick TG 2026-10-29)   // STYLES50: plain-background preview over the app UI first, then real video
  const um50 = solid50 ? uiMedia(l) : null;
  const onMF = (Array.isArray(l.examples) ? l.examples : []).filter(e => e && e.video && /^On (him|her)$/.test(e.lab || "")).sort((a, b) => (a.lab === "On him" ? 0 : 1) - (b.lab === "On him" ? 0 : 1));   // STYLES51: UI preview, then guy, then girl
  const exs = [...(solid50 ? [{ video: um50 ? um50.video : l.solid_video, poster: um50 ? um50.poster : l.solid_poster, src: "demo", code: l.code, lab: "On the app", ui: !(um50 && um50.al), sq: !!(um50 && um50.sq), al: !!(um50 && um50.al), inkL: !!(um50 && um50.inkL) }] : []), ...onMF, ...(DEMO_BAD51.has(l.code) ? [] : [{ video: l.video, poster: l.poster, src: "demo", code: l.code, lab: vars.length ? l.name : solid50 ? "On a real video" : "" }]), ...vars.map(v => ({ video: v.video, poster: v.poster, src: "demo", code: v.code, lab: v.name })),
    ...(Array.isArray(l.examples) ? l.examples : []).filter(e => e && e.video && !onMF.includes(e) && (e.src !== "client" || e.showcase_ok !== false))].slice(0, 7);
  const exLab = e => e.code && vars.length ? nameCode(byCode(e.code)) : e.lab || (e.src === "demo" ? "Style demo" : "Real reel");
  const nReal = exs.filter(e => e.src !== "demo").length;
  // [M5 Max MBP] 2026-10-07 20:5x Nick TG 20:56 "Get rid of 'for him too' and 'swipe to see carousel wrap'": a look with variants shows the
  // slides and dots only, no hint line; "For him too (ask for M..)" is stripped from the description here and in build_looks.py.
  const exHint = vars.length ? "" : solid50 ? "Swipe to see it on real video" : "Swipe to see " + (nReal === 1 ? "a real reel" : nReal + " real reels") + " in this look";
  const prevHtml = exs.length < 2 ? `<div class="prev"><video src="${esc(l.video)}" poster="${esc(l.poster)}" muted playsinline loop autoplay></video></div>`
    : `<div class="exs" id="exs">${exs.map((e, i) => `<div class="prev${e.ui ? " ui" : ""}${e.sq ? " sq" : ""}${e.al ? " al" : ""}${e.inkL ? " inkL" : ""}" data-i="${i}"${e.code ? ` data-code="${esc(e.code)}"` : ""}><video ${i ? `data-src="${esc(e.video)}" preload="none"` : `src="${esc(e.video)}" autoplay`} poster="${esc(e.poster || "")}" muted playsinline loop></video><span class="exl">${exLab(e)}</span></div>`).join("")}</div>
      <div class="exdots" id="exdots">${exs.map((e, i) => `<i class="${i ? "" : "on"}"></i>`).join("")}</div>${exHint ? `<p class="exhint">${esc(exHint)}</p>` : ""}`;
  sheet(`${prevHtml}
    <div class="row" style="justify-content:space-between"><h3 id="lktitle" style="font-size:22px;font-family:var(--serif);font-weight:400;margin:0">${esc(nameCode(l) + (role === "look" && stabOf(l) === "captions" ? " captions" : ""))}</h3><span class="pill"><span class="dot" style="background:${esc(l.accent)}"></span>${esc(l.role === "motion" && isTemplate(l) ? (l.code === "MG86" ? "Editing template" : "Transition template") : isVfx194(l) ? "Visual effect" : l.book === "female" ? "softer book" : l.book === "male" ? "bolder book" : FAM[l.family] || "")}</span></div>
    ${l.desc ? `<p class="muted" id="lkdesc" style="margin:8px 0 16px;font-size:15px">${esc(String(l.desc).replace(/\s*For him too \(ask for M\d+\)\.?/g, ""))}</p>` : `<div style="height:14px"></div>`}
    ${l.broll ? `<div class="brtag"><i></i>Has spots for your own B-roll (${esc(brollKinds(l))})</div>` : ""}
    <div class="row lookfoot"><button class="btn primary" id="use" style="flex:1">${label}</button><button class="btn line" id="close">Close</button></div>${role === "look" && stabOf(l) === "captions" && !capOn ? `<button class="btn line block" id="use2" type="button" style="margin-top:10px;white-space:normal;height:auto;line-height:1.25;padding-top:11px;padding-bottom:11px">Use these captions, plus secondary simple text</button>` : ""}`);
  $("#close").onclick = closeSheet;
  let exCur = 0;
  { const ex = $("#exs"); if (ex) { let cur = 0; const slides = [...ex.querySelectorAll(".prev")], dots = [...document.querySelectorAll("#exdots i")];
      ex.addEventListener("scroll", () => { clearTimeout(ex.__t); ex.__t = setTimeout(() => {
        const mid = ex.scrollLeft + ex.clientWidth / 2; let best = 0, bd = 1e9;
        slides.forEach((s2, i) => { const d = Math.abs(s2.offsetLeft + s2.offsetWidth / 2 - mid); if (d < bd) { bd = d; best = i; } });
        if (best === cur) return; cur = best; exCur = best;
        { const sc = slides[best] && slides[best].dataset.code, tl = $("#lktitle"); if (tl) tl.textContent = nameCode((sc && byCode(sc)) || l);
          const dl = $("#lkdesc"), dsl = (sc && byCode(sc)) || l; if (dl && dsl.desc) dl.textContent = String(dsl.desc).replace(/\s*For him too \(ask for M\d+\)\.?/g, ""); }   // the Wrap slide shows the Wrap description   // Carousel (F35) / Carousel Wrap (F36)
        slides.forEach((s2, i) => { const v = s2.querySelector("video"); if (!v) return; if (i === best) { if (!v.src && v.dataset.src) v.src = v.dataset.src; tp93(v); } else { try { v.pause(); } catch {} } });
        dots.forEach((d, i) => d.classList.toggle("on", i === best)); }, 90); }, { passive: true }); } }
  $("#use").onclick = () => {
    const pl = (role === "look" && exs[exCur] && exs[exCur].code && byCode(exs[exCur].code)) || l;   // carouselmerge: choosing on the Wrap slide preselects Wrap
    S.draft = mine;
    if (isOn) { S.draft[role] = null; store("draft", S.draft); closeSheet(); if (S.view === "new" || S.view === "looks") render(); toast(l.name + " removed."); return; }
    if (capOn) { if (S.draft.look === code) { S.draft.look = S.draft.look2 || null; } S.draft.look2 = null; if (!S.draft.look) S.draft.lookMode = "surprise" === S.draft.lookMode ? "surprise" : "pick";
      store("draft", S.draft); closeSheet(); render(); toast(l.name + " removed."); return; }
    if (capStep && S.draft.lookMode === "pick" && S.draft.look && byCode(S.draft.look) && S.draft.look !== code) {
      if (S.draft.look2 && byCode(S.draft.look2)) { toast("Up to 2 caption styles. Tap one you picked to remove it."); return; }
      S.draft.look2 = code; if ((S.data && S.data.account || {}).returning) S.draft.changeLook = true; store("draft", S.draft); closeSheet(); render(); toast(l.name + " added."); return; }
    if (role === "hook") S.draft.hook = code; else if (role === "glass") S.draft.glass = code; else if (role === "vine") S.draft.vine = code; else if (role === "motion") { const cur = mgPicks(S.draft); if (cur.includes(code)) { S.draft.motion = cur.filter(c => c !== code); store("draft", S.draft); closeSheet(); if (S.view === "new" || S.view === "looks") render(); toast(l.name + " removed."); return; } if (cur.length + (S.draft.mgCarousel ? 1 : 0) >= 4) { toast("Up to 4 motion graphics. Tap one you picked to remove it."); return; } S.draft.motion = [...cur, code]; }
    else { S.draft.look = pl.code; S.draft.lookMode = "pick"; if (!capStep) S.draft.look2 = null; if ((S.data && S.data.account || {}).returning) S.draft.changeLook = true; }   // [M5 Max MBP] 2026-09-29 sweep50: a returning client choosing a look anywhere (Styles, Home tile) really changes it; renderNew used to reset it to "same"
    store("draft", S.draft); closeSheet();
    // [M5 Max MBP] 2026-09-30 (walkthrough agent): Nick picked a look on step 2 and nothing moved on. Picking a look now shows the check for a
    // moment, then moves on to The specifics by itself (after the B-roll question when the look has B-roll spots).
    const onStep2 = role === "look" && S.view === "new" && S.step === NF.BRIEF;   // 3STEP50 2026-10-26: the brief is ONE screen, picking a look stays on it
    const adv = () => {};
    // FLOW122 (Nick 2026-10-27, doc 122 message 3): "Choose this style" outside New reel starts a new reel with that style pre-chosen. The order
    // stays clips, then title, then the review of this style (every step still changeable). Inside New reel the style just updates in place.
    if (role === "look" && S.view !== "new" && stabOf(pl) === "templates") { S.draft.fromStyle = pl.code; S.draft.single = null; S.draft.tplMg = null; const p = f122(S.draft); p.path = "built"; p.page = "review"; p.ret = ""; store("draft", S.draft); }
    else if (role === "motion" && S.view !== "new" && isTemplate(pl)) { S.draft.tplMg = pl.code; S.draft.fromStyle = null; S.draft.single = null; if (!S.draft.mgMode || S.draft.mgMode === "none") S.draft.mgMode = "pick"; const p = f122(S.draft); p.path = "built"; p.page = "review"; p.ret = ""; store("draft", S.draft); }   // MG78TPL: a template MG (Block Cut) = a built-out style, straight to the review
    else if (S.view !== "new") f122Single(S.draft, pl, role);   // FLOW51b: one caption / motion graphic / hook pick, the client still chooses the rest
    else if (role === "look" && S.view === "new" && f122(S.draft).path === "same") { f122(S.draft).path = "built"; store("draft", S.draft); }
    if (S.view === "new") render(); else go2new(nfResumeStep(S.draft), { __pick: 1 });   // BETHFIX81 [M5 Max MBP] 2026-10-31
    toast(S.draft && S.draft.single && S.view === "new" && S.step === NF.UP ? l.name + " picked. Upload your clips." : role === "look" || (role === "motion" && isTemplate(l) && S.draft.tplMg === code) ? (S.view === "new" && S.step === NF.UP ? "Style chosen. Upload your clips." : l.name + " picked.") : l.name + " added.");   // MG78TPL: a template reads "picked"
    if (S.draft && S.draft.p122 && S.draft.p122.path) {}   // FLOW122: no B-roll pop-up over "Style chosen. Upload your clips"; B-roll is its own choice in the Editing style step
    else if ((role === "look" || role === "motion") && pl.broll) setTimeout(() => { if (document.querySelector("#nf81card")) return; if (!brollOffer(pl, onStep2 ? adv : null) && onStep2) adv(); }, 700);   // BETHFIX81   // [M5 Max MBP] 2026-09-28 broll agent
    else if (onStep2) setTimeout(adv, 900);
  };
  // SIMPLE52 [M5 Max MBP] 2026-10-29 (Nick, on Flower Power): "Use these captions, plus secondary simple text" = the look's captions as hero
  // words with plain secondary text; a per-pick flag (draft.simple[CODE]) that only changes that pick's brief line. The plain button clears it.
  { const u = $("#use"), u2 = $("#use2"); if (u && role === "look" && !capOn) { const base = u.onclick;
      u.onclick = () => { if (mine.simple && mine.simple[code]) { mine.simple = Object.assign({}, mine.simple); delete mine.simple[code]; } base(); };
      if (u2) u2.onclick = () => { mine.simple = Object.assign({}, mine.simple || {}, { [code]: true }); base(); }; } }
}
function lookByName(name) { if (!name) return null; const n = String(name).toLowerCase(); return looks().find(l => l.name.toLowerCase() === n) || looks().find(l => l.name.toLowerCase().split(",")[0].trim() === n.split(",")[0].trim()) || null; }
function flashLook(name) {
  // "Same as last time": show them exactly what last time looked like, over the whole app, for a few seconds
  const l = lookByName(name); if (!l) return;
  const el = document.createElement("div"); el.className = "flash";
  el.innerHTML = `<div class="fv"><video src="${esc(l.video)}" poster="${esc(l.poster)}" muted playsinline loop autoplay></video></div><div class="fl">Last time: ${esc(l.name)}</div><div class="fs">This is the look we will use again. Tap to close.</div>`;
  document.body.appendChild(el);
  const close = () => { el.classList.add("out"); setTimeout(() => el.remove(), 420); };
  el.onclick = close; setTimeout(close, 4200);
}
function sheet(html, onUserClose) { window.__sheetDismiss = onUserClose || null; $("#sheet").innerHTML = `<div class="grab"></div>${html}`; $("#sheet").scrollTop = 0; $("#sheet").style.transform = ""; $("#sheet").classList.add("on"); $("#veil").classList.add("on"); document.documentElement.classList.add("sheetlock"); }
function sheetUserClose() { const cb = window.__sheetDismiss; window.__sheetDismiss = null; closeSheet(); if (cb) try { cb(); } catch {} }   // NEWREEL82 [M5 Max MBP] 2026-10-31
function closeSheet() { window.__sheetDismiss = null; window.__rwFromPromo = false;   // appfix A16 2026-10-03: a sheet closed by backdrop or swipe ends the pop-up path too
  try { window.__shareAbort && window.__shareAbort(); window.__shareAbort = null; } catch {} const sh = $("#sheet"); sh.classList.remove("on"); sh.style.transform = ""; sh.style.transition = ""; $("#veil").classList.remove("on"); document.documentElement.classList.remove("sheetlock"); sh.querySelectorAll("video").forEach(v => v.pause()); }
/* [M5 Max MBP] 2026-09-29 08:10 PDT Nick: "when I have a style opened up and I try to swipe down to get it off, it's actually just
   scrolling the background. The only way I can get off is to tap the top of the screen." Swipe down on the sheet (from its top, or
   anywhere once it is scrolled to the top) drags it down with the finger and closes it past 110px or a quick flick. The page behind
   no longer scrolls while a sheet is open. */
(function(){
  // [M5 Max MBP] 2026-10-07 21:0x Nick TG 21:00 "Don't make it so easy to swipe off. I keep swiping off of it by accident": the close drag
  // starts only on a clearly vertical pull (12 px+, at least 2x more down than sideways), a sideways swipe or any touch that starts on
  // the slides (#exs, swiped sideways) never closes it unless it is plainly a pull down, and closing needs 170 px (or 90 px flicked fast).
  let x0 = 0, onSlides = false;
  let y0 = 0, t0 = 0, dy = 0, drag = false, armed = false, s0 = 0;   // [M5 Max MBP] 2026-09-29 sweep50: s0 = scrollTop at touchstart. A swipe that first scrolls a tall sheet back to its top only starts the close drag from there (it used to count the scrolled part and close at once)
  const sh = () => document.getElementById("sheet");
  document.addEventListener("touchstart", e => { const s = sh(); armed = false; drag = false; dy = 0;
    if (!s || !s.classList.contains("on") || e.touches.length !== 1) return;
    if (!s.contains(e.target) && e.target.id !== "veil") return;
    if (e.target.closest && e.target.closest("input,textarea,select,[contenteditable]")) return;
    armed = true; y0 = e.touches[0].clientY; x0 = e.touches[0].clientX; onSlides = !!(e.target.closest && e.target.closest("#exs, .exs, .strip, .seg, .chips")); t0 = Date.now(); s0 = s.scrollTop; }, { passive: true });
  document.addEventListener("touchmove", e => { const s = sh(); if (!s || !s.classList.contains("on")) return;
    if (e.target.id === "veil") { if (e.cancelable) e.preventDefault(); }          // the dim backdrop never scrolls the page
    if (!armed) return;
    const m = e.touches[0].clientY - y0, mx = Math.abs(e.touches[0].clientX - x0);
    if (!drag && mx > 8 && mx >= m) { armed = false; return; }   // sideways: the slides scroll, the sheet stays
    if (!drag) { if (m > (onSlides ? 24 : 12) && m > 2 * mx && s.scrollTop <= 0) { drag = true; if (s0 > 0) { y0 = e.touches[0].clientY; t0 = Date.now(); } } else { if (m < -6) armed = false; return; } }
    dy = Math.max(0, e.touches[0].clientY - y0); if (e.cancelable) e.preventDefault();
    s.style.transition = "none"; s.style.transform = `translateY(${dy}px)`; }, { passive: false });
  const end = () => { const s = sh(); if (!armed) return; armed = false; if (!drag || !s) return; drag = false;
    s.style.transition = "";
    if (dy > 170 || (dy > 90 && Date.now() - t0 < 250)) sheetUserClose(); else s.style.transform = ""; };
  document.addEventListener("touchend", end, { passive: true }); document.addEventListener("touchcancel", end, { passive: true });
})();
$("#veil").onclick = sheetUserClose;   // NEWREEL82 [M5 Max MBP] 2026-10-31
document.addEventListener("keydown", e => { if (e.key === "Escape" && $("#sheet").classList.contains("on")) sheetUserClose(); });   // [M5 Max MBP] 2026-09-29 sweep: Escape closes a sheet on desktop

/* ---------- new reel: four steps, choices in tandem ---------- */
/* (the step names live with renderNew below, newreel 2026-10-03) */
// [M5 Max MBP] 2026-09-29 12:45 PDT (reflink). Nick: an optional reference link on every new reel, with a choice of copy it exactly or just
// a little like it. Not required. A link with no choice made means inspiration; "Match a reference" in step 2 means exact.
function refUrl(s) { s = (s || "").trim(); if (!s) return ""; if (/\s/.test(s)) return null; const u = /^https?:\/\//i.test(s) ? s : "https://" + s.replace(/^\/+/, "");
  try { const x = new URL(u); return /^[^.]+(\.[^.]+)*\.[a-z]{2,}$/i.test(x.hostname) ? u : null; } catch (e) { return null; } }
function refMatchOf(d) { if (d.lookMode === "reference") return "exact";   // [M5 Max MBP] 2026-09-29 sweep50: the look IS the reference, so "just inspiration" would contradict it
  return d.refMatch === "exact" || d.refMatch === "inspiration" ? d.refMatch : "inspiration"; }
function vtypeOf(d) { const id = (d || {}).videoType; return id ? (S.fmts || []).find(f => f.id === id) || null : null; }   // [M5 Max MBP] 2026-09-29 formats
// [M5 Max MBP] 2026-10-03 11:25 PDT founder story (Nick TG 10:28): a video type that ships an EXAMPLE plays it, with what the client
// gets, the moment it is picked (in the picker and on the step). Vertical / Horizontal toggle when both exist. Never shows a price.
function vtPreview(f, wide) { if (!f || !f.example) return ""; const src = "/" + (wide && f.example_wide ? f.example_wide : f.example);
  return `<div class="card vtprev">${f.badge ? `<span class="vtbadge">${esc(f.badge)}</span>` : ""}
    <video src="${esc(src)}"${f.poster && !wide ? ` poster="/${esc(f.poster)}"` : ""} autoplay muted loop playsinline controls preload="metadata" class="${wide ? "wide" : ""}"></video>
    ${f.example_wide ? `<div class="chips vtasp"><button type="button" data-asp="v" class="${wide ? "" : "on"}">Vertical</button><button type="button" data-asp="w" class="${wide ? "on" : ""}">Horizontal</button></div>` : ""}
    <p class="vthd"><b>${esc(f.label)}</b>: an example we made. Tap the video for sound.</p>
    ${(f.details || []).length ? `<ul class="vtdet">${f.details.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
    ${f.ask ? `<p class="muted vtask">${esc(f.ask)}</p>` : ""}</div>`; }
function vtPreviewWire(root, redraw) { (root || document).querySelectorAll("[data-asp]").forEach(b => b.onclick = e => { e.preventDefault(); e.stopPropagation(); S.vtWide = b.dataset.asp === "w"; redraw(); }); }
function lookLabel(d) { if (d.lookMode === "tell") return "I'll tell you"; return d.lookMode === "same" ? "Same look as last time" : d.lookMode === "surprise" ? "Surprise me" : d.lookMode === "reference" ? "Match my reference" : d.look ? byCode(d.look)?.name : null; }
function summary(d) {
  const bits = [lookLabel(d), intensityOf(d)]; if (vtypeOf(d)) bits.push(vtypeOf(d).label);
  if (d.hook) bits.push(byCode(d.hook)?.name); if (d.glass) bits.push(byCode(d.glass)?.name); if (d.vine) bits.push(byCode(d.vine)?.name); mgPicks(d).forEach(c => bits.push(byCode(c)?.name));
  bits.push(d.captions === "No captions" ? "No captions" : null, d.music === "No music" ? "No music" : null, d.broll.startsWith("Add") ? "B-roll" : null, d.background !== "Keep it as filmed" ? d.background : null, refUrl(d.reference) ? (refMatchOf(d) === "exact" ? "Copy my reference" : "Reference for inspiration") : null, d.notes.trim() ? "Notes" : null);
  return bits.filter(Boolean);
}
function briefText(d) {
  const lines = [];
  if (String(d.title || "").trim()) lines.push("Title: " + String(d.title).trim().replace(/[\r\n]+/g, " ").slice(0, 80));   // namereel 2026-10-02: the reel's required name
  const _scr = String(d.script || "").trim();
  lines.push("Video: " + ([d.uploaded ? "uploaded in the app" : null, d.videoUrl ? "at this link, " + (refUrl(d.videoUrl) || d.videoUrl) : null].filter(Boolean).join("; and also ") || (_scr ? "no footage, make it from my script with an AI voiceover" : "coming through my upload link")));
  if (_scr) lines.push("Script: " + _scr.replace(/\s*[\r\n]+\s*/g, " / ").slice(0, 6000));   // BRIEF50: VO40 reads "Script:" (script only = ElevenLabs voiceover)   // [M5 Max MBP] 2026-09-29 sweep50: the fallback never applied ("Video: " alone)
  { const vt = vtypeOf(d); if (vt) lines.push("Video type: " + vt.name + " (" + vt.id + ")"); else if (d.vtTell) lines.push("Video type: I'll tell you, in my own words below (no type picked)"); }   // [M5 Max MBP] 2026-09-29 formats: the Mac attaches this type's spec as a binding brief
  const l = d.look ? byCode(d.look) : null;
  if (d.lookMode === "same") lines.push("Look: the same look as my last reel" + (lastLook() ? " (" + lastLook() + ")" : ""));
  else if (d.lookMode === "surprise") lines.push("Look: surprise me with a new look");
  else if (d.lookMode === "tell" && d.lookBase && byCode(d.lookBase)) { const b = byCode(d.lookBase); lines.push("Caption style: " + b.name + " (" + askCode(b) + ")"); lines.push("Look direction: keep this look, change only what I describe in my own words below"); }   // LOOKS_SPEC C3 2026-10-13
  else if (d.lookMode === "tell") lines.push("Look: I'll tell you, in my own words below (no style picked)");
  else if (d.lookMode === "reference" && d.refUse === "music") lines.push("Look: your pick (my reference is for the music only, not the look)");   // refuse 2026-10-11
  else if (d.lookMode === "reference") lines.push("Look: please match this reference as closely as you can: " + (refUrl(d.reference) || "(link to follow)"));   // [M5 Max MBP] 2026-10-01 qafix: the cleaned link, same as the Reference video line
  else if (l && d.look2 && byCode(d.look2) && d.look2 !== l.code && d.lookMode === "pick") { const sx = c => (d.simple || {})[c] ? ", as hero words with secondary simple text" : "";   // SIMPLE52
    lines.push("Caption styles: " + l.name + " (" + askCode(l) + ")" + sx(l.code) + " and " + byCode(d.look2).name + " (" + askCode(byCode(d.look2)) + ")" + sx(d.look2) + ", use both"); }   // TWOCAPS52
  else if (l && d.lookMode === "pick" && (d.simple || {})[l.code]) lines.push("Caption style: " + l.name + " (" + askCode(l) + "), as hero words with secondary simple text");   // SIMPLE52
  else if (l) lines.push("Caption style: " + l.name + " (" + askCode(l) + ")");
  else if (d.lookMode === "pick" && tplMgOf(d)) lines.push("Look: no caption style picked, my template below is the look (clean captions that suit my footage)");   // MG78TPL
  else if (d.lookMode === "pick") lines.push("Look: no preset style picked, follow my own words");   // BRIEF50
  if ((d.vtTell || d.lookMode === "tell") && String(d.tell || "").trim()) lines.push("In my own words (my spec, follow it over any video type or style default): " + String(d.tell).trim().replace(/\s*[\r\n]+\s*/g, " / "));   // tellyou 2026-10-11
  if (d.nograin && [d.look, d.look2].includes("M10")) lines.push("Grain: none (deliver with no film grain)");   // NOGRAIN200
  { const iv = intensityOf(d); lines.push("Editing intensity: " + iv + " (" + intensityBlurb(iv).replace(/\.$/, "") + ")"); }   // [M5 Max MBP] 2026-10-01 defaults2
  if (d.hook) { const k = byCode(d.hook); lines.push("Hook style: " + k.name + " (" + k.code.replace("HK", "Hook ") + ")"); }
  if (d.glass && d.captions !== "No captions") lines.push("Add the glass word in " + byCode(d.glass).name.toLowerCase());   // CAPSOFF50: caption decorations ride only with captions on
  if (d.vine && d.captions !== "No captions") lines.push("Add the " + byCode(d.vine).name.toLowerCase());
  if (d.lookMode !== "tell") mgPicks(d).filter(c => !isVfx194(byCode(c))).forEach(c => lines.push("Motion graphics add-on: " + byCode(c).name + " (" + c + "), on top of my caption style"));
  lines.push("Captions: " + (d.captions === "No captions" ? "off" : "on"));
  try { f122Lines(d).forEach(x => lines.push(x)); } catch (e) {}   // FLOW122 2026-10-27: Built-out style / Motion graphics / Editing style / AI extras / Voiceover / Voice / Length / Color / Every clip
  lines.push("Music: " + (f122MusicLine(d) || (d.music === "No music" ? "no music" : "yes, plus a version without music" + (d.musicLink ? ". Use this track if you can: " + d.musicLink : "") + (d.musicNote ? ". I want: " + d.musicNote : ""))));
  lines.push("B-roll: " + (d.broll.startsWith("Add") ? "add b-roll where it helps" : d.brollSet ? "no b-roll, just me on camera" : "not chosen, follow my editing intensity"));
  if (d.broll.startsWith("Add")) { lines.push("B-roll fill: " + brollFillText(d)); if (String(d.brollNote || "").trim()) lines.push("B-roll note: " + String(d.brollNote).trim().replace(/[\r\n]+/g, " ").slice(0, 2000)); }   // [M5 Max MBP] 2026-10-05 brollpick: also sent structured as intent.broll
  if (ringLook(d) && d.ring) lines.push("Carousel ring: " + (d.ring === "own" ? "my own photos or clips that spin around me, sent through my B-roll link" : "choose them for me (my uploads first, otherwise images that match what I say)"));   // [M5 Max MBP] 2026-10-07 carousel2, also structured as intent.broll.ring
  const bp = d.broll.startsWith("Add") ? brollPicks(d) : []; if (bp.length) lines.push("B-roll spots in what I picked: " + bp.map(l => l.name + " (" + l.code + ")").join(", "));
  lines.push("Background: " + f122BgLine(d));   // FLOW122: "Pop Out Effect", lilac canvas, checker, blur, zoom and blur, a color, as filmed, you decide
  { const ru = refUrl(d.reference); if (ru && refUseLine(d)) lines.push("Reference use: " + refUseLine(d)); }   // refuse 2026-10-11
  { const ru = refUrl(d.reference); if (ru) { lines.push("Reference video: " + ru); lines.push("Reference match: " + refMatchOf(d) + (refMatchOf(d) === "exact" ? " (copy it exactly: pacing, caption placement, fonts, colors and structure)" : " (just inspiration, a little like it, keep my caption style)")); } }
  try { l196Lines(d).forEach(x => lines.push(x)); } catch (e) {}   // LONG196 [M5 Max MBP] 2026-11-11: Long video / Shorts / Shorts notes / Format (vertical or horizontal), before the notes
  { const br = briefReel(), fs = footageOf(br); if (fs.length) lines.push("Footage: " + fs.map(x => x.name).join(", ")); }   // appfix A19 2026-10-03: before the notes, so it can never be lost after them
  if ((d.excl || []).length) lines.push("Leave out these clips, they belong to a different video: " + d.excl.join(", "));   // newreel 2026-10-03: unticked in the clips pop-up
  if (d.notes.trim()) lines.push("What matters most: " + d.notes.trim());
  return lines.join("\n");
}
/* ---------- UPLOAD INSIDE THE APP. [M5 Max MBP] 2026-10-11 18:5x PDT (inappupload).
   Nick, Telegram 2026-10-11 18:43: no Dropbox page, no "Nick has requested files from you", no name and email form, and "Waiting for your
   first clip" after the upload already said 100% must never happen again. The signed-in client picks files right here; the phone sends each
   file straight to our Blob store as a MULTIPART upload (8 MB parts, 3 in flight, every part retried with back-off, a fresh token when one
   ages out, the finished parts remembered so a reload resumes the same file). api/upload.js mints the token and registers the finished file
   (c/<k>/up/<id>.json, merged by api/me.js), so the page knows the file is in the instant the last part lands, and the server agrees on the
   next poll, never waiting on the Mac. The Mac (app_blob_pull.py) then feeds the same intake the Dropbox folder feeds.
   Emailed upload links still use the Dropbox file request; the app never opens one. ---------- */
const UPL = { PART: 8 * 1024 * 1024, PAR: 3, API: "https://blob.vercel-storage.com/mpu" };
function upState() { return S.up || (S.up = { items: [], running: false, batch: "" }); }
const upKey = f => [f.name, f.size, f.lastModified || 0].join("|");
function upResume(f, v) { const all = fetchStore("upres", {}); const key = upKey(f);
  if (v === undefined) { const r = all[key]; return r && Date.now() - (r.t || 0) < 20 * 3600000 ? r : null; }
  if (v) all[key] = Object.assign({}, v, { t: Date.now() }); else delete all[key];
  for (const x of Object.keys(all)) if (Date.now() - (all[x].t || 0) > 24 * 3600000) delete all[x];
  store("upres", all); }
async function upApi(body) {
  const r = await fetch("/api/upload", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(Object.assign({ k: K }, body)) });
  let j = null; try { j = await r.json(); } catch {}
  if (!r.ok || !j || !j.ok) { const e = new Error((j && j.error) || "Upload server " + r.status); e.status = r.status; throw e; }
  return j;
}
function upXhr(it, headers, body, onProg) {
  return new Promise((res, rej) => {
    const x = new XMLHttpRequest(); x.open("POST", UPL.API + "?pathname=" + encodeURIComponent(it.pathname));
    Object.entries(Object.assign({ authorization: "Bearer " + it.token, "x-api-version": "11" }, headers)).forEach(([k, v]) => x.setRequestHeader(k, v));
    x.timeout = 300000;
    if (onProg && x.upload) x.upload.onprogress = e => onProg(e.loaded);
    x.onload = () => { let j = null; try { j = JSON.parse(x.responseText); } catch {} if (x.status >= 200 && x.status < 300 && j) res(j); else { const e = new Error("blob " + x.status + " " + String(x.responseText || "").slice(0, 120)); e.status = x.status; rej(e); } };
    x.onerror = () => rej(Object.assign(new Error("network"), { status: 0 })); x.ontimeout = () => rej(Object.assign(new Error("timeout"), { status: 0 }));
    x.send(body);
  });
}
async function upRetry(it, fn, label) {
  for (let i = 0; ; i++) {
    if (it.cancel) throw new Error("cancelled");
    try { return await fn(); } catch (e) {
      if (i >= 9) throw e;
      // STRESS193E [M5 Max MBP] 2026-11-09 2:08 PM PST: a plain refusal from our own upload API (400 bad type or size, 404, 409, 413, 415, 422) is
      // final. It used to be retried 10 times as "Connection hiccup, retrying..." (about 2.5 minutes) before the row showed the server's words.
      // Now the row fails at once with that text (upRun shows e.message and sends the upfail event). 401/403/429/5xx/0 still retry as before.
      if ([400, 404, 409, 413, 415, 422].includes(e.status)) throw e;
      if (e.status === 401 || e.status === 403) { try { it.token = (await upApi({ action: "token", pathname: it.pathname })).token; it.tokAt = Date.now(); } catch {} }
      it.msg = navigator.onLine === false ? "Waiting for internet..." : "Connection hiccup, retrying..."; upPaint(it);
      await new Promise(r => setTimeout(r, Math.min(30000, 1000 * Math.pow(2, i))));
      it.msg = ""; }
  }
}
async function upOne(it) {
  const f = it.file; it.state = "up"; it.msg = ""; upPaint(it);
  let rs = upResume(f);
  if (rs && rs.pathname && rs.key && rs.uploadId && rs.reel === it.reel) { Object.assign(it, { pathname: rs.pathname, key: rs.key, uploadId: rs.uploadId, parts: rs.parts || {} });
    it.token = (await upRetry(it, () => upApi({ action: "token", pathname: it.pathname }))).token; it.tokAt = Date.now(); }
  else {
    const st = await upRetry(it, () => upApi({ action: "start", name: f.name, size: f.size, type: f.type, reel: it.reel, batch: it.batch, of: it.of, kind: it.kind }));   // [M5 Max MBP] 2026-10-26 09:38 PDT SWEEP2: the same reel / batch / of as the done call, so api/upload.js can write the upstart record the Mac's ledger matches
    Object.assign(it, { pathname: st.pathname, token: st.token, tokAt: Date.now(), ctype: st.type, parts: {} });
    // UPLOADE2E50 [M5 Max MBP] 2026-10-27 11:06 PDT: Vercel Blob's CORS preflight no longer allows x-add-random-suffix
    // (Access-Control-Allow-Headers dropped it), so the browser refused every create and NO app upload could start. The random suffix
    // is already in the client token (api/upload.js clientToken addRandomSuffix: true), and the store still adds it without this header.
    const c = await upRetry(it, () => upXhr(it, { "x-mpu-action": "create", "x-content-type": f.type || st.type || "application/octet-stream" }, null));
    it.key = c.key; it.uploadId = c.uploadId; upResume(f, { pathname: it.pathname, key: it.key, uploadId: it.uploadId, parts: {}, reel: it.reel });
  }
  const n = Math.max(1, Math.ceil(f.size / UPL.PART)), live = {};
  const sentNow = () => Object.keys(it.parts).reduce((a, p) => a + Math.min(UPL.PART, f.size - (p - 1) * UPL.PART), 0) + Object.values(live).reduce((a, b) => a + b, 0);
  it.sent = sentNow(); upPaint(it);
  const todo = []; for (let p = 1; p <= n; p++) if (!it.parts[p]) todo.push(p);
  const worker = async () => { while (todo.length) { const p = todo.shift();
    if (Date.now() - (it.tokAt || 0) > 60 * 60000) { try { it.token = (await upApi({ action: "token", pathname: it.pathname })).token; it.tokAt = Date.now(); } catch {} }
    const blob = f.slice((p - 1) * UPL.PART, Math.min(f.size, p * UPL.PART));
    const r = await upRetry(it, () => { live[p] = 0; return upXhr(it, { "x-mpu-action": "upload", "x-mpu-key": encodeURIComponent(it.key), "x-mpu-upload-id": it.uploadId, "x-mpu-part-number": String(p) }, blob, l => { live[p] = l; it.sent = sentNow(); upPaint(it); }); });
    delete live[p]; it.parts[p] = r.etag; it.sent = sentNow(); upPaint(it);
    upResume(f, { pathname: it.pathname, key: it.key, uploadId: it.uploadId, parts: it.parts, reel: it.reel }); } };
  await Promise.all(Array.from({ length: Math.min(UPL.PAR, n) }, worker));
  it.msg = "Finishing..."; upPaint(it);
  const parts = Object.keys(it.parts).map(Number).sort((a, b) => a - b).map(p => ({ partNumber: p, etag: it.parts[p] }));
  const done = await upRetry(it, () => upXhr(it, { "x-mpu-action": "complete", "x-mpu-key": encodeURIComponent(it.key), "x-mpu-upload-id": it.uploadId, "content-type": "application/json" }, JSON.stringify(parts)));
  const reg = await upRetry(it, () => upApi({ action: "done", pathname: it.pathname, url: done.url, name: f.name, size: f.size, reel: it.reel, batch: it.batch, of: it.of, kind: it.kind }));
  upResume(f, null);
  if (it.idb) { try { fl111Del(it.idb); } catch {} }   // FILMLUMI111: the take is safe on the server, drop the phone copy
  it.state = "done"; it.sent = f.size; it.msg = ""; it.up = reg.id; it.at = Math.floor(Date.now() / 1000);
  const d = S.data || {}; d.uploads = [{ id: reg.id, name: f.name, size: f.size, at: it.at, reel: it.reel, batch: it.batch, of: it.of, kind: it.kind }, ...(d.uploads || []).filter(x => x.id !== reg.id)];
  upPaint(it);
}
// Pick files -> queue them -> upload one file at a time (3 parts in flight). opts: { reel: "new" | reel id, kind: "footage", onAll }
function upAdd(files, opts) {
  opts = opts || {}; const u = upState(); files = [...(files || [])].filter(f => f && f.size > 0); if (!files.length) return;
  const batch = opts.batch || (Date.now().toString(36) + Math.random().toString(36).slice(2, 6));   // FILMLUMI111 [M5 Max MBP] 2026-11-01: Film with Lumi takes join their session's batch
  files.forEach((f, i) => u.items.push({ lid: batch + "_" + (opts.lid || "") + i, file: f, name: f.name, size: f.size, sent: 0, state: "wait", msg: "", reel: opts.reel || "new", kind: opts.kind || "footage", batch, of: opts.of || files.length, idb: (opts.idb || [])[i] || "" }));
  if ((opts.kind || "footage") === "footage") files.forEach(f => { try { upThumbMake(f); } catch {} });   // NEWREEL82 [M5 Max MBP] 2026-10-31
  u.onAll = opts.onAll || u.onAll;
  try { send({ kind: "adding", reel: opts.reel || "new", ...((opts.reel || "new") === "new" ? { batch } : {}) }); } catch {}
  // ISS-393 durable [M5 Max MBP] 2026-10-13: a New-reel draft remembers its upload batch ids; its brief sends them, so the Mac pairs this
  // brief with THESE clips by id, never by order (a late brief used to land on another session's reel).
  if ((opts.reel || "new") === "new") { try { const dr = S.draft || (S.draft = { ...DEFAULT_DRAFT(), ...fetchStore("draft", {}) }); dr.batches = [...new Set([...(dr.batches || []), batch])].slice(-10); store("draft", dr); } catch {} }
  upRun();
}
async function upRun() {
  const u = upState(); if (u.running) return; u.running = true;
  let wl = null; try { if (navigator.wakeLock) wl = await navigator.wakeLock.request("screen"); } catch {}
  try { for (let it; (it = u.items.find(x => x.state === "wait")); ) {
      try { await upOne(it); } catch (e) { it.state = "fail"; it.msg = String((e && e.message) || "Upload failed").replace(/^blob \d+ ?/, "") || "Upload failed";
        try { send({ kind: "upfail", reel: it.reel, text: it.name + " (" + nfMb(it.size) + "): " + it.msg }); } catch {} upPaint(it); } } }
  finally { u.running = false; try { wl && wl.release(); } catch {} }
  upPaint(null, true);
  if (u.items.length && u.items.every(x => x.state === "done") && u.onAll) { const f = u.onAll; u.onAll = null; try { f(u.items); } catch {} }
}
function upRetryFailed() { upState().items.forEach(x => { if (x.state === "fail") { x.state = "wait"; x.msg = ""; } }); upRun(); }
function upRow(it) {
  const pct = it.size ? Math.min(100, Math.floor(it.sent / it.size * 100)) : 0;
  const st = it.state === "done" ? "Uploaded" : it.state === "fail" ? (it.msg || "Did not finish") : it.state === "wait" ? "Waiting" : it.msg || (nfMb(it.sent) + " of " + nfMb(it.size));
  const t82 = upThumbGet(it.name);   // NEWREEL82 [M5 Max MBP] 2026-10-31
  return `<li class="uprow ${it.state}" id="upr-${esc(it.lid)}" data-st="${it.state}"><span class="ck">${it.state === "done" ? "✓" : it.state === "fail" ? "!" : ""}</span>${t82 ? `<img class="upt" src="${esc(t82)}" alt="">` : ""}<span class="upm"><span class="upn"><span class="nm">${esc(it.name)}</span><small class="upp">${it.state === "done" ? "100%" : pct + "%"}</small></span>
    <span class="nfbar${it.state === "done" ? " full" : ""}"><i style="width:${it.state === "done" ? 100 : pct}%"></i></span><small class="ups">${esc(st)}</small></span></li>`;
}
// Repaint one row in place (no full redraw while bytes move); a state change redraws the screen it is on.
function upPaint(it, all) {
  try { if (HO178.t) ho178Up(!!all || !!(it && it.state !== "up")); } catch {}   // HANDOFF178 [M5 Max MBP] 2026-11-05 7:58 PM PST: mirror this upload on the Mac
  const u = upState();
  if (it) { const el = document.getElementById("upr-" + it.lid);
    if (el && !all && it.state === el.dataset.st) { const pct = it.size ? Math.min(100, Math.floor(it.sent / it.size * 100)) : 0;
      el.querySelector(".nfbar i").style.width = (it.state === "done" ? 100 : pct) + "%"; el.querySelector(".upp").textContent = (it.state === "done" ? 100 : pct) + "%";
      el.querySelector(".ups").textContent = it.state === "done" ? "Uploaded" : it.msg || (nfMb(it.sent) + " of " + nfMb(it.size)); upHead(); return; }
    if (el) { el.outerHTML = upRow(it); const n = document.getElementById("upr-" + it.lid); if (n) n.dataset.st = it.state; } }
  upHead();
  if ((all || (it && it.state !== "up")) && S.view === "new" && S.step === NF.UP && !document.querySelector(".titlepop, #sheet.on")) render();
  if (window.__upSheetPaint) try { window.__upSheetPaint(); } catch {}
  if (window.__fl111Paint) try { window.__fl111Paint(); } catch {}   // FILMLUMI111: the takes strip on the camera
}
// UPKINDS50 [M5 Max MBP] 2026-10-29 (Nick: "two video clips and four JPEGs and it says uploading six clips"): name what is actually uploading.
function upKinds(list) {
  let v = 0, p = 0, au = 0;
  (list || []).forEach(x => { const t = String((x && x.file && x.file.type) || ""), nm = String((x && (x.name || x)) || "").toLowerCase();
    if (/^image\//.test(t) || /\.(jpe?g|png|heic|heif|webp|gif)$/.test(nm)) p++; else if (/^audio\//.test(t) || /\.(m4a|mp3|wav|aac)$/.test(nm)) au++; else v++; });
  const parts = []; if (v) parts.push(v + (v === 1 ? " video" : " videos")); if (p) parts.push(p + (p === 1 ? " photo" : " photos")); if (au) parts.push(au + (au === 1 ? " audio file" : " audio files"));
  return parts.length ? parts.join(" and ") : "0 files";
}
function upHead() { const u = upState(), h = document.getElementById("uphead"); if (!h) return;
  const its = S.view === "new" ? upList(nfUpReel()) : u.items, rows = S.view === "new" ? document.querySelectorAll("#nfprog .nffiles li").length : 0;   // NEWREEL82 [M5 Max MBP] 2026-10-31: the clips this screen lists
  const tot = its.reduce((a, x) => a + x.size, 0), snt = its.reduce((a, x) => a + (x.state === "done" ? x.size : x.sent), 0);
  const done = its.filter(x => x.state === "done").length;
  h.querySelector("b").textContent = its.length && done === its.length ? (rows ? `Got your ${rows} clip${rows === 1 ? "" : "s"}` : `Got your ${upKinds(its)}`) : `Uploading ${upKinds(its)}`;
  h.querySelector("span").textContent = tot ? Math.min(100, Math.floor(snt / tot * 100)) + "%" : ""; }
/* NEWREEL82 [M5 Max MBP] 2026-10-31 12:3x PDT. Nick TG 12:01 (his own iPhone): he uploaded IMG_9843.mov, named the reel "Lumi advertisement" and sent its brief
   (job ..1793473135, in the edit). New reel then showed "Got your 0 clips" with IMG_9843.mov listed as Uploaded 100%. ROOT CAUSE: sending a brief
   reset the draft (S.draft) but never this phone's in-memory upload list (S.up.items, reel "new"), so upList("new") kept listing the sent reel's
   clip in the next reel, while the count came from a different source (nfFacts: the server's arrivals, where that clip is already "spoken for"
   by the briefed reel) = 0. Before the server caught up the same clip even COUNTED for the new reel. Now: a New-reel upload belongs to the draft
   whose batch started it (dr.batches); a sent brief marks its batches sent (store "sentb") and drops their finished rows; the next draft starts
   with freshAt, so nothing uploaded before it counts; and the count is always the number of clips listed. */
/* NEWREEL82 [M5 Max MBP] 2026-10-31 step 2. Nick TG 12:0x: "if someone uploads a video and they don't actually do the brief and they close the app ... They need to be
   able to click out of that dialog popup box ... that should just go in a draft section ... in the Add New Reel there's a draft section ... It also
   needs to have thumbnail images of the actual clips". DRAFTS = reels with clips and no brief: the server's (needsBrief) and this phone's own
   (clips uploaded before the Mac made their reel, stashed as "b:<batch>"). Each card: clip thumbnails + names, Continue, Delete draft. Delete is
   the client's choice: the server closes that unbriefed reel (concierge on_choice draft_delete, never a file deleted). Thumbnails: the Mac's
   posters, else a first frame this phone grabbed when the clip was picked (upThumbMake, kept in localStorage "upthumb", 40 newest). */
function upThumbAll() { const m = fetchStore("upthumb", null); return m && typeof m === "object" ? m : {}; }
function upThumbGet(name) { if (!name) return ""; const m = upThumbAll(); let x = m[String(name)];
  if (!x) { const k = String(name).toLowerCase().replace(/[^a-z0-9.]+/g, ""); const hit = Object.keys(m).find(n => n.toLowerCase().replace(/[^a-z0-9.]+/g, "") === k); x = hit && m[hit]; }   // INSTANTPV117b: the server may write the name a little differently
  return (x && x.u) || ""; }
function upThumbPut(name, u) { const m = upThumbAll(); m[name] = { u, t: Date.now() }; Object.keys(m).sort((a, b) => (m[b].t || 0) - (m[a].t || 0)).slice(40).forEach(k => delete m[k]); store("upthumb", m); }
function upThumbPaint(name, u) {
  const nk = s => String(s || "").toLowerCase().replace(/[^a-z0-9.]+/g, ""), k = nk(name);   // INSTANTPV117b: same tolerant name match as upThumbGet
  document.querySelectorAll(".uprow").forEach(li => { if (nk((li.querySelector(".nm") || {}).textContent) === k && !li.querySelector(".upt")) { const im = document.createElement("img"); im.className = "upt"; im.alt = ""; im.src = u; li.querySelector(".ck").after(im); } });
  document.querySelectorAll(".nfclip").forEach(l => { if (nk((l.querySelector("small") || {}).textContent) === k && !l.querySelector(".nfth img")) { const im = document.createElement("img"); im.alt = ""; im.src = u; l.querySelector(".nfth").prepend(im); const ph = l.querySelector(".nfph"); if (ph) ph.textContent = "Your clip"; } });
  document.querySelectorAll(".nf82th figure").forEach(fg => { const im0 = fg.querySelector(".im"); if (im0 && !im0.querySelector("img") && nk((fg.querySelector("figcaption") || {}).textContent) === k) im0.innerHTML = `<img src="${esc(u)}" alt="">`; });
}
let upThumbQ = Promise.resolve(), upThumbN = 0;
/* INSTANTPV117b [M5 Max MBP] 2026-11-01 5:3x PM PST (Nick 5:20 PM, iPhone home-screen app: "Still not getting a thumbnail", IMG_9615.mov). The frame
   grab used to wait in a queue, so play() ran after the tap was over: iPhone (Low Power Mode, home-screen app) then refuses to play and never
   decodes a frame. Now a clip's grab STARTS inside the tap (up to 3 at once, the rest queue), plays muted inline, and takes the first frame that
   arrives by any route: a seek to 0.5 s, requestVideoFrameCallback, playback past 0.3 s, or 1.5 s after the first frame loads. A .mov with an
   empty File.type still goes the video way. The Mac's poster stays the fallback. */
function upThumbMake(f) { if (!f || !f.name || upThumbGet(f.name)) return;
  const isImg = /^image\//.test(f.type || "") || /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(f.name), isAud = /^audio\//.test(f.type || "") || /\.(m4a|mp3|wav|aac)$/i.test(f.name);
  if (isAud) return;
  const run = () => new Promise(res => { let url = "", over = false, vEl = null; const fin = () => { if (over) return; over = true; try { vEl && vEl.pause(); } catch {} try { URL.revokeObjectURL(url); } catch {} try { vEl && vEl.remove(); } catch {} res(); };   // the hidden video leaves the page, its object URL is freed
    const grab = src => { if (over) return; try { const sw = src.videoWidth || src.naturalWidth, sh = src.videoHeight || src.naturalHeight; if (sw && sh) { const w = 160, h = Math.max(80, Math.min(340, Math.round(w * sh / sw)));
        const c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d").drawImage(src, 0, 0, w, h); const u = c.toDataURL("image/jpeg", 0.66); if (u.length > 300) { upThumbPut(f.name, u); upThumbPaint(f.name, u); } else return; } else return; } catch { return; } fin(); };
    try { url = URL.createObjectURL(f); } catch { return res(); }
    setTimeout(fin, 15000);
    if (isImg) { const im = new Image(); im.onload = () => { grab(im); fin(); }; im.onerror = fin; im.src = url; return; }
    const v = document.createElement("video"); v.muted = true; v.defaultMuted = true; v.playsInline = true; v.setAttribute("playsinline", ""); v.setAttribute("webkit-playsinline", ""); v.setAttribute("muted", ""); v.preload = "auto";
    v.style.cssText = "position:fixed;left:0;top:0;width:8px;height:8px;opacity:0.01;pointer-events:none;z-index:-1"; try { document.body.appendChild(v); vEl = v; } catch {}
    let tries = 0; const dark = () => { try { const c = document.createElement("canvas"); c.width = 8; c.height = 8; const x = c.getContext("2d"); x.drawImage(v, 0, 0, 8, 8); const p = x.getImageData(0, 0, 8, 8).data; let t = 0; for (let k = 0; k < p.length; k += 4) t += p[k] + p[k + 1] + p[k + 2]; return t / (64 * 3) < 10; } catch { return false; } };
    v.onloadedmetadata = () => { try { v.currentTime = Math.min(0.5, (v.duration || 1) / 3); } catch {} };
    v.onloadeddata = () => setTimeout(() => { if (!over && v.readyState >= 2) grab(v); }, 1500);
    v.ontimeupdate = () => { if (!over && v.currentTime > 0.3 && v.readyState >= 2 && !dark()) grab(v); };
    if (typeof v.requestVideoFrameCallback === "function") { const cb = () => { if (over) return; if (v.readyState >= 2 && v.currentTime > 0.2 && !dark()) grab(v); else try { v.requestVideoFrameCallback(cb); } catch {} }; try { v.requestVideoFrameCallback(cb); } catch {} }
    v.onseeked = () => setTimeout(() => { if (over) return; if (dark() && tries++ < 2) { try { v.currentTime = Math.min((v.duration || 2) / 2, tries * 0.6); return; } catch {} } grab(v); }, 180); v.onerror = fin; v.src = url;
    try { v.load(); } catch {}
    try { const pp = v.play(); if (pp && pp.catch) pp.catch(() => {}); } catch {} });
  if (!isImg && upThumbN < 3) { upThumbN++; run().then(() => { upThumbN--; }); return; }   // inside the tap
  upThumbQ = upThumbQ.then(run); }
function nf82Strip(clips) { clips = (clips || []).slice(0, 8); if (!clips.length) return "";
  return `<div class="nf82th">${clips.map(c => `<figure><div class="im">${c.thumb ? `<img src="${esc(c.thumb)}" alt="" onerror="this.remove()">` : "Preview on its way"}</div><figcaption>${esc(c.name || "")}</figcaption></figure>`).join("")}</div>`; }
function nf82Del() { const a = fetchStore("nfdel", null) || {}; return { ids: Array.isArray(a.ids) ? a.ids : [], b: Array.isArray(a.b) ? a.b : [] }; }
function nfDrafts() {
  const d = S.data || {}; if (!d || S.guest || !Array.isArray(d.reels)) return [];
  const cur = receivedReel(), curId = cur ? cur.id : "", del = nf82Del(), delB = new Set(del.b.map(String)), out = [];
  const byRaw = {}, byUp = {}; (((d.arrivals || {}).files) || []).forEach(f => { if (f && f.raw) byRaw[f.raw] = f; if (f && f.up) byUp[f.up] = f; });
  const upB = id => id ? String(((d.uploads || []).find(u => u && u.id === id) || {}).batch || "") : "";
  const m = fetchStore("draftfor", {}) || {}, titled = fetchStore("titled", {}) || {};
  const loc = Object.keys(m).filter(k => k.startsWith("b:")).map(k => { const dr = m[k] || {}, bs = new Set((dr.batches || []).map(String));
    const ups = (d.uploads || []).filter(u => u && u.batch && bs.has(String(u.batch)) && (u.reel || "new") === "new" && (!u.kind || u.kind === "footage"));
    return { k, dr, bs, ups, raws: new Set(ups.map(u => (byUp[u.id] || {}).raw).filter(Boolean)) }; });
  (d.reels || []).forEach(r => {
    if (!r || !r.id || !needsBrief(r) || !(r.files || []).length || del.ids.includes(r.id)) return;
    const fs = (r.files || []).map(nf81Base), rb = new Set([...landedBatches(r), ...fs.map(x => upB((byRaw[x] || {}).up))].filter(Boolean).map(String));
    if ([...rb].some(b => delB.has(b))) { nf82ServerDelete(r.id); return; }   // a phone draft deleted before the Mac made its reel: close the reel too
    const l = loc.find(x => !x.used && (fs.some(f => x.raws.has(f)) || [...rb].some(b => x.bs.has(b))));
    if (l) { l.used = true; nfStash(r.id, Object.assign({}, l.dr, { briefFor: r.id })); nfUnstash(l.k); nfSetAside(r); }   // its reel arrived: the draft lives on it now
    if (r.id === curId && !nfIsAside(r)) return;
    const st = (fetchStore("draftfor", {}) || {})[r.id] || {};
    out.push({ id: r.id, at: (Number(r.updated) || 0) * 1000, title: String(titled[r.id] || (r.titled && r.title && !GENERIC_TITLE.test(String(r.title).trim()) ? r.title : "") || st.title || "").trim(),
      clips: footageOf(r).map(x => { const a = byRaw[x.name] || {}; return { name: a.name || x.name, thumb: footPoster(x) || a.thumb || upThumbGet(a.name) }; }) });
  });
  loc.filter(x => !x.used && x.ups.length && ![...x.bs].some(b => delB.has(b))).forEach(x => out.push({ id: x.k, local: true, batches: [...x.bs], at: Number(x.dr.at) || 0, title: String(x.dr.title || "").trim(),
    clips: x.ups.map(u => ({ name: u.name, thumb: (byUp[u.id] || {}).thumb || upThumbGet(u.name) })) }));
  return out.sort((a, b) => (b.at || 0) - (a.at || 0));
}
function nf82DraftsHtml() { let ds = []; try { ds = nfDrafts(); } catch {} if (!ds.length) return "";
  return `<section class="nf82drafts" id="nf82drafts"><h3>Drafts</h3><p class="muted">Reels you started but have not briefed yet. Nothing is edited until you finish the brief.</p>${ds.map(x =>
    `<div class="nf82card" data-d82="${esc(x.id)}">${nf82Strip(x.clips)}<b>${esc(x.title || "Untitled draft")}</b><small>${x.clips.length} clip${x.clips.length === 1 ? "" : "s"}: ${esc(x.clips.slice(0, 2).map(c => c.name).join(", "))}${x.clips.length > 2 ? " and " + (x.clips.length - 2) + " more" : ""}</small>
      <div class="row"><button type="button" class="btn sm primary" data-d82go="${esc(x.id)}">Continue</button><button type="button" class="btn sm line" data-d82del="${esc(x.id)}">Delete draft</button></div></div>`).join("")}</section>`; }
function nf82Bind() { document.querySelectorAll("[data-d82go]").forEach(b => b.onclick = () => nf82Continue(b.dataset.d82go)); document.querySelectorAll("[data-d82del]").forEach(b => b.onclick = () => nf82DeleteAsk(b.dataset.d82del)); }
function nf82Continue(id) {
  if (String(id).startsWith("b:")) { const back = nfUnstash(id); if (!back) return render();
    const bs = new Set((back.batches || []).map(String)), names = new Set(((S.data || {}).uploads || []).filter(u => u && bs.has(String(u.batch))).map(u => u.name)), a = nfAside();
    a.files = a.files.filter(x => !names.has(x)); store("nfaside", a);
    S.briefFor = null; S.reel = null; S.sent = false; S.draft = { ...DEFAULT_DRAFT(), ...back, briefFor: "" }; store("draft", S.draft); if (!String(S.draft.title || "").trim()) S.draft.popped = false;
    go("new", { step: nfResumeStep(S.draft), __nfok: 1 }); if (!String(S.draft.title || "").trim()) setTimeout(() => { if (S.view === "new") nfClipsPop(S.draft); }, 400); return; }
  openBrief(id); }
function nf82DeleteAsk(id) { const x = nfDrafts().find(z => z.id === id); if (!x) return;
  sheet(`<button type="button" class="nf82x" id="nf82dx" aria-label="Close">×</button><h3 style="font-size:24px;font-family:var(--serif);font-weight:400;margin:0 44px 6px 0">Delete this draft?</h3>
    <p class="muted" style="margin:0 0 10px"><b>${esc(x.title || "This draft")}</b> will not be edited. Your clips stay safe with us, nothing is erased, and you can upload them again any time.</p>${nf82Strip(x.clips)}
    <div class="row" style="margin-top:12px;gap:8px"><button class="btn primary" id="d82yes" type="button" style="flex:1">Delete draft</button><button class="btn line" id="d82no" type="button" style="flex:1">Keep it</button></div>`);
  $("#d82no").onclick = closeSheet; $("#nf82dx").onclick = closeSheet;
  $("#d82yes").onclick = async () => { closeSheet(); const del = nf82Del();
    if (x.local) { del.b = [...new Set([...del.b, ...(x.batches || []).map(String)])].slice(-60); store("nfdel", del); nfUnstash(x.id); toast("Draft deleted."); render(); return; }
    del.ids = [...new Set([...del.ids, x.id])].slice(-60); store("nfdel", del); nfUnstash(x.id); render();
    const ok = await send({ kind: "choice", choice: "draft_delete", reel: x.id, text: "Delete draft" });
    if (ok) toast("Draft deleted."); else { const d2 = nf82Del(); d2.ids = d2.ids.filter(i => i !== x.id); store("nfdel", d2); render(); } }; }
function nf82ServerDelete(id) { const del = nf82Del(); if (del.ids.includes(id)) return; del.ids = [...del.ids, id].slice(-60); store("nfdel", del);
  try { sendQuiet({ kind: "choice", choice: "draft_delete", reel: id, text: "Delete draft" }); } catch {} }
function nf82Dismiss(ip, keepStyle) { if (!ip || ip.busy) return; try { nfFresh(ip, !!keepStyle); toast("Saved in Drafts at the top of New reel."); if (S.view === "new") render(); } catch {} }
function nf82PopDismiss(o, dr, opts) { o.remove();
  if ((opts && opts.noMore) || String(dr.title || "").trim()) { dr.popped = true; store("draft", dr); return; }
  const ip = nfInProg(); if (!ip || ip.busy) { dr.popped = true; store("draft", dr); return; }
  nfFresh(ip, true); S.sent = false; S.step = 1; toast("Saved in Drafts. Continue it any time from New reel.");
  if (S.view === "new") { setPageY(0); render(); } else go("new", { step: 1, __nfok: 1 }); }
function upList(reel) { const u = upState(), r = reel || "new";
  if (r !== "new") return u.items.filter(x => (x.reel || "new") === r);
  const bs = nf82Mine(); return u.items.filter(x => (x.reel || "new") === "new" && !x.sent82 && !!x.batch && bs.has(String(x.batch))); }
function nf82Mine() { try { const dr = S.draft || fetchStore("draft", {}) || {}; return new Set((dr.batches || []).map(String)); } catch { return new Set(); } }
function nf82Sent() { const a = fetchStore("sentb", null); return new Set(Array.isArray(a) ? a.map(String) : []); }
function nf82AfterSend(dr, br, bts) { try { const bs = [...new Set([...(dr.batches || []), ...(bts || [])].map(String))];
    store("sentb", [...new Set([...nf82Sent(), ...bs])].slice(-80)); const set = new Set(bs), u = upState();
    u.items.forEach(x => { if (((x.reel || "new") === "new" && x.batch && set.has(String(x.batch))) || (br && x.reel === br.id)) x.sent82 = true; });
    u.items = u.items.filter(x => !(x.sent82 && x.state === "done")); } catch {} }   // still-running uploads of the sent reel finish for THAT reel, hidden here
// The server's record of what this account uploaded in the app (api/me.js, d.uploads), plus what this phone just finished, as arrivals
// rows. A row the Mac has already taken (its arrivals entry carries the same up id) is not counted twice.
function upArrivals(d, reel, keep) {   // BETHFIX81: keep(row) = this reel's upload session (nfFacts)
  const arr = (d && d.arrivals) || { at: 0, files: [] }, have = new Set((arr.files || []).map(f => f && f.up).filter(Boolean));
  const mineDone = upList(reel).filter(x => x.state === "done" && x.up && (!keep || keep(x))).map(x => ({ id: x.up, name: x.name, size: x.size, at: x.at, reel: x.reel, kind: x.kind }));
  const seen = new Set(), rows = [];
  for (const x of [...mineDone, ...((d && d.uploads) || [])]) { if (!x || !x.id || (keep && !keep(x)) || seen.has(x.id) || have.has(x.id) || (x.kind && x.kind !== "footage") || (x.reel || "new") !== (reel || "new")) continue; seen.add(x.id);
    rows.push({ name: x.name, size: x.size, mt: x.at, state: "uploaded", up: x.id }); }
  if (!rows.length) return arr;
  return { at: Math.max(Number(arr.at) || 0, ...rows.map(r => r.mt)), files: [...(arr.files || []), ...rows] };
}

/* ---------- NEW REEL, ONE SMALL STEP AT A TIME. [M5 Max MBP] 2026-10-03 11:4x PDT (newreel agent).
   Nick, Telegram 2026-10-03 10:32: "There's no way for me to really feel like I just did the right thing ... maybe there should be an upload
   bar ... Once that bar hits 100% it says Next ... It's not clear that we have to scroll all the way down to see what type of video this is ...
   I would rather that be in a pop-up dialog box ... dopamine hits of small increments of progress ... If people have no notes ... a Skip
   button." 10:56: "just upload the footage and then have a dialog box pop up with thumbnails of the clips that they uploaded ... 'Required:
   Please enter the title of your video,' and then the Next button gets them into the brief." 11:00: a reel left mid-way shows "Start your
   brief" and the flow picks up at the right step.
   The order: 1 Clips (upload, live per-clip ticks from the Mac's arrivals fast path) -> pop-up: these clips + the required title ->
   2 Type (pop-up, required) -> 3 Look -> 4 Notes (optional, Skip) -> Start editing (celebration, then the reel sits on Home).
   Honest about uploading: it happens on the client's own Dropbox file request page in another tab; this page cannot see bytes in flight,
   so it says so, and ticks each clip off the moment it is with us. ---------- */
// 3STEP50 [M5 Max MBP] 2026-10-26 19:50 PDT (Nick TG 7:46 pm + 7:48 pm): THREE steps. 1 Clips, 2 Title (the clips pop-up), 3 Your brief
// (ONE screen: pick a look, OR customize captions + motion graphics + b-roll + music, OR write it in their own words; reference link optional).
// No video type step, no second look step, no "I'll tell you instead" detour, no Founder Story. Internally: step 1 = clips (+ title pop), 2 = brief.
const STEPS = ["Clips", "Title", "Brief"];
const NF = { UP: 1, BRIEF: 2, LAST: 2 };
/* NF-PURE-START (tests_newreel.py runs these in node, verbatim) */
// The clips of THIS upload: what the Mac's watcher has seen in the client's folder since they tapped Upload (2 min of slack), never a
// duplicate or a refused file. recv = the files of the reel already waiting for its brief (intake made it), the fallback.
// used = the RAW names already on a reel that has its brief (those clips are spoken for). With no Upload tap on this phone (an older page,
// another phone) the last 6 h of the folder count, minus what is spoken for. (Beth, 11:11: tapped Upload on the old page, no upAt.)
function nfArrivals(arr, recv, upAt, used) {
  const at = Number(arr && arr.at) || 0, since = upAt ? (Number(upAt) || 0) / 1000 - 120 : at - 6 * 3600, u = new Set(used || []);
  const r = Array.isArray(recv) ? recv : [], rs = new Set(r.map(x => String(x).split("/").pop()));
  // with no tap on this phone, a clip already taken into a reel only counts when that reel is the one waiting for its brief (never a cancelled one)
  const files = (arr && Array.isArray(arr.files) && (upAt || at) ? arr.files : []).filter(f => f && f.name && Number(f.mt) >= since && !["dup", "refused", "held"].includes(f.state) && !(f.raw && u.has(f.raw)) && (upAt || !f.raw || rs.has(f.raw)));
  return { files, recv: r, n: Math.max(files.length, r.length), mb: Math.round(files.reduce((a, f) => a + (Number(f.size) || 0), 0) / 1e6) };
}
function nfProgress(n, expect) { n = Math.max(0, Number(n) || 0); const e = Math.max(1, Number(expect) || 1); return { n, expect: Math.max(e, n), pct: Math.min(100, Math.round(n / e * 100)), complete: n >= e }; }
// f = { hasVideo, hasName, typeOk, hasLook }. The first step still owed (5 = everything required is done).
// BRIEF50 2026-10-26 (Nick TG 08:51): footage (or a voiceover script), then EITHER their own words OR one of our looks, never forced to pick a
// preset; a reference link is optional on top. lookOpen = "I will pick one" with nothing picked: the step passes, their words on Notes count.
// 3STEP50 2026-10-26: step 1 = clips + title (pop-up), step 2 = the one brief screen. 3 = everything required is done.
function nfFirstOpen(f) { if (!f.hasVideo || !f.hasName) return 1; if (!f.hasLook) return 2; return 3; }
function nfCan(st, f) { if (st === 1) return !!(f.hasVideo && f.hasName); return !!(f.hasVideo && f.hasName && f.hasLook); }
function nfResume(step, f) { return Math.max(1, Math.min(Number(step) || 1, nfFirstOpen(f), 2)); }
// The clips pop-up shows when clips are in and the reel has no title yet, or when the client asks (Next on step 1).
function nfNeedsPop(f, popped) { return !!(f.hasVideo && !f.hasName && !popped); }
/* NF-PURE-END */
function nfFacts(dr) {
  // inappupload 2026-10-11 ROOT CAUSE of Nick's 18:40 "Waiting for your first clip" after 100%: the Mac's app_push lists a just-landed upload as a
  // placeholder reel "dbx:landed_..." (channel email, so needsBrief() is false) carrying the new RAW names. Counting it as a reel that "has its
  // brief" marked those RAWs as spoken for and filtered every arrival out, until the real app reel replaced it 4 to 7 minutes later.
  // Only a reel that really has its brief (or a delivered version) speaks for its clips.
  let d = S.data || {}; const used = (d.reels || []).filter(r => !needsBrief(r) && !String(r.id || "").startsWith("dbx:landed_") && !(r.status === "received" && !(r.versions || []).length && r.has_brief !== true)).flatMap(r => (r.files || []).map(x => String(x).split("/").pop()));
  try { used.push(...nfAside().files); const rr8 = receivedReel(); (d.reels || []).forEach(r => { if (r !== rr8 && needsBrief(r)) used.push(...(r.files || []).map(nf81Base)); }); } catch {}   // BETHFIX81 [M5 Max MBP] 2026-10-31: never the set-aside reel's clips, nor another waiting reel's
  // BETHFIX81: an upload from another session (a batch this draft never started, or before Start a new reel) is not this reel's clip
  const bs81 = new Set((dr.batches || []).map(String)), fa81 = Number(dr.freshAt) || 0;
  const sb82 = nf82Sent();   // NEWREEL82 [M5 Max MBP] 2026-10-31: nor one whose brief was already sent (it is that reel's clip)
  const keep81 = u => !(u && ((bs81.size && u.batch && !bs81.has(String(u.batch))) || (fa81 && (Number(u.at) || 0) * 1000 < fa81 - 5000) || (u.batch && sb82.has(String(u.batch)) && !bs81.has(String(u.batch)))));
  const foreign81 = new Set([...(d.uploads || []), ...upState().items].filter(u => u && (u.id || u.up) && !keep81(u)).map(u => u.id || u.up));
  if (foreign81.size) d = Object.assign({}, d, { arrivals: Object.assign({}, d.arrivals || {}, { files: (((d.arrivals || {}).files) || []).filter(f => !(f && f.up && foreign81.has(f.up))) }) });
  const a = nfArrivals(upArrivals(d, "new", keep81), receivedFiles(), dr.upAt || dr.freshAt, used);   // BETHFIX81: freshAt = Start a new reel   // inappupload 2026-10-11: this phone's finished uploads + the server's up records count at once
  const scriptOk = String(dr.script || "").trim().length >= 10;     // BRIEF50: a voiceover script with no recording (VO40 makes the video)
  const hasVideo = !!(a.n > 0 || dr.videoUrl || scriptOk);   // only clips we can SEE (this upload's arrivals, or the waiting reel's files), never a remembered flag
  const hasDesc = !!(String(dr.tell || "").trim() || String(dr.notes || "").trim() || scriptOk);
  const lookOpen = dr.lookMode === "pick" && !dr.look;
  const hasLook = (dr.lookMode === "tell" ? !!(String(dr.tell || "").trim() || refUrl(dr.reference) || scriptOk) : hasDesc || (dr.lookMode === "reference" ? !!refUrl(dr.reference) : dr.lookMode !== "pick" || !!dr.look || (dr.custom && mgPicks(dr).length > 0) || !!dr.videoType || !!(dr.p122 && dr.p122.path === "custom") || (typeof tplMgOf === "function" && !!tplMgOf(dr))));   /* LISTDEMO86 [M5 Max MBP] 2026-11-02 07:36 PST: a Templates pick of a template MG (MG78 Block Cut, MG86 List Demo) IS the look, so the brief can send */   // tellyou 2026-10-11; BRIEF50; 3STEP50: "Write my own" needs their words (or a link), customize counts a motion graphic
  const hasName = !!String(dr.title || "").trim();
  const typeOk = true;   // 3STEP50 2026-10-26: no video type step any more (Nick: type and look are ONE choice)
  return { hasVideo, hasLook, hasName, typeOk, lookOpen, hasDesc, scriptOk, arr: a };
}
// The clips that belong to this reel, for the pop-up: this upload's arrivals (with their thumbnails), else the waiting reel's footage.
function nfClips(dr) {
  // inappupload 2026-10-11: the waiting reel's clips (what the Mac already put on it) PLUS this upload's clips not on it yet, never only one of
  // the two (E2E: 4 clips in, the pop-up said "Your clip is in" with one tile, because only this minute's arrivals were listed).
  const f = nfFacts(dr), rr = receivedReel(), fs = footageOf(rr), inReel = new Set(fs.map(x => x.name)), byRaw = {};
  (((S.data || {}).arrivals || {}).files || []).forEach(x => { if (x && x.raw) byRaw[x.raw] = x; });
  const out = fs.map(x => { const a = byRaw[x.name] || {}; return { key: x.name, name: a.name || x.name, thumb: footPoster(x) || a.thumb || upThumbGet(a.name), size: a.size || 0, ready: true }; });
  f.arr.files.filter(x => !(x.raw && inReel.has(x.raw))).forEach(x => out.push({ key: x.raw || x.name, name: x.name, thumb: x.thumb || upThumbGet(x.name), size: x.size, ready: !!x.raw }));   // NEWREEL82 [M5 Max MBP] 2026-10-31
  return out;
}
function nfResumeStep(dr) { dr = dr || S.draft || DEFAULT_DRAFT(); const f = nfFacts(dr); return nfResume(dr.step || 1, f); }
const nfMb = b => { const m = (Number(b) || 0) / 1e6; return m >= 1000 ? (m / 1000).toFixed(1) + " GB" : m >= 1 ? Math.round(m) + " MB" : m ? "under 1 MB" : ""; };
function nfHead(st, f) {
  const ok = [f.hasVideo, f.hasName, false], vs = st === 1 ? 1 : 3;   // 3STEP50: visible steps Clips 1, Title 2 (the pop-up), Brief 3
  return `<div class="nfhead" aria-label="Step ${vs} of 3"><div class="nfdots">${STEPS.map((n, i) => { const k = i + 1, done = ok[i] && k < 3;
    return `<span class="nfd${k === vs ? " on" : ""}${done ? " ok" : ""}"><i>${done ? "✓" : k}</i><b>${esc(n)}</b></span>`; }).join(`<span class="nfln"></span>`)}</div></div>`;
}
// THE CLIPS POP-UP: thumbnails of exactly this reel's clips (untick one that belongs to another video) + the required title. Next stays
// locked until there is a title and at least one clip. It cannot be swiped away; "Add more clips" closes it and stays on the upload.
function nfClipsPop(dr, opts) {
  opts = opts || {};
  if (document.querySelector(".nfpop")) return;
  try { if (FLS.on) return; } catch {}   // FILMLUMI111: never pop the title (and the keyboard) over the camera; it shows after Done
  const clips = nfClips(dr), ex = new Set(dr.excl || []);
  const o = document.createElement("div"); o.className = "titlepop nfpop";
  const tile = c => `<label class="nfclip${ex.has(c.key) ? " off" : ""}" data-k="${esc(c.key)}"><span class="nfth">${c.thumb ? `<img src="${esc(c.thumb)}" alt="" onerror="this.remove()">` : ""}<span class="nfph">${c.ready ? "Your clip" : "Preview on its way"}</span></span>
      <input type="checkbox" ${ex.has(c.key) ? "" : "checked"} aria-label="Use ${esc(c.name)} in this reel"><i class="nfck">✓</i><small>${esc(c.name)}</small></label>`;
  o.innerHTML = `<div class="tpc" role="dialog" aria-modal="true" aria-labelledby="nfph"><button type="button" class="nf82x" id="nf82px" aria-label="Close">×</button>
    <h2 id="nfph">${clips.length === 1 ? "Your clip is in" : clips.length ? clips.length + " clips are in" : "Your video is in"}</h2>
    <p>${clips.length > 1 ? "These are the clips for this reel. Untick any that belong to a different video." : "This is the clip for this reel."}</p>
    ${clips.length ? `<div class="nfclips">${clips.map(tile).join("")}</div>` : ""}
    <label class="nfreq" for="nftitle"><span class="req">Required</span> Please enter the title of your video</label>
    <input id="nftitle" class="text" type="text" maxlength="80" placeholder="e.g. Morning routine" autocomplete="off" enterkeyhint="done" value="${esc(dr.title || "")}">
    <p class="tpprev" id="nftp"></p>
    <button class="btn primary block" type="button" id="nfgo" disabled>Next</button>
    ${opts.noMore ? "" : `<button class="btn line block" type="button" id="nfmore" style="margin-top:8px">Add more clips first</button>`}</div>`;
  document.body.appendChild(o);
  { const dis = () => nf82PopDismiss(o, dr, opts); o.querySelector("#nf82px").onclick = dis;   // NEWREEL82 [M5 Max MBP] 2026-10-31
    // TITLEFIX118 [M5 Max MBP] 2026-11-01 (Nick 5:28 PM: "I'm trying to edit my title ... it will not work it is glitching"): on iPhone the keyboard
    // opening moves the box, and the tap that focused the name field landed on the dimmed backdrop, which closed the box. The backdrop only
    // closes it on a deliberate tap that STARTED on the backdrop, never while the name field has focus or within 0.8 s of the keyboard moving it.
    let down = false, vvAt = 0; const vv = window.visualViewport; const onVV = () => { vvAt = Date.now(); }; if (vv) vv.addEventListener("resize", onVV);
    o.addEventListener("pointerdown", e => { down = e.target === o; }); o.addEventListener("touchstart", e => { down = e.target === o; }, { passive: true });
    o.addEventListener("click", e => { if (e.target !== o || !down) return; const fi = o.querySelector("#nftitle"); if ((fi && document.activeElement === fi) || Date.now() - vvAt < 800) return; if (vv) vv.removeEventListener("resize", onVV); dis(); }); }
  const i = o.querySelector("#nftitle"), nb = o.querySelector("#nfgo"), pv = o.querySelector("#nftp");
  const upd = () => { const t = i.value.replace(/\s+/g, " ").trim(), used = o.querySelectorAll(".nfclip input:checked").length || (clips.length ? 0 : 1);
    nb.disabled = !t || !used; pv.innerHTML = t ? `Saved as <b>${esc(newReelName(t))}</b>` : `We add the number for you: <b>${esc(no3(nextNo()))}</b>`; };
  o.querySelectorAll(".nfclip input").forEach(cb => cb.onchange = () => { cb.closest(".nfclip").classList.toggle("off", !cb.checked); upd(); });
  i.oninput = upd; i.onkeydown = e => { if (e.key === "Enter" && !nb.disabled) nb.click(); }; upd();
  // KBTITLE50: keep the title box visible above the keyboard while the keyboard animates in
  i.addEventListener("focus", () => [80, 350, 700].forEach(ms => setTimeout(() => { try { if (window.lumiFitVV) lumiFitVV(); i.scrollIntoView({ block: "center" }); } catch {} }, ms)));
  nb.onclick = () => {
    const t = i.value.replace(/\s+/g, " ").trim().slice(0, 80); if (!t) { i.focus(); return; }
    dr.title = t; dr.excl = [...o.querySelectorAll(".nfclip")].filter(l => !l.querySelector("input").checked).map(l => l.dataset.k);
    dr.popped = true; dr.step = NF.BRIEF; dr.at = Date.now(); store("draft", dr);
    const rr = receivedReel(); if (rr) { const done = fetchStore("titled", {}); done[rr.id] = t; store("titled", done); rr.titled = true; rr.title = t; rr.name = localReelName(rr, t); send({ kind: "title", reel: rr.id, text: t }).catch(() => {}); }
    o.remove(); try { lumiNod("Saved: " + t); } catch {}
    S.sent = false; if (S.view !== "new") go2new(NF.BRIEF); else { S.step = NF.BRIEF; S.navLockUntil = Date.now() + 700; setPageY(0); render(); }
  };
  const more = o.querySelector("#nfmore"); if (more) more.onclick = () => { dr.popped = true; store("draft", dr); o.remove(); };
  setTimeout(() => { try { if (!dr.title) i.focus(); } catch {} }, 200);
  // thumbnails land a few seconds after the clip (the Mac makes them): fill the tiles in place, never redraw the pop-up under their typing
  const fill = async () => { if (!o.isConnected) return; const need = [...o.querySelectorAll(".nfclip")].filter(l => !l.querySelector(".nfth img")); if (!need.length) return;
    try { const r = await meFetch(); const j = r && r.ok ? await r.json() : null; const fs = ((j || {}).arrivals || {}).files || [];
      need.forEach(l => { const f = fs.find(x => x && x.thumb && (x.raw === l.dataset.k || x.name === l.dataset.k)); if (f) { const im = document.createElement("img"); im.src = f.thumb; im.alt = ""; l.querySelector(".nfth").prepend(im); } }); } catch {}
    if (o.isConnected) setTimeout(fill, 4000); };
  setTimeout(fill, 3000);
}
/* fieldaudit 2026-10-11 23:3x PDT [M5 Max MBP] (Nick TG 23:21 "find any other bugs similar to this... anywhere you can put text in on the upload/brief process"): tell + notes 3000 -> 20000, B-roll note 300 -> 2000, chat 3000 -> 12000, reel notes 600 -> 3000, Send again resends the WHOLE brief (was cut at 5800). Backup index.html.bak_pre_fieldaudit_20261011. */
/* ---------- "I'LL TELL YOU". [M5 Max MBP] 2026-10-11 18:5x PDT (tellyou). Nick, Telegram 18:50: "I want there to be another button that says
   'I will tell you' ... I don't have to pick one of these styles ... I just want to be able to tell it what I want and explain to it in natural
   language." On the video type picker and on the look step: a big text box (the iPhone keyboard's mic dictates into it) plus an optional
   reference link. The words go into the brief as "In my own words (my spec ...)", and the Mac's planner treats them as the client's spec,
   above any video type or style default (plan.py CLIENT SPEC block). No type or style pick is needed. ---------- */
/* REFERENCE USE. [M5 Max MBP] 2026-10-11 19:1x PDT (refuse). Nick, Telegram 19:02: "I only sent in that reference link... for a music reference.
   I wish there was just a music reference link option and then a visual reference link option, or a 'both' option." Every reference link
   field asks "Use it for: Music / Look and editing / Both", with NO default: the reel cannot start until they pick. The brief carries
   "Reference use: music|visual|both (...)"; the Mac reads it (concierge.app_reference -> reference_law, prep_reference, song_request,
   brief_check): music = the song only, the copy-exactly rule never fires; visual = look, captions and pacing, never its song; both = all. */
const REFUSE = [["music", "Music", "Just the song"], ["visual", "Look and editing", "Captions, look, pacing"], ["both", "Both", "Song and look"]];
function refUseHtml(d) { return `<div class="refuse"><label class="lbl" style="margin-top:10px">Use it for <span class="req">Required</span></label><div class="opt" data-ruse="1">${REFUSE.map(([k, n, sm]) => `<button type="button" data-ru="${k}" class="${d.refUse === k ? "on" : ""}"><span>${n}<small>${sm}</small></span></button>`).join("")}</div></div>`; }
function refUseNeeded(d) { return !!refUrl(d.reference) && !["music", "visual", "both"].includes(d.refUse); }
function refUseLine(d) { return d.refUse === "music" ? "music (use the song from this reel; do not copy its look, captions or pacing)" : d.refUse === "visual" ? "visual (copy its look, captions and pacing; do not use its song)" : d.refUse === "both" ? "both (use its song AND its look, captions and pacing)" : ""; }
function wireRefUse(root, d, after) { (root || document).querySelectorAll('[data-ruse] [data-ru]').forEach(b => b.onclick = () => { d.refUse = b.dataset.ru; d.at = Date.now(); store("draft", d);
  b.parentElement.querySelectorAll("[data-ru]").forEach(x => x.classList.toggle("on", x === b)); if (after) after(); }); }
// [M5 Max MBP] 2026-10-13 finish-line (LOOKS_SPEC 13 criterion 3): the look a client picked BEFORE opening "I'll tell you" stays their base
// look when they tick Keep (default on); the brief then carries the picked look AND their direction, and the Mac changes only what they describe.
function _tellBase(dr) { const c = (dr.lookMode === "pick" && dr.look) ? dr.look : (dr.lookMode === "tell" ? dr.lookBase : null); return c && byCode(c) ? c : null; }
function tellSheet(dr, role, after) {
  sheet(`<h3 style="font-size:24px;font-family:var(--serif);font-weight:400;margin:0 0 4px">Tell us what you want</h3>
    <p class="muted" style="margin:0 0 12px;font-size:14.5px">Say it your way: the feel, the captions, the pace, anything. Tap the mic on your keyboard to talk instead of typing.</p>
    <textarea id="tellt" class="tellbox" maxlength="20000" placeholder="e.g. Keep it calm and simple, white captions at the bottom, cut out my pauses, no music." autocapitalize="sentences">${esc(dr.tell || "")}</textarea>
    <label class="lbl" for="tellr" style="margin-top:12px">A reel you like <small class="muted">optional</small></label>
    <input class="text" id="tellr" type="url" inputmode="url" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="done" placeholder="Instagram, TikTok or YouTube link" value="${esc(dr.reference || "")}">
    <p id="tellerr" style="font-size:13px;margin:6px 0 0;color:var(--red);display:none">That does not look like a link yet. Paste the full link, or leave it empty.</p>
    <div id="tellru" style="display:${refUrl(dr.reference) ? "block" : "none"}">${refUseHtml(dr)}</div>
    ${role !== "type" && _tellBase(dr) ? `<label class="lbl" style="margin-top:12px;display:flex;gap:8px;align-items:center"><input type="checkbox" id="tellkeep" checked> Keep ${esc(byCode(_tellBase(dr)).name)} as my look, my words change only what I describe</label>` : ""}
    <div class="row" style="margin-top:16px"><button class="btn primary" id="tellok" type="button" style="flex:1" disabled>Save</button><button class="btn line" id="tellx" type="button">Back</button></div>`);
  const t = $("#tellt"), r = $("#tellr"), ok = $("#tellok"), er = $("#tellerr");
  const ru = $("#tellru");
  const upd = () => { const u = r.value.trim(), bad = u && refUrl(u) === null; er.style.display = bad && document.activeElement !== r ? "block" : "none";
    ru.style.display = u && !bad ? "block" : "none"; ok.disabled = !(t.value.trim() || (u && !bad)) || bad || (u && !bad && !["music", "visual", "both"].includes(dr.refUse)); };
  wireRefUse(ru, dr, () => upd());
  t.oninput = upd; r.oninput = upd; r.onblur = upd; upd();
  setTimeout(() => { try { if (!t.value) t.focus(); } catch {} }, 250);
  $("#tellx").onclick = () => { try { document.activeElement && document.activeElement.blur(); } catch {} closeSheet(); render(); };
  ok.onclick = () => {
    dr.tell = t.value.trim().slice(0, 20000); const u = r.value.trim(); dr.reference = u; if (!u) { dr.refMatch = ""; dr.refUse = ""; }
    if (role === "type") { dr.videoType = ""; dr.vtChosen = true; dr.vtTell = true; }
    else { const _kb = $("#tellkeep"); dr.lookBase = _kb && _kb.checked ? _tellBase(dr) : null;   // LOOKS_SPEC C3 2026-10-13: a picked look + own direction
      dr.lookMode = "tell"; dr.look = null; if ((S.data && S.data.account || {}).returning) dr.changeLook = true; }
    dr.at = Date.now(); store("draft", dr);
    try { document.activeElement && document.activeElement.blur(); } catch {}
    closeSheet(); try { lumiNod("Got it, in your words"); } catch {}
    if (after) after(); else render();
  };
}
function go2new(step, x) { S.sent = false; go("new", Object.assign({ step }, x || {})); }   // BETHFIX81 [M5 Max MBP] 2026-10-31: x = { __pick } (a style just picked) or { __nfok } (an explicit Continue)
// THE VIDEO TYPE POP-UP (required). A tap picks it, ticks it, and moves on to the look by itself.
function nfTypeSheet(dr) {
  const fm = S.fmts || [];
  sheet(`<h3 style="font-size:24px;font-family:var(--serif);font-weight:400;margin:0 0 4px">What kind of video is this?</h3>
    <p class="muted" style="margin:0 0 12px;font-size:14.5px">It tells your editor how to cut it. Pick one.</p>
    <div class="opt one vtype nfvt">${fm.map(f => `<button data-vt="${esc(f.id)}" class="${dr.videoType === f.id ? "on" : ""}" style="display:flex;align-items:center;text-align:left">${f.thumb ? `<img src="/${esc(f.thumb)}" alt="" loading="lazy" style="width:40px;height:71px;object-fit:cover;border-radius:8px;flex:none;margin-right:10px">` : ""}<span>${esc(f.label)}${f.badge ? ` <em class="vtbadge">${esc(f.badge)}</em>` : ""}<small>${esc(f.blurb || "")}</small></span></button>`).join("")}
      <button data-vt="" class="${dr.vtChosen && !dr.videoType && !dr.vtTell ? "on" : ""}" style="display:flex;align-items:center;text-align:left"><span>Not sure, you decide<small>We read your footage and pick</small></span></button>
      <button data-vt="__tell" class="${dr.vtTell ? "on" : ""}" style="display:flex;align-items:center;text-align:left"><span>I'll tell you<small>Describe what you want in your own words</small></span></button></div>`);
  document.querySelectorAll("[data-vt]").forEach(b => b.onclick = () => {
    if (b.dataset.vt === "__tell") { tellSheet(dr, "type", () => { if (S.view === "new" && S.step === NF.TYPE) { S.step = NF.LOOK; dr.step = NF.LOOK; store("draft", dr); S.navLockUntil = Date.now() + 700; setPageY(0); } render(); }); return; }   // tellyou 2026-10-11
    dr.videoType = b.dataset.vt; dr.vtChosen = true; dr.vtTell = false; dr.at = Date.now(); store("draft", dr);
    document.querySelectorAll("[data-vt]").forEach(x => x.classList.toggle("on", x === b));
    const lab = dr.videoType ? (vtypeOf(dr) || {}).label : "Not sure, you decide";
    const advance = () => { closeSheet(); try { lumiNod("Video type: " + lab); } catch {} if (S.view === "new" && S.step === NF.TYPE) { S.step = NF.LOOK; dr.step = NF.LOOK; store("draft", dr); S.navLockUntil = Date.now() + 700; setPageY(0); } render(); };
    const vf = vtypeOf(dr), old = document.getElementById("vtpv"); if (old) old.remove();
    if (vf && vf.example) {   // [M5 Max MBP] 2026-10-03 founder story: show the example playing + what they get, then one tap to choose it
      const pv = document.createElement("div"); pv.id = "vtpv"; b.parentElement.after(pv);
      const draw = () => { pv.innerHTML = vtPreview(vf, S.vtWide) + `<button type="button" class="btn primary block" id="vtgo" style="margin-top:10px">Choose ${esc(vf.label)}</button>`;
        vtPreviewWire(pv, draw); pv.querySelector("#vtgo").onclick = advance; };
      draw(); setTimeout(() => { try { pv.scrollIntoView({ behavior: "smooth", block: "start" }); } catch {} }, 60); return;
    }
    setTimeout(advance, 380);
  });
}
function nfQuick() { return ["Use my first line as the hook", "Keep it short and punchy", "Highlight the key words", "Calm and cozy", "Cut the ums and pauses"]; }
// [M5 Max MBP] 2026-10-07 chipdeselect (Beth): quick-add chips toggle. On = its text is in the notes; tapping a green chip takes exactly that text out.
function nfHas(notes, q) { return String(notes || "").toLowerCase().includes(String(q).toLowerCase()); }
function nfStrip(notes, q) { let s = String(notes || ""); const ql = String(q).toLowerCase();
  for (let i = s.toLowerCase().indexOf(ql), g = 0; i >= 0 && g < 20; i = s.toLowerCase().indexOf(ql), g++) {
    let e = i + ql.length; if (s[e] === ".") e++;
    const L = s.slice(0, i).replace(/[ \t]+$/, ""); let R = s.slice(e).replace(/^[ \t]+/, ""); if (/\n$/.test(L) && /^\n/.test(R)) R = R.slice(1);
    s = L && R && !/\n$/.test(L) && !/^\n/.test(R) ? L + " " + R : L + R; }
  return s.replace(/^\s+|\s+$/g, ""); }
/* ---------- FLOW122 [M5 Max MBP] 2026-10-27 PDT. Nick TG 2026-10-27 7:56 am (doc 122, verbatim in LUMI_5.0_DOCUMENTS/122_UPLOAD_FLOW_REHAUL.md).
   The brief part of New reel, rebuilt. Order never changes: 1 clips, 2 title (the clips pop-up), 3 the style part, here.
   Page "fork": two cards fanned like a hand of cards, "Choose a fully built-out style" and "Customize your reel".
   Built-out: pick one complete style (captions + edit + motion graphics in one), then a short review where every step can still be changed.
   Customize: one minimal page per choice, "Step k of 7": Captions, Motion graphics, Background, Editing style, Voiceover, Music, Last touches,
   then the review and Start editing. "Same as last time" and "Write it in my own words" stay as small links on the fork, so no option is lost.
   Every choice travels as a labelled brief line (briefText) that concierge.parse_brief keeps and owner41 reads in full. ---------- */
// REELTYPE50 [M5 Max MBP] 2026-10-28 (Nick TG): the Editing style step is gone ("I don't want her stuff on there ... just get rid of this whole
// section"); a "What type of reel is this?" step (the studied video types, formats.json) sits right before Last touches. It sets dr.videoType
// exactly like the old picker, so the brief keeps its "Video type: <name> (<id>)" line. Brief without an editing pick = Editing intensity default.
const F122 = { lumi: ["review"], one: ["review"], custom: ["captions", "mg", "bg", "vo", "music", "vtype", "extras", "review"], built: ["styles", "review"], same: ["review"], tell: ["tell", "review"] };
const F122_NAMES = { fork: "Your style", styles: "Style", captions: "Captions", mg: "Motion graphics", bg: "Background", edit: "Editing style", vtype: "Reel type", vo: "Voiceover", music: "Music", extras: "Last touches", tell: "Your words", review: "Review" };
// BG50 [M5 Max MBP] 2026-10-28 (Nick TG): blur = PORTRAIT MODE; "Pop Out Effect" and "Lumi lilac canvas" are one option ("That's the same thing");
// every cut-out background is one "Cut you out onto a background" card that opens a small grid of variants right under it (checker colours,
// solid color, stripes, ...). Each variant sends its own brief line. Old drafts: bg "lilac" reads as Pop Out, bg "checker" as the checker
// in its saved colour. A variant preview that has not been rendered yet shows a drawn pattern, never "Example coming soon".
const F122_BG = [
  { k: "filmed", n: "Keep it as filmed", s: "We leave your background alone.", v: "bg_filmed", line: "keep it as filmed" },
  { k: "blur", n: "Blurred background", s: "You stay sharp, the background behind you goes soft, like portrait mode.", v: "bg_blur", line: "blurred background (me sharp and cut out, the background behind me blurred, like portrait mode)" },
  { k: "popout", n: "Pop Out Effect", s: "You cut out, your head pops above a card. Room on top for a headline.", v: "bg_popout", line: "Pop Out Effect" },
  { k: "cutout", n: "Cut you out onto a background", s: "Checkerboard, a solid color, stripes and more.", group: 1 },
  { k: "zoomblur", n: "Zoom and blur on big points", s: "Normal most of the time. On your title and biggest lines we push in and blur the background.", v: "bg_zoomblur", line: "keep it as filmed, but on my title and my biggest points push in slightly and blur the background behind me" },
  { k: "decide", n: "You decide", s: "We pick what suits your footage.", dec: 1, line: "you decide what suits my footage" }];
const F122_CHKPAT = c => `repeating-conic-gradient(${c} 0 25%,#fff 0 50%) 0 0/34px 34px`;
const F122_CUT = [
  { k: "checker_yellow", n: "Checker, yellow", v: "bg_checker_yellow", pat: F122_CHKPAT("#ffd84d"), line: "checker background, yellow and white (me cut out over a checkerboard)" },
  { k: "checker_blue", n: "Checker, blue", v: "bg_checker_blue", pat: F122_CHKPAT("#4a7be0"), line: "checker background, blue and white (me cut out over a checkerboard)" },
  { k: "checker_pink", n: "Checker, pink", v: "bg_checker_pink", pat: F122_CHKPAT("#f08bb6"), line: "checker background, pink and white (me cut out over a checkerboard)" },
  { k: "checker_black", n: "Checker, black", v: "bg_checker_black", pat: F122_CHKPAT("#16171c"), line: "checker background, black and white (me cut out over a checkerboard)" },
  { k: "color", n: "Solid color", v: "bg_solid", pat: "#e6dcfb", line: "a solid color" },
  { k: "stripes", n: "Stripes", v: "bg_stripes", pat: "repeating-linear-gradient(45deg,#a98bf5 0 16px,#fff 16px 32px)", line: "stripes background, lilac and white (me cut out over diagonal stripes)" },
  { k: "gradient", n: "Gradient", v: "bg_gradient", pat: "linear-gradient(180deg,#ffd3b6,#c9b6f5)", line: "gradient background, peach to lilac (me cut out over a soft vertical gradient)" },
  { k: "grid", n: "Graph paper", v: "bg_grid", pat: "linear-gradient(#8db6e6 1px,transparent 1px) 0 0/18px 18px,linear-gradient(90deg,#8db6e6 1px,#fbfaf5 1px) 0 0/18px 18px", line: "graph paper background, cream with blue lines (me cut out over a grid)" },
  { k: "dots", n: "Polka dots", v: "bg_dots", pat: "radial-gradient(#f29c7e 30%,transparent 32%) 0 0/20px 20px,#ffe9d6", line: "polka dot background, coral dots on peach (me cut out over polka dots)" },
  { k: "split", n: "Color block", v: "bg_split", pat: "linear-gradient(180deg,#bfd8ff 50%,#ffe07a 50%)", line: "split background, sky blue top and butter yellow bottom (me cut out over two color blocks)" }];
const F122_PACE = [
  { k: "calm", n: "Calm and clean", s: "Tight cut, easy captions, no effects.", iv: "Clean", nick: "ed_calm_nick", vanessa: "ed_calm_vanessa", line: "calm and clean, a tight cut with easy captions and no effects" },
  { k: "polished", n: "Polished, with B-roll", s: "Light B-roll over your words, gentle zooms, a music bed.", iv: "Polished", nick: "ed_broll_nick", vanessa: "ed_broll_vanessa", line: "polished, light B-roll over my words, gentle zooms and a music bed" },
  { k: "fast", n: "Fast and punchy", s: "Quick cuts, punch-ins, sound effects, words that pop.", iv: "Punchy", nick: "ed_fast_nick", vanessa: "ed_fast_vanessa", line: "fast and punchy, quick cuts, punch-ins, sound effects and words that pop" },
  { k: "sauce", n: "Full Sauce", s: "Everything: fastest cuts, B-roll, zooms, motion graphics, sound effects.", iv: "Full Sauce", nick: "../ex/F35_ad048", vanessa: "ed_fast_vanessa", line: "Full Sauce, everything: fastest cuts, B-roll, zooms, motion graphics, sound effects and music" },
  { k: "tour", n: "Walkthrough tour", s: "Your footage tells it, with short text on screen. No talking needed.", iv: "Polished", nick: "", vanessa: "ed_tour_vanessa", line: "walkthrough tour, my footage with short on-screen text, no talking needed" },
  { k: "split", n: "Framed on a canvas", s: "You in a window on a designed background, with graphics around you.", iv: "Punchy", nick: "ed_split_nick", vanessa: "", line: "framed on a designed canvas, me in a window with graphics around me" },
  { k: "decide", n: "You decide", s: "We match the pace to what you say.", dec: 1, line: "you decide the pace for my footage" }];
const F122_AI = [
  { k: "avatar", n: "AI avatar of you", s: "Your AI double says lines you did not film.", line: "an AI avatar of me for lines I did not film" },
  { k: "seedance", n: "AI video B-roll (Seedance)", s: "Short AI clips made for your words.", line: "AI video B-roll made with Seedance for my words" },
  { k: "kling", n: "AI motion shots (Kling)", s: "Your photos or stills brought to life.", line: "AI motion shots with Kling (my photos or stills brought to life)" },
  { k: "aiphoto", n: "AI photos", s: "Custom AI images for each point you make.", line: "custom AI photos for my points" }];
// VOICES200 [M5 Max MBP] 2026-11-16 (Nick TG 25073/25075): every ElevenLabs stock voice with a sample the client can PLAY (/voices/<id>.mp3),
// filtered by women / men / young / older / accent. The four older keys stay (hidden) so saved drafts still read their voice.
const F122_VOICES = [{"k": "el_cwhrbwxz", "n": "Roger", "s": "American man, classy", "id": "CwhRBWXzGAHq8TQ4Fs17", "g": "male", "a": "middle_aged", "acc": "american", "p": "/voices/CwhRBWXzGAHq8TQ4Fs17.mp3"}, {"k": "el_exavitqu", "n": "Sarah", "s": "Young American woman, professional", "id": "EXAVITQu4vr4xnSDxMaL", "g": "female", "a": "young", "acc": "american", "p": "/voices/EXAVITQu4vr4xnSDxMaL.mp3"}, {"k": "el_fgy2whty", "n": "Laura", "s": "Young American woman, sassy", "id": "FGY2WhTYpPnrIDTdsKH5", "g": "female", "a": "young", "acc": "american", "p": "/voices/FGY2WhTYpPnrIDTdsKH5.mp3"}, {"k": "el_ikne3meq", "n": "Charlie", "s": "Young Australian man, hyped", "id": "IKne3meq5aSn9XLyUdCD", "g": "male", "a": "young", "acc": "australian", "p": "/voices/IKne3meq5aSn9XLyUdCD.mp3"}, {"k": "el_jbfqncbs", "n": "George", "s": "British man, mature", "id": "JBFqnCBsd6RMkjVDRZzb", "g": "male", "a": "middle_aged", "acc": "british", "p": "/voices/JBFqnCBsd6RMkjVDRZzb.mp3"}, {"k": "el_n2lvs1w4", "n": "Callum", "s": "American man", "id": "N2lVS1w4EtoT3dr4eOWO", "g": "male", "a": "middle_aged", "acc": "american", "p": "/voices/N2lVS1w4EtoT3dr4eOWO.mp3"}, {"k": "el_saz9yhcv", "n": "River", "s": "American voice, calm", "id": "SAz9YHcvj6GT2YYXdXww", "g": "neutral", "a": "middle_aged", "acc": "american", "p": "/voices/SAz9YHcvj6GT2YYXdXww.mp3"}, {"k": "el_soyhlrjz", "n": "Harry", "s": "Young American man, rough", "id": "SOYHLrjzK2X1ezoPC6cr", "g": "male", "a": "young", "acc": "american", "p": "/voices/SOYHLrjzK2X1ezoPC6cr.mp3"}, {"k": "el_tx3lpaxm", "n": "Liam", "s": "Young American man, confident", "id": "TX3LPaxmHKxFdv7VOQHJ", "g": "male", "a": "young", "acc": "american", "p": "/voices/TX3LPaxmHKxFdv7VOQHJ.mp3"}, {"k": "el_xb7hh8ms", "n": "Alice", "s": "British woman, professional", "id": "Xb7hH8MSUJpSbSDYk0k2", "g": "female", "a": "middle_aged", "acc": "british", "p": "/voices/Xb7hH8MSUJpSbSDYk0k2.mp3"}, {"k": "el_xrexe9yk", "n": "Matilda", "s": "American woman, upbeat", "id": "XrExE9yKIg1WjnnlVkGX", "g": "female", "a": "middle_aged", "acc": "american", "p": "/voices/XrExE9yKIg1WjnnlVkGX.mp3"}, {"k": "el_bihbv24m", "n": "Will", "s": "Young American man, chill", "id": "bIHbv24MWmeRgasZH58o", "g": "male", "a": "young", "acc": "american", "p": "/voices/bIHbv24MWmeRgasZH58o.mp3"}, {"k": "el_cgsgspj2", "n": "Jessica", "s": "Young American woman, cute", "id": "cgSgspJ2msm6clMCkdW9", "g": "female", "a": "young", "acc": "american", "p": "/voices/cgSgspJ2msm6clMCkdW9.mp3"}, {"k": "el_cjvigy5q", "n": "Eric", "s": "American man, classy", "id": "cjVigY5qzO86Huf0OWal", "g": "male", "a": "middle_aged", "acc": "american", "p": "/voices/cjVigY5qzO86Huf0OWal.mp3"}, {"k": "el_hpp4j3vq", "n": "Bella", "s": "American woman, professional", "id": "hpp4J3VqNfWAUOO0d1Us", "g": "female", "a": "middle_aged", "acc": "american", "p": "/voices/hpp4J3VqNfWAUOO0d1Us.mp3"}, {"k": "el_ip95p4xo", "n": "Chris", "s": "American man, casual", "id": "iP95p4xoKVk53GoZ742B", "g": "male", "a": "middle_aged", "acc": "american", "p": "/voices/iP95p4xoKVk53GoZ742B.mp3"}, {"k": "el_npczcjzi", "n": "Brian", "s": "American man, classy", "id": "nPczCjzI2devNBz1zQrb", "g": "male", "a": "middle_aged", "acc": "american", "p": "/voices/nPczCjzI2devNBz1zQrb.mp3"}, {"k": "el_onwk4e9z", "n": "Daniel", "s": "British man, formal", "id": "onwK4e9ZLuTAKqWW03F9", "g": "male", "a": "middle_aged", "acc": "british", "p": "/voices/onwK4e9ZLuTAKqWW03F9.mp3"}, {"k": "el_pfzp5jqg", "n": "Lily", "s": "British woman, confident", "id": "pFZP5JQG7iQjIQuC4Bku", "g": "female", "a": "middle_aged", "acc": "british", "p": "/voices/pFZP5JQG7iQjIQuC4Bku.mp3"}, {"k": "el_pninz6ob", "n": "Adam", "s": "American man", "id": "pNInz6obpgDQGcFmaJgB", "g": "male", "a": "middle_aged", "acc": "american", "p": "/voices/pNInz6obpgDQGcFmaJgB.mp3"}, {"k": "el_pqhfzkp7", "n": "Bill", "s": "Older American man, crisp", "id": "pqHfZKP75CvOlQylNhV4", "g": "male", "a": "old", "acc": "american", "p": "/voices/pqHfZKP75CvOlQylNhV4.mp3"}, {"k": "el_nagtyt9m", "n": "Danny", "s": "American man, relaxed", "id": "Nagtyt9MktF8AWSgjotJ", "g": "male", "a": "middle_aged", "acc": "american", "p": "/voices/Nagtyt9MktF8AWSgjotJ.mp3"}, {"k": "el_pckbq4ep", "n": "Abdullah", "s": "Modern Standard man, casual", "id": "pCKbQ4EPGE06zpEPGNvS", "g": "male", "a": "middle_aged", "acc": "modern standard", "p": "/voices/pCKbQ4EPGE06zpEPGNvS.mp3"}, {"k": "el_nyc9wegk", "n": "Russell", "s": "British man, serious", "id": "NYC9WEgkq1u4jiqBseQ9", "g": "male", "a": "middle_aged", "acc": "british", "p": "/voices/NYC9WEgkq1u4jiqBseQ9.mp3"}, {"k": "el_r6nda3um", "n": "Anas", "s": "Modern Standard man, gentle", "id": "R6nda3uM038xEEKi7GFl", "g": "male", "a": "middle_aged", "acc": "modern standard", "p": "/voices/R6nda3uM038xEEKi7GFl.mp3"}, {"k": "el_t9aknmcd", "n": "\u0639\u0628\u062f\u0627\u0644\u0644\u0647 \u0633\u0639\u062f\u0648\u0646", "s": "Saudi man, casual", "id": "t9akNmCDhz230CEXOYmn", "g": "male", "a": "middle_aged", "acc": "saudi", "p": "/voices/t9akNmCDhz230CEXOYmn.mp3"}, {"k": "el_g1hokzin", "n": "Arabic Knight", "s": "Modern Standard man, confident", "id": "G1HOkzin3NMwRHSq60UI", "g": "male", "a": "middle_aged", "acc": "modern standard", "p": "/voices/G1HOkzin3NMwRHSq60UI.mp3"}, {"k": "el_yxenneln", "n": "Jeddawi Echo Arabic Saudi \u2014 \u0627\u0644\u0635\u0648\u062a \u0627\u0644\u0625\u0630\u0627\u0639\u064a \u0645\u0646 \u062c\u062f\u0629", "s": "Young Saudi man, calm", "id": "yXEnnEln9armDCyhkXcA", "g": "male", "a": "young", "acc": "saudi", "p": "/voices/yXEnnEln9armDCyhkXcA.mp3"}, {"k": "el_rpncq53r", "n": "Mazen Lawand", "s": "Modern Standard man, confident", "id": "rPNcQ53R703tTmtue1AT", "g": "male", "a": "middle_aged", "acc": "modern standard", "p": "/voices/rPNcQ53R703tTmtue1AT.mp3"}, {"k": "el_dlshlh26", "n": "Ms. Walker \u2013 Warm, Reassuring, and Round", "s": "Us Southern woman, relaxed", "id": "DLsHlh26Ugcm6ELvS0qi", "g": "female", "a": "middle_aged", "acc": "us southern", "p": "/voices/DLsHlh26Ugcm6ELvS0qi.mp3"}, {"k": "el_zecx3wdp", "n": "Retro Robot", "s": "British man, robotic", "id": "ZEcx3Wdpj4EvM8PltzHY", "g": "male", "a": "middle_aged", "acc": "british", "p": "/voices/ZEcx3Wdpj4EvM8PltzHY.mp3"}, {"k": "el_xvhpbk8o", "n": "Omar \u2013 Premium Arabic Voice", "s": "Modern Standard man, professional", "id": "xvhpbk8otnNHtT3fjCpr", "g": "male", "a": "middle_aged", "acc": "modern standard", "p": "/voices/xvhpbk8otnNHtT3fjCpr.mp3"}, {"k": "el_baq8ai9q", "n": "Sigma Centauri", "s": "American man, calm", "id": "bAq8AI9QURijOtmeFFqT", "g": "male", "a": "middle_aged", "acc": "american", "p": "/voices/bAq8AI9QURijOtmeFFqT.mp3"},
  { k: "rachel", n: "Rachel", s: "Warm, calm woman", id: "21m00Tcm4TlvDq8ikWAM", h: 1 }, { k: "sarah", n: "Sarah", s: "Soft, young woman", id: "EXAVITQu4vr4xnSDxMaL", h: 1 },
  { k: "adam", n: "Adam", s: "Deep, steady man", id: "pNInz6obpgDQGcFmaJgB", h: 1 }, { k: "josh", n: "Josh", s: "Young, friendly man", id: "TxGEqnHWrfWFTfGW9XjT", h: 1 },
  { k: "custom", n: "Custom", s: "Describe the voice you want" }, { k: "options", n: "Send me options", s: "We send a few to choose from" }];
// FLOW51 [M5 Max MBP] 2026-10-29 (Nick TG 18:3x): five voiceover choices. "yes" (old drafts) = the AI voiceover.
const F122_VO = [["no", "No"], ["ai", "Yes, AI voiceover"], ["upload", "Yes, upload voiceover"], ["record", "Yes, record voiceover"]];   // VO4 (Nick 2026-10-29 19:56): only four buttons
function f122VoKey(dr) { if (dr.vo === "yes") dr.vo = "ai"; return F122_VO.some(x => x[0] === dr.vo) ? dr.vo : String(dr.script || "").trim() ? "ai" : ""; }
function f122VoItem(dr) { return dr.voFile ? upList(nfUpReel()).filter(x => x.name === dr.voFile).pop() || null : null; }
function f122VoDone(dr) { const it = f122VoItem(dr); return !!dr.voFile && (it ? it.state === "done" : ((S.data || {}).uploads || []).some(u => u && u.name === dr.voFile)); }
function f122VoStatus(dr) { const it = f122VoItem(dr); return it ? `<ul class="nffiles">${upRow(it)}</ul>` : dr.voFile && f122VoDone(dr) ? `<p class="f122vof">✓ ${esc(dr.voFile)}</p>` : ""; }
function f122VoUpload(dr, f, how) {
  if (dr.voFile && dr.voFile !== f.name) dr.voOld = [...new Set([...(dr.voOld || []), dr.voFile])].slice(-10);
  dr.voFile = f.name; dr.voHow = how; dr.at = Date.now(); store("draft", dr); upAdd([f], { reel: nfUpReel() }); render(); }
function f122Clock(ms) { const t = Math.max(0, Math.floor(ms / 1000)); return Math.floor(t / 60) + ":" + String(t % 60).padStart(2, "0"); }
function f122Rec() { return S.f122rec || (S.f122rec = { st: "idle" }); }
// MICSTEPS50 [M5 Max MBP] 2026-10-29 (Nick: "Can it just open up my settings for me ... Can this be easier?"). iOS shows its own
// "Allow microphone?" prompt the first time. Once the phone has said no, no website can ask again or open Settings, so we show the exact steps.
function f122MicHelp(e) {
  const pwa = (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
  const denied = e && (e.name === "NotAllowedError" || e.name === "SecurityError");
  const steps = pwa
    ? "<li>Open your iPhone <b>Settings</b></li><li>Scroll to <b>Safari</b>, tap <b>Microphone</b></li><li>Choose <b>Ask</b> or <b>Allow</b></li><li>Come back here and tap record</li>"
    : "<li>Tap the <b>aA</b> button in the address bar</li><li>Tap <b>Website Settings</b></li><li>Set <b>Microphone</b> to <b>Allow</b></li><li>Tap record again</li>";
  const o = document.createElement("div"); o.className = "titlepop micpop";
  o.innerHTML = `<div class="tpc" role="dialog" aria-modal="true"><h2>Turn on your microphone</h2><p>${denied ? "Your phone is set to block the microphone for Lumi. Websites cannot change that, so it takes 10 seconds in Settings:" : "Your phone did not let Lumi use the microphone. To fix it:"}</p>
    <ol style="text-align:left;margin:0 0 14px;padding-left:20px;line-height:1.7">${steps}</ol>
    <button class="btn primary block" id="micok">Got it</button><button class="btn ghost block" id="micup" style="margin-top:8px">Upload a voice memo instead</button></div>`;
  document.body.appendChild(o);
  o.querySelector("#micok").onclick = () => o.remove();
  o.querySelector("#micup").onclick = () => { o.remove(); const d = S.draft || {}; d.vo = "upload"; store("draft", d); render(); };
}
async function f122RecStart() {
  const R = f122Rec();
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === "undefined") { toast("This phone cannot record here. Tap Yes, upload voiceover instead."); return; }
  if (window.lumiRecOn) window.lumiRecOn();   // FL106REC: same iPhone session rule for the voiceover recorder
  try { R.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
  catch (e) { if (window.lumiRecOff) window.lumiRecOff(); f122MicHelp(e); return; }   // MICSTEPS50: a web page cannot open iPhone Settings; show the exact steps + a fallback
  const mt = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/aac"].find(t => { try { return MediaRecorder.isTypeSupported(t); } catch { return false; } }) || "";
  try { R.mr = new MediaRecorder(R.stream, mt ? { mimeType: mt } : undefined); } catch (e) { try { R.stream.getTracks().forEach(t => t.stop()); } catch {} if (window.lumiRecOff) window.lumiRecOff(); toast("Recording did not start. Tap Yes, upload voiceover instead."); return; }
  R.chunks = [];
  R.mr.ondataavailable = e => { if (e.data && e.data.size) R.chunks.push(e.data); };
  R.mr.onstop = () => { const type = String(R.mr.mimeType || mt || "audio/mp4").split(";")[0] || "audio/mp4"; R.blob = new Blob(R.chunks, { type });
    if (R.url) try { URL.revokeObjectURL(R.url); } catch {}
    R.url = URL.createObjectURL(R.blob); R.ext = /webm/.test(type) ? "webm" : /aac/.test(type) ? "aac" : "m4a"; R.st = R.blob.size ? "done" : "idle";
    try { R.stream.getTracks().forEach(t => t.stop()); } catch {} if (window.lumiRecOff) window.lumiRecOff(); clearInterval(R.tick); if (!R.blob.size) toast("Nothing was recorded. Try again."); if (S.view === "new") render(); };
  R.mr.start(1000); R.st = "rec"; R.t0 = Date.now(); render();
  clearInterval(R.tick); R.tick = setInterval(() => { const el = document.getElementById("f122rect"); if (el) el.textContent = f122Clock(Date.now() - R.t0); if (Date.now() - R.t0 > 10 * 60000) f122RecStop(); }, 250);
}
function f122RecStop() { const R = f122Rec(); try { if (R.mr && R.mr.state !== "inactive") R.mr.stop(); } catch {} }
function f122RecUse(dr) { const R = f122Rec(); if (!R.blob) return; const d = new Date(), p = n => String(n).padStart(2, "0");
  const name = "voiceover_" + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + "_" + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds()) + "." + R.ext;
  let f; try { f = new File([R.blob], name, { type: R.blob.type || "audio/mp4" }); } catch { f = R.blob; try { f.name = name; } catch {} }
  R.st = "idle"; R.blob = null; f122VoUpload(dr, f, "record"); }
// FLOW51: the trending songs the engine can actually fetch and use (trending.json, built from the Mac's trending library)
function f122Trend() { if (S.trend || S._trP) return; S._trP = fetch("/trending.json", { cache: "no-store" }).then(r => r.json()).then(j => { S.trend = (j.songs || []).filter(x => x && x.id && x.title); }).catch(() => { S.trend = []; }).then(() => { S._trP = null; if (S.view === "new") render(); }); }
// MUSIC61 [M5 Max MBP] 2026-10-30 (Nick TG 09:38): tabs All | Upbeat | Cinematic (trending.json vibe), each vibe's slow songs in their own
// "Slow" part (pace). A trending.json without vibes shows the plain list as before. Search filters the open tab and hides empty parts.
const F61V = [["all", "All"], ["upbeat", "Upbeat"], ["cinematic", "Cinematic"]];
function f61Tab() { const t = S.trTab || "all"; return F61V.some(x => x[0] === t) ? t : "all"; }
function f61Vibed(T) { return (T || []).some(t => t.vibe); }
function f61Shown(T) { const tab = f61Tab(); return !f61Vibed(T) || tab === "all" ? T : T.filter(t => t.vibe === tab); }
function f61Tabs(T) { if (!f61Vibed(T)) return ""; const tab = f61Tab();
  return `<div class="trtabs" role="tablist">${F61V.map(([k, n]) => `<button type="button" role="tab" aria-selected="${tab === k}" class="${tab === k ? "on" : ""}" data-trtab="${k}">${n}<small>${k === "all" ? T.length : T.filter(t => t.vibe === k).length}</small></button>`).join("")}</div>`; }
function f61List(T, row) { if (!f61Vibed(T)) return T.map((t, i) => row(t, i)).join("");
  const tab = f61Tab(), vs = tab === "all" ? ["upbeat", "cinematic"] : [tab]; let h = "", i = 0;
  for (const v of vs) { const c = v === "cinematic", f = T.filter(t => t.vibe === v && t.pace !== "slow"), s = T.filter(t => t.vibe === v && t.pace === "slow");
    if (tab === "all" && f.length) h += `<div class="trh" data-trh="1">${c ? "Cinematic" : "Upbeat"}<small>${c ? "Big, building, dramatic" : "Fast, high energy"}</small></div>`;
    h += f.map(t => row(t, i++)).join("");
    if (s.length) h += `<div class="trh sub" data-trh="1">${tab === "all" ? "Slow " + (c ? "cinematic" : "upbeat") : "Slow"}<small>${c ? "Soft piano, ambient swells" : "Feel-good, mid-tempo"}</small></div>` + s.map(t => row(t, i++)).join(""); }
  return h; }
function f61Filter() { const q = $("#trq122"), w = q ? q.value.trim().toLowerCase() : ""; S.trQ = q ? q.value : ""; let n = 0, hd = null, hn = 0;
  document.querySelectorAll("#trl122 > [data-trq], #trl122 > [data-trh]").forEach(x => { if (x.dataset.trh) { if (hd) hd.hidden = !hn; hd = x; hn = 0; return; }
    const on = !w || x.dataset.trq.includes(w); x.hidden = !on; if (on) { n++; hn++; } });
  if (hd) hd.hidden = !hn; const no = $("#trnone122"); if (no) no.hidden = n > 0; }
function f61Bind() { document.querySelectorAll("[data-trtab]").forEach(b => b.onclick = () => { S.trTab = b.dataset.trtab; render(); });
  const q = $("#trq122"); if (q) { q.oninput = f61Filter; if (q.value) f61Filter(); } }
// PREVIEW51 [M5 Max MBP] 2026-10-29 (Nick: "I need to be able to listen to the trending audio"): one shared player, one song at a time, a
// progress ring, user-gesture play (iPhone Safari), stops on any page change and the moment the list is gone.
function f122TrAudio() { if (!S.trAudio) { const a = new Audio(); a.preload = "none"; a.setAttribute("playsinline", "");
  a.onended = () => { S.trPlaying = ""; f122TrPaint(); }; a.onerror = () => { if (S.trPlaying) toast("That preview did not load. Try another song."); S.trPlaying = ""; f122TrPaint(); }; S.trAudio = a; } return S.trAudio; }
function f122TrWave(id) {   // WAVE51: bars for the playing row (real waveform from trending.json "wave", else an equalizer)
  document.querySelectorAll(".trrow.play").forEach(r => { if (!r.querySelector('[data-trplay="' + CSS.escape(id || "") + '"]')) { r.classList.remove("play"); const w = r.querySelector(".trwv"); if (w) { w.innerHTML = ""; w.className = "trwv"; } } });
  if (!id) return; const b = document.querySelector('.trrow [data-trplay="' + CSS.escape(id) + '"]'), r = b && b.closest(".trrow"), w = r && r.querySelector(".trwv"); if (!w) return;
  r.classList.add("play"); if (w.childElementCount) return;
  const t = (S.trend || []).find(x => x.id === id) || {}, wv = Array.isArray(t.wave) && t.wave.length ? t.wave : null;
  w.className = "trwv" + (wv ? "" : " eq"); w.innerHTML = (wv || [1, 1, 1, 1, 1]).map(h => `<i style="height:${wv ? Math.max(10, Math.round(h * 5)) : 60}%"></i>`).join(""); w.dataset.k = "-1"; }
function f122TrPaint() { try { f122TrWave(S.trPlaying); } catch {} document.querySelectorAll("[data-trplay]").forEach(b => { const on = b.dataset.trplay === S.trPlaying; b.classList.toggle("on", on); b.setAttribute("aria-label", (on ? "Pause " : "Play ") + ((b.parentElement.querySelector("b") || {}).textContent || "")); if (!on) { const c = b.querySelector(".pr"); if (c) c.style.strokeDashoffset = "100"; } }); }
function f122TrStop() { try { if (S.trAudio && !S.trAudio.paused) S.trAudio.pause(); } catch {} if (S.trPlaying) { S.trPlaying = ""; f122TrPaint(); } }
function f122TrToggle(id) { const t = (S.trend || []).find(x => x.id === id); if (!t || !t.preview) return; const a = f122TrAudio();
  if (S.trPlaying === id && !a.paused) { a.pause(); S.trPlaying = ""; f122TrPaint(); return; }
  try { a.pause(); } catch {}
  if (a.dataset.id !== id) { a.src = t.preview; a.dataset.id = id; } else if (a.ended) a.currentTime = 0;
  // AUDIOSESS50 [M5 Max MBP] 2026-10-29 (Nick: "They're not playing"): iPhone's silent switch mutes web audio unless the page asks for a
  // "playback" audio session (Safari 16.4+). Ask for it, and say so out loud when the phone refuses to play.
  try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch {}
  S.trPlaying = id; f122TrPaint(); const pr = a.play(); if (pr && pr.catch) pr.catch(() => { S.trPlaying = ""; f122TrPaint(); toast("Your phone blocked the sound. Tap play again, and check the silent switch."); });
  cancelAnimationFrame(S.trRaf);
  const tick = () => { if (!S.trPlaying) return; if (!document.getElementById("trl122") || (S.view !== "new" && S.view !== "music")) { f122TrStop(); return; }
    const c = document.querySelector('[data-trplay="' + CSS.escape(S.trPlaying) + '"] .pr'); if (c && a.duration) c.style.strokeDashoffset = String(Math.max(0, 100 - 100 * a.currentTime / a.duration));
    { const w = document.querySelector('.trwv[data-wv="' + CSS.escape(S.trPlaying) + '"]'); if (w && !w.childElementCount) f122TrWave(S.trPlaying);   // WAVE51: playhead fill, the bar at the playhead pulses
      if (w && a.duration && !w.classList.contains("eq")) { const bars = w.children, k = Math.min(bars.length - 1, Math.floor(bars.length * a.currentTime / a.duration));
        if (String(k) !== w.dataset.k) { w.dataset.k = String(k); for (let j = 0; j < bars.length; j++) { bars[j].classList.toggle("p", j <= k); bars[j].classList.toggle("k", j === k); } } } }
    S.trRaf = requestAnimationFrame(tick); };
  S.trRaf = requestAnimationFrame(tick); }
function f122TrPick(dr) { return (S.trend || []).find(t => t.id === dr.trendId) || (dr.trendId && dr.trendName ? { id: dr.trendId, name: dr.trendName } : null); }
// FLOW51b (Nick TG 2026-10-29 ~18:50): ONE pick from the Styles page (a caption, a motion graphic, a hook / glass / vine) is never a full
// built-out style. It rides into the brief as dr.single and, after the clips and the title, the client picks: build the rest with us (the
// customize steps, that pick pre-filled) or "That's the one I like. You build the rest" (path "one": that pick + you decide everything else).
function f122Single(dr, l, role) {
  dr.single = { code: l.code, role: role || l.role, name: l.name }; dr.fromStyle = null; dr.tplMg = null; dr.p122 = { path: "", page: "", ret: "" };
  if ((role || l.role) === "look") { dr.look = l.code; dr.lookMode = "pick"; dr.captions = "Captions on"; dr.cap122 = "yes"; }
  if ((role || l.role) === "motion") dr.mgMode = "pick";
  dr.r113 = [...(dr.r113 || []).filter(c => c !== l.code), l.code];   // RECIPE113: a sheet pick joins the recipe too
  { const r = r113Ls(dr); if (r.length > 1) dr.single = { code: r[0].code, role: r[0].role, name: r[0].name }; }
  dr.at = Date.now(); store("draft", dr); }
function f122One(dr) { const x = dr.single; return x && x.code && byCode(x.code) ? Object.assign({}, x, { l: byCode(x.code) }) : null; }
// FLOW51b (Nick TG ~18:50 "I'm locked on this page"): Cancel this reel, on the upload page and every brief step. Clears this phone's draft
// and goes Home. Nothing on the server is deleted: clips already uploaded stay in Reels, and no edit starts without a brief.
function nfCancelAsk() {
  const dr = S.draft || {}, busy = upList(nfUpReel()).some(x => x.state === "up" || x.state === "wait"), had = (dr.batches || []).length || upList(nfUpReel()).some(x => x.state === "done");
  sheet(`<h3 style="font-size:24px;font-family:var(--serif);font-weight:400">Cancel this reel?</h3><p class="muted" style="margin:6px 0 0">Your picks are cleared.${had ? " Clips you already uploaded stay safe with us and wait in Drafts on New reel. Nothing is deleted, and nothing is edited without a brief." : ""}${busy ? " Uploads still running will stop." : ""}</p>
    <div class="row" style="margin-top:16px;gap:8px"><button class="btn primary" id="cxyes" style="flex:1">Cancel this reel</button><button class="btn line" id="cxno" style="flex:1">Keep going</button></div>`);
  $("#cxno").onclick = closeSheet;
  $("#cxyes").onclick = () => { try { const ip = nfInProg(); if (ip && ip.r) nfSetAside(ip.r, ip.clips.map(c => c.key)); } catch {}   // BETHFIX81 [M5 Max MBP] 2026-10-31
    const u = upState(), rid = nfUpReel(), m82 = new Set(upList(rid)); m82.forEach(x => { if (x.state !== "done") x.cancel = true; }); u.items = u.items.filter(x => !m82.has(x));   // NEWREEL82 [M5 Max MBP] 2026-10-31: never another reel's uploads
    S.briefFor = null;
    try { const R = f122Rec(); if (R.st === "rec") f122RecStop(); R.st = "idle"; R.blob = null; } catch {}
    try { store("sentb", [...new Set([...nf82Sent(), ...((S.draft || {}).batches || []).map(String)])].slice(-80)); } catch {}   // NEWREEL82: a cancelled reel's uploads never count for the next one
    S.draft = { ...DEFAULT_DRAFT(), freshAt: Date.now() }; store("draft", { freshAt: S.draft.freshAt }); S.step = 0; S.sent = false; S.f122cut = false; closeSheet(); setPageY(0); go("home"); toast("Reel cancelled. Your picks are cleared."); };   // NEWREEL82 [M5 Max MBP] 2026-10-31: freshAt, its clips never ride into the next reel
}
// FLOW51 (Nick TG 18:3x): every step needs a pick before Next works. "" = ready, else the gentle reason. Last touches: only the length is
// needed, the reference link and the notes stay optional.
function f122Need(dr, pg) {
  const P = "Pick one to continue.", path = f122(dr).path;
  if (pg === "captions" && path === "custom") return dr.cap122 === "no" || dr.captions === "No captions" || dr.lookMode === "surprise" || dr.lookMode === "same" || dr.lookMode === "tell" || (dr.lookMode === "pick" && dr.look) ? "" : P;
  if (pg === "mg") { const has = mgPicks(dr).length || dr.mgCarousel; if (!["pick", "mix", "decide", "none"].includes(dr.mgMode) && !has) return P; return dr.mgMode === "pick" && !has ? "Pick at least one, or tap You choose." : ""; }
  if (pg === "bg") return f122Bg(dr) ? "" : P;
  if (pg === "vo") { const v = f122VoKey(dr); if (!v) return P;
    if (v === "upload" || v === "record") { const it = f122VoItem(dr); if (it && it.state === "fail") return "Your voiceover did not finish uploading. Tap Try again."; if (it && it.state !== "done") return "Your voiceover is still uploading. One moment.";
      if (!f122VoDone(dr)) return v === "upload" ? "Choose your voiceover file to continue." : f122Rec().st === "done" ? "Tap Use this recording to continue." : "Record your voiceover to continue."; }
    return ""; }
  if (pg === "music") { const mp = dr.music === "No music" ? "none" : dr.musicPick || ""; if (!mp) return P;
    if (mp === "song" && !String(dr.song || "").trim()) return "Type the song name or paste a link.";
    if (mp === "trending" && !dr.trendId) return "Pick a trending song to continue."; return ""; }
  if (pg === "vtype") return vtypeOf(dr) || dr.vtDecide ? "" : P;
  if (pg === "extras") return dr.len ? "" : "Pick a length to continue.";
  return "";
}
const F122_SWATCH = [["White", "#ffffff"], ["Cream", "#f4ead8"], ["Lilac", "#cdbcf7"], ["Pink", "#f7c6d9"], ["Sky", "#bfe0ff"], ["Mint", "#c4ecd6"], ["Black", "#16171c"]];
const F122_CHECK = [["Blue", "#3f6fe0"], ["Pink", "#f08bb6"], ["Black", "#16171c"], ["Green", "#3fae6b"], ["Lilac", "#a98bf5"]];
const F122_LEN = [["short", "Short", "Under 30 seconds"], ["mid", "Medium", "30 to 60 seconds"], ["full", "As long as it needs", "Up to 1:30"]];
const F122_COLOR = [["natural", "Natural", "True to life"], ["warm", "Warm film", "Soft, warm, filmic"], ["bright", "Bright and airy", "Light and clean"], ["decide", "You decide", "We grade it to suit"]];
function f122(dr) { if (!dr.p122 || typeof dr.p122 !== "object") dr.p122 = { path: "", page: "", ret: "" }; return dr.p122; }
function f122Page(dr) { const p = f122(dr); if (!p.path || !F122[p.path] || p.page === "fork") return "fork"; if (p.page === "edit") p.page = p.path === "custom" ? "vtype" : "review"; return F122[p.path].includes(p.page) || (p.ret && p.page) ? p.page : F122[p.path][0]; }
function f122Bg(dr) {
  const k = dr.bg === "lilac" ? "popout" : dr.bg === "checker" ? "checker_" + String(dr.checkColour || "black").toLowerCase() : dr.bg;
  return F122_BG.find(o => o.k === k && !o.group) || F122_CUT.find(o => o.k === k) || (dr.bg === "checker" ? { k: "checker", n: "Checker background", line: "checker background, " + String(dr.checkColour || "black").toLowerCase() + " and white (me cut out over a checkerboard)" } : null); }
function f122CutMedia(o) { return `<span class="f122pat" style="background:${o.pat}"></span>${o.v ? `<video class="f122v" muted playsinline loop autoplay preload="metadata" poster="/flow/${esc(o.v)}.jpg" src="/flow/${esc(o.v)}.mp4" onerror="this.remove()"></video>` : ""}`; }
function f122Pace(dr) { return F122_PACE.find(o => o.k === dr.pace) || null; }
const V200F = [["all", "All", () => true], ["female", "Women", v => v.g === "female"], ["male", "Men", v => v.g === "male"], ["young", "Young", v => v.a === "young"],
  ["older", "Older", v => v.a === "middle_aged" || v.a === "old"], ["american", "American", v => v.acc === "american"], ["british", "British", v => v.acc === "british"],
  ["other", "Other accents", v => v.acc && v.acc !== "american" && v.acc !== "british"]];
function v200Html(dr) {
  const f = S.vo200f || "all", test = (V200F.find(x => x[0] === f) || V200F[0])[2];
  const list = F122_VOICES.filter(v => v.p && !v.h && test(v)), extra = F122_VOICES.filter(v => !v.p && !v.h);
  return `<div class="v200chips">${V200F.filter(x => F122_VOICES.some(v => v.p && x[2](v))).map(x => `<button type="button" class="chip${f === x[0] ? " on" : ""}" data-v200f="${x[0]}">${x[1]}</button>`).join("")}</div>
    <div class="v200list">${list.map(v => `<div class="v200row${dr.voVoice === v.k ? " on" : ""}"><button type="button" class="v200play" data-v200p="${esc(v.p)}" aria-label="Play ${esc(v.n)}">\u25B6</button><button type="button" class="v200pick" data-voice122="${v.k}"><b>${esc(v.n)}</b><small>${esc(v.s)}</small></button>${dr.voVoice === v.k ? '<span class="v200ck">\u2713</span>' : ""}</div>`).join("")}</div>
    <div class="opt f122voices" style="margin-top:10px">${extra.map(v => `<button type="button" data-voice122="${v.k}" class="${dr.voVoice === v.k ? "on" : ""}"><span>${esc(v.n)}</span></button>`).join("")}</div>`;
}
(() => {   // VOICES200: one shared player; a filter chip re-renders the step
  let au = null, cur = null;
  document.addEventListener("click", e => {
    const c = e.target.closest && e.target.closest("[data-v200f]"); if (c) { e.preventDefault(); S.vo200f = c.dataset.v200f; render(); return; }
    const b = e.target.closest && e.target.closest("[data-v200p]"); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    if (au && cur === b.dataset.v200p && !au.paused) { au.pause(); b.textContent = "\u25B6"; return; }
    document.querySelectorAll(".v200play").forEach(x => x.textContent = "\u25B6");
    if (au) au.pause(); au = new Audio(b.dataset.v200p); cur = b.dataset.v200p; b.textContent = "\u275A\u275A";
    au.onended = () => { b.textContent = "\u25B6"; }; au.play().catch(() => { b.textContent = "\u25B6"; try { toast("Could not play that sample."); } catch {} });
  }, true);
})();
function f122Voice(dr) { return F122_VOICES.find(o => o.k === dr.voVoice) || null; }
function f122Media(v, ph) {
  if (!v) return `<span class="f122ph">${esc(ph || "Example coming soon")}</span>`;
  const src = v.startsWith("../") ? "/" + v.slice(3) : "/flow/" + v;
  return `<video class="f122v" muted playsinline loop autoplay preload="metadata" poster="${esc(src)}.jpg" src="${esc(src)}.mp4"></video>`; }
function f122Opt(o, on, attr, media) { return `<button type="button" class="f122o${on ? " on" : ""}" ${attr}="${esc(o.k)}"><span class="f122m">${media}</span><span class="f122t"><b>${esc(o.n)}</b></span></button>`; }   // SIMPLE50 2026-10-28: names only
function f122Pills(list, cur, attr, cls) { return `<div class="opt f122pills ${cls || ""}">${list.map(([k, n, s]) => `<button type="button" ${attr}="${esc(k)}" class="${cur === k ? "on" : ""}"><span>${esc(n)}</span></button>`).join("")}</div>`; }   // SIMPLE50: names only
// SOLIDCAPS (Nick TG 2026-10-28: "I need to see a check mark ... with that text animating in a small way ... next to the marble stack and check
// mark"): the current pick(s) of a step, at the top of the step, as small solid previews with a check and the name easing in. The old
// "On a reel / On white / On shimmer" toggle (f122Bd) is gone: tiles are on plain backgrounds by default now.
function f122Picked(list, lab) {
  if (!list.length) return "";
  return `<div class="f122pk" role="status">${list.map(l => { const _p = (typeof uiMedia === "function" && uiMedia(l) || {}).poster || l.solid_poster || l.poster; return `<span class="f122pki">${_p ? `<img src="${esc(_p)}" alt="">` : ""}<i class="f122pkc">${CHK}</i></span>`; }).join("")}
    <span class="f122pkt"><small>${esc(lab || "Picked")}</small><b>${list.map(l => esc(l.name)).join(", ")}</b></span></div>`;
}
// What each step currently says, for the review page (built path: an untouched step is "From your style").
function f122Val(dr, step) {
  const built = f122(dr).path === "built" || f122(dr).path === "same", dflt = built ? "From your style" : f122(dr).path === "tell" ? "From your words" : "You decide";
  if (step === "styles" && tplMgOf(dr)) return tplMgOf(dr).name;   // MG78TPL
  if (step === "styles") return dr.lookMode === "same" ? "Same as last time" + (lastLook() ? " (" + lastLook() + ")" : "") : dr.look && byCode(dr.look) ? byCode(dr.look).name : vtypeOf(dr) ? vtypeOf(dr).label : "Not picked yet";
  if (step === "captions") { const cx = f122(dr).path === "custom" && dr.captions !== "No captions" ? [dr.hook, dr.glass, dr.vine].filter(c => c && byCode(c)).map(c => ", " + byCode(c).name).join("") : "";   // QAFLOW50: custom picks these on the Captions step
    return (dr.captions === "No captions" ? "No captions" : dr.lookMode === "pick" && dr.look && byCode(dr.look) ? byCode(dr.look).name + (dr.look2 && byCode(dr.look2) ? " and " + byCode(dr.look2).name : "") : dr.lookMode === "same" ? "Same as last time" : dr.lookMode === "tell" ? "From your words" : dflt) + cx; }
  if (step === "mg") { const m = mgPicks(dr).map(c => byCode(c).name); if (dr.mgCarousel) m.push("Photo carousel"); return dr.mgMode === "none" && !dr.mgCarousel ? "None" : m.length ? m.join(", ") + (dr.mgMode === "mix" ? ", plus your picks" : "") : dr.mgMode === "decide" || dr.mgMode === "mix" ? "You choose" : dflt; }
  if (step === "bg") { const b = f122Bg(dr); return b ? b.n + (b.k === "color" && dr.colour ? ", " + dr.colour : "") : dflt; }
  if (step === "vtype") return vtypeOf(dr) ? vtypeOf(dr).label : dr.vtDecide ? "You decide" : "Not picked";
  if (step === "edit") { const p = f122Pace(dr); const ai = (dr.ai || []).map(k => (F122_AI.find(x => x.k === k) || {}).n).filter(Boolean); return (p ? p.n : dflt) + (dr.broll.startsWith("Add") ? ", B-roll" + (dr.brollOwn ? " (mine)" : "") : dr.brollSet ? ", no B-roll" : "") + (ai.length ? ", " + ai.join(", ") : ""); }
  if (step === "vo") { const v = f122Voice(dr), k = f122VoKey(dr); return k === "ai" ? "AI voiceover" + (v ? ", " + v.n : "") : k === "any" ? "Yes, you decide how" : k === "upload" ? "Your uploaded voiceover" + (dr.voFile ? " (" + dr.voFile + ")" : "") : k === "record" ? "Your recorded voiceover" : k === "no" ? "No voiceover" : f122(dr).path === "one" ? "You decide" : "Not picked"; }   // FLOW51
  if (step === "music") return dr.music === "No music" ? "No music" : dr.musicPick === "song" && String(dr.song || "").trim() ? String(dr.song).trim() : dr.musicPick === "trending" && f122TrPick(dr) ? "Trending: " + (f122TrPick(dr).name || f122TrPick(dr).artist + " - " + f122TrPick(dr).title) : dr.musicPick === "decide" ? "You decide" : dflt;   // FLOW51
  if (step === "extras") { const x = []; const L = F122_LEN.find(y => y[0] === dr.len), C = SHOW_COLOR ? (F122_COLOR.find(y => y[0] === dr.grade) || (color50(dr.grade) ? [dr.grade, color50(dr.grade).n] : null)) : null; if (L) x.push(L[1]); if (C) x.push(C[1] + " color"); if (f122(dr).path !== "custom") { if (dr.hook && byCode(dr.hook)) x.push("hook: " + byCode(dr.hook).name); if (dr.glass && byCode(dr.glass)) x.push(byCode(dr.glass).name); if (dr.vine && byCode(dr.vine)) x.push(byCode(dr.vine).name); } if (refUrl(dr.reference)) x.push("reference reel"); if (String(dr.notes || "").trim()) x.push("notes"); return x.length ? x.join(", ") : "Nothing extra"; }
  if (step === "tell") return String(dr.tell || "").trim() ? String(dr.tell).trim().slice(0, 90) + (String(dr.tell).trim().length > 90 ? "..." : "") : "Not written yet";
  return "";
}
// The brief lines FLOW122 adds (briefText calls this). Old briefs never had them, so the Mac reads both.
const tplMgOf = d => { const c = d && d.tplMg, l = c && byCode(c); return l && isTemplate(l) && l.role === "motion" && f122(d).path === "built" && mgPicks(d).includes(c) ? l : null; };   // MG78TPL
function f122Lines(d) {
  const out = [], p = f122(d), tm = tplMgOf(d);
  if (tm && tm.code === "MG86") out.push("Built-out style: " + tm.name + " (" + tm.code + "), an editing template: every point I make is demoed live on my own shot with a different effect (phone frame break, doodle outline, command card, pull-back window), one after another; captions as I picked, otherwise a clean caption style that suits my footage; only what I changed below differs");   // LISTDEMO86 [M5 Max MBP] 2026-11-02 07:17 PST
  else if (tm) out.push("Built-out style: " + tm.name + " (" + tm.code + "), a transition template: the " + tm.name + " transition on every cut between my shots is the look; captions as I picked, otherwise a clean caption style that suits my footage; only what I changed below differs");   // MG78TPL
  else if ((p.path === "built" || p.path === "same") && d.lookMode === "pick" && d.look && byCode(d.look)) out.push("Built-out style: " + byCode(d.look).name + " (" + askCode(byCode(d.look)) + "), its captions, editing and motion graphics as a set; only what I changed below differs");
  else if (p.path === "built" && vtypeOf(d)) out.push("Built-out style: " + vtypeOf(d).label + " (video type)");
  else if (p.path === "lumi") out.push("Built-out style: none, Let Lumi choose (LUMICHOOSE108): you pick the style that suits my footage and me (a look for him or for her), with captions, 1 to 3 motion graphics, effects and music");   // LUMICHOOSE108
  else if (p.path === "custom") out.push("Built-out style: none, I customized it step by step" + (r113Ls(d).length > 1 ? " (starting from " + r113Ls(d).map(x => x.name + " (" + x.code + ")").join(", ") + ", which I picked on the Styles page)" : f122One(d) ? " (starting from " + f122One(d).name + " (" + f122One(d).code + "), which I picked on the Styles page)" : ""));
  else if (p.path === "one" && r113Ls(d).length > 1) out.push("Built-out style: none. On the Styles page I picked " + r113Ls(d).map(x => x.name + " (" + x.code + ")").join(", ") + " (RECIPE113); use every one of them, and you decide everything else (background, voiceover, music, pacing, length" + (r113Ls(d).some(x => x.role === "look") ? "" : ", captions") + (r113Ls(d).some(x => x.role === "motion") ? ", more motion graphics where they fit" : ", motion graphics") + ") to suit my footage");   // RECIPE113
  else if (p.path === "one" && f122One(d)) out.push("Built-out style: none. I picked only " + f122One(d).name + " (" + f122One(d).code + ") on the Styles page; you decide everything else (captions, motion graphics, background, voiceover, music, pacing, length) to suit my footage");   // FLOW51b
  if (d.tp155) out.push("Hook pack: yes, 4 openings to test as Instagram trial reels (TRIALPACK155: made automatically from the delivered reel after delivery, not part of this edit)");   // TRIALPACK155
  if (d.mgCarousel) out.push("Motion graphics add-on: Photo carousel (F35), photos " + ({ own: "from my own uploads (use every photo I send)", ai: "AI-generated for what I say", web: "real photos sourced from the internet", decide: "you decide where they come from" }[d.carSrc] || "you decide where they come from"));   // CAROUSELMG50
  { const vx = mgPicks(d).map(byCode).filter(isVfx194); if (vx.length) out.push("Visual effects: " + vx.map(x => x.name + " (" + x.code + ")").join(", ") + " (VFX194: added into my real footage where the shot suits it; if a shot does not suit it, leave the effect out and deliver the reel as normal)"); }   // FXLOOKS194 [M5 Max MBP] 2026-11-11
  if (d.mgMode === "none" && !mgPicks(d).length && !d.mgCarousel) out.push("Motion graphics: none");   // STYLES50: White canvas option removed (engine decides)
  else if (d.mgMode === "mix") out.push(mgPicks(d).length || d.mgCarousel ? "Motion graphics: I picked " + [...mgPicks(d).filter(c => !isVfx194(byCode(c))), ...(d.mgCarousel ? ["F35"] : [])].join(", ") + ", and you add more where they fit my words" : "Motion graphics: you choose the ones that fit my words");
  else if (d.mgMode === "decide" && !mgPicks(d).length) out.push("Motion graphics: you choose the ones that fit my words");
  { const pc = f122Pace(d); if (pc) out.push("Editing style: " + pc.line); }
  if ((d.ai || []).length) out.push("AI extras: " + d.ai.map(k => (F122_AI.find(x => x.k === k) || {}).line).filter(Boolean).join("; "));
  const vk = f122VoKey(d), vnote = String(d.voNote || "").trim() ? ". What I want: " + String(d.voNote).trim().replace(/\s*[\r\n]+\s*/g, " / ").slice(0, 3000) : "";   // FLOW51
  if (vk === "any") out.push("Voiceover: yes, a voiceover, you decide how (an AI voiceover is fine)" + vnote);
  else if (vk === "upload" && d.voFile) out.push("Voiceover: I uploaded my own (file " + d.voFile + "). Use it as the voice track, it is not a clip");
  else if (vk === "record" && d.voFile) out.push("Voiceover: I recorded my own (file " + d.voFile + "). Use it as the voice track, it is not a clip");
  if ((d.voOld || []).filter(n => n !== d.voFile).length) out.push("Voiceover takes to ignore (older takes, not clips): " + d.voOld.filter(n => n !== d.voFile).join(", "));
  if (vk === "ai") { const v = f122Voice(d); out.push("Voiceover: yes, an AI voiceover (ElevenLabs)" + (String(d.voNote || "").trim() ? ". What I want: " + String(d.voNote).trim().replace(/\s*[\r\n]+\s*/g, " / ").slice(0, 3000) : ""));
    out.push("Voice: " + (!v || v.k === "options" ? "send me a few voice options to choose from" : v.k === "custom" ? "custom, as I describe it above; send me a few options" : v.n + ", " + v.s.toLowerCase() + " (ElevenLabs voice_id " + v.id + ")")); }
  else if (vk === "no") out.push("Voiceover: no");
  { const L = F122_LEN.find(y => y[0] === d.len); if (L) out.push("Length: " + L[1].toLowerCase() + " (" + L[2].toLowerCase() + ")"); }
  if (SHOW_COLOR) { const C = F122_COLOR.find(y => y[0] === d.grade); if (C) out.push("Color: " + C[1].toLowerCase() + (C[0] === "decide" ? "" : " (" + C[2].toLowerCase() + ")"));
    else { const c5 = typeof color50 === "function" && color50(d.grade); if (c5) out.push("Color: " + c5.n.toLowerCase() + " (" + c5.s.toLowerCase().replace(/\.$/, "") + ")"); } }   // STYLES50: picked in Styles > Color
  out.push("Every clip: use every clip I uploaded");
  return out;
}
function f122BgLine(d) {
  const b = f122Bg(d);
  if (!b) return f122(d).path === "built" ? "the one that comes with my style" : f122(d).path === "tell" ? "as I describe in my own words (keep it as filmed if I did not say)" : d.background === "A solid color" ? "a solid color" + (d.colour ? ", " + d.colour : "") : f122(d).path === "custom" ? "you decide what suits my footage" : String(d.background || "Keep it as filmed").toLowerCase();
  if (b.k === "color") return "a solid color" + (d.colour ? ", " + d.colour : "") + ", me cut out over it";
  return b.line;
}
function f122MusicLine(d) {
  if (d.music === "No music") return "no music";
  const s = String(d.song || "").trim();
  if (d.musicPick === "song" && s) return "yes, plus a version without music. Use this song: " + s.replace(/[\r\n]+/g, " ").slice(0, 300);
  if (d.musicPick === "decide") return "yes, plus a version without music. You decide the song (one that fits, trending is great)";
  if (d.musicPick === "trending" && d.trendId) { const t = f122TrPick(d) || {}; return "trending, " + (t.name || (t.artist + " - " + t.title)) + ", plus a version without music (Lumi trending library track " + d.trendId + ")"; }   // FLOW51
  return null;
}
function f122Head(dr, pg) {
  const p = f122(dr), list = F122[p.path] || [], i = list.indexOf(pg);
  if (p.ret && pg !== "review") return `<p class="f122step">Changing ${esc(F122_NAMES[pg] || "")}</p>`;
  if (p.path === "custom" && i >= 0 && pg !== "review") return `<p class="f122step">Step ${i + 1} of ${list.length - 1}</p><div class="f122bar"><i style="width:${Math.round((i + 1) / (list.length - 1) * 100)}%"></i></div>`;
  return "";
}
function f122Html(dr, d, a) {
  const p = f122(dr), pg = f122Page(dr);
  let h = "";
  if (pg === "fork" && f122One(dr)) {   // FLOW51b
    const o1 = f122One(dr), r113 = r113Ls(dr), many = r113.length > 1, kind = many ? "picks" : o1.role === "look" ? "caption" : o1.role === "motion" ? "motion graphic" : o1.role === "hook" ? "hook" : "pick";   // RECIPE113: a recipe of several picks
    h += many ? `<h1>You picked <i>${r113.length} things.</i></h1><p class="sub">These are chosen so far. How do you want the rest?</p>
      ${f122Picked(r113, "Your picks")}` : `<h1>You picked <i>${esc(o1.name)}.</i></h1><p class="sub">That is the only thing chosen so far. How do you want the rest?</p>
      ${f122Picked([o1.l], "Your " + kind)}`;
    h += `
      <div class="f122one"><button type="button" data-one122="with" class="${p.path === "custom" ? "on" : ""}"><b>Build the rest with me</b><small>Go through the other steps, ${many ? "your picks are" : "your " + esc(kind) + " is"} already picked</small></button>
        <button type="button" data-one122="rest" class="${p.path === "one" ? "on" : ""}"><b>That's the one I like. You build the rest</b><small>We choose everything else to suit your footage</small></button></div>
      <button type="button" class="f122link" data-onereset122="1">Start over and pick a different way</button>`;
    return h;
  }
  if (pg === "fork") {
    const ll = (d.account || {}).returning ? (savedLook().name || lastLook()) : lastLook();
    const bl = looks().find(l => l.code === "F35") || filtered("newest")[0] || {};
    h += `<h1>Your <i>style.</i></h1><p class="sub">Pick one. You can still change anything after.</p>
      <div class="f122hand three" id="f122hand">
        <button type="button" class="f122card c1${p.path === "built" ? " on" : ""}" data-path122="built"><span class="f122ct">Choose a fully built-out style</span>
          <span class="f122box">${bl.video ? `<video muted playsinline loop autoplay preload="metadata" poster="${esc(bl.poster || "")}" src="${esc(bl.video)}"></video>` : ""}</span>
          <small>Captions, editing and motion graphics in one</small></button>
        <button type="button" class="f122card c3${p.path === "lumi" ? " on" : ""}" data-path122="lumi"><span class="f122ct">Let Lumi choose</span>
          <span class="f122box f122lumi"><img src="/lumi/head.png" alt="Lumi" loading="lazy"></span>
          <small>We pick the style, captions, graphics and music for you</small></button>
        <button type="button" class="f122card c2${p.path === "custom" ? " on" : ""}" data-path122="custom"><span class="f122ct">Customize your reel</span>
          <span class="f122box">${f122Media("bg_lilac")}</span>
          <small>Captions, graphics, background, music, one step at a time</small></button></div>
      <div class="f122alt">${ll ? `<button type="button" data-path122="same" class="${p.path === "same" ? "on" : ""}"><span class="ai200"><svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg></span><span class="tx200">Same as last time<small>${esc(ll)}</small></span></button>` : ""}
        <button type="button" data-path122="tell" class="${p.path === "tell" ? "on" : ""}"><span class="ai200"><svg viewBox="0 0 24 24"><path d="M4 20l4-1 11-11-3-3L5 16z"/></svg></span><span class="tx200">Write it in my own words<small>Tell us what you want</small></span></button></div>`;
    return h;
  }
  h += f122Head(dr, pg);
  if (pg === "styles") {
    h += `<h1>Pick a <i>style.</i></h1><p class="sub">Each one comes with its captions, editing and motion graphics. Tap one to watch it.</p>
      <div class="chips" id="bk">${[["all", "Everyone"], ["female", "For her"], ["male", "For him"]].map(([k, n]) => `<button data-b="${k}" class="${S.book === k ? "on" : ""}">${n}</button>`).join("")}</div>`;
    for (const fam of ["newest", "softer", "bolder", "other"]) {
      const list = filtered(fam); if (!list.length) continue;
      h += `<h2 class="f122h2">${fam === "other" ? "Story styles" : FAM[fam]}</h2>` + strip(list, { act: "pick", sel: l => dr.lookMode === "pick" && dr.look === l.code, size: "big" });
    }
    const fm = (S.fmts || []).filter(f => f.id !== "founder_story");
    if (fm.length) h += `<h2 class="f122h2">Video types</h2><p class="spd">A ready-made format. We cut it the way that type of video works.</p><div class="f122grid f122fm">${fm.map(f => `<button type="button" class="f122o${dr.videoType === f.id ? " on" : ""}" data-vt122="${esc(f.id)}"><span class="f122m">${f.example ? `<video class="f122v" muted playsinline loop autoplay preload="metadata" poster="/${esc(f.poster || f.thumb || "")}" src="/${esc(f.example)}"></video>` : f.thumb ? `<img src="/${esc(f.thumb)}" alt="" loading="lazy">` : ""}</span><span class="f122t"><b>${esc(f.label)}</b>${f.blurb ? `<small>${esc(f.blurb)}</small>` : ""}</span></button>`).join("")}</div>`;
  }
  if (pg === "captions") {
    const on = dr.captions !== "No captions";
    h += `<h1><i>Captions?</i></h1>${f122Pills([["yes", "Yes"], ["no", "No captions"]], dr.cap122 || (on ? "yes" : "no"), "data-cap122")}`;
    if (on) {
      const cf52 = ["all", "softer", "bolder", "glass"].includes(S.cfam) ? S.cfam : "all";   // STYLES52: the Styles Captions filters, here too
      const _cs = new Set(), caps = femLast56(top52((cf52 === "all" ? ["newest", "softer", "bolder"] : [cf52]).flatMap(fm => filtered(fm)).filter(l => !_cs.has(l.code) && _cs.add(l.code)).sort((a, b) => (b.solid_video ? 1 : 0) - (a.solid_video ? 1 : 0))));   // SOLIDCAPS: plain-background previews first; FEMALE56: Female last
      const pk = dr.lookMode === "pick" && dr.look && byCode(dr.look) ? [byCode(dr.look), ...(dr.look2 && byCode(dr.look2) ? [byCode(dr.look2)] : [])] : [], px = [dr.hook, dr.glass, dr.vine].filter(c => c && byCode(c)).map(byCode);
      h += `${f122Picked(pk.map(l => (dr.simple || {})[l.code] ? Object.assign({}, l, { name: l.name + " + simple text" }) : l).concat(px), pk.length ? "Your caption style" : "Picked")}${pk.length ? `<div class="chips f122chips f122simp">${pk.map(l => `<button type="button" data-simple122="${esc(l.code)}" class="${(dr.simple || {})[l.code] ? "on" : ""}">${esc(l.name)} + simple text</button>`).join("")}${pk.some(l => l.code === "M10") ? `<button type="button" data-nograin200="1" class="${dr.nograin ? "on" : ""}">No grain</button>` : ""}</div>` : ""}${!pk.length && dr.lookMode === "surprise" ? `<div class="f122pk"><span class="f122pki dec"><i class="f122pkc">${CHK}</i></span><span class="f122pkt"><small>Your caption style</small><b>You decide for me</b></span></div>` : ""}
        <button type="button" class="f122dec${dr.lookMode === "surprise" ? " on" : ""}" data-capdec122="1"><b>You decide</b></button>
        <div class="chips f122chips" id="bk122">${[["all", "Everyone"], ["female", "For her"], ["male", "For him"]].map(([k, n]) => `<button type="button" data-bk122="${k}" class="${S.book === k ? "on" : ""}">${n}</button>`).join("")}</div>
        <div class="chips f122chips">${[["all", "All"], ["softer", "Softer"], ["bolder", "Bolder"], ["glass", "Glass"]].map(([k, n]) => `<button type="button" data-cf122="${k}" class="${cf52 === k ? "on" : ""}">${n}</button>`).join("")}</div>
        ${caps.length ? "" : `<div class="card" style="margin:8px 0;text-align:center"><p style="margin:0 0 10px">${cf52 === "softer" ? "The softer book is made for her." : cf52 === "bolder" ? "The bolder book is made for him." : "No captions match these filters."}</p><button class="btn line" type="button" data-bkall122="1">Show everyone</button></div>`}
        ${pickCount(dr.lookMode === "pick" ? [dr.look, dr.look2].filter(c => c && byCode(c)).length : 0, 2, "Pick 1 or 2")}
        <div class="f122mg">${caps.filter(l => ALPHA52.has(l.code) || FEM56.has(l.code)).map(l => numTile(tile(l, { act: "pick", on: dr.lookMode === "pick" && (dr.look === l.code || dr.look2 === l.code), size: "small", solid: true, ui: true }), dr.lookMode === "pick" ? (dr.look === l.code ? 1 : dr.look2 === l.code ? 2 : 0) : 0)).join("")}</div>
        <details class="f122more"${dr.hook || dr.glass || dr.vine ? " open" : ""}><summary>Hook and key word extras</summary>
          <div class="f122mg">${newFirst(looks().filter(l => l.role === "hook" || l.role === "glass" || l.role === "vine")).map(l => tile(l, { act: "pick", on: [dr.hook, dr.glass, dr.vine].includes(l.code), size: "small", solid: true, ui: true })).join("")}</div></details>`;
    }
  }
  if (pg === "mg") {
    // SOLIDCAPS (Nick TG 2026-10-28: "see all these motion graphics against a white background or some sort of plain background ... click on them and
    // see them play on actual footage" + "'on a white canvas' ... needs to just be an option they can pick. Photo carousel should be an option they can
    // pick as well. There's too much scrolling"): add-ons first as two small pickable cards, carousel sources right under it, then the plain-background grid.
    const m = dr.mgMode || (mgPicks(dr).length ? "pick" : "");
    if (dr.mgWhite) { delete dr.mgWhite; store("draft", dr); }   // STYLES50 (Nick TG 2026-10-29): White canvas is not a motion graphic, the engine decides white screens
    const pk = mgPicks(dr).map(byCode).filter(Boolean).concat(dr.mgCarousel ? [{ name: "Photo carousel", poster: "/ex/F35_ad048.jpg" }] : []);
    h += `<h1>Motion <i>graphics?</i></h1>
      ${f122Picked(pk, "Your motion graphics")}
      ${f122Pills([["pick", "Let me pick"], ["mix", "I'll pick some, you add the rest"], ["decide", "You choose"], ["none", "None"]], m, "data-mg122", "four")}`;
    // STYLES50 (Nick TG 2026-10-29 "why is the photo carousel so small ... not even part of it?"): Photo carousel is a full tile in the grid, its
    // photo sources right under it when picked. The grid shows for Let me pick / I'll pick some; You choose keeps only the carousel tile.
    const carT = `<div class="mv small sq f122car${dr.mgCarousel ? " on" : ""}" data-car122="carousel" data-act="car" role="button" tabindex="0" aria-pressed="${dr.mgCarousel ? "true" : "false"}"><img src="/ex/F35_ad048.jpg" alt="" loading="lazy"><video muted playsinline loop preload="none" poster="/ex/F35_ad048.jpg" data-src="/ex/F35_ad048.mp4"></video><div class="shade"></div><span class="chk">${CHK}</span><div class="cap">Photo carousel <span class="lcode">(F35)</span></div></div>`;
    const carSrc = dr.mgCarousel ? `<div class="f122carsrc"><p class="spd" style="margin:2px 0 0"><b>Carousel photos from</b></p>
      ${f122Pills([["own", "My own photos"], ["ai", "AI photos"], ["web", "Real web photos"], ["decide", "You decide"]], dr.carSrc || "", "data-carsrc122", "")}</div>` : "";
    // MGDECIDE52 [M5 Max MBP] 2026-10-29 (Nick: "When I say 'You Choose' there needs to be a graphic that says 'We will choose your motion
    // graphics'"): You choose / None show a confirmation card instead of the grid; the Photo carousel card only under Let me pick / I'll pick some.
    if (m === "decide" || m === "none") h += `<div class="card f122conf" role="status"><img src="/lumi/got.webp" alt=""><div><b>${m === "decide" ? "We'll choose your motion graphics" : "No motion graphics, just your captions"}</b><span>${m === "decide" ? "Picked to match your caption style and colors." : "You can still add them later in a revision."}</span></div></div>`;
    if (m !== "none" && m !== "decide") {
      const motion = femLast56(newFirst(looks().filter(l => l.role === "motion" && !HIDE_MG51.has(l.code))));      // NEWTOP77   // FEMALE56: Female last
      const mgN = mgPicks(dr).length + (dr.mgCarousel ? 1 : 0);
      h += `${m === "decide" ? "" : pickCount(mgN, 4, "Pick up to 4")}<div class="f122mg mgq64">${mgq64(carT, null, dr.mgCarousel)}${carSrc}${motion.map(l => mgq64(tile(l, { act: "pick", on: mgPicks(dr).includes(l.code), size: "small", solid: true, ui: true }), l, mgPicks(dr).includes(l.code))).join("")}</div>`;   // MGPICK64: corner circle replaces the numbered badge (order shows in Your motion graphics)
    }
  }
  // FLOW51 [M5 Max MBP] 2026-10-29 18:4x PDT: restored, these six page renderers were lost in an edit at 18:23 (every step after Motion graphics showed blank)
  if (pg === "bg") {
    const cur = f122Bg(dr), inCut = !!(cur && F122_CUT.some(o => o.k === cur.k)), open = inCut || S.f122cut;
    h += `<h1>Your <i>background.</i></h1>
      ${cur ? `<div class="f122pk" role="status"><span class="f122pki"><span class="f122pat" style="background:${cur.pat || "var(--card2)"}"></span><i class="f122pkc">${CHK}</i></span><span class="f122pkt"><small>Your background</small><b>${esc(cur.n)}${cur.k === "color" && dr.colour ? ", " + esc(dr.colour) : ""}</b></span></div>` : ""}
      <div class="f122grid g3">${F122_BG.map(o => o.group ? `<button type="button" class="f122o${inCut ? " on" : ""}${open ? " open" : ""}" data-bgcut122="1"><span class="f122m"><span class="f122mos">${F122_CUT.slice(0, 4).map(c => `<i style="background:${c.pat}"></i>`).join("")}</span></span><span class="f122t"><b>${esc(o.n)}</b></span></button>`
        : f122Opt(o, cur && cur.k === o.k, "data-bg122", o.dec ? `<span class="f122dc">✦</span>` : f122Media(o.v))).join("")}</div>`;
    if (open) h += `<div class="card f122sub f122cut"><div class="f122cutg">${F122_CUT.map(o => `<button type="button" class="f122o${cur && cur.k === o.k ? " on" : ""}" data-bg122="${o.k}"><span class="f122m">${f122CutMedia(o)}</span><span class="f122t"><b>${esc(o.n)}</b></span></button>`).join("")}</div>
      ${cur && cur.k === "color" ? `<div class="f122sws" style="margin-top:10px">${F122_SWATCH.map(([n, c]) => `<button type="button" data-col122="${esc(n)}" class="${dr.colour === n ? "on" : ""}" style="background:${c}" aria-label="${esc(n)}"></button>`).join("")}</div>
      <input class="text" id="colour" placeholder="Or type a color or a brand hex, e.g. #F4B6C2" value="${esc(dr.colour || "")}">` : ""}</div>`;
  }
  if (pg === "vtype") {
    if (!S.fmts) { try { loadFmts().then(() => { if (S.view === "new") render(); }); } catch {} }   // FLOW51: the list loads, never a blank step
    const fm = S.fmts || [];
    // FLOW51 (Nick TG 18:3x): "Not Sure, You Decide" is the FIRST tile, a 1950s "Wish you were here" postcard (flow/vt_decide_postcard, scripts in /tmp/flow51/postcard.py)
    h += `<h1>What type of <i>reel is this?</i></h1><p class="sub">This sets the pacing and graphics, not your whole look.</p>
      ${vtypeOf(dr) || dr.vtDecide ? `<div class="f122pk" role="status"><span class="f122pki">${vtypeOf(dr) && (vtypeOf(dr).poster || vtypeOf(dr).thumb) ? `<img src="/${esc(vtypeOf(dr).poster || vtypeOf(dr).thumb)}" alt="">` : !vtypeOf(dr) ? `<img src="/flow/vt_decide_postcard.webp" alt="">` : ""}<i class="f122pkc">${CHK}</i></span><span class="f122pkt"><small>Your reel type</small><b>${esc(vtypeOf(dr) ? vtypeOf(dr).label : "Not sure, you decide")}</b></span></div>` : ""}
      <div class="f122grid g3"><button type="button" class="f122o${!dr.videoType && dr.vtDecide ? " on" : ""}" data-vtdec122="1"><span class="f122m"><img class="f122pc" src="/flow/vt_decide_postcard.webp" alt="Not Sure, You Decide. Wish you were here postcard" onerror="this.onerror=null;this.src='/flow/vt_decide_postcard.jpg'"></span><span class="f122t"><b>Not Sure, You Decide</b></span></button>
        ${fm.length ? "" : `<p class="spd" style="grid-column:2/-1;align-self:center">Loading the reel types...</p>`}${fm.map(f => `<button type="button" class="f122o${dr.videoType === f.id ? " on" : ""}" data-vt122="${esc(f.id)}"><span class="f122m">${f.example ? `<video class="f122v" muted playsinline loop autoplay preload="metadata" poster="/${esc(f.poster || f.thumb || "")}" src="/${esc(f.example)}"></video>` : f.thumb ? `<img src="/${esc(f.thumb)}" alt="" loading="lazy">` : ""}</span><span class="f122t"><b>${esc(f.label)}</b></span></button>`).join("")}</div>`;
  }
  if (pg === "vo") {
    // FLOW51 (Nick TG 18:3x): five choices, the title centred right above them, the whole block in the middle of the screen. Record stays
    // on this step: an inline recorder (MediaRecorder; iPhone Safari records audio/mp4), the take uploads to this reel like a clip.
    const vo = f122VoKey(dr), R = f122Rec();
    h += `<div class="f122ctr"><h1>A <i>voiceover?</i></h1>
      <div class="opt f122vo">${F122_VO.map(([k, n]) => `<button type="button" data-vo122="${k}" class="${vo === k ? "on" : ""}"><span>${esc(n)}</span></button>`).join("")}</div>`;
    if (vo === "any" || vo === "ai") h += `<div class="f122vox"><label class="lbl" for="vonote">What should it say?${vo === "any" ? " <small>Optional</small>" : ""}</label>
      <textarea id="vonote" class="tellbox" maxlength="6000" placeholder="e.g. Read my caption in a calm, friendly voice. Or: translate what I say into Spanish.">${esc(dr.voNote || "")}</textarea>
      ${vo === "ai" ? `<h2 class="f122h2">Pick a voice</h2><p class="muted" style="margin:-4px 0 10px;font-size:13px">Tap \u25B6 to hear it, tap the name to choose it.</p>${v200Html(dr)}` : ""}</div>`;
    if (vo === "upload") h += `<div class="f122rec"><label class="btn ${dr.voFile ? "line" : "primary"} block" for="vofile122" role="button">${dr.voFile ? "Choose a different file" : "Choose your voiceover file"}</label>
      <input type="file" id="vofile122" class="vh" accept="audio/*,.m4a,.mp3,.wav,.aac"><small>A voice memo or an audio file: M4A, MP3 or WAV.</small>${f122VoStatus(dr)}</div>`;
    if (vo === "record") h += `<div class="f122rec" id="f122rec">${R.st === "rec" ? `<button type="button" class="f122recb on" data-rec122="stop" aria-label="Stop recording"><i class="sq"></i></button><b class="f122rect" id="f122rect">${f122Clock(Date.now() - R.t0)}</b><small>Recording. Tap the button to stop.</small>`
      : R.st === "done" ? `<audio controls playsinline preload="metadata" src="${esc(R.url)}"></audio><div class="f122recr"><button type="button" class="btn line" data-rec122="again">Record again</button><button type="button" class="btn primary" data-rec122="use">Use this recording</button></div><small>Play it back. Happy with it? Tap Use this recording.</small>`
      : `<button type="button" class="f122recb" data-rec122="start" aria-label="Start recording"><i class="dot"></i></button><b>${dr.voFile ? "Record a new take" : "Tap to record"}</b><small>Hold your phone close, in a quiet room.</small>`}${R.st === "rec" ? "" : f122VoStatus(dr)}</div>`;
    h += `</div>`;
  }
  if (pg === "music") {
    const mp = dr.music === "No music" ? "none" : dr.musicPick || "";
    h += `<h1>Any <i>music?</i></h1>
      ${f122Pills([["song", "A song I name"], ["trending", "Trending music"], ["decide", "You decide"], ["none", "No music"]], mp, "data-mu122", "four")}`;   // FLOW51: + Trending music
    if (mp === "song") h += `<label class="lbl" for="song122">Song name or link</label><input class="text" id="song122" maxlength="300" placeholder="e.g. Espresso by Sabrina Carpenter, or a TikTok sound link" value="${esc(dr.song || "")}" autocomplete="off">`;
    if (mp === "trending") {
      f122Trend(); const T = S.trend, tp = f122TrPick(dr);
      if (tp) h += `<div class="f122pk trpk" role="status">${tp.art && tp.preview ? `<button type="button" class="trpl${S.trPlaying === tp.id ? " on" : ""}" data-trplay="${esc(tp.id)}" aria-label="${S.trPlaying === tp.id ? "Pause" : "Play"} ${esc(tp.title || "")}"><img src="${esc(tp.art)}" alt=""><i class="ic"></i><i class="f122pkc">${CHK}</i></button>` : tp.art ? `<span class="trpl"><img src="${esc(tp.art)}" alt=""><i class="f122pkc">${CHK}</i></span>` : `<span class="f122pki dec"><i class="f122pkc">${CHK}</i></span>`}<span class="f122pkt"><small>Your trending song</small><b>${esc(tp.name || tp.artist + " - " + tp.title)}</b></span></div>`;   // TRPK51: the picked song shows its own square cover art
      h += !T ? `<p class="spd" style="margin-top:12px">Loading what is trending...</p>` : !T.length ? `<p class="spd" style="margin-top:12px">The trending list is not available right now. Pick A song I name or You decide.</p>`
        : `${f61Tabs(T)}<input class="text f122trs" id="trq122" type="search" placeholder="Search ${f61Shown(T).length} trending songs" value="${esc(S.trQ || "")}" autocomplete="off" autocapitalize="off">
        <div class="f122trl" id="trl122">${f61List(f61Shown(T), (t, i) => `<div class="trrow${dr.trendId === t.id ? " on" : ""}" data-trq="${esc((t.artist + " " + t.title).toLowerCase())}">${t.preview ? `<button type="button" class="trpl${S.trPlaying === t.id ? " on" : ""}" data-trplay="${esc(t.id)}" aria-label="${S.trPlaying === t.id ? "Pause" : "Play"} ${esc(t.title)}">${t.art ? `<img src="${esc(t.art)}" alt="" loading="lazy">` : ""}<i class="ic"></i></button>` : t.art ? `<img class="trart" src="${esc(t.art)}" alt="" loading="lazy">` : ""}<button type="button" class="trsel" data-tr122="${esc(t.id)}"><span class="n">${i + 1}</span><span style="min-width:0;flex:1"><b>${esc(t.title)}</b><small>${esc(t.artist)}${t.platform ? " · " + esc(t.platform) : ""}</small><span class="trwv" data-wv="${esc(t.id)}" aria-hidden="true"></span></span></button></div>`)}<p class="none" id="trnone122" hidden>No match. Try another word.</p></div>`;   // MUSIC61: vibe tabs + Slow parts
    }
  }
  if (pg === "extras") {
    h += `<h1>Last <i>touches.</i></h1>
      <h2 class="f122h2">Length</h2>${f122Pills(F122_LEN.map(([k, n, x]) => [k, x]), dr.len || "", "data-len122", "three")}
      ${f122(dr).path !== "custom" ? `<details class="f122more"${dr.hook || dr.glass || dr.vine ? " open" : ""}><summary>Caption extras <small>optional</small></summary><p class="spd">How your first line lands.</p>${strip(looks().filter(l => l.role === "hook"), { act: "pick", sel: l => dr.hook === l.code, size: "small", solid: true })}<p class="spd">A glass word or a blossom vine on your key word.</p>${strip(looks().filter(l => l.role === "glass" || l.role === "vine"), { act: "pick", sel: l => dr.glass === l.code || dr.vine === l.code, size: "small", solid: true })}</details>` : ""}
      <div class="card refcard" style="margin:14px 0 4px"><div class="eyebrow">Reference / inspiration reel <small>Optional, add a link</small></div>
          <input class="text" id="ref4" type="url" inputmode="url" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Instagram, TikTok, YouTube, Drive or Dropbox link" value="${esc(dr.reference)}" style="margin-top:6px">
          <p id="referr" style="font-size:13px;margin:6px 0 0;color:var(--red);display:${refUrl(dr.reference) === null ? "block" : "none"}">That does not look like a link yet. Paste the full link, for example https://www.instagram.com/reel/...</p>
          <div id="ru4" style="display:${refUrl(dr.reference) ? "block" : "none"}">${refUseHtml(dr)}</div>
          <div id="refm" style="display:${refUrl(dr.reference) && dr.refUse !== "music" ? "block" : "none"}"><label class="lbl" style="margin-top:12px">How close should we get?</label>
            <div class="opt" data-k="refMatch">${[["exact", "Copy it exactly", "Same pacing, captions, fonts, colors and layout"], ["inspiration", "Just inspiration", "A little like it, your caption style stays"]].map(([o, n, sm]) => `<button data-o="${o}" class="${refMatchOf(dr) === o ? "on" : ""}"><span>${n}<small>${sm}</small></span></button>`).join("")}</div></div></div>
      <label class="lbl" for="notes" style="margin-top:14px">Anything else?</label>
      <textarea id="notes" maxlength="20000" placeholder="The line you want as the hook, words to highlight, anything to avoid...">${esc(dr.notes)}</textarea>`;
  }
  if (pg === "tell") {
    h += `<h1>In your <i>words.</i></h1><p class="sub">The feel, the captions, the pace, anything. Tap the mic on your keyboard to talk instead.</p>
      <textarea id="tellt" class="tellbox" maxlength="20000" placeholder="e.g. Keep it calm and simple, white captions at the bottom, cut out my pauses, no music." autocapitalize="sentences">${esc(dr.tell || "")}</textarea>`;
  }
  if (pg === "review") {
    const nClips = Math.max(a.n, footageOf(briefReel()).length);
    // QAFLOW50 [M5 Max MBP] 2026-10-28 22:53 PDT: a pick made on another path (Customize, then back to the fork) is still sent, so the review shows it.
    const mgOn = mgPicks(dr).length || dr.mgCarousel || dr.mgMode === "none" || dr.mgMode === "decide" || dr.mgMode === "mix", vtOn = !!vtypeOf(dr) && (p.path === "tell" || dr.lookMode === "same" || !!(dr.look && byCode(dr.look)));
    const steps = p.path === "tell" ? ["tell", ...(mgOn ? ["mg"] : []), "bg", "vo", "music", ...(vtOn ? ["vtype"] : []), "extras"] : [...(p.path === "custom" || p.path === "one" || p.path === "lumi" ? [] : ["styles"]), "captions", "mg", "bg", "vo", "music", ...(p.path === "custom" || p.path === "one" || vtOn ? ["vtype"] : []), "extras"];
    h += `<h1>Your <i>reel.</i></h1><p class="sub">${p.path === "custom" ? "Here is everything you picked." : p.path === "one" ? "We build the rest around your pick. Change any step." : p.path === "lumi" ? "Lumi picks your style, captions, graphics and music. Change any step." : p.path === "tell" ? "Your words lead. Add anything else below." : "Your style sets the rest. Change any step."}</p>
      <div class="card f122rev">${steps.map(s => `<div class="kv"><span>${esc(F122_NAMES[s])}</span><span>${esc(f122Val(dr, s))}<button type="button" data-goto122="${s}">Change</button></span></div>`).join("")}</div>${tp155Add(dr)}
      <div class="card nfsum"><div class="eyebrow" style="margin-bottom:6px">Your clips</div>
        <div class="kv"><span>Name</span><span>${esc(dr.title || "Not named yet")}<button data-pop="1">Edit</button></span></div>
        <div class="kv"><span>Clips</span><span>${nClips ? nClips + (nClips === 1 ? " clip, used in full" : " clips, every one used") : dr.videoUrl ? "At your link" : String(dr.script || "").trim() ? "Your script" : "Not yet"}<button data-go="1">Edit</button></span></div></div>
      <p class="muted" style="font-size:13.5px;margin-top:14px">${(() => { const gf = giftOf(d), px = esc((d.price || {}).reel || 20);
        if (isComped(d)) return "Your reels are on us, so this one is free. " + revLine();
        { const cl = rwCreditsLeft(d); if (cl > 0) return `You have ${cl} free reel${cl === 1 ? "" : "s"} left, so this one is on us. ` + revLine(); }
        if (gf && gf.left > 0) return `${esc(gf.left)} of your free reels from ${esc(gf.from)} ${gf.left === 1 ? "is" : "are"} left, so this one is on us. ` + revLine();
        if (gf) return `Your free reels from ${esc(gf.from)} are used. You will be billed $${px} when this reel is complete. ` + revLine();
        return ((d.reels || []).some(r => (r.versions || []).length) ? `You will be billed upon completion of your reel. $${px} per reel after your free one. ` : "Your first reel is on us. ") + (filmLine(d) ? esc(filmLine(d)) + " " : "") + revLine(); })()}</p>`;
  }
  if (!/<h1/.test(h)) { h += `<h1>One <i>moment.</i></h1><p class="sub">Loading this step...</p>`; console.warn("f122: empty step", pg); const pp = f122(dr); if (!F122[pp.path] || !F122[pp.path].includes(pg)) setTimeout(() => { pp.page = ""; pp.ret = ""; store("draft", dr); if (S.view === "new") render(); }, 0); }   // FLOW51: an unknown or stale step never renders blank
  return h;
}
function f122Go(dr, page, keepRet) { try { f122TrStop(); } catch {} const p = f122(dr); p.page = page; if (!keepRet) p.ret = ""; dr.at = Date.now(); store("draft", dr); S.navLockUntil = Date.now() + 350; setPageY(0); render(); }
function f122Next(dr) {
  const p = f122(dr), pg = f122Page(dr);
  if (pg === "fork") { if (!p.path) { toast("Pick one of the two cards."); return; } f122Go(dr, F122[p.path][0]); return; }
  if (pg === "styles" && !(dr.look || dr.lookMode === "same" || vtypeOf(dr))) { toast("Tap a style to pick it."); return; }
  if (pg === "tell" && !String(dr.tell || "").trim() && !refUrl(dr.reference) && String(dr.script || "").trim().length < 10) { toast("Write a few words about what you want."); const t = $("#tellt"); if (t) t.focus(); return; }
  { const need = f122Need(dr, pg); if (need) { toast(need); return; } }   // FLOW51: every step needs a pick
  if (pg === "vo" && f122Rec().st === "rec") f122RecStop();
  if (p.ret) { f122Go(dr, "review"); return; }
  const list = F122[p.path], i = list.indexOf(pg); f122Go(dr, list[Math.min(list.length - 1, i + 1)]);
}
function f122Back(dr) {
  const p = f122(dr), pg = f122Page(dr);
  if (pg === "fork") return false;
  if (p.ret && pg !== "review") { f122Go(dr, "review"); return true; }
  const list = F122[p.path] || [], i = list.indexOf(pg);
  if (i <= 0) { f122Go(dr, "fork"); return true; }
  f122Go(dr, list[i - 1]); return true;
}
function f122Wire(dr, save) {
  const p = f122(dr), re = () => { save(); render(); };
  document.querySelectorAll("[data-path122]").forEach(b => b.onclick = () => { const m = b.dataset.path122;
    if (Date.now() < (S.navLockUntil || 0)) return;
    p.path = m; p.ret = "";
    if (m === "same") { dr.lookMode = "same"; dr.look = null; dr.custom = false; dr.changeLook = false; flashLook(lastLook()); }
    else { if ((S.data && S.data.account || {}).returning) dr.changeLook = true;
      if (m === "lumi") { dr.lookMode = "surprise"; dr.look = null; dr.lookBase = null; dr.custom = false; dr.captions = "Captions on"; if (!mgPicks(dr).length) dr.mgMode = "decide"; }   // LUMICHOOSE108
      else if (m === "tell") { dr.lookMode = "tell"; dr.lookBase = null; } else if (m === "custom" && !(dr.lookMode === "pick" && dr.look)) { dr.lookMode = "pick"; dr.look = null; }   // FLOW51: nothing preselected, the Captions step asks for a pick else if (dr.lookMode !== "pick" && dr.lookMode !== "surprise") { dr.lookMode = "pick"; }
      dr.custom = m === "custom"; }
    f122Go(dr, F122[m][0]); });
  document.querySelectorAll("[data-goto122]").forEach(b => b.onclick = () => { const s = b.dataset.goto122; p.ret = "review"; f122Go(dr, s, true); });
  document.querySelectorAll("[data-vt122]").forEach(b => b.onclick = () => { const id = b.dataset.vt122; dr.vtDecide = false; if (dr.videoType === id) { dr.videoType = ""; } else { dr.videoType = id; if (!dr.look && f122(dr).path !== "custom") dr.lookMode = "pick"; } re(); });
  document.querySelectorAll("[data-vtdec122]").forEach(b => b.onclick = () => { dr.vtDecide = !dr.vtDecide; if (dr.vtDecide) dr.videoType = ""; re(); });   // REELTYPE50: "Not sure, you decide" sends no Video type line
  document.querySelectorAll("[data-cap122]").forEach(b => b.onclick = () => { const v = b.dataset.cap122; dr.cap122 = v;
    if (v === "no") { dr.captions = "No captions"; if (dr.lookMode === "pick") { dr.look = null; dr.lookMode = "surprise"; } } else { dr.captions = "Captions on"; } re(); });
  document.querySelectorAll("[data-capdec122]").forEach(b => b.onclick = () => { if (dr.lookMode === "surprise") { dr.lookMode = "pick"; } else { dr.lookMode = "surprise"; dr.look = null; } dr.captions = "Captions on"; re(); });
  document.querySelectorAll("[data-mg122]").forEach(b => b.onclick = () => { const v = b.dataset.mg122; dr.mgMode = v; if (v !== "pick" && v !== "mix") dr.motion = []; if (v === "none" || v === "decide") { dr.mgCarousel = false; dr.carSrc = ""; } re(); });   // MGDECIDE52: the carousel only rides with Let me pick / I'll pick some
  document.querySelectorAll("[data-car122]").forEach(b => b.onclick = () => { dr.mgCarousel = !dr.mgCarousel; if (!dr.mgCarousel) dr.carSrc = ""; re(); });   // CAROUSELMG50
  document.querySelectorAll("[data-mgq]").forEach(b => b.onclick = e => { e.stopPropagation(); e.preventDefault(); const c = b.dataset.mgq; if (!byCode(c)) return; const cur = mgPicks(dr);   // MGPICK64: corner circle toggles the pick, no sheet
    if (cur.includes(c)) dr.motion = cur.filter(x => x !== c); else { if (cur.length + (dr.mgCarousel ? 1 : 0) >= 4) { toast("Up to 4 motion graphics. Tap a checked circle to remove one."); return; } dr.motion = [...cur, c]; } re(); });
   // SOLIDCAPS 2026-10-28: "On a white canvas" is a pick
  document.querySelectorAll("[data-carsrc122]").forEach(b => b.onclick = () => { dr.carSrc = b.dataset.carsrc122; re(); });
  document.querySelectorAll("[data-nocap122]").forEach(b => b.onclick = () => { const off = b.dataset.nocap122 === "1"; dr.captions = off ? "No captions" : "Captions on"; dr.cap122 = off ? "no" : "yes"; if (off && dr.lookMode === "pick") { dr.look = null; dr.lookMode = "surprise"; } re(); toast(off ? "Captions off." : "Captions back on."); });
  document.querySelectorAll("[data-bg122]").forEach(b => b.onclick = () => { const k = b.dataset.bg122, c = f122Bg(dr); dr.bg = c && c.k === k ? "" : k; if (dr.bg !== "checker") dr.checkColour = ""; if (!F122_CUT.some(o => o.k === dr.bg)) S.f122cut = false; dr.background = dr.bg === "color" ? "A solid color" : "Keep it as filmed"; re();
    if (dr.bg === "color") setTimeout(() => { const x = $(".f122sws"), r = x ? x.getBoundingClientRect() : null; if (r && r.bottom > innerHeight * 0.7) setPageY(pageY() + r.bottom - innerHeight * 0.6, true); }, 60); });   // QAFLOW50: the color swatches sit under the variants, bring them into view
  document.querySelectorAll("[data-bgcut122]").forEach(b => b.onclick = () => { const c = f122Bg(dr), inCut = !!(c && F122_CUT.some(o => o.k === c.k)); S.f122cut = !(S.f122cut || inCut); if (!S.f122cut && inCut) { dr.bg = ""; dr.checkColour = ""; dr.background = "Keep it as filmed"; } re();
    if (S.f122cut) setTimeout(() => { const x = $(".f122cut"), t = x ? x.getBoundingClientRect().top : 0; if (x && t > innerHeight * 0.55) setPageY(pageY() + t - innerHeight * 0.4, true); }, 60); });   // BG50; QAFLOW50: the variants open below the fold, bring them into view
  document.querySelectorAll("[data-col122]").forEach(b => b.onclick = () => { dr.colour = b.dataset.col122; re(); });
  document.querySelectorAll("[data-chk122]").forEach(b => b.onclick = () => { dr.checkColour = b.dataset.chk122; re(); });
  document.querySelectorAll("[data-who122]").forEach(b => b.onclick = () => { S.f122who = b.dataset.who122; render(); });
  document.querySelectorAll("[data-pace122]").forEach(b => b.onclick = () => { const k = b.dataset.pace122; dr.pace = dr.pace === k ? "" : k; const o = f122Pace(dr); dr.intensity = o && o.iv ? o.iv : ""; re(); });
  document.querySelectorAll("[data-br122]").forEach(b => b.onclick = () => { const v = b.dataset.br122; dr.brollSet = true;
    if (v === "none") { dr.broll = "No b-roll, just me"; dr.brollOwn = false; } else { dr.broll = "Add b-roll"; dr.brollOwn = v === "own"; } re(); });
  document.querySelectorAll("[data-ai122]").forEach(b => b.onclick = () => { const k = b.dataset.ai122, cur = new Set(dr.ai || []); cur.has(k) ? cur.delete(k) : cur.add(k); dr.ai = [...cur]; re(); });
  document.querySelectorAll("[data-vo122]").forEach(b => b.onclick = () => { const v = b.dataset.vo122; dr.vo = v;   // FLOW51
    if (dr.voFile && !((v === "upload" || v === "record") && dr.voHow === v)) { dr.voOld = [...new Set([...(dr.voOld || []), dr.voFile])].slice(-10); dr.voFile = ""; dr.voHow = ""; }
    if (v !== "record" && f122Rec().st === "rec") f122RecStop();
    re(); });
  { const vf = $("#vofile122"); if (vf) vf.onchange = () => { const f = (vf.files || [])[0]; vf.value = ""; if (!f) return; f122VoUpload(dr, f, "upload"); }; }
  document.querySelectorAll("[data-rec122]").forEach(b => b.onclick = () => { const a = b.dataset.rec122, R = f122Rec();
    if (a === "start") f122RecStart(); else if (a === "stop") f122RecStop(); else if (a === "again") { R.st = "idle"; R.blob = null; f122RecStart(); } else if (a === "use") f122RecUse(dr); });
  document.querySelectorAll("[data-one122]").forEach(b => b.onclick = () => { if (Date.now() < (S.navLockUntil || 0)) return; const o1 = f122One(dr); if (!o1) return;   // FLOW51b
    p.ret = ""; dr.custom = true; if ((S.data && S.data.account || {}).returning) dr.changeLook = true;
    const rk = new Set([o1.role, ...r113Ls(dr).map(x => x.role)]);   // RECIPE113: every role in the recipe keeps its pick
    if (!rk.has("look") && dr.lookMode !== "pick") dr.lookMode = "surprise";
    if (b.dataset.one122 === "with") { p.path = "custom"; if (!rk.has("look")) { dr.lookMode = "pick"; dr.look = null; }
      if (rk.has("motion") && (!dr.mgMode || dr.mgMode === "pick" || dr.mgMode === "decide")) dr.mgMode = "mix";   // RECIPE113 fix: their motion graphics stay, we may add where they fit
      const first = F122.custom.find(pg => !(pg === "captions" && rk.has("look")) && !(pg === "mg" && rk.has("motion"))) || F122.custom[0];   // only the steps the recipe does not cover
      f122Go(dr, first); return; }
    p.path = "one"; if (!rk.has("look")) { dr.lookMode = "surprise"; dr.look = null; dr.cap122 = "yes"; dr.captions = "Captions on"; }
    dr.mgMode = rk.has("motion") ? "mix" : "decide"; dr.bg = "decide"; dr.background = "Keep it as filmed"; dr.musicPick = "decide"; dr.music = "Music, plus a version without"; dr.vtDecide = true; dr.videoType = "";
    f122Go(dr, "review"); });
  document.querySelectorAll("[data-onereset122]").forEach(b => b.onclick = () => { dr.single = null; p.path = ""; p.ret = ""; f122Go(dr, "fork"); });
  document.querySelectorAll("[data-trplay]").forEach(b => b.onclick = e => { e.stopPropagation(); f122TrToggle(b.dataset.trplay); });   // PREVIEW51
  document.querySelectorAll("[data-tr122]").forEach(b => b.onclick = () => { const t = (S.trend || []).find(x => x.id === b.dataset.tr122); if (!t) return; const y = $("#trl122") ? $("#trl122").scrollTop : 0;
    dr.trendId = t.id; dr.trendName = t.artist + " - " + t.title; save(); render(); const l = $("#trl122"); if (l) l.scrollTop = y; });
  f61Bind();   // MUSIC61: tabs + search that hides empty Slow parts
  { const nb = $("#next"), pg = f122Page(dr); if (nb && pg !== "review" && pg !== "fork") nb.classList.toggle("soft", !!f122Need(dr, pg)); }
  document.querySelectorAll("[data-voice122]").forEach(b => b.onclick = () => { dr.voVoice = b.dataset.voice122; re(); });
  { const t = $("#vonote"); if (t) t.oninput = () => { dr.voNote = t.value.slice(0, 6000); save(); }; }
  document.querySelectorAll("[data-mu122]").forEach(b => b.onclick = () => { const v = b.dataset.mu122; dr.musicPick = v; dr.music = v === "none" ? "No music" : "Music, plus a version without"; re(); if (v === "song") setTimeout(() => { const s = $("#song122"); if (s && !s.value) try { s.focus(); } catch {} }, 120); });
  { const s = $("#song122"); if (s) s.oninput = () => { dr.song = s.value.slice(0, 300); save(); const nb = $("#next"); if (nb) nb.classList.toggle("soft", !!f122Need(dr, "music")); }; }
  document.querySelectorAll("[data-len122]").forEach(b => b.onclick = () => { dr.len = dr.len === b.dataset.len122 ? "" : b.dataset.len122; re(); });
  document.querySelectorAll("[data-nograin200]").forEach(b => b.onclick = () => { dr.nograin = !dr.nograin; re(); });   // NOGRAIN200 [M5 Max MBP] 2026-11-17 Nick TG 25177: Full Sauce can be delivered with no grain
  document.querySelectorAll("[data-simple122]").forEach(b => b.onclick = () => { const c = b.dataset.simple122; dr.simple = Object.assign({}, dr.simple || {}); if (dr.simple[c]) delete dr.simple[c]; else dr.simple[c] = true; re(); });   // SIMPLE52
  document.querySelectorAll("[data-bk122]").forEach(b => b.onclick = () => { S.book = b.dataset.bk122; re(); });   // STYLES52 caption filters
  document.querySelectorAll("[data-cf122]").forEach(b => b.onclick = () => { S.cfam = b.dataset.cf122; re(); });
  document.querySelectorAll("[data-bkall122]").forEach(b => b.onclick = () => { S.book = "all"; S.cfam = "all"; re(); });
  document.querySelectorAll("[data-grade122]").forEach(b => b.onclick = () => { dr.grade = dr.grade === b.dataset.grade122 ? "" : b.dataset.grade122; re(); });
}
function f122DockLabel(dr) { const p = f122(dr), pg = f122Page(dr), list = F122[p.path] || [], i = list.indexOf(pg);
  if (pg === "fork") return "Step 3 of 3 · Your style";
  if (p.path === "custom" && i >= 0 && pg !== "review" && !p.ret) return "Step " + (i + 1) + " of " + (list.length - 1) + " · " + F122_NAMES[pg];
  return F122_NAMES[pg] || "Brief"; }
function renderNew() {
  // BETHFIX81 [M5 Max MBP] 2026-10-31: the app reopened on New reel with a reel in progress: Home behind, Continue or Start new in front (never straight into its title pop-up)
  if (S.nfAskBoot && S.data && Array.isArray(S.data.reels)) { S.nfAskBoot = false; const ip = nfInProg(); if (ip) { S.view = "home"; render(); nfStartAsk(ip, { step: 0 }); return; } }
  const d = S.data, dr = S.draft || (S.draft = DEFAULT_DRAFT());
  if (S.sent) return renderSent();
  if (dr.upAt && Date.now() - dr.upAt > 24 * 3600000 && !receivedFiles().length) { dr.upAt = 0; dr.uploadTapped = false; dr.popped = false; }   // a stale upload tap from yesterday is not this reel
  if (!S.step || S.step < 1) S.step = nfResumeStep(dr);
  const st = Math.min(NF.LAST, Math.max(1, S.step));
  if ((d.account || {}).returning && !dr.changeLook && dr.lookMode !== "same") { dr.lookMode = "same"; dr.look = null; store("draft", dr); }   // returning: their look is preselected on every step
  const f = nfFacts(dr), a = f.arr;
  let h = `<div class="nfwrap">` + nfHead(st, f);
  if (st === NF.UP) {
    // inappupload 2026-10-11 [M5 Max MBP] (Nick TG 18:43): the clips upload HERE. No Dropbox page, no name or email, no "Open the upload page
    // again", and the moment the last bar is full it says "Got your N clips" (this phone knows; the server's record agrees on the next poll).
    const ups = upList(nfUpReel()), upN = ups.length, upFail = ups.filter(x => x.state === "fail").length, upBusy = ups.some(x => x.state === "up" || x.state === "wait");
    const n = a.n, allIn = n > 0 && !upBusy && !upFail;
    const _fs = (dr.fromStyle && dr.lookMode === "pick" && dr.look === dr.fromStyle ? byCode(dr.fromStyle) : null) || tplMgOf(dr);   // FLOW122   // MG78TPL: "Choose this style" from the Styles tab
    h += `<h1>${allIn ? "Got <i>them.</i>" : upBusy ? 'Uploading <i>now<span class="updots" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span></i>' : _fs ? "Style chosen. <i>Upload your clips.</i>" : "Upload your <i>clips.</i>"}</h1>
      <p class="sub">${allIn ? "Every clip is with us. Tap Next to name your reel." : upBusy ? "Keep Lumi open until every bar is full." : "Talking to camera, a screen recording, a whole podcast, all fine."}</p>`;
    { const pn = pf194Next(); if (pn) h += `<div class="card pf194next" id="pf194next" style="padding:12px 14px;margin:0 0 12px"><b>${esc(String(pn.line || PF194_LINE))}</b><span class="muted" style="display:block;margin-top:4px;font-size:13px">${esc(String(pn.sub || PF194_NEXT_SUB))}</span></div>`; }   // PAYFIRST194
    { const by = {}; if (!upBusy) ((d.uploads || [])).filter(u => u && u.batch && (u.reel || "new") === "new" && (dr.batches || []).includes(String(u.batch))).forEach(u => { const b = by[u.batch] || (by[u.batch] = { got: 0, of: Number(u.of) || 1 }); b.got++; });
      const miss = Object.values(by).filter(v => v.got < v.of), got = miss.reduce((x, v) => x + v.got, 0), of = miss.reduce((x, v) => x + v.of, 0);   // RESUME50
      if (miss.length) h += `<div class="card nfmiss" style="padding:12px 14px;margin:0 0 12px;border:1px solid #f2b33d"><b>${got} of ${of} clips came through.</b> The other ${of - got} stopped when Lumi was closed. Tap Add more clips and choose them again, they join this reel.</div>`; }
    { const o1 = !_fs && f122One(dr), rl = o1 ? r113Ls(dr) : [];   // RECIPE113 fix: every pick from Styles, not only one
      if (o1 && rl.length > 1) h += `<div id="f122one">${f122Picked(rl, "Your picks (" + rl.length + ")")}<p class="muted" style="font-size:13px;margin:-4px 0 12px">After your title you pick: build the rest with us, or we build it around these.</p></div>`;
      else if (o1) h += `<div class="card f122chosen" id="f122one">${o1.l.poster ? `<img src="${esc(o1.l.poster)}" alt="">` : ""}<span><small>Your pick</small><b>${esc(o1.name)}</b><small>Only this is chosen. After your title you pick: build the rest with us, or we build it around this.</small></span></div>`; }   // FLOW51b
    if (_fs) h += `<div class="card f122chosen" id="f122chosen">${_fs.poster ? `<img src="${esc(_fs.poster)}" alt="">` : ""}<span><small>Your style</small><b>${esc(_fs.name)}</b><small>Its captions, editing and motion graphics are set. You can change any of it after your title.</small></span></div>`;
    if (!upN && !n) { const dh = nf82DraftsHtml(); if (dh) h = h.replace(`<div class="nfwrap">`, `<div class="nfwrap">` + dh); }   // NEWREEL82 [M5 Max MBP] 2026-10-31: Drafts at the top
    if (upN || n) {
      const mine = new Set(ups.map(x => x.up).filter(Boolean));
      const other = a.files.filter(x => !(x.up && mine.has(x.up))).map(x => `<li><span class="ck">✓</span>${x.thumb ? `<img class="nft" src="${esc(x.thumb)}" alt="" onerror="this.remove()">` : ""}<span class="nm">${esc(x.name)}</span><small>${esc(nfMb(x.size))}</small></li>`);
      const otherRows = other.length ? other : upN ? [] : a.recv.map(nm => `<li><span class="ck">✓</span><span class="nm">${esc(nm)}</span></li>`);
      const c82 = ups.filter(x => x.state === "done").length + otherRows.length;   // NEWREEL82 [M5 Max MBP] 2026-10-31: the count is the clips listed, one source
      h += `<div class="card nfprog" id="nfprog"><div class="nfpt" id="uphead"><b>${allIn ? `Got your ${c82} clip${c82 === 1 ? "" : "s"}` : upBusy ? `Uploading ${upKinds(ups)}` : upFail ? "Some clips did not finish" : `Got your ${c82} clip${c82 === 1 ? "" : "s"}`}</b><span></span></div>
        <ul class="nffiles">${ups.map(upRow).join("")}${otherRows.join("")}</ul>
        ${upFail ? `<button class="btn primary block" id="upretry" type="button" style="margin-top:12px">Try again</button>` : ""}
        <p class="muted" style="font-size:13px;margin:12px 0 0">${allIn ? "Sending more? Tap Add more clips, they join this reel." : upBusy ? "Big phone videos take a few minutes. Keep Lumi open with the screen on. If the connection drops it picks up where it left off." : upFail ? "Nothing is lost. Tap Try again and it carries on from where it stopped." : ""}</p></div>`;
    }
    h += `<label class="btn ${n || upBusy ? "line" : "primary"} block nfup" id="ulpick" for="upfile" role="button">${n || upBusy ? "Add more clips" : "Choose your clips"}</label><input type="file" id="upfile" class="vh" multiple accept="video/*,image/*,audio/*">`;
    h += fl106Btn();
    h += l196LinkHtml(dr);   // LONG196 [M5 Max MBP] 2026-11-11 (Nick TG 24361): "Paste a link" is a third way in; the old "Have a link instead?" fold is gone. Then the vertical / horizontal and long video questions.
    //   // FILMLUMI106 [M5 Max MBP] 2026-11-01: Film with Lumi, Nick's account only (snapshot film106)
    if (!upN && !n) h += `<ol class="nfhow"><li><span>Tap <b>Choose your clips</b> and pick them from your Photos.</span></li><li><span>Watch each bar fill up. Keep Lumi open until every clip says <b>Uploaded</b>.</span></li><li><span>Name your reel, tell us what you want, and we start.</span></li></ol>
      <p class="uphelp">Record in your Camera app first, then choose the clip from your Photos. Portrait is best, any size works, big 4K clips too.</p>`;
    h += `<details class="nflink"${String(dr.script || "").trim() ? " open" : ""}><summary>No footage? Send a script for an AI voiceover</summary><input class="text" id="stitle" placeholder="Name this reel" value="${esc(dr.title || "")}" style="margin-bottom:8px"><textarea class="text" id="sscript" rows="5" placeholder="Paste the words you want said, in any language">${esc(dr.script || "")}</textarea><p class="muted" style="font-size:13px;margin:8px 0 0">We record it with a natural AI voice and build the reel around it.</p></details>`;   // BRIEF50
    if (f.hasName) h += `<div class="card nfnamed"><span><small class="muted">Reel name</small><b>${esc(newReelName(dr.title))}</b></span><button class="btn sm line" id="nfrename">Change</button></div>`;
  }
  if (st === NF.BRIEF) {
    // FLOW122 [M5 Max MBP] 2026-10-27 (Nick TG 7:56 am, doc 122): the style part is now a short run of minimal pages (f122Html):
    // the two fanned cards, then a built-out style or the customize steps, then the review with Start editing. (3STEP50's one screen retired.)
    if (!["same", "pick", "tell", "surprise"].includes(dr.lookMode)) { dr.lookMode = "pick"; store("draft", dr); }   // an older draft (reference) lands on pick; a pasted reference link stays in Last touches
    if (!f122(dr).path && dr.fromStyle && dr.look === dr.fromStyle) { f122(dr).path = "built"; f122(dr).page = "review"; store("draft", dr); }   // chosen from the Styles tab: straight to the review
    h += f122Html(dr, d, a);
  }
  h += `<button type="button" class="nfcancel" id="nfcancel">Cancel this reel</button>`;   // FLOW51b: never locked in a new reel
  h += `</div>`;
  $("#main").innerHTML = h; armTiles(); bindTiles(); bindAdd(); nf82Bind();
  // step controls. [M5 Max MBP] 2026-09-29 sweep50: "Match a reference" is only a look once a real link is in.
  const hasVideo = f.hasVideo, hasLook = f.hasLook;
  const hasName = !!String(dr.title || "").trim();      // namereel 2026-10-02: naming the reel is mandatory (now in the clips pop-up, before the brief)
  const canNext = nfCan(st, Object.assign({}, f, { hasName }));
  const p1 = nfProgress(a.n, dr.upExpect || 1);
  const shim = canNext && st === NF.UP && p1.complete;
  const pick122 = (() => { try { if (st !== NF.BRIEF) return false; const pg = f122Page(dr); if (!pg || pg === "review" || pg === "fork") return false;   // STYLES52 (Nick): Next shimmers after a pick
    if (pg === "captions") return dr.lookMode === "surprise" || dr.captions === "No captions" || (dr.lookMode === "pick" && !!dr.look && !!byCode(dr.look)); if (pg === "mg" && (dr.mgMode || mgPicks(dr).length || dr.mgCarousel)) return true;
    const v = f122Val(dr, pg); return !!v && !/^(You decide|From your style|From your words|Not picked yet)$/.test(v); } catch { return false; } })();
  const pg122 = st === NF.BRIEF ? f122Page(dr) : "", last122 = pg122 === "review";   // FLOW122: only the review page submits
  const lab = st === NF.UP ? (hasVideo ? "Next" : upList(nfUpReel()).some(x => x.state === "up" || x.state === "wait") ? "Uploading..." : "Next") : last122 ? "Start editing" : f122(dr).ret ? "Done" : "Next";
  const upNext = st === NF.UP && hasVideo && !hasName;     // Next on step 1 opens the clips + title pop-up
  dock(`<div class="recipe nfdock"><div class="in">${st > 1 ? `<button class="btn ghost" id="prev">Back</button>` : ""}<span class="sum nfst">${st === NF.UP ? "Step 1 of 3 · " + esc(STEPS[0]) : esc(f122DockLabel(dr))}</span>
    <button class="btn${last122 ? " startbtn" + (canNext ? " shimmer" : "") : (shim || pick122) ? " shimmer" : ""}" id="next" ${canNext || upNext || st === NF.BRIEF ? "" : "disabled"}>${last122 ? `<img class="slumi" src="/lumi/got.webp" alt="">` : ""}${esc(lab)}</button></div></div>`, "has-recipe");
  const save = () => { dr.at = Date.now(); store("draft", dr); };
  function updRecipe() { const pre = $("pre.brief"); if (pre) pre.textContent = briefText(dr); }
  // [M5 Max MBP] 2026-10-01 07:26 PDT qa2fix #1: every step change locks Next and Back for 700 ms, and Start editing sends once (S.briefSending).
  const stepLocked = () => Date.now() < (S.navLockUntil || 0) || !!S.briefSending;
  const toStep = n => { S.step = n; dr.step = n; save(); S.navLockUntil = Date.now() + 700; setPageY(0); render(); };
  if (Date.now() < (S.navLockUntil || 0)) { const nx0 = $("#next"), was = nx0 && nx0.disabled; if (nx0 && !was) { nx0.disabled = true; setTimeout(() => { if (nx0.isConnected && !S.briefSending) nx0.disabled = false; }, Math.max(0, S.navLockUntil - Date.now())); } }
  const prev = $("#prev"); if (prev) prev.onclick = () => { if (stepLocked()) return; if (st === NF.BRIEF && f122Back(dr)) return; toStep(st - 1); };
  $("#next").onclick = async () => {
    if (stepLocked()) return;
    // [M5 Max MBP] 2026-10-03 appfix A1: read name, video and look FRESH on every tap (typing or pasting never re-renders).
    const f2 = nfFacts(dr), hasVideo = f2.hasVideo, hasLook = f2.hasLook;
    const hasName = !!String(dr.title || "").trim();
    if (st === NF.UP) {
      if (!hasVideo) { toast(upList(nfUpReel()).some(x => x.state === "up" || x.state === "wait") ? "Still uploading. Keep Lumi open until every bar is full." : "Choose your clips first."); return; }
      { const m196 = l196Block(dr); if (m196) { toast(m196); const q = document.getElementById(l196Url(dr.videoUrl) === null ? "l196link" : "l196orient"); if (q) q.scrollIntoView({ block: "center", behavior: "smooth" }); return; } }   // LONG196: a bad link or an unanswered vertical / horizontal question stops here
      if (!hasName) { nfClipsPop(dr); return; }
      toStep(NF.BRIEF); return;
    }
    // FLOW122 2026-10-27: every page before the review moves forward one page; the review sends. Name + clips + a style (or their words, or customize).
    if (f122Page(dr) !== "review") { if (f122Page(dr) === "extras" && refUrl(dr.reference) && refUseNeeded(dr)) { toast("What is the reference for? Pick Music, Look and editing, or Both."); const z = $("#ru4"); if (z) z.scrollIntoView({ block: "center" }); return; } f122Next(dr); return; }
    if (!hasName) { toast("Name this reel first."); nfClipsPop(dr, { noMore: true }); return; }
    if (!hasVideo) { toast("Upload your video first."); toStep(NF.UP); return; }
    if (!hasLook) { const pth = f122(dr).path; toast(pth === "tell" ? "Write a few words about what you want." : "Pick a style first."); f122(dr).ret = "review"; f122Go(dr, pth === "tell" ? "tell" : "styles", true); return; }
    if (refUseNeeded(dr)) { toast("What is the reference for? Pick Music, Look and editing, or Both."); f122(dr).ret = "review"; f122Go(dr, "extras", true); return; }   // refuse 2026-10-11
    if (refUrl(dr.reference) === null) { toast("That reference link does not look right. Fix it or clear it."); f122(dr).ret = "review"; f122Go(dr, "extras", true); return; }
    $("#next").disabled = true; S.briefSending = true;
    const _br = briefReel(); let okB = false;
    const _bts = [...new Set([...(dr.batches || []), ...landedBatches(_br)])];   // RESUME50: a just-landed app upload goes by its batch ids
    try { const _bp = brollPayload(dr); okB = await send({ kind: "brief", text: briefText(dr), ...(_bp ? { broll: _bp } : {}), ...(_br && !appLanded(_br) ? { reel: _br.id } : {}), ...(_bts.length ? { batches: _bts } : {}) }); } finally { S.briefSending = false; }   // brollpick 2026-10-05: structured B-roll choice
    if (okB) { try { if (HO178.t) ho178Send("sent", { title: String(dr.title || "").slice(0, 80), reel: _br ? _br.id : "", batches: _bts.slice(-10) }); } catch {}   // HANDOFF178 [M5 Max MBP] 2026-11-05 7:58 PM PST
      store("briefsent", { at: Date.now(), reel: _br ? _br.id : "" }); store("nfsent", { at: Date.now(), title: dr.title, reel: _br ? _br.id : "", video: hasVideo && !dr.videoUrl ? "in" : dr.videoUrl ? "link" : "", text: briefText(dr), thumb: ((nfClips(dr).find(c => c.thumb) || {}).thumb) || "" });
      S.sentInfo = { title: dr.title, n: Math.max(f2.arr.n, footageOf(_br).length), videoIn: !!(f2.arr.n || (_br && footageOf(_br).length)) };
      nf82AfterSend(dr, _br, _bts); S.briefFor = null; S.sent = true; S.draft = { ...DEFAULT_DRAFT(), freshAt: Date.now() }; store("draft", { freshAt: S.draft.freshAt }); try { nfOptimistic(); } catch {} render(); }   // NEWREEL82 [M5 Max MBP] 2026-10-31 else { const nb = $("#next"); if (nb) nb.disabled = false; }
  };
  // inputs
  { const st_ = $("#stitle"), ss_ = $("#sscript");   // BRIEF50: script-only reel
    const upd = () => { if (st_) dr.title = st_.value.slice(0, 80); if (ss_) dr.script = ss_.value; save(); const n = $("#next"); if (n && st === NF.UP) n.disabled = !nfCan(1, Object.assign({}, nfFacts(dr), { hasName: !!String(dr.title || "").trim() })); };
    if (st_) st_.oninput = upd; if (ss_) ss_.oninput = upd; }
  const v = $("#vurl"); if (v) v.oninput = () => { dr.videoUrl = v.value.trim(); dr.video = dr.videoUrl ? "url" : (dr.uploaded ? "uploaded" : "link"); save(); const n = $("#next"); if (n && st === NF.UP) { const ok = !!(dr.videoUrl || nfFacts(dr).arr.n); n.disabled = !ok; n.textContent = "Next"; } };
  const um = $("#upm"), upl = $("#upp"); const setExp = n => { dr.upExpect = Math.max(1, Math.min(30, n)); save(); render(); };
  if (um) um.onclick = () => setExp((dr.upExpect || 1) - 1); if (upl) upl.onclick = () => setExp((dr.upExpect || 1) + 1);
  const rnb = $("#nfrename"); if (rnb) rnb.onclick = () => nfClipsPop(dr, { noMore: true });
  document.querySelectorAll("[data-pop]").forEach(b => b.onclick = () => nfClipsPop(dr, { noMore: true }));
  // inappupload 2026-10-11: pick files -> they upload right here
  const upf = $("#upfile"); if (upf) upf.onchange = () => { const fs = [...(upf.files || [])]; upf.value = ""; if (!fs.length) return;
    const pend = upList(nfUpReel()).filter(x => x.state === "up" || x.state === "wait").length;
    dr.uploadTapped = true; dr.upAt = dr.upAt && Date.now() - dr.upAt < 6 * 3600000 ? dr.upAt : Date.now(); dr.popped = false;
    dr.upExpect = Math.max(1, nfFacts(dr).arr.n + pend + fs.length); if (!receivedFiles().length) dr.uploaded = false; save();
    upAdd(fs, { reel: nfUpReel() }); render(); };   // UPREEL51
  const upr = $("#upretry"); if (upr) upr.onclick = () => { upRetryFailed(); render(); };
  { const flb = $("#fl106btn"); if (flb) flb.onclick = () => fl106Open(dr); }   // FILMLUMI106 [M5 Max MBP] 2026-11-01
  // LIVE ARRIVALS. While the upload screen waits for clips (or for the upload link), ask the server every 4 s and redraw only when it
  // changed. Never while a field has focus or a pop-up is open (appfix A10: the keyboard used to drop every 8 s).
  clearTimeout(S.pollT);
  if (st === NF.UP && !S.sent && dr.uploadTapped) { const tick = async () => { if (!(S.view === "new" && S.step === NF.UP && !S.sent)) return; const ae = document.activeElement;
      if ((ae && /INPUT|TEXTAREA/.test(ae.tagName)) || document.querySelector("#sheet.on, .titlepop") || document.hidden) { S.pollT = setTimeout(tick, 4000); return; }
      let t = null; try { const r = await meFetch(); t = r && r.ok ? await r.text() : null; } catch { t = null; }
      if (t && t !== S._lastMe) { window.__lumiQuiet = true; try { await load(); } finally { setTimeout(() => { window.__lumiQuiet = false; }, 0); } }
      else S.pollT = setTimeout(tick, 4000); }; S.pollT = setTimeout(tick, 4000); }
  if (a.n && !dr.uploaded && (dr.upAt || receivedFiles().length)) { dr.uploaded = true; dr.video = "uploaded"; save(); }   // newreel: clips seen arriving = "uploaded through my upload link" in the brief
  if (receivedFiles().length && !dr.upEv) { dr.upEv = true; dr.uploaded = true; dr.video = "uploaded"; save(); const _rr = receivedReel(); send({ kind: "uploaded", ...(_rr && !(_rr.versions || []).length ? { reel: _rr.id } : {}) }); }   // appfix A2: name the reel   // BETHFIX81: never a delivered one
  // CLIPS RECEIVED -> the pop-up: thumbnails + the required title, once, the moment the bar reaches 100% (or every clip is in and the reel has no name)
  if (st === NF.UP && hasVideo && !hasName && !dr.popped && (p1.complete || !dr.uploadTapped) && !upList(nfUpReel()).some(x => x.state === "up" || x.state === "wait") && !document.querySelector(".nfpop")) setTimeout(() => { if (S.view === "new" && S.step === NF.UP && !document.querySelector("#sheet.on")) nfClipsPop(dr); }, 450);
  const vto = $("#vtopen"); if (vto) vto.onclick = () => nfTypeSheet(dr);
  if (vto && document.querySelector(".nfwrap .vtprev")) vtPreviewWire(document.querySelector(".nfwrap"), render);   // founder story example: Vertical / Horizontal
  // 3STEP50 2026-10-26: the three paths switch in place. Each keeps what was already chosen in it, nothing is asked twice.
  document.querySelectorAll("#nfmodes [data-mode]").forEach(b => b.onclick = () => { const m = b.dataset.mode;
    if (m === "same") { dr.lookMode = "same"; dr.custom = false; dr.changeLook = false; }
    else { if ((S.data && S.data.account || {}).returning) dr.changeLook = true;
      if (m === "tell") { dr.lookMode = "tell"; dr.lookBase = null; }
      else { dr.lookMode = "pick"; dr.custom = m === "custom"; } }
    save(); render(); if (m === "same") flashLook(lastLook());
    if (m === "tell") setTimeout(() => { const t = $("#tellt"); if (t && !t.value) try { t.focus(); } catch {} }, 120); });
  { const tt = $("#tellt"); if (tt) tt.oninput = () => { dr.tell = tt.value.slice(0, 20000); save(); updRecipe(); }; }
  const ref = $("#ref"); if (ref) { wireRefUse($("#ru2"), dr, () => updRecipe()); const upd2 = () => { const u = refUrl(dr.reference), er = $("#referr2"), r2 = $("#ru2"); if (r2) r2.style.display = u ? "block" : "none"; if (er) er.style.display = u === null && !ref.matches(":focus") ? "block" : "none";
      updRecipe(); };
    ref.oninput = () => { dr.reference = ref.value.trim(); save(); upd2(); }; ref.onblur = upd2; }
  const ref4 = $("#ref4"); if (ref4) {
    const upd = () => { const u = refUrl(dr.reference), m = $("#refm"), er = $("#referr"), r4 = $("#ru4"); if (r4) r4.style.display = u ? "block" : "none"; if (m) m.style.display = u && dr.refUse !== "music" ? "block" : "none"; if (er) er.style.display = u === null && !ref4.matches(":focus") ? "block" : "none"; updRecipe();
      document.querySelectorAll('.opt[data-k="refMatch"] button').forEach(b => b.classList.toggle("on", b.dataset.o === refMatchOf(dr))); };
    ref4.oninput = () => { dr.reference = ref4.value.trim(); if (!dr.reference) { dr.refMatch = ""; dr.refUse = ""; } save(); upd(); };
    wireRefUse($("#ru4"), dr, () => { upd(); updRecipe(); });
    ref4.onblur = upd;
  }
  document.querySelectorAll("#bk button").forEach(b => b.onclick = () => { S.book = b.dataset.b; render(); });
  document.querySelectorAll(".opt[data-k] button").forEach(b => b.onclick = () => {
    const k = b.parentElement.dataset.k, o = b.dataset.o; dr[k] = o; save();
    if (k === "refMatch") { b.parentElement.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b)); updRecipe(); return; }
    render();
  });
  const nmd = $("#nfmored"); if (nmd) nmd.ontoggle = () => { S.nfMoreOpen = nmd.open; };
  const nfSync = () => document.querySelectorAll("[data-q]").forEach(x => { const on = nfHas(dr.notes, x.dataset.q); x.classList.toggle("on", on); x.setAttribute("aria-pressed", String(on)); });
  document.querySelectorAll("[data-q]").forEach(b => b.onclick = () => { const q = b.dataset.q, cur = String(dr.notes || "").trim();
    dr.notes = nfHas(cur, q) ? nfStrip(cur, q) : (cur ? cur.replace(/[.\s]*$/, ". ") : "") + q + ".";
    save(); const ta = $("#notes"); if (ta) ta.value = dr.notes; nfSync(); updRecipe(); { const nn = $("#notesn"); if (nn) nn.textContent = dr.notes.length > 16000 ? dr.notes.length + " of 20000 characters" : ""; }
  });
  document.querySelectorAll("[data-bs]").forEach(b => b.onclick = () => { dr.brollOwn = b.dataset.bs === "own"; save(); render(); setTimeout(() => { const x = $("#brsec"); if (x) x.scrollIntoView({ block: "center" }); }, 60); });
  const brl = $("#brl"); if (brl) brl.addEventListener("click", () => { dr.brollTapped = Date.now(); save(); });
  const col = $("#colour"); if (col) col.oninput = () => { dr.colour = col.value.trim(); save(); };
  const notes = $("#notes"); if (notes) notes.oninput = () => { dr.notes = notes.value; save(); nfSync(); { const nn = $("#notesn"); if (nn) nn.textContent = notes.value.length > 16000 ? notes.value.length + " of 20000 characters" : ""; } updRecipe();
  };
  document.querySelectorAll("[data-go]").forEach(b => b.onclick = () => { if (stepLocked()) return; toStep(Number(b.dataset.go)); });
  const chl = $("#chlook"), kpl = $("#keeplook"), bbr = $("#bbr");
  if (chl) chl.onclick = () => { dr.changeLook = true; dr.lookMode = "pick"; dr.look = null; save(); setPageY(0); render(); };
  if (kpl) kpl.onclick = () => { dr.changeLook = false; dr.lookMode = "same"; dr.look = null; save(); setPageY(0); render(); };
  if (bbr) bbr.onclick = () => brollDialog(dr);   // [M5 Max MBP] 2026-09-30 (walkthrough agent): in place
  document.querySelectorAll(".bredit").forEach(b => b.onclick = () => brollDialog(dr));
  const brc = $("#brchg"); if (brc) brc.onclick = e => { e.preventDefault(); brollDialog(dr); };
  document.querySelectorAll("[data-ed]").forEach(b => b.onclick = () => editInPlace(dr, b.dataset.ed));
  { const cx = $("#nfcancel"); if (cx) cx.onclick = () => { if (stepLocked()) return; nfCancelAsk(); }; }   // FLOW51b
  if (st === NF.BRIEF) f122Wire(dr, save);   // FLOW122
  if (st === NF.BRIEF) { try { tp155AddBind(dr, () => { save(); render(); }); } catch (e) { console.warn("tp155", e); } }   // TRIALPACK155: after f122Wire (its [data-mgq] pass would take the circle)
}
function musicSheet(dr) {
  sheet(`<h3 style="font-size:24px;font-family:var(--serif);font-weight:400">Point us at the music?</h3><p class="muted" style="margin:6px 0 14px">Add a link to a track you like, or type the kind of music you want. Or leave it to us.</p>
    <label class="lbl" style="margin-top:0">A link</label><input class="text" id="mlink" placeholder="Spotify, YouTube, TikTok sound, Instagram reel" value="${esc(dr.musicLink)}">
    <label class="lbl">Or describe it</label><input class="text" id="mnote" placeholder="Soft piano, upbeat lo-fi, that trending one..." value="${esc(dr.musicNote)}">
    <div class="row" style="margin-top:16px"><button class="btn primary" id="mok" style="flex:1">Save</button><button class="btn line" id="mskip">You pick for me</button></div>`);
  $("#mok").onclick = () => { dr.musicLink = $("#mlink").value.trim(); dr.musicNote = $("#mnote").value.trim(); store("draft", dr); closeSheet(); render(); };
  $("#mskip").onclick = () => { dr.musicLink = ""; dr.musicNote = ""; store("draft", dr); closeSheet(); render(); };
}
// [M5 Max MBP] 2026-09-29 sweep50: what kinds of B-roll the picked look / motion graphics take (photo-only looks never offer videos)
function brollAllowed(dr) { const ks = new Set(); brollPicks(dr).forEach(l => ((l.broll && l.broll.kinds) || []).forEach(k => ks.add(k))); return ks.size === 1 ? [...ks][0] : ""; }
function brollSheet(dr) { brollDialog(dr); }   // [M5 Max MBP] 2026-09-30 (walkthrough agent): one B-roll dialog everywhere
/* ---------- client B-roll ([M5 Max MBP] 2026-09-28 20:50 PDT, Nick: "If the client chooses ones that have interchangeable B-roll ...
   they should be notified and asked, 'Do you want to upload the B-roll?' ... and then it tells them where to upload the B-roll.")
   l.broll comes from looks.json (broll_slots.json). The link is the client's OWN B-roll Dropbox file request (d.broll_link), separate from
   their main upload link, so intake files it as B-roll for their current reel and never as the main video. ---------- */
/* ---------- REWARDS (beta). [M5 Max MBP] 2026-09-28 23:00 PDT (rewards agent), Nick (Telegram 22:32): "If you click on your letter in the top
   right-hand corner, you can get to a rewards program where, if you make a reel for us, you get two free reels edited for you ... talking to
   the camera about why you love it. If I, Sabir, or someone on the Lumi team approves it, then you get two free reels ... have it say it's
   in beta testing." The video goes through the client's OWN rewards Dropbox link (d.rewards.link, /uploads/c/<slug>/rewards), is scanned
   on the Mac and never becomes a reel. Consent is required and recorded with its exact words. ---------- */
const RW_CONSENT = "Lumi can post and share this video to promote Lumi.";
function rwState() {
  const r = Object.assign({ status: "none", files: 0, credits: { left: 0 }, can_submit: true }, (S.data && S.data.rewards) || {});
  const p = fetchStore("rwsent", null);      // what they just tapped stays on screen until the Mac has it
  if (p && Date.now() - p < 10 * 60000 && (r.status === "none" || r.status === "uploading" || (r.status === "rejected" && (r.decided_at || 0) * 1000 < p))) r.status = "submitted";
  return r;
}
function rwLine() {
  const r = rwState();
  if (r.flow === "legacy") return { submitted: "Submitted, in review", approved: "Approved: 2 free reels added", rejected: "Not approved, you can try again", uploading: "Video received, tap to finish" }[r.status] || "Make a video about Lumi, get 2 free reels";
  return { submitted: "Submitted, in review", approved: "Approved: your reel is free", rejected: "Not approved yet, you can try again", uploading: "Video received, tap to finish" }[r.status] || (r.referral && r.referral.url ? "Refer a friend or review Lumi, get a free reel" : "Review Lumi, get your reel free");   // CONV50
}
/* [M5 Max MBP] 2026-10-02 20:00 PDT influpop. Nick (Telegram 19:54): "we'll make a video for them but then to get it they have to upload a
   video of them reviewing the app. It has to be edited with our software and then Sabir or I have to approve the video." The reel an
   approved review frees: the one the Mac already picked for this submission, else their newest unpaid reel (delivered first). */
function rwTarget() {
  const r = rwState(), rs = (S.data && S.data.reels) || [], rid = r.review && r.review.id;
  if (r.reel && r.reel.id) { const x = rs.find(y => y.id === r.reel.id); return x || { id: r.reel.id, name: r.reel.label }; }
  const un = rs.filter(x => x && x.id !== rid && x.status !== "cancelled" && x.pay_state && x.pay_state.key === "needs_pay");
  return un.find(x => (x.versions || []).length) || un[0] || null;
}
// CONV50 [M5 Max MBP] 2026-10-29 (Nick TG ~13:40, growth item 5): REFER A FRIEND. Every client's own link (lumiedits.app/?ref=CODE, from the Mac:
// rewards.referral). A friend who signs up through it and gets their first reel delivered = one free reel for this client (up to the cap).
function refCard50() { const rf = ((S.data || {}).rewards || {}).referral; if (!rf || !rf.url) return "";
  const st = [rf.joined ? `${rf.joined} friend${rf.joined === 1 ? "" : "s"} joined` : "", rf.earned ? `${rf.earned} free reel${rf.earned === 1 ? "" : "s"} earned` : "", rf.left ? `${rf.left} ready to use` : ""].filter(Boolean).join(" · ");
  return `<div class="card" id="ref50" style="margin:0 0 14px"><div class="eyebrow">Refer a friend</div><h3 style="font-size:19px;margin-top:4px">Give a free reel, get a free reel</h3>
    <p class="muted" style="margin:6px 0 10px;font-size:14px">Share your link. When a friend signs up with it and gets their first reel, your next reel is free too.</p>
    <div class="text" id="ref50url" style="margin:0 0 10px;font-size:14px;word-break:break-all;user-select:all">${esc(rf.url)}</div>
    <button class="btn primary block" id="ref50share" type="button">Share my link</button>${st ? `<p class="muted" style="margin:10px 0 0;font-size:13px">${esc(st)}</p>` : ""}</div>`; }
function bindRef50() { const b = $("#ref50share"); if (!b) return; const rf = ((S.data || {}).rewards || {}).referral || {};
  b.onclick = async () => { if (!tapOk("ref50share", 1200)) return; funnel50("funnel50_ref_share", 0);
    const text = "I get my reels edited with Lumi. Your first reel is free with my link:";
    try { if (navigator.share) { await navigator.share({ title: "Lumi Edits", text, url: rf.url }); return; } } catch (e) { if (e && e.name === "AbortError") return; }
    try { await navigator.clipboard.writeText(rf.url); toast("Link copied. Paste it to a friend."); } catch { toast("Press and hold the link to copy it."); } }; }
function rewardsSheet() {
  if (rwState().flow !== "legacy") return reviewSheet();
  const r = rwState(), st = r.status, link = r.link;
  const head = `<h3 style="font-size:24px;font-family:var(--serif);font-weight:400;margin:0 0 4px">Rewards <span class="rwbeta">beta</span></h3>
    <p class="muted" style="margin:0 0 6px;font-size:14.5px">Make a short video about why you love Lumi. If the Lumi team approves it, you get <b>2 free reels</b> edited for you.</p>
    <p class="muted" style="margin:0 0 4px;font-size:12.5px">Rewards is in beta testing, so it may change as we learn. One reward per account during beta.</p>`;
  const how = `<ol class="rwsteps"><li>Record yourself talking to the camera about why you love Lumi.</li><li>Upload it with your rewards link below, then tap I've uploaded it.</li><li>The Lumi team watches it. Approved = 2 free reels added to your account.</li></ol>
    <div class="rwguide"><b>Guidelines</b><ul><li>15 to 60 seconds</li><li>Vertical, phone held upright</li><li>Good light, face a window if you can</li><li>Say your name and why you use Lumi</li><li>Just you, talking to the camera. No script needed.</li></ul></div>`;
  let stat = "";
  if (st === "submitted") stat = r.files ? `<div class="rwstat submitted"><b>Submitted, in review</b>The Lumi team is watching your video. We will tell you in Chat.</div>`
    : `<div class="rwstat submitted"><b>Submitted, waiting for your video</b>We have not received your video yet. Upload it with your rewards link below, and the team reviews it once it lands.</div>`;   // [M5 Max MBP] 2026-09-29 sweep50
  else if (st === "approved") { const lf = rwLeft(); stat = `<div class="rwstat approved"><b>Approved: 2 free reels added</b>Thank you for your video.${lf ? ` You have ${lf} free reel${lf === 1 ? "" : "s"} left from Rewards.` : r.credits && Number(r.credits.granted) ? " Your free Rewards reels are in use." : ""}</div>`; }
  else if (st === "rejected") stat = `<div class="rwstat rejected"><b>Not approved</b>${r.note ? esc(r.note.trim()) + (/[.!?]$/.test(r.note.trim()) ? "" : ".") : "The team could not approve this one."} You are welcome to film another and send it again.</div>`;
  else if (st === "uploading") stat = `<div class="rwstat"><b>We got your video</b>Tick the box below and tap I've uploaded it to send it for review.</div>`;
  else stat = `<div class="rwstat"><b>Not started</b>Film your video, then send it here.</div>`;
  const canSend = r.can_submit !== false && (st === "none" || st === "rejected" || st === "uploading");
  let form = "";
  if (canSend) form = `<label class="rwok"><input type="checkbox" id="rwc"><span>${esc(RW_CONSENT)} <small class="muted">(required)</small></span></label>
    ${link ? `<a class="btn primary block dis" id="rwlink" href="${esc(link)}" target="_blank" rel="noopener" style="margin:0 0 10px">Open my rewards link</a>` : `<p class="muted" style="font-size:13.5px;margin:0 0 10px">Your rewards link is being made. Check back here in a minute.</p>`}
    <button class="btn line block" id="rwsend" disabled>${link || st === "uploading" || r.files ? "I've uploaded it" : "Waiting for your rewards link"}</button>
    <p class="muted" style="font-size:12.5px;margin:8px 0 0">This link is only for your rewards video, so it never gets mixed up with your reels.</p>`;
  else if (st === "submitted" && link && !r.files) form = `<a class="btn line block" href="${esc(link)}" target="_blank" rel="noopener">Open my rewards link</a>`;
  sheet(`${head}${refCard50()}${stat}${st === "approved" || st === "submitted" ? "" : how}${form}<button class="btn line block" id="rwclose" style="margin-top:12px">Close</button>`); bindRef50();
  $("#rwclose").onclick = () => { const av = $("#avatar"); if (S.data && av && typeof av.onclick === "function") av.onclick(); else closeSheet(); };   // [M5 Max MBP] 2026-10-01 qafix: Close goes back to Your account
  const c = $("#rwc");
  // appfix A17 2026-10-03: "I've uploaded it" needs the upload link (or a video we already have), not only the consent tick
  const upOk = !!link || st === "uploading" || !!r.files;
  if (c) c.onchange = () => { $("#rwsend").disabled = !c.checked || !upOk; const l = $("#rwlink"); if (l) l.classList.toggle("dis", !c.checked); };
  const b = $("#rwsend");
  if (b) b.onclick = async () => {
    if (!c || !c.checked) return toast("Tick the box first, it is required.");
    b.disabled = true; b.textContent = "Sending…";
    const ok = await send({ kind: "reward", choice: "submit", text: RW_CONSENT });
    if (!ok) { b.disabled = false; b.textContent = "I've uploaded it"; return; }
    store("rwsent", Date.now()); toast("Sent. The Lumi team will review it."); rewardsSheet();
  };
}
/* BRANDKIT112 [M5 Max MBP] 2026-11-01 4:5x PM PST (Nick TG 3:43 PM: "give them a Lumii Edits Motion Graphics Kit ... the AI editor ... motion graphics ...
   Lumi app UI/UX recordings ... Or just allow them to choose if they want some of that stuff and show them some examples so the videos come out
   branded for Lumi"). An optional step in the Influencer program sheet: Styles-page tiles (same .mv tile, same MGPICK64 corner circle) with a
   small moving example each (no person in any preview). The picks ride with the review submit as brandkit: [...]; the Mac writes them into the
   review brief ("Lumi brand kit: ...") and the owner places them (brand_kit112.py). Kept on this phone until sent. */
const BK112 = [
  { k: "editor", n: "AI editor", full: "AI editor screen", s: "The Lumi app editing a reel" },
  { k: "mg", n: "Motion graphics", full: "Lumi motion graphics", s: "Lumi's own app graphics" },
  { k: "sting", n: "Logo at the end", full: "Lumi logo at the end", s: "Lumi's logo leads into the end card" },   // BKCAP130 [M5 Max MBP] 2026-11-01: Nick TG 21968, never a logo before the hook
  { k: "ui", n: "App screens", full: "Lumi app screen recordings", s: "Real lumiedits.app screens" },
  { k: "endcard", n: "End card", full: "Made with Lumi end card", s: "Made with Lumi at the end" }];
var BK112_ON = true;   // BRANDKIT112: on since 2026-11-02 12:4x AM PST [M5 Max MBP], the Mac side reads the picks (engine installed 00:39)
function bk112Sel() { const a = fetchStore("bk112", []); return Array.isArray(a) ? a.filter(k => BK112.some(x => x.k === k)) : []; }
function bk112Html() {
  const sel = bk112Sel();
  const tiles = BK112.map(p => { const l = { code: "bk_" + p.k, name: p.n, poster: "/brandkit112/" + p.k + ".jpg", video: "/brandkit112/" + p.k + ".mp4", accent: "transparent" };
    return mgq64(tile(l, { on: sel.includes(p.k), act: "none" }), l, sel.includes(p.k)).replace('data-code="bk_' + p.k + '"', 'data-code="bk_' + p.k + '" data-bk112="' + p.k + '"'); }).join("");
  return `<div class="rwguide" id="bk112"><b>Lumi brand kit <small class="muted" style="font-weight:600">(optional)</small></b>
    <p class="muted" style="margin:4px 0 10px;font-size:13px">Want your review reel to come out branded for Lumi? Tap the circle on any you want and we add them to your edit.</p>
    <div class="grid g3 r113g" style="margin-bottom:6px">${tiles}</div><p class="muted" id="bk112sum" style="margin:6px 0 0;font-size:13px">${bk112Sum(sel)}</p></div>`;
}
function bk112Sum(sel) { return sel.length ? "In your reel: " + BK112.filter(x => sel.includes(x.k)).map(x => x.full).join(", ") + "." : "Nothing picked. Your review is edited the usual way."; }
function bk112Bind() {
  const box = $("#bk112"); if (!box) return; try { armTiles(box); } catch {}
  box.querySelectorAll("[data-mgq]").forEach(b => b.onclick = e => { e.stopPropagation(); e.preventDefault(); const k = String(b.dataset.mgq).replace(/^bk_/, ""); let sel = bk112Sel();
    sel = sel.includes(k) ? sel.filter(x => x !== k) : BK112.map(x => x.k).filter(x => x === k || sel.includes(x)); store("bk112", sel);
    const on = sel.includes(k), m = b.closest(".mv"); if (m) m.classList.toggle("on", on); b.setAttribute("aria-pressed", on ? "true" : "false");
    const s = $("#bk112sum"); if (s) s.textContent = bk112Sum(sel); });
  box.querySelectorAll(".mv[data-bk112]").forEach(m => m.onclick = () => { const q = m.querySelector("[data-mgq]"); if (q) q.click(); });   // the whole tile toggles too
}
/* TRIALPACK155 [M5 Max MBP] 2026-11-02 (Nick TG 22167 "Approved", a reply to the 2x2 demo grid 22159). HOOK PACK: after the reel is delivered
   the Mac makes 4 (or 5) versions of it, each with a different opening (Control, Wait-for, Flash-forward, Cold open, Series pitch when it is
   clean), to post as Instagram trial reels. Two ways in: the add-on on the New reel review (brief line "Hook pack: yes ..."), or "Get a Trial
   pack" on a delivered reel (intent kind "trialpack"). It lands on the reel as its own card and by email. The demo is Nick's own reel (067v2).
   Included at no extra cost for now (price is Nick's call). */
const TP155 = { poster: "/trialpack155/grid.jpg", video: "/trialpack155/grid.mp4",
  slides: [["a", "A Control"], ["b", "B Wait-for"], ["c", "C Flash-forward"], ["d", "D Cold open"]] };
function tp155Add(dr) {
  const on = !!dr.tp155, l = { code: "tp155", name: "Hook pack", poster: TP155.poster, video: TP155.video, accent: "transparent" };
  return `<div class="card rwguide" id="tp155" style="margin-top:12px"><b>Add-ons <small class="muted" style="font-weight:600">(optional)</small></b>
    <p class="muted" style="margin:4px 0 10px;font-size:13px">Hook pack: 4 openings to test as Instagram trial reels</p>
    <div class="grid g3 r113g" style="margin-bottom:6px">${mgq64(tile(l, { on, act: "none" }), l, on).replace('data-code="tp155"', 'data-code="tp155" data-tp155="1"')}</div>
    <p class="muted" id="tp155sum" style="margin:6px 0 0;font-size:13px">${tp155Sum(on)} <a href="#" id="tp155what">What you get</a></p></div>`;
}
function tp155Sum(on) { return on ? "Added. Your Hook pack comes right after your reel, included at no extra cost." : "Not added. You can also ask for one on the reel later."; }
function tp155What(onAsk, askLabel) {
  const sl = TP155.slides.map(([k, lab]) => ({ video: "/trialpack155/" + k + ".mp4", poster: "/trialpack155/" + k + ".jpg", lab }));
  sl.push({ video: TP155.video, poster: TP155.poster, lab: "All 4 side by side" });
  sheet(`<div class="tpsheet">${s50Slides(sl)}<p class="exhint">Swipe to see all 4 side by side</p>
    <h3 style="font-size:22px;font-family:var(--serif);font-weight:400;margin:0">Hook pack</h3>
    <p class="muted" style="margin:8px 0 4px;font-size:15px">4 openings to test as Instagram trial reels. Same reel, same edit, only the first seconds change:</p>
    <ul><li><b>Control</b>: your reel as delivered</li><li><b>Wait-for</b>: a line that tells people what to wait for</li><li><b>Flash-forward</b>: a flash of your best moment first</li><li><b>Cold open</b>: your best moment plays first, then the reel</li></ul>
    <p class="muted" style="margin:0 0 16px;font-size:14px">Sometimes a fifth, Series pitch, when it fits your reel. Post them as trial reels, keep the winner. Included at no extra cost.</p>
    <div class="row lookfoot">${onAsk ? `<button class="btn primary" id="tpask" style="flex:1">${esc(askLabel || "Make my Hook pack")}</button>` : ""}<button class="btn line" id="tpclose"${onAsk ? "" : ` style="flex:1"`}>Close</button></div></div>`);
  s50Swipe();
  const c = $("#tpclose"); if (c) c.onclick = () => closeSheet();
  const a = $("#tpask"); if (a && onAsk) a.onclick = () => onAsk(a);
}
function tp155AddBind(dr, re) {
  const box = $("#tp155"); if (!box) return; try { armTiles(box); } catch {}
  box.querySelectorAll("[data-mgq]").forEach(b => b.onclick = e => { e.stopPropagation(); e.preventDefault(); dr.tp155 = !dr.tp155; store("draft", dr); re(); toast(dr.tp155 ? "Hook pack added." : "Hook pack removed."); });
  box.querySelectorAll(".mv[data-tp155]").forEach(m => m.onclick = () => tp155What(b => { if (!dr.tp155) { dr.tp155 = true; store("draft", dr); } closeSheet(); re(); toast("Hook pack added."); }, dr.tp155 ? "Keep it added" : "Add it to my reel"));
  const w = $("#tp155what"); if (w) w.onclick = e => { e.preventDefault(); tp155What(b => { if (!dr.tp155) { dr.tp155 = true; store("draft", dr); } closeSheet(); re(); toast("Hook pack added."); }, dr.tp155 ? "Keep it added" : "Add it to my reel"); };
}
function tp155Reel(r) {
  S.tpAsked = S.tpAsked || {};
  const t = r.trial || null, items = ((t && t.items) || []).filter(i => i && i.url);
  const asked = S.tpAsked[r.id] && (!t || !t.at || t.at * 1000 < S.tpAsked[r.id]);
  const making = (t && t.state === "making") || asked;
  const ready = t && t.state === "ready" && items.length && !making;
  const sub = ready ? items.length + " openings to test as trial reels" : making ? "Being made now" : "4 openings to test as Instagram trial reels";
  let body;
  if (ready) body = `<div class="tpg">${items.map((i, n) => `<div class="tpv"><video controls playsinline preload="none" poster="${esc(i.poster || "")}" src="${esc(i.url)}"></video><b>Trial ${esc(i.letter)} ${esc(i.label)}</b>${i.line ? `<small>${esc(i.line)}</small>` : ""}<button class="pkcopy" type="button" data-tpdl="${n}">Save</button></div>`).join("")}</div>
      <div class="pksec"><div class="pkh"><span class="eyebrow">How to post your trial reels</span></div><ol>${(t.howto || []).map(x => `<li>${esc(x)}</li>`).join("")}</ol></div>
      ${(t.skipped || []).length ? `<p class="muted" style="font-size:12.5px;margin:10px 0 0">${esc(t.skipped.join(", "))} did not fit this reel, so it is not in this pack.</p>` : ""}`;
  else if (making) body = `<p class="tpwait">${(r.versions || []).length ? "Lumi is making your Hook pack from your latest version. It lands right here and by email, usually within a few minutes." : "Your Hook pack is made right after your reel is delivered. It lands right here and by email."}</p>`;
  else body = `<p class="tpwait" style="margin-bottom:10px">Same reel, 4 different openings to post as Instagram trial reels. Keep the one that wins. Included at no extra cost.</p><button class="btn primary block" type="button" id="tpget">Get a Hook pack</button><button class="btn line block" type="button" id="tpsee" style="margin-top:8px">What you get</button>`;
  S.tpOpen = S.tpOpen || {};
  return `<details class="card pkit tpk" id="tpk"${S.tpOpen[r.id] || making ? " open" : ""}><summary><span class="pkic" aria-hidden="true">▶</span><span class="pkhd"><b>Hook pack</b><small>${esc(sub)}</small></span><svg class="pkchev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></summary>
    <div class="pkbody">${body}</div></details>`;
}
function tp155Bind(r) {
  const d = $("#tpk"); if (!d) return;
  d.addEventListener("toggle", () => { S.tpOpen = S.tpOpen || {}; S.tpOpen[r.id] = d.open; });
  const items = ((r.trial && r.trial.items) || []).filter(i => i && i.url);
  d.querySelectorAll("[data-tpdl]").forEach(b => b.onclick = e => { e.preventDefault(); const i = items[Number(b.dataset.tpdl)]; if (i) shareReel(r, { url: i.url, name: i.name }, { save: true, url: i.url, name: i.name }); });
  const ask = async btn => { if (!tapOk("tp155", 1500)) return; if (btn) btn.disabled = true; const ok = await send({ kind: "trialpack", reel: r.id, text: "Hook pack please for " + reelLabel(r) + "." });
    if (ok) { S.tpAsked = S.tpAsked || {}; S.tpAsked[r.id] = Date.now(); S.tpOpen = S.tpOpen || {}; S.tpOpen[r.id] = true; closeSheet(); render(); toast("Hook pack on its way. It lands here and by email."); } else if (btn) btn.disabled = false; };
  const g = $("#tpget"); if (g) g.onclick = () => ask(g);
  const w = $("#tpsee"); if (w) w.onclick = () => tp155What(b => ask(b), "Make my Hook pack");
}
// INFLUENCER PROGRAM sheet ([M5 Max MBP] 2026-10-02 20:00 PDT influpop): film a review of the app, we edit it with Lumi, the team approves it,
// the reel it names goes free with the watermark off. Until then that reel follows the normal pay-after rules.
function reviewSheet() {
  const r = rwState(), st = r.status, link = r.link, t = rwTarget(), tl = t ? reelLabel(t) : "";
  const free = st === "approved" ? (r.freed || "your reel") : tl;
  const head = `<h3 style="font-size:24px;font-family:var(--serif);font-weight:400;margin:0 0 4px">Influencer program <span class="rwbeta">beta</span></h3>
    <p class="muted" style="margin:0 0 6px;font-size:14.5px">Get your reel free. Film a short video of you reviewing the Lumi app. We edit it with Lumi, and once the Lumi team approves it, your reel is <b>free, with no watermark</b>.</p>
    <p class="muted" style="margin:0 0 10px;font-size:12.5px">The influencer program is in beta, so it may change as we learn. One reward per account during beta.</p>`;
  const reel = st === "approved" ? "" : `<div class="rwreel">${t ? `Your review makes your reel free:<b>&ldquo;${esc(tl)}&rdquo;</b>` : `Your review makes <b>your next reel</b> free.`}</div>`;
  const how = `<ol class="rwsteps"><li>Film yourself talking to the camera about using Lumi: what you made and what you liked.</li><li>Upload it with your link below, then tap I've uploaded it.</li><li>We edit your review with Lumi. You will see it under Reels.</li><li>The Lumi team watches it. Approved = ${t ? "that reel is free and the watermark comes off" : "your next reel is free"}.</li></ol>
    <div class="rwguide"><b>Guidelines</b><ul><li>15 to 60 seconds</li><li>Vertical, phone held upright</li><li>Good light, face a window if you can</li><li>Say your name and how you use Lumi</li><li>Just you, talking to the camera. No script needed.</li></ul></div>`;
  let stat = "";
  if (st === "submitted") stat = !r.files ? `<div class="rwstat submitted"><b>Submitted, waiting for your video</b>We have not received your video yet. Upload it with your link below. We start editing your review the moment it lands.</div>`
    : (r.review && r.review.edited) ? `<div class="rwstat submitted"><b>Your edited review is ready</b>The Lumi team is watching it now. We will tell you in your Inbox.</div>`
    : `<div class="rwstat submitted"><b>Submitted, we are editing your review</b>Your review is in the edit with Lumi. You will see it under Reels, then the Lumi team watches it.</div>`;
  else if (st === "approved") stat = `<div class="rwstat approved"><b>Approved, thank you!</b>${free === "your next reel" ? "Your next reel is free." : esc(free) + " is free now, with no watermark."}</div>`;
  else if (st === "rejected") stat = `<div class="rwstat rejected"><b>Not approved yet</b>${r.note ? esc(r.note.trim()) + (/[.!?]$/.test(r.note.trim()) ? "" : ".") : "The team could not approve this one."} Film a new one and send it again whenever you're ready. Your reel is still waiting for you.</div>`;
  else if (st === "uploading") stat = `<div class="rwstat"><b>We got your video</b>Tick the box below and tap I've uploaded it to send it in.</div>`;
  const canSend = r.can_submit !== false && (st === "none" || st === "rejected" || st === "uploading");
  let form = "";
  if (canSend) form = `<label class="rwok"><input type="checkbox" id="rwc"><span>${esc(RW_CONSENT)} <small class="muted">(required)</small></span></label>
    ${link ? `<a class="btn primary block dis" id="rwlink" href="${esc(link)}" target="_blank" rel="noopener" style="margin:0 0 10px">Open my upload link</a>` : `<p class="muted" style="font-size:13.5px;margin:0 0 10px">Your upload link is being made. Check back here in a minute.</p>`}
    <button class="btn line block" id="rwsend" disabled>${link || st === "uploading" || r.files ? "I've uploaded it" : "Waiting for your upload link"}</button>
    <p class="muted" style="font-size:12.5px;margin:8px 0 0">This link is only for your review video, so it never gets mixed up with your reels.</p>`;
  else if (st === "submitted" && link && !r.files) form = `<a class="btn line block" href="${esc(link)}" target="_blank" rel="noopener">Open my upload link</a>`;
  sheet(`${head}${refCard50()}${stat}${reel}${st === "approved" || st === "submitted" ? "" : how}${canSend && BK112_ON ? bk112Html() : ""}${form}<button class="btn line block" id="rwclose" style="margin-top:12px">Close</button>`); bindRef50();   // CONV50   // BRANDKIT112: the optional brand kit step
  if (canSend && BK112_ON) bk112Bind();
  $("#rwclose").onclick = () => { const av = $("#avatar"); if (S.data && av && typeof av.onclick === "function" && !window.__rwFromPromo) av.onclick(); else closeSheet(); window.__rwFromPromo = false; };
  const c = $("#rwc");
  // appfix A17 2026-10-03: "I've uploaded it" needs the upload link (or a video we already have), not only the consent tick
  const upOk = !!link || st === "uploading" || !!r.files;
  if (c) c.onchange = () => { $("#rwsend").disabled = !c.checked || !upOk; const l = $("#rwlink"); if (l) l.classList.toggle("dis", !c.checked); };
  const b = $("#rwsend");
  if (b) b.onclick = async () => {
    if (!c || !c.checked) return toast("Tick the box first, it is required.");
    b.disabled = true; b.textContent = "Sending...";
    const _bk = bk112Sel();   // BRANDKIT112: the brand kit pieces they ticked go to the Mac with the review
    const ok = await send({ kind: "reward", choice: "submit", text: RW_CONSENT, reel: t && t.id && !String(t.id).startsWith("dbx:") ? t.id : "", ...(_bk.length ? { brandkit: _bk } : {}) });
    if (!ok) { b.disabled = false; b.textContent = "I've uploaded it"; return; }
    store("rwsent", Date.now()); toast("Sent. We are editing your review now."); reviewSheet();
  };
}
/* THE POP-UP. [M5 Max MBP] 2026-10-02 20:00 PDT influpop, Nick (Telegram 19:54): "Can we have pop-ups happen on the app every once in a while
   for people who are on the app: 'You want more free reels? Try our influencer program.'" Occasional, never nagging:
   never on a first visit, at most once every 3 days per client (server copy promo.last + this phone's localStorage), never while they are in
   the New reel flow, uploading, naming a reel, typing or in any open sheet, always dismissible, never for staff / owner / comped accounts,
   monthly subscribers or anyone already in the program (the Mac's promo.eligible), and only for a client who has at least one reel.
   promoDecide is pure (tests_influpop.py runs it in node). */
const PROMO_EVERY = 3 * 86400000;
function promoDecide(x) {
  const p = x.promo || null;
  if (!x.signedIn) return { show: false, why: "not signed in" };
  if (!p || !p.eligible) return { show: false, why: p ? (p.why || "not eligible") : "no promo info" };
  if (x.can_submit === false || (x.status && x.status !== "none")) return { show: false, why: "enrolled" };
  if (!(x.reels > 0)) return { show: false, why: "no reels yet" };
  if (x.firstVisit) return { show: false, why: "first visit" };
  const every = p.every_s ? p.every_s * 1000 : PROMO_EVERY, last = Math.max((Number(p.last) || 0) * 1000, Number(x.lastLocal) || 0);
  if (x.now - last < every) return { show: false, why: "shown recently" };
  if (x.busy) return { show: false, why: "busy: " + x.busy, retry: true };
  return { show: true, why: "ok" };
}
function promoBusy() {
  if (S.view === "new") return "new reel";
  if (S.view === "home" && S.reel) return "watching a reel";
  if (document.querySelector("#sheet.on, .titlepop, .revpop, .promopop, #coach")) return "something open";
  const a = document.activeElement; if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return "typing";
  const dr = S.draft || {}; if (dr.uploadTapped && !dr.uploaded) return "uploading";
  if (Date.now() - (Number(fetchStore("rwsent", 0)) || 0) < 3600000) return "just sent a review";
  const done = fetchStore("titled", {}) || {};
  if ((S.data.reels || []).some(r => !(r.versions || []).length && !r.titled && !done[r.id] && ((r.files || []).length || r.progress || r.run))) return "naming a reel";
  return "";
}
function promoQuiet(choice) { try { fetch("/api/intent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ k: K, kind: "reward", choice }) }).catch(() => {}); } catch {} }
let PROMO_FIRST = null, PROMO_T = null, PROMO_TRIES = 0;
function promoMaybe() {
  try {
    if (!S.data || K.length !== 24 || document.hidden) return;
    if (PROMO_FIRST === null) { const fs = fetchStore("firstseen", 0); PROMO_FIRST = !fs; if (!fs) store("firstseen", Date.now()); }
    const rw = S.data.rewards || {};
    const v = promoDecide({ signedIn: true, promo: rw.promo, status: rw.status, can_submit: rw.can_submit, reels: (S.data.reels || []).length,
      firstVisit: PROMO_FIRST, lastLocal: fetchStore("promo_last", 0), now: Date.now(), busy: promoBusy() });
    window.__promoWhy = v.why;
    if (!v.show) { if (v.retry && PROMO_TRIES++ < 6) { clearTimeout(PROMO_T); PROMO_T = setTimeout(promoMaybe, 30000); } return; }
    promoShow();
  } catch {}
}
function promoShow() {
  if (document.querySelector(".promopop")) return;
  store("promo_last", Date.now()); promoQuiet("popup_shown");
  const o = document.createElement("div"); o.className = "promopop";
  o.innerHTML = `<div class="ppc" role="dialog" aria-modal="true" aria-labelledby="pph"><button class="ppx" type="button" aria-label="Close">&times;</button><img src="/lumi/got.webp" alt="">
    <h2 id="pph">Want more free reels?</h2><p>Try our influencer program. Film a quick review of Lumi, we edit it for you, and once the team approves it, your reel is free.</p>
    <button class="btn primary block" type="button" id="ppgo">Try the influencer program</button><button class="btn line block" type="button" id="ppno">Not now</button></div>`;
  const close = why => { promoQuiet(why); o.classList.remove("in"); setTimeout(() => o.remove(), 250); };
  o.addEventListener("click", e => { if (e.target === o || e.target.closest(".ppx") || e.target.closest("#ppno")) close("popup_dismissed"); });
  o.querySelector("#ppgo").onclick = () => { close("popup_opened"); window.__rwFromPromo = true; setTimeout(() => rewardsSheet(), 200); };
  document.body.appendChild(o); requestAnimationFrame(() => o.classList.add("in"));
}
function brollKinds(l) { const k = (l.broll && l.broll.kinds) || []; return k.length === 1 ? (k[0] === "photo" ? "photos" : "videos") : "photos or videos"; }
function brollGot() { return (S.data && S.data.broll_received) || { n: 0 }; }
function brollPicks(d) {
  const out = [], add = l => { if (l && l.broll && !out.some(x => x.code === l.code)) out.push(l); };
  if (d.lookMode === "pick" && d.look) add(byCode(d.look));
  if (d.lookMode === "same") add(lookByName((S.data.account || {}).look || lastLook()));
  mgPicks(d).forEach(c => add(byCode(c)));
  return out;
}
function brollOffer(l, after) {
  const dr = S.draft || (S.draft = DEFAULT_DRAFT());
  dr.brollAsked = dr.brollAsked || [];
  const ringPick = RING_CODES.includes(l.code);   // carouselmerge 2026-10-07: Carousel always asks "Which carousel?" (Ring / Wrap) when picked
  if (!ringPick && (dr.brollAsked.includes(l.code) || dr.brollOwn === true)) return false;      // asked once per pick; already sending their own
  if (!ringPick && l.role === "look" && (S.data.account || {}).returning && !dr.changeLook) return false;       // a returning client builds in their approved look (REPLY_RULES 34). [M5 Max MBP] 2026-09-29 sweep50: unless they chose a new look
  document.querySelectorAll(".toast").forEach(t => t.remove());
  if (!dr.brollAsked.includes(l.code)) dr.brollAsked.push(l.code); store("draft", dr);
  brollDialog(dr, { look: l, fresh: true, after });
  return true;
}
/* [M5 Max MBP] 2026-09-30 (walkthrough agent): ONE B-roll dialog. Nick: "Skip. Use yours" was wrong and there was nothing else to click.
   The choices are now always: No B-roll / Add B-roll for me (Photo or Video) / I will send my own. Used when a look with B-roll spots is
   picked AND in place on the brief summary (it no longer jumps back to step 3). Draft contract unchanged: broll, brollOwn, brollKind. */
/* [M5 Max MBP] 2026-10-05 08:3x PDT (brollpick agent). Nick, Telegram 08:26: "If people do the full sauce profile ... it comes with B-roll
   card sections and B-roll pop-ups. Do they want photos? Do they want videos? Do they want to upload their own? ... Do they want us to do it?"
   ONE step, asked whenever the look (or a motion graphic) has B-roll spots, or the editing level is Full Sauce: You pick for me (default) /
   Stock videos / Photos / I'll upload my own, more than one = a mix, plus an optional note. The answer is STRUCTURED (dr.brollSrc,
   dr.brollNote -> brollPayload -> intent.broll -> job.broll_pick -> plan.broll_pick) and also written into the brief text. The legacy keys
   (broll, brollOwn, brollKind) stay in step so every older reader keeps working. Own uploads go through the client's own B-roll Dropbox
   file request (separate from the main upload link), which files them as B-roll for this reel, never as a new reel. */
const BR_SRC = ["stock_video", "photos", "own"];
function brollSrcOf(dr) {
  if (Array.isArray(dr.brollSrc)) return dr.brollSrc.filter(x => BR_SRC.includes(x));
  const s = [];                                   // a draft from before 2026-10-05: map the old keys
  if (dr.brollOwn === true) s.push("own");
  else if (dr.brollKind === "Photos") s.push("photos"); else if (dr.brollKind === "Videos") s.push("stock_video"); else if (dr.brollKind === "Both photos and videos") s.push("stock_video", "photos");
  return s;
}
function brollFillOf(dr) { if (!dr.broll.startsWith("Add")) return dr.brollSet ? "none" : ""; const s = brollSrcOf(dr); return !s.length ? "auto" : s.length > 1 ? "mix" : s[0]; }
function brollFillText(dr) {
  const f = brollFillOf(dr), s = brollSrcOf(dr), n = brollGot().n;
  const own = "my own photos or videos, sent through my B-roll link" + (n ? " (" + n + " received so far)" : "");
  const part = { own, stock_video: "stock videos", photos: "photos and images" };
  if (f === "auto") return "you pick for me, whatever fits my words best";
  if (f === "mix") return "a mix: " + (s.includes("own") ? own + " first, then " : "") + s.filter(x => x !== "own").map(x => part[x]).join(" and ");
  return f === "own" ? own + ", use mine in the spots" : f === "stock_video" ? "stock videos only" : f === "photos" ? "photos and images only" : "";
}
function brollPayload(dr) {
  const fill = brollFillOf(dr); if (!fill) return null;
  return { fill, sources: brollSrcOf(dr), note: String(dr.brollNote || "").trim().slice(0, 2000), slots: brollPicks(dr).map(l => l.code), level: intensityOf(dr), ...(ringLook(dr) && dr.ring ? { ring: dr.ring } : {}) };
}
function brollNeedsAsk(dr) { return !dr.brollSet && (brollPicks(dr).length > 0 || intensityOf(dr) === "Full Sauce"); }
/* [M5 Max MBP] 2026-10-07 18:33 PDT (carousel2 agent). Nick, Telegram 18:22: "For the carousel one if they choose that style, they have to have
   an option to upload their B-roll photos or we can choose the B-roll photos for them (or videos ...), but whatever's rotating around them."
   When the picked look is CAROUSEL (F35 / M29) the B-roll step becomes ONE plain question with two answers: "Upload the photos or clips that
   spin around you" (their own B-roll link, photos or short clips, clips play inside the cards) or "Choose them for me" (their own uploads
   first, otherwise images that match what they say). Stored as dr.ring = "own" | "auto" -> intent.broll.ring -> job.broll_pick.ring ->
   plan.carousel_ring -> carousel_render ring.media. The legacy keys (broll, brollSrc, brollOwn) are kept in step. */
const RING_CODES = ["F35", "M29", "F36", "M30"];   // F36 / M30 CAROUSEL WRAP added [M5 Max MBP] 2026-10-07 19:59 PDT (Nick TG 19:54 "This is approved")
function ringLook(dr) { return brollPicks(dr).find(l => RING_CODES.includes(l.code) || /^carousel/i.test(l.name || "")) || null; }
/* [M5 Max MBP] 2026-10-07 19:59 PDT carouselwrap: Carousel has two ring options. The Carousel step opens with "Which carousel?":
   Ring (F35, the level ring) or Wrap (F36, the long oval over the shoulder and behind the back). The choice IS the look code. */
const RING_OPTS = [["F35", "Carousel circular", "A ring of cards turning around your middle"], ["F36", "Carousel wrap", "A long oval up over your shoulder and behind your back"]];   // labels: Nick TG 21:00 [M5 Max MBP] 2026-10-07
function ringDialog(dr, l, opts = {}) {
  const d = S.data || {}; let pick = dr.ring || "", note = String(dr.brollNote || ""), finished = false;
  let ver = l && (l.code === "F36" || l.code === "M30") ? "F36" : "F35";
  const finish = () => { if (finished || !pick) return; finished = true;
    const ni = $("#brnote"); if (ni) note = ni.value;
    if (byCode(ver) && (dr.lookMode === "pick" || dr.changeLook || !dr.look || RING_CODES.includes(dr.look))) { dr.look = ver; dr.lookMode = "pick"; if ((S.data && S.data.account || {}).returning) dr.changeLook = true; }   // carouselwrap: the option IS the look
    dr.ring = pick; dr.broll = "Add b-roll where it helps"; dr.brollSrc = pick === "own" ? ["own"] : []; dr.brollOwn = pick === "own"; dr.brollKind = "";
    dr.brollNote = String(note || "").trim().slice(0, 2000); dr.brollSet = true; store("draft", dr); closeSheet();
    if (typeof opts.after === "function") opts.after(); else if (S.view === "new") render();
    toast(pick === "own" ? (brollGot().n ? "Got it. Your " + brollGot().n + " photos or clips spin around you. Add more any time." : "Got it. Upload your photos or clips with your B-roll link.") : "Got it. We choose what spins around you."); };
  const draw = () => {
    const got = brollGot(), own = pick === "own";
    const ch = [["own", "Upload the photos or clips that spin around you", "6 to 8 photos or short clips, in the order you talk about them. Clips play inside the cards."],
      ["auto", "Choose them for me", "We use photos or clips you already sent us first. If there are none, we find images that match what you say."]];
    const vl = byCode(ver) || l;
    sheet(`<div class="brofr"><h3 style="font-size:24px;font-family:var(--serif);font-weight:400;margin:0 0 6px">What spins <i>around you?</i></h3>
      <p class="muted" style="margin:0 0 8px;font-size:15px">Carousel puts photos or clips on cards that turn around you while you talk, passing in front of you and behind you. Which carousel?</p>
      <div class="rgver" style="display:flex;gap:10px;margin:0 0 14px">${RING_OPTS.filter(([c]) => byCode(c)).map(([c, n, sm]) => `<button data-rv="${c}" class="${ver === c ? "on" : ""}" style="flex:1;min-width:0;border-radius:16px;padding:8px;border:2px solid ${ver === c ? "var(--accent,#6a5cff)" : "transparent"};background:var(--card,#fff);text-align:left;color:inherit"><img src="${esc(byCode(c).poster)}" alt="" style="width:100%;aspect-ratio:3/4;object-fit:cover;object-position:top;border-radius:10px;display:block"><b style="display:block;margin:6px 2px 0;font-size:15px">${esc(n)}</b><small class="muted" style="display:block;margin:0 2px 2px;font-size:12.5px;line-height:1.3">${esc(sm)}</small></button>`).join("")}</div>
      <div class="opt one">${ch.map(([k, n, sm]) => `<button data-rg="${k}" class="${pick === k ? "on" : ""}"><span>${esc(n)}<small>${esc(sm)}</small></span></button>`).join("")}</div>
      ${own ? (d.broll_link ? `${got.n ? `<div class="btn received block" style="margin-top:12px">Received: ${got.n} file${got.n === 1 ? "" : "s"}</div>` : ""}<a class="btn ${got.n ? "line" : "primary"} block" id="brup" style="margin-top:12px" href="${esc(d.broll_link)}" target="_blank" rel="noopener">${got.n ? "Add more photos or clips" : "Upload my photos or clips"}</a>
        <p class="muted" style="margin:8px 0 0;font-size:13px">Use this link for the ring only. Everything you send there spins around you in this reel, never becomes a new reel. Best: bright, simple photos, one thing in each.</p>` : `<p class="muted" style="margin:10px 0 0;font-size:13.5px">Your upload link for these is being made. It shows here and on the last step in a minute.</p>`) : ""}
      <label class="lbl" for="brnote">What should the cards show? <small class="muted">optional</small></label>
      <input class="text" id="brnote" maxlength="2000" placeholder="e.g. my 5 favourite spots, my products, before and after" value="${esc(note)}">
      <button class="btn primary block${pick ? "" : " dis"}" id="brdone" style="margin-top:14px"${pick ? "" : " disabled"}>Done</button></div>`);
    const ni = $("#brnote"); if (ni) ni.oninput = () => { note = ni.value; };
    document.querySelectorAll("[data-rg]").forEach(b => b.onclick = () => { pick = b.dataset.rg; draw(); });
    document.querySelectorAll("[data-rv]").forEach(b => b.onclick = () => { ver = b.dataset.rv; draw(); });
    const up = $("#brup"); if (up) up.addEventListener("click", () => { dr.brollTapped = Date.now(); store("draft", dr); });
    $("#brdone").onclick = () => finish();
  };
  draw();
}
function brollDialog(dr, opts = {}) {
  { const rl = (opts.look && RING_CODES.includes(opts.look.code)) ? opts.look : ringLook(dr); if (rl) return ringDialog(dr, rl, opts); }   // carousel2 2026-10-07
  const only = brollAllowed(dr), d = S.data || {};
  const fresh = !dr.brollSet && !dr.broll.startsWith("Add");
  let src = fresh ? [] : brollSrcOf(dr), note = String(dr.brollNote || "");
  const choices = [["auto", "You pick for me", "We choose what fits your words"],
    ...(only === "photo" ? [] : [["stock_video", "Stock videos", "Short clips we find to match what you say"]]),
    ...(only === "video" ? [] : [["photos", "Photos / images", "Pictures that match what you say"]]),
    ["own", "I'll upload my own", only === "photo" ? "Your photos, through your B-roll link" : "Your photos or clips, through your B-roll link"]];
  let finished = false;
  const finish = none => { if (finished) return; finished = true;   // [M5 Max MBP] 2026-10-01 07:26 PDT qa2fix #1: one Done per dialog
    const ni = $("#brnote"); if (ni) note = ni.value;
    if (none) { dr.broll = "No b-roll, just me"; delete dr.brollOwn; dr.brollSrc = []; dr.brollKind = ""; }
    else { dr.broll = "Add b-roll where it helps"; dr.brollSrc = src.slice(); dr.brollOwn = src.includes("own");
      dr.brollKind = src.includes("stock_video") && src.includes("photos") ? "Both photos and videos" : src.includes("stock_video") ? "Videos" : src.includes("photos") ? "Photos" : ""; }
    dr.brollNote = none ? "" : String(note || "").trim().slice(0, 2000);
    dr.brollSet = true;   // [M5 Max MBP] 2026-10-01 defaults2: an explicit B-roll choice outranks the editing level
    store("draft", dr); closeSheet();
    if (typeof opts.after === "function") opts.after(); else if (S.view === "new") render();
    toast(none ? "No B-roll. Just you on camera." : !src.length ? "Got it. We pick the B-roll for you." : src.length > 1 ? "Got it. A mix it is." : src[0] === "own" ? "Got it. Send your B-roll through your B-roll link." : "Got it. " + (src[0] === "photos" ? "Photos" : "Stock videos") + " in your B-roll spots.");
  };
  const draw = () => {
    const l = opts.look || brollPicks(dr)[0] || null, got = brollGot(), own = src.includes("own");
    const where = l && l.broll && (l.broll.where || []).length ? " (" + l.broll.where.slice(0, 3).join(", ") + ")" : "";
    sheet(`<div class="brofr"><h3 style="font-size:24px;font-family:var(--serif);font-weight:400;margin:0 0 6px">What goes in your <i>B-roll?</i></h3>
      <p class="muted" style="margin:0 0 12px;font-size:15px">${l ? `<b>${esc(l.name)}</b> comes with B-roll spots${esc(where)}: photos or clips that pop up while you talk. What should fill them?` : "Your edit has B-roll: photos or clips that pop up while you talk. What should fill them?"}</p>
      ${l && l.broll && l.broll.note ? `<p class="brnote">${esc(l.broll.note)}</p>` : ""}
      <div class="opt one">${choices.map(([k, n, sm]) => `<button data-bf="${k}" class="${(k === "auto" ? !src.length : src.includes(k)) ? "on" : ""}"><span>${esc(n)}<small>${esc(sm)}</small></span></button>`).join("")}</div>
      <p class="muted" style="margin:6px 0 0;font-size:13px">Tap more than one for a mix.</p>
      ${own ? (d.broll_link ? `${got.n ? `<div class="btn received block" style="margin-top:12px">Received: ${got.n} B-roll file${got.n === 1 ? "" : "s"}</div>` : ""}<a class="btn ${got.n ? "line" : "primary"} block" id="brup" style="margin-top:12px" href="${esc(d.broll_link)}" target="_blank" rel="noopener">${got.n ? "Add more B-roll" : "Upload my B-roll"}</a>
        <p class="muted" style="margin:8px 0 0;font-size:13px">This link is only for B-roll. What you send there goes into this reel, never into a new one.</p>` : `<p class="muted" style="margin:10px 0 0;font-size:13.5px">Your B-roll link is being made. It shows here and on the last step in a minute.</p>`) : ""}
      <label class="lbl" for="brnote">Anything we should show? <small class="muted">optional</small></label>
      <input class="text" id="brnote" maxlength="2000" placeholder="e.g. show my product, my gym, screenshots of my app" value="${esc(note)}">
      <button class="btn primary block" id="brdone" style="margin-top:14px">Done</button>
      <button class="btn ghost block" id="brnone" style="margin-top:6px">No B-roll, just me</button></div>`);
    const ni = $("#brnote"); if (ni) ni.oninput = () => { note = ni.value; };
    document.querySelectorAll("[data-bf]").forEach(b => b.onclick = () => { const k = b.dataset.bf;
      if (k === "auto") src = []; else src = src.includes(k) ? src.filter(x => x !== k) : [...src, k];
      draw(); });
    const up = $("#brup"); if (up) up.addEventListener("click", () => { dr.brollTapped = Date.now(); store("draft", dr); });
    $("#brdone").onclick = () => finish(false);
    $("#brnone").onclick = () => finish(true);
  };
  draw();
}
/* [M5 Max MBP] 2026-09-30 (walkthrough agent): small in-place dialogs for the brief summary rows (captions, music, background), so editing
   one thing never throws the client back to an earlier step. Same draft keys and values as The specifics. */
function editInPlace(dr, k) {
  const O = { intensity: ["How much editing?", INTENSITY], captions: ["Captions", [["Captions on", "In the style of your look"], ["No captions", "Just the video"]]],
    music: ["Music", [["Music, plus a version without", "You get both files"], ["No music", "Just your voice"]]],
    background: ["Background", [["Keep it as filmed", ""], ["Blur it", ""], ["A solid color", ""], ["A photo I will send", ""]]] }[k];
  if (!O) return;
  const draw = () => {
    sheet(`<h3 style="font-size:24px;font-family:var(--serif);font-weight:400;margin:0 0 12px">${O[0]}</h3>
      <div class="opt one">${O[1].map(([o, sm]) => `<button data-ie="${esc(o)}" class="${(k === "intensity" ? intensityOf(dr) : dr[k]) === o ? "on" : ""}"><span>${o}${sm ? `<small>${sm}</small>` : ""}</span></button>`).join("")}</div>
      ${k === "background" && dr.background === "A solid color" ? `<input class="text" id="iecol" placeholder="Which color? A name or a hex code" value="${esc(dr.colour)}" style="margin-top:10px"><button class="btn primary block" id="iesave" style="margin-top:12px">Save</button>` : ""}`);
    document.querySelectorAll("[data-ie]").forEach(b => b.onclick = () => {
      dr[k] = b.dataset.ie; store("draft", dr);
      if (k === "music" && dr.music !== "No music") { musicSheet(dr); return; }
      if (k === "background" && dr.background === "A solid color") { draw(); const c = $("#iecol"); if (c) c.focus(); return; }
      if (k === "intensity" && brollNeedsAsk(dr)) { closeSheet(); setTimeout(() => brollDialog(dr), 250); return; }   // [M5 Max MBP] 2026-10-05 brollpick: Full Sauce has B-roll, ask what fills it
      closeSheet(); render();
    });
    const sv = $("#iesave"); if (sv) sv.onclick = () => { dr.colour = ($("#iecol").value || "").trim(); store("draft", dr); closeSheet(); render(); };
  };
  draw();
}
function brollSection(dr, d) {
  const picks = brollPicks(dr), got = brollGot(), on = dr.broll.startsWith("Add");
  let h = `<div class="card brsec" id="brsec">`;
  if (picks.length) h += `<p class="brspots"><b>Spots for B-roll in what you picked:</b> ${picks.map(l => esc(l.name)).join(", ")}. ${esc(picks[0].broll.note || "")}</p>`;
  if (!on) return h + `<p class="muted" style="margin:0;font-size:14px">${picks.length ? "Want your own photos or videos in those spots? Tap Add b-roll above." : "Tap Add b-roll above to send your own photos or videos."}</p></div>`;
  // [M5 Max MBP] 2026-09-30 (walkthrough agent): the own-vs-ours question moved to brollDialog (asked once, editable on the brief); this card is only the upload link now.
  h += `<p class="muted" style="margin:0 0 4px;font-size:14px">You are sending your own ${esc((dr.brollKind || "photos or videos").toLowerCase())}. <a href="#" id="brchg">Change</a></p>`;
  if (dr.brollOwn !== false) {
    h += got.n ? `<div class="btn received block" style="margin-top:12px">Received: ${got.n} B-roll file${got.n === 1 ? "" : "s"}${got.photos && got.videos ? " (" + got.photos + " photo" + (got.photos === 1 ? "" : "s") + ", " + got.videos + " video" + (got.videos === 1 ? "" : "s") + ")" : ""}</div>` : "";
    h += d.broll_link ? `<a class="btn ${got.n ? "line" : "primary"} block" id="brl" style="margin-top:12px" href="${esc(d.broll_link)}" target="_blank" rel="noopener">${got.n ? "Add more B-roll" : "Open my B-roll link"}</a>` : `<p class="muted" style="margin:12px 0 0;font-size:14px">Your B-roll link is being made. Check back here in a minute.</p>`;
    h += `<p class="muted help">This link is only for B-roll, separate from your main video, so the two never get mixed up. Choose photos or clips from your Photos, as many as you like. ${got.n ? "" : "The count shows here once they land."}</p>`;
  }
  return h + `</div>`;
}
function confetti(ms = 4200) {
  const c = document.createElement("canvas"); c.id = "confetti"; document.body.appendChild(c);
  const x = c.getContext("2d"); const W = c.width = innerWidth, H = c.height = innerHeight;
  const cols = ["#ff5f6d", "#ffc371", "#d6f26b", "#5bd39b", "#7fb0ff", "#c6a4ff", "#ff8fc8"];
  const ps = Array.from({ length: 160 }, () => ({ x: Math.random() * W, y: -20 - Math.random() * H, w: 6 + Math.random() * 6, h: 8 + Math.random() * 8, r: Math.random() * Math.PI, vr: (Math.random() - .5) * .2, vy: 2 + Math.random() * 3, vx: (Math.random() - .5) * 1.2, c: cols[Math.floor(Math.random() * cols.length)] }));
  const t0 = performance.now();
  const tick = t => { x.clearRect(0, 0, W, H); const k = (t - t0) / ms; for (const p of ps) { p.y += p.vy; p.x += p.vx + Math.sin(p.y / 30); p.r += p.vr; x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.globalAlpha = Math.max(0, 1 - Math.max(0, k - .7) / .3); x.fillStyle = p.c; x.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); x.restore(); } if (k < 1) requestAnimationFrame(tick); else c.remove(); };
  requestAnimationFrame(tick);
}
// [M5 Max MBP] 2026-10-03 newreel: Home always says where a new reel is. A reel left mid-way (clips sent, brief not finished, and the Mac
// has not made its reel yet) gets a Continue card; a reel just sent shows at once, before the Mac's next push lists it.
function nfOptimistic() {
  if (!S.data) return;
  S.data.reels = (S.data.reels || []).filter(r => !r.local);
    { const ns = fetchStore("nfsent", null); if (ns && ns.at && Date.now() - ns.at < 30 * 60000 && String(ns.title || "").trim()) {
    const t = String(ns.title).trim().toLowerCase(), rs = S.data.reels || (S.data.reels = []);
    const conf = rs.find(r => (ns.reel && r.id === ns.reel) || String(r.title || "").trim().toLowerCase() === t || String(r.name || "").toLowerCase().includes(" - " + t + " - "));
    if (conf) { if (!(conf.versions || []).length && (!conf.progress || /brief/i.test(conf.progress.stage || "") || conf.progress.needs_you)) { conf.progress = { stage: "Brief received, starting your edit", pct: null, eta_min: null, needs_you: false, mood: "plan", synth: true }; conf.needs_brief = false; if (conf.status === "received") conf.status = "editing"; } }
    else { const late = Date.now() - ns.at > 5 * 60000;
      rs.unshift({ id: "local:" + ns.at, n: nextNo(), title: ns.title, name: ns.title, status: "editing", versions: [], files: [], local: true, needs_brief: false, channel: "app",
        footage: ns.thumb ? [{ name: ns.title, poster: ns.thumb, ready: true }] : [],
        progress: { stage: late ? "Not confirmed yet. Tap Send again on Home" : "Brief received, starting your edit", pct: null, eta_min: null, needs_you: false, mood: "plan", synth: true, local: true } }); } } }
}
function nfHomeCards() {
  const d = S.data || {}, dr = S.draft || {}, reels = d.reels || [];
  let h = "";
  const sent = fetchStore("nfsent", null);
  if (sent && sent.at && Date.now() - sent.at < 15 * 60000) {
    const t = String(sent.title || "").trim().toLowerCase();
    const listed = reels.some(r => (sent.reel && r.id === sent.reel && !needsBrief(r) && (r.progress || r.status !== "received")) || (t && String(r.title || r.name || "").toLowerCase().includes(t) && !needsBrief(r)));
    const lateU = !reels.some(r => !r.local && ((sent.reel && r.id === sent.reel) || (t && String(r.title || "").toLowerCase() === t))) && Date.now() - sent.at > 5 * 60000;
    if (lateU) h += `<div class="card nfhc"><span class="nfhi">!</span><div style="flex:1;min-width:0"><b>${esc(sent.title || "A new reel")}</b><span>We have not confirmed your brief yet. Send it again, nothing is lost.</span></div>${sent.text ? `<button class="btn sm primary" id="nfresend">Send again</button>` : ""}</div>`;
    else if (!listed && !reels.some(r => r.local)) h += `<div class="card nfhc sent"><span class="nfhi">✓</span><div style="flex:1;min-width:0"><b>${esc(sent.title || "A new reel")}</b><span>Brief received, starting your edit.</span></div></div>`;
  }
  if (!reels.some(needsBrief) && (dr.upAt || String(dr.title || "").trim()) && Date.now() - Number(dr.at || dr.upAt || 0) < 3 * 86400000) {
    const f = nfFacts(dr), stp = nfResume(dr.step || 1, f);
    const line = f.arr.n ? `${f.arr.n} clip${f.arr.n === 1 ? "" : "s"} received. Pick up where you left off.` : dr.uploadTapped ? "Waiting for your clips from Dropbox." : "Pick up where you left off.";
    h += `<div class="card nfhc"><span class="nfhi">${stp === 1 ? 1 : 3}/3</span><div style="flex:1;min-width:0"><b>${esc(String(dr.title || "").trim() || "A new reel")}</b><span>${esc(line)}</span></div><button class="btn sm primary" id="nfcont">${f.arr.n && !f.hasName ? "Start your brief" : "Continue"}</button></div>`;
  }
  return h;
}
// ONE-TIME NOTICES ([M5 Max MBP] 2026-10-03 newreel, Nick TG 10:49: "send them an apology on their account the next time they get on the
// app ... very clear on how to move forward"). From the Mac (app_notices.py) as snap.notices; shown once as a small pop-up, never again.
function noticeMaybe() {
  try {
    const ns = (S.data && S.data.notices) || [], seen = fetchStore("noticeseen", {}) || {};
    const n = ns.find(x => x && x.id && !seen[x.id]); if (!n) return;
    if (S.view === "new" || document.querySelector("#sheet.on, .titlepop, .revpop, .promopop, #coach, .nfpop")) { setTimeout(noticeMaybe, 5000); return; }
    seen[n.id] = Date.now(); store("noticeseen", seen); sendQuiet({ kind: "notice", choice: n.id });
    const o = document.createElement("div"); o.className = "titlepop nfnotice";
    o.innerHTML = `<div class="tpc" role="dialog" aria-modal="true" aria-labelledby="nth"><img src="/lumi/ask.webp" alt=""><h2 id="nth">${esc(n.title || "A note from Lumi")}</h2><p>${esc(n.text || "")}</p>
      <button class="btn primary block" type="button" id="ntgo">${esc(n.btn || "Got it")}</button>${n.go === "brief" ? `<button class="btn line block" type="button" id="ntx" style="margin-top:8px">Later</button>` : ""}</div>`;
    document.body.appendChild(o);
    o.querySelector("#ntgo").onclick = () => { o.remove(); if (n.go === "brief") { const r = reelById(n.reel); if (r && needsBrief(r)) openBrief(r.id); else if (briefReel()) openBrief(briefReel().id); else go("home"); } };
    const x = o.querySelector("#ntx"); if (x) x.onclick = () => o.remove();
  } catch {}
}
function renderSent() {
  // [M5 Max MBP] 2026-10-03 newreel (Nick TG 10:32: "once you click the Finish button, it needs to be celebratory"; "if I leave, will my reel
  // continue to work?"). True: the brief is on the Mac the moment send() returned ok, and the edit runs there without this page.
  const si = S.sentInfo || {}, t = String(si.title || "").trim();
  { const pn = pf194Next(); if (pn) {   // PAYFIRST194: the brief is in, one step is left. No "we are editing it now", no confetti.
    $("#main").innerHTML = `<div class="empty nfdone pf194sent" style="padding-top:34px"><img class="dance" src="/lumi/got.webp" alt=""><b>Your brief is in. One step left.</b>
    <span>${esc(String(pn.line || PF194_LINE))}</span>
    <span class="nfok">The Pay button shows on ${t ? `<b>${esc(t)}</b>` : "your reel"} on Home in a moment. Your edit starts by itself the moment your payment lands.</span></div>
    <div class="row" style="justify-content:center"><button class="btn primary" id="done">See it on Home</button><button class="btn line" id="tochat">Open Chat</button></div>`;
    $("#tochat").onclick = () => { S.sent = false; S.step = 0; go("msgs"); };
    $("#done").onclick = () => { S.sent = false; S.step = 0; go("home"); };
    return; } }
  $("#main").innerHTML = `<div class="empty nfdone" style="padding-top:34px"><img class="dance" src="/lumi/got.webp" alt=""><b>Your reel is in the edit!</b>
    <span>${t ? `We're editing <b>${esc(t)}</b> now.` : "We're editing it now."} ${si.videoIn === false ? "We start the moment your video lands." : ""}</span>
    <span class="nfok">You can close the app. Editing keeps going without you, and we'll let you know right here when it's ready.</span>
    <div class="nfticks">${STEPS.map(x => `<span><i>✓</i>${x}</span>`).join("")}</div></div>
    <div class="row" style="justify-content:center"><button class="btn primary" id="done">See it on Home</button><button class="btn line" id="tochat">Open Chat</button></div>`;
  confetti();
  $("#tochat").onclick = () => { S.sent = false; S.step = 0; go("msgs"); };
  $("#done").onclick = () => { S.sent = false; S.step = 0; go("home"); };
}

/* ---------- review ---------- */
// 3STEP50 [M5 Max MBP] 2026-10-26 (Nick TG 7:46 pm: "when I click into a reel that's in editing, I want to be able to see the brief, what I chose").
// "Your brief" on the reel: what the client chose, read back from the job's app_brief.raw (app_push sends it as reel.my_brief), else the
// brief this phone sent for this reel (chat message kind "brief", or the nfsent record right after Start editing).
function reelBriefText(r) {
  if (!r) return "";
  if (r.my_brief && r.my_brief.raw) return String(r.my_brief.raw);
  const m = ((S.data && S.data.messages) || []).filter(x => x && x.kind === "brief" && x.reel === r.id && x.text).pop(); if (m) return String(m.text);
  const ns = fetchStore("nfsent", null); if (ns && ns.text && ns.reel && ns.reel === r.id) return String(ns.text);
  return "";
}
function briefRows(raw) {
  const kv = {}, multi = {};
  String(raw || "").split(/\r?\n/).forEach(line => { const i = line.indexOf(":"); if (i < 1 || /^\s/.test(line)) return; const k = line.slice(0, i).trim().toLowerCase(), v = line.slice(i + 1).trim(); if (!v) return; (multi[k] = multi[k] || []).push(v); if (!(k in kv)) kv[k] = v; });
  const noCode = v => String(v || "").replace(/\s*\((?:[A-Z]{1,3}\d+|Hook \d+)\)\s*$/, "");
  const rows = [];
  if (kv.title) rows.push(["Title", kv.title]);
  let look = "";
  if (kv["caption style"]) look = noCode(kv["caption style"]) + (kv["look direction"] ? ", changed only where I said" : "");
  else if (kv.look) { const L = kv.look; look = /^I'll tell you/i.test(L) ? "My own words" : /no preset style/i.test(L) ? "No preset look" : /^the same look/i.test(L) ? L.replace(/^the same look as my last reel/i, "Same as last time") : /^surprise/i.test(L) ? "Surprise me" : /match this reference/i.test(L) ? "Match my reference" : /^your pick/i.test(L) ? "Your pick" : L; }
  if (kv["video type"] && !/^I'll tell you/i.test(kv["video type"])) rows.push(["Type", noCode(kv["video type"])]);
  if (look) rows.push(["Look", look]);
  const words = Object.keys(kv).find(k => k.startsWith("in my own words")); if (words) rows.push(["In your words", kv[words].split(" / ").join("\n")]);
  if (multi["motion graphics add-on"]) rows.push(["Motion graphics", multi["motion graphics add-on"].map(x => noCode(x.replace(/,\s*on top of my caption style$/i, ""))).join(", ")]);
  if (kv["hook style"]) rows.push(["Hook", noCode(kv["hook style"])]);
  if (kv.captions) rows.push(["Captions", /^off/i.test(kv.captions) ? "Off" : "On"]);
  if (kv.music) rows.push(["Music", /^no music/i.test(kv.music) ? "No music" : kv.music.replace(/^yes, plus a version without music/i, "Yes, plus a version without")]);
  if (kv["b-roll"] && !/^not chosen/i.test(kv["b-roll"])) rows.push(["B-roll", kv["b-roll"].charAt(0).toUpperCase() + kv["b-roll"].slice(1)]);
  { const cap = s => String(s || "").charAt(0).toUpperCase() + String(s || "").slice(1);   // FLOW122 2026-10-27: the new brief lines
    if (kv["built-out style"] && !/^none/i.test(kv["built-out style"])) rows.splice(kv.title ? 1 : 0, 0, ["Style", noCode(kv["built-out style"].split(", its captions")[0])]);
    if (kv["motion graphics"] && !multi["motion graphics add-on"]) rows.push(["Motion graphics", /^none/i.test(kv["motion graphics"]) ? "None" : "You choose"]);
    if (kv.background && !/^keep it as filmed$/i.test(kv.background)) rows.push(["Background", cap(kv.background.replace(/\s*\([^)]*\)/g, ""))]);
    if (kv["editing style"]) rows.push(["Editing style", cap(kv["editing style"].split(",")[0])]);
    if (kv["ai extras"]) rows.push(["AI extras", cap(kv["ai extras"].replace(/; /g, ", "))]);
    if ((kv["hook pack"] && /^yes/i.test(kv["hook pack"])) || (kv["trial pack"] && /^yes/i.test(kv["trial pack"]))) rows.push(["Hook pack", "Yes, 4 openings to test"]);   // HOOKPACK193 2026-11-10 13:22 PST: older briefs still say Trial pack   // TRIALPACK155
    if (kv.voiceover) rows.push(["Voiceover", /^no/i.test(kv.voiceover) ? "No" : "Yes" + (kv.voice ? ", " + kv.voice.replace(/\s*\(ElevenLabs[^)]*\)/, "") : "")]);
    if (kv.length) rows.push(["Length", cap(kv.length)]);
    if (SHOW_COLOR && kv.color) rows.push(["Color", cap(kv.color)]); }
  if (kv["reference video"]) rows.push(["Reference", kv["reference video"] + (kv["reference use"] ? "\nFor: " + kv["reference use"].split(" (")[0] : "")]);
  if (kv.script) rows.push(["Script", kv.script.split(" / ").join("\n")]);
  const notes = String(raw || "").match(/(?:^|\n)What matters most:\s*([\s\S]*)$/); if (notes && notes[1].trim()) rows.push(["Notes", notes[1].trim()]);
  return rows;
}
function refBriefHtml(r) {   // REFTHUMB50 (Nick TG 2026-10-27 07:13): the reference link he sent, with small thumbnails, tap to open the link
  const f = r && r.my_brief && r.my_brief.ref; if (!f || !/^https:\/\//.test(String(f.url || ""))) return "";
  const th = (f.thumbs || []).filter(u => /^https:\/\//.test(String(u))).slice(0, 3);
  const host = (() => { try { return new URL(f.url).hostname.replace(/^www\./, ""); } catch { return "link"; } })();
  return `<div class="kv"><span>Your reference</span><span>${th.length ? `<div class="pvrow">${th.map(u => `<a href="${esc(f.url)}" target="_blank" rel="noopener"><img src="${esc(u)}" alt="Reference preview" loading="lazy"><span>Preview</span></a>`).join("")}</div>` : ""}<a href="${esc(f.url)}" target="_blank" rel="noopener">Open on ${esc(host)}</a></span></div>`;
}
function briefView(r) {
  const raw = reelBriefText(r); if (!raw) return "";
  const rows = briefRows(raw).filter(x => !(r.my_brief && r.my_brief.ref && x[0] === "Reference")); if (!rows.length) return "";   // REFTHUMB50: the link shows once, with its previews
  return `<details class="chgcard briefv" id="briefv"><summary><span class="sp" aria-hidden="true">✦</span>Your brief<span class="cv" aria-hidden="true">›</span></summary>
    <div class="bvrows">${rows.map(([k, v]) => { const t = String(v).replace(/\s*[\u2014\u2013]\s*/g, ", "), cap = k === "Notes" || k === "In your words" || k === "Script" ? 220 : 70;   // BRIEFSHORT50 (Nick TG 2026-10-27 07:11 "it's so long... five screenshots"): short rows, long text folded
      if (t.length <= cap + 20) return `<div class="kv"><span>${esc(k)}</span><span>${esc(t)}</span></div>`;
      const cut = t.slice(0, cap).replace(/\s+\S*$/, "");
      return `<div class="kv"><span>${esc(k)}</span><span><details class="bvmore"><summary>${esc(cut)}… <b>Show all</b></summary>${esc(t)}</details></span></div>`; }).join("")}${refBriefHtml(r)}</div></details>`;
}
function renderReel() {
  // [M5 Max MBP] 2026-10-01 06:48 PDT qafix #9: a reload or resume straight into a reel skipped renderHome, so a just-approved reel showed
  // Approve again until the Mac pushed. The same local Approve / change-request state now applies here too (it is idempotent).
  try { applyRevReq((S.data && S.data.reels) || []); } catch {}
  const r = reelById(S.reel); if (!r) { S.reel = null; return renderHome(); }
  markVerSeen(r);     // revtop 2026-10-08: opening the reel clears its "New version" shimmer for good
  const vs = r.versions; const cur = S.ver || (vs.length ? vs[vs.length - 1].v : null); S.ver = cur;
  // [M5 Max MBP] 2026-09-26 play bar fix (Nick: "I click the play bar and a second play bar pops up"). Drive-delivered reels used
  // Drive's /preview iframe: its own play button, then its own player and control bar on top, and on iPhone a native player too.
  // They now stream through /api/dv (same-origin proxy, 206 ranges) into the app's ONE inline player; the iframe is only a fallback on error.
  const v0 = vs.find(x => x.v === cur) || (vs.length ? vs[vs.length - 1] : undefined); if (v0 && v0.v !== cur) S.ver = v0.v;   // revplay 2026-10-11: a stale S.ver never leaves the player empty
  const v = v0 && v0.drive && !v0.url ? Object.assign({}, v0, { url: "/api/dv?k=" + encodeURIComponent(K) + "&id=" + encodeURIComponent(v0.drive), viaDrive: true }) : v0;
  const key = r.id + ":" + cur; const pend = S.pending[key] || [];
  if (v) { try { window.e115 && window.e115("reel_open", { reel: r.id, v: v.v }); } catch {} }   // ENGAGE115: they opened this reel (once per reel+version per load)
  // [M5 Max MBP] 2026-10-01 06:48 PDT qafix #8: a started "Mark a section" belongs to one reel and one version. Switching either drops it,
  // so a note is never saved with a start time from another cut. The button label is drawn from S.rangeIn below, so it always matches.
  if (S.rangeKey !== key) { S.rangeIn = null; S.sel = null; S.box = null; S.boxMode = false; S.rangeKey = key; }   // notes2: the range and box belong to this reel + version too
  const allPend = () => (vs || []).flatMap(x => S.pending[r.id + ":" + x.v] || []);
  // REQ198 [M5 Max MBP] 2026-11-12 (Nick TG 24789): while the reel is in the edit, every note already sent for this round stays on screen (marked
  // areas, ranges, timecode notes from r.requested198, merged with the open ones; plus the overall notes below), so a new note is added on top of them.
  const req198 = (r.requested198 && Number(r.requested198.version) === Number(cur)) ? r.requested198 : null;
  const sent = (() => { const a = (r.open_comments || []).filter(c => c.version === cur), seen = new Set(a.map(c => (c.text || "") + "|" + (c.tc_in ?? c.tc)));
    for (const c of ((req198 && req198.comments) || [])) { const k = (c.text || "") + "|" + (c.tc_in ?? c.tc); if (!seen.has(k)) { seen.add(k); a.push(c); } } return a; })();
  const sentOverall198 = (req198 && req198.overall) || [];
  // [M5 Max MBP] 2026-09-29 09:05 PDT Nick: an approved reel opens LOCKED ("This reel is approved", watch any version, no note tools).
  // "Request new revisions" (showing how many of the 5 are left) unlocks the full review tools: timecoded notes, sections, overall note.
  S.reopen = S.reopen || {};
  // [M5 Max MBP] 2026-09-29 sweep: r.revision arrives as 0 for reels that already went through revisions (app_push sends delivered_revision
  // or 0), so count from the best of r.revision, run.rev and the delivered versions, and read the cap from the server (5 when absent).
  const revCap = Math.max(1, Number(r.revision_limit || (r.run && r.run.cap) || 5));
  const revUsed = Math.max(Number(r.revision) || 0, Number(r.run && r.run.rev) || 0, (vs || []).length - 1, 0);
  // [M5 Max MBP] 2026-10-01 14:32 PDT notefix: app_push sends revision_exempt (revision_limit.exempt on the Mac: comped, starred, comp card).
  // An exempt client is never shown a cap or a count and can always tap Request changes.
  const revExempt = !!r.revision_exempt;
  const revLeft = revExempt ? 99 : Math.max(0, revCap - revUsed);
  // [M5 Max MBP] 2026-09-29 Nick: "it says 'Your reel is in edit. Lumi has it,' but then it'll allow me to add edits. Obviously something's
  // wrong there". A reel IN THE EDIT is locked like an approved one: no review tools, no Request changes; one small "Add a note to this
  // edit" opens them if the client really has something to add (it joins the running edit, see "Got your notes!").
  const editLock = (r.status === "editing" || r.status === "received") && !S.reopen[r.id];
  const locked = (r.status === "done" && !S.reopen[r.id]) || editLock;
  const from = S.reelFrom && S.reelFrom.reel === r.id ? S.reelFrom : null;   // [M5 Max MBP] 2026-09-29 sweep50: opened from an Inbox message, Back returns there
  let h = `<div class="rhead"><button class="back" id="back" aria-label="${from ? "Back to Inbox" : "Back to reels"}">${ICON_BACK}<span>${from ? "Inbox" : "Reels"}</span></button><h1>${esc(reelLabel(r))}</h1><span class="status ${r.status}"><span class="dot"></span>${(ST[r.status] || ST.editing)[0]}</span>${payStamp(r)}</div>
    <div class="row rpills" style="margin-bottom:8px;align-items:center">${r.n ? `<span class="pill">${no3(r.n)}</span>` : ""}${r.look ? `<span class="pill">${esc(r.look)}</span>` : ""}${String(r.id).startsWith("drive:") ? "" : `<button class="kebab" id="kebab" aria-label="More"><svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg></button>`}</div>
    <p class="sub rsub ${r.status}"><span class="ck" aria-hidden="true">✓</span>${esc(rsubText(r))}</p>`;
  // [M5 Max MBP] 2026-10-01 07:26 PDT qa2fix #7: a cancelled reel (still inside its 24 h undo window) says so, with a way to ask for the undo, and offers no review tools
  if (r.status === "cancelled") {
    h += `<div class="apprcard cancelc"><div class="aph"><span class="apck">×</span><div><b>Cancelled. Undo?</b><span>This reel was cancelled${r.shelf && r.shelf.undo_until ? ", and it can still be brought back until " + esc(new Date(r.shelf.undo_until * 1000).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })) : ""}. Ask us and the team brings it back.</span></div></div>
      <button class="btn primary block" id="undocancel">${S.undoAsked && S.undoAsked[r.id] ? "Asked. The team is on it" : "Ask the team to undo it"}</button></div>`;
    $("#main").innerHTML = h; dock(""); bindKebab(r);
    $("#back").onclick = () => { S.reel = null; if (from) { S.reelFrom = null; S.mail = from.mail || null; go(from.view || "inbox", { __back: 1 }); return; } render(); };
    // [M5 Max MBP] 2026-10-03 appfix A4: the prefilled chat line did nothing (the chat ignores any "cancel" wording). This sends its own
    // undo_cancel event: the Mac raises a board card for the team and answers in Chat with what happened.
    { const ub = $("#undocancel"); if (S.undoAsked && S.undoAsked[r.id]) ub.disabled = true;
      ub.onclick = async () => { if (ub.disabled) return; ub.disabled = true; const lab = reelLabel(r);
        const ok = await send({ kind: "undo_cancel", reel: r.id, text: "Please undo the cancel on " + lab + "." });
        if (ok) { S.undoAsked = Object.assign(S.undoAsked || {}, { [r.id]: Date.now() }); ub.textContent = "Asked. The team is on it"; toast("Asked. The team brings it back and tells you in Chat."); }
        else ub.disabled = false; }; }
    return;
  }
  // BRIEFBOTTOM50 [M5 Max MBP] 2026-10-29 (Nick TG 18:45, told several times): a reel being edited shows Lumi editing FIRST, then the live
  // image, then "Your brief" CLOSED at the bottom (tap to open). Replaces BRIEFTOP50.
  if (!vs.length) h += (r.progress || pf194(r)) ? progressCard(r) : lumiCard(moodOf(r), "First cut", "It appears here the moment it is ready.");
  if (!vs.length && r.live_preview) h += `<div class="player" style="max-width:300px;margin:0 auto 8px"><video id="lpv" data-at="${r.live_preview.at}" src="${esc(r.live_preview.url)}" playsinline muted loop autoplay style="display:block;width:100%;aspect-ratio:9/16;object-fit:cover"></video><span class="flag"><span class="badge editing">live</span></span></div><p class="muted" style="text-align:center;font-size:13px;margin:0 0 12px">Live preview, updates as we edit. Low quality while it is being made.</p>`;
  else if (!vs.length && r.preview && r.preview.poster) h += `<div class="player" id="pvplayer" style="max-width:300px">${r.preview.video ? `<video id="pv" src="${esc(r.preview.video)}" poster="${esc(r.preview.poster)}" playsinline muted loop autoplay></video>` : `<img src="${esc(r.preview.poster)}" alt="" style="display:block;width:100%;aspect-ratio:9/16;object-fit:cover">`}<span class="flag"><span class="badge editing">first look</span></span></div><p class="muted" style="text-align:center;font-size:13px;margin:8px 0 0">The first seconds, while the rest is being cut.</p>`;
  // YOURCLIPS51 [M5 Max MBP] 2026-10-29 (Nick TG: "when people click into their reels that are editing, I need the thumbnail to be there. Then at
  // the bottom ... click into the clips that they uploaded ... under your brief"). No live/first-look picture yet = the reel's own thumbnail
  // (run poster, else the first clip's still). Under "Your brief": every uploaded clip and photo as a small tile; a tap opens the raw-clip
  // sheet on that clip (reel.raw = app_push light 540 px previews, the same files as "View raw clips").
  if (!vs.length && !r.live_preview && !(r.preview && r.preview.poster)) { const rth = (r.run && r.run.poster) || footPoster(rawOf(r).find(x => footPoster(x))) || footPoster(footageOf(r).find(x => footPoster(x)));
    if (rth) h += `<div class="player ycthumb" style="max-width:300px;margin:0 auto 8px"><img src="${esc(rth)}" alt="Your reel" style="display:block;width:100%;aspect-ratio:9/16;object-fit:cover" onerror="this.closest('.ycthumb').remove()"><span class="flag"><span class="badge running">${pf194(r) ? "Waiting for payment" : "Being edited"}</span></span></div>`; }
  const ycList = !vs.length ? (rawOf(r).length ? rawOf(r) : footageOf(r).filter(x => x.video || footPoster(x))) : [], ycMode = rawOf(r).length ? "raw" : "footage";
  const ycHtml = ycList.length ? `<div class="yclips"><div class="ychd"><b>Your clips</b><span>${ycList.length} ${ycList.length === 1 ? "file" : "files"} · tap to watch</span></div><div class="ycgrid">${ycList.map((x, i) => {
      const ph = x.kind === "photo" || /\.(jpe?g|png|heic|webp)$/i.test(String(x.name || "")), lab = ph ? "Photo" : (Number(x.dur) ? mmss(x.dur) : "Video");
      return `<button type="button" class="ycit" data-yci="${i}" aria-label="${esc(lab + " " + (x.name || ""))}">${footPoster(x) ? `<img src="${esc(footPoster(x))}" alt="" loading="lazy" onerror="this.remove()">` : ""}<span class="ycl">${ph ? "Photo" : "▶ " + esc(lab)}</span></button>`; }).join("")}</div></div>` : "";
  if (!vs.length) { h += briefView(r) + ycHtml; $("#main").innerHTML = h;
    document.querySelectorAll(".ycit").forEach(b => b.onclick = () => openFootage(r.id, ycMode, Number(b.dataset.yci))); $("#back").onclick = () => { S.reel = null; if (from) { S.reelFrom = null; S.mail = from.mail || null; go(from.view || "inbox", { __back: 1 }); return; } render(); }; bindKebab(r); bindAdd(); return; }
  if (showsProgress(r)) h += progressCard(r);
  if (vs.length > 1) h += `<div class="seg" id="vseg">${vs.map(x => `<button data-v="${x.v}" class="${x.v === cur ? "cur" : ""}">v${x.v}</button>`).join("")}</div>`;
  if (v0 && v0.v > 1 && Array.isArray(v0.changes) && v0.changes.length) {     // revtop 2026-10-08: what this revision includes
    const op = window.__chgOpenKey === S.reel + ":" + cur;   // CHGCLOSED50 (Nick TG 2026-10-27 07:03): ALWAYS collapsed when a reel opens; a tap keeps it open only while he stays on this reel (refreshes do not slam it shut), never remembered
    h += `<details class="chgcard" id="chgcard"${op ? " open" : ""}><summary><span class="sp" aria-hidden="true">✦</span>What changed in V${esc(String(v0.v))}${v0.changes.some(c => /^Done: /.test(String(c))) ? ` <small style="color:var(--green,#1fa463);font-weight:700">${v0.changes.length} done</small>` : ""}<span class="cv" aria-hidden="true">›</span></summary><ul>${v0.changes.slice(0, 14).map(c => `<li>${esc(String(c).replace(/\s*[\u2014\u2013]\s*/g, ", "))}</li>`).join("")}</ul></details>`; }
  if (v && v.drive && !v.url) {   // delivered through Google Drive (older reels, hand deliveries): Drive's own player
    h += `<div class="player${isLand(v) ? " land" : ""}" style="aspect-ratio:${isLand(v) ? "16/9" : "9/16"};max-width:${isLand(v) ? "720px" : "360px"};margin:0 auto 12px;border-radius:14px;overflow:hidden;background:#000">
      <iframe src="https://drive.google.com/file/d/${esc(v.drive)}/preview" style="width:100%;height:100%;border:0" allow="autoplay; fullscreen" allowfullscreen loading="lazy"></iframe></div>
      <p style="text-align:center;margin:0 0 14px"><a class="btn line" href="https://drive.google.com/file/d/${esc(v.drive)}/view" target="_blank" rel="noopener">Open or download in Drive</a></p>`;
  } else if (v && v.url) {
    h += `<div class="pwrap${isLand(v) ? " land" : ""}"><img class="peek" src="/lumi/wave.png" alt=""><i class="sp s1">✦</i><i class="sp s2">✦</i><i class="sp s3">✦</i><div class="player${r.paylock ? " paylock" : ""}${isLand(v) ? " land" : ""}" id="player"><video id="vid" src="${esc(v.url)}" ${v.poster ? `poster="${esc(v.poster)}"` : ""} playsinline webkit-playsinline disablepictureinpicture controlslist="nofullscreen nodownload noremoteplayback" preload="metadata"${r.paylock ? ` oncontextmenu="return false" draggable="false"` : ""}></video>${r.paylock ? `<div class="wmo" aria-hidden="true"><div class="wm1"><img src="/bunny.png" alt=""><b>LUMI EDITS</b></div><div class="wm2" id="wm2"><img src="/bunny.png" alt=""><span><b>LUMI EDITS</b><i>PREVIEW · UNPAID</i></span></div></div>` : ""}
        <div class="boxl${S.boxMode ? " on" : ""}" id="boxl" aria-label="Draw a box on the picture"></div>
        <button class="big" id="big" aria-label="Play"><span><svg viewBox="0 0 24 24"><path d="M7 4l13 8-13 8z"/></svg></span></button>
        <span class="flag"><span class="badge ${r.status}">v${cur}</span></span><button class="fs" id="fs" aria-label="Full screen"><svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></button></div></div>
      <div class="controls${locked ? " rv-locked" : ""}">
        <div class="tl" id="tl"><div class="track"></div><div class="fill" id="fill"></div><input type="range" id="scrub" min="0" max="1000" value="0" aria-label="Scrub"><div class="rsel" id="rsel" hidden><div class="rspan" id="rspan"></div><button type="button" class="rh" id="rha" aria-label="Range start"></button><button type="button" class="rh" id="rhb" aria-label="Range end"></button></div><button type="button" class="phl" id="phl" aria-label="Add comment here">Add comment here</button></div>
        <div class="times"><span id="now">00:00.0</span><span id="dur">--:--</span></div>
        <label class="lbl tcl" for="ctext">Timecode notes</label>   <!-- CAROUSEL193 [M5 Max MBP] 2026-11-10 09:33 PST (Nick TG 23992/23997/23998): carousels as decks, 4-per-row slide grid, per-slide notes, New carousel. Backup index.html.bak_pre_carousel193_<stamp> -->
<!-- TCLABEL50 (Nick TG 2026-10-27 07:19): says what this box is for -->
        <div class="notebar"><span class="pen" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 20l4-1 11-11-3-3L5 16z"/></svg></span><textarea id="ctext" rows="1" maxlength="3000" enterkeyhint="done" placeholder="Pause where you mean, then type."></textarea><button class="btn primary" id="addc">Add</button></div>
        <div class="selrow" id="selrow"></div>
        <div class="hint"><span id="rangeinfo">Tap Add for this moment. Hold the slider and drag for a range.</span><span class="hb"><button type="button" id="markin"${S.sel ? ' class="on"' : ""}>${S.sel ? "Clear range" : "Range"}</button><button type="button" id="markbox"${S.boxMode ? ' class="on"' : ""}>${S.boxMode ? "Done" : "Mark area"}</button></span></div>
      </div>`;
  } else if (v) {
    const older = vs.length && v.v !== vs[vs.length - 1].v;   // [M5 Max MBP] 2026-09-29 sweep50: an older version with no in-app copy says so plainly
    const hasLink = !!(v.links || [])[0];   // [M5 Max MBP] 2026-10-09 20:34 PDT devteam D002: no file to open = say so and offer Ask in Chat (was "Open the file" with nothing to open)
    h += `<div class="card"><div class="eyebrow">${older ? "Version " + esc(String(v.v)) : "Your cut"}</div><p style="margin:6px 0 12px">${older ? (hasLink ? "This older version does not play in the app. Open the file to watch it." : "This older version is not saved in the app. Ask us in Chat and we will send it to you.") : "The in-app player is being prepared for this one."}</p>${hasLink ? `<a class="btn line" href="${esc(v.links[0])}" target="_blank" rel="noopener">Open the file</a>` : older ? `<button class="btn line" id="oldask">Ask in Chat</button>` : ""}</div>`;
  }
  // [M5 Max MBP] 2026-09-27 19:25 PDT (Nick): a watermarked, unpaid reel (snapshot reel.pay) gets one big button right under it. After
  // payment app_push drops reel.pay and shows only the clean version, so the button goes by itself.
  // [M5 Max MBP] 2026-09-27 19:4x. The prompt keyed ONLY on r.pay, so a WATERMARKED reel whose pay
  // link was cleared or never made left the client holding a watermark with no way to pay, which is
  // exactly the message Nick must not get. app_push now sends r.watermarked computed from the
  // delivered bytes, so a watermarked reel always says so, with the button when we have a link.
  // [M5 Max MBP] 2026-10-05 wmoverlay (Nick TG 19:40): a PAYLOCKED reel is the clean file under a watermark layer. Pay = the layer comes off
  // and Download opens at once, no new file, no waiting.
  if (r.paylock && vs.length) h += r.pay ? `<div class="wmpay lockpay"><a class="btn primary" href="${esc(r.pay)}" target="_blank" rel="noopener">Pay to download, $${esc((S.data.price || {}).reel || 20)}</a><p><b>Your free reel is used.</b> Pay once and the watermark comes off and Download opens right away. Same reel, no waiting.</p></div>`
                                     : `<div class="wmpay lockpay"><p><b>This reel unlocks once it is paid.</b> Message us here and we will sort it out for you.</p></div>`;
  else if (r.watermarked && !r.pay && vs.length) h += `<div class="wmpay"><p><b>This copy carries the Lumi watermark.</b> Message us here and we will sort the clean version out for you.</p></div>`;
  // [M5 Max MBP] 2026-09-28: "Remove watermark" only on a reel that really carries one. Three clients saw it under a CLEAN
  // second reel they do owe for (billed before watermarking existed), so an unwatermarked reel with a pay link gets plain wording.
  if (r.paylock) {}
  else if (r.pay && r.watermarked && vs.length) h += `<div class="wmpay"><a class="btn primary" href="${esc(r.pay)}" target="_blank" rel="noopener">Remove watermark, $${esc((S.data.price || {}).reel || 20)}</a><p>Pay once and the clean version replaces this one automatically.</p></div>`;
  else if (r.pay && vs.length) h += `<div class="wmpay"><a class="btn primary" href="${esc(r.pay)}" target="_blank" rel="noopener">Pay $${esc((S.data.price || {}).reel || 20)} for this reel</a><p>${r.status === "done" ? "Billed now that your reel is complete. " : ""}${(() => { const a = (S.data || {}).account || {}; return (a.revisions_unlimited || Number(a.revision_cap) === 10) ? "" : "Once you have paid for a reel, every reel gets up to 10 revisions."; })()}</p></div>`;
  // [M5 Max MBP] 2026-10-01 06:48 PDT qafix #6: the lock card said "Lumi is editing, nothing to do" right under "Lumi needs you", and
  // "Lumi is editing this reel" next to "Delivered Sep 29". It now says what is true: needs you = answer in Chat; a delivered cut = the next version is in the edit.
  const needsYouNow = !!(r.progress && r.progress.needs_you);
  if (editLock && needsYouNow) {
    h += `<div class="apprcard"><div class="aph"><span class="apck">?</span><div><b>Lumi needs your answer</b><span>The edit is paused until you reply in Chat. It carries on the moment you answer.</span></div></div>
      <button class="btn primary block tochat" id="needsgo" data-reel="${esc(r.id)}">Answer in Chat</button><button class="btn line block" id="reopen" style="margin-top:8px">Add a note to this edit</button></div>`;
  } else if (editLock) {
    const lastV = vs[vs.length - 1];
    h += `<div class="apprcard"><div class="aph"><span class="apck">✎</span><div><b>${lastV ? "Lumi is editing your next version" : "Lumi is editing this reel"}</b><span>${lastV ? `v${lastV.v} above was delivered ${esc(when(lastV.at))}. You will get a message the moment the new version is ready.` : "You will get a message the moment the new version is ready."} Nothing to do until then.</span></div></div>
      <button class="btn line block" id="reopen">Add a note to this edit</button></div>`;
  } else if (locked) {
    h += `<div class="apprcard"><div class="aph"><span class="apck">✓</span><div><b>This reel is approved</b><span>Watch any version above. Want more changes? ${revExempt ? "Tap below and tell me what to change." : `You have ${revLeft} of ${revCap} revisions left.`}</span></div></div>
      <button class="btn primary block" id="reopen" ${revLeft ? "" : "disabled"}>${revExempt ? "Request new revisions" : revLeft ? `Request new revisions · ${revLeft} left` : `All ${revCap} revisions used`}</button>
      ${revLeft ? "" : `<p class="muted" style="margin:8px 0 0;font-size:13px">Message us in Chat and we'll sort it out with you.</p>`}</div>`;
  }
  // [M5 Max MBP] 2026-10-01 07:26 PDT qa2fix #4: the revision cap holds on a reel waiting for review too (6 versions = 5 revisions used offered "Revision 6 of 5")
  const capHit = r.status === "review" && revLeft <= 0;
  if (capHit) h += `<div class="apprcard capc"><div class="aph"><span class="apck">${revCap}</span><div><b>All ${revCap} revisions used</b><span>Approve it when you are happy. Want more changes? Message us in Chat and we'll sort it out with you.</span></div></div></div>`;
  if (!locked && (pend.length || sent.length || sentOverall198.length)) {   // REQ198: overall notes alone also show the list
    h += `<h2>Your notes on v${cur}</h2>`;
    // [M5 Max MBP] 2026-09-29 sweep50: each note carries the same number as its pin on the timeline
    // [M5 Max MBP] 2026-10-07 notesedit (Nick TG 14:04): a note not sent yet opens for editing on tap (its text, its timecode); Save, Delete,
    // or move it to where the player is now. What is in S.pending is exactly what Request changes sends. Sent notes stay locked.
    const ed = S.editNote && S.editNote.key === key && pend[S.editNote.i] ? S.editNote : null;
    pend.forEach((c, i) => {
      const where = c.tc_in != null ? tc(c.tc_in) + " to " + tc(c.tc_out) : tc(c.tc);
      if (ed && ed.i === i) h += `<div class="note editing" id="noteed"><span class="t" data-t="${c.tc_in ?? c.tc}"><i class="pn" aria-label="Pin ${i + 1}">${i + 1}</i><span id="nedtc">${where}</span></span><div class="body">${noteBoxMini(c)}<textarea class="ned" id="nedit" rows="2" maxlength="3000" aria-label="Edit note ${i + 1}">${esc(ed.text)}</textarea><div class="nedrow"><button type="button" class="btn primary" id="nsave">Save</button><button type="button" class="btn line" id="nmove">Move to playhead</button><button type="button" class="btn line" id="ncancel">Cancel</button><button type="button" class="ndel" id="ndel">Delete</button></div><small>Not sent yet</small></div></div>`;
      else h += `<div class="note"><span class="t" data-t="${c.tc_in ?? c.tc}"><i class="pn" aria-label="Pin ${i + 1}">${i + 1}</i>${where}</span><div class="body editable" data-i="${i}" role="button" tabindex="0" aria-label="Edit note ${i + 1}">${noteBoxMini(c)}${esc(c.text)}<small>Not sent yet · <b>Tap to edit</b></small></div><button class="x" data-i="${i}" aria-label="Remove">×</button></div>`; });
    sent.forEach((c, j) => { h += `<div class="note sent"><span class="t" data-t="${c.tc_in ?? c.tc}"><i class="pn" aria-label="Pin ${pend.length + j + 1}">${pend.length + j + 1}</i>${c.tc_in != null ? tc(c.tc_in) + " to " + tc(c.tc_out) : tc(c.tc)}</span><div class="body">${noteBoxMini(c)}${esc(c.text)}<small>Sent</small></div><span></span></div>`; });
    sentOverall198.forEach(t => { h += `<div class="note sent"><span class="t">Overall</span><div class="body">${esc(t)}<small>Sent</small></div></div>`; });   // REQ198
  }
  // [M5 Max MBP] 2026-09-28 21:4x PDT (revnotes agent). A client typed an overall note, Request changes stayed disabled, they added a timecoded
  // note and the redraw wiped their text. Nick: "they can request changes with either/or or both." The overall note is a draft saved per
  // reel on every keystroke and written back on every redraw (add/remove a note, background refresh, version switch, reload).
  { const otherN = allPend().length - pend.length; if (!locked && otherN > 0) h += `<p class="muted" style="font-size:13.5px;margin:10px 0 0">You also have ${otherN} note${otherN === 1 ? "" : "s"} on another version. ${otherN === 1 ? "It goes" : "They go"} with this request too.</p>`; }
  const drafts = fetchStore("revdraft", {}); const draft = typeof drafts[r.id] === "string" ? drafts[r.id] : "";
  if (!locked) h += `<label class="lbl" for="ctextra">Overall notes</label><textarea id="ctextra" placeholder="Optional. A new look? Say its name, or paste a reference.">${esc(draft)}</textarea>`;
  if (v && v.url && !r.paylock) h += `<button class="btn accent block rowbtn igbtn" id="share" style="margin-top:14px"><svg class="ig" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r="1" fill="currentColor"/></svg><span>${r.watermarked && r.pay ? "Share the watermarked copy" : "Share to Instagram"}</span><svg class="chv" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></button>`;
  // [M5 Max MBP] 2026-09-29 sweep50: links may be missing (no crash), and an unpaid watermarked reel never offers the second (no music) file,
  // which nothing guarantees is watermarked. It shows again once the reel is paid and the clean files are out.
  const lk = Array.isArray(v && v.links) ? v.links : [];
  // [M5 Max MBP] 2026-09-30 (walkthrough agent, item 11): Download saves the version's own file in the app (progress, then save). The
  // no-music copy downloads in-app when app_push sends its url; otherwise its Drive link stays. Drive is only a fallback when v.url is missing.
  const dlI = `<svg class="ico" viewBox="0 0 24 24"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>`, chv = `<svg class="chv" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>`;
  const nmUrl = v && !r.watermarked ? (v.url_nomusic || v.nomusic_url || v.nomusic || "") : "";
  // [M5 Max MBP] 2026-10-05 Nick TG 08:42: the Download buttons follow the version tab and say which version they save ("Download V2",
  // "Download V4 (latest)"), so a client with 4 versions knows they are saving exactly the one they picked.
  const vLab = v && v.v != null ? " V" + v.v + (vs.length > 1 && v.v === vs[vs.length - 1].v ? " (latest)" : "") : "";
  if ((r.paylock || r.watermarked) && v) h += r.pay ? `<a class="rowbtn" href="${esc(r.pay)}" target="_blank" rel="noopener">${dlI}<span>Pay to download${esc(vLab)}</span>${chv}</a>` : "";   // PAYDL200 (Nick TG 25104): no Download on any reel that still owes
  else if (v && v.url) h += `<button class="rowbtn" id="dlmain" type="button">${dlI}<span>Download${esc(vLab)}</span>${chv}</button>${nmUrl ? `<button class="rowbtn" id="dlnm" type="button">${dlI}<span>Download${esc(vLab)}, no music</span>${chv}</button>` : lk[1] && !r.watermarked ? `<a class="rowbtn" href="${esc(lk[1])}" target="_blank" rel="noopener">${dlI}<span>Download${esc(vLab)}, no music</span>${chv}</a>` : ""}`;
  else if (v && lk[0] && !r.paylock) h += `<a class="rowbtn" href="${esc(lk[0])}" target="_blank" rel="noopener">${dlI}<span>Download${esc(vLab)}</span>${chv}</a>${lk[1] && !r.watermarked ? `<a class="rowbtn" href="${esc(lk[1])}" target="_blank" rel="noopener">${dlI}<span>Download${esc(vLab)}, no music</span>${chv}</a>` : ""}`;
  if (rawOf(r).length) h += `<button class="rowbtn" id="rawclips" type="button"><svg class="ico" viewBox="0 0 24 24"><rect x="3" y="4" width="7.5" height="7.5" rx="1.8"/><rect x="13.5" y="4" width="7.5" height="7.5" rx="1.8"/><rect x="3" y="14.5" width="7.5" height="7.5" rx="1.8"/><rect x="13.5" y="14.5" width="7.5" height="7.5" rx="1.8"/></svg><span>View raw clips (${rawOf(r).length})</span>${chv}</button>`;   // RAWCLIPS50
  if (v && !String(r.id).startsWith("drive:")) h += `<button class="rowbtn addv" data-reel="${esc(r.id)}"><svg class="ico" viewBox="0 0 24 24"><rect x="3" y="6" width="13" height="12" rx="2.5"/><path d="M16 10l5-3v10l-5-3M9.5 9.5v5M7 12h5"/></svg><span>Add videos to this edit</span><svg class="chv" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></button>`;
  // [M5 Max MBP] 2026-10-01 11:55 PDT postkit: POST KIT (postkit.py on the Mac): a cover (9:16 + the 3:4 profile-grid crop), a ready caption in
  // the client's own words, hashtags and 2 other hooks. The kit of the version being watched, else the newest one. Collapsed until tapped.
  const pk = (v && v.kit) || ((vs.slice().reverse().find(x => x.kit) || {}).kit) || null;
  if (vs.length && !String(r.id).startsWith("drive:") && !r.paylock) h += tp155Reel(r);   // TRIALPACK155: above the Post kit, the newest feature first
  if (pk && pk.caption) h += postKitCard(r, pk, v && v.kit ? null : pk.for_version);
  if (v && v.at) h += `<p class="muted delivered">${editLock || vs.length > 1 ? "v" + esc(String(v.v)) + " delivered" : "Delivered"} ${when(v.at)}</p>`;
  // [M5 Max MBP] 2026-09-29 09:03 PDT Nick: the "keep it approved" option goes at the very bottom, not in the middle of the notes.
  h += briefView(r);   // 3STEP50: what they chose, under every delivered or editing reel
  if (!locked && r.status === "done") h += `<div class="relockfoot"><span>${revExempt ? "" : `${revLeft} of ${revCap} revisions left. `}Changed your mind?</span><button class="btn line block" id="relock">Cancel, keep it approved</button></div>`;
  $("#main").innerHTML = h; bindKebab(r); bindAdd(); bindPayOnce(); bindPostKit(r, pk); tp155Bind(r);
  const shb = $("#share"); if (shb) shb.onclick = () => shareReel(r, v);
  { const rb = $("#rawclips"); if (rb) rb.onclick = () => openFootage(r.id, "raw"); }   // RAWCLIPS50
  { const a = $("#dlmain"); if (a) a.onclick = () => shareReel(r, v, { save: true, suffix: v && v.v != null ? " V" + v.v : "" }); const b = $("#dlnm"); if (b) b.onclick = () => shareReel(r, v, { save: true, url: nmUrl, suffix: (v && v.v != null ? " V" + v.v : "") + " (no music)" }); }
  if (locked) dock("");
  else if (r.status === "done") dock(`<div class="actions"><div class="in"><button class="btn primary" id="changes" ${allPend().length || draft.trim() ? "" : "disabled"}>Request changes${(allPend().length + (draft.trim() ? 1 : 0)) ? " · " + (allPend().length + (draft.trim() ? 1 : 0)) : ""}</button></div></div>`, "has-actions");
  { const ro = $("#reopen"); if (ro) ro.onclick = () => { if (!tapOk("reopen", 700)) return; S.reopen[r.id] = true; render(); setTimeout(() => { const c = document.querySelector(".controls"); if (c) c.scrollIntoView({ behavior: "smooth", block: "center" }); }, 60); }; }
  { const rl = $("#relock"); if (rl) rl.onclick = () => { delete S.reopen[r.id]; render(); }; }
  // [M5 Max MBP] 2026-09-29 sweep: Approve only on a reel that is ready for review, and only on its newest version (never mid revision, never an old cut)
  const canApprove = r.status === "review" && vs.length && cur === vs[vs.length - 1].v;
  if (r.status !== "done" && !editLock) dock(`<div class="actions"><div class="in">${canApprove ? `<button class="btn green" id="approve">Approve</button>` : ""}${capHit ? `<button class="btn line" id="capchat">All ${revCap} revisions used · Chat</button>` : `<button class="btn primary" id="changes" ${allPend().length || draft.trim() ? "" : "disabled"}>Request changes${(allPend().length + (draft.trim() ? 1 : 0)) ? " · " + (allPend().length + (draft.trim() ? 1 : 0)) : ""}</button>`}</div></div>`, "has-actions");
  { const cc = $("#capchat"); if (cc) cc.onclick = () => { S.chatReel = { id: r.id, at: Date.now() }; S.reel = null; go("msgs"); }; }   // appfix A20: chat knows the reel
  { const oa = $("#oldask"); if (oa) oa.onclick = () => { S.chatReel = { id: r.id, at: Date.now() }; S.reel = null; go("msgs"); }; }   // [M5 Max MBP] 2026-10-09 20:34 PDT devteam D002: Ask in Chat for an older version with no file (opens Chat on this reel, sends nothing)
  // [M5 Max MBP] 2026-10-01 07:26 PDT qa2fix #5: version tabs scroll sideways when they do not fit (auto margins centre them when they do), and the chosen one is in view
  { const cc = $("#chgcard"); if (cc) cc.addEventListener("toggle", () => { window.__chgOpenKey = cc.open ? S.reel + ":" + S.ver : null; }); }   // CHGCLOSED50: in memory only   // revtop 2026-10-08
  { const sg = $("#vseg"), cb = sg && sg.querySelector(".cur"); if (sg && cb && sg.scrollWidth > sg.clientWidth + 1) sg.scrollLeft = Math.max(0, cb.offsetLeft - sg.offsetLeft - (sg.clientWidth - cb.offsetWidth) / 2); }
  { const ta = $("#ctextra"); if (ta) ta.oninput = () => { const all = fetchStore("revdraft", {}); if (ta.value) all[r.id] = ta.value; else delete all[r.id]; store("revdraft", all);
      const cb = $("#changes"); if (cb) { cb.disabled = !(allPend().length || ta.value.trim());
        const n198 = allPend().length + (ta.value.trim() ? 1 : 0); cb.textContent = "Request changes" + (n198 ? " \u00b7 " + n198 : ""); } }; }   // NOTECOUNT198 [M5 Max MBP] 2026-11-12 (Nick TG 24704): the count includes the overall note   // either an overall note, timecoded notes, or both
  $("#back").onclick = () => { S.reel = null; if (from) { S.reelFrom = null; S.mail = from.mail || null; go(from.view || "inbox", { __back: 1 }); return; } render(); };
  document.querySelectorAll(".seg button").forEach(b => b.onclick = () => { S.ver = Number(b.dataset.v); render(); });
  const vid = $("#vid"), scrub = $("#scrub"), player = $("#player");
  if (vid && v) { try { window.e115 && window.e115.bindVid(vid, r.id, v.v); } catch {} }   // ENGAGE115: play + 25/50/100% milestones
  // SCRUB50 (Nick TG 2026-10-27 07:05: "as I pull it forward and backwards, it needs to scrub through the video"): iPhone Safari drew
  // nothing while paused (preload=metadata, poster up) and every drag step aborted the previous seek before a frame painted. Now the first
  // touch primes the decoder (muted play+pause inside the gesture) and seeks are latest-wins: one in flight, the newest runs on "seeked".
  if (vid) {
    let busy = false, want = null;
    const go = t => { busy = true; want = null; try { vid.currentTime = t; } catch { busy = false; } };
    vid.addEventListener("seeked", () => { busy = false; if (want != null) go(want); });
    vid.__seekTo = t => { if (!(t >= 0)) return; vid.__userSeek = true; if (busy) { want = t; return; } go(t); };
    vid.__prime = () => { if (vid.__primed) return; vid.__primed = true;
      if (vid.readyState >= 2) return; const m = vid.muted, t = vid.currentTime; try { vid.preload = "auto"; } catch {}
      vid.__priming = true; vid.__userSeek = false;   // SCRUBSPRITE50: a drag made while the prime runs keeps its time (no reset to t, no resume)
      vid.muted = true; const q = vid.play(); const done = () => { try { vid.pause(); vid.muted = m; if (!vid.__userSeek) vid.currentTime = t; } catch {} vid.__priming = false; };
      if (q && q.then) q.then(done, done); else done(); };
    const tlp = $("#tl"); if (tlp) tlp.addEventListener("pointerdown", () => { try { vid.__prime(); } catch {} }, { capture: true });
    setTimeout(() => { busy = false; }, 0);
  }
  // SCRUBSPRITE50 (Nick TG 2026-10-27 07:45: "scrub through with the playhead ... very laggy ... maybe the scrubbing needs to be a lower-quality
  // video"): a version with a scrub sprite (app_push: small frames tiled into 1 to 3 JPEG sheets, preloaded here) shows the nearest frame
  // instantly in an overlay while the finger drags the slider or a range handle, and seeks the real video once, on release. While dragging,
  // vid.currentTime reads the dragged time, so range notes, the long-press stretch, Add and the clock all see where the finger is.
  // No sprite (or its sheet not loaded yet) = the SCRUB50 latest-wins seek above, exactly as before.
  if (vid && v && v.scrub && (v.scrub.sheets || []).length && v.scrub.n > 0 && v.scrub.fps > 0) {
    const SP = v.scrub, per = SP.per || SP.n;
    const imgs = SP.sheets.map(u => { const im = new Image(); try { im.decoding = "async"; } catch {} im.src = u; return im; });
    const ov = document.createElement("div"); ov.className = "scrubov"; ov.setAttribute("aria-hidden", "true"); vid.insertAdjacentElement("afterend", ov);
    const P = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "currentTime");
    let spT = null, wasPlaying = false, lastSheet = -1, hideT = 0;
    if (P && P.get && P.set) Object.defineProperty(vid, "currentTime", { configurable: true,
      get() { return spT != null ? spT : P.get.call(vid); }, set(x) { spT = null; P.set.call(vid, x); } });
    const hide = () => { clearTimeout(hideT); ov.classList.remove("on"); };
    const show = t => {
      const idx = Math.max(0, Math.min(SP.n - 1, Math.round(t * SP.fps))), s = Math.floor(idx / per), im = imgs[s];
      if (!im || !im.complete || !im.naturalWidth) return false;
      const w = idx % per, col = w % SP.cols, row = Math.floor(w / SP.cols), rows = Math.ceil(Math.min(per, SP.n - s * per) / SP.cols);
      const W = player.clientWidth || 1, H = player.clientHeight || 1, sc = Math.max(W / SP.w, H / SP.h), fw = SP.w * sc, fh = SP.h * sc;
      if (s !== lastSheet) { ov.style.backgroundImage = 'url("' + SP.sheets[s] + '")'; lastSheet = s; }
      ov.style.backgroundSize = (SP.cols * fw) + "px " + (rows * fh) + "px";
      ov.style.backgroundPosition = ((W - fw) / 2 - col * fw) + "px " + ((H - fh) / 2 - row * fh) + "px";
      ov.dataset.idx = idx; clearTimeout(hideT); ov.classList.add("on"); return true; };
    vid.__sp = {
      move(t) { if (!P || !(t >= 0) || !show(t)) return false; if (spT == null && !vid.paused && !vid.__priming) { wasPlaying = true; vid.pause(); } spT = t; vid.__userSeek = true; return true; },
      commit() { if (spT == null) return; const t = spT; spT = null;
        // keep the sprite frame up until the real frame at t has painted (requestVideoFrameCallback), so the picture never jumps back
        vid.addEventListener("seeked", () => { if (vid.requestVideoFrameCallback) { vid.requestVideoFrameCallback(hide); hideT = setTimeout(hide, 1500); } else hide(); }, { once: true });
        try { P.set.call(vid, t); } catch { hide(); }
        if (wasPlaying) { wasPlaying = false; const q = vid.play(); if (q && q.catch) q.catch(() => {}); } },
      active: () => spT != null, overlay: ov };
    vid.addEventListener("play", () => { if (vid.__priming) return; spT = null; hide(); });
    if (scrub) ["change", "pointerup", "touchend", "pointercancel", "touchcancel"].forEach(ev => scrub.addEventListener(ev, () => vid.__sp.commit()));
  }
  // [M5 Max MBP] 2026-10-01 06:51 PDT qafix: the round play icon sat in the middle of the player, which on a phone is under the Approve /
  // Request changes bar. It now centres in the part of the player you can actually see (the whole player still plays on tap).
  if (!window.__placeBigOn) { window.__placeBigOn = 1; const f = () => { try { placeBig(); } catch {} }; document.addEventListener("scroll", f, { passive: true, capture: true }); addEventListener("resize", f); }   // [M5 Max MBP] 2026-10-10 footerfix: hears #main scrolling
  setTimeout(() => { try { placeBig(); } catch {} }, 30);
  if (vid) {
    const drawPins = () => {
      const dur = vid.duration || 0; const tl = $("#tl"); tl.querySelectorAll(".pin,.rng").forEach(e => e.remove());
      if (!dur) return;
      (locked ? [] : [...pend, ...sent]).forEach((c, i) => {   // [M5 Max MBP] 2026-09-29 sweep: no note pins on the locked (approved) view
        if (c.tc_in != null) { const el = document.createElement("div"); el.className = "rng"; el.style.left = (c.tc_in / dur * 100) + "%"; el.style.width = ((c.tc_out - c.tc_in) / dur * 100) + "%"; tl.appendChild(el); }
        const p = document.createElement("div"); p.className = "pin"; p.textContent = i + 1; p.style.left = ((c.tc_in ?? c.tc) / dur * 100) + "%"; tl.appendChild(p);
      });
      try { notes2.drawSel(); } catch {}
    };
    // [M5 Max MBP] 2026-10-01 07:26 PDT qa2fix #10: Play then Back threw (timeupdate on a video whose page was gone). sync unhooks itself once the player has left the page.
    const sync = () => { const nowEl = $("#now"); if (!vid.isConnected || !nowEl) { vid.removeEventListener("timeupdate", sync); try { vid.pause(); } catch {} return; } nowEl.textContent = tc(vid.currentTime); if (vid.duration) { const p = vid.currentTime / vid.duration; scrub.value = Math.round(p * 1000); const fl = $("#fill"); if (fl) fl.style.width = (p * 100) + "%"; const L = $("#phl"); if (L) { L.style.left = (p * 100) + "%"; L.style.transform = "translateX(-" + (p * 100) + "%)"; } } try { notes2.tick(); } catch {} };
    // [M5 Max MBP] 2026-09-28 18:5x PDT (2-day asks agent), Nick's Lumi 3.0 brief: the "add comment here" playhead label. It rides on the
    // playhead, shows whenever the reel is paused or being scrubbed, and a tap drops the cursor in the note box at that exact second.
    { const L = $("#phl"); if (L) L.onclick = e => { e.preventDefault(); vid.pause(); const c = $("#ctext"); if (c) { c.focus(); c.placeholder = "Note at " + tc(vid.currentTime) + ", what should change?"; } }; }
    vid.addEventListener("loadedmetadata", () => { if (!vid.isConnected || !$("#dur")) return; $("#dur").textContent = tc(vid.duration); drawPins(); });   // metadata can land after the client has left the reel
    vid.addEventListener("timeupdate", sync);
    vid.addEventListener("play", () => { player.classList.add("playing"); const cc = document.querySelector(".controls"); if (cc) cc.classList.add("playing-now"); }); vid.addEventListener("pause", () => { player.classList.remove("playing"); const cc = document.querySelector(".controls"); if (cc) cc.classList.remove("playing-now"); });
    const tryPlay = () => { try { window.lumiSound && lumiSound(true); } catch {} const q = vid.play(); if (q && q.catch) q.catch(() => {}); };   // notes2 audio: sound only after this tap
    if (r.paylock) {   // wmoverlay 2026-10-05: full screen is the PLAYER (overlay included), never the bare video; no way = no button
      const fsb = $("#fs"); const canFs = !!(player.requestFullscreen || player.webkitRequestFullscreen);
      if (fsb) { if (!canFs) fsb.style.display = "none"; else fsb.onclick = () => { try { (player.requestFullscreen || player.webkitRequestFullscreen).call(player); } catch {} }; }
      const w2 = $("#wm2"); const flash = () => { if (!w2 || !w2.isConnected) { vid.removeEventListener("timeupdate", flash); return; } const t = vid.currentTime % 10; w2.classList.toggle("on", t >= 4 && t < 5); };
      vid.addEventListener("timeupdate", flash);
    } else
    $("#fs").onclick = () => { try { if (vid.webkitEnterFullscreen) vid.webkitEnterFullscreen(); else if (vid.requestFullscreen) vid.requestFullscreen(); } catch {} };   // [M5 Max MBP] 2026-09-28 app test 2: the player had no way to go full screen
    $("#big").onclick = tryPlay; vid.onclick = () => vid.paused ? tryPlay() : vid.pause();
    vid.controls = false;   // one control scheme: ours. Never the native bar on top of it.
    // revplay 2026-10-11 [M5 Max MBP] (Nick: "videos won't play when clients try to watch revisions"): the reel page does not poll, so a
    // PAYLOCKED version's signed /api/pv stream (valid 1 to 2 h) died under a reel left open (phone asleep, app resumed) and the player
    // stayed black with no way back. On a player error, on return to the app with the URL near expiry, and every 10 minutes while paused,
    // fetch /api/me again and swap in this version's fresh URL (keeping the playhead). Every stream URL in S.data is refreshed too.
    if (v.url && /\/api\/pv\?/.test(v.url)) {
      const expAt = () => { const m = /[?&]e=(\d+)/.exec(vid.getAttribute("src") || ""); return m ? Number(m[1]) * 1000 : 0; };
      let busy = false, tries = 0;
      const refresh = async (resume) => {
        if (busy || !vid.isConnected || tries > 3) return; busy = true; tries++;
        try {
          const r2 = await meFetch(); if (!r2.ok) return; const d2 = await r2.json();
          const fresh = {}; (d2.reels || []).forEach(x => (x.versions || []).forEach(y => { if (y.url && /\/api\/pv\?/.test(y.url)) fresh[x.id + ":" + y.v] = y.url; }));
          ((S.data && S.data.reels) || []).forEach(x => (x.versions || []).forEach(y => { const u = fresh[x.id + ":" + y.v]; if (u) y.url = u; }));
          const nu = fresh[r.id + ":" + cur];
          if (nu && nu !== vid.getAttribute("src")) {
            const t0 = vid.currentTime || 0; v.url = nu; vid.src = nu;
            vid.addEventListener("loadedmetadata", () => { try { if (t0) vid.currentTime = t0; } catch {} if (resume) tryPlay(); }, { once: true });
          }
        } catch {} finally { busy = false; }
      };
      vid.addEventListener("error", () => refresh(true));
      const near = () => expAt() && expAt() - Date.now() < 20 * 60000;
      document.addEventListener("visibilitychange", function revVis() { if (!vid.isConnected) return document.removeEventListener("visibilitychange", revVis); if (!document.hidden && near()) refresh(false); });
      const iv = setInterval(() => { if (!vid.isConnected) return clearInterval(iv); if (vid.paused && near()) refresh(false); }, 600000);
    }
    if (v.drive && !v.viaDrive) vid.addEventListener("error", () => { vid.src = "/api/dv?k=" + encodeURIComponent(K) + "&id=" + encodeURIComponent(v.drive); }, { once: true });   // fast Blob copy failed: stream from Drive
    if (v.viaDrive) vid.addEventListener("error", () => {   // Drive would not stream this one: fall back to Drive's player, alone
      player.outerHTML = `<div class="player" style="aspect-ratio:9/16;max-width:360px;margin:0 auto 12px;border-radius:14px;overflow:hidden;background:#000"><iframe src="https://drive.google.com/file/d/${esc(v.drive)}/preview" style="width:100%;height:100%;border:0" allow="autoplay" loading="lazy"></iframe></div>`;
      const c = document.querySelector(".controls"); if (c) c.style.display = "none"; }, { once: true });
    scrub.oninput = () => { if (vid.duration) { const t = scrub.value / 1000 * vid.duration; vid.__userSeek = true; if (vid.__sp && vid.__sp.move(t)) { sync(); return; } if (vid.__seekTo && vid.paused) vid.__seekTo(t); else vid.currentTime = t; sync(); } };   // SCRUB50 + SCRUBSPRITE50
    document.querySelectorAll(".note .t").forEach(t => t.onclick = () => { vid.currentTime = Number(t.dataset.t) || 0; vid.pause(); sync(); setPageY(0, true); });
    const notes2 = notes2Wire({ vid, scrub, player, tl: $("#tl"), notes: () => (locked ? [] : [...pend, ...sent]), sync });   // [M5 Max MBP] 2026-10-05 notes2: range + box notes
    const add = () => {
      const text = $("#ctext").value.trim(); if (!text) return $("#ctext").focus();
      const c = { text };
      // [M5 Max MBP] 2026-10-05 notes2: a range (dragged on the slider) sends tc_in/tc_out, else the moment (tc). A box drawn on the frame rides as region {x,y,w,h}.
      if (S.sel && S.sel.t1 - S.sel.t0 >= 0.2) { c.tc_in = +S.sel.t0.toFixed(1); c.tc_out = +S.sel.t1.toFixed(1); } else c.tc = +vid.currentTime.toFixed(1);
      if (S.box) c.region = { x: +S.box.x.toFixed(3), y: +S.box.y.toFixed(3), w: +S.box.w.toFixed(3), h: +S.box.h.toFixed(3) };
      (S.pending[key] = S.pending[key] || []).push(c); S.rangeIn = null; S.sel = null; S.box = null; S.boxMode = false; store("pending", S.pending); if (S.ctextDraft) delete S.ctextDraft[key]; vid.pause(); const t = vid.currentTime; render(); const nv = $("#vid"); if (nv) nv.currentTime = t;
    };
    // [M5 Max MBP] 2026-10-07 notesedit: the note box is a textarea that grows with the text; Enter (no Shift) still adds the note. What is
    // typed survives a redraw (removing or editing another note), per reel + version.
    { const ct = $("#ctext"); S.ctextDraft = S.ctextDraft || {};
      if (ct) { if (S.ctextDraft[key]) ct.value = S.ctextDraft[key]; noteGrow(ct);
        ct.oninput = () => { if (ct.value) S.ctextDraft[key] = ct.value; else delete S.ctextDraft[key]; noteGrow(ct); noteInView(ct.closest(".notebar") || ct); };
        ct.onfocus = () => [60, 300, 600].forEach(ms => setTimeout(() => noteInView(ct.closest(".notebar") || ct), ms));
        ct.onkeydown = e => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); add(); } }; } }
    $("#addc").onclick = add;
    if (pend.length || sent.length) drawPins();
  }
  document.querySelectorAll(".note .x").forEach(x => x.onclick = () => { const di = Number(x.dataset.i); S.pending[key].splice(di, 1); store("pending", S.pending);
    if (S.editNote && S.editNote.key === key) { if (S.editNote.i === di) S.editNote = null; else if (S.editNote.i > di) S.editNote.i--; }
    render(); });
  // [M5 Max MBP] 2026-10-07 notesedit: tap a not-yet-sent note to edit it. The player jumps to its timecode (as tapping the time does).
  const seekTo = t => { const vv = $("#vid"); if (vv) { try { vv.pause(); vv.currentTime = Number(t) || 0; } catch {} } };
  document.querySelectorAll(".note .body.editable").forEach(b => { const open = () => { const i = Number(b.dataset.i), c = (S.pending[key] || [])[i]; if (!c) return;
      S.editNote = { key, i, text: c.text }; render(); seekTo(c.tc_in ?? c.tc);
      const ne = $("#nedit"); if (ne) { try { ne.focus({ preventScroll: true }); ne.setSelectionRange(ne.value.length, ne.value.length); } catch {} noteGrow(ne); noteInView($("#noteed") || ne, true); } };
    b.onclick = e => { if (e.target.closest(".bxmini")) return; open(); }; b.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } }; });
  { const ne = $("#nedit"); if (ne && S.editNote) { const E = S.editNote; noteGrow(ne);
      ne.oninput = () => { E.text = ne.value; noteGrow(ne); noteInView($("#noteed") || ne); };
      ne.onfocus = () => [60, 300, 600].forEach(ms => setTimeout(() => noteInView($("#noteed") || ne), ms));
      const close = () => { S.editNote = null; render(); };
      $("#nsave").onclick = () => { const arr = S.pending[E.key] || [], c = arr[E.i]; const t = ne.value.trim();
        if (c) { if (t) c.text = t; else arr.splice(E.i, 1); store("pending", S.pending); }
        if (c && !t) toast("Empty note removed."); close(); };
      $("#ncancel").onclick = close;
      $("#ndel").onclick = () => { const arr = S.pending[E.key] || []; if (arr[E.i]) { arr.splice(E.i, 1); store("pending", S.pending); } toast("Note deleted."); close(); };
      $("#nmove").onclick = () => { const vv = $("#vid"), arr = S.pending[E.key] || [], c = arr[E.i]; if (!vv || !c) return; const now = +vv.currentTime.toFixed(1);
        if (c.tc_in != null) { const len = Math.max(0.2, (c.tc_out || 0) - c.tc_in); c.tc_in = now; c.tc_out = +(now + len).toFixed(1); if (vv.duration && c.tc_out > vv.duration) c.tc_out = +vv.duration.toFixed(1); }
        else c.tc = now;
        store("pending", S.pending); E.text = ne.value; render(); const v2 = $("#vid"); if (v2) try { v2.currentTime = now; } catch {} toast("Moved to " + tc(now) + "."); };
      ne.onkeydown = e => { if (e.key === "Escape") close(); }; } }
  const ap = $("#approve"); if (ap) ap.onclick = () => { if (S.approving || !tapOk("approve:" + r.id, 700)) return;
    // [M5 Max MBP] 2026-09-29 sweep50: Approve used to drop unsent notes silently. With notes waiting, the sheet says so and offers to send
    // them as changes instead; approving anyway clears them.
    const unsent = allPend().length, od = (($("#ctextra") || {}).value || "").trim();
    const warn = unsent || od ? `<p style="margin:0 0 14px;padding:10px 12px;border-radius:12px;background:#fff4d8;color:#6b4700;font-size:14.5px"><b>You have ${unsent ? unsent + " note" + (unsent === 1 ? "" : "s") : ""}${unsent && od ? " and " : ""}${od ? "an overall note" : ""} not sent yet.</b> Approving does not send them.</p>` : "";
    sheet(`<h3 style="font-size:24px;font-family:var(--serif);font-weight:400">Approve v${cur}?</h3><p class="muted" style="margin:6px 0 ${warn ? 10 : 16}px">We mark this reel done and you can post it. Want changes later? Open the reel and tap Request new revisions.</p>${warn}
      ${warn ? `<button class="btn primary block" id="sendnotes" style="margin-bottom:10px">Send my notes as changes instead</button>` : ""}
      <div class="row"><button class="btn green" id="yes" style="flex:1">${warn ? "Approve, drop my notes" : "Yes, approve it"}</button><button class="btn line" id="no">Not yet</button></div>`);
    $("#no").onclick = closeSheet;
    { const sn = $("#sendnotes"); if (sn) sn.onclick = () => { closeSheet(); const c = $("#changes"); if (c && !c.disabled) c.click(); }; }
    // [M5 Max MBP] 2026-10-01 07:26 PDT qa2fix #2: one approve at a time. A double tap on "Yes, approve it" sent two approve intents.
    $("#yes").onclick = async () => { if (S.approving) return; S.approving = r.id; const yb = $("#yes"); if (yb) yb.disabled = true; closeSheet(); let okA = false;
      try { okA = await send({ kind: "approve", reel: r.id, version: cur }); } finally { S.approving = null; }
      if (okA) { r.status = "done"; r.approved = true; { const ap = fetchStore("approvedreels", {}); ap[r.id] = Date.now(); store("approvedreels", ap); }
      if (warn) { vs.forEach(x => delete S.pending[r.id + ":" + x.v]); store("pending", S.pending); const all = fetchStore("revdraft", {}); delete all[r.id]; store("revdraft", all); }
      render(); approvePop(); } };
  };
  const ch = $("#changes"); if (ch) ch.onclick = async () => {
    // [M5 Max MBP] 2026-10-07 notesedit: a note still open in the editor goes as it reads in the box (the client sees their edit, so that is what is sent)
    if (S.editNote && String(S.editNote.key).startsWith(r.id + ":")) { const E = S.editNote, arr = S.pending[E.key] || [], c = arr[E.i], t = String(E.text || "").trim();
      if (c && t) c.text = t; S.editNote = null; store("pending", S.pending); }
    const extra0 = ($("#ctextra") || {}).value ? $("#ctextra").value.trim() : "";
    // [M5 Max MBP] 2026-09-29 sweep50: notes written on ANOTHER version of this reel go too (they used to stay "Not sent yet" on that
    // version while only the overall note went). Each is labelled with its version, since its timecode belongs to that cut.
    const others = vs.filter(x => x.v !== cur).flatMap(x => (S.pending[r.id + ":" + x.v] || []).map(c => ({ ...c, text: "(on v" + x.v + ") " + c.text, _v: x.v })));
    const comments = [...pend.map(c => ({ ...c, version: cur })), ...others.map(({ _v, ...c }) => ({ ...c, version: _v }))];   // appfix A18 2026-10-03: each note says which version it was written on
    const extra = extra0;
    if (!comments.length && !extra) return;
    const already = r.status === "editing" || r.status === "received";   // a revision is already in the edit: these notes join it
    if (!already && revLeft <= 0) { toast("All " + revCap + " revisions are used. Message us in Chat."); return; }   // [M5 Max MBP] 2026-10-01 07:26 PDT qa2fix #4
    if (S.chgSending) return; S.chgSending = true;   // [M5 Max MBP] 2026-10-01 07:26 PDT qa2fix #1: one change request at a time
    ch.disabled = true; let okC = false;
    try { okC = await send({ kind: "changes", reel: r.id, version: cur, comments, text: extra }); } finally { S.chgSending = false; }
    if (okC) { r.open_comments = [...(r.open_comments || []), ...pend.map(c => ({ ...c, version: cur })), ...others.map(({ _v, ...c }) => ({ ...c, version: _v }))];
      delete S.pending[key]; vs.forEach(x => delete S.pending[r.id + ":" + x.v]); store("pending", S.pending);
      const all = fetchStore("revdraft", {}); delete all[r.id]; store("revdraft", all);   // the draft goes only once the server confirmed
      { const rq = fetchStore("revreq", {}); rq[r.id] = { at: Date.now(), n: (r.versions || []).length }; store("revreq", rq); }   // Running now shows it at once
      r.status = "editing"; delete (S.reopen || {})[r.id]; { const ap = fetchStore("approvedreels", {}); delete ap[r.id]; store("approvedreels", ap); } render(); revPop(already ? 0 : revUsed + 1, already); }
    else ch.disabled = false;
  };
}

// [M5 Max MBP] 2026-09-29 sweep50: the line under the reel title agrees with the card under it. A reel paused on the client says so (a stale
// agent_status said "cutting your changes" above "Lumi needs you"), and an approved reel that still carries the watermark points to paying first.
function rsubText(r) {
  const p = r.progress || {};
  if (r.status !== "review" && r.status !== "done" && p.needs_you) return "Paused. Lumi needs your answer in Chat.";
  if (r.status !== "review" && r.status !== "done" && p.held) return "Waiting on a quick check by your editor.";
  if (r.status === "done" && r.paylock && r.pay) return "Approved. Pay to download it, then post it and tag us.";
  if (r.status === "done" && r.watermarked && r.pay) return "Approved. Remove the watermark, then post it and tag us.";
  if (r.agent_status && /^Cancelled on /.test(r.agent_status)) return r.agent_status + ".";   // CANCELLINE193 [M5 Max MBP] 2026-11-09: keep the honest cancel line as written
  if (r.agent_status && r.status !== "review" && r.status !== "done") return "Lumi: " + r.agent_status.toLowerCase() + ".";
  return (ST[r.status] || ST.editing)[1];
}
// [M5 Max MBP] 2026-10-05 18:4x PDT notes2 (Nick TG 18:08): Frame.io style notes. "I want to be able to select timecode start and end
// points if I want to or I can just click one timecode" and "draw on parts of the screen to leave notes ... click and drag and it opens up
// a box". Tap Add = this moment (tc). Hold the slider then drag, or the Range button, = a span with two handles (tc_in/tc_out). Mark area
// = drag (or pinch with two fingers) on the paused picture for a box, stored as {x,y,w,h} fractions of the VIDEO FRAME (object-fit:cover
// mapped out). The Mac reads both with give-or-take (tc_notes.where_words). State lives in S.sel / S.box / S.boxMode, reset per reel+version.
// [M5 Max MBP] 2026-10-07 notesedit (Nick TG 14:04 "the dialog box doesn't extend downward to reveal the rest of it"): a note box grows with
// its text up to a cap (about 40% of what is visible, 140 to 300 px), then scrolls inside. noteInView keeps it above the iPhone keyboard.
function noteGrow(el) {
  if (!el) return; const vh = window.visualViewport ? visualViewport.height : innerHeight;
  const cap = Math.round(Math.max(140, Math.min(300, vh * 0.42)));
  el.style.height = "auto"; const sh = el.scrollHeight + 2;
  el.style.height = Math.min(sh, cap) + "px"; el.style.overflowY = sh > cap ? "auto" : "hidden";
}
function noteInView(el, top) {
  if (!el || !el.getBoundingClientRect) return; const vv = window.visualViewport, r = el.getBoundingClientRect();
  const visTop = vv ? vv.offsetTop : 0, visBot = vv ? vv.offsetTop + vv.height : innerHeight;
  const hdr = document.querySelector("header.top"), hb = hdr ? Math.max(0, hdr.getBoundingClientRect().bottom - visTop) : 0;
  if (r.bottom > visBot - 10) pageScrollBy(r.bottom - visBot + 14);   // [M5 Max MBP] 2026-10-10 footerfix
  else if (r.top < visTop + hb + 6 || (top && r.top > visBot - 40)) pageScrollBy(r.top - visTop - hb - 10);
}
function noteBoxMini(c) {
  const g = c && c.region; if (!g || !(g.w > 0)) return "";
  return `<span class="bxmini" aria-label="Marked area"><i style="left:${g.x * 100}%;top:${g.y * 100}%;width:${g.w * 100}%;height:${g.h * 100}%"></i></span>`;
}
function notes2Wire(o) {
  const { vid, scrub, player, tl, notes, sync } = o;
  const rsel = $("#rsel"), rspan = $("#rspan"), ha = $("#rha"), hb = $("#rhb"), boxl = $("#boxl"), selrow = $("#selrow"), info = $("#rangeinfo"), mR = $("#markin"), mB = $("#markbox");
  const HINT = "Tap Add for this moment. Hold the slider and drag for a range.", ADJ = "Drag either end to adjust, then type your note.";
  const say = t => { if (info) info.textContent = t; };
  const dur = () => vid.duration || 0;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const chips = () => {
    if (selrow) { let h = "";
      if (S.sel && !S.selLive) h += `<span class="chip rng"><b>${tc(S.sel.t0)} to ${tc(S.sel.t1)}</b><button type="button" data-x="sel" aria-label="Clear range">×</button></span>`;
      if (S.box) h += `<span class="chip bxc"><b>Area marked</b><button type="button" data-x="box" aria-label="Delete box">×</button></span>`;
      selrow.innerHTML = h; selrow.classList.toggle("on", !!h);
      selrow.querySelectorAll("button[data-x]").forEach(b => b.onclick = () => { if (b.dataset.x === "sel") clearSel(); else { S.box = null; drawBoxes(); chips(); say(S.boxMode ? "Drag on the picture to draw a box." : HINT); } }); }
    if (mR) { mR.classList.toggle("on", !!S.sel); mR.textContent = S.sel ? "Clear range" : "Range"; }
    if (mB) { mB.classList.toggle("on", !!S.boxMode); mB.textContent = S.boxMode ? "Done" : "Mark area"; }
    const ct = $("#ctext"); if (ct && (S.sel || S.box)) ct.placeholder = S.sel ? "Note for " + tc(S.sel.t0) + " to " + tc(S.sel.t1) + (S.box ? ", in the box" : "") : "What should happen in the box?";
  };
  const drawSel = () => { if (!rsel) return; const d = dur(); if (!S.sel || !d) { rsel.hidden = true; return; }
    rsel.hidden = false; const a = S.sel.t0 / d * 100, b = S.sel.t1 / d * 100;
    rspan.style.left = a + "%"; rspan.style.width = Math.max(0.6, b - a) + "%"; ha.style.left = a + "%"; hb.style.left = b + "%";
    ha.hidden = hb.hidden = !!S.selLive; };
  const clearSel = () => { S.sel = null; S.selLive = false; tl.classList.remove("stretching"); drawSel(); chips(); say(S.boxMode ? "Drag on the picture to draw a box." : HINT); };
  const tAt = x => { const r = tl.getBoundingClientRect(); return clamp((x - r.left) / (r.width || 1), 0, 1) * dur(); };
  // range handles: drag either end, the picture follows the handle
  const dragH = (el, end) => { if (!el) return; el.addEventListener("pointerdown", e => { e.preventDefault(); e.stopPropagation(); vid.pause(); try { el.setPointerCapture(e.pointerId); } catch {}
      const mv = ev => { if (!S.sel) return; const t = tAt(ev.clientX);
        if (end) S.sel.t1 = clamp(t, S.sel.t0 + 0.2, dur()); else S.sel.t0 = clamp(t, 0, S.sel.t1 - 0.2);
        const tt = end ? S.sel.t1 : S.sel.t0; vid.__userSeek = true;
        if (!(vid.__sp && vid.__sp.move(tt))) (vid.__seekTo ? vid.__seekTo(tt) : (vid.currentTime = tt)); try { sync(); } catch {} drawSel(); chips(); };   // SCRUB50 + SCRUBSPRITE50
      const up = () => { try { vid.__sp && vid.__sp.commit(); } catch {} el.removeEventListener("pointermove", mv); el.removeEventListener("pointerup", up); el.removeEventListener("pointercancel", up); say(ADJ); };
      el.addEventListener("pointermove", mv); el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up); }); };
  dragH(ha, false); dragH(hb, true);
  // hold the slider still for a moment, then drag = stretch a range out from where you held
  let lp = null; const lpCancel = () => { if (lp) { clearTimeout(lp.timer); lp = null; } };
  scrub.addEventListener("pointerdown", e => { if (S.boxMode) return; lpCancel(); const me = { x0: e.clientX, base: null, timer: 0 }; lp = me;
    setTimeout(() => { if (lp === me) me.base = Number(scrub.value); }, 70);
    me.timer = setTimeout(() => { if (lp !== me) return; lp = null; if (me.base != null && Math.abs(Number(scrub.value) - me.base) > 12) return;
      vid.pause(); const t = vid.currentTime; S.selAnchor = t; S.sel = { t0: t, t1: t }; S.selLive = true; tl.classList.add("stretching");
      try { navigator.vibrate && navigator.vibrate(12); } catch {} say("Now slide to where it ends."); drawSel(); chips(); }, 380); });
  scrub.addEventListener("pointermove", e => { if (lp && Math.abs(e.clientX - lp.x0) > 8) lpCancel(); });
  const lpEnd = () => { lpCancel(); if (!S.selLive) return; S.selLive = false; tl.classList.remove("stretching");
    if (!S.sel || S.sel.t1 - S.sel.t0 < 0.2) { S.sel = null; say(HINT); } else say(ADJ); drawSel(); chips(); };
  scrub.addEventListener("pointerup", lpEnd); scrub.addEventListener("touchend", lpEnd); scrub.addEventListener("change", lpEnd); scrub.addEventListener("pointercancel", lpCancel);
  if (mR) mR.onclick = () => { if (S.sel) { clearSel(); return; } const d = dur(); if (!d) return; vid.pause();
    let t0 = vid.currentTime, t1 = Math.min(d, t0 + 2); if (t1 - t0 < 1) { t1 = d; t0 = Math.max(0, d - 2); }
    S.sel = { t0, t1 }; drawSel(); chips(); say(ADJ); };
  // the box: map pointer <-> video frame through object-fit:cover
  const geo = () => { const r = boxl.getBoundingClientRect(); const vw = vid.videoWidth || 9, vh = vid.videoHeight || 16;
    const sc = Math.max(r.width / vw, r.height / vh), dw = vw * sc, dh = vh * sc; return { r, dw, dh, ox: (r.width - dw) / 2, oy: (r.height - dh) / 2 }; };
  const toF = (cx, cy) => { const g = geo(); return { x: clamp((cx - g.r.left - g.ox) / g.dw, 0, 1), y: clamp((cy - g.r.top - g.oy) / g.dh, 0, 1) }; };
  const toE = b => { const g = geo(); return { l: g.ox + b.x * g.dw, t: g.oy + b.y * g.dh, w: b.w * g.dw, h: b.h * g.dh }; };
  const norm = (a, b) => { const x = clamp(Math.min(a.x, b.x), 0, 1), y = clamp(Math.min(a.y, b.y), 0, 1);
    return { x, y, w: clamp(Math.abs(a.x - b.x), 0.02, 1 - x), h: clamp(Math.abs(a.y - b.y), 0.02, 1 - y) }; };
  const drawBoxes = () => { if (!boxl) return; boxl.classList.toggle("on", !!S.boxMode); player.classList.toggle("marking", !!S.boxMode);
    const t = vid.currentTime; let h = "";
    if (!S.boxMode) (notes() || []).forEach((c, i) => { const g = c.region; if (!g) return;
      const a = c.tc_in != null ? c.tc_in - 0.25 : (Number(c.tc) || 0) - 0.6, b = c.tc_in != null ? c.tc_out + 0.25 : (Number(c.tc) || 0) + 0.6;
      if (t < a || t > b) return; const e = toE(g); h += `<div class="bxo" style="left:${e.l}px;top:${e.t}px;width:${e.w}px;height:${e.h}px"><i>${i + 1}</i></div>`; });
    if (S.box) { const e = toE(S.box); h += `<div class="bx" style="left:${e.l}px;top:${e.t}px;width:${e.w}px;height:${e.h}px"><span class="bxh h0" data-h="h0"></span><span class="bxh h1" data-h="h1"></span><button type="button" class="bxx" aria-label="Delete box">×</button></div>`; }
    if (S.boxMode && !S.box) h += `<div class="bxtip">Drag to draw a box</div>`;
    boxl.innerHTML = h;
    const x = boxl.querySelector(".bxx"); if (x) { x.addEventListener("pointerdown", e => e.stopPropagation()); x.onclick = e => { e.stopPropagation(); S.box = null; drawBoxes(); chips(); say("Drag on the picture to draw a box."); }; } };
  const pts = new Map(); let op = null;
  if (boxl) {
    boxl.addEventListener("pointerdown", e => { if (!S.boxMode) return; e.preventDefault(); try { boxl.setPointerCapture(e.pointerId); } catch {}
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); vid.pause();
      if (pts.size >= 2) { op = { k: "pinch", moved: true }; return; }
      const f = toF(e.clientX, e.clientY), hd = e.target.closest && e.target.closest(".bxh"), inBox = e.target.closest && e.target.closest(".bx");
      op = hd && S.box ? { k: "rs", h: hd.dataset.h, b0: { ...S.box } } : inBox && S.box ? { k: "mv", f0: f, b0: { ...S.box } } : { k: "new", f0: f }; });
    boxl.addEventListener("pointermove", e => { if (!op || !pts.has(e.pointerId)) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); const f = toF(e.clientX, e.clientY);
      if (op.k === "pinch") { const [p, q] = [...pts.values()]; if (q) S.box = norm(toF(p.x, p.y), toF(q.x, q.y)); }
      else if (op.k === "new") { if (!op.moved && Math.abs(f.x - op.f0.x) + Math.abs(f.y - op.f0.y) < 0.03) return; op.moved = true; S.box = norm(op.f0, f); }
      else if (op.k === "mv") { const b = op.b0; op.moved = true; S.box = { ...b, x: clamp(b.x + f.x - op.f0.x, 0, 1 - b.w), y: clamp(b.y + f.y - op.f0.y, 0, 1 - b.h) }; }
      else if (op.k === "rs") { const b = op.b0; op.moved = true; S.box = op.h === "h0" ? norm(f, { x: b.x + b.w, y: b.y + b.h }) : norm({ x: b.x, y: b.y }, f); }
      drawBoxes(); chips(); });
    const pup = e => { pts.delete(e.pointerId); if (!op || pts.size) return;
      if (op.k === "new" && !op.moved) { const w = 0.34, hh = 0.2; S.box = { x: clamp(op.f0.x - w / 2, 0, 1 - w), y: clamp(op.f0.y - hh / 2, 0, 1 - hh), w, h: hh }; }   // a tap drops a box there
      if (S.box) { if (S.box.w < 0.06) S.box.w = Math.min(0.06, 1 - S.box.x); if (S.box.h < 0.04) S.box.h = Math.min(0.04, 1 - S.box.y); S.boxT = vid.currentTime; }
      op = null; drawBoxes(); chips(); say(S.box ? "Box set. Drag it, or its corners, to fix it. Then type your note." : "Drag on the picture to draw a box."); };
    boxl.addEventListener("pointerup", pup); boxl.addEventListener("pointercancel", pup);
  }
  if (mB) mB.onclick = () => { S.boxMode = !S.boxMode; if (S.boxMode) { vid.pause(); try { const r = player.getBoundingClientRect(); if (r.top < 130 || r.bottom > innerHeight - 90) player.scrollIntoView({ block: "center", behavior: "smooth" }); } catch {} say(S.box ? "Drag the box, or its corners, to fix it." : "Draw a box to point at the spot. Two fingers can pinch it open."); }
    else say(S.box ? "Box set. Type your note, then tap Add." : (S.sel ? ADJ : HINT)); drawBoxes(); chips(); };
  vid.addEventListener("seeked", () => { try { drawBoxes(); } catch {} });
  vid.addEventListener("loadedmetadata", () => { try { drawSel(); drawBoxes(); } catch {} });
  if (!window.__notes2Rs) { window.__notes2Rs = 1; addEventListener("resize", () => { try { window.__notes2 && window.__notes2.drawBoxes(); } catch {} }); }
  const tick = () => { if (S.selLive && S.sel) { const t = vid.currentTime, a = S.selAnchor; S.sel = { t0: Math.min(a, t), t1: Math.max(a, t) }; drawSel(); } drawBoxes(); };
  drawSel(); drawBoxes(); chips(); if (S.boxMode) say(S.box ? "Drag the box, or its corners, to fix it." : "Draw a box to point at the spot. Two fingers can pinch it open."); else if (S.sel) say(ADJ);
  const api = { drawSel, tick, drawBoxes, chips }; window.__notes2 = api; return api;
}
function bindKebab(r) {
  const k = $("#kebab"); if (!k) return;
  k.onclick = () => {
    sheet(`<div class="menu"><button id="m_add">Add videos to this edit<small>Clips, photos or a voiceover. I ask you where they go.</small></button>
      <button id="m_chat">Ask about this reel<small>Opens your chat with Lumi.</small></button>
      <button id="m_close" style="text-align:center;font-weight:600">Close</button></div>`);
    $("#m_add").onclick = () => openAdd(r.id);
    $("#m_chat").onclick = () => { closeSheet(); S.chatReel = { id: r.id, at: Date.now() }; S.reel = null; go("msgs"); };   // appfix A20 2026-10-03: the next message names this reel
    $("#m_close").onclick = closeSheet;
  };
}

/* ---------- messages ---------- */
// [M5 Max MBP] 2026-09-30 inboxhumans: Approve / Ask for changes under a ready notice go away once that reel is approved
// [M5 Max MBP] 2026-10-01 (client-app QA, chat): app reel ids contain colons (app:<client>:<ts>), so parsing the id with [^:]+ found no reel and hid
// Approve / Ask for changes on every app reel. The server puts the reel on the button itself (app_chat.post_notices): read b.reel first.
function chatBtnParse(b) { const id = String((b && b.id) || ""), k = (id.match(/^(approve|review):/) || [])[1]; if (!k) return null;
  const rest = id.slice(k.length + 1); let reel = b.reel, v = null;
  if (k === "approve") { const i = rest.lastIndexOf(":"); if (!reel) reel = i >= 0 ? rest.slice(0, i) : rest; const vs = i >= 0 ? rest.slice(i + 1) : ""; v = /^\d+$/.test(vs) ? Number(vs) : null; }
  else if (!reel) reel = rest;
  return { kind: k, reel: reel, v: v }; }
function chatBtnsStale(m) { const p = chatBtnParse((m.buttons || [])[0]); if (!p) return false; const rr = reelById(p.reel); return !rr || rr.status === "done" || rr.approved; }
/* REPLY TO A MESSAGE + ANSWER IN CHAT. [M5 Max MBP] 2026-10-05 replyto, Nick (Telegram 08:21): "when I click 'Answer in chat,' it should take
   me to the actual message and highlight that message so I can reply directly to that message ... hold down on a message or click a button
   next to the message and hit reply". The Mac gives every message a stable id and each Needs-you reel its ask (progress.ask = {id, text}).
   Answer in Chat opens Chat, scrolls to that message, pulses it, keeps a marker on it until it is answered, and attaches the reply to it.
   Any Lumi message: long-press (phone) or the small reply arrow (hover / tap) quotes it above the box; the send carries reply_to.
   Progress lines (m.progress) are one per reel: a newer one on the same reel replaces the older, and a run of them shares one bubble. */
function askOf(r) { const p = r && r.progress; return p && p.needs_you && p.ask && p.ask.id && r.status !== "done" ? p.ask : null; }
function pendingAsks() { const o = {}; ((S.data || {}).reels || []).forEach(r => { const a = askOf(r); if (a) o[a.id] = { reel: r.id, ask: a, r }; }); return o; }
function askAnswered(id) { return !!((S.answered || {})[id]) || ((S.data || {}).messages || []).some(m => m.who === "you" && m.reply_to && m.reply_to.id === id); }
function openAsk(rid) {
  const r = rid ? reelById(rid) : null, a = askOf(r);
  if (rid) S.chatReel = { id: rid, at: Date.now() };
  if (a) { S.chatFocus = { mid: a.id, reel: rid, at: Date.now(), scroll: true }; S.replyTo = { id: a.id, quote: String(a.text || "").slice(0, 200), reel: rid }; }
  S.reel = null; go("msgs");
}
function chatVisible(ms) {
  // a progress line is hidden when a newer progress line on the same reel follows with nothing else on that reel (and no client message) between
  const out = [];
  ms.forEach((m, i) => {
    if (!(m.progress && m.who !== "you")) { out.push(m); return; }
    let sup = false;
    for (let j = i + 1; j < ms.length; j++) { const n = ms[j]; if (n.who === "you") break; if (n.reel !== m.reel) continue; if (n.progress) sup = true; break; }
    if (!sup) out.push(m);
  });
  return out;
}
function mQuote(t) { t = String(t || "").replace(/\s+/g, " ").trim(); return t.length > 140 ? t.slice(0, 137) + "..." : t; }
function setReply(m, reel) { if (!m || !m.id) return; S.replyTo = { id: m.id, quote: String(m.text || "").slice(0, 200), reel: reel || m.reel || null }; render(); refocus("#mtext"); }
window.lumiFocusAsk = function () {
  const f = S.chatFocus; if (!f || !f.scroll || S.view !== "msgs") return false;
  const el = document.querySelector(`#main .mrow[data-mid="${CSS.escape(f.mid)}"]`); if (!el) return false;
  el.scrollIntoView({ block: "center", behavior: "auto" }); return true;
};
/* PHOTOS IN THE AI CHAT. [M5 Max MBP] 2026-10-10 chatphoto, Nick (Telegram 08:28): "allow clients within the app to upload photos that aren't
   necessarily attached to a reel ... upload it in AI chat and be able to ask questions". The photo button sits next to the box on every
   account. Each photo is shrunk on the phone (long side 2048 px, JPEG; HEIC from the iPhone library decodes in Safari), uploaded at once to
   api/photo (our Blob, this account's own folder) and shown as a thumbnail above the box; Send carries the URLs with the message (text is
   optional). Lumi answers about the photo and can send it back with the spots marked, asking "Is this what you meant?". */
const CHATIMG_MAX = 4, CHATIMG_RAW_MAX = 30 * 1024 * 1024;
function chatImgs() { return S.chatImgs || (S.chatImgs = []); }
async function shrinkPhoto(file) {
  let src = null, url = null;
  try { src = await createImageBitmap(file, { imageOrientation: "from-image" }); } catch { src = null; }
  if (!src) { url = URL.createObjectURL(file); src = await new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => no(new Error("decode")); im.src = url; }); }
  try {
    const W0 = src.width || src.naturalWidth, H0 = src.height || src.naturalHeight; if (!W0 || !H0) throw new Error("decode");
    for (const [side, q] of [[2048, 0.86], [1600, 0.8], [1280, 0.75]]) {
      const f = Math.min(1, side / Math.max(W0, H0)), w = Math.round(W0 * f), h = Math.round(H0 * f);
      const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, w, h); x.drawImage(src, 0, 0, w, h);
      const data = c.toDataURL("image/jpeg", q);
      if (data.length < 3.6 * 1024 * 1024 || side === 1280) return { data, w, h };
    }
  } finally { if (url) URL.revokeObjectURL(url); try { src && src.close && src.close(); } catch {} }
}
async function addChatPhotos(files) {
  const L = chatImgs(); const list = [...(files || [])].filter(Boolean);
  if (!list.length) return;
  if (L.length + list.length > CHATIMG_MAX) toast("Up to " + CHATIMG_MAX + " photos in one message.");
  for (const f of list.slice(0, Math.max(0, CHATIMG_MAX - L.length))) {
    const it = { id: Math.random().toString(36).slice(2, 9), busy: true, thumb: "", url: "", w: 0, h: 0 };
    if (f.size > CHATIMG_RAW_MAX) { toast("That photo is too big. A screenshot works best."); continue; }
    if (f.type && !/^image\//.test(f.type)) { toast("Only photos and screenshots can go in here."); continue; }
    L.push(it); drawChatStrip();
    try {
      const p = await shrinkPhoto(f); it.thumb = p.data; it.w = p.w; it.h = p.h; drawChatStrip();
      const r = await fetch("/api/photo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ k: K, data: p.data, w: p.w, h: p.h }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok || !j.url) throw new Error(j.error || "Upload failed. Please try again.");
      it.url = j.url; it.busy = false;
    } catch (e) {
      S.chatImgs = chatImgs().filter(x => x !== it);
      toast(e && e.message === "decode" ? "That photo could not be opened here. Try a screenshot or a JPG." : (e && e.message) || "Upload failed. Please try again.");
    }
    drawChatStrip();
  }
}
function chatStripHtml() {
  const L = chatImgs(); if (!L.length) return "";
  return `<div class="phstrip" id="phstrip">${L.map(i => `<div class="pht${i.busy ? " busy" : ""}" data-pid="${esc(i.id)}">${i.thumb ? `<img src="${esc(i.thumb)}" alt="Your photo">` : ""}${i.busy ? `<span class="phsp" aria-label="Uploading"></span>` : ""}<button type="button" class="phx" data-px="${esc(i.id)}" aria-label="Remove photo">×</button></div>`).join("")}</div>`;
}
function drawChatStrip() {
  const c = document.querySelector("#dock .compose"); if (!c) return;
  const old = c.querySelector("#phstrip"), h = chatStripHtml();
  if (old) { if (h) old.outerHTML = h; else old.remove(); } else if (h) c.insertAdjacentHTML("afterbegin", h);
  bindChatStrip(); try { window.lumiFitVV && window.lumiFitVV(); } catch {}
}
function bindChatStrip() {
  document.querySelectorAll("#phstrip [data-px]").forEach(b => (b.onmousedown = e => e.preventDefault(), b.onclick = e => { e.preventDefault(); S.chatImgs = chatImgs().filter(x => x.id !== b.dataset.px); drawChatStrip(); }));
}
function msgImgsHtml(m, you) {
  const all = (m.images || []).filter(im => im && /^https:\/\//.test(String(im.url || "")));
  if (!you && all.some(im => im.small)) return `<div class="pvrow">${all.slice(0, 12).map(im => `<a href="${esc(im.url)}" target="_blank" rel="noopener"><img src="${esc(im.url)}" alt="${esc(im.label || "Preview")}" loading="lazy"><span>${esc(im.label || "Preview")}</span></a>`).join("")}</div>`;   // PREVIEW50
  const ims = all.slice(0, 4); if (!ims.length) return "";
  if (you || ims.length === 1) return `<div class="mimgs${ims.length === 1 ? " one" : ""}">${ims.map(im => `<a href="${esc(im.url)}" target="_blank" rel="noopener"><img src="${esc(im.url)}" alt="${esc(im.label || (you ? "Your photo" : "Photo from Lumi"))}" loading="lazy"></a>`).join("")}${!you && ims[0].label ? `<span class="mimcap">${esc(ims[0].label)}</span>` : ""}</div>`;
  return `<div class="cogrid">${ims.map(im => `<a href="${esc(im.url)}" target="_blank" rel="noopener"><img src="${esc(im.url)}" alt="${esc(im.label || "")}" loading="lazy"><span>${esc(im.label || "")}</span></a>`).join("")}</div>`;
}
function renderMsgs() {
  const ms0 = (S.data.messages || []).slice();
  // a Needs-you ask that is not in the loaded messages still shows, at its own time
  { const pa = pendingAsks(); Object.keys(pa).forEach(id => { if (!ms0.some(m => m.id === id)) ms0.push({ who: "lumi", at: pa[id].ask.at || 0, text: pa[id].ask.text || "", id, reel: pa[id].reel, app: true }); }); ms0.sort((a, b) => (a.at || 0) - (b.at || 0)); }
  const ms = chatVisible(ms0), asks = pendingAsks(), F = S.chatFocus && Date.now() - S.chatFocus.at < 30 * 60000 ? S.chatFocus : null;
  let h = `<div class="chatv"><div class="chatdeco" aria-hidden="true"><i>✦</i><i>✦</i><i>✦</i><i>✦</i><i>✦</i></div><div class="chathead"><img src="/lumi/head.png" alt=""><h1>Chat with Lumi</h1></div><p class="sub">${S.data.channel === "app" ? "Your editor is on the other side of this. Ask anything about your reel." : "Everything we have said to each other. We answer here and by email, same conversation."}</p>`;
  const live = (S.data.reels || []).find(showsProgress);
  if (S.data.channel === "app" && live) h += progressCard(live);
  if (!ms.length) h += empty("No messages yet", "Say hi below.");
  else {
    h += '<div class="thread">';
    const lastYou = Math.max(-1, ...ms.map((m, i) => m.who === "you" ? i : -1));
    const RB = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7L4 12l5 5"/><path d="M4 12h10a6 6 0 0 1 6 6v1"/></svg>';
    ms.forEach((m, i) => {
      const you = m.who === "you", prev = ms[i - 1], nxt = ms[i + 1];
      // a run of progress lines shares one bubble (never several in a row)
      if (!you && m.progress && prev && prev.who !== "you" && prev.progress) return;
      let body = linkify(m.text), at = m.at, rid = m.id;
      if (!you && m.progress && nxt && nxt.who !== "you" && nxt.progress) {
        const run = []; for (let j = i; j < ms.length && ms[j].who !== "you" && ms[j].progress; j++) run.push(ms[j]);
        body = run.map(x => `<span class="pline">${linkify(x.text)}</span>`).join(""); at = run[run.length - 1].at; rid = run[run.length - 1].id;
      }
      const ak = !you && m.id && asks[m.id] && !askAnswered(m.id), foc = !you && F && m.id === F.mid;
      const q = you && m.reply_to && (m.reply_to.quote || m.reply_to.id) ? `<span class="rq">${esc(mQuote(m.reply_to.quote || ((ms0.find(x => x.id === m.reply_to.id) || {}).text) || "Lumi's message"))}</span>` : "";
      h += `<div class="mrow ${you ? "you" : "lumi"}${ak ? " ask" : ""}${foc && F.scroll ? " focus" : ""}"${rid ? ` data-mid="${esc(rid)}"` : ""}>${you ? "" : `<img class="av" src="/lumi/head.png" alt="">`}<div class="msg ${m.who}${m.progress && !you ? " prog" : ""}">${ak ? `<span class="asktag">Lumi needs your answer</span>` : ""}${q}${!you && m.kind === "upload" ? `<div class="got"><img src="/lumi/got.webp" alt=""><span class="bub ok" style="font-size:12px;font-weight:800;color:var(--green)">✓ Saved</span></div>` : ""}${(m.images || []).length && (you || m.images.length === 1) && !m.images.some(i => i && i.small) ? msgImgsHtml(m, you) : ""}${body}${!you && ((m.images || []).length > 1 || (m.images || []).some(i => i && i.small)) ? msgImgsHtml(m, false) : ""}<span class="when">${you ? "You" : "Lumi"} · ${when(at)}</span></div>${you ? `<span class="av me ini" aria-hidden="true" style="background:${myAvatar().color}">${esc(myAvatar().ini)}</span>` : (rid ? `<button class="rbtn" type="button" data-reply="${esc(rid)}" aria-label="Reply to this message">${RB}</button>` : "")}</div>`;
      // buttons only on Lumi's NEWEST message, and only until the client has answered (typing always allowed)
      if (m.who !== "you" && (m.buttons || []).length && i > lastYou && i === ms.length - 1 && !chatBtnsStale(m) && !m.progress)
        h += `<div class="btns">${m.buttons.map((b, j) => { const rr = b.reel && String(b.id).startsWith("reel:") ? reelById(b.reel) : null; const th = rr ? posterOf(rr) : "";
          return `<button data-bi="${j}">${th ? `<img src="${esc(th)}" alt="">` : ""}${esc(rr ? reelLabel(rr) : b.label)}${rr && ST[rr.status] ? `<small>${esc(ST[rr.status][0])}</small>` : ""}</button>`; }).join("")}</div>`;
    });
    // [M5 Max MBP] 2026-09-28 15:4x PDT (app test 3): a typing bubble while Lumi's answer is on its way (the "Got it" nod vanishes after a second)
    if (lumiAwaiting()) h += `<div class="mrow lumi" id="ltyping"><img class="av" src="/lumi/head.png" alt=""><div class="msg lumi ltyping" aria-label="Lumi is typing"><i></i><i></i><i></i></div></div>`;
    h += "</div>";
  }
  h += "</div>";
  $("#main").innerHTML = h; bindAdd();
  const lastMsg = ms[ms.length - 1];
  document.querySelectorAll(".btns [data-bi]").forEach(el => el.onclick = async () => {
    const b = lastMsg.buttons[Number(el.dataset.bi)];
    // [M5 Max MBP] 2026-09-30 21:05 PDT (inboxhumans agent): a "ready" notice in Chat carries Approve / Ask for changes. They open the reel
    // and use its own Approve sheet and change notes (the same approve intent and comments as the Reels screen), never a chat "choice".
    { const pp = chatBtnParse(b); if (pp) { const rr = reelById(pp.reel); if (!rr) { toast("That reel is not on this account any more."); return; }
      // [M5 Max MBP] 2026-10-01 06:51 PDT qafix: Approve on an OLDER version did nothing (Approve is only on the newest). It opens the reel on
      // the newest version and says why. Ask for changes lands on the note box instead of the top of the page.
      const vsN = rr.versions || [], newest = vsN.length ? vsN[vsN.length - 1].v : null;
      if (pp.kind === "approve" && pp.v != null && newest != null && pp.v < newest) { go("home", { reel: rr.id, ver: newest }); setTimeout(() => toast("v" + newest + " is newer. Watch it, then approve it here."), 120); return; }
      go("home", { reel: rr.id, ver: pp.kind === "approve" ? pp.v : (pp.v || newest) });
      if (pp.kind === "approve") setTimeout(() => { const a = $("#approve"); if (a) a.click(); }, 80);
      else setTimeout(() => { const c = $("#ctext") || $("#ctextra"); if (c) { c.scrollIntoView({ behavior: "smooth", block: "center" }); } }, 120);
      return; } }
    document.querySelectorAll(".btns button").forEach(x => x.disabled = true);
    if (await send({ kind: "choice", choice: b.id, reel: b.reel || lastMsg.reel || "", text: b.label })) {
      const m = { who: "you", at: Date.now() / 1000, text: b.label }; S.data.messages.push(m); store("sentmsgs", [...fetchStore("sentmsgs", []), m].slice(-20)); render(); lumiNod("Got it");
    } else document.querySelectorAll(".btns button").forEach(x => x.disabled = false);
  });
  const RT = S.replyTo && S.replyTo.id ? S.replyTo : null;
  dock(`<div class="compose">${RT ? `<div class="rpv" role="status"><div class="rpt"><b>${asks[RT.id] && !askAnswered(RT.id) ? "Answering Lumi" : "Replying to Lumi"}</b><span>${esc(mQuote(RT.quote))}</span></div><button type="button" id="rpx" aria-label="Cancel reply">×</button></div>` : ""}${unsentMarksLine()}${chatStripHtml()}<div class="in"><input type="file" id="mphotoin" accept="image/*,.heic,.heif" multiple hidden><button class="clip pho" id="mphoto" type="button" aria-label="Add a photo or screenshot"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="15" rx="3"/><circle cx="9" cy="10.5" r="1.8"/><path d="M21 16l-5.2-5.2L7 19.6"/></svg></button>${S.data.channel === "app" ? `<button class="clip" id="mclip" aria-label="Add clips or a voiceover"><svg viewBox="0 0 24 24"><path d="M21 11.5l-8.6 8.6a5.5 5.5 0 0 1-7.8-7.8l8.6-8.6a3.7 3.7 0 0 1 5.2 5.2l-8.6 8.6a1.8 1.8 0 0 1-2.6-2.6l7.9-7.9"/></svg></button>` : ""}<input type="text" id="mtext" maxlength="12000" placeholder="${RT ? "Type your answer" : "Message Lumi"}"><button class="btn primary send" id="msend" aria-label="Send"><svg viewBox="0 0 24 24"><path d="M21 3L10 14"/><path d="M21 3l-7 18-4-7-7-4z"/></svg></button></div></div>`, "has-compose");
  const mc = $("#mclip"); if (mc) mc.onclick = () => openAdd(null);
  { const pb = $("#mphoto"), pi = $("#mphotoin"); if (pb && pi) { pb.onclick = () => { if (chatImgs().length >= CHATIMG_MAX) { toast("Up to " + CHATIMG_MAX + " photos in one message."); return; } pi.value = ""; pi.click(); };
      pi.onchange = () => { const fs = [...(pi.files || [])]; pi.value = ""; addChatPhotos(fs); }; } bindChatStrip(); }   // chatphoto 2026-10-10
  // [M5 Max MBP] 2026-09-29 sweep50: the upload pill names the reel it measures, and only shows where the client can add files (app channel)
  // [M5 Max MBP] 2026-10-01 07:26 PDT qa2fix #10: the "<0.1 of 5 GB uploaded for reel 001" pill is no longer shown in Chat (it stays in Add to a reel, where uploads are managed)
  { const mt = $("#mtext"); if (mt) mt.oninput = () => { if (mt.value.length >= 12000) toast("That is the longest one message can be. Send it, then keep going in a new one."); }; }
  if (!(F && F.scroll && window.lumiFocusAsk())) setPageY(1e7);   // [M5 Max MBP] 2026-09-30 (chat layout agent): the chat list scrolls, not the window. replyto: Answer in Chat lands on the ask
  if (F && F.scroll && !F.timer) F.timer = setTimeout(() => { if (S.chatFocus === F) { F.scroll = false; document.querySelectorAll("#main .mrow.focus").forEach(x => x.classList.remove("focus")); } }, 2600);
  { const x = $("#rpx"); if (x) { x.onmousedown = x.onpointerdown = e => e.preventDefault();   // keep the box focused: a blur moves the dock and the tap would miss
      x.onclick = () => { const f = document.activeElement && document.activeElement.id === "mtext"; S.replyTo = null; render(); if (f) refocus("#mtext"); }; } }
  // reply: the arrow (hover on a computer, tap the bubble on a phone shows it) or a long-press on the bubble
  document.querySelectorAll("#main .rbtn[data-reply]").forEach(b => (b.onmousedown = e => e.preventDefault(), b.onclick = e => { e.preventDefault(); e.stopPropagation(); const m = ms0.find(x => x.id === b.dataset.reply) || ms.find(x => x.id === b.dataset.reply); if (m) setReply(m); }));
  document.querySelectorAll("#main .mrow.lumi[data-mid] .msg").forEach(el => {
    const row = el.closest(".mrow"), mid = row.dataset.mid; let t = null, sx = 0, sy = 0, fired = false;
    const stop = () => { if (t) { clearTimeout(t); t = null; } el.classList.remove("press"); };
    el.addEventListener("pointerdown", e => { if (e.pointerType === "mouse" || e.target.closest("a,button")) return; fired = false; sx = e.clientX; sy = e.clientY; el.classList.add("press");
      t = setTimeout(() => { t = null; fired = true; el.classList.remove("press"); try { navigator.vibrate && navigator.vibrate(12); } catch {} const m = ms0.find(x => x.id === mid); if (m) setReply(m); }, 480); });
    el.addEventListener("pointermove", e => { if (t && (Math.abs(e.clientX - sx) > 10 || Math.abs(e.clientY - sy) > 10)) stop(); });
    ["pointerup", "pointercancel", "pointerleave"].forEach(k => el.addEventListener(k, stop));
    el.addEventListener("contextmenu", e => { if (fired || t) e.preventDefault(); });
    el.addEventListener("click", e => { if (fired) { e.preventDefault(); return; } if (e.target.closest("a,button")) return; document.querySelectorAll("#main .mrow.showr").forEach(x => { if (x !== row) x.classList.remove("showr"); }); row.classList.toggle("showr"); });
  });
  // [M5 Max MBP] 2026-09-29 sweep: one send at a time. A double tap (or Enter then tap) used to POST the same message twice.
  const go2 = async () => { const inp = $("#mtext"), t = inp.value.trim(), L = chatImgs();   // chatphoto 2026-10-10: photos ride with the message, text optional
    if (L.some(i => i.busy)) { toast("Your photo is still uploading. One moment."); return; }
    const imgs = L.filter(i => i.url).map(i => ({ url: i.url, w: i.w, h: i.h }));
    if ((!t && !imgs.length) || S.msgSending) return; S.msgSending = true; const sb = $("#msend"); if (sb) sb.disabled = true; inp.value = ""; const hadF = document.activeElement === inp || window.__sendTapFocus; window.__sendTapFocus = false;
    // appfix A20 2026-10-03: a chat opened from a reel ("Ask about this reel") sends that reel with the next message (within 30 min)
    const rt = S.replyTo && S.replyTo.id ? S.replyTo : null;     // replyto 2026-10-05: the answer goes with the message it answers, on that message's reel
    // [M5 Max MBP] 2026-10-23 06:47 PDT W3-G hole 32 / V1 (Victoria 10-22 15:38 "I added the 3 spots with time marks": the marks sat in S.pending, only the
    // chat line reached the Mac). Every drafted time mark rides with the message as notes[] (reel + version per mark); the message lands on
    // that reel when the marks are all on one reel; the marks clear only once the server took them, and the bubble says how many went.
    const marks = unsentMarks(), markReels = [...new Set(marks.map(m => m.reel))];
    const cr = rt && rt.reel ? rt.reel : S.chatReel && Date.now() - S.chatReel.at < 30 * 60000 ? S.chatReel.id : markReels.length === 1 ? markReels[0] : null;
    let ok = false; try { ok = await send({ kind: "message", text: t, ...(imgs.length ? { images: imgs } : {}), ...(cr ? { reel: cr } : {}), ...(marks.length ? { notes: marks } : {}), ...(rt ? { reply_to: { id: rt.id, quote: String(rt.quote || "").slice(0, 200) } } : {}) }); } catch {} if (ok && cr) S.chatReel = null; S.msgSending = false; if (sb && sb.isConnected) sb.disabled = false;
    if (!ok) { if (inp.isConnected && !inp.value) inp.value = t; return; }
    if (marks.length) { marks.forEach(m => { delete S.pending[m.reel + ":" + m.version]; }); store("pending", S.pending); toast("Sent with " + marks.length + " time mark" + (marks.length === 1 ? "" : "s") + "."); }
    if (rt) { S.replyTo = null; (S.answered = S.answered || {})[rt.id] = Date.now(); if (S.chatFocus && S.chatFocus.mid === rt.id) S.chatFocus = null; }
    if (imgs.length) S.chatImgs = [];
    { const m = { who: "you", at: Date.now() / 1000, text: t + (marks.length ? " (+ " + marks.length + " time mark" + (marks.length === 1 ? "" : "s") + ")" : ""), ...(imgs.length ? { images: imgs } : {}), ...(rt ? { reply_to: { id: rt.id, quote: String(rt.quote || "").slice(0, 200) } } : {}) }; S.data.messages.push(m); store("sentmsgs", [...fetchStore("sentmsgs", []), m].slice(-20)); render(); if (hadF && S.view === "msgs") refocus("#mtext"); lumiNod("Got it"); } };   // [M5 Max MBP] 2026-10-01 07:26 PDT qa2fix #10: the box keeps focus after a send
  $("#msend").onclick = go2; $("#mtext").onkeydown = e => { if (e.key === "Enter") go2(); };
}

/* ---------- pay ---------- */
function renderPay() {
  // [M5 Max MBP] 2026-09-29 sweep50: works without a price object ($20 / $60 / 10, same fallback as the reel page), the monthly card always
  // has a way forward, and the Rewards count left takes the reels already shown as covered into account.
  const d = S.data, pr = Object.assign({ reel: 20, monthly: 60, monthly_reels: 10 }, d.price || {}); const due = (d.reels || []).filter(owes);   // [M5 Max MBP] 2026-10-01 07:26 PDT qa2fix #8: only reels with a delivered version
  let h = `<h1>Pay.</h1><p class="sub">Apple Pay and cards. Per reel, you will be billed upon completion of your reel. ${revLine()}</p>`;
  if (isComped(d)) {   // audit 2026-10-07: a comped account sees no prices and no Start monthly
    h = `<h1>Pay.</h1><div class="card"><div class="eyebrow">Your account</div><h3 style="font-size:19px;margin-top:4px">Your reels are on us</h3><p class="muted" style="margin:6px 0 0">Nothing to pay, ever. ${revLine()}</p></div>`;
    $("#main").innerHTML = h; return;
  }
  if (due.length) { h += `<div class="notice"><span class="dot"></span><div><b>${due.length === 1 ? "One reel" : due.length + " reels"} ready to pay for.</b></div></div>`; for (const r of due) h += `<div class="card"><div class="eyebrow">This reel</div><h3 style="font-size:19px;margin-top:4px">${esc(reelLabel(r))}</h3><div class="price">$${esc(pr.reel)}</div><a class="btn primary block paybtn" href="${esc(r.pay)}" target="_blank" rel="noopener">Pay $${esc(pr.reel)}</a></div>`; }
  for (const r of (d.reels || []).filter(r => pf194(r))) h += `<div class="card pf194" data-pf194="${esc(r.id)}"><div class="eyebrow">Pay to start your edit</div><h3 style="font-size:19px;margin-top:4px">${esc(reelLabel(r))}</h3><p class="muted" style="margin:6px 0 0">${esc(String(pf194(r).line || PF194_LINE))} ${esc(String(pf194(r).sub || PF194_SUB))}</p>${pf194Btn(r, "block")}</div>`;   // PAYFIRST194
  for (const r of (d.reels || []).filter(r => r.pay_gift)) h += `<div class="card"><div class="eyebrow">Covered by your gift</div><h3 style="font-size:19px;margin-top:4px">${esc(reelLabel(r))}</h3><p class="muted" style="margin:6px 0 0">This reel is one of your free gift reels. Nothing to pay.</p></div>`;
  for (const r of (d.reels || []).filter(r => r.pay_covered)) h += `<div class="card"><div class="eyebrow">Covered by Rewards</div><h3 style="font-size:19px;margin-top:4px">${esc(reelLabel(r))}</h3><p class="muted" style="margin:6px 0 0">This reel is one of your free Rewards reels. Nothing to pay.</p></div>`;
  for (const r of (d.reels || []).filter(r => r.pay_pending)) h += `<div class="card"><div class="eyebrow">This reel</div><h3 style="font-size:19px;margin-top:4px">${esc(reelLabel(r))}</h3><p class="muted" style="margin:6px 0 0">Your payment link is on its way. It shows here as soon as it is ready.</p></div>`;
  if (!due.length && !(d.reels || []).some(r => r.pay_covered || r.pay_pending || r.pay_gift || pf194(r))) h += `<div class="card"><div class="eyebrow">Right now</div><h3 style="font-size:19px;margin-top:4px">Nothing due</h3><p class="muted" style="margin:6px 0 0">When a reel needs paying for, it shows here with one tap.</p></div>`;
  // [M5 Max MBP] 2026-10-02 17:36 PDT paylater: every reel and its pay state. A reel still being made that will cost $20 says so: the pay link comes with the finished reel.
  let reelsList50 = "";   // CONV50 [M5 Max MBP] 2026-10-29: the per-reel stamp list now sits UNDER the plans (it pushed Start monthly below the fold)
  { const ls = (d.reels || []).filter(r => r.pay_state && r.status !== "cancelled");
    if (ls.length) reelsList50 += `<h2>Your reels</h2><div class="card paylist">${ls.map(r => `<div class="row"><span class="nm">${esc(reelLabel(r))}</span>${payStamp(r)}</div>`).join("")}${ls.some(r => r.pay_state.key === "needs_pay" && !(r.versions || []).length && !pf194(r)) ? `<p class="muted" style="margin:10px 0 0;font-size:13px">Nothing is charged before your reel is made. Its pay link comes with the finished reel.</p>` : ""}</div>`; }
  const left = rwLeft();
  h += `<h2>Plans</h2>
    <div class="card"><div class="eyebrow">Monthly</div><div class="price">$${esc(pr.monthly)}<small>/ month</small></div><p class="muted" style="margin:0 0 14px">Up to ${esc(pr.monthly_reels)} reels a month${Number(pr.monthly) > 0 && Number(pr.monthly_reels) > 0 ? ` (about $${esc(String(Math.round(Number(pr.monthly) / Number(pr.monthly_reels))))} a reel)` : ""}, billed monthly through Stripe. Cancel any time. The monthly plan is for one person per account. Agencies: <a href="/agencies">lumiedits.app/agencies</a></p>${pr.monthly_link && payUrlOk(pr.monthly_link) ? `<a class="btn primary block paybtn" href="${esc(pr.monthly_link)}" target="_blank" rel="noopener">Start monthly</a>` : `<button class="btn line block" id="monthlyask" type="button">Ask about monthly in Chat</button>`}</div>
    <div class="card"><div class="eyebrow">Per reel</div><div class="price">$${esc(pr.reel)}<small>/ reel</small></div><p class="muted" style="margin:0">${(() => { const g = (S.data || {}).gift; /* [M5 Max MBP] 2026-10-01 (client-app QA, pay): a gift from Nick (gifts.py, e.g. 3 free reels) was never read here */
      return g && g.free_reels ? `${esc(g.headline || ("A gift from " + (g.from || "Nick") + ": " + g.free_reels + " free reels"))}. ${g.left > 0 ? g.left + " of them left, no watermark. " : ""}After that, $${esc(pr.reel)} per reel, billed when your reel is done.`
        : `You will be billed upon completion of your reel. $${esc(pr.reel)} per reel after your free one.`; })()}${filmLine(d) ? " " + esc(filmLine(d)) : ""}${left > 0 ? ` You also have ${left} free Rewards reel${left === 1 ? "" : "s"} left.` : ""}</p></div>`;
  h += reelsList50;
  $("#main").innerHTML = h; bindPayOnce(); funnel50("funnel50_pay_view");
  { const ma = $("#monthlyask"); if (ma) ma.onclick = () => { go("msgs"); setTimeout(() => { const t = $("#mtext"); if (t && !t.value) { t.value = "I would like the monthly plan."; t.focus(); } }, 150); }; }
}
// [M5 Max MBP] 2026-10-01 07:26 PDT qa2fix #1: a pay button opens one checkout tab per tap, never two on a double tap
function bindPayOnce(root = document) { root.querySelectorAll("a.paybtn, .wmpay a, a.rowbtn[href*='/pay/'], a.rowbtn[href*='stripe.com']").forEach(a => { payPrefill50(a); a.addEventListener("click", e => { if (!tapOk("pay:" + a.href, 2500)) { e.preventDefault(); return; } funnel50(/fZu28r59y9BGaE0aHY83C09|monthly/i.test(a.href + " " + a.textContent) ? "funnel50_tap_monthly" : "funnel50_tap_reel", 0); }); }); }
// CONV50 [M5 Max MBP] 2026-10-29: Stripe checkout opened from the app asks for the email again; every abandoned checkout (43 of 48) stopped before
// paying. ?prefilled_email= (Stripe payment links; our /pay/ redirect keeps the query) fills in the account's own email, so a monthly plan also
// lands on the address the Mac matches subscribers by. Only Stripe / our pay redirect, only when the snapshot carries the email.
function payPrefill50(a) { try { const em = (((S.data || {}).account) || {}).email, h = a.getAttribute("href") || "";
  if (!em || !payUrlOk(h) || /[?&]prefilled_email=/.test(h)) return; a.setAttribute("href", h + (h.includes("?") ? "&" : "?") + "prefilled_email=" + encodeURIComponent(em)); } catch {} }
// CONV50: a link to our own Pay tab (the post-approval offer in Chat says "Pay in your Lumi app: https://lumiedits.app/#pay") opens the Pay tab
// right here instead of a second copy of the app in a new tab.
document.addEventListener("click", e => { const a = e.target && e.target.closest ? e.target.closest("a[href]") : null; if (!a) return;
  const h = a.getAttribute("href") || ""; if (!/^(https:\/\/(www\.)?lumiedits\.app)?\/?#pay$/i.test(h) || !S.data) return;
  e.preventDefault(); e.stopPropagation(); funnel50("funnel50_chat_offer_tap", 0); go("pay"); }, true);
// CONV50: funnel marks (Pay opened, pay button tapped, referral shared). A quiet "notice" intent the Mac logs (app_intents.log), at most once a day per mark
// per phone (gap 0 = every tap). No job, no message, nothing shown.
function funnel50(id, gapMs = 864e5) { try { const o = fetchStore("funnel50", {}) || {}; if (gapMs && Date.now() - (Number(o[id]) || 0) < gapMs) return; o[id] = Date.now(); store("funnel50", o); if (K) sendQuiet({ kind: "notice", choice: id }); } catch {} }
// Rewards reels still free: the server's count, less any reel the app already shows as covered that the server has not counted as used yet
function rwLeft() { const rw = (S.data || {}).rewards || {}, c = rw.credits || {}; if (rw.status !== "approved") return 0;
  const covered = ((S.data || {}).reels || []).filter(r => r.pay_covered).length, left = Number(c.left) || 0, granted = Number(c.granted) || left, used = Number(c.used) || 0;
  return Math.max(0, Math.min(left, granted - Math.max(used, covered))); }

/* ---------- send ---------- */
// [M5 Max MBP] 2026-10-03 appfix A28: background posts (read receipts) never toast; true when the server took it
// G-7 [M5 Max MBP] 2026-10-13 (doc 4 3.4.3): every send carries one idempotency key per tap + the intent schema version (1)
const idemKey = () => "a" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
async function sendQuiet(payload) {
  try { const r = await fetch("/api/intent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ k: K, schema: 1, idem: idemKey(), ...payload }) }); const j = await r.json(); return !!j.ok; } catch { return false; }
}
async function flushInboxRead() {
  if (S.inboxFlushing) return; S.inboxFlushing = true;
  try {
    const b = fetchStore("inboxbase_q", 0); if (b && await sendQuiet({ kind: "inbox_read", text: "base", choice: String(b) })) store("inboxbase_q", 0);
    for (const id of fetchStore("inboxreadq", [])) { if (!(await sendQuiet({ kind: "inbox_read", text: id }))) break;
      store("inboxreadq", fetchStore("inboxreadq", []).filter(x => x !== id)); }
  } finally { S.inboxFlushing = false; }
}
// [M5 Max MBP] 2026-10-23 06:47 PDT W3-G hole 32 / V1: drafted time marks (S.pending["<reel>:<version>"], what Request changes would send) as one flat list
// with reel + version on each mark, and the one-line notice the chat composer shows while any are unsent. Approve keeps its own warning sheet.
function unsentMarks() { const out = [], P = S.pending || {}; Object.keys(P).forEach(k => { const i = k.lastIndexOf(":"); if (i < 0) return; const reel = k.slice(0, i), version = Number(k.slice(i + 1)) || null;
  (Array.isArray(P[k]) ? P[k] : []).forEach(c => { if (c && String(c.text || "").trim()) out.push({ ...c, reel, version }); }); }); return out; }
function unsentMarksLine() { const m = unsentMarks(); if (!m.length) return ""; const reels = [...new Set(m.map(x => x.reel))];
  const nm = reels.length === 1 ? reelLabel(((S.data || {}).reels || []).find(r => r.id === reels[0]) || { id: reels[0] }) : reels.length + " reels";
  return `<div class="unsentm" role="status"><b>${m.length} time mark${m.length === 1 ? "" : "s"} not sent yet (${esc(nm)}).</b> They go with your next message here, or open the reel and tap Request changes.</div>`; }
async function send(payload) {
  try {
    const r = await fetch("/api/intent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ k: K, schema: 1, idem: idemKey(), ...payload }) });
    const j = await r.json(); if (!j.ok) { toast(j.error || "Could not send"); return false; } return true;
  } catch { toast("Could not send. Try again in a moment."); return false; }
}
document.querySelectorAll("#tabs button").forEach(b => b.onclick = () => { S.reel = null; S.reelFrom = null; if (b.dataset.v === "new") { S.sent = false; S.step = 0; } go(b.dataset.v); });   // newreel: step 0 = resume where they were
$("#home").onclick = e => { e.preventDefault(); S.reel = null; go("home"); };
S.pending = fetchStore("pending", {});
// deep links: #start, #looks, #new, #new2 (a step), #msgs, #pay. The email can send someone straight to the styles or a new reel.
(() => { const m = (location.hash || "").replace("#", "").match(/^(start|looks|new|msgs|chat|team|inbox|pay)(\d)?$/); if (m) { S.view = m[1] === "chat" ? "msgs" : m[1]; if (m[2]) S.step = Number(m[2]); if (m[1] === "new") S.nfAskBoot = true; } })();   // BETHFIX81   // [M5 Max MBP] 2026-10-01 07:26 PDT qa2fix #10: #chat = #msgs
// [M5 Max MBP] 2026-09-29 sweep50: an app-version reload puts the client back on the screen they were on (it always landed on Home)
(() => { try { const r = JSON.parse(sessionStorage.getItem("lumi_resume") || "null"); sessionStorage.removeItem("lumi_resume");
  if (r && Date.now() - r.at < 120000 && /^(home|start|looks|new|msgs|team|inbox|pay)$/.test(r.view || "")) { S.view = r.view; S.reel = r.reel || null; S.ver = r.ver || null; S.step = Number(r.step) || 1; S.mail = r.mail || null; } } catch {} })();
// RESUME50 [M5 Max MBP] 2026-10-29: iOS often kills a backgrounded tab. Coming back to an unfinished New reel (title, clips or picks in the
// draft, not sent) opens it again at the saved step and page, with every pick, instead of Home (where the title pop-up asked again).
(() => { try { if (location.hash || S.view !== "home") return; const w = fetchStore("where", null), dr = fetchStore("draft", {}) || {};
  const live = String(dr.title || "").trim() || dr.uploaded || (dr.batches || []).length || (dr.p122 && dr.p122.path);
  if (w && w.view === "new" && Date.now() - (Number(w.at) || 0) < 24 * 3600000 && live) { S.view = "new"; S.step = 0; S.nfAskBoot = true; } } catch {} })();   // BETHFIX81: asks Continue or Start new
load();
if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
// ALWAYS THE LATEST VERSION. [M5 Max MBP] 2026-09-28 19:1x, Nick: "we need to send out this link and it always needs to be up to date".
// A phone keeps an open (or home-screen) app on the version it loaded. On open, on return to the screen and every 3 min, ask the
// server for the page's ETag; when it changed, reload at a safe moment (nothing typed, no sheet open, no video playing).
(function lumiFreshness() {
  let base = null, pending = false;
  const tag = async () => { try { const r = await fetch("/", { method: "HEAD", cache: "no-store" }); return r.headers.get("etag") || r.headers.get("last-modified"); } catch { return null; } };
  // [M5 Max MBP] 2026-09-29 sweep50: text typed but not sent (chat, team reply, a timecoded note, sign in fields) blocks the reload even when
  // the field has lost focus (the old check only looked at the focused field, so a blurred chat draft was wiped). Fields the app saves as
  // a draft on every keystroke (brief notes, overall note, links) do not block it. After the reload the client lands on the same screen.
  const UNSAVED = ["mtext", "ttext", "ctext", "em", "cd", "fn", "ln", "ph"];
  const safe = () => { const a = document.activeElement; const typing = a && /INPUT|TEXTAREA/.test(a.tagName) && a.value;
    const unsent = UNSAVED.some(id => { const el = document.getElementById(id); return el && el.value && el.value.trim(); });
    const sheet = document.getElementById("sheet")?.classList.contains("on"); const playing = [...document.querySelectorAll("video")].some(v => !v.paused);
    const busy = document.getElementById("coach") || document.getElementById("celebrate") || document.querySelector(".revpop");
    // RESUME50 [M5 Max MBP] 2026-10-29: never inside New reel and never while a clip uploads (a reload kills the upload queue: Nick's 10 clip
    // batch stopped at 3 of 10 after an app switch). The new version loads at the next safe moment.
    const inFlow = typeof S !== "undefined" && (S.view === "new" || ((S.up && S.up.items) || []).some(x => x.state === "up" || x.state === "wait"));
    return !typing && !unsent && !sheet && !playing && !busy && !inFlow; };
  window.lumiSafeReload = safe;
  const reload = () => { try { if (typeof S !== "undefined" && S.data) sessionStorage.setItem("lumi_resume", JSON.stringify({ at: Date.now(), view: S.view, reel: S.reel || null, ver: S.ver || null, step: S.step || 1, mail: S.mail || null })); } catch {} location.reload(); };
  const check = async () => { const t = await tag(); if (!t) return; if (base === null) { base = t; return; }
    if (t !== base) pending = true; if (pending && safe()) reload(); };
  check(); setInterval(check, 180000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) check(); });
  window.addEventListener("pageshow", e => { if (e.persisted) check(); });
})();
// live preview swapper while a reel page is open (the page itself does not reload there) [M5 Max MBP 2026-09-25]
setInterval(async () => {
  const el = document.getElementById("lpv"); if (!el || document.hidden || K.length !== 24) return;
  try { const d = await (await meFetch()).json(); const r = (d.reels || []).find(x => x.id === S.reel);
    if (r && r.live_preview && String(r.live_preview.at) !== el.dataset.at) { el.src = r.live_preview.url; el.dataset.at = r.live_preview.at; el.play && el.play().catch(() => {}); } } catch {}
}, 20000);
// CHAT POLLING. [M5 Max MBP] 2026-09-27 17:49 PDT (audit E1): the old setInterval read S.data before it had loaded, so it was always 45 s.
// Now it re-schedules itself: every 2 s (was 4 s, CHATSPEED50 2026-10-26) while a reply is on its way (the Mac says chat_pending, or your last message has no answer yet),
// 15 s otherwise. What you are typing is kept across a refresh.
function lumiAwaiting() {
  // [M5 Max MBP] 2026-09-29 sweep: Lumi is only "typing" while the client's message is the newest one. A stale chat_pending flag used to
  // show the dots under Lumi's own reply (and kept polling at 4 s).
  const d = S.data || {}; const ms = d.messages || []; const last = ms[ms.length - 1];
  if (!last || last.who !== "you") return false;
  if (d.chat_quiet && (last.at || 0) <= d.chat_quiet) return false;   // [M5 Max MBP] 2026-10-07 needsanswer: Lumi chose not to reply to a bare "ok"
  if (d.chat_pending) return true;
  return Date.now() / 1000 - last.at < 600;
}
(function lumiPoll() {
  setTimeout(async () => {
    try {
      // [M5 Max MBP] 2026-09-28 07:3x PDT, Nick: "the dialog box to add the code never pops up" and "the app keeps auto
      // refreshing every 5 seconds and makes me lose progress". This loop called load() on a timer no matter what:
      // signed out, load() redrew the EMAIL screen over the code screen seconds after it appeared; signed in, it
      // redrew the whole page every 4 to 15 s even when nothing had changed. Now: never while signed out, and only
      // redraw when /api/me actually changed, never under an open sheet, and keep the scroll position.
      const sheetOpen = document.getElementById("sheet")?.classList.contains("on");
      if (K.length === 24 && !document.hidden && !sheetOpen && S.view !== "new" && !(S.view === "home" && S.reel)) {
        let r = null; try { r = await meFetch(); } catch { r = null; }
        const t = r && r.ok ? await r.text() : null;
        // [M5 Max MBP] 2026-09-29 sweep50: two failed refreshes in a row (offline, 500s) put up the "showing what we had" banner
        if (!t) { window.__netFails = (window.__netFails || 0) + 1; if (window.__netFails >= 2 && S.data) netState(false, navigator.onLine === false ? "You are offline. Showing what we had." : undefined); }
        else if (window.__netFails || document.getElementById("netbanner")) netState(true);
        // [M5 Max MBP] 2026-09-29 sweep50: the checks above ran BEFORE the awaited fetch. A sheet opened (or a reel/new reel opened) while it
        // was in flight got closed by the redraw a second after the tap. Look again now; S._lastMe is left as is so the next poll retries.
        const busyNow = document.getElementById("sheet")?.classList.contains("on") || S.view === "new" || (S.view === "home" && S.reel) || document.getElementById("coach") || document.querySelector(".revpop");
        if (t && t !== S._lastMe && !busyNow) {
          const inp = document.getElementById("mtext") || document.getElementById("ttext"), iid = inp ? inp.id : "", val = inp ? inp.value : "", foc = inp && document.activeElement === inp;
          const y = pageY(), stick = window.lumiJump ? lumiJump.stick() : false;   // [M5 Max MBP] 2026-09-30 (chat layout agent): pageY/setPageY read the chat list in Chat   // [M5 Max MBP] 2026-09-28 21:05 PDT (pull-refresh agent): at the bottom of a chat, stay at the bottom when new messages land
          window.__lumiQuiet = true;   // [M5 Max MBP] 2026-09-28 14:2x: a background update must not replay the fade-in, which read as "the app keeps refreshing"
          try { await load(); } finally { setTimeout(() => { window.__lumiQuiet = false; }, 0); }
          setPageY(stick ? 1e7 : y);
          const inp2 = iid && document.getElementById(iid); if (inp2 && val) { inp2.value = val; if (foc) inp2.focus(); }
        }
      }
    } catch {}
    lumiPoll();
  }, lumiAwaiting() ? 2000 : 15000);   // [M5 Max MBP] 2026-10-26 CHATSPEED50: 2 s while Lumi's answer is on its way (was 4 s)
})();
// [M5 Max MBP] 2026-09-29 sweep50: with the keyboard up on a phone only ~50px of the chat showed (tab bar + upload pill stayed docked above
// the input). While the chat or team reply box is focused on a touch phone (or a short viewport), html.kbd hides them.
(function lumiKbd() {
  const upd = () => { const a = document.activeElement, inC = !!(a && (a.id === "mtext" || a.id === "ttext"));
    const vh = window.visualViewport ? visualViewport.height : innerHeight, phone = matchMedia("(hover: none) and (pointer: coarse)").matches;
    document.documentElement.classList.toggle("kbd", inC && (phone || vh < 520));
    // [M5 Max MBP] 2026-10-07 notesedit: typing a timecoded note (new or being edited) on a phone, the tab bar and the Request changes bar step aside so the box stays visible above the keyboard
    const inN = !!(a && (a.id === "ctext" || a.id === "nedit"));
    document.documentElement.classList.toggle("kbdnote", inN && (phone || vh < 520)); };
  window.lumiKbdUpd = upd;   // [M5 Max MBP] 2026-10-01 07:26 PDT qa2fix newclient B: render() calls this after every redraw
  document.addEventListener("focusin", upd); document.addEventListener("focusout", () => setTimeout(upd, 60));
  // tapping Send keeps the focus (and the keyboard) in the box, so the bar does not jump out from under the finger mid tap
  document.addEventListener("mousedown", e => { if (e.target.closest && e.target.closest("#msend, #tsend, #mphoto, #mclip, #rpx, #jumpnew, #tback, .compose button, .teamtop button") && document.documentElement.classList.contains("kbd")) e.preventDefault(); }, true);   // QAFLOW50 2026-10-28: keyboard up, the photo / clip / back taps no longer miss (layout shifted ~64px on focusout before the click)
  // [M5 Max MBP] 2026-10-07 notesedit: same for Add / Save / Delete / Cancel / Move while a note box is focused, so the tab bar and the Request
  // changes bar do not come back under the finger mid tap (QA: the bar reappeared over Add and the tap was lost)
  document.addEventListener("mousedown", e => { if (e.target.closest && e.target.closest("#addc, #nsave, #ndel, #ncancel, #nmove") && document.documentElement.classList.contains("kbdnote")) e.preventDefault(); }, true);
  // [M5 Max MBP] 2026-10-01 07:26 PDT qa2fix #10: remember that the box had focus when Send was touched (a tap on the button can blur it first), so the send can put it back
  const mark = e => { const a = document.activeElement; window.__sendTapFocus = !!(e.target.closest && e.target.closest("#msend, #tsend") && a && (a.id === "mtext" || a.id === "ttext")); };
  document.addEventListener("pointerdown", mark, true); document.addEventListener("touchstart", mark, { capture: true, passive: true });
  addEventListener("resize", upd); if (window.visualViewport) visualViewport.addEventListener("resize", upd);
})();
// [M5 Max MBP] 2026-10-11 18:5x PDT kbdone. Nick, Telegram 18:56: "On the final page, step 4, I couldn't figure out how to get rid of the
// keyboard ... I could only see the Lumi screen in a small portion." Every text box outside the two chat bars (which keep their own Send
// behaviour) now has four ways out: a Done pill pinned to the top of the visible area (the part above the keyboard), a tap outside the box,
// Return on a one-line box (enterkeyhint "done"), and a swipe down on the page. The focused box is scrolled into the visible area
// (visualViewport) so it and the bottom action button stay in sight; the app shell is already sized to visualViewport (lumiVV below).
(function lumiKbdDone() {
  const isChatBox = el => !!(el && (el.id === "mtext" || el.id === "ttext"));
  const isField = el => !!(el && (el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && !/^(checkbox|radio|file|button|submit|range|color|hidden)$/i.test(el.type || "")) || el.isContentEditable));
  const active = () => { const a = document.activeElement; return isField(a) && !isChatBox(a) ? a : null; };
  const pill = document.createElement("button"); pill.id = "kbdone"; pill.type = "button"; pill.textContent = "Done"; pill.setAttribute("aria-label", "Close the keyboard");
  pill.style.cssText = "position:fixed;right:12px;top:calc(var(--vvt,0px) + 10px);z-index:2147483000;display:none;padding:9px 18px;border-radius:99px;border:0;font:700 15px/1 inherit;background:var(--ink,#12142b);color:var(--bg,#fff);box-shadow:0 6px 18px rgba(0,0,0,.25)";
  document.body.appendChild(pill);
  const dismiss = () => { const a = active(); if (a) a.blur(); pill.style.display = "none"; };
  window.lumiKbdDismiss = dismiss;
  pill.addEventListener("pointerdown", e => e.preventDefault());   // keep focus until the tap lands, then close
  pill.addEventListener("click", e => { e.preventDefault(); dismiss(); });
  const show = () => { const a = active(); pill.style.display = a ? "block" : "none";
    if (a) { if (a.tagName === "INPUT" && !a.getAttribute("enterkeyhint")) a.setAttribute("enterkeyhint", "done");
      [80, 350, 700].forEach(ms => setTimeout(() => { if (document.activeElement !== a) return; try { const vv = window.visualViewport, r = a.getBoundingClientRect(), top = vv ? vv.offsetTop : 0, h = vv ? vv.height : innerHeight;
        if (r.top < top + 56 || r.bottom > top + h - 90) a.scrollIntoView({ block: "center" }); } catch {} }, ms)); } };
  document.addEventListener("focusin", show); document.addEventListener("focusout", () => setTimeout(show, 80));
  // Return on a one-line box closes the keyboard (a box with its own Enter action, e.g. the title's Next, already ran it)
  document.addEventListener("keydown", e => { const a = active(); if (a && e.key === "Enter" && a.tagName === "INPUT") setTimeout(() => { if (document.activeElement === a) a.blur(); }, 0); });
  // a tap on empty space (not a text box, button or link, so a tap on Start editing is never moved by the keyboard closing under it) closes the keyboard
  const outside = e => { const a = active(); if (!a) return; const t = e.target; if (t === pill || (t.closest && t.closest("input, textarea, select, label, [contenteditable], #kbdone, button, a, .opt, .nfchips"))) return; a.blur(); };
  document.addEventListener("touchstart", outside, { capture: true, passive: true }); document.addEventListener("mousedown", outside, true);
  // a swipe down on the page closes it
  let y0 = null; document.addEventListener("touchstart", e => { y0 = active() && e.touches && e.touches[0] ? e.touches[0].clientY : null; }, { passive: true });
  document.addEventListener("touchmove", e => { if (y0 == null || !e.touches || !e.touches[0]) return; if (e.touches[0].clientY - y0 > 45) { y0 = null; dismiss(); } }, { passive: true });
  if (window.visualViewport) visualViewport.addEventListener("resize", show);
})();
// [M5 Max MBP] 2026-09-30 (chat layout agent): sizes the Chat / Team app shell to the VISUAL viewport (the part above the keyboard on
// iOS). --vvh = its height, --vvt = how far iOS panned it down. The body is fixed there, so the typing bar (an ordinary row at the bottom of
// the body) always sits on the keyboard, or on the tab bar when the keyboard is down. Reading the newest message when the keyboard opens
// or closes: the list stays pinned to the bottom.
(function lumiVV() {
  const R = document.documentElement, vv = window.visualViewport; let lastH = 0;
  // [M5 Max MBP] 2026-10-08 19:4x PDT chatjump, Nick TG 19:31 "when they click on the chat, the entire screen goes upward and half the screen is
  // blank": iOS often reports the keyboard-open visualViewport height for a while after the keyboard closes and sends no further resize, so the
  // body stayed pinned at the keyboard height (tab bar at ~58%, blank lavender band below). With no text box focused there is no keyboard:
  // use the full layout height (innerHeight does not shrink for the keyboard), and re-measure a few times while the keyboard animates away.
  const typing = () => { const a = document.activeElement; return !!(a && (a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))); };
  function fit() {
    // [M5 Max MBP] 2026-10-10 footerfix: the shell (body pinned to the visible area, #main scrolls, tab bar a plain row) is on for EVERY view, so this sizes it
    // always; only the stick-to-newest-message behaviour stays Chat/Team only.
    const kb = typing(), h = vv ? (kb ? vv.height : Math.max(vv.height, innerHeight)) : innerHeight, t = vv && kb ? Math.max(0, vv.offsetTop) : 0, on = true, chat = R.classList.contains("chatlay");
    const s = chat ? document.getElementById("main") : null, stick = !!s && s.scrollHeight - s.clientHeight - s.scrollTop < 140;
    R.style.setProperty("--vvh", Math.round(h) + "px"); R.style.setProperty("--vvt", on ? Math.round(t) + "px" : "0px");
    if (window.scrollY) window.scrollTo(0, 0);
    if (stick && Math.abs(h - lastH) > 1) s.scrollTop = s.scrollHeight;
    lastH = h;
  }
  window.lumiFitVV = fit;
  if (vv) { vv.addEventListener("resize", fit); vv.addEventListener("scroll", fit); }
  addEventListener("resize", fit); addEventListener("orientationchange", () => setTimeout(fit, 300));
  addEventListener("scroll", () => { if (window.scrollY) fit(); }, { passive: true });   // [M5 Max MBP] 2026-10-10 footerfix: iOS scrolled the window on its own (keyboard, focus): snap it back
  const settle = () => [120, 350, 700, 1200].forEach(ms => setTimeout(fit, ms));
  document.addEventListener("focusin", () => setTimeout(fit, 50)); document.addEventListener("focusout", settle);
  if (vv) vv.addEventListener("resize", () => setTimeout(fit, 400));
  addEventListener("pageshow", settle); document.addEventListener("visibilitychange", () => { if (!document.hidden) settle(); });
  fit();
})();
// LIVE PRESENCE. [M5 Max MBP] 2026-09-29 14:45 PDT, Nick: "live monitor who is using their app at any given time, on the board".
// While this page is visible and signed in: one tiny heartbeat (screen + open reel) on open, on return to the screen, then at most
// once every 60 s. Never while hidden or signed out. The last send time is kept per device, so a reload cannot beat the 1 per minute cap.
// Fire and forget: it never touches S, never redraws, never blocks a tap.
(function lumiPresence() {
  const GAP = 60000, LK = "lumi_presence_at";
  const last = () => { try { return Number(localStorage.getItem(LK)) || 0; } catch { return window.__lumiPresAt || 0; } };
  const beat = () => {
    try {
      if (document.hidden || K.length !== 24 || !S.data) return;
      const now = Date.now(); if (now - last() < GAP) return;
      try { localStorage.setItem(LK, String(now)); } catch {} window.__lumiPresAt = now;
      const body = JSON.stringify({ k: K, view: S.reel && S.view === "home" ? "reel" : S.view, reel: S.view === "home" && S.reel ? S.reel : "" });
      fetch("/api/presence", { method: "POST", keepalive: true, headers: { "content-type": "application/json" }, body }).catch(() => {});
    } catch {}
  };
  setTimeout(beat, 1500);                       // on open (after the first /api/me has landed)
  setInterval(beat, 10000);                     // checks every 10 s, sends only when 60 s have passed
  document.addEventListener("visibilitychange", () => { if (!document.hidden) beat(); });
  window.addEventListener("pageshow", beat);
})();
// HANDOFF178 [M5 Max MBP] 2026-11-05 7:58 PM PST. Nick: when he scans the Mac app's QR, the Mac must know THIS phone is connected, mirror the upload while it runs,
// and confirm the brief came across. Only when this phone opened from that QR (HO178.t): small hand-off notes to /api/presence (field "hand"),
// which writes c/<k>/hand/<ms>-<token>.json for /api/me to hand back to the Mac. open = signed in and here; here = still here (every 20 s
// while visible); up = per-file names, sizes, percent, state (at most every 3 s while bytes move, at once on a state change); sent = the brief
// went (title, reel, batch ids). Fire and forget, never blocks a tap, never redraws. Stops 2 minutes after the brief is sent.
function ho178Files() { const u = upState(); return u.items.slice(-25).map(x => ({ n: String(x.name || "").slice(-60), sz: x.size || 0, p: x.state === "done" ? 100 : x.size ? Math.min(99, Math.floor((x.sent || 0) / x.size * 100)) : 0,
  st: x.state, m: String(x.msg || "").slice(0, 60), r: String(x.reel || "").slice(0, 80), b: String(x.batch || "").slice(0, 24) })); }
function ho178Send(st, extra) {
  if (!HO178.t || K.length !== 24) return;
  if (HO178.sentAt && st !== "sent" && Date.now() - HO178.sentAt > 120000) return;
  if (st === "sent") { HO178.sentAt = Date.now(); HO178.sentInfo = Object.assign({ sent: 1 }, extra || {}); }
  if (HO178.busy) { HO178.again = st === "sent" ? HO178.again : true; if (st !== "sent") return; }
  HO178.busy = true; HO178.last = Date.now();
  const hand = Object.assign({ t: HO178.t, st, files: ho178Files() }, HO178.sentInfo || {}, extra || {});   // a later note still says the brief went
  fetch("/api/presence", { method: "POST", keepalive: true, headers: { "content-type": "application/json" }, body: JSON.stringify({ k: K, view: S.view === "new" ? "new" : "home", hand }) })
    .then(r => r.json()).then(j => { if (j && j.ok && st === "open" && !HO178.opened) { HO178.opened = true; toast("Connected to Lumi on your Mac"); } }).catch(() => {})
    .finally(() => { HO178.busy = false; if (HO178.again) { HO178.again = false; setTimeout(() => ho178Up(true), 400); } });
}
function ho178Up(now) { if (!HO178.t || !upState().items.length) return; if (!now && Date.now() - HO178.last < 3000) return; ho178Send("up"); }
(function ho178Beat() {
  if (!HO178.t) return;
  const tick = () => { try { if (document.hidden || K.length !== 24 || !S.data) return;
    if (!HO178.opened && Date.now() - HO178.last > 5000) return ho178Send("open");
    if (Date.now() - HO178.last > 20000) ho178Send(upState().items.some(x => x.state === "up" || x.state === "wait") ? "up" : "here"); } catch {} };
  setTimeout(tick, 1200); setInterval(tick, 4000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { HO178.last = 0; tick(); } });
})();
// ENGAGE115 [M5 Max MBP] 2026-11-01 4:0x PM PST, Nick TG 3:55 PM: "I want to be able to see ... Have they viewed it? Have they even opened the
// app? ... Did they download it? Did they save it?" Fire-and-forget engagement events to /api/ev (one tiny blob each, read only by the Mac:
// board Delivered sheet + the 24 h auto chase). app_open once per load, reel_open once per reel+version per load, play at most once per
// reel+version per 5 min (again after a full watch), p25/p50/p100 once per play, download / share when the file is ready. Never blocks a tap.
(function lumiEngage115() {
  const sent = {}, lastPlay = {};
  const e115 = (ev, o) => {
    try {
      if (K.length !== 24 || !S.data) return;
      o = o || {}; const id = ev + "|" + (o.reel || "") + "|" + (o.v == null ? "" : o.v) + (o.tag ? "|" + o.tag : "");
      if (o.once !== false && sent[id]) return; sent[id] = 1;
      const body = JSON.stringify({ k: K, ev, reel: o.reel || "", v: o.v == null ? 0 : o.v, pct: o.pct || 0, sec: o.sec || 0, dur: o.dur || 0 });
      fetch("/api/ev", { method: "POST", keepalive: true, headers: { "content-type": "application/json" }, body }).catch(() => {});
    } catch {}
  };
  e115.bindVid = (vid, reel, v) => {
    try {
      if (!vid || vid.__e115 === reel + ":" + v) return; vid.__e115 = reel + ":" + v;
      let sess = 0, watched = 0, lastT = null; const pk = reel + ":" + v;
      vid.addEventListener("play", () => {
        if (vid.__priming) return;                                   // SCRUB50's muted prime is not a play
        const now = Date.now(); if (lastPlay[pk] && now - lastPlay[pk] < 300000 && !vid.__e115done) return;
        lastPlay[pk] = now; vid.__e115done = false; sess = now; watched = 0;
        e115("play", { reel, v, tag: String(sess), dur: vid.duration || 0 });
      });
      vid.addEventListener("timeupdate", () => {
        if (vid.paused || vid.__priming || vid.seeking || !sess) { lastT = vid.currentTime; return; }
        const t = vid.currentTime, d = vid.duration || 0; if (lastT != null && t > lastT && t - lastT < 1.6) watched += t - lastT; lastT = t;
        if (!(d > 0)) return; const f = t / d;
        for (const [m, cut] of [["p25", .25], ["p50", .5], ["p100", .97]]) if (f >= cut) e115(m, { reel, v, tag: String(sess), pct: Math.round(f * 100), sec: watched, dur: d });
        if (f >= .97) vid.__e115done = true;
      });
    } catch {}
  };
  window.e115 = e115;
  [2500, 8000, 20000, 60000].forEach(t => setTimeout(() => e115("app_open"), t));   // after /api/me has landed (S.data set) or a sign-in; sent once
})();
