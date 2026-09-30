// Morrow Delivery — shared behaviour. Every feature here is an enhancement:
// the pages remain readable and navigable if this file fails to load.
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // ---- Mobile navigation ----
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');
  var mobileQuery = window.matchMedia('(max-width: 859px)');

  function setNav(open, returnFocus) {
    if (!toggle || !nav) return;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('.label').textContent = open ? 'Close' : 'Menu';
    nav.hidden = !open && mobileQuery.matches;
    if (!open && returnFocus) toggle.focus();
  }

  if (toggle && nav) {
    setNav(false);
    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') !== 'true';
      setNav(open);
      if (open) {
        var first = nav.querySelector('a');
        if (first) first.focus();
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') setNav(false, true);
    });
    document.addEventListener('click', function (e) {
      if (toggle.getAttribute('aria-expanded') === 'true' && !nav.contains(e.target) && !toggle.contains(e.target)) setNav(false);
    });
    nav.addEventListener('focusout', function (e) {
      if (mobileQuery.matches && toggle.getAttribute('aria-expanded') === 'true' &&
          e.relatedTarget && !nav.contains(e.relatedTarget) && e.relatedTarget !== toggle) setNav(false);
    });
    var onQuery = function () { setNav(false); };
    if (mobileQuery.addEventListener) mobileQuery.addEventListener('change', onQuery);
    else mobileQuery.addListener(onQuery);
  }

  // ---- Hero video ----
  var video = document.querySelector('.hero-video');
  var videoBtn = document.querySelector('.video-toggle');

  if (video && videoBtn) {
    var saveData = navigator.connection && navigator.connection.saveData;
    var label = videoBtn.querySelector('.label');
    var iconPause = videoBtn.querySelector('.icon-pause');
    var iconPlay = videoBtn.querySelector('.icon-play');

    // The button always reflects the video's real state. SVG elements have no
    // `hidden` property, so the attribute is toggled directly.
    var setIcon = function (icon, show) {
      if (show) icon.removeAttribute('hidden'); else icon.setAttribute('hidden', '');
    };
    var render = function () {
      var playing = !video.paused && !video.ended && !video.error;
      var text = playing ? 'Pause scene' : 'Play scene';
      label.textContent = text;
      videoBtn.setAttribute('aria-label', text);
      setIcon(iconPause, playing);
      setIcon(iconPlay, !playing);
    };

    var play = function () {
      if (!video.getAttribute('src')) video.setAttribute('src', video.dataset.src);
      var p = video.play();
      render();
      if (p && p.catch) p.catch(function () { render(); });
    };

    video.addEventListener('playing', function () { video.classList.add('is-playing'); render(); });
    ['play', 'pause', 'ended', 'error', 'emptied', 'abort', 'stalled'].forEach(function (type) {
      video.addEventListener(type, render);
    });

    videoBtn.hidden = false;
    videoBtn.addEventListener('click', function () {
      if (video.paused) play(); else video.pause();
    });

    // Autoplay only when motion is welcome. Browsers may refuse autoplay in a
    // hidden tab, so try again once the page becomes visible — unless the
    // visitor has paused it themselves.
    var userPaused = false;
    videoBtn.addEventListener('click', function () { userPaused = video.paused; });
    if (!reduceMotion.matches && !saveData) {
      play();
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible' && video.paused && !userPaused) play();
      });
    }
    render();
  }

  // ---- Heading reveals ----
  // A heading is hidden only after the observer has actually reported it as
  // off-screen, so if the observer never runs nothing is ever hidden.
  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    var items = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
    var seen = new WeakSet();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var el = entry.target;
        if (!seen.has(el)) {
          seen.add(el);
          if (entry.isIntersecting || entry.boundingClientRect.top < 0) { io.unobserve(el); return; }
          el.classList.add('is-pending');
          return;
        }
        if (!entry.isIntersecting) return;
        el.classList.add('is-shown');
        el.classList.remove('is-pending');
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px' });

    items.forEach(function (el) { io.observe(el); });

    // Safety net: never leave content hidden (e.g. printing, anchor jumps).
    window.addEventListener('beforeprint', function () {
      items.forEach(function (el) { el.classList.remove('is-pending'); });
    });
  }
})();
