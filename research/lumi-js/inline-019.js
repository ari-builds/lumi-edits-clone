/* [M5 Max MBP] 2026-10-20 BANNER: the top banner comes from the account snapshot (S.data.banner, written by app_push.app_banner from live
   state: a hand message in app_banner.json, else the pause). No dates in this file any more (Nick 2026-10-19: "back Monday" showed on Monday, then
   "reels are moving" while everything was paused). Backup index.html.bak_pre_banner_20261020_0717 */
(function lumiBanner(){try{
  function apply(){try{
    const d=(window.S&&S.data)||{}; const b=d.banner; const hdr=document.querySelector("header.top"); if(!hdr) return;
    let el=hdr.querySelector(".mondayban");
    if(!b||!(b.text||b.title)){ if(el) el.remove(); return; }
    const html='<div class="flip"><img src="/lumi/head.png" alt=""></div><div class="t"><b>'+esc(b.title||"")+'</b><span>'+esc(b.text||"")+'</span></div>';
    if(!el){ el=document.createElement("div"); el.className="mondayban"; el.setAttribute("role","status"); const a=hdr.querySelector(".a2hs"); a?hdr.insertBefore(el,a):hdr.appendChild(el); }
    if(el.dataset.sig!==(b.kind||"")+"|"+(b.title||"")+"|"+(b.text||"")){ el.innerHTML=html; el.dataset.sig=(b.kind||"")+"|"+(b.title||"")+"|"+(b.text||""); }
  }catch{}}
  setInterval(apply,2000); apply();
}catch{}})();
