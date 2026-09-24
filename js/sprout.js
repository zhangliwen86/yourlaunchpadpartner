/* ============================================================
   SPROUT.JS — Sprout chat widget behaviour.

   Source: Sprout-Chatbot-Widget.zip / sprout-chatbot-widget.html,
   split into sprout.css + sprout.js for the YLPP integration (the
   install guide's stated preference is to paste the whole snippet
   as one unit; splitting it is explicitly authorised for this
   integration -- see the Prompt 2 brief -- because the site already
   loads its own CSS/JS as separate shared files per page, and a
   third inline <style>/<script> block on every page would be the
   odd one out, plus it's what let the CSS scoping fix below happen
   without duplicating the whole stylesheet).

   Scope discipline: every DOM query in this file is anchored to
   #ylpp-sprout-root or its descendants. The only globals this file
   creates are window.__SPROUT_DEMO__ (read, never written here --
   it's a manual opt-in flag a developer can set in the console
   before this script runs) and nothing else; everything else lives
   inside the IIFE below.

   Privacy: this widget never calls fetch/XMLHttpRequest, never
   touches localStorage/sessionStorage/cookies, never writes chat
   text into a URL, and never dispatches any analytics event
   (including generate_lead -- that stays exclusively the contact
   form's, in js/forms.js, on a real successful submission; nothing
   in this file may ever call window.gtag or dispatch a
   generate_lead-shaped event, opening the chat and clicking a link
   inside it are not leads). Every message bubble is rendered with
   textContent, never innerHTML, so nothing a visitor types is ever
   parsed as markup -- an HTML-looking message displays literally.
   ============================================================ */
