
/* Appearance, set before first paint [M5 Max MBP] 2026-09-26 (Nick: "make a dark mode option available. Everything changes to dark mode.")
   light (default, Direction C) | dark | auto (match phone). Stored per device. */
/* [M5 Max MBP] 2026-10-01 06:50 PDT qafix: a NEW device with nothing saved now matches the phone ("auto"); three testers saw dark phones open
   in light. A saved choice is kept as it was. ?theme=light|dark|auto previews a look for this visit only (it never saves).
   peek(v) is a for-this-visit override used by the header switch while "Match phone" is on, so the switch never wipes Match phone. */
/* [M5 Max MBP] 2026-10-08 18:5x PDT Nick TG 18:54: "make sure the client-facing app defaults to light mode and not dark mode". A device with
   nothing saved opens LIGHT (was "auto" = match phone since 2026-10-01). A client who picked dark or Match phone keeps that choice. */
(() => { let p = "light", tmp = null; try { p = localStorage.getItem("lumi_appearance") || "light"; } catch (e) {}
  try { const q = new URLSearchParams(location.search).get("theme"); if (q === "light" || q === "dark" || q === "auto") tmp = q; } catch (e) {}
  const mq = matchMedia("(prefers-color-scheme: dark)"); if (window.__lkWasCommand && !tmp) tmp = "dark";   /* LOOKS183C: a retired Command look opens Classic dark (saved users also get dark saved) */
  const apply = () => { const e = tmp || p, lk = document.documentElement.dataset.look, nl = lk === "glass", lt = /^(dojo|clay|cleangirl|strawberry|matcha|golden|silentpower|everybody)$/.test(lk || ""), d = !lt && (nl || e === "dark" || (e === "auto" && mq.matches));   /* LOOKS183B: the six new looks are light-only */   /* LOOKS178 */ document.documentElement.dataset.appearance = d ? "dark" : "light";
    const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = lk === "glass" ? "#0c1a22" : ({ silentpower: "#98bcd6", everybody: "#ede7df", dojo: "#f3ead8", clay: "#e6d8bd", cleangirl: "#f3ebe3", strawberry: "#fbf3e6", matcha: "#f4eedf", golden: "#f0a06a" })[lk] || (d ? "#12142b" : "#eaf2ff"); };
  window.lumiAppearance = { re: () => apply(), get: () => p, set: v => { p = v; tmp = null; try { localStorage.setItem("lumi_appearance", v); } catch (e) {} apply(); }, peek: v => { tmp = v; apply(); } };
  apply(); mq.addEventListener && mq.addEventListener("change", apply); })();
