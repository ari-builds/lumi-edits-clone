
/* Two Lumis [M5 Max MBP] 2026-09-26 (Nick approved the boy Lumi set): light theme = classic Lumi, dark theme = boy Lumi, automatically.
   Every Lumi image on the page is resolved from the current theme and swaps live when the theme changes (header switch, Match phone).
   Classic edit/plan/happy are still the old loops (not yet approved); boy edit/plan/happy are approved and used in dark. */
(() => {
  const MOODS = ["wait", "got", "ask", "sad", "welcome", "edit", "plan", "happy"];
  const dark = () => document.documentElement.dataset.appearance === "dark";
  function boyOf(src) {
    const m = String(src).match(/\/lumi\/(?!boy\/)([a-z]+)\.(webp|png|mp4|jpg)(\?|$)/); if (!m) return null;
    if (m[1] === "wait") return "/lumi_karate/head.png?v=119";   // KARATE105 [M5 Max MBP] 2026-11-01: dark placeholders = karate Lumi head
    if (MOODS.includes(m[1])) return "/lumi/boy/" + m[1] + ".webp";
    if (m[1] === "wave") return "/lumi/boy/welcome.webp";
    if (m[1] === "working") return "/lumi/boy/edit.webp";   // style D working clip, boy Lumi in dark
    if (m[1] === "runedit") return "/lumi_karate/kick_card.webp?v=105";   // KARATE105 [M5 Max MBP] 2026-11-01: dark = karate Lumi (was /lumi/boy/runedit.webp)   // Running now card, cut-out boy Lumi at his desk (running-now agent 2026-09-28)
    if (m[1] === "head") return "/lumi_karate/head.png?v=119";   // KARATE105 [M5 Max MBP] 2026-11-01: dark = karate Lumi head (was /lumi/boy/head.png)
    return null;
  }
  function swap(el) {
    if (el.closest && el.closest("#tabs,.logo")) return;
    const light = el.dataset.lumiLight || el.getAttribute("src") || ""; const boy = boyOf(light); if (!boy) return;
    el.dataset.lumiLight = light;
    if (dark()) {
      if (el.tagName === "VIDEO") { const i = document.createElement("img"); i.className = el.className; i.alt = ""; i.dataset.lumiLight = light; i.dataset.lumiWasVideo = el.getAttribute("poster") || "1"; i.src = boy; el.replaceWith(i); return; }
      if (el.getAttribute("src") !== boy) el.src = boy;
    } else {
      if (el.dataset.lumiWasVideo) { const v = document.createElement("video"); v.className = el.className; v.muted = true; v.defaultMuted = true; v.setAttribute("muted", ""); v.loop = true; v.autoplay = true; v.playsInline = true; v.setAttribute("playsinline", "");
        if (el.dataset.lumiWasVideo !== "1") v.poster = el.dataset.lumiWasVideo; v.src = light; el.replaceWith(v); v.play && v.play().catch(() => {}); return; }
      if (el.getAttribute("src") !== light) el.src = light;
    }
  }
  const all = root => (root.querySelectorAll ? root.querySelectorAll('img[src*="/lumi/"],video[src*="/lumi/"],img[data-lumi-light]') : []).forEach(swap);
  new MutationObserver(ms => { for (const m of ms) m.addedNodes.forEach(n => { if (n.nodeType !== 1) return; if (n.matches && n.matches('img,video')) swap(n); all(n); }); }).observe(document.body, { childList: true, subtree: true });
  new MutationObserver(() => all(document)).observe(document.documentElement, { attributes: true, attributeFilter: ["data-appearance"] });
  all(document);
})();
