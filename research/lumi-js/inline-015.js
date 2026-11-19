/* [M5 Max MBP] 2026-09-28 21:05 PDT (pull-refresh agent). Nick, Telegram 21:03: "auto-refreshes the app when they pull" and
   "an arrow in the chat ... that will bring them all the way down to the bottom". iOS Safari and the home-screen app have no native
   pull-to-refresh, and a tap on the iPhone status bar sends a page to the top (that is iOS, it cannot be blocked), so the long chat
   gets a jump-to-latest arrow instead. The pull reloads the DATA with load(), never the page: scroll, typed text and the draft stay. */
(function(){
  const $q = s => document.querySelector(s);
  const isChat = () => (S.view === "msgs" || S.view === "team") && !!$q("#main .chatv");
  // [M5 Max MBP] 2026-09-30 (chat layout agent): in Chat the list (#main) scrolls, not the window. pageY/pageMaxY/setPageY pick the right one.
  const nearBottom = () => pageMaxY() - pageY() < 140;
  // ---------- jump to latest ----------
  const jb = document.createElement("button"); jb.className = "jumpnew"; jb.id = "jumpnew"; jb.type = "button"; jb.setAttribute("aria-label", "Jump to the newest message");
  jb.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v13"/><path d="M6 12.5l6 6 6-6"/></svg><i></i>';
  document.body.appendChild(jb);
  const last = {}; let prevView = null, userMoved = 0;
  function place() { const c = $q("#dock .compose"); if (c) { const t = c.getBoundingClientRect().top; if (t > 0) jb.style.bottom = Math.max(80, innerHeight - t + 10) + "px"; } }
  function upd() {
    if (!isChat()) { jb.classList.remove("on", "dot"); return; }
    place();
    const nb = nearBottom();
    jb.classList.toggle("on", !nb);
    if (nb) jb.classList.remove("dot");
  }
  function toBottom(smooth) { setPageY(1e7, smooth); }
  jb.onclick = () => { jb.classList.remove("dot"); toBottom(!matchMedia("(prefers-reduced-motion: reduce)").matches); };
  function afterRender() {
    const v = S.view;
    if (isChat()) {
      // [M5 Max MBP] 2026-10-01 07:26 PDT qa2fix #10: the red dot follows the newest reply's time, not the row count (the typing dots row turned into the reply, and the 80-message
      // cap drops one old row per new one, so the count never grew)
      const n = v === "team" ? Math.max(0, ...(((S.data || {}).team || {}).messages || []).map(m => m.at || 0)) : Math.max(0, ...(((S.data || {}).messages || []).filter(m => m.who !== "you").map(m => m.at || 0)));
      if (prevView !== v) {
        // opening a chat: land on the newest message, and stay there while pictures load in and grow the page
        // replyto 2026-10-05: opened from Answer in Chat = land on the message Lumi is waiting on, not the bottom
        const toAsk = () => !!(window.lumiFocusAsk && window.lumiFocusAsk());
        userMoved = 0; if (!toAsk()) toBottom(false);
        [120, 400, 900].forEach(ms => setTimeout(() => { if (!userMoved && S.view === v) { if (!toAsk()) toBottom(false); upd(); } }, ms));
      } else if (last[v] != null && n > last[v] && !nearBottom()) jb.classList.add("dot");
      last[v] = n;
    }
    prevView = v; upd();
  }
  const mo = new MutationObserver(() => requestAnimationFrame(afterRender));
  const main = $q("#main"); if (main) mo.observe(main, { childList: true });
  document.addEventListener("scroll", upd, { passive: true, capture: true }); addEventListener("resize", upd);   // capture: also hears the chat list scrolling
  if (window.visualViewport) visualViewport.addEventListener("resize", upd);
  addEventListener("touchstart", () => { userMoved = 1; }, { passive: true }); addEventListener("wheel", () => { userMoved = 1; }, { passive: true });
  // [M5 Max MBP] 2026-09-30 11:2x PDT, Nick TG 11:03: "every time I click into the typing box ... it randomly scrolls up". Focusing the box
  // turns on html.kbd (tab bar + pill hide) and the keyboard shrinks the viewport, so the page height changes under a fixed scrollY and the
  // chat lands mid-thread. Re-pin to the newest message while the layout settles, and on every keyboard resize while typing.
  const isBox = el => !!(el && (el.id === "mtext" || el.id === "ttext"));
  document.addEventListener("focusin", e => { if (!isBox(e.target) || !isChat()) return; userMoved = 0;
    [40, 200, 450, 800].forEach(ms => setTimeout(() => { if (isBox(document.activeElement) && !userMoved) { toBottom(false); upd(); } }, ms)); });
  if (window.visualViewport) visualViewport.addEventListener("resize", () => { if (isBox(document.activeElement) && isChat() && !userMoved) { toBottom(false); upd(); } });
  // [M5 Max MBP] 2026-09-30 (chat layout agent): the 15:2x glue() (a transform chasing visualViewport) and the close-the-keyboard-on-swipe
  // are gone. The typing bar is no longer position:fixed (see html.chatlay), so it cannot be left behind by a scroll and needs no chasing.
  window.lumiJump = { stick: () => isChat() && nearBottom(), upd };

  // ---------- pull to refresh ----------
  const ind = document.createElement("div"); ind.className = "ptr"; ind.setAttribute("aria-hidden", "true"); ind.innerHTML = '<img src="/lumi/head.png" alt="">';
  document.body.appendChild(ind);
  const TH = 72; let sy = 0, sx = 0, arm = false, pulling = false, dist = 0, busy = false;
  const blocked = t => (t && t.closest && t.closest(".sheet.on, .sheet, input, textarea, .player, .fplay, .compose, .tabs, .ibanner, [data-noptr]")) || document.getElementById("sheet")?.classList.contains("on") || (typeof K === "string" && K.length !== 24) || document.querySelector("#coach, #celebrate, .revpop");   // [M5 Max MBP] 2026-09-29 sweep50: never under the tour
  // [M5 Max MBP] 2026-10-07 20:5x Nick TG 20:52 "it doesn't refresh unless I'm pulling from the middle of the screen": "video" was in the
  // block list, and every Styles card (left and right column, Home strips) is a muted preview video, so only the gap down the middle pulled.
  // Preview tiles pull now; only the real reel players (.player, .fplay) stay blocked. Sideways swipes still scroll (the dx check below).
  function show(d) { const p = Math.min(1, d / TH); ind.classList.remove("anim"); ind.style.opacity = String(Math.min(1, p * 1.2)); ind.style.transform = `translateY(${Math.min(d, TH * 1.4) - 60}px) scale(${.6 + .4 * p})`; ind.querySelector("img").style.transform = `rotate(${d * 3}deg)`; }
  function hide() { ind.classList.add("anim"); ind.classList.remove("spin"); ind.style.opacity = "0"; ind.style.transform = "translateY(-60px) scale(.6)"; ind.querySelector("img").style.transform = ""; }
  async function refresh() {
    busy = true; ind.classList.add("anim", "spin"); ind.querySelector("img").style.transform = ""; ind.style.opacity = "1"; ind.style.transform = `translateY(${TH - 60}px) scale(1)`;
    const inp = document.getElementById("mtext") || document.getElementById("ttext"), iid = inp ? inp.id : "", val = inp ? inp.value : "";
    const y = pageY(), t0 = Date.now();
    window.lumiPTRCount = (window.lumiPTRCount || 0) + 1;
    window.__lumiQuiet = true;
    try { await load(); } catch {} finally { setTimeout(() => { window.__lumiQuiet = false; }, 0); }
    setPageY(y);
    const inp2 = iid && document.getElementById(iid); if (inp2 && val) inp2.value = val;
    await new Promise(r => setTimeout(r, Math.max(0, 550 - (Date.now() - t0))));
    hide(); busy = false;
  }
  window.lumiPTR = refresh;
  addEventListener("touchstart", e => {
    arm = false; pulling = false; dist = 0;
    if (busy || e.touches.length !== 1 || pageY() > 0 || blocked(e.target)) return;
    arm = true; sy = e.touches[0].clientY; sx = e.touches[0].clientX;
  }, { passive: true });
  addEventListener("touchmove", e => {
    if (!arm) return;
    const dy = e.touches[0].clientY - sy, dx = e.touches[0].clientX - sx;
    if (!pulling) {
      if (pageY() > 0 || dy < -4) { arm = false; return; }           // scrolling the page, not pulling
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) { arm = false; return; }   // a sideways swipe (carousels)
      if (dy < 10) return;
      pulling = true;
    }
    dist = Math.max(0, dy - 10) * 0.55;
    if (e.cancelable) e.preventDefault();                                   // hold the page still (no rubber band) while the pull shows
    show(dist);
  }, { passive: false });
  const end = () => { if (!arm) return; arm = false; if (pulling && dist >= TH) refresh(); else if (pulling) hide(); pulling = false; dist = 0; };
  addEventListener("touchend", end, { passive: true }); addEventListener("touchcancel", end, { passive: true });
})();
