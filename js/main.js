/* ============================================================
   MAIN.JS — site chrome: mobile nav, active nav state, mobile
   sticky CTA visibility. No motion/animation logic lives here —
   see motion.js.
   ============================================================ */
(function(){
  'use strict';

  var html = document.documentElement;
  html.classList.add('js-enabled');

  /* ---------- mobile nav toggle ---------- */
  var nav = document.querySelector('.main-nav');
  var toggle = document.querySelector('.nav-toggle');
  if (nav && toggle){
    toggle.addEventListener('click', function(){
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    /* close on Escape (listen on document — focus may be on the toggle
       button itself, outside the nav's own subtree), and when a nav
       link is activated */
    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape' && nav.classList.contains('is-open')){
        nav.classList.remove('is-open'); toggle.setAttribute('aria-expanded','false'); toggle.focus();
      }
    });
    nav.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', function(){ nav.classList.remove('is-open'); toggle.setAttribute('aria-expanded','false'); });
    });
  }

  /* ---------- mark current nav item (defensive: works even if a page
     is opened directly rather than by a relative link) ---------- */
  var here = window.location.pathname.replace(/index\.html$/, '');
  document.querySelectorAll('.main-nav a[href]').forEach(function(a){
    var href = a.getAttribute('href');
    if (!href || href === '#') return;
    if (href === here || (href !== '/' && here.indexOf(href) === 0)){
      a.setAttribute('aria-current', 'page');
    }
  });

  /* ---------- mobile sticky CTA: hide once the in-page "Talk to us"
     CTA (hero or closing) is itself on screen, so we never show two
     identical CTAs at once ---------- */
  var stickyCta = document.querySelector('.mobile-sticky-cta');
  if (stickyCta){
    var refCtas = document.querySelectorAll('#hero .btn, .closing .btn');
    if ('IntersectionObserver' in window && refCtas.length){
      var visible = new Set();
      var ctaIo = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if (entry.isIntersecting) visible.add(entry.target); else visible.delete(entry.target);
        });
        stickyCta.classList.toggle('is-hidden', visible.size > 0);
      }, { threshold: .6 });
      refCtas.forEach(function(el){ ctaIo.observe(el); });
    }
  }
})();