(function(){
  "use strict";

  var DEMO = !!window.__SPROUT_DEMO__;
  var BASE = ""; /* left empty: the widget deploys at the site's own domain root, not off-site. */

  var LINKS = {
    contact: BASE + "/contact/",
    contactAccounting: BASE + "/contact/?interest=accounting",
    contactGrants: BASE + "/contact/?interest=grants",
    contactAutomation: BASE + "/contact/?interest=automation",
    contactWorkshop: BASE + "/contact/?interest=workshop",
    workshop: BASE + "/workshop/",
    showcase: BASE + "/showcase/",
    about: BASE + "/about/",
    services: BASE + "/services/"
  };

  function mainMenuChips(){
    return [
      { label: "Accounting & bookkeeping", intent: "accounting" },
      { label: "Grants & funding", intent: "grants" },
      { label: "Automation & AI", intent: "automation" },
      { label: "Website workshop", intent: "workshop" },
      { label: "Not sure yet", intent: "notsure" }
    ];
  }

  var GREETINGS = [
    "Hi, I'm Sprout 🌱 — your Launchpad buddy. I can point you toward the right support, or get you straight through to Liwen and Min En via the contact form. What's on your mind?",
    "Hey there! I'm Sprout, the friendly front door to Your Launchpad Partner. What's going on in your business right now?"
  ];

  var FALLBACKS = [
    "I want to make sure I point you the right way rather than guess. Here's what I can help with:",
    "I'm best with questions about accounting, grants & funding, automation, or the website workshop. Want to pick one?"
  ];

  function pick(arr){ return arr[Math.floor(Math.random() * arr.length)]; }

  /* ---------- canned responses ----------
     Audited against the live site's own copy (About, Services,
     Workshop, Showcase, Contact) as part of this integration:
       - "showcase" below was corrected -- the original text called
         the showcase examples "a few example sites from past
         workshops", which reads as workshop participants' own
         projects. The Showcase page itself is explicit that these
         are fictional demonstration businesses, not client work,
         not testimonials, and not workshop participant work, and
         Sprout has to say the same thing rather than contradict it.
       - "workshop" (price, format, group size), "workshop_included",
         "workshop_who", "about" (Liwen/Min En's backgrounds), and
         "grants" (no guaranteed approval, not the applicant of
         record) were checked line-for-line against workshop/,
         about/ and services/ and match; nothing here invents a
         service, guarantee, availability, statistic or claim the
         website itself doesn't already make.
       - No response claims a human reads the chat itself, promises
         a transcript will be forwarded, or implies the team sees
         anything typed into Sprout -- "leadinfo" and "contact"
         below both route to the real contact form instead. */
  var RESPONSES = {

    menu: function(){
      return {
        texts: ["Here's where most people start — pick whichever sounds closest, or just type your question:"],
        chips: mainMenuChips()
      };
    },

    accounting: function(){
      return {
        texts: [
          "We help get your numbers in order — bookkeeping, accounting records, accounts preparation and financial reporting.",
          "The point isn't just tidy books. It's understanding what they're actually telling you, so decisions get easier."
        ],
        chips: [
          { label: "Talk about accounting →", href: LINKS.contactAccounting },
          { label: "Back to menu", intent: "menu" }
        ]
      };
    },

    grants: function(){
      return {
        texts: [
          "Not sure what support you might qualify for? That's exactly where we start — exploring what's relevant, checking eligibility, and helping prepare an application where it makes sense.",
          "Worth being upfront: we don't guarantee approval or funding, and we're not the applicant on record — we help you work through the process honestly."
        ],
        chips: [
          { label: "Talk about grants & funding →", href: LINKS.contactGrants },
          { label: "Back to menu", intent: "menu" }
        ]
      };
    },

    automation: function(){
      return {
        texts: [
          "If you're doing the same manual task every week — updating spreadsheets, copying data between systems — there's often a better way.",
          "We look at the actual work first, then decide whether automation or AI genuinely helps. We're not an AI vendor pushing tech for its own sake."
        ],
        chips: [
          { label: "Talk about automation & AI →", href: LINKS.contactAutomation },
          { label: "Back to menu", intent: "menu" }
        ]
      };
    },

    workshop: function(){
      return {
        texts: [
          "Our Website Workshop is a small-group, one-day, hands-on session over Zoom — SGD 699 per participant, 3 to 5 people per group.",
          "You build a real website for your own business using Claude and Pepita, and leave knowing how to keep it running yourself. Not a generic AI webinar."
        ],
        chips: [
          { label: "What's included?", intent: "workshop_included" },
          { label: "Who's it for?", intent: "workshop_who" },
          { label: "Register interest →", href: LINKS.contactWorkshop },
          { label: "See the showcase →", href: LINKS.showcase },
          { label: "Back to menu", intent: "menu" }
        ]
      };
    },

    workshop_included: function(){
      return {
        texts: ["Your SGD 699 covers your seat in the one-day workshop, hands-on guidance throughout, and support going live plus learning to maintain the site afterwards."],
        chips: [
          { label: "Back to workshop", intent: "workshop" },
          { label: "Back to menu", intent: "menu" }
        ]
      };
    },

    workshop_who: function(){
      return {
        texts: [
          "Good fit: Singapore SME owners, freelancers, small business operators and non-technical founders who want a real, working website.",
          "Less of a fit: experienced developers, or anyone wanting a full agency to build everything for them."
        ],
        chips: [
          { label: "Back to workshop", intent: "workshop" },
          { label: "Back to menu", intent: "menu" }
        ]
      };
    },

    showcase: function(){
      return {
        texts: ["The showcase has a few example sites — a consultancy, a café, a creative studio and a collector-toy store. They're fictional demonstration businesses built to show what the workshop produces, not client projects, testimonials, or past workshop participants' own work."],
        chips: [
          { label: "See the showcase →", href: LINKS.showcase },
          { label: "Back to menu", intent: "menu" }
        ]
      };
    },

    about: function(){
      return {
        texts: ["Your Launchpad Partner is run by Liwen, a Chartered Accountant in Singapore and former CFO, and Min En, who brings a background in financial planning & analysis and builds the automation that makes the numbers useful day to day."],
        chips: [
          { label: "Read more →", href: LINKS.about },
          { label: "Back to menu", intent: "menu" }
        ]
      };
    },

    notsure: function(){
      return {
        texts: [
          "Totally fine — most people start here. You don't need to know exactly which service fits.",
          "Tell me a bit about what's going on, or pick whichever sounds closest:"
        ],
        chips: mainMenuChips()
      };
    },

    pricing: function(){
      return {
        texts: ["The website workshop is a flat SGD 699 per participant. Accounting, grants and automation work vary business to business — the quickest way to get a straight answer is to tell the team what's going on."],
        chips: [
          { label: "Talk to us →", href: LINKS.contact },
          { label: "Back to menu", intent: "menu" }
        ]
      };
    },

    contact: function(){
      return {
        texts: ["Happy to point you to the team. This chat itself isn't monitored, so the best way to reach Liwen and Min En is through the contact form — no polished plan needed, just tell them what's going on."],
        chips: [
          { label: "Talk to us →", href: LINKS.contact }
        ]
      };
    },

    leadinfo: function(){
      return {
        texts: ["Thanks for sharing that — this chat isn't monitored by the team, so to make sure it actually reaches Liwen and Min En, please send it through the contact form directly."],
        chips: [
          { label: "Talk to us →", href: LINKS.contact },
          { label: "Back to menu", intent: "menu" }
        ]
      };
    },

    location: function(){
      return {
        texts: ["We're based in Singapore and work with Singapore SME owners, freelancers and small business operators."],
        chips: [ { label: "Back to menu", intent: "menu" } ]
      };
    },

    meta: function(){
      return {
        texts: ["I'm Sprout — an automated assistant with a fixed set of scripted answers, not a real person and not AI-generated on the fly. I can point you in the right direction and answer the basics; for anything specific to your business, Liwen or Min En take it from there via the contact form."],
        chips: [
          { label: "Talk to a human →", href: LINKS.contact },
          { label: "Back to menu", intent: "menu" }
        ]
      };
    },

    thanks: function(){
      return {
        texts: ["You're welcome! 🌱 Anything else I can help with?"],
        chips: mainMenuChips()
      };
    },

    bye: function(){
      return {
        texts: ["Take care! If anything else comes up, I'll be right here. 👋"],
        chips: []
      };
    },

    fallback: function(){
      return {
        texts: [pick(FALLBACKS)],
        chips: mainMenuChips()
      };
    }
  };

  var INTENT_DEFS = [
    { id: "leadinfo", regex: /[^\s@]+@[^\s@]+\.[a-z]{2,}|\b(\+?\d[\d\s-]{7,}\d)\b/i },
    { id: "meta", keywords: ["are you ai","are you a bot","are you real","are you human","is this ai","is this a bot","virtual assistant","are you a real person"] },
    { id: "workshop_included", keywords: ["what's included","whats included","what do i get","included in the price"] },
    { id: "workshop_who", keywords: ["who is it for","who's it for","suitable for","is it for me","good fit for"] },
    { id: "workshop", keywords: ["website","web site","webpage","web page","workshop","build a site","build a website","web design","landing page","pepita","online presence"] },
    { id: "accounting", keywords: ["accounting","account","accounts","bookkeeping","bookkeeper","books","invoice","invoices","reconcile","reconciliation","financial statement","financial statements","financial reporting","gst","iras","acra","xero","quickbooks","payroll","ledger","balance sheet","profit and loss","numbers"] },
    { id: "grants", keywords: ["grant","grants","funding","fund","subsidy","subsidies","psg","edg","enterprise development grant","productivity solutions grant","government support","eligible","eligibility","co-funding","cofunding"] },
    { id: "automation", keywords: ["automation","automate","automating","ai","artificial intelligence","workflow","workflows","zapier","integration","manual work","repetitive","spreadsheet","chatbot","copying data","streamline","efficiency"] },
    { id: "pricing", keywords: ["price","pricing","cost","how much","fee","fees","rate","rates"] },
    { id: "showcase", keywords: ["showcase","examples","portfolio","past work","see examples"] },
    { id: "about", keywords: ["who are you","team","founder","founders","liwen","min en","about you","who runs this","who owns"] },
    { id: "location", keywords: ["where are you","where is your office","location","based in singapore","office in singapore"] },
    { id: "contact", keywords: ["talk to","speak to","human","real person","contact","email you","call you","get in touch","reach you","talk to someone","talk to the team","talk to a person"] },
    { id: "notsure", keywords: ["not sure","dont know","do not know","don't know","no idea","unsure","something else","not certain"] },
    { id: "thanks", keywords: ["thank you","thanks","thank","appreciate it","cheers"] },
    { id: "bye", keywords: ["bye","goodbye","see you","that's all","thats all","gtg"] },
    { id: "greeting", keywords: ["hi","hello","hey","yo","good morning","good afternoon","good evening"] }
  ];

  function normalize(s){
    return s.toLowerCase().replace(/[^a-z0-9@.+\s-]/g, " ").replace(/\s+/g, " ").trim();
  }

  function scoreKeywords(text, keywords){
    var s = 0;
    for (var i = 0; i < keywords.length; i++){
      var kw = keywords[i];
      if (kw.indexOf(" ") > -1){
        if (text.indexOf(kw) > -1) s += 2;
      } else {
        var re = new RegExp("\\b" + kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b");
        if (re.test(text)) s += 1;
      }
    }
    return s;
  }

  function detectIntent(raw){
    var text = normalize(raw);
    if (!text) return null;
    var best = null, bestScore = 0;
    for (var i = 0; i < INTENT_DEFS.length; i++){
      var def = INTENT_DEFS[i];
      var s = 0;
      if (def.regex){
        s = def.regex.test(raw) ? 3 : 0;
      } else {
        s = scoreKeywords(text, def.keywords);
      }
      if (s > bestScore){ bestScore = s; best = def.id; }
    }
    return best;
  }

  /* ================================================================
     GUARDED INITIALIZER
     Every element this widget needs is looked up up front. If any
     required node is missing (a future template edit strips one, a
     conflicting script/extension mangles the DOM, this file loads on
     a page without the widget markup at all) initialisation stops
     and every remaining visible control is hidden, rather than
     leaving a launcher on screen that opens onto a broken panel, or
     a panel with a send button wired to nothing. This never throws
     out of the IIFE -- the rest of the page (forms.js, GA4, the
     rest of the site's own scripts) must keep working regardless of
     what happens in here.
     ================================================================ */
  (function init(){
    try {
      var root = document.getElementById("ylpp-sprout-root");
      if (!root) return; // widget markup not present on this page at all

      /* ---- P3-2 (Round 2 correction): scope required-node lookups ----
         Round 1 queried every widget control by document-wide
         getElementById. That already worked (the IDs are unique on
         the page), but a reviewer finding asked that discovery be
         scoped to the widget's own root wherever practical, so a
         future page that accidentally duplicates one of these IDs
         outside the widget can't be picked up by mistake. root is
         itself found by ID (there's nothing to scope that lookup
         to), but everything else is now found underneath it. This
         introduces no new globals and no cross-page coupling --
         root.querySelector behaves identically to
         document.getElementById for a unique id, just scoped. */
      var launcher = root.querySelector("#ylpp-sprout-launcher");
      var panel = root.querySelector("#ylpp-sprout-panel");
      var messagesEl = root.querySelector("#ylpp-sprout-messages");
      var form = root.querySelector("#ylpp-sprout-form");
      var input = root.querySelector("#ylpp-sprout-input");
      var minBtn = root.querySelector("#ylpp-sprout-min");
      var badge = root.querySelector("#ylpp-sprout-badge");
      var disclosure = root.querySelector("#ylpp-sprout-disclosure");
      var fallbackEl = root.querySelector("#ylpp-sprout-fallback");
      var teaser = root.querySelector("#ylpp-sprout-teaser");
      var teaserOpen = root.querySelector("#ylpp-sprout-teaser-open");
      var teaserDismiss = root.querySelector("#ylpp-sprout-teaser-dismiss");
      var toastEl = root.querySelector("#ylpp-sprout-toast");
      var footer = root.querySelector("#ylpp-sprout-footer"); // optional (normal density only)
      var header = root.querySelector("#ylpp-sprout-header");

      /* Round 5: the header, the disclosure and the fallback card are
         required too -- the composer must never be offered without the
         disclosure, and the shell must always have a safe fallback. */
      var required = [launcher, panel, header, messagesEl, disclosure, form, input, minBtn, fallbackEl];
      for (var i = 0; i < required.length; i++){
        if (!required[i]){
          root.classList.add("sp-init-failed");
          return; // a required control is missing -- hide the whole widget rather than half-work
        }
      }

      /* ---- P3-1 (Round 2 correction): fail closed if sprout.css didn't load ----
         sprout.css sets #ylpp-sprout-root{position:fixed;...} unconditionally.
         If the stylesheet is blocked/fails to load, the root falls back to
         its unstyled default (position:static as part of normal document
         flow) and the panel/launcher render as bare, unstyled, but still
         fully interactive controls sitting in the page flow -- exactly the
         "widget must not interfere with navigation/keyboard/contact form"
         failure mode the reviewer flagged. We can't rely on a CSS rule to
         hide this (the stylesheet that would contain it is the very thing
         that's missing), so this checks the one property our real
         stylesheet is guaranteed to set, and if it's absent, hides the
         widget with an inline style (which always applies regardless of
         external CSS) and stops before wiring up any interactive behaviour. */
      var computedPosition = window.getComputedStyle ? window.getComputedStyle(root).position : "";
      if (computedPosition !== "fixed"){
        root.style.setProperty("display", "none", "important");
        return; // sprout.css did not load -- leave the YLP page exactly as it is without it
      }

      var hasOpened = false;
      var toastTimer = null;
      var teaserDismissed = false;

      /* ---- reduced motion: initial value + live updates ----
         Read once at load, then kept current for as long as the
         page stays open via a matchMedia change listener -- a
         visitor (or a screen-reader demo, or someone testing their
         own OS setting) can toggle "reduce motion" while the tab is
         open and the idle fidgets / pop-ins stop immediately rather
         than only on next load. */
      var reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
      function applyReducedMotionClass(){
        root.classList.toggle("sp-reduced-motion", reduceMotion);
      }
      applyReducedMotionClass();
      if (window.matchMedia){
        var rmQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
        var onReduceMotionChange = function(ev){
          reduceMotion = ev.matches;
          applyReducedMotionClass();
          if (reduceMotion){
            clearTimeout(idleTimer);
          } else {
            resetIdleTimer();
          }
        };
        if (typeof rmQuery.addEventListener === "function"){
          rmQuery.addEventListener("change", onReduceMotionChange);
        } else if (typeof rmQuery.addListener === "function"){
          // Safari < 14 / older WebViews
          rmQuery.addListener(onReduceMotionChange);
        }
      }

      /* ---- the visible band (Round 6): one authoritative available height ----
         The part of the layout viewport the visitor can actually see right
         now. Where the browser reports a valid VisualViewport (finite,
         positive height; finite offsetTop) that is
         [offsetTop, offsetTop + height] in layout-viewport coordinates --
         e.g. the area above an on-screen keyboard. Otherwise it is the
         whole layout viewport. Round 5 used this only for the fullscreen
         (<=480px) layout; floating layouts measured the layout viewport,
         so a reduced visual viewport could leave a "fitting" floating
         panel partly out of sight.
         Now both layouts ANCHOR to the band (sprout.css reads the three
         custom properties below: fullscreen fills it, a floating panel
         lifts its bottom offset above it) and syncShell() MEASURES against
         the same band -- one calculation, no separate floating/fullscreen
         logic, no double-subtraction (the root's own position already
         includes the inset, and the band's top is the only other bound). */
      function layoutViewportHeight(){
        return document.documentElement.clientHeight || window.innerHeight;
      }
      function visibleBand(){
        var lh = layoutViewportHeight();
        var vv = window.visualViewport;
        if (vv && isFinite(vv.height) && vv.height > 0 && isFinite(vv.offsetTop)){
          var top = Math.max(0, vv.offsetTop);
          var bottom = Math.min(lh, vv.offsetTop + vv.height);
          if (bottom > top) return { top: top, bottom: bottom };
        }
        return { top: 0, bottom: lh };
      }
      function syncVisibleBand(){
        var band = visibleBand();
        root.style.setProperty("--sp-vv-top", band.top + "px");
        root.style.setProperty("--sp-vvh", (band.bottom - band.top) + "px");
        root.style.setProperty("--sp-vv-bottom-inset", Math.max(0, layoutViewportHeight() - band.bottom) + "px");
      }
      if (window.visualViewport){
        var onVisualViewportChange = function(){
          syncVisibleBand();
          if (!panel.hidden) syncShell();
        };
        window.visualViewport.addEventListener("resize", onVisualViewportChange);
        window.visualViewport.addEventListener("scroll", onVisualViewportChange);
      }
      syncVisibleBand();

      function showToast(msg){
        if (!toastEl) return;
        toastEl.textContent = msg;
        toastEl.classList.add("sp-show");
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(function(){ toastEl.classList.remove("sp-show"); }, 2200);
      }

      function scrollToBottom(){
        messagesEl.scrollTop = messagesEl.scrollHeight;
      }

      function addRow(role, buildInner){
        var row = document.createElement("div");
        row.className = "sp-row sp-" + role;
        var bubble = document.createElement("div");
        bubble.className = "sp-bubble";
        buildInner(bubble);
        row.appendChild(bubble);
        messagesEl.appendChild(row);
        scrollToBottom();
        return row;
      }

      function addUserText(text){
        // textContent only -- never innerHTML. An HTML-looking message
        // (e.g. "<script>alert(1)</script>") renders as literal text.
        addRow("user", function(bubble){ bubble.textContent = text; });
      }

      function addBotText(text){
        addRow("bot", function(bubble){ bubble.textContent = text; });
      }

      function addTyping(){
        var row = document.createElement("div");
        row.className = "sp-row sp-bot sp-typing";
        var bubble = document.createElement("div");
        bubble.className = "sp-bubble";
        for (var j = 0; j < 3; j++){
          var dot = document.createElement("span");
          dot.className = "sp-tdot";
          bubble.appendChild(dot);
        }
        row.appendChild(bubble);
        messagesEl.appendChild(row);
        scrollToBottom();
        return row;
      }

      function addChips(chips){
        if (!chips || !chips.length) return;
        var row = document.createElement("div");
        row.className = "sp-row sp-bot";
        var wrap = document.createElement("div");
        wrap.className = "sp-chiprow";
        wrap.style.maxWidth = "94%";
        chips.forEach(function(chip){
          var el;
          if (chip.href){
            el = document.createElement("a");
            el.href = chip.href;
            el.className = "sp-chip sp-chip-solid";
            el.addEventListener("click", function(ev){
              if (DEMO){
                ev.preventDefault();
                showToast("On the live site this opens: " + chip.href);
              }
            });
          } else {
            el = document.createElement("button");
            el.type = "button";
            el.className = "sp-chip sp-chip-ghost";
            el.addEventListener("click", function(intentId, label){
              return function(){
                addUserText(label);
                respond(intentId);
              };
            }(chip.intent, chip.label));
          }
          el.textContent = chip.label; // textContent, never innerHTML
          wrap.appendChild(el);
        });
        row.appendChild(wrap);
        messagesEl.appendChild(row);
        scrollToBottom();
      }

      /* ---- reply scheduling / race-condition guard ----
         respond() used to schedule its typing indicator + message
         timeouts unconditionally. If a visitor sent a second message
         while the first reply was still "typing" (well within reach
         for a quick, impatient typist, or repeated Enter presses),
         the two replies' timeouts could interleave: an earlier
         reply's chips could land after a later reply's text, or two
         typing indicators could both be live at once. respondGen is
         bumped on every new respond() call; each of that call's
         scheduled callbacks checks it still owns the current
         generation before touching the DOM, and bails out quietly
         (removing its own stray typing row, if any) if a newer
         respond() has since taken over. */
      var respondGen = 0;

      function respond(intentId){
        var handler = RESPONSES[intentId] || RESPONSES.fallback;
        var payload = handler();
        var myGen = ++respondGen;
        var typingRow = addTyping();
        var delay = 550 + Math.random() * 300;
        setTimeout(function(){
          if (myGen !== respondGen){
            if (typingRow.parentNode) typingRow.parentNode.removeChild(typingRow);
            return;
          }
          if (typingRow.parentNode) typingRow.parentNode.removeChild(typingRow);
          payload.texts.forEach(function(t, idx){
            setTimeout(function(){
              if (myGen !== respondGen) return;
              addBotText(t);
              if (idx === payload.texts.length - 1){
                addChips(payload.chips);
              }
            }, idx * 380);
          });
        }, delay);
      }

      /* ================================================================
         RESPONSIVE SHELL (Round 5 architecture)

         Rounds 2-4 kept one interface on screen at every viewport size
         and kept adjusting its inputs (a JS height budget, a panel
         scrollTop pin, moving the disclosure into the message log, three
         .sp-tight compression tiers) while overflow:hidden quietly
         clipped whatever still didn't fit. That clipping is exactly what
         produced a half-visible minimise button whose lower half was the
         page underneath (click-through), and a disclosure squeezed to a
         few pixels. Each fix moved the failure to a new height.

         Round 5 replaces all of that with one explicit decision, made in
         one place (syncShell below): given the room actually available,
         which of a small set of *complete* presentations fits?

           data-sp-density="normal"   full floating panel above the
                                      launcher (desktop), or full
                                      fullscreen chat (<=480px)
           data-sp-density="compact"  same chat, tighter chrome, no
                                      footer; on desktop the launcher
                                      gives up its slot so the panel
                                      can sit at the root's own offset
           data-sp-density="fallback" no chat at all -- a small, complete
                                      card: Sprout header + minimise,
                                      "not enough screen space", and a
                                      Contact us link
         If not even the fallback card fits, Sprout CLOSES for real
         (Round 6): panel [hidden], launcher aria-expanded="false", modal
         containment removed. There is no "open but nothing drawn" state
         -- if Sprout reports itself open, its minimise control is on
         screen and hit-testable, and Escape closes it.

         "Fits" is measured, never assumed (Round 6 box model): a state's
         requirement is the panel's own top+bottom border, plus the
         margin-box height of every fixed part that state shows (header,
         disclosure, composer, footer / fallback card), plus the message
         log's own padding and border AROUND its declared minimum usable
         content area (--sp-log-content-min / --sp-log-content-min-compact
         in sprout.css), plus a small FIT_MARGIN -- all read from computed
         styles as fractional px, never rounded offsetHeight. It is
         compared against the height from the top of the visible band to
         the panel's actual bottom edge in that state. The first state
         whose complete content fits wins. Because a state is
         only ever chosen when everything in it fits, nothing inside the
         panel is ever clipped, so the panel never needs to scroll or be
         pinned (sprout.css also uses overflow:clip, which cannot scroll
         at all). The width breakpoint (floating vs fullscreen, i.e.
         non-modal vs modal) stays a plain CSS media query; this function
         only ever decides density.
         ================================================================ */

      function isMobileLayout(){
        return !!(window.matchMedia && window.matchMedia("(max-width:480px)").matches);
      }

      function getFocusable(){
        var nodes = panel.querySelectorAll('button:not([disabled]), a[href], input:not([disabled])');
        return Array.prototype.filter.call(nodes, function(el){
          return el.offsetParent !== null || el === document.activeElement;
        });
      }

      /* A safe focus target must actually be visible/operable: [hidden],
         display:none (own or an ancestor's) and detached nodes all leave
         offsetParent null, and <body> is "nowhere in particular". (Round 2:
         focusing a hidden element is a silent no-op, which is how focus
         used to end up nowhere after opening via the teaser.) */
      function isFocusableNow(el){
        return !!el && el !== document.body && document.body.contains(el) && el.offsetParent !== null;
      }

      function isModalNow(){
        return panel.getAttribute("aria-modal") === "true";
      }

      /* Escape always closes. Tab/Shift+Tab wrap inside the panel only
         while it is modal (fullscreen, <=480px); on desktop the floating
         panel is non-modal and the page stays reachable. */
      function trapKeydown(ev){
        if (ev.key === "Escape"){
          ev.preventDefault();
          closePanel();
          return;
        }
        if (ev.key !== "Tab") return;
        if (!isModalNow()) return;
        var focusable = getFocusable();
        if (!focusable.length) return;
        var first = focusable[0];
        var last = focusable[focusable.length - 1];
        if (!panel.contains(document.activeElement)){
          ev.preventDefault();
          first.focus();
          return;
        }
        if (document.activeElement === panel){ // focus parked on the dialog container itself
          ev.preventDefault();
          (ev.shiftKey ? last : first).focus();
          return;
        }
        if (ev.shiftKey && document.activeElement === first){
          ev.preventDefault();
          last.focus();
        } else if (!ev.shiftKey && document.activeElement === last){
          ev.preventDefault();
          first.focus();
        }
      }

      var lastFocusedBeforeOpen = null;
      var DENSITIES = ["normal", "compact", "fallback"]; // tried in this order; if none fits, Sprout closes

      /* Added to every requirement so sub-pixel layout and rounding can
         never let a state be chosen 1-2px before it genuinely fits. */
      var FIT_MARGIN = 2;

      function px(v){
        var n = parseFloat(v);
        return isNaN(n) ? 0 : n;
      }
      function cssPx(name){
        return px(getComputedStyle(root).getPropertyValue(name));
      }

      /* Margin-box height of a part, from computed styles: fractional
         (no offsetHeight rounding) and independent of the panel's open
         animation transform. Every part is box-sizing:border-box (see the
         reset at the top of sprout.css), so computed height already
         includes its padding and border. 0 when the state hides it. */
      function boxHeight(el){
        var cs = getComputedStyle(el);
        if (cs.display === "none") return 0;
        return px(cs.height) + px(cs.marginTop) + px(cs.marginBottom);
      }

      /* Height from the top of the visible band (plus the floating top
         gap; 0 in fullscreen) down to where the panel's bottom edge sits
         in the density currently applied. The root is never transformed,
         so its rect is its real layout position; the panel's computed
         `bottom` is its offset above the root's bottom edge (94px above
         the launcher in floating normal, 0 otherwise). If that bottom
         edge is below the visible band, nothing can fit. */
      function availableHeight(){
        var band = visibleBand();
        var panelBottomEdge = root.getBoundingClientRect().bottom - px(getComputedStyle(panel).bottom);
        if (panelBottomEdge > band.bottom + 0.5) return -1;
        return panelBottomEdge - band.top - cssPx("--sp-top-gap");
      }

      /* Height the complete content of a density needs (see the box-model
         note in the header comment above). */
      function requiredHeight(density){
        var ps = getComputedStyle(panel);
        var h = px(ps.borderTopWidth) + px(ps.borderBottomWidth) + boxHeight(header);
        if (density === "fallback") return h + boxHeight(fallbackEl) + FIT_MARGIN;
        var ms = getComputedStyle(messagesEl);
        var logContentMin = cssPx(density === "normal" ? "--sp-log-content-min" : "--sp-log-content-min-compact");
        h += logContentMin
           + px(ms.paddingTop) + px(ms.paddingBottom)
           + px(ms.borderTopWidth) + px(ms.borderBottomWidth)
           + px(ms.marginTop) + px(ms.marginBottom);
        h += boxHeight(disclosure) + boxHeight(form);
        if (footer) h += boxHeight(footer); // 0 in compact, where it is hidden
        return h + FIT_MARGIN;
      }

      function preferredFocusTarget(){
        return root.getAttribute("data-sp-density") === "fallback" ? fallbackEl : input;
      }

      /* Where focus goes when the control it was on has just been hidden
         by a state change. In fallback: the fallback message (so the
         reason is announced). In a chat state: the dialog container, not
         the input -- programmatically focusing the input as a side effect
         of a resize could raise an on-screen keyboard, shrink the visual
         viewport and bounce the state straight back. */
      function strandedFocusTarget(){
        return root.getAttribute("data-sp-density") === "fallback" ? fallbackEl : panel;
      }

      /* A fixed-position Sprout element that is measurably not fully
         inside the visible band cannot be scrolled into view, so it is not
         a useful focus target. (No layout boxes at all = nothing to
         measure, e.g. a non-rendering test DOM: not treated as off screen.) */
      function measurablyOffScreen(el){
        if (!el.getClientRects().length) return false;
        var r = el.getBoundingClientRect(), band = visibleBand();
        return !(r.top >= band.top - 0.5 && r.bottom <= band.bottom + 0.5 && r.left >= -0.5 && r.right <= window.innerWidth + 0.5);
      }

      /* Returns true if Sprout is (still) open afterwards. */
      function syncShell(){
        if (panel.hidden) return false;
        syncVisibleBand();
        var focusWasInSprout = root.contains(document.activeElement);

        var chosen = null, avail = -1;
        if (!header.getClientRects().length){
          // No layout to measure (e.g. a non-rendering DOM such as a test
          // harness): a shown panel's header always has a box in a real
          // browser. Keep the default state rather than acting on zeros.
          root.setAttribute("data-sp-density", "normal");
          panel.setAttribute("aria-modal", isMobileLayout() ? "true" : "false");
          return true;
        }
        for (var i = 0; i < DENSITIES.length; i++){
          root.setAttribute("data-sp-density", DENSITIES[i]);
          avail = availableHeight();
          if (Math.floor(avail) >= Math.ceil(requiredHeight(DENSITIES[i]))){
            chosen = DENSITIES[i];
            break;
          }
        }

        if (!chosen){
          // Not even the fallback card (header + minimise + contact) fits
          // on screen. An open Sprout with no visible way to close it is
          // not an acceptable state, so it closes for real.
          closePanel();
          return false;
        }

        root.style.setProperty("--sp-avail", Math.floor(avail) + "px");
        // Modality follows width (fullscreen <=480px).
        panel.setAttribute("aria-modal", isMobileLayout() ? "true" : "false");

        // Focus repair on every state/size change: a Sprout control that
        // just disappeared hands focus to this state's natural target; a
        // modal panel pulls in focus that is outside it. Focus already on a
        // visible Sprout control is never moved.
        var a = document.activeElement;
        if (focusWasInSprout && (!root.contains(a) || !isFocusableNow(a))){
          strandedFocusTarget().focus();
        } else if (isModalNow() && !panel.contains(a)){
          preferredFocusTarget().focus();
        }
        return true;
      }

      /* Modal-lifetime focus containment (Round 4, kept): while the panel
         is open and modal, any focus that lands outside it -- a stray
         Tab from the page, a script, an extension -- is brought back in.
         Refocusing a target inside the panel fires focusin on that
         target, which returns immediately here, so there is no loop. */
      function onDocumentFocusIn(ev){
        if (panel.hidden || !isModalNow()) return;
        if (panel.contains(ev.target)) return;
        preferredFocusTarget().focus();
      }

      function openPanel(){
        lastFocusedBeforeOpen = document.activeElement;
        root.classList.add("sp-open");
        panel.hidden = false;
        panel.setAttribute("aria-hidden", "false");
        if (!syncShell()) return; // nothing fits on screen: syncShell has already closed Sprout again
        launcher.setAttribute("aria-expanded", "true");
        launcher.setAttribute("aria-label", "Close chat with Sprout");
        if (badge) badge.style.display = "none";
        hideTeaser();
        if (!hasOpened){
          hasOpened = true;
          var myGen = ++respondGen;
          var typingRow = addTyping();
          setTimeout(function(){
            if (myGen !== respondGen){
              if (typingRow.parentNode) typingRow.parentNode.removeChild(typingRow);
              return;
            }
            if (typingRow.parentNode) typingRow.parentNode.removeChild(typingRow);
            addBotText(pick(GREETINGS));
            addChips(mainMenuChips());
          }, 500);
        }
        setTimeout(function(){ if (!panel.hidden) preferredFocusTarget().focus(); }, 50);
        // Escape/Tab handling on the whole root (Round 6): Escape also
        // closes while focus is on the launcher, not only inside the panel.
        root.addEventListener("keydown", trapKeydown);
        window.addEventListener("resize", syncShell);
        document.addEventListener("focusin", onDocumentFocusIn, true);
        resetIdleTimer();
      }

      function closePanel(){
        root.classList.remove("sp-open");
        root.removeAttribute("data-sp-density");
        root.style.removeProperty("--sp-avail");
        panel.hidden = true;
        panel.setAttribute("aria-hidden", "true");
        panel.removeAttribute("aria-modal");
        launcher.setAttribute("aria-expanded", "false");
        launcher.setAttribute("aria-label", "Open chat with Sprout");
        root.removeEventListener("keydown", trapKeydown);
        window.removeEventListener("resize", syncShell);
        document.removeEventListener("focusin", onDocumentFocusIn, true);
        // Focus restoration: back to whatever had focus before opening if
        // it is still a visible, operable control (the teaser-open button
        // hides itself on open, so that case falls through to the
        // launcher). A fixed Sprout control that is off screen -- possible
        // only when Sprout closed itself because the screen is too short --
        // is not a useful target; focus is then released rather than left
        // on something the visitor cannot see.
        var target = isFocusableNow(lastFocusedBeforeOpen) ? lastFocusedBeforeOpen : launcher;
        if (root.contains(target) && measurablyOffScreen(target)) target = null;
        if (target){
          target.focus();
        } else if (root.contains(document.activeElement) && document.activeElement.blur){
          document.activeElement.blur();
        }
        lastFocusedBeforeOpen = null;
        resetIdleTimer();
      }

      function togglePanel(){
        if (panel.hidden) openPanel(); else closePanel();
      }

      /* ---- idle fidgets ---- */
      var idleTimer = null;
      var IDLE_ANIMS = [
        { cls: "sp-anim-wave",    dur: 1400, weight: 32 },
        { cls: "sp-anim-turn",    dur: 2000, weight: 28 },
        { cls: "sp-anim-stretch", dur: 1700, weight: 26 },
        { cls: "sp-anim-flip",    dur: 900,  weight: 14 }
      ];

      function randBetween(min, max){ return min + Math.random() * (max - min); }

      function pickIdleAnim(){
        var total = IDLE_ANIMS.reduce(function(s, a){ return s + a.weight; }, 0);
        var r = Math.random() * total;
        for (var k = 0; k < IDLE_ANIMS.length; k++){
          r -= IDLE_ANIMS[k].weight;
          if (r <= 0) return IDLE_ANIMS[k];
        }
        return IDLE_ANIMS[IDLE_ANIMS.length - 1];
      }

      function scheduleIdleFidget(delay){
        if (reduceMotion) return;
        clearTimeout(idleTimer);
        idleTimer = setTimeout(playIdleFidget, delay);
      }

      function playIdleFidget(){
        if (reduceMotion) return;
        if (!panel.hidden || (document.visibilityState && document.visibilityState !== "visible")){
          scheduleIdleFidget(randBetween(16000, 30000));
          return;
        }
        var rig = launcher.querySelector(".sp-rig-wrap");
        if (rig){
          var anim = pickIdleAnim();
          rig.classList.add(anim.cls);
          setTimeout(function(){ rig.classList.remove(anim.cls); }, anim.dur + 60);
        }
        scheduleIdleFidget(randBetween(16000, 30000));
      }

      function resetIdleTimer(){
        if (reduceMotion) return;
        scheduleIdleFidget(randBetween(11000, 17000));
      }

      resetIdleTimer();

      launcher.addEventListener("click", togglePanel);
      minBtn.addEventListener("click", closePanel);

      /* ---- teaser: reveal once, never reopen after dismissal ----
         The teaser starts [hidden] in the markup. The reveal timer
         below only ever un-hides it if it hasn't already been shown
         once this page view and hasn't been dismissed; dismissing it
         sets teaserDismissed permanently for the rest of this page
         view, which the (already-fired, one-shot) reveal timer
         checks before acting, so there is no path back to a
         dismissed teaser reappearing on its own. */
      function hideTeaser(){
        if (!teaser) return;
        teaser.hidden = true;
      }
      function revealTeaserOnce(){
        if (!teaser || teaserDismissed || hasOpened) return;
        teaser.hidden = false;
      }

      if (teaserOpen){
        teaserOpen.addEventListener("click", openPanel);
      }
      if (teaserDismiss){
        teaserDismiss.addEventListener("click", function(ev){
          ev.stopPropagation();
          teaserDismissed = true;
          hideTeaser();
        });
      }

      setTimeout(revealTeaserOnce, 3800);

      form.addEventListener("submit", function(ev){
        ev.preventDefault();
        var text = (input.value || "").trim();
        if (!text) return;
        if (text.length > 400) text = text.slice(0, 400); // matches the input's maxlength=400 as a second guard
        addUserText(text);
        input.value = "";
        var intent = detectIntent(text) || "fallback";
        respond(intent);
        resetIdleTimer();
      });

      /* ---- P3-1 (Round 2 correction): reveal only on confirmed success ----
         sprout.css now hides #ylpp-sprout-root by default; this is the
         single point reached only after every required node was found,
         sprout.css was confirmed loaded, and every listener above was
         wired without throwing. Adding .sp-ready here (and nowhere else)
         is what makes the widget visible -- if JS is blocked entirely,
         this line never runs, .sp-ready is never added, and the root
         stays display:none with no dead-looking control left on screen. */
      if (document.fonts && document.fonts.ready && typeof document.fonts.ready.then === "function"){
        document.fonts.ready.then(function(){ if (!panel.hidden) syncShell(); });
      }

      root.classList.add("sp-ready");

    } catch (err) {
      // Guarded initializer: never let a widget bug break the rest
      // of the page (forms.js, GA4, site navigation all keep
      // working). Hide whatever exists rather than leave a
      // half-wired control on screen.
      try {
        var failedRoot = document.getElementById("ylpp-sprout-root");
        if (failedRoot) failedRoot.classList.add("sp-init-failed");
      } catch (e2) { /* nothing further we can safely do */ }
    }
  })();

})();
