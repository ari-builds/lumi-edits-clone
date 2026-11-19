
/* One-tap light/dark switch in the header [M5 Max MBP] 2026-09-26 (Nick: "a button at the top that's easily switchable").
   Sets an explicit Light or Dark, saved the same way as the Appearance setting; Match phone stays in the account sheet. */
(() => { const b = document.getElementById("themetog"); if (!b || !window.lumiAppearance) return;
  const sync = () => { const dark = document.documentElement.dataset.appearance === "dark"; b.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode"); b.setAttribute("aria-pressed", dark ? "true" : "false"); };
  // [M5 Max MBP] 2026-10-01 06:50 PDT qafix: with "Match phone" on, the switch flips the look for this visit only and Match phone stays saved
  // (it used to overwrite it silently). With Light or Dark saved, it saves the other one, as before.
  b.onclick = () => { const next = document.documentElement.dataset.appearance === "dark" ? "light" : "dark";
    if (lumiAppearance.get() === "auto") { lumiAppearance.peek(next); try { toast((next === "dark" ? "Dark" : "Light") + " for now. Match phone stays on in Your account."); } catch (e) {} }
    else { lumiAppearance.set(next); document.querySelectorAll("#appear button").forEach(x => x.classList.toggle("on", x.dataset.ap === next)); }
    sync(); b.classList.remove("spin"); void b.offsetWidth; b.classList.add("spin"); };
  sync(); new MutationObserver(sync).observe(document.documentElement, { attributes: true, attributeFilter: ["data-appearance"] }); })();
