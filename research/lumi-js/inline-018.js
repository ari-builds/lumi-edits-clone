/* [M5 Max MBP] 2026-09-30 11:2x PDT, Nick TG 11:16: a banner on every account, new and old, "Save the Lumi app to your phone!". A tap
   shows how to add it to the Home Screen (iPhone and Android, this phone's own steps first; Android Chrome's own install prompt when it offers
   one). Once Lumi is opened from the Home Screen (display-mode standalone) the banner never shows there. Phones only. */
(function lumiA2HS() {
  try {
    const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
    const phone = matchMedia("(hover: none) and (pointer: coarse)").matches;
    if (standalone || !phone) return;
    let deferred = null; addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferred = e; });
    addEventListener("appinstalled", () => { const x = document.querySelector(".a2hs"); if (x) x.remove(); });
    const hdr = document.querySelector("header.top"); if (!hdr || hdr.querySelector(".a2hs")) return;
    const b = document.createElement("button"); b.className = "a2hs"; b.type = "button";
    b.innerHTML = '<img src="/lumi/head.png" alt=""><span>Save the Lumi app to your phone</span><b>Show me</b>';
    hdr.appendChild(b);
    // QA178 [M5 Max MBP] 2026-11-04 09:17 AM PST: the banner sits in the top bar, which BGHDR69 lays over Home's scene with a fixed 69px offset, so its height is published as
    // --a2hsh (0 when hidden, e.g. html.kbd) and Home's padding adds it. Without this the banner covered the client's name on every phone browser.
    try { const cs = () => { const r = b.getBoundingClientRect(); const st = getComputedStyle(b); const h = r.height ? r.height + (parseFloat(st.marginTop) || 0) + (parseFloat(st.marginBottom) || 0) : 0; document.documentElement.style.setProperty("--a2hsh", Math.round(h) + "px"); };
      cs(); if (window.ResizeObserver) new ResizeObserver(cs).observe(b); addEventListener("resize", cs); addEventListener("appinstalled", () => document.documentElement.style.setProperty("--a2hsh", "0px")); } catch {}
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const iosSteps = '<ol class="a2steps"><li>Tap the <b>Share</b> button (the square with the arrow) at the bottom of Safari.</li><li>Scroll down and tap <b>Add to Home Screen</b>.</li><li>Tap <b>Add</b>, then open Lumi from your Home Screen and sign in once.</li></ol>';
    const andSteps = '<ol class="a2steps"><li>Tap the <b>&#8942;</b> menu at the top right of Chrome.</li><li>Tap <b>Add to Home screen</b> or <b>Install app</b>.</li><li>Tap <b>Install</b>, then open Lumi from your Home Screen and sign in once.</li></ol>';
    b.onclick = async () => {
      if (deferred) { try { deferred.prompt(); await deferred.userChoice; } catch {} deferred = null; return; }
      sheet('<h2>Save Lumi to your phone</h2><p class="muted">It opens full screen from your Home Screen, like any other app.</p>'
        + '<h3>' + (ios ? "iPhone" : "Android") + '</h3>' + (ios ? iosSteps : andSteps)
        + '<h3>' + (ios ? "Android" : "iPhone") + '</h3>' + (ios ? andSteps : iosSteps)
        + '<button class="btn primary block" id="a2ok" type="button">Got it</button>');
      const ok = document.getElementById("a2ok"); if (ok) ok.onclick = () => { try { closeSheet(); } catch {} };
    };
  } catch {}
})();
