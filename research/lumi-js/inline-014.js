
/* NOTESTOUR200 [M5 Max MBP] 2026-11-16 (Nick TG 25037): a client who types timecoded notes in the chat ("at 6.7", "0:12") is shown, once,
   a spotlight tour to the place we built for them: their reel's timeline, the Timecode notes box and Request changes. Reuses the first-time
   tour's coach styles. Runs once per account (localStorage + /api/tour k=<key>_notes). */
(() => {
  const ls = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch { return null; } };
  const TC = /\b\d{1,2}:\d{2}(\.\d)?\b|\bat\s+\d{1,3}(\.\d+)?\s*(s|sec|secs|seconds)?\b/i;
  const KEY = () => (typeof K !== "undefined" && K) ? K : null;   // the account key; the API keeps this flag under kind "notes"
  const wants = () => {
    const d = (typeof S !== "undefined" && S.data) || null; if (!d || !KEY() || ls("lumi_notestour_done_" + KEY())) return false;
    // NOTESTOUR200b (Nick TG 25114: "not everyone should be getting that... only the one who types timecode notes in the agent chat"): only a
    // message the client TYPED in the chat counts. Notes sent the right way (Request changes) are echoed into the chat as "Changes on version N:
    // - at 00:10.3 ..." and must never trigger it; neither does Nick's own account.
    if (/priceisrightkidfilm|lumiedits\.app/i.test(String(d.email || d.addr || ""))) return false;
    return (d.messages || []).some(m => m && m.who === "you" && (!m.kind || m.kind === "chat") && typeof m.text === "string" && !/^\s*Changes on version/i.test(m.text)
      && !/\(give or take/i.test(m.text) && TC.test(m.text)) && (d.reels || []).some(r => r && r.status !== "cancelled");
  };
  const markSeen = () => { ls("lumi_notestour_done_" + KEY(), "1"); try { fetch("/api/tour", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ k: KEY(), kind: "notes" }) }); } catch {} };
  const wait = (sel, ms) => new Promise(res => { const t0 = Date.now(); const f = () => { const el = document.querySelector(sel); if (el || Date.now() - t0 > ms) return res(el); requestAnimationFrame(f); }; f(); });
  const STEPS = [
    ["#tl", "1. Pause where you mean", "Play your reel and pause at the exact moment you want changed. You can drag here to get there."],
    ["#ctext", "2. Type your note here", "Write what you want changed. We save the exact timecode with it, so we know precisely which moment you mean."],
    ["#changes", "3. Send it", "Add as many notes as you like, then tap Request changes. All of them come to us together."]
  ];
  async function run() {
    if (document.getElementById("coach") || window.__notesTour) return; window.__notesTour = true;
    const d = S.data || {}; const name = String(d.full_name || d.name || "").split(" ")[0];
    const reels = (d.reels || []).filter(r => r && r.status !== "cancelled"); const latest = reels[reels.length - 1];
    const c = document.createElement("div"); c.id = "coach"; c.className = "coach";
    c.innerHTML = `<div class="spot"></div><div class="bub"><div class="bh"><b></b></div><p></p><div class="bf"><button class="linkbtn cskip" type="button">Not now</button><button class="btn primary sm cnext" type="button">Show me</button></div></div>`;
    document.body.appendChild(c);
    const spot = c.querySelector(".spot"), bub = c.querySelector(".bub"), BASE = 100;
    const place = (r) => { const pad = 8, m = 3, L = Math.max(m, r.left - pad), T = Math.max(m, r.top - pad), R = Math.min(innerWidth - m, r.right + pad), B = Math.min(innerHeight - m, r.bottom + pad);
      const w = Math.max(20, R - L), h = Math.max(20, B - T); spot.style.transform = `translate3d(${L}px,${T}px,0) scale(${w / BASE},${h / BASE})`;
      spot.style.setProperty("--rx", (18 * BASE / w) + "px"); spot.style.setProperty("--ry", (18 * BASE / h) + "px");
      const bw = Math.min(330, innerWidth - 32); bub.style.width = bw + "px"; const bh = bub.offsetHeight || 170;
      const left = Math.max(16, Math.min(innerWidth - bw - 16, r.left + r.width / 2 - bw / 2)); let top = r.top > innerHeight / 2 ? r.top - pad - bh - 14 : r.bottom + pad + 14;
      top = Math.max(16, Math.min(innerHeight - bh - 16, top)); bub.style.setProperty("--x", left + "px"); bub.style.setProperty("--y", top + "px"); };
    const center = () => { spot.style.transform = "translate3d(-200px,-200px,0) scale(0.01,0.01)"; const bw = Math.min(330, innerWidth - 32); bub.style.width = bw + "px";
      bub.style.setProperty("--x", (innerWidth - bw) / 2 + "px"); bub.style.setProperty("--y", Math.max(40, innerHeight / 2 - 120) + "px"); };
    const end = () => { c.classList.remove("on"); setTimeout(() => c.remove(), 400); markSeen(); window.__notesTour = false; };
    bub.querySelector("b").textContent = name ? `Hey ${name}!` : "Hey!";
    bub.querySelector("p").textContent = "We would love to show you a better way to leave notes on your reel. It takes 10 seconds.";
    center(); requestAnimationFrame(() => { c.classList.add("on"); bub.classList.add("in"); });
    c.querySelector(".cskip").onclick = end;
    c.querySelector(".cnext").onclick = async () => {
      bub.classList.remove("in");
      if (latest && !document.querySelector("#tl")) { try { go("home", { reel: latest.id, ver: null }); } catch {} }
      let i = 0;
      const show = async () => {
        if (i >= STEPS.length) return end();
        const st = STEPS[i]; const el = await wait(st[0], 4000); if (!el) { i++; return show(); }
        el.scrollIntoView({ block: "center" }); await new Promise(r => setTimeout(r, 250));
        place(el.getBoundingClientRect()); bub.querySelector("b").textContent = st[1]; bub.querySelector("p").textContent = st[2];
        c.querySelector(".cnext").textContent = i === STEPS.length - 1 ? "Got it" : "Next"; c.querySelector(".cskip").textContent = "Skip";
        requestAnimationFrame(() => bub.classList.add("in"));
      };
      c.querySelector(".cnext").onclick = () => { bub.classList.remove("in"); i++; show(); };
      show();
    };
  }
  async function maybe() {
    if (!wants() || document.getElementById("coach")) return;
    try { const r = await (await fetch("/api/tour?kind=notes&k=" + KEY(), { cache: "no-store" })).json(); if (r.seen) { ls("lumi_notestour_done_" + KEY(), "1"); return; } } catch {}
    run();
  }
  window.lumiNotesTour = { start: run };
  let tried = 0; const tick = () => { if (tried++ > 40) return; if (typeof S !== "undefined" && S.data) maybe(); else setTimeout(tick, 1500); };
  setTimeout(tick, 2500);
})();
