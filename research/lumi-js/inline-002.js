
/* LOOKS178 [M5 Max MBP] 2026-11-05 21:38 PST (Nick TG: "build a button at the top that toggles between different looks"): the look is set before first paint, no flash.
   classic (default) | command | glass, saved per device in localStorage "lumi_look". ?look= previews one for this visit only (never saved). */
(function () { var l = "everybody"; try { l = localStorage.getItem("lumi_look") || "everybody"; } catch (e) {}   /* EVERYBODY193 [M5 Max MBP] 2026-11-10 (Nick TG 24019): Everybody Knows is the default look; a saved choice still wins */
  try { var q = new URLSearchParams(location.search).get("look"); if (q) l = q; } catch (e) {}
  /* LOOKS183B [M5 Max MBP] 2026-11-06 10:58 PM PST (Nick TG 23477): six more looks. Each look's font sheet is added only when that look is on. */
  /* LOOKS183C [M5 Max MBP] 2026-11-07 (Nick TG 23528): Command is retired. A saved or previewed "command" opens Classic dark, never a broken page. */
  if (l === "glass") { l = "everybody"; try { if (localStorage.getItem("lumi_look") === "glass") localStorage.setItem("lumi_look", "everybody"); } catch (e) {} }   /* GLASSOUT194 */
  if (l === "command") { l = "classic"; window.__lkWasCommand = 1; try { if (localStorage.getItem("lumi_look") === "command") { localStorage.setItem("lumi_look", "classic"); localStorage.setItem("lumi_appearance", "dark"); } } catch (e) {} }
  if (!/^(classic|glass|dojo|clay|cleangirl|strawberry|matcha|golden|silentpower|everybody)$/.test(l)) l = "everybody"; document.documentElement.dataset.look = l;
  window.lumiLookFont = function (k) { var F = { dojo: "Kaushan+Script", clay: "Fredoka:wght@500;600;700", cleangirl: "Cormorant+Garamond:wght@500;600", strawberry: "Fraunces:opsz,wght@9..144,600;9..144,800", silentpower: "Antonio:wght@700", everybody: "Anton&family=Mrs+Saint+Delafield" };   /* LOOKS183C */
    if (!F[k] || document.getElementById("lkf_" + k)) return; var e = document.createElement("link"); e.id = "lkf_" + k; e.rel = "stylesheet";
    e.href = "https://fonts.googleapis.com/css2?family=" + F[k] + "&display=swap"; document.head.appendChild(e); };
  window.lumiLookFont(l); })();
