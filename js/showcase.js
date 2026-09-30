/* ============================================================
   SHOWCASE.JS — crossfades each .sp-cycle preview panel through
   its real page screenshots (see showcase/index.html).
   Loaded only on the Showcase page — no other page uses this.

   Round 4 (eight-example showcase):
     - Only the first screenshot of each panel is real <img> markup.
       The other screenshots sit inside a <template class="shot-more">,
       whose contents the browser never downloads. This script moves
       them into the panel one at a time, just before they are needed,
       so a visitor downloads at most the visible frame plus the next
       one per panel — not every screenshot on the page at once.
     - A panel only cycles while it is on screen (IntersectionObserver)
       and while the tab is visible; off-screen panels stay paused.
     - A frame is only shown once its image has actually loaded, so a
       slow connection never crossfades into a blank panel.

   Unchanged from Round 3/3A:
     - prefers-reduced-motion: no cycling at all; the first frame stays,
       and the remaining screenshots are never downloaded.
     - Pauses on hover/focus and resumes from the same frame.
     - Loops back to the first frame with the same crossfade.
     - Without JS, only the first frame is shown (see pages.css), and
       the <template> contents stay inert.
     - aria-hidden is kept in sync so assistive technology only ever
       sees the one visible screenshot.
   ============================================================ */
(function(){
  'use strict';

  var panels = document.querySelectorAll('.sp-cycle');
  if (!panels.length) return;

  var rmQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var controllers = [];

  function Controller(panel){
    var frame = panel.querySelector('.shot-frame');
    var tpl = frame && frame.querySelector('template.shot-more');
    var first = frame && frame.querySelector('.shot-frame-img');
    if (!frame || !first) return null;

    // frames[i] is either an attached <img> or a not-yet-attached template node
    var frames = [first];
    var attached = [true];
    if (tpl && tpl.content) {
      Array.prototype.forEach.call(tpl.content.querySelectorAll('img'), function(img){
        frames.push(img); attached.push(false);
      });
    }
    if (frames.length < 2) return null;

    var interval = parseInt(panel.getAttribute('data-interval'), 10) || 3200;
    var index = 0, timer = null, waiting = false;
    var onScreen = false, hovering = false, focused = false;

    function ensure(i){
      if (attached[i]) return frames[i];
      var img = document.importNode(frames[i], true);
      img.classList.add('shot-frame-img');
      img.classList.remove('is-active');
      img.setAttribute('aria-hidden', 'true');
      img.removeAttribute('loading'); // it is needed now, not "when in view"
      frame.appendChild(img);
      frames[i] = img; attached[i] = true;
      return img;
    }
    function ready(img){ return img.complete && img.naturalWidth > 0; }

    function show(next){
      frames[index].classList.remove('is-active');
      frames[index].setAttribute('aria-hidden', 'true');
      index = next;
      frames[index].classList.add('is-active');
      frames[index].setAttribute('aria-hidden', 'false');
      ensure((index + 1) % frames.length); // preload exactly one frame ahead
    }

    function tick(){
      if (waiting) return;
      var next = (index + 1) % frames.length;
      var img = ensure(next);
      if (ready(img)) { show(next); return; }
      // not loaded yet: skip this beat, show it as soon as it arrives
      waiting = true;
      var done = function(ok){
        img.removeEventListener('load', onLoad); img.removeEventListener('error', onErr);
        waiting = false;
        if (ok && timer) show(next);
      };
      var onLoad = function(){ done(true); }, onErr = function(){ done(false); };
      img.addEventListener('load', onLoad); img.addEventListener('error', onErr);
    }

    function shouldRun(){
      return onScreen && !hovering && !focused && !document.hidden && !rmQuery.matches;
    }
    function update(){
      if (shouldRun()) {
        if (!timer) { ensure((index + 1) % frames.length); timer = setInterval(tick, interval); }
      } else if (timer) { clearInterval(timer); timer = null; }
    }
    function resetToFirst(){
      if (timer) { clearInterval(timer); timer = null; }
      for (var i = 0; i < frames.length; i++) {
        if (!attached[i]) continue;
        frames[i].classList.toggle('is-active', i === 0);
        frames[i].setAttribute('aria-hidden', i === 0 ? 'false' : 'true');
      }
      index = 0;
    }

    panel.addEventListener('mouseenter', function(){ hovering = true; update(); });
    panel.addEventListener('mouseleave', function(){ hovering = false; update(); });
    panel.addEventListener('focusin', function(){ focused = true; update(); });
    panel.addEventListener('focusout', function(){ focused = false; update(); });

    return {
      panel: panel,
      setOnScreen: function(v){ onScreen = v; update(); },
      update: update,
      resetToFirst: resetToFirst
    };
  }

  Array.prototype.forEach.call(panels, function(panel){
    var c = Controller(panel);
    if (c) controllers.push(c);
  });
  if (!controllers.length) return;

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        for (var i = 0; i < controllers.length; i++) {
          if (controllers[i].panel === e.target) controllers[i].setOnScreen(e.isIntersecting);
        }
      });
    }, { rootMargin: '0px 0px 100px 0px', threshold: 0.15 });
    controllers.forEach(function(c){ io.observe(c.panel); });
  } else {
    controllers.forEach(function(c){ c.setOnScreen(true); });
  }

  document.addEventListener('visibilitychange', function(){
    controllers.forEach(function(c){ c.update(); });
  });

  // if the reduced-motion preference changes live, stop and settle on
  // the first frame; if it is switched off again, cycling may resume
  var onRmChange = function(e){
    controllers.forEach(function(c){ if (e.matches) c.resetToFirst(); else c.update(); });
  };
  if (rmQuery.addEventListener) rmQuery.addEventListener('change', onRmChange);
  else if (rmQuery.addListener) rmQuery.addListener(onRmChange);
})();
