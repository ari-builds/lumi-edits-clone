
/* [M5 Max MBP] 2026-10-05 18:5x PDT notes2 agent, Nick TG 18:08: "I can't be playing music when I get into the app. I want my music to work
   outside of the app while I'm browsing in the app." The app never takes the phone's audio on its own:
   1. navigator.audioSession.type = "ambient" before any video exists (Safari 16.4+/iOS 17 Audio Session API): our media MIXES with
      Spotify / Apple Music instead of interrupting it. Every autoplay video is also muted + playsinline (mascot, previews, looks).
   2. Sound only after a tap: a video may play unmuted only within 4 s of a real tap or key press (the reel's play button, Sound on
      in Your footage, a player's own controls). Anything else that starts unmuted is muted on the spot.
   3. When the client DOES tap to hear a reel, the session becomes "playback" (sound even on silent mode, like any video app), and
      it goes back to "ambient" the moment nothing audible is playing, so their music can come back.
   No AudioContext, <audio>, speechSynthesis or notification sound exists in this app; keep it that way (they take the session). */
(function lumiAudio() {
  var as = navigator.audioSession, tapAt = 0;
  var set = function (t) { try { if (window.lumiRec) return; if (as && as.type !== t) as.type = t; } catch (e) {} };   // FL106REC: never flip the session while the mic is recording
  // FL106REC [M5 Max MBP] 2026-11-01 (Nick's iPhone: "InvalidStateError, home screen app"): iPhone refuses the microphone while the session is
  // "ambient" or "playback". Recording asks for "play-and-record" and holds it until the mic is released, then goes back to "ambient".
  window.lumiRecOn = function () { window.lumiRec = true; try { if (as) as.type = "play-and-record"; } catch (e) {} };
  window.lumiRecOff = function () { window.lumiRec = false; try { if (as) as.type = "ambient"; } catch (e) {} };
  set("ambient");
  window.lumiSound = function (on) { if (on) tapAt = Date.now(); set(on ? "playback" : "ambient"); };
  var mark = function () { tapAt = Date.now(); };
  document.addEventListener("pointerdown", mark, true); document.addEventListener("keydown", mark, true); document.addEventListener("touchend", mark, true);
  var audible = function () { var vs = document.querySelectorAll("video"); for (var i = 0; i < vs.length; i++) if (!vs[i].paused && !vs[i].muted) return true; return false; };
  document.addEventListener("play", function (e) { var v = e.target; if (!v || v.tagName !== "VIDEO") return;
    if (!v.muted && Date.now() - tapAt > 4000) { v.muted = true; v.setAttribute("muted", ""); }
    set(audible() ? "playback" : "ambient"); }, true);
  var calm = function () { setTimeout(function () { if (!audible()) set("ambient"); }, 50); };
  document.addEventListener("pause", calm, true); document.addEventListener("ended", calm, true); document.addEventListener("emptied", calm, true);
  document.addEventListener("volumechange", function (e) { var v = e.target; if (v && v.tagName === "VIDEO") set(audible() ? "playback" : "ambient"); }, true);
  document.addEventListener("visibilitychange", function () { if (document.hidden) { var vs = document.querySelectorAll("video"); for (var i = 0; i < vs.length; i++) if (!vs[i].muted && !vs[i].paused) try { vs[i].pause(); } catch (e) {} set("ambient"); } });
})();
