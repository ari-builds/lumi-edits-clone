
/* MULTIDL200 [M5 Max MBP] 2026-11-16 (Nick TG 25056): hold a reel in Reels to select it, tap more to add, then Download all. On iPhone one
   share sheet saves every video at once (Save N Videos); elsewhere each file downloads. Only reels with a finished version can be picked. */
(() => {
  const sel = new Set(); let on = false, timer = null, swallow = false, sx = 0, sy = 0;
  const reelOf = id => ((typeof S !== "undefined" && S.data && S.data.reels) || []).find(r => String(r.id) === String(id));
  const verOf = r => { const vs = (r && r.versions) || []; return vs.length ? vs[vs.length - 1] : null; };
  const paint = () => {
    const main = document.getElementById("main"); if (!main) return;
    main.classList.toggle("msel200", on);
    main.querySelectorAll(".poster[data-id]").forEach(p => {
      if (!p.querySelector(".ck200")) { const c = document.createElement("span"); c.className = "ck200"; c.textContent = "✓"; p.appendChild(c); }
      p.classList.toggle("sel200", sel.has(p.dataset.id)); });
    let bar = document.getElementById("bar200");
    if (!on) { if (bar) bar.remove(); return; }
    if (!bar) { bar = document.createElement("div"); bar.id = "bar200";
      bar.innerHTML = '<button class="btn line sm" id="c200" type="button" aria-label="Cancel" style="padding:0 12px">\u2715</button><b></b><button class="btn primary sm" id="d200" type="button">With music</button><button class="btn line sm" id="n200" type="button">No music</button>';
      document.body.appendChild(bar);
      bar.querySelector("#c200").onclick = stop; bar.querySelector("#d200").onclick = () => dlAll("music"); bar.querySelector("#n200").onclick = () => dlAll("nomusic"); }
    bar.querySelector("b").textContent = sel.size + " selected";
    bar.querySelector("#d200").disabled = !sel.size; bar.querySelector("#n200").disabled = !sel.size;
  };
  const stop = () => { on = false; sel.clear(); paint(); };
  const toggle = id => { const r = reelOf(id); if (!verOf(r)) { try { toast("That reel has no finished version yet."); } catch {} return; }
    if (r.paylock || r.watermarked) { try { toast("Pay for that reel first to download it."); } catch {} return; }   // PAYDL200: an owed reel never downloads
    sel.has(id) ? sel.delete(id) : sel.add(id); if (!sel.size) on = false; paint(); };
  document.addEventListener("touchstart", e => { const p = e.target.closest && e.target.closest(".poster[data-id]"); if (!p || (typeof S !== "undefined" && S.reel)) return;
    const t = e.touches[0]; sx = t.clientX; sy = t.clientY; clearTimeout(timer);
    timer = setTimeout(() => { swallow = true; if (!on) { on = true; } if (!sel.has(p.dataset.id)) toggle(p.dataset.id); else paint(); try { navigator.vibrate && navigator.vibrate(15); } catch {} }, 480); }, { passive: true });
  document.addEventListener("touchmove", e => { const t = e.touches[0]; if (Math.abs(t.clientX - sx) > 10 || Math.abs(t.clientY - sy) > 10) clearTimeout(timer); }, { passive: true });
  document.addEventListener("touchend", () => clearTimeout(timer), { passive: true });
  document.addEventListener("contextmenu", e => { if (e.target.closest && e.target.closest(".poster[data-id]")) e.preventDefault(); });
  document.addEventListener("click", e => { const p = e.target.closest && e.target.closest(".poster[data-id]"); if (!p) return;
    if (swallow) { swallow = false; e.preventDefault(); e.stopPropagation(); return; }
    if (on) { e.preventDefault(); e.stopPropagation(); toggle(p.dataset.id); } }, true);
  // MULTIDL200c (Nick TG 25062): download all WITH music or all WITHOUT. A reel with no separate no-music file gives its only file.
  const urlOf = (r, v, mode) => { if (mode !== "nomusic") return v.url; return (!r.watermarked && (v.url_nomusic || v.nomusic_url || v.nomusic)) || v.url; };
  async function dlAll(mode) {
    const items = [...sel].map(reelOf).filter(r => r && verOf(r) && !r.paylock && !r.watermarked); if (!items.length) return;
    const ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    document.body.classList.add("sheet200");
    sheet(`<div id="shcard">${lumiCard("edit", "Getting " + items.length + " reels", "Downloading to this device", `<div class="prog2"><i id="shp" style="width:2%"></i></div><div class="eta"><span id="shpt">Reel 1 of ${items.length}</span><span id="shmb"></span></div>`)}</div><div id="shbtn"></div>`);
    const tok = {}; window.__md200 = tok; const alive = () => window.__md200 === tok && document.getElementById("shcard");
    const files = [], failed = [];
    for (let i = 0; i < items.length; i++) {
      if (!alive()) { document.body.classList.remove("sheet200"); return; }
      const r = items[i], v = verOf(r), src = urlOf(r, v, mode), nm = mode === "nomusic" && src !== v.url;
      const name = (reelLabel(r) + (nm ? " - No Music" : "") + ".mp4").replace(/[\/:*?"<>|]/g, "");
      const t = document.getElementById("shpt"); if (t) t.textContent = "Reel " + (i + 1) + " of " + items.length;
      try {
        const res = await fetch(src, { cache: "no-store" }); if (!res.ok) throw new Error("HTTP " + res.status);
        const total = Number(res.headers.get("content-length")) || 0, rd = res.body.getReader(), parts = []; let got = 0;
        for (;;) { const { done, value } = await rd.read(); if (done) break; if (!alive()) { try { rd.cancel(); } catch {} document.body.classList.remove("sheet200"); return; }
          parts.push(value); got += value.length;
          const frac = total ? got / total : Math.min(.9, got / 60e6);
          const a = document.getElementById("shp"), m = document.getElementById("shmb");
          if (a) a.style.width = Math.max(2, Math.round((i + frac) / items.length * 100)) + "%"; if (m) m.textContent = (got / 1048576).toFixed(0) + " MB"; }
        files.push(new File(parts, name, { type: "video/mp4" })); try { window.e115 && window.e115("download", { reel: r.id, v: v.v }); } catch {}
      } catch (e) { failed.push(reelLabel(r)); }
    }
    const box = document.getElementById("shbtn"); if (!box) { document.body.classList.remove("sheet200"); return; }
    { const a = document.getElementById("shp"), t = document.getElementById("shpt"), m = document.getElementById("shmb"); if (a) a.style.width = "100%"; if (t) t.textContent = files.length + " of " + items.length + " ready"; if (m) m.textContent = failed.length ? failed.length + " could not load" : ""; }
    if (!files.length) { box.innerHTML = `<p class="muted" style="text-align:center">Could not download those reels. Try again in a moment.</p>`; document.body.classList.remove("sheet200"); return; }
    if (navigator.canShare && navigator.canShare({ files: [files[0]] })) {
      // iPhone: save in groups of 3 (one share sheet with many large videos can fail on iOS); each tap is a fresh tap, so the sheet always opens
      const groups = []; for (let k = 0; k < files.length; k += 3) groups.push(files.slice(k, k + 3));
      let g = 0;
      const draw = () => {
        if (g >= groups.length) { box.innerHTML = `<p class="muted" style="text-align:center">All saved.</p>`; setTimeout(() => { try { closeSheet(); } catch {} document.body.classList.remove("sheet200"); stop(); }, 900); return; }
        const n = groups[g].length, lab = groups.length > 1 ? `Save ${n} video${n > 1 ? "s" : ""} (${g + 1} of ${groups.length})` : `Save ${n} video${n > 1 ? "s" : ""}${ios ? " to Photos" : ""}`;
        box.innerHTML = `<button class="btn primary block" id="shall">${lab}</button><p class="muted" style="font-size:13px;text-align:center;margin:8px 0 0">${ios ? "Then tap Save Videos." : ""}</p>`;
        document.getElementById("shall").onclick = async () => {
          try { await navigator.share({ files: groups[g] }); g++; draw(); }
          catch (e) { if (e && e.name === "AbortError") return; if (groups[g].length > 1) { const one = groups[g]; groups.splice(g, 1, ...one.map(f => [f])); draw(); } else toast("Could not open the share sheet."); }
        };
      };
      draw();
    } else {
      files.forEach((f, k) => setTimeout(() => { const a = document.createElement("a"); a.href = URL.createObjectURL(f); a.download = f.name; document.body.appendChild(a); a.click(); a.remove(); }, k * 400));
      box.innerHTML = `<p class="muted" style="text-align:center">${files.length} reels saved to your Downloads.</p>`; document.body.classList.remove("sheet200"); stop();
    }
  }
  const _cs200 = typeof closeSheet === "function" ? closeSheet : null;
  if (_cs200) closeSheet = function () { document.body.classList.remove("sheet200"); window.__md200 = null; return _cs200.apply(this, arguments); };
  const main = document.getElementById("main");
  if (main) new MutationObserver(() => { if (on && typeof S !== "undefined" && (S.view !== "home" || S.reel)) stop(); else if (on) paint(); }).observe(main, { childList: true });
})();
