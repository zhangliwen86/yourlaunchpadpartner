/* ============================================================
   FORMS.JS — Contact form conversion system.

   Covers, in one file so the submission path is never scattered:
     - FORM_ENDPOINT configuration (read from the form's own action
       attribute in the HTML — the single source of truth for the
       live endpoint, currently Formspree)
     - ?interest= query-parameter preselection (allowlisted values
       only — a query string never becomes visible page content)
     - client-side validation (required fields + email format)
     - accessible error rendering (aria-invalid / aria-describedby)
     - a swappable submission adapter
     - UI state management (default / processing / success / error)
     - a minimal, accessible honeypot check

   No form currently exists on the homepage, About, Services,
   Workshop or Showcase pages — their CTAs are plain links — so
   this file is inert there. It only does anything on a page that
   contains #contact-form.
   ============================================================ */
(function(){
  'use strict';

  var form = document.getElementById('contact-form');
  if (!form) return; // this page has no form — nothing else in this file runs

  window.YLPP_FORM_CONFIG = window.YLPP_FORM_CONFIG || {
    // Sourced from the <form action="..."> attribute in the HTML —
    // do not hardcode a second copy of the endpoint here.
    FORM_ENDPOINT: form.getAttribute('action') || '',
  };

  // With JS running, our own accessible per-field messages replace
  // the browser's native validation bubbles. Without JS, the
  // required / type="email" attributes left on the markup are the
  // fallback (see note in the HTML), so novalidate is only ever
  // added here — never in the markup itself.
  form.setAttribute('novalidate', 'novalidate');

  var statusEl = document.getElementById('formStatus');
  var submitBtn = document.getElementById('formSubmitBtn');

  /* ---------- ?interest= preselection ----------
     Allowlist only. The raw query value is never written into the
     DOM as text or HTML — it can only select one of these known,
     already-rendered <option> values. */
  var INTEREST_MAP = {
    accounting: 'accounting',
    grants: 'grants',
    automation: 'automation',
    workshop: 'workshop',
    digital: 'automation'
  };
  (function preselectInterest(){
    var params = new URLSearchParams(window.location.search);
    var raw = params.get('interest');
    if (!raw) return;
    var mapped = INTEREST_MAP[raw.toLowerCase()];
    if (!mapped) return; // unrecognised value — ignored, not displayed anywhere
    var select = document.getElementById('interest');
    if (!select) return;
    var optionExists = Array.prototype.some.call(select.options, function(o){ return o.value === mapped; });
    if (optionExists){
      select.value = mapped;
      select.setAttribute('data-preselected', 'true');
    }
  })();

  /* ---------- field helpers ---------- */
  function fieldRow(el){ return el.closest('.field-row'); }
  function errorEl(el){ return document.getElementById(el.id + 'Error'); }

  function setError(el, message){
    var row = fieldRow(el);
    var err = errorEl(el);
    if (row) row.classList.add('has-error');
    el.setAttribute('aria-invalid', 'true');
    if (err) err.textContent = message;
  }
  function clearError(el){
    var row = fieldRow(el);
    var err = errorEl(el);
    if (row) row.classList.remove('has-error');
    el.removeAttribute('aria-invalid');
    if (err) err.textContent = '';
  }

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function validateName(){
    var el = document.getElementById('name');
    if (!el.value.trim()){ setError(el, 'Please enter your name.'); return false; }
    clearError(el); return true;
  }
  function validateEmail(){
    var el = document.getElementById('email');
    var v = el.value.trim();
    if (!v){ setError(el, 'Please enter your email address.'); return false; }
    if (!EMAIL_RE.test(v)){ setError(el, 'Please enter a valid email address.'); return false; }
    clearError(el); return true;
  }
  function validateInterest(){
    var el = document.getElementById('interest');
    if (!el.value){ setError(el, "Please tell us what you'd like help with."); return false; }
    clearError(el); return true;
  }
  // Phone is optional and deliberately unvalidated beyond being a
  // plain text field — no regex narrow enough to cover Singapore
  // and international formats without rejecting real numbers.

  form.querySelectorAll('#name, #email, #interest').forEach(function(el){
    el.addEventListener('blur', function(){
      if (el.id === 'name') validateName();
      if (el.id === 'email') validateEmail();
      if (el.id === 'interest') validateInterest();
    });
  });

  function showStatus(kind, message){
    if (!statusEl) return;
    statusEl.className = 'form-status is-' + kind;
    statusEl.textContent = message;
    statusEl.hidden = false;
  }
  function hideStatus(){
    if (!statusEl) return;
    statusEl.hidden = true;
    statusEl.textContent = '';
    statusEl.className = 'form-status';
  }

  /* ---------- submission adapter ----------
     Submits inline via fetch() so the visitor stays on the Contact
     page rather than being redirected to Formspree's own generic
     confirmation page. Accept: application/json asks Formspree to
     respond with JSON instead of an HTML redirect. */
  function submitToEndpoint(formData){
    var endpoint = window.YLPP_FORM_CONFIG.FORM_ENDPOINT;
    if (!endpoint){
      // Defensive fallback only — the form's action attribute should
      // always supply this. Kept generic; never exposes internals.
      return Promise.resolve({ status: 'error' });
    }
    return fetch(endpoint, {
      method: 'POST',
      body: formData,
      headers: { 'Accept': 'application/json' }
    })
      .then(function(res){ return res.ok ? { status: 'success' } : { status: 'error' }; })
      .catch(function(){ return { status: 'error' }; });
  }

  form.addEventListener('submit', function(e){
    e.preventDefault();

    // Honeypot: a bot that fills every field trips this. A real
    // visitor never sees or reaches it (aria-hidden, off-screen,
    // not in tab order), so a filled value is treated as spam and
    // the submission is quietly dropped — no alarming message, no
    // hint to the bot that it was caught.
    var honeypot = document.getElementById('hp_field');
    if (honeypot && honeypot.value){ return; }

    var validName = validateName();
    var validEmail = validateEmail();
    var validInterest = validateInterest();

    if (!validName || !validEmail || !validInterest){
      var errCount = [validName, validEmail, validInterest].filter(function(v){ return !v; }).length;
      showStatus('error', 'Please fix the highlighted field' + (errCount > 1 ? 's' : '') + ' below.');
      var firstInvalid = form.querySelector('[aria-invalid="true"]');
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    hideStatus();
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';
    showStatus('processing', 'Sending your message…');

    var formData = new FormData(form);

    submitToEndpoint(formData).then(function(result){
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send your message';

      if (result.status === 'success'){
        showStatus('success', "Thank you. Your message has been sent. We'll be in touch.");
        form.reset();
        return;
      }
      // Failure: keep whatever the visitor typed in place (no form.reset())
      // so they don't have to re-enter anything before trying again. No
      // implementation detail from Formspree is surfaced here.
      showStatus('submit-error', "Something went wrong while sending your message. Please try again.");
    });
  });
})();
