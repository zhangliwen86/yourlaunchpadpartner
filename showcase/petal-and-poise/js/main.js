// Home page enhancements. Everything here is progressive: without this
// script all content (including the flower details) is visible as plain HTML.

// ---------- Gentle scroll reveals ----------
// Elements are only hidden once motion is welcome, IntersectionObserver exists,
// and the element starts below the fold (so nothing on screen flickers).
(function () {
  "use strict";

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || !("IntersectionObserver" in window)) return;

  var items = document.querySelectorAll(".reveal");
  if (!items.length) return;

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.remove("is-pending");
        observer.unobserve(entry.target);
      }
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });

  var fold = window.innerHeight;
  items.forEach(function (el) {
    if (el.getBoundingClientRect().top > fold) {
      el.classList.add("is-pending");
      observer.observe(el);
    }
  });

  // Reveal anything targeted by in-page navigation or focus straight away.
  document.addEventListener("focusin", function (e) {
    var el = e.target.closest && e.target.closest(".is-pending");
    if (el) el.classList.remove("is-pending");
  });
  window.addEventListener("beforeprint", function () {
    document.querySelectorAll(".is-pending").forEach(function (el) { el.classList.remove("is-pending"); });
  });
})();

// ---------- Hero flower hotspots ----------
// Hover (mouse) or keyboard focus previews a flower; click/tap pins it open.
// Escape, the close button, or a tap elsewhere dismisses it.
(function () {
  "use strict";

  var stage = document.getElementById("hero-stage");
  if (!stage) return;
  var flowers = Array.prototype.slice.call(stage.querySelectorAll(".flower"));
  if (!flowers.length) return;

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var header = document.querySelector(".site-header");
  var GAP = 12;
  var EDGE = 8;
  var current = null;   // the open .flower
  var pinned = false;
  var closeTimer = null;
  var returningFocus = false; // focus handed back after a close must not reopen

  function parts(flower) {
    return {
      btn: flower.querySelector(".hotspot"),
      panel: flower.querySelector(".flower-panel")
    };
  }

  function place(flower) {
    var p = parts(flower);
    var s = stage.getBoundingClientRect();
    var b = p.btn.getBoundingClientRect();
    var vw = document.documentElement.clientWidth;
    var vh = window.innerHeight;
    var headerBottom = header ? Math.max(0, header.getBoundingClientRect().bottom) : 0;
    var panel = p.panel;
    panel.style.width = "";
    var left, top;

    if (vw < 600) {
      // Phones: full image width, just below the marker
      panel.style.width = s.width + "px";
      left = 0;
      top = b.bottom - s.top + GAP / 2;
    } else {
      var pw = panel.offsetWidth;
      var ph = panel.offsetHeight;
      // Prefer the left of the marker (the open paper side of the photograph)
      left = b.left - s.left - pw - GAP;
      if (s.left + left < EDGE) left = b.right - s.left + GAP;
      // Keep inside the viewport horizontally
      left = Math.min(left, vw - EDGE - pw - s.left);
      left = Math.max(left, EDGE - s.left);
      // Vertically centred on the marker, kept on screen below the sticky header
      top = b.top + b.height / 2 - s.top - ph / 2;
      var absTop = s.top + top;
      if (absTop + ph > vh - EDGE) top -= absTop + ph - (vh - EDGE);
      absTop = s.top + top;
      if (absTop < headerBottom + EDGE) top += headerBottom + EDGE - absTop;
    }
    panel.style.left = Math.round(left) + "px";
    panel.style.top = Math.round(top) + "px";
  }

  function open(flower, pin) {
    clearTimeout(closeTimer);
    if (current && current !== flower) close(current);
    var p = parts(flower);
    current = flower;
    pinned = !!pin;
    p.btn.setAttribute("aria-expanded", "true");
    p.panel.classList.add("is-open");
    place(flower);
    // On phones the panel sits under the marker; bring it fully into view if needed
    if (document.documentElement.clientWidth < 600) {
      var r = p.panel.getBoundingClientRect();
      if (r.bottom > window.innerHeight) p.panel.scrollIntoView({ block: "nearest", behavior: "instant" });
    }
    if (reduce) {
      p.panel.classList.add("is-lifted");
    } else {
      // Next frame, so the close-up transition runs from its resting state
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          if (current === flower) p.panel.classList.add("is-lifted");
        });
      });
    }
  }

  function close(flower, returnFocus) {
    flower = flower || current;
    if (!flower) return;
    var p = parts(flower);
    p.btn.setAttribute("aria-expanded", "false");
    p.panel.classList.remove("is-open", "is-lifted");
    if (current === flower) { current = null; pinned = false; }
    if (returnFocus) {
      returningFocus = true;
      p.btn.focus();
      returningFocus = false;
    }
  }

  function scheduleClose(flower) {
    clearTimeout(closeTimer);
    closeTimer = setTimeout(function () {
      if (current === flower && !pinned) close(flower);
    }, 280);
  }

  flowers.forEach(function (flower) {
    var p = parts(flower);

    p.btn.addEventListener("click", function () {
      if (current === flower && pinned) close(flower);
      else open(flower, true);
    });

    // Mouse hover preview (touch and pen use click/tap instead)
    [p.btn, p.panel].forEach(function (el) {
      el.addEventListener("pointerenter", function (e) {
        if (e.pointerType !== "mouse") return;
        clearTimeout(closeTimer);
        if (el === p.btn && current !== flower) open(flower, false);
      });
      el.addEventListener("pointerleave", function (e) {
        if (e.pointerType !== "mouse") return;
        if (current === flower && !pinned) scheduleClose(flower);
      });
    });

    // Keyboard focus preview
    p.btn.addEventListener("focus", function () {
      var keyboard = true;
      try { keyboard = p.btn.matches(":focus-visible"); } catch (err) { /* older browsers */ }
      if (keyboard && !returningFocus && current !== flower) open(flower, false);
    });
    flower.addEventListener("focusout", function (e) {
      if (current !== flower || pinned) return;
      if (!flower.contains(e.relatedTarget)) close(flower);
    });

    p.panel.querySelector(".flower-panel__close").addEventListener("click", function () {
      close(flower, true);
    });
  });

  document.addEventListener("keydown", function (e) {
    if ((e.key === "Escape" || e.key === "Esc") && current) {
      var inside = current.contains(document.activeElement);
      close(current, inside);
    }
  });

  document.addEventListener("pointerdown", function (e) {
    if (current && !current.contains(e.target)) close(current);
  });

  window.addEventListener("resize", function () { if (current) place(current); });

  // Ready: switch the plain list into hotspots and panels.
  stage.classList.add("flowers-ready");
})();
