
/* First-time experience v2 [M5 Max MBP] 2026-09-26. Nick: "I wish the animations were a bit smoother." Everything below moves with
   transform + opacity only, driven by CSS transitions (compositor) and one requestAnimationFrame loop for the confetti canvas.
   Order per tour step: smooth-scroll if needed -> spotlight glides (450 ms) -> on transitionend the bubble slides + fades in.
   Runs once, only on the phone that created the account (lumi_newacct) and never again (api/tour + localStorage). Replay in the
   account sheet. Reduced motion: instant, no confetti. */
(() => {
  const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ls = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch { return null; } };
  const dark = () => document.documentElement.dataset.appearance === "dark";
  const STEPS = [
    ['.tabs button[data-v="new"]', "Start a new reel", "Tap here to send a video. Pick a look, tell me anything you want, and I edit it for you."],
    ['.tabs button[data-v="looks"]', "Caption styles", "Every look we make, playing. Tap one to see it big, then choose it for your next reel."],
    ['.tabs button[data-v="home"]', "Your reels", "Finished reels land here, numbered 001, 002 and on, so we always know which one we mean."],
    ['.tabs button[data-v="msgs"]', "Chat with Lumi", "Ask for changes any time. The paperclip adds clips or a voiceover to a reel."],
    ['#hinbox', "Your Inbox", "Messages from the real people on the Lumi team. When a reel is ready, I tell you in Chat."],
    ["#themetog", "Light or dark", "Switch between light and dark here. Dark mode brings out my cool twin."],
    ['.tabs button[data-v="pay"]', "Pay", "Nothing is charged before you have seen your reel. Your first one is on us."]];
  // [M5 Max MBP] 2026-09-29 sweep50: a client who already has reels (or used the free one) gets copy that fits them on a replay
  const veteran = () => { const d = S.data || {}; return !!(d.free_used || (d.reels || []).length || (d.account || {}).returning); };
  // [M5 Max MBP] 2026-10-01 07:26 PDT qa2fix #8: a gift client hears about the gift, never "your first one is on us"
  const stepText = st => { if (st[1] !== "Pay") return st[2]; const gf = typeof giftOf === "function" ? giftOf(S.data) : null;
    if (gf && gf.left > 0) return "Nothing is charged before you have seen your reel. " + gf.head + ", " + gf.left + " of them left.";
    return gf || veteran() ? "Nothing is charged before you have seen your reel. Pay for a reel, or start the monthly plan, right here." : st[2]; };
  const ART = () => dark() ? ["/lumi/boy/welcome.webp", "/lumi/boy/head.png"] : ["/lumi/welcome.webp", "/lumi/head.png"];
  const preload = () => Promise.all(ART().map(u => { const i = new Image(); i.src = u; return (i.decode ? i.decode() : Promise.resolve()).catch(() => {}); }));
  const once = (el, ms) => new Promise(r => { let d = false; const f = e => { if (e && e.target !== el) return; if (d) return; d = true; el.removeEventListener("transitionend", f); r(); }; el.addEventListener("transitionend", f); setTimeout(f, ms); });   // safety net only

  // ---- confetti: one canvas, one rAF loop, real physics (gravity, drag, spin, wobble), fades out ----
  const Confetti = (() => {
    let cv, cx, parts = [], raf = 0, last = 0;
    const C = ["#6aa6ff", "#8fb4ff", "#a98bf5", "#c9b6ff", "#ff9fc0", "#ffd36e", "#7fe0b5", "#ffffff"];
    function ensure() {
      if (cv) return; cv = document.createElement("canvas"); cv.className = "confetti-cv"; document.body.appendChild(cv);
      const dpr = Math.min(2, devicePixelRatio || 1); cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; cx = cv.getContext("2d"); cx.scale(dpr, dpr);
      cx.clearRect(0, 0, innerWidth, innerHeight);   // pre-warm: context + first paint happen before anything flies
    }
    function frame(t) {
      const dt = Math.min(0.033, (t - (last || t)) / 1000); last = t;
      cx.clearRect(0, 0, innerWidth, innerHeight);
      parts = parts.filter(p => p.life > 0);
      for (const p of parts) {
        p.vx *= Math.pow(0.35, dt); p.vy = p.vy * Math.pow(0.55, dt) + 900 * dt;      // drag + gravity (px/s^2)
        p.x += (p.vx + Math.sin(p.w += p.ws * dt) * 40) * dt; p.y += p.vy * dt; p.r += p.rs * dt; p.life -= dt;
        const a = Math.min(1, p.life / 0.6);                                            // fade the last 0.6 s
        cx.save(); cx.globalAlpha = a; cx.translate(p.x, p.y); cx.rotate(p.r); cx.scale(1, Math.cos(p.w * 1.7));   // wobble flip
        cx.fillStyle = p.c; if (p.round) { cx.beginPath(); cx.arc(0, 0, p.s * 0.45, 0, 6.283); cx.fill(); } else cx.fillRect(-p.s / 2, -p.s * 0.3, p.s, p.s * 0.6);
        cx.restore();
      }
      raf = parts.length ? requestAnimationFrame(frame) : 0;
      if (!raf) { cx.clearRect(0, 0, innerWidth, innerHeight); cv.style.opacity = "0"; }
    }
    return {
      warm: ensure,
      burst(x, y, n = 120, power = 1) {
        if (RM) return; ensure(); cv.style.opacity = "1";
        for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.25, v = (520 + Math.random() * 520) * power;
          parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: Math.random() * 6, rs: (Math.random() - 0.5) * 12, w: Math.random() * 6, ws: 4 + Math.random() * 6,
                       s: 6 + Math.random() * 6, c: C[i % C.length], round: i % 4 === 0, life: 1.6 + Math.random() * 1.0 }); }
        if (!raf) { last = 0; raf = requestAnimationFrame(frame); }
      }
    };
  })();

  const markSeen = () => { ls("lumi_tour_done_" + K, "1"); try { fetch("/api/tour", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ k: K }) }); } catch {} };

  async function celebrate() {
    await preload(); Confetti.warm();
    const first = ((S.data && S.data.name) || "").split(" ")[0];
    const o = document.createElement("div"); o.id = "celebrate"; o.className = "celebrate";
    o.innerHTML = `<div class="cin"><img class="clumi st" style="--d:0ms" src="${ART()[0]}" alt=""><h1 class="st" style="--d:90ms">Welcome to Lumi${first && first !== "there" ? `, <i>${esc(first)}!</i>` : "!"}</h1>
      <p class="sub st" style="--d:170ms">Your account is ready. Let me show you around, it takes 20 seconds.</p><div class="st" style="--d:250ms"><button class="btn primary block" id="tourgo">Show me around</button>
      <button class="linkbtn" id="tourskip" type="button">Skip for now</button></div></div>`;
    document.body.appendChild(o);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      o.classList.add("on");
      const r = o.querySelector(".clumi").getBoundingClientRect(); setTimeout(() => Confetti.burst(r.left + r.width / 2, r.top + r.height * 0.45, 120), RM ? 0 : 260);
    }));
    const close = async () => { o.classList.remove("on"); o.classList.add("off"); await once(o, 400); o.remove(); };
    o.querySelector("#tourgo").onclick = async () => { await close(); tour(); };
    o.querySelector("#tourskip").onclick = close;
  }

  async function tour() {
    if (document.getElementById("coach") || window.__tourStarting) return;   // [M5 Max MBP] 2026-09-29 sweep50: one tour at a time (a double tap on Replay stacked two)
    window.__tourStarting = true; try { await preload(); } finally { window.__tourStarting = false; }
    if (document.getElementById("coach")) return;
    let i = 0, busy = false;
    const c = document.createElement("div"); c.id = "coach"; c.className = "coach";
    c.innerHTML = `<div class="spot"></div><div class="bub"><div class="bh"><img src="${ART()[1]}" alt=""><b></b></div><p></p>
      <div class="bf"><span class="dots">${STEPS.map(() => "<i></i>").join("")}</span><button class="linkbtn cskip" type="button">Skip</button><button class="btn primary sm cnext" type="button">Next</button></div></div>`;
    document.body.appendChild(c);
    const spot = c.querySelector(".spot"), bub = c.querySelector(".bub");
    const BASE = 100;                      // the spotlight is a 100x100 box moved and scaled by transform only
    let cur = null;
    const target = () => { const st = STEPS[i]; return st && document.querySelector(st[0]); };
    const spotTo = (r, instant) => {
      // [M5 Max MBP] 2026-09-29 sweep50: the ring is kept 3px inside the screen (on the edge tabs it ran 8px off the side and bottom)
      const pad = 8, m = 3, L = Math.max(m, r.left - pad), T = Math.max(m, r.top - pad), R = Math.min(innerWidth - m, r.right + pad), B = Math.min(innerHeight - m, r.bottom + pad);
      const w = Math.max(20, R - L), h = Math.max(20, B - T);
      spot.style.transition = instant || RM ? "none" : "";
      spot.style.transform = `translate3d(${L}px,${T}px,0) scale(${w / BASE},${h / BASE})`;
      spot.style.setProperty("--rx", (18 * BASE / w) + "px"); spot.style.setProperty("--ry", (18 * BASE / h) + "px");
      cur = { r, w, h };
    };
    const bubTo = r => {
      const vw = innerWidth, vh = innerHeight, bw = Math.min(330, vw - 32); bub.style.width = bw + "px";
      const bh = bub.offsetHeight || 170, pad = 8;
      const left = Math.max(16, Math.min(vw - bw - 16, r.left + r.width / 2 - bw / 2));
      let top = r.top > vh / 2 ? r.top - pad - bh - 14 : r.bottom + pad + 14; top = Math.max(16, Math.min(vh - bh - 16, top));
      bub.style.setProperty("--x", left + "px"); bub.style.setProperty("--y", top + "px");
    };
    const onMove = () => { const el = target(); if (!el) return; const r = el.getBoundingClientRect(); spotTo(r, true); bubTo(r); };
    async function show(first) {
      if (i >= STEPS.length) return done();
      busy = true; const st = STEPS[i]; const el = target(); if (!el) { i++; return show(); }
      bub.classList.remove("in");                                                   // bubble fades/slides out first
      let r = el.getBoundingClientRect();
      if (r.top < 0 || r.bottom > innerHeight) { el.scrollIntoView({ behavior: RM ? "auto" : "smooth", block: "center" }); await new Promise(res => { let t = 0; const f = () => (++t > 40 ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }); r = el.getBoundingClientRect(); }
      spot.classList.add("moving"); spotTo(r, first);
      c.querySelectorAll(".dots i").forEach((d, j) => d.classList.toggle("on", j === i));
      if (!first && !RM) await once(spot, 600);
      spot.classList.remove("moving");
      bub.querySelector("b").textContent = st[1]; bub.querySelector("p").textContent = stepText(st);
      c.querySelector(".cnext").textContent = i === STEPS.length - 1 ? "Done" : "Next";
      bubTo(r); requestAnimationFrame(() => bub.classList.add("in")); busy = false;
    }
    async function done() {
      bub.classList.remove("in"); c.classList.add("final");
      await once(bub, 300);
      bub.classList.add("donebub");
      bub.innerHTML = `<div class="done"><img src="${ART()[0]}" alt=""><b>You're all set!</b><p>${veteran() ? "Send your next video whenever you are ready." : "Send your first video whenever you are ready."}</p><button class="btn primary block cnext" type="button">Let's go</button></div>`;
      const bw = Math.min(330, innerWidth - 32); bub.style.width = bw + "px";
      bub.style.setProperty("--x", (innerWidth - bw) / 2 + "px"); bub.style.setProperty("--y", Math.max(40, innerHeight / 2 - 170) + "px");
      requestAnimationFrame(() => { bub.classList.add("in"); const r = bub.getBoundingClientRect(); setTimeout(() => Confetti.burst(r.left + r.width / 2, r.top + 70, 70, 0.8), RM ? 0 : 220); });
      bub.querySelector(".cnext").onclick = end;
    }
    const end = async () => { removeEventListener("resize", onMove); removeEventListener("scroll", onMove, true); c.classList.remove("on"); await once(c, 400); c.remove(); markSeen(); };
    c.querySelector(".cnext").onclick = () => { if (busy) return; i++; show(); };
    c.querySelector(".cskip").onclick = end;
    addEventListener("resize", onMove); addEventListener("scroll", onMove, true);
    requestAnimationFrame(() => { c.classList.add("on"); show(true); });
  }
  async function maybe() {
    if (!K || !S.data || document.getElementById("celebrate") || document.getElementById("coach")) return;
    if (ls("lumi_newacct") !== K || ls("lumi_tour_done_" + K)) return;
    ls("lumi_newacct", ""); window.__tourPending = true;   // appfix A21: the welcome card waits while this is decided
    try { const r = await (await fetch("/api/tour?k=" + K, { cache: "no-store" })).json(); if (r.seen) { ls("lumi_tour_done_" + K, "1"); window.__tourPending = false; return; } } catch {}
    markSeen(); celebrate(); window.__tourPending = false;
  }
  window.lumiTour = { start: replay => { if (replay) tour(); else maybe(); }, celebrate };
  new MutationObserver(() => { if (ls("lumi_newacct")) requestAnimationFrame(() => maybe()); }).observe(document.getElementById("main"), { childList: true });
})();
