
/* Motion helpers [M5 Max MBP] 2026-09-26: stagger what each screen draws, and a one-time confetti burst from Lumi when a reel is ready.
   Pure presentation: watches #main, never touches app state or blocks a tap. */
(() => {
  const RM = matchMedia("(prefers-reduced-motion: reduce)").matches, main = document.getElementById("main"); if (!main) return;
  const SEL = ".hero,.card,.poster,.grid .mv,.stylecard,.mrow,.btns,.rowbtn,.upcard,.upnext,.note,.notice,.chippanel,.igbtn";
  function burst(from) {
    const r = from.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height * .35, C = ["#6aa6ff", "#a98bf5", "#ff9fc0", "#ffd36e", "#7fe0b5", "#ffffff"];
    for (let i = 0; i < 22; i++) { const s = document.createElement("i"); s.className = "confetti-m"; const a = Math.random() * Math.PI * 2, d = 60 + Math.random() * 90;
      s.style.cssText = `left:${cx}px;top:${cy}px;background:${C[i % C.length]};--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d - 30}px;--r:${Math.random() * 540 - 270}deg;animation-delay:${Math.random() * 90}ms;${i % 3 ? "" : "border-radius:50%"}`;
      document.body.appendChild(s); setTimeout(() => s.remove(), 1600); }
  }
  function celebrate() {
    if (RM) return;
    const ready = [...main.querySelectorAll(".poster")].filter(p => p.querySelector(".badge.review")).map(p => p.dataset.id);
    let seen = []; try { seen = JSON.parse(localStorage.getItem("lumi_celebrated") || "[]"); } catch {}
    const fresh = ready.filter(id => id && !seen.includes(id)); if (!fresh.length) return;
    const lumi = main.querySelector(".hlumi") || main.querySelector(".lumic .face"); if (!lumi) return;
    setTimeout(() => burst(lumi), 450);
    try { localStorage.setItem("lumi_celebrated", JSON.stringify([...seen, ...fresh].slice(-200))); } catch {}
  }
  function tag() {
    if (RM) return;
    if (window.__lumiQuiet) { main.querySelectorAll(SEL).forEach(el => { el.dataset.m = 1; }); main.querySelectorAll(".screen,.prog2 i,.steppill .mb i,.quota .qb i,.poster .bar i").forEach(el => { el.style.animation = "none"; }); return; }   // [M5 Max MBP] 2026-09-28 15:4x app test 1: a quiet redraw still faded the whole .screen in and regrew the progress bars
    let i = 0; main.querySelectorAll(SEL).forEach(el => { if (el.dataset.m) return; el.dataset.m = 1; const top = el.getBoundingClientRect().top;
      if (top > innerHeight + 40) return; el.style.setProperty("--i", Math.min(i++, 6)); el.classList.add("m-in"); });
  }
  new MutationObserver(() => { tag(); celebrate(); }).observe(main, { childList: true });
})();
