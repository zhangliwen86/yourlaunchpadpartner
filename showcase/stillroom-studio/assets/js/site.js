// Stillroom Studio — shared page behaviour.
// No network requests, storage, cookies or analytics. Everything degrades to readable static content.
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Header: mobile menu + scrolled border ---------- */
  var header = document.querySelector('.site-header');
  var toggle = document.querySelector('.menu-toggle');
  var nav = document.getElementById('site-nav');
  var mobileQuery = window.matchMedia('(max-width: 860px)');

  function setMenu(open) {
    if (!toggle || !nav) return;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'Close' : 'Menu';
    nav.hidden = !open;
  }
  function syncNav() {
    if (!nav) return;
    if (mobileQuery.matches) setMenu(false);
    else { nav.hidden = false; if (toggle) toggle.setAttribute('aria-expanded', 'false'); }
  }
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      setMenu(toggle.getAttribute('aria-expanded') !== 'true');
    });
    nav.addEventListener('click', function (e) {
      if (mobileQuery.matches && e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setMenu(false);
        toggle.focus();
      }
    });
    mobileQuery.addEventListener('change', syncNav);
    syncNav();
  }
  if (header) {
    var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 8); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // Keep focused elements clear of the sticky header (e.g. when tabbing back up the page).
  // The browser scrolls a newly focused element into view after focusin fires, so correct on the next frames.
  function clearHeader(el) {
    if (document.activeElement !== el) return;
    var headerBottom = header.getBoundingClientRect().bottom;
    var rect = el.getBoundingClientRect();
    if (rect.top < headerBottom + 8 && rect.bottom > 0) {
      window.scrollBy({ top: rect.top - headerBottom - 24, behavior: 'auto' });
    }
  }
  document.addEventListener('focusin', function (e) {
    if (!header) return;
    var el = e.target;
    // Clicking a label can first focus its tabindex=-1 main ancestor.
    // Scrolling that page-sized container interrupts the label's checkbox click.
    // Main is the skip-link destination, not an individual control to reposition.
    if (header.contains(el) || el === document.body || el.matches('main, .skip-link')) return;
    clearHeader(el);
    requestAnimationFrame(function () { clearHeader(el); requestAnimationFrame(function () { clearHeader(el); }); });
  });

  /* ---------- Comparison slider ---------- */
  document.querySelectorAll('[data-compare]').forEach(function (root) {
    var range = root.querySelector('.compare-range');
    var chips = root.querySelectorAll('.chip');
    if (!range) return;
    root.classList.add('is-slider');

    function set(pos) {
      pos = Math.max(0, Math.min(100, Math.round(pos)));
      range.value = pos;
      root.style.setProperty('--pos', pos + '%');
      var text;
      if (pos >= 100) text = 'Showing Modern luxurious only';
      else if (pos <= 0) text = 'Showing Funky only';
      else text = 'Divider at ' + pos + '%: Modern luxurious on the left, Funky on the right';
      range.setAttribute('aria-valuetext', text);
      chips.forEach(function (c) { c.setAttribute('aria-pressed', String(Number(c.dataset.pos) === pos)); });
    }

    range.addEventListener('input', function () { set(range.value); });
    range.addEventListener('keydown', function (e) {
      var big = e.shiftKey ? 20 : 5;
      var v = Number(range.value);
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { set(v - big); e.preventDefault(); }
      else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { set(v + big); e.preventDefault(); }
      else if (e.key === 'PageDown') { set(v - 20); e.preventDefault(); }
      else if (e.key === 'PageUp') { set(v + 20); e.preventDefault(); }
      else if (e.key === 'Home') { set(0); e.preventDefault(); }
      else if (e.key === 'End') { set(100); e.preventDefault(); }
    });
    // Fallback focus ring for browsers without :has()
    range.addEventListener('focus', function () { if (range.matches(':focus-visible')) root.classList.add('has-focus'); });
    range.addEventListener('blur', function () { root.classList.remove('has-focus'); });
    chips.forEach(function (c) {
      c.addEventListener('click', function () { set(Number(c.dataset.pos)); });
    });
    set(50);
  });

  /* ---------- Image hotspots ---------- */
  document.querySelectorAll('[data-hotspots]').forEach(function (root) {
    var markers = Array.prototype.slice.call(root.querySelectorAll('.hotspot'));
    var details = Array.prototype.slice.call(root.querySelectorAll('.detail'));
    var showButtons = root.querySelectorAll('.detail-show');
    var stacked = window.matchMedia('(max-width: 960px)');

    function activate(n, opts) {
      opts = opts || {};
      markers.forEach(function (m, i) {
        if (i + 1 === n) m.setAttribute('aria-current', 'true'); else m.removeAttribute('aria-current');
      });
      details.forEach(function (d, i) { d.classList.toggle('is-active', i + 1 === n); });
      showButtons.forEach(function (b) { b.setAttribute('aria-pressed', String(Number(b.dataset.target) === n)); });
      // On narrow screens the list sits below the image: bring the chosen detail into view.
      if (opts.reveal && stacked.matches && n) {
        details[n - 1].scrollIntoView({ block: 'nearest', behavior: reduceMotion.matches ? 'auto' : 'smooth' });
      }
      if (opts.revealMarker && stacked.matches && n) {
        markers[n - 1].scrollIntoView({ block: 'center', behavior: reduceMotion.matches ? 'auto' : 'smooth' });
      }
    }

    markers.forEach(function (m, i) {
      m.addEventListener('click', function (e) {
        e.preventDefault();
        activate(i + 1, { reveal: true });
      });
    });
    showButtons.forEach(function (b) {
      b.addEventListener('click', function () { activate(Number(b.dataset.target), { revealMarker: true }); });
    });
    root.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        var current = markers.findIndex(function (m) { return m.getAttribute('aria-current') === 'true'; });
        activate(0);
        // Leave focus on a marker if it is already on one; otherwise return it to the marker that was active.
        var onMarker = markers.indexOf(document.activeElement) > -1;
        if (!onMarker && current > -1 && root.contains(document.activeElement)) markers[current].focus();
      }
    });
    activate(1);
  });

  /* ---------- Process story ---------- */
  document.querySelectorAll('[data-story]').forEach(function (root) {
    var steps = Array.prototype.slice.call(root.querySelectorAll('.story-step'));
    var frames = root.querySelectorAll('.story-frame');
    var countEl = root.querySelector('[data-story-count] span');
    var captionEl = root.querySelector('[data-story-caption]');
    var progress = root.querySelector('[data-story-progress]');
    var current = 0;
    var buttons = [];

    if (progress) {
      steps.forEach(function (step, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('aria-label', 'Go to step ' + (i + 1) + ': ' + step.querySelector('h3').textContent);
        b.addEventListener('click', function () {
          setActive(i + 1);
          step.scrollIntoView({ block: 'center', behavior: reduceMotion.matches ? 'auto' : 'smooth' });
          var h = step.querySelector('h3');
          h.setAttribute('tabindex', '-1');
          h.focus({ preventScroll: true });
        });
        progress.appendChild(b);
        buttons.push(b);
      });
    }

    function setActive(n) {
      if (n === current) return;
      current = n;
      steps.forEach(function (s, i) { s.classList.toggle('is-active', i + 1 === n); });
      frames.forEach(function (f) { f.classList.toggle('is-active', Number(f.dataset.frame) === n); });
      buttons.forEach(function (b, i) {
        if (i + 1 === n) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
        b.classList.toggle('is-done', i + 1 < n);
      });
      if (countEl) countEl.textContent = n;
      if (captionEl) captionEl.textContent = steps[n - 1].dataset.caption || '';
    }

    if ('IntersectionObserver' in window) {
      var visible = new Map();
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { visible.set(en.target, en.isIntersecting ? en.intersectionRatio : 0); });
        // Pick the step crossing the middle band of the viewport
        var best = null, bestRatio = 0;
        visible.forEach(function (r, el) { if (r > bestRatio) { bestRatio = r; best = el; } });
        if (best) setActive(steps.indexOf(best) + 1);
      }, { rootMargin: '-40% 0px -40% 0px', threshold: [0, .25, .5, .75, 1] });
      steps.forEach(function (s) { io.observe(s); });
    }
    setActive(1);
  });
})();
