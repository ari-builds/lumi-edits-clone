/* [M5 Max MBP] 2026-10-19 AUTOREFRESH: Nick's phone kept an old copy of the app after a deploy. When the app comes back to the
   foreground (or every 5 min), fetch the live page fresh; if its build id differs from this one, reload once. */
(function lumiAutoRefresh(){try{
  /* compares the live page with the copy loaded at startup; any deploy changes it, so no build number to remember */
  const BUILD="20261019094900";   /* kept only so phones on the 8:50 version (which look for this) see a change and reload once */
  let base=null;
  const h=t=>{let x=0;for(let i=0;i<t.length;i++){x=(x*31+t.charCodeAt(i))|0}return x;};
  async function grab(){ const r=await fetch("/?_b="+Date.now(),{cache:"no-store"}); return h(await r.text()); }
  async function check(){ try{ const v=await grab(); if(base===null){ base=v; return; } if(v!==base) location.reload(); }catch(e){} }
  check();
  document.addEventListener("visibilitychange",()=>{ if(document.visibilityState==="visible") check(); });
  setInterval(check, 300000);
}catch(e){}})();
