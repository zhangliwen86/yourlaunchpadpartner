/* ============================================================
   SHOWCASE.JS — Round 3. Crossfades each .sp-cycle preview panel
   through its real page screenshots (see showcase/index.html).
   Loaded only on the Showcase page — no other page uses this.

   Behaviour:
     - Respects prefers-reduced-motion: if set, no auto-cycling —
       the first (home) frame stays visible, the panel stays a link.
     - Pauses on hover/focus, resumes from the same frame on
       leave/blur (does not reset to frame 1).
     - Loops seamlessly: after the last frame it crossfades straight
       back to the first (home) frame — same crossfade as every other
       transition, so there is no jump/cut.
     - Degrades safely with JS disabled: components.css's
       html:not(.js-enabled) rule (see pages.css) shows only the
       first frame per panel.
     - Round 3A: keeps aria-hidden on each frame in sync with the
       visible one (false on the active frame, true on the rest),
       so screen readers see exactly one screenshot at a time
       instead of every stacked alt text at once. Opacity/is-active
       alone isn't enough for that — this is what actually does it.
   ============================================================ */
(function(){
  'use strict';

  function reduceMotion(){
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  var panels = document.querySelectorAll('.sp-cycle');
  if (!panels.length) return;

  panels.forEach(function(panel){
    var frames = panel.querySelectorAll('.shot-frame-img');
    if (frames.length < 2) return; // nothing to cycle

    if (reduceMotion()) return; // first frame (is-active in the HTML) stays put

    var interval = parseInt(panel.getAttribute('data-interval'), 10) || 3200;
    var index = 0;
    var timer = null;

    function show(next){
      frames[index].classList.remove('is-active');
      frames[index].setAttribute('aria-hidden', 'true');
      index = next;
      frames[index].classList.add('is-active');
      frames[index].setAttribute('aria-hidden', 'false');
    }

    function tick(){
      show((index + 1) % frames.length);
    }

    function start(){
      if (timer) return;
      timer = setInterval(tick, interval);
    }
    function stop(){
      if (!timer) return;
      clearInterval(timer);
      timer = null;
    }

    start();
    panel.addEventListener('mouseenter', stop);
    panel.addEventListener('mouseleave', start);
    panel.addEventListener('focusin', stop);
    panel.addEventListener('focusout', start);
  });

  // if the user's reduced-motion preference changes live, stop any
  // running cycles and settle back on each panel's first frame
  var rmQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (rmQuery.addEventListener){
    rmQuery.addEventListener('change', function(e){
      if (!e.matches) return;
      panels.forEach(function(panel){
        var frames = panel.querySelectorAll('.shot-frame-img');
        frames.forEach(function(f, i){
          f.classList.toggle('is-active', i === 0);
          f.setAttribute('aria-hidden', i === 0 ? 'false' : 'true');
        });
      });
    });
  }
})();
