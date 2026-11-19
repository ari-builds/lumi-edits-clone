
/* SCROLLBACK200 [M5 Max MBP] 2026-11-16 (Nick TG 25052): going back (swipe, Back button, browser back) lands on the same place in the list,
   not the top. Each page (view + open reel + open mail) remembers its scroll when left; returning to the page you came from restores it. */
(() => {
  if (typeof render !== "function") return;
  const mem = {}, stack = []; let last = null, saved = false;
  const key = () => (typeof S === "undefined") ? "" : [S.view, S.reel || "", S.mail || ""].join("|");
  window.__scrollSave = () => { if (last != null) { try { mem[last] = pageY(); saved = true; } catch {} } };
  const _render = render;
  render = function () {
    if (!saved) window.__scrollSave(); saved = false;
    const from = last; const out = _render.apply(this, arguments); const to = key();
    if (from != null && to !== from) {
      if (stack.length && stack[stack.length - 1] === to) {
        stack.pop(); const y = mem[to] || 0;
        if (y > 0) { const put = () => { try { setPageY(y); } catch {} }; requestAnimationFrame(put); setTimeout(put, 120); setTimeout(put, 400); }
      } else { stack.push(from); if (stack.length > 30) stack.shift(); }
    }
    last = to; return out;
  };
  last = key();
})();
