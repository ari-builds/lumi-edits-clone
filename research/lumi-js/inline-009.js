
/* THEME194 [M5 Max MBP] 2026-11-10 15:45 PST (Nick TG 24115 "give people an option to fill out their likes, desires, things they like, and personality and then
   create a profile, a theme based off what they like ... but it follows the style guide of Everyone Knows and/or Silent Power"). A short form
   (3 things you love, a vibe, a colour, a word) -> a theme = base look (Silent Power for bold / luxe, Everybody Knows for calm / playful) with the
   person's colour on every accent token. Applied on the phone at once (style#theme194 overrides the base look's tokens), saved per device
   (lumi_theme194) and sent to the Mac as intent "theme194" so the account snapshot carries it (data.theme194) for the desktop app and other
   devices. The hero Lumi stays the base look's for now; a Lumi drawn for the person's interests is the next step (Mac side). */
(() => {
  const PICKS = ["coffee", "beach", "gym", "music", "fashion", "tech", "nature", "pets", "travel", "food", "gaming", "art", "cars", "books", "film", "business"];
  const VIBES = [["calm", "Calm"], ["bold", "Bold"], ["playful", "Playful"], ["luxe", "Luxe"]];
  const COLORS = [["red", "#c8321e"], ["coral", "#ff6b4a"], ["orange", "#e8762c"], ["gold", "#d9a21b"], ["sage", "#7f8f5e"], ["teal", "#1f8a8a"], ["blue", "#2f56a8"], ["violet", "#6b4fd8"], ["pink", "#fe74b6"], ["black", "#111111"]];
  const hex = c => (COLORS.find(x => x[0] === c) || COLORS[6])[1];
  const mix = (h, t, w) => { const n = x => parseInt(x, 16); const r = n(h.slice(1, 3)), g = n(h.slice(3, 5)), b = n(h.slice(5, 7)); const f = v => Math.round(v + (t - v) * w).toString(16).padStart(2, "0"); return "#" + f(r) + f(g) + f(b); };
  const derive = a => { const base = (a.vibe === "bold" || a.vibe === "luxe") ? "silentpower" : "everybody"; const acc = hex(a.color); const dark = mix(acc, 0, .28), onAcc = a.color === "gold" || a.color === "coral" || a.color === "pink" ? "#1a1a1a" : "#fff";
    return { base, accent: acc, dark, on: onAcc, name: (a.word || "").trim() ? (a.word.trim() + " " + (base === "silentpower" ? "Power" : "Knows")) : "My theme", nameInk: (a.vibe === "playful" || a.vibe === "bold") ? acc : "" }; };
  const css = d => `html:root:root:root[data-look=${d.base}][data-look][data-theme194]{--accent:${d.accent};--lilac:${d.accent};--on-accent:${d.on};--grad:linear-gradient(${d.accent},${d.accent});--grad-btn:linear-gradient(${d.dark},${d.accent});--ring:0 0 0 3px var(--bg),0 0 0 5px ${d.accent};--lk-av-bg:${d.accent};--lk-av-ink:${d.on};--lk-btn-bg:${d.accent};--lk-btn-ink:${d.on};--lk-chip-on:${d.accent};--lk-chip-on-ink:${d.on};--lk-prog:${d.accent};--lk-new-bg:${d.accent};--lk-new-ink:${d.on};--lk-new-sh:0 0 0 3px var(--bg)${d.nameInk ? ";--lk-name:" + d.nameInk + ";--lk-logo:" + d.nameInk : ""}}`;
  const styleEl = () => document.getElementById("theme194") || Object.assign(document.head.appendChild(document.createElement("style")), { id: "theme194" });
  const setLook = k => { try { window.lumiLookFont && lumiLookFont(k); } catch (e) {} document.documentElement.dataset.look = k; try { localStorage.setItem("lumi_look", k); localStorage.setItem("lumi_look_auto", "0"); } catch (e) {}   /* FXLOOKS194 [M5 Max MBP] 2026-11-10 11:45 PM PST: a theme is the person's own choice, the default look never replaces it */
    try { window.lumiAppearance && lumiAppearance.re && lumiAppearance.re(); } catch (e) {} try { window.lk183Swap && lk183Swap(); } catch (e) {} };
  /* FXLOOKS194 [M5 Max MBP] 2026-11-10 11:45 PM PST (Nick TG 24171 "The Make It Mine section needs to create their own Lumi based on what they choose"): the Mac draws the
     person's OWN Lumi from these answers (mine194.py) and the snapshot carries it as data.theme194.lumi = {state: drawing | ready | failed, for, url}.
     While the theme is on and a ready drawing exists FOR THESE answers, it is the hero Lumi and the Make it mine swatch in the look menu. Drawing,
     failed, or a picture that does not load = the base look's own Lumi, as before. Off switch: MINE194_ON = false. */
  const MINE194_ON = true;
  const key = a => [...((a || {}).picks || [])].map(String).sort().join(",") + "|" + ((a || {}).vibe || "calm") + "|" + ((a || {}).color || "blue") + "|" + String((a || {}).word || "").trim().toLowerCase();
  const mineLumi = () => { const sv = saved(); return MINE194_ON && sv && sv.answers && sv.lumi && sv.lumi.for === key(sv.answers) ? sv.lumi : null; };
  const mineUrl = () => { const l = mineLumi(); return document.documentElement.dataset.theme194 && l && l.state === "ready" && /^https:\/\//.test(l.url || "") && !window.__mine194bad ? l.url : ""; };
  const mineHtml = u => `<div class="h50vw lk183v mine194"><img class="h50v" src="${esc(u)}" alt="Your own Lumi" decoding="async" onerror="window.__mine194bad=1;try{lk183Swap()}catch(e){}"></div>`;
  { const base = window.lk183Html;   // the hero art: the same call sites, the person's Lumi first
    if (typeof base === "function") {
      window.lk183Html = function () { const u = mineUrl(); return u ? mineHtml(u) : base(); };
      window.lk183Swap = function () { const a = document.querySelector(".hero.h50 .h50art"); if (!a) return; const k = document.documentElement.dataset.look || "classic", u = mineUrl(), has = !!a.querySelector(".mine194");
        if (u ? (has && a.querySelector(".mine194 img").getAttribute("src") === u) : (!has && a.dataset.lk === k)) return; a.innerHTML = window.lk183Html() || window.__h50classic || ""; a.dataset.lk = k; }; } }
  // the snapshot is the source for the drawing: take its state whenever it is for this device's answers, then refresh the hero
  const sync = data => { try { const t = data && data.theme194, sv = saved(); if (!MINE194_ON || !sv || !sv.answers || !t || t.cleared || !t.lumi || t.lumi.for !== key(sv.answers)) return;
      const cur = sv.lumi || {}; if (cur.state === t.lumi.state && (cur.url || "") === (t.lumi.url || "")) return;
      sv.lumi = { state: t.lumi.state, for: t.lumi.for, url: t.lumi.url || "", at: Date.now() }; localStorage.setItem("lumi_theme194", JSON.stringify(sv));
      if (t.lumi.state === "ready") { window.__mine194bad = 0; try { lk183Swap(); } catch (e) {} if (cur.state === "drawing") { try { toast("Your own Lumi is here"); } catch (e) {} } } } catch (e) {} };
  setInterval(() => { try { if (document.documentElement.dataset.theme194 && typeof S !== "undefined" && S.data) sync(S.data); } catch (e) {} }, 5000);
  const apply = (a, quiet) => { const d = derive(a); styleEl().textContent = css(d); setLook(d.base); document.documentElement.dataset.theme194 = "1";
    { const pv = saved(), lm = pv && pv.lumi && pv.lumi.for === key(a) ? pv.lumi : (quiet ? null : { state: "drawing", for: key(a), at: Date.now() });   /* FXLOOKS194 [M5 Max MBP] 2026-11-10 11:45 PM PST */
      try { localStorage.setItem("lumi_theme194", JSON.stringify({ answers: a, derived: d, at: Date.now(), ...(lm ? { lumi: lm } : {}) })); } catch (e) {} }
    if (!quiet) { try { toast(mineUrl() ? d.name + " is on" : d.name + " is on. Lumi is drawing your own Lumi now."); } catch (e) {} try { send({ kind: "theme194", answers: a, derived: d, idem: "theme194-" + Date.now() }); } catch (e) {} }
    try { window.lk183Swap && lk183Swap(); } catch (e) {}
    try { typeof render === "function" && render(); } catch (e) {} return d; };
  const clear = quiet => { const el = document.getElementById("theme194"); if (el) el.remove(); delete document.documentElement.dataset.theme194; try { localStorage.removeItem("lumi_theme194"); } catch (e) {}
    if (!quiet) { try { send({ kind: "theme194", clear: true, idem: "theme194-clear-" + Date.now() }); } catch (e) {} } };
  const saved = () => { try { return JSON.parse(localStorage.getItem("lumi_theme194") || "null"); } catch (e) { return null; } };
  const open = () => { const cur = (saved() || {}).answers || { picks: [], vibe: "calm", color: "blue", word: "" }; const A = { picks: [...(cur.picks || [])], vibe: cur.vibe || "calm", color: cur.color || "blue", word: cur.word || "" };
    const html = `<div class="t194"><h3 style="font-family:var(--serif);font-weight:400;font-size:24px;margin:0 0 4px">Make it mine</h3><p class="muted" style="margin:0 0 14px;font-size:13.5px">Tell Lumi what you are into. Lumi draws your own Lumi from it, and your theme follows the Everybody Knows or Silent Power style guide, in your colour.</p>${(() => { const l = mineLumi(), on = !!document.documentElement.dataset.theme194; return !on || !l ? "" : l.state === "ready" && mineUrl() ? `<div class="t194me"><img src="${esc(l.url)}" alt="Your own Lumi"><span>Your own Lumi. Change anything below and Lumi draws a new one.</span></div>` : l.state === "drawing" ? `<div class="t194me"><span>Lumi is drawing your own Lumi. It shows up on your home screen in a minute or two.</span></div>` : ""; })()}
      <label class="lbl">Three things you love</label><div class="chips t194p" style="flex-wrap:wrap;gap:8px">${PICKS.map(k => `<button type="button" data-p="${k}" class="${A.picks.includes(k) ? "on" : ""}">${k}</button>`).join("")}</div>
      <label class="lbl" style="margin-top:14px">Your vibe</label><div class="chips t194v" style="gap:8px">${VIBES.map(([k, n]) => `<button type="button" data-v="${k}" class="${A.vibe === k ? "on" : ""}">${n}</button>`).join("")}</div>
      <label class="lbl" style="margin-top:14px">Your colour</label><div class="t194c" style="display:flex;flex-wrap:wrap;gap:10px">${COLORS.map(([k, h]) => `<button type="button" data-c="${k}" aria-label="${k}" style="width:34px;height:34px;border-radius:50%;background:${h};border:3px solid ${A.color === k ? "var(--ink)" : "transparent"};box-shadow:0 0 0 1px rgba(0,0,0,.12)"></button>`).join("")}</div>
      <label class="lbl" style="margin-top:14px" for="t194w">A word for you (optional)</label><input id="t194w" type="text" maxlength="18" placeholder="Iron, Sunday, Velvet..." value="${esc(A.word)}" style="width:100%;box-sizing:border-box;padding:12px 14px;border-radius:12px;border:1px solid var(--line);background:var(--card);color:var(--ink);font:inherit">
      <button class="btn primary block" id="t194go" style="margin-top:16px">Make my theme</button>${saved() ? `<button class="btn line block" id="t194off" style="margin-top:8px">Back to the normal look</button>` : ""}</div>`;
    sheet(html); const box = $("#sheet");
    box.querySelectorAll(".t194p button").forEach(b => b.onclick = () => { const k = b.dataset.p; if (A.picks.includes(k)) A.picks = A.picks.filter(x => x !== k); else { if (A.picks.length >= 3) A.picks.shift(); A.picks.push(k); } box.querySelectorAll(".t194p button").forEach(x => x.classList.toggle("on", A.picks.includes(x.dataset.p))); });
    box.querySelectorAll(".t194v button").forEach(b => b.onclick = () => { A.vibe = b.dataset.v; box.querySelectorAll(".t194v button").forEach(x => x.classList.toggle("on", x.dataset.v === A.vibe)); });
    box.querySelectorAll(".t194c button").forEach(b => b.onclick = () => { A.color = b.dataset.c; box.querySelectorAll(".t194c button").forEach(x => x.style.borderColor = x.dataset.c === A.color ? "var(--ink)" : "transparent"); });
    const go = $("#t194go"); if (go) go.onclick = () => { A.word = ($("#t194w").value || "").trim(); apply(A); closeSheet(); };
    const off = $("#t194off"); if (off) off.onclick = () => { clear(); setLook("everybody"); closeSheet(); try { toast("Back to Everybody Knows"); } catch (e) {} }; };
  window.theme194 = { open, apply, clear, derive, saved, sync, key, mineUrl };
  // boot: this device's saved theme, else the account's theme from the snapshot (another device made it)
  const boot = () => { const sv = saved(); if (sv && sv.answers) { apply(sv.answers, true); try { if (typeof S !== "undefined" && S.data) sync(S.data); } catch (e) {} return; }
    let tries = 0; const t = setInterval(() => { const d = typeof S !== "undefined" && S ? S.data : null;   /* FXLOOKS194 [M5 Max MBP] 2026-11-10 11:45 PM PST: S is a const, window.S was always undefined, so the account's theme never reached a second device */
      if (d && d.theme194 && d.theme194.answers && !d.theme194.cleared) { clearInterval(t); apply(d.theme194.answers, true); sync(d); } else if (++tries > 20) clearInterval(t); }, 500); };
  if (document.readyState === "complete") boot(); else window.addEventListener("load", boot);
})();
/* LOOKS178 [M5 Max MBP] 2026-11-05 21:38 PST: the look switch. Opens a 3-option menu (Classic, Command, Glass). Only sets <html data-look> + saves it; no other handler changes. */
(() => { const b = document.getElementById("looktog"); if (!b) return;
  const LOOKS = [["classic", "Classic", "Pastel Lumi, light or dark"],   /* GLASSOUT194 [M5 Max MBP] 2026-11-10 15:01 PST (Nick TG 24115 "Let's just get rid of Glass"): Glass removed from the picker; a saved "glass" opens Everybody Knows */
    /* LOOKS183C [M5 Max MBP] 2026-11-07 (Nick TG 23528): Command removed, Silent Power + Everybody Knows added */
    ["silentpower", "Silent Power", "Stone blue, navy, one red"], ["everybody", "Everybody Knows", "Sand poster, mocha, pink script"],
    /* LOOKS183B [M5 Max MBP] 2026-11-06 10:58 PM PST (Nick TG 23477) */
    ["dojo", "Ink Dojo", "Rice paper, ink and red sun"], ["clay", "Clay Studio", "Soft clay, sage and sand"], ["cleangirl", "Clean Girl", "Latte, marble, glossy glass"],
    ["strawberry", "Strawberry", "Gingham picnic, jam jars"], ["matcha", "Matcha", "Cream, oat and matcha"], ["golden", "Golden Hour", "Sunset beach, warm glass"],
    ["mine", "Make it mine", "Your own theme from what you love"]];   /* THEME194 [M5 Max MBP] 2026-11-10 15:45 PST (Nick TG 24115: a profile-based theme on the Everybody Knows / Silent Power style guide) */
  const m = document.createElement("div"); m.className = "lookmenu"; m.id = "lookmenu"; m.hidden = true; m.setAttribute("role", "menu");
  const cur = () => document.documentElement.dataset.look || "classic";
  const isOn = k => k === "mine" ? !!document.documentElement.dataset.theme194 : (cur() === k && !document.documentElement.dataset.theme194);   /* THEME194 */
  const draw = () => { m.innerHTML = '<div class="lmh">Look</div>' + LOOKS.map(([k, n, d]) => '<button type="button" role="menuitemradio" data-look="' + k + '" aria-checked="' + (isOn(k)) + '" class="' + (isOn(k) ? "on" : "") + '"><span class="sw ' + k + (k === "mine" && mineU() ? " has" : "") + '"' + (k === "mine" && mineU() ? ' style="background-image:url(&quot;' + encodeURI(mineU()) + '&quot;)"' : "") + '></span><span>' + n + '<small>' + (k === "mine" && mineU() ? "Your own Lumi and theme" : d) + '</small></span></button>').join(""); };
  const mineU = () => { try { return (window.theme194 && theme194.mineUrl && theme194.mineUrl()) || ""; } catch (e) { return ""; } };   /* FXLOOKS194 [M5 Max MBP] 2026-11-10 11:45 PM PST: the Make it mine row shows the person's own Lumi once it is drawn */
  const close = () => { m.hidden = true; b.setAttribute("aria-expanded", "false"); };
  const pick = k => { if (k === "mine") { close(); try { window.theme194 && theme194.open(); } catch (e) {} return; }   /* THEME194 */
    if (k === cur() && !document.documentElement.dataset.theme194) return close(); try { if (window.theme194 && document.documentElement.dataset.theme194) theme194.clear(); } catch (e) {}   /* picking any look ends the theme for the account (clear intent), not only on this device */ try { window.lumiLookFont && lumiLookFont(k); } catch (e) {}
    document.documentElement.dataset.look = k; try { localStorage.setItem("lumi_look", k); localStorage.setItem("lumi_look_auto", "0"); } catch (e) {}   /* FXLOOKS194 [M5 Max MBP] 2026-11-10 11:45 PM PST: a look picked here is the person's own choice, no default replaces it */
    try { window.lumiAppearance && lumiAppearance.re && lumiAppearance.re(); } catch (e) {} try { window.lk183Swap && lk183Swap(); } catch (e) {} close(); };
  m.addEventListener("click", e => { const x = e.target.closest("button[data-look]"); if (x) { e.stopPropagation(); pick(x.dataset.look); } });
  b.addEventListener("click", e => { e.stopPropagation(); if (m.hidden) { draw(); m.hidden = false; b.setAttribute("aria-expanded", "true"); } else close(); });
  document.addEventListener("click", e => { if (!m.hidden && !m.contains(e.target) && !b.contains(e.target)) close(); }, true);
  document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
  document.body.appendChild(m); })();
