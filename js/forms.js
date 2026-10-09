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
   ordinary visitors are unaffected there. On Workshop only, an
   explicitly marked QA journey carries its test marker to the
   enquiry link even if the optional attribution helper is missing.
   Form submission handling runs only where #contact-form exists.
   ============================================================ */
(function(){
  'use strict';

  var form = document.getElementById('contact-form');
  if (!form){
    // Keep an explicitly marked Workshop QA journey marked even if the helper
    // is missing. Other pages and ordinary visitor links remain untouched.
    if (/^\/workshop(?:\/|\/index\.html)?$/.test(window.location.pathname) &&
        internalTestFromQuery(window.location.search)){
      document.querySelectorAll('a[href]').forEach(function(link){
        var target;
        try { target = new URL(link.getAttribute('href'),window.location.href); } catch(e){ return; }
        if (target.origin !== window.location.origin || !/^\/contact(?:\/|\/index\.html)?$/.test(target.pathname) ||
            target.searchParams.getAll('interest').length !== 1 || target.searchParams.get('interest') !== 'workshop') return;
        target.searchParams.set('cg_test','1');
        link.setAttribute('href',target.pathname+target.search+target.hash);
      });
    }
    return;
  }

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
  var submissionPending = false;
  // Any explicit non-zero test marker is conservative QA classification.
  // Independent of optional helper, URL route shape, or parameter ordering.
  function internalTestFromQuery(search){
    return search.replace(/^\?/, '').split('&').some(function(part){
      var split = part.indexOf('='), key = split < 0 ? part : part.slice(0, split);
      try { key = decodeURIComponent(key.replace(/\+/g, ' ')); } catch (e) { return false; }
      if (key !== 'cg_test') return false;
      var value = split < 0 ? '' : part.slice(split + 1);
      try { value = decodeURIComponent(value.replace(/\+/g, ' ')); } catch (e) { return true; }
      return value !== '0';
    });
  }

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
  function validateContactMethod(){
    var el = document.getElementById('contact-email');
    if (!form.querySelector('input[name="preferred_contact"]:checked')){
      setError(el, 'Please choose Email, Phone or Either.'); return false;
    }
    clearError(el); return true;
  }
  form.querySelectorAll('input[name="preferred_contact"]').forEach(function(el){
    el.addEventListener('change', validateContactMethod);
  });
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

  /* ---------- GA4 lead event ----------
     Fires exactly one event — generate_lead — on a genuinely
     successful submission only (see the success branch below).
     lead_type is captured from the validated select at submission (never
     from FormData, so no free-text or PII field can ever reach
     this), and is checked against this fixed allowlist before
     being sent: an unexpected value is silently not sent rather
     than passed through. gtag may not exist (blocked, ad-blocker,
     GA4 script failed to load) — this is guarded and wrapped so an
     analytics failure can never affect the success message, the
     form reset, or the rest of the submit flow. */
  var GA4_LEAD_TYPES = ['accounting', 'grants', 'automation', 'workshop', 'unsure'];

  function trackLeadEvent(leadType, attribution, internalTest){
    if (internalTest || GA4_LEAD_TYPES.indexOf(leadType) === -1) return;
    try {
      var parameters = { lead_type: leadType };
      if (leadType === 'workshop') Object.assign(parameters, attribution);
      if (typeof window.gtag === 'function') window.gtag('event','generate_lead',parameters);
    } catch(e){ /* optional analytics cannot break confirmation */ }
  }

  function submissionAttribution(internalTest){
    var result = { cg_source:'unknown', cg_medium:'unknown', cg_campaign:'unknown', cg_content:'unknown', cg_attribution_mode:'unknown', cg_test:internalTest?'1':'0' };
    try {
      var helper = window.YLPP_WORKSHOP_ATTRIBUTION;
      var raw = helper && helper.fields();
      var allowed = ['profile','v25','v26','v27','v28','v29','v30','v31','v32','v33','v34','v35','v36'];
      if(raw && raw.cg_source==='tiktok' && raw.cg_medium==='organic_social' && raw.cg_campaign==='cg001' && raw.cg_attribution_mode==='tagged'){
        result.cg_source='tiktok';result.cg_medium='organic_social';result.cg_campaign='cg001';result.cg_attribution_mode='tagged';
        result.cg_content=allowed.indexOf(raw.cg_content)!==-1?raw.cg_content:'unknown';
      }
    } catch(e){ /* fall back to finite unknown values, never drop the test marker */ }
    return result;
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
    if (submissionPending) return;

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
    var validContact = validateContactMethod();

    if (!validName || !validEmail || !validInterest || !validContact){
      var errCount = [validName, validEmail, validInterest, validContact].filter(function(v){ return !v; }).length;
      showStatus('error', 'Please fix the highlighted field' + (errCount > 1 ? 's' : '') + ' below.');
      var firstInvalid = form.querySelector('[aria-invalid="true"]');
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    // Snapshot validated category/test/context once; later UI edits cannot relabel receipt.
    var submittedInterest = document.getElementById('interest').value;
    var submittedTest = internalTestFromQuery(window.location.search);
    var submittedAttribution = submissionAttribution(submittedTest);
    submissionPending = true;
    hideStatus();
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';
    showStatus('processing', 'Sending your message…');

    var formData = new FormData(form);
    if (submittedInterest === 'workshop'){
      Object.keys(submittedAttribution).forEach(function(key){ formData.set(key,submittedAttribution[key]); });
    } else if (submittedTest) {
      // Mark QA receipts even if the visitor changes the test to another website enquiry category.
      formData.set('cg_test','1');
    }

    submitToEndpoint(formData).then(function(result){
      submissionPending = false;
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send your message';

      if (result.status === 'success'){
        trackLeadEvent(submittedInterest, submittedAttribution, submittedTest);
        showStatus('success', submittedInterest === 'workshop'
          ? "Thank you — your workshop enquiry has been received. We will follow up to discuss dates and your questions. You can also WhatsApp us at +65 8995 1995. Your workshop place is not yet confirmed."
          : "Thank you. Your message has been sent. We will be in touch. You can also WhatsApp us at +65 8995 1995.");
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
