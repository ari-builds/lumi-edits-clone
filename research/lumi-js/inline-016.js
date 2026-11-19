/* [M5 Max MBP] 2026-09-29 07:08 PDT Nick: "if I swipe right across the screen it goes back a page".
   Swipe right (70px+, mostly sideways, under 0.7 s) = Back. Order: the page's own Back button (reel -> Reels, a message -> Inbox),
   then the previous tab, then Reels. Ignored on anything that scrolls sideways (style carousels), inputs, sliders and video. */
(function(){
  let x0 = 0, y0 = 0, t0 = 0, on = false;
  const sideScroller = el => { for (let n = el; n && n !== document.body; n = n.parentElement) {
      if (n.matches && n.matches("input,textarea,select,video,[contenteditable],.player,.scrub,.tl,.rh,.rsel,.controls")) return true;   // RANGEGRAB196 [M5 Max MBP] 2026-11-11 (Nick TG 24323): a drag that starts on the timeline or a range handle never slides the page back
      const cs = getComputedStyle(n); if ((cs.overflowX === "auto" || cs.overflowX === "scroll") && n.scrollWidth > n.clientWidth + 2) return true; }
    return false; };
  const anyOpen = () => !!document.querySelector("#sheet.on,.sheet.on,.revpop,.modal.open,#coach,#celebrate,.flash");   // [M5 Max MBP] 2026-09-29 sweep50: the tour's real ids are #coach and #celebrate
  // [M5 Max MBP] 2026-09-29 07:25 PDT Nick: "I want the whole page to slide so a client is aware that they are doing it as they are doing it".
  // Header, page and bottom action bar move with the finger; past a third of the screen (or a quick flick) it slides off and goes back.
  let drag = false, dx = 0;
  // [M5 Max MBP] 2026-09-29 sweep: move #dock's fixed children, never #dock itself (a transform on #dock re-anchored the fixed compose and
  // Approve bars to it, so they jumped up or off screen mid drag). #main drops its .screen fade-in while dragged, since that animation's
  // fill-mode overrode the inline transform and the page body never followed the finger.
  const layers = () => [...document.querySelectorAll("header.top, #main, #dock > *")];
  const canBack = () => { const b = [...document.querySelectorAll("#main .back, #main #back")].some(x => x.offsetParent);
    return b || (typeof S !== "undefined" && (S.view !== "home" || !!S.reel || (S.hist || []).some(v => v !== S.view))); };
  const setX = (x, anim) => layers().forEach(el => { if (el.id === "main") el.classList.remove("screen"); el.style.transition = anim ? "transform .22s cubic-bezier(.2,.8,.2,1)" : "none";
    el.style.transform = x ? `translate3d(${x}px,0,0)` : ""; el.style.boxShadow = x ? "-12px 0 28px rgba(18,20,43,.12)" : ""; });
  const reset = () => layers().forEach(el => { el.style.transition = ""; el.style.transform = ""; el.style.boxShadow = ""; });
  addEventListener("touchstart", e => { on = false; drag = false; dx = 0; if (e.touches.length !== 1 || anyOpen() || sideScroller(e.target) || !canBack()) return;
    on = true; x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; t0 = Date.now(); }, { passive: true });
  addEventListener("touchmove", e => { if (!on) return; const t = e.touches[0], mx = t.clientX - x0, my = t.clientY - y0;
    if (!drag) { if (Math.abs(my) > 10 && Math.abs(my) > Math.abs(mx)) { on = false; return; }   // scrolling up or down
      if (mx > 10 && mx > Math.abs(my) * 1.2) drag = true; else return; }
    dx = Math.max(0, mx); if (e.cancelable) e.preventDefault(); setX(dx, false); }, { passive: false });
  const end = e => { if (!on) return; on = false; if (!drag) return; drag = false;
    const W = innerWidth, fast = dx > 60 && Date.now() - t0 < 300;
    if (dx > W * 0.33 || fast) { setX(W, true); setTimeout(() => { reset(); window.lumiBack(); { const mm = document.getElementById("main"); if (mm) mm.classList.remove("screen"); }
        layers().forEach(el => { el.style.transition = "none"; el.style.transform = "translate3d(-24px,0,0)"; el.style.opacity = ".6"; });
        requestAnimationFrame(() => requestAnimationFrame(() => layers().forEach(el => { el.style.transition = "transform .2s ease, opacity .2s ease"; el.style.transform = ""; el.style.opacity = ""; })));
        setTimeout(reset, 260); }, 200); }
    else { setX(0, true); setTimeout(reset, 240); } };
  addEventListener("touchend", end, { passive: true }); addEventListener("touchcancel", end, { passive: true });
  // [M5 Max MBP] 2026-09-29 sweep50: a redraw mid drag replaces the element the finger is on, so its touchend never reaches window and the
  // page stayed shifted right for good (across tabs too). render() calls this: the drag is dropped and the page springs back.
  window.lumiSwipeCancel = function(){ if (!on && !drag) return; on = false; drag = false; dx = 0; reset(); };
  window.lumiBack = function(){
    const b = [...document.querySelectorAll("#main .back, #main #back")].find(x => x.offsetParent);
    if (b) { b.click(); return; }
    // [M5 Max MBP] 2026-09-29 sweep50: the New reel wizard's own Back (#prev lives in the dock) goes a step back before leaving the flow
    const pv = document.querySelector("#dock #prev"); if (pv && pv.offsetParent && typeof S !== "undefined" && S.view === "new") { pv.click(); return; }
    if (typeof S === "undefined") return;
    const h = S.hist || [];
    while (h.length && h[h.length - 1] === S.view) h.pop();
    const prev = h.pop();
    if (prev) go(prev, { __back: 1 }); else if (S.view !== "home") go("home", { __back: 1 });
  };
  // [M5 Max MBP] 2026-09-29 sweep50: the browser / Android back button (and Safari's edge swipe) did not go back a screen, it left Lumi.
  // One guard entry sits on top of the page's history: Back closes an open sheet or goes back in the app the same way the swipe does, then
  // re-arms the guard. With nowhere left to go back to in the app, Back leaves the page as usual.
  try { if (!(history.state && history.state.lumiGuard)) { history.replaceState(Object.assign({}, history.state || {}, { lumiBase: 1 }), ""); history.pushState({ lumiGuard: 1 }, ""); } } catch (e) {}
  addEventListener("popstate", e => {
    if (e.state && e.state.lumiGuard) return;
    const rearm = () => { try { history.pushState({ lumiGuard: 1 }, ""); } catch (_) {} };
    const sh = document.getElementById("sheet");
    if (sh && sh.classList.contains("on")) { if (typeof sheetUserClose === "function") sheetUserClose(); else if (typeof closeSheet === "function") closeSheet(); rearm(); return; }
    const co = document.getElementById("coach"); if (co) { const sk = co.querySelector(".cskip"); if (sk) sk.click(); rearm(); return; }
    if (typeof S !== "undefined" && S.data && canBack()) { window.lumiBack(); rearm(); return; }
    history.back();
  });
})();
