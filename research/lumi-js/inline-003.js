
/* LOOKS183C [M5 Max MBP] 2026-11-07 (Nick TG 23531: "Let's have the default for females pop up on different ones: Clean Girl, Strawberry, and
   Matcha. For guys let's have all the different ones. There should be an indicator showing them where they can change their look").
   (1) Someone with no saved look gets a default once their account loads: women one of Clean Girl / Strawberry / Matcha, men one of the others,
   picked from a hash of the account email so it never changes visit to visit. The app has no gender field, so it is guessed from the first name
   with a small built-in list; an unknown name keeps Classic. A look the person chose (saved lumi_look) or a ?look= preview is never touched.
   The guess is never shown anywhere. (2) A one-time hint next to the header look button, gone on tap or once the picker opens. */
(function () {
  var F = "abigail ada adriana aisha alejandra alexa alexandra alexis alice alicia alina alisha alison allison alyssa amanda amber amelia amira amy ana anastasia andrea angela angelina anika anita ann anna anne annie april aria ariana ariel ashley aubrey audrey ava ayesha bailey barbara beatriz bella beth bethany betty bianca brenda brianna bridget brittany brooke caitlin camila carla carmen carol caroline carolina cassandra catherine charlotte chelsea cheryl chloe christina cindy claire clara claudia courtney crystal daisy dana daniela danielle deborah denise destiny diana diane dolores donna dorothy eleanor elena eliza elizabeth ella ellie emily emma erica erin esther eva evelyn faith fatima fernanda fiona florence frances gabriela gabrielle gemma georgia gianna grace gloria hailey hannah harper hazel heather helen holly isabel isabella isabelle ivy jacqueline jade jana jane janet janice jasmine jenna jennifer jessica jill joan jocelyn jodie josephine joy joyce juanita judith judy julia juliana julie kaitlyn karen kate katelyn katherine kathleen kathryn katie kayla kelly kendra kimberly kristen kylie laila laura lauren layla leah leila lena leslie lily linda lindsay lisa lola lorena lori lucia lucy luna lydia madeline madison maria mariam mariana marie marilyn marisa martha mary maya megan melanie melissa mia michelle mila milena miranda molly monica nadia naomi natalia natalie nevaeh nicole nina noor nora olivia paige pamela patricia paula penelope phoebe pooja priya rachel rebecca regina riley rosa rose ruby ruth sabrina sadie samantha sandra sara sarah savannah scarlett selena serena shannon sharon shreya sienna sofia sophia sophie stella stephanie susan sydney tamara tanya taylor teresa tiffany valentina valeria vanessa veronica victoria violet vivian wendy whitney yasmin yolanda zainab zara zoe zoey";
  var M = "aaron abdul abdullah adam adrian ahmed aiden alan alberto alejandro alex alexander ali amir andre andrew angel anthony antonio arjun arthur austin benjamin blake bradley brandon brian bruce bryan caleb cameron carlos carter charles chris christian christopher cody colin connor craig daniel darius david dean dennis derek diego dominic dylan eduardo edward elijah eric ethan evan felix fernando francisco frank gabriel gary george gerald gregory hamza harry hassan henry hector hunter ian isaac ivan jack jackson jacob jake james jared jason javier jayden jeffrey jeremy jesse jesus joe joel john jonathan jordan jorge jose joseph joshua juan julian justin karan kenneth kevin khalid kyle larry leo leonardo liam logan lorenzo louis lucas luis luke malik manuel marco marcus mario mark martin mason mateo matthew max michael miguel mike mohamed mohammad mohammed muhammad nathan nicholas nick noah oliver omar oscar owen pablo patrick paul pedro peter rahul ramon raj ricardo richard robert roberto rohan ryan sabbir samuel scott sean sebastian sergio seth shane simon stephen steven thomas timothy tom tony travis tristan tyler victor vikram vincent walter wayne william wyatt xavier yusuf zachary zain";
  var FS = {}, MS = {}; F.split(" ").forEach(function (n) { FS[n] = 1; }); M.split(" ").forEach(function (n) { MS[n] = 1; });
  var HER = ["cleangirl", "strawberry", "matcha"], HIM = ["classic", "dojo", "clay", "golden", "silentpower", "everybody"];   /* GLASSOUT194 */
  function saved() { try { return localStorage.getItem("lumi_look"); } catch (e) { return "x"; } }
  function preview() { try { return !!new URLSearchParams(location.search).get("look"); } catch (e) { return false; } }
  function hash(s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h; }
  function apply(k) { var d = document.documentElement; if (d.dataset.look === k) return;
    try { window.lumiLookFont && lumiLookFont(k); } catch (e) {} d.dataset.look = k;
    try { window.lumiAppearance && lumiAppearance.re && lumiAppearance.re(); } catch (e) {} try { window.lk183Swap && lk183Swap(); } catch (e) {} }
  /* FXLOOKS194 [M5 Max MBP] 2026-11-10 11:40 PM PST (Nick TG 24171: "Can you have Everybody Knows be the default look for Lumi for guys? Maybe for
     girls it could be Strawberry and Golden Hour as well"). Only for someone who never picked a look themselves, never with a ?look= preview, never
     while a Make it mine theme is on. Two stages, each can set the look once:
       n  before any footage: the first-name list above. A name only on the first list opens in Strawberry or Golden Hour (fixed per account by
          a hash of the email), every other name and every unknown name opens in Everybody Knows.
       f  once the Mac has looked at the account's own footage it may send data.look194 = {k: "everybody" | "strawberry" | "golden"} (person194.py,
          sent only when it is sure). That replaces a stage n look once, then nothing automatic ever changes the look again.
     lumi_look_auto remembers the stage and the look it set ("n:strawberry", "f:golden"); "0" = the person chose (the picker and Make it mine set it).
     The old value "1" (LOOKS183C / EVERYBODY193) counts as stage n only while the saved look is still Everybody Knows. Nothing here is ever shown
     as text. Off switch: LOOK194_ON = false gives the EVERYBODY193 behaviour back (one default for everyone). */
  var LOOK194_ON = true, HER194 = ["strawberry", "golden"];
  function autoMark() { try { return localStorage.getItem("lumi_look_auto") || ""; } catch (e) { return "0"; } }
  function themeOn(data) { try { if (document.documentElement.dataset.theme194 || localStorage.getItem("lumi_theme194")) return true; } catch (e) {}
    var t = data && data.theme194; return !!(t && t.answers && !t.cleared); }
  window.lk183cDefault = function (data) {
    if (!data || data.guest || preview()) return;
    var em = String((data.account || {}).email || "").toLowerCase(); if (!em) return;
    var sv = saved(), mk = autoMark(), k, st;
    if (!LOOK194_ON) { if (sv) return; k = "everybody"; try { localStorage.setItem("lumi_look", k); localStorage.setItem("lumi_look_auto", "1"); } catch (e) {} apply(k); return; }
    if (themeOn(data)) return;
    var stage = !sv ? "" : mk === "n:" + sv ? "n" : mk === "f:" + sv ? "f" : (mk === "1" && sv === "everybody") ? "old" : "own";
    if (stage === "own" || stage === "f") return;
    var hint = data.look194 && /^(everybody|strawberry|golden)$/.test(String(data.look194.k || "")) ? data.look194.k : "";
    if (hint) { k = hint; st = "f"; }
    else { if (stage === "n") return;
      var first = String(data.name || data.full_name || "").trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z]/g, "");
      k = FS[first] && !MS[first] ? HER194[hash(em) % HER194.length] : "everybody"; st = "n"; }
    try { localStorage.setItem("lumi_look", k); localStorage.setItem("lumi_look_auto", st + ":" + k); } catch (e) {}
    if (k !== sv) apply(k);
  };
  /* the hint: one line beside the look button, in the look's own colors; gone for good on tap or when the picker opens */
  function hintDone() { try { localStorage.setItem("lumi_lookhint", "1"); } catch (e) {} var h = document.getElementById("lkhint"); if (h) h.remove(); }
  window.lk183cHint = function () {
    try { if (localStorage.getItem("lumi_lookhint")) return; } catch (e) { return; }
    var b = document.getElementById("looktog"); if (!b || document.getElementById("lkhint") || !b.getClientRects().length) return;
    var h = document.createElement("button"); h.type = "button"; h.id = "lkhint"; h.className = "lkhint";
    h.innerHTML = '<span>Change look</span><i aria-hidden="true"></i>'; h.setAttribute("aria-label", "Change your look");
    /* LOOKHINT194 [M5 Max MBP] 2026-11-10 8:45 AM PST (Beth: "when I click Change my look, nothing happens. The button disappears and the look
       stays the same"): the hint only dismissed itself. A tap on it now opens the look picker, the same as tapping the look button. */
    h.onclick = function (e) { e.stopPropagation(); hintDone(); try { b.click(); } catch (x) {} };
    document.body.appendChild(h);
    var place = function () { var r = b.getBoundingClientRect(), w = h.offsetWidth, lg = document.querySelector("header.top .logo"), lr = lg ? lg.getBoundingClientRect().right : 0;
      if (r.left - w - 8 >= lr + 8) { h.classList.remove("below"); h.style.top = Math.round(r.top + r.height / 2 - h.offsetHeight / 2) + "px"; h.style.left = Math.round(r.left - w - 8) + "px"; }
      else { h.classList.add("below"); h.style.top = Math.round(r.bottom + 8) + "px"; h.style.left = Math.max(8, Math.round(r.left + r.width / 2 - w + 18)) + "px"; } };
    place(); addEventListener("resize", place, { passive: true });
    b.addEventListener("click", hintDone, { once: true });
  };
})();
