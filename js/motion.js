/* ============================================================
   MOTION.JS — the approved motion language, generalised into a
   small set of reusable behaviours:
     - generic scroll reveal (.reveal)
     - hero draws itself once on load
     - per-pillar process animation, activates on scroll (.svc-row)
     - workshop build strip, frames step in one at a time
     - foundation progress line (desktop + mobile variants)
   Every behaviour is IntersectionObserver-driven, respects
   prefers-reduced-motion, and degrades to a fully-visible static
   state with JS disabled (see the html:not(.js-enabled) rules in
   components.css).
   ============================================================ */
(function(){
  'use strict';
  var html = document.documentElement;

  function reduceMotion(){
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  if (reduceMotion()) html.classList.add('reduce-motion');
  var rmQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (rmQuery.addEventListener){
    rmQuery.addEventListener('change', function(e){ html.classList.toggle('reduce-motion', e.matches); });
  }

  /* ---------- generic reveal ---------- */
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(entries, obs){
      entries.forEach(function(entry){
        if (entry.isIntersecting){ entry.target.classList.add('is-visible'); obs.unobserve(entry.target); }
      });
    }, { threshold:.15, rootMargin:'0px 0px -40px 0px' });
    revealEls.forEach(function(el){ io.observe(el); });
  } else {
    revealEls.forEach(function(el){ el.classList.add('is-visible'); });
  }

  /* ---------- hero draws itself on load ---------- */
  var heroDrawings = document.querySelectorAll('.hero-drawing');
  var heroIdx = document.getElementById('heroIdx');
  window.addEventListener('load', function(){
    setTimeout(function(){
      heroDrawings.forEach(function(d){ d.classList.add('animate'); });
      if (heroIdx){
        var rows = heroIdx.querySelectorAll('.idx-item');
        rows.forEach(function(r, i){ setTimeout(function(){ r.classList.add('lit'); }, 850 + i * 70); });
      }
    }, 150);
  });

  /* ---------- pillar activation ---------- */
  var svcRows = document.querySelectorAll('.svc-row');
  if ('IntersectionObserver' in window){
    var svcIo = new IntersectionObserver(function(entries, obs){
      entries.forEach(function(entry){
        if (entry.isIntersecting){ entry.target.classList.add('in-view'); obs.unobserve(entry.target); }
      });
    }, { threshold:.3 });
    svcRows.forEach(function(el){ svcIo.observe(el); });
  } else {
    svcRows.forEach(function(el){ el.classList.add('in-view'); });
  }

  /* ---------- workshop build strip: frames step in one at a time ---------- */
  var frames = document.querySelectorAll('.frame');
  if ('IntersectionObserver' in window){
    var frameIo = new IntersectionObserver(function(entries, obs){
      entries.forEach(function(entry){
        if (entry.isIntersecting){
          var step = parseInt(entry.target.getAttribute('data-step'), 10) || 1;
          setTimeout(function(){ entry.target.classList.add('on'); }, (step - 1) * 90);
          obs.unobserve(entry.target);
        }
      });
    }, { threshold:.4 });
    frames.forEach(function(el){ frameIo.observe(el); });
  } else {
    frames.forEach(function(el){ el.classList.add('on'); });
  }

  /* ---------- foundation progress line (desktop) ---------- */
  initProgressLine('progressFill', 'progressTicks', 'progress-tick');
  /* ---------- foundation progress line (mobile) ---------- */
  initProgressLine('progressFillM', 'progressTicksM', 'progress-tick-m');

  function initProgressLine(fillId, ticksId, tickClass){
    var fill = document.getElementById(fillId);
    var ticksWrap = document.getElementById(ticksId);
    if (!fill) return;
    var ticks = [];

    function buildTicks(){
      if (!ticksWrap) return;
      ticksWrap.innerHTML = '';
      ticks = [];
      var docH = document.documentElement.scrollHeight - window.innerHeight;
      if (docH <= 0) return;
      /* One tick per top-level, id-bearing <section> inside <main> —
         derived from the page's own structure rather than a hardcoded,
         homepage-specific list, so every page's foundation line reflects
         its own section rhythm (previously only #hero/#closing lit up
         on inner pages, since the old list named homepage-only ids). */
      var sectionEls = document.querySelectorAll('main > section[id]');
      sectionEls.forEach(function(el){
        var top = el.getBoundingClientRect().top + window.scrollY;
        var pct = Math.min(100, Math.max(0, (top / docH) * 100));
        var dot = document.createElement('span');
        dot.className = tickClass;
        dot.style.top = pct + '%';
        ticksWrap.appendChild(dot);
        ticks.push({ el: el, dot: dot });
      });
    }

    var ticking = false;
    function update(){
      ticking = false;
      var docH = document.documentElement.scrollHeight - window.innerHeight;
      var progress = docH > 0 ? Math.min(1, Math.max(0, window.scrollY / docH)) : 0;
      fill.style.setProperty('--progress', progress);
      var vh = window.innerHeight;
      ticks.forEach(function(t){
        var r = t.el.getBoundingClientRect();
        if (r.top < vh * .75) t.dot.classList.add('lit');
      });
    }

    buildTicks();
    update();
    window.addEventListener('scroll', function(){
      if (!ticking){ ticking = true; window.requestAnimationFrame(update); }
    }, { passive:true });
    window.addEventListener('resize', function(){ buildTicks(); update(); });
    window.addEventListener('load', function(){ buildTicks(); update(); });
  }
})();
