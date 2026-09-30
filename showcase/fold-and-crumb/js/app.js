/* Fold & Crumb — interactions.
   All answers live in this script's memory only: no storage, cookies, analytics or network requests.
   Refreshing the page clears everything. */
(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.add('js');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  var STYLES = {
    c1: { name: 'Retro piped', desc: 'Vintage-style piping: shell borders, draped swags and glossy cherries on a smooth cream finish.', img: 'images/web/c1-retro-piped-cake-560.jpg', alt: 'Illustrative concept: a cream cake with shell-piped borders, draped piping swags and glossy cherries.', colour: 'var(--cherry)' },
    c2: { name: 'Rainbow cheesecake', desc: 'Soft rainbow bands revealed where a slice is cut away, crowned with a ring of fruit and piped cream.', img: 'images/web/c2-rainbow-cheesecake-560.jpg', alt: 'Illustrative concept: a cheesecake with pastel rainbow bands and a ring of fruit and piped cream.', colour: 'var(--butter)' },
    c3: { name: 'Berry layers', desc: 'Semi-bare sides show every layer; a cut reveals berry-streaked cream, with berries piled on top.', img: 'images/web/c3-berry-layer-cake-560.jpg', alt: 'Illustrative concept: a semi-bare layer cake with berry-streaked cream and berries piled on top.', colour: 'var(--cocoa)' },
    c4: { name: 'Confetti celebration', desc: 'Pastel piped rosettes and a scatter of sprinkles for a bright, party-ready look.', img: 'images/web/c4-confetti-celebration-cake-560.jpg', alt: 'Illustrative concept: a cream cake with pastel rosettes and colourful sprinkles.', colour: 'var(--pink)' },
    unsure: { name: 'Not sure yet', desc: 'A perfectly good answer. All four directions are shown together, so you can decide later.', colour: 'var(--butter-soft)' }
  };
  var FLAVOURS = {
    fruity: { name: 'Bright & fruity', desc: 'Tangy and fresh, inspired by berries and cherries.', colour: 'var(--cherry)' },
    chocolatey: { name: 'Rich & chocolatey', desc: 'Deep and bittersweet, inspired by dark cocoa.', colour: 'var(--cocoa)' },
    creamy: { name: 'Soft & creamy', desc: 'Gentle and mellow, inspired by vanilla and milk.', colour: 'var(--white)' },
    pandan: { name: 'Pandan & coconut-inspired', desc: 'Fragrant and local-leaning, inspired by pandan and coconut.', colour: 'var(--pandan)' },
    unsure: { name: 'Not sure yet', desc: 'No flavour mood chosen yet. That counts as an answer too.', colour: 'var(--butter-soft)' }
  };
  var OCCASIONS = { birthday: 'Birthday', thanks: 'Thank you', gathering: 'Gathering', because: 'Just because', unsure: 'Not sure' };
  var FORMATS = { cake: 'One celebration cake', individual: 'Individual bakes', unsure: 'Not sure' };

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  /* Focus an element and make sure it sits below the sticky header and inside the viewport,
     without relying on the browser's own focus scrolling. */
  function focusBelowHeader(el) {
    if (!el) return;
    el.focus({ preventScroll: true });
    var header = $('.site-header');
    var headerH = header ? header.getBoundingClientRect().height : 0;
    var rect = el.getBoundingClientRect();
    var top = headerH + 20;
    if (rect.top < top || rect.top > window.innerHeight - 80) {
      window.scrollTo({ top: window.scrollY + rect.top - top, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    }
  }

  /* ------------------------------------------------------------------ */
  /* 1. Pastry counter: tabs + Whole/Inside                              */
  /* ------------------------------------------------------------------ */
  function initPastries() {
    var tabs = $all('.counter__tabs [role="tab"]');
    var panels = $all('.pastry');
    var inside = false;

    panels.forEach(function (panel) {
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('tabindex', '-1');
      panel.setAttribute('aria-labelledby', panel.id.replace('panel-', 'tab-'));
    });

    function select(index, moveFocus) {
      tabs.forEach(function (tab, i) {
        var on = i === index;
        tab.setAttribute('aria-selected', on ? 'true' : 'false');
        tab.tabIndex = on ? 0 : -1;
        panels[i].classList.toggle('is-active', on);
        panels[i].inert = !on;
        panels[i].setAttribute('aria-hidden', on ? 'false' : 'true');
      });
      if (moveFocus) tabs[index].focus();
    }

    function setView(isInside) {
      inside = isInside;
      panels.forEach(function (panel) {
        panel.classList.toggle('is-inside', inside);
        $all('.view-toggle button', panel).forEach(function (b) {
          b.setAttribute('aria-pressed', (b.dataset.view === 'inside') === inside ? 'true' : 'false');
        });
        $('.view-caption', panel).textContent = inside ? 'Close-up of the cut side' : 'Whole and cut, side by side';
      });
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { select(i, false); });
      tab.addEventListener('keydown', function (e) {
        var next = null;
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = (i + 1) % tabs.length;
        else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = tabs.length - 1;
        if (next !== null) { e.preventDefault(); select(next, true); }
      });
    });

    $all('.view-toggle button').forEach(function (b) {
      b.addEventListener('click', function () { setView(b.dataset.view === 'inside'); });
    });

    select(0, false);
    setView(false);
  }

  /* ------------------------------------------------------------------ */
  /* 2. Celebration styles explorer                                      */
  /* ------------------------------------------------------------------ */
  var explorer = { style: null, flavour: null }; // only explicitly chosen answers

  function initStyles() {
    var preview = $('.preview');
    var imgs = $all('.preview__img');
    var state = $('#style-state');
    var desc = $('#style-desc');
    var flavourDesc = $('#flavour-desc');

    function show(styleId) {
      preview.setAttribute('data-stage', styleId);
      imgs.forEach(function (img) { img.classList.toggle('is-active', img.getAttribute('data-style') === styleId); });
    }

    function updateCarrySummary() {
      var s = explorer.style ? STYLES[explorer.style].name : 'not chosen';
      var f = explorer.flavour ? FLAVOURS[explorer.flavour].name : 'not chosen';
      $('#carry-summary').textContent = 'Your choices so far: style ' + (explorer.style ? '“' + s + '”' : s) + ' · flavour ' + (explorer.flavour ? '“' + f + '”' : f);
    }

    $all('input[name="x-style"]').forEach(function (input) {
      input.addEventListener('change', function () {
        explorer.style = input.value;
        show(input.value);
        state.textContent = 'Your choice: ' + STYLES[input.value].name;
        state.classList.add('is-chosen');
        desc.textContent = STYLES[input.value].desc;
        updateCarrySummary();
      });
    });
    $all('input[name="x-flavour"]').forEach(function (input) {
      input.addEventListener('change', function () {
        explorer.flavour = input.value;
        flavourDesc.textContent = FLAVOURS[input.value].name + ': ' + FLAVOURS[input.value].desc;
        updateCarrySummary();
      });
    });

    // Untouched default: preview Retro piped, clearly marked as not chosen.
    show('c1');
    updateCarrySummary();

    $('#carry-button').addEventListener('click', function () { carryIntoBrief(); });
  }

  /* ------------------------------------------------------------------ */
  /* 3. Demonstration brief                                              */
  /* ------------------------------------------------------------------ */
  var answers = { occasion: null, format: null, style: null, flavour: null, note: '' };
  var phase = 'intro';        // 'intro' | 'steps' | 'summary'
  var step = 1;
  var editingFromReview = false;

  var FIELDS = {
    occasion: { step: 1, input: 'b-occasion', first: 'occasion-first', label: 'Occasion', message: 'Choose an occasion, or “Not sure”.' },
    format: { step: 1, input: 'b-format', first: 'format-first', label: 'Format', message: 'Choose a format, or “Not sure”.' },
    style: { step: 2, input: 'b-style', first: 'style-first', label: 'Visual style', message: 'Choose a visual style, or “Not sure yet”.' },
    flavour: { step: 2, input: 'b-flavour', first: 'flavour-first', label: 'Flavour direction', message: 'Choose a flavour direction, or “Not sure yet”.' },
    note: { step: 3, first: 'brief-note', label: 'Note', message: 'Please remove what looks like contact details (an email address or phone number) from your note.' }
  };

  function initBrief() {
    // Radio answers: update memory only. No focus moves, no scrolling.
    ['occasion', 'format', 'style', 'flavour'].forEach(function (key) {
      $all('input[name="' + FIELDS[key].input + '"]').forEach(function (input) {
        input.addEventListener('change', function () {
          answers[key] = input.value;
          if (key === 'format') updateFormatNotes();
          if (step === 3) renderReview();
        });
      });
    });

    var note = $('#brief-note');
    note.addEventListener('input', function () {
      answers.note = note.value;
      $('#note-count').textContent = note.value.length + ' of 280 characters';
      renderReview();
    });

    $('#brief-start').addEventListener('click', function () {
      phase = 'steps';
      showStep(1); // any "carried over" message stays visible for step 1
    });

    $all('#brief-flow [data-action]').forEach(function (btn) {
      btn.addEventListener('click', function () { handleAction(btn.getAttribute('data-action')); });
    });
    $('#brief-summary [data-action="edit-all"]').addEventListener('click', function () {
      closeReset();
      phase = 'steps';
      editingFromReview = false;
      showStep(3);
    });

    $('#review').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-edit]');
      if (!btn) return;
      var key = btn.getAttribute('data-edit');
      editingFromReview = key !== 'note';
      showStep(FIELDS[key].step, key);
    });

    $('#error-summary').addEventListener('click', function (e) {
      var link = e.target.closest('a[data-field]');
      if (!link) return;
      e.preventDefault();
      focusField(link.getAttribute('data-field'));
    });

    // Start again, with confirmation
    $('#reset-open').addEventListener('click', function () {
      var open = $('#reset-confirm').hidden;
      if (open) openReset(); else closeReset();
    });
    $('#reset-no').addEventListener('click', function () { closeReset(); $('#reset-open').focus(); });
    $('#reset-yes').addEventListener('click', function () {
      resetAll();
      focusBelowHeader($('#brief-title'));
      setStatus('All answers cleared. You can start a new sample brief whenever you like.');
    });

    render();
  }

  function handleAction(action) {
    if (action === 'next') {
      if (!validate(step)) return;
      if (step + 1 === 3) editingFromReview = false;
      showStep(step + 1);
    } else if (action === 'back') {
      editingFromReview = false;
      showStep(step - 1);
    } else if (action === 'to-review') {
      if (!validate(step)) return;
      editingFromReview = false;
      showStep(3);
    } else if (action === 'create') {
      if (!validate(1, true) || !validate(2, true) || !validate(3)) return;
      closeReset();
      phase = 'summary';
      renderSummary();
      render();
      setStatus('');
      focusBelowHeader($('#brief-summary .summary__title'));
    }
  }

  function render() {
    $('#brief-intro').hidden = phase !== 'intro';
    $('#brief-flow').hidden = phase !== 'steps';
    $('#brief-summary').hidden = phase !== 'summary';
    $('#reset').hidden = phase === 'intro';
    if (phase === 'steps') {
      $all('#brief-flow .step').forEach(function (el) { el.hidden = Number(el.getAttribute('data-step')) !== step; });
      $all('.progress li').forEach(function (li) {
        var n = Number(li.getAttribute('data-step'));
        li.classList.toggle('is-current', n === step);
        li.classList.toggle('is-done', n < step);
        if (n === step) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
      });
      $all('[data-action="to-review"]').forEach(function (b) { b.hidden = !editingFromReview; });
      if (step === 3) renderReview();
    }
    syncInputs();
    updateFormatNotes();
  }

  /* Change step: always closes the reset prompt and clears old errors, then focuses the step heading
     (or a specific field when editing an answer). */
  function showStep(n, fieldKey) {
    closeReset();
    clearErrors();
    step = Math.max(1, Math.min(3, n));
    if (step === 3) setStatus(''); // the review shows every answer, so older notices are no longer needed
    render();
    if (fieldKey) focusField(fieldKey);
    else focusBelowHeader($('#step-' + step + ' .step__title'));
  }

  function syncInputs() {
    ['occasion', 'format', 'style', 'flavour'].forEach(function (key) {
      $all('input[name="' + FIELDS[key].input + '"]').forEach(function (input) {
        input.checked = input.value === answers[key];
      });
    });
    var note = $('#brief-note');
    if (note.value !== answers.note) note.value = answers.note;
    $('#note-count').textContent = answers.note.length + ' of 280 characters';
  }

  function updateFormatNotes() {
    var individual = answers.format === 'individual';
    $('#format-note').hidden = !individual;
    $('#summary-format-note').hidden = !individual;
  }

  function focusField(key) {
    var el = document.getElementById(FIELDS[key].first);
    if (FIELDS[key].input) {
      var checked = $('input[name="' + FIELDS[key].input + '"]:checked');
      if (checked) el = checked;
    }
    focusBelowHeader(el);
  }

  /* ---------- Validation ---------- */
  function looksLikeContactDetails(text) {
    return /[^\s@]+@[^\s@]+\.[^\s@]+/.test(text) || /(\+?\d[\d\s().-]{6,}\d)/.test(text);
  }

  function validate(n, silentFocusToStep) {
    var keys = Object.keys(FIELDS).filter(function (k) { return FIELDS[k].step === n; });
    var missing = keys.filter(function (k) {
      if (k === 'note') return looksLikeContactDetails(answers.note);
      return !answers[k];
    });
    if (!missing.length) return true;
    if (silentFocusToStep && n !== step) {
      // A required answer is missing on an earlier step: go there and show its errors.
      showStep(n);
    }
    showErrors(missing);
    return false;
  }

  function showErrors(keys) {
    clearErrors();
    var summary = $('#error-summary');
    var list = $('.error-summary__list', summary);
    $('.error-summary__title', summary).textContent = keys.length === 1 && keys[0] === 'note'
      ? 'Please check your note before continuing'
      : 'Please answer these before continuing';
    keys.forEach(function (key) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = '#' + FIELDS[key].first;
      a.setAttribute('data-field', key);
      a.textContent = FIELDS[key].label + ': ' + FIELDS[key].message;
      li.appendChild(a);
      list.appendChild(li);
      var err = document.getElementById('error-' + key);
      err.innerHTML = '';
      var prefix = document.createElement('span');
      prefix.className = 'visually-hidden';
      prefix.textContent = 'Error: ';
      err.appendChild(prefix);
      err.appendChild(document.createTextNode(FIELDS[key].message));
      err.hidden = false;
      if (key === 'note') $('#brief-note').setAttribute('aria-invalid', 'true');
    });
    summary.hidden = false;
    focusBelowHeader(summary);
  }

  function clearErrors() {
    var summary = $('#error-summary');
    summary.hidden = true;
    $('.error-summary__list', summary).innerHTML = '';
    $all('.field-error').forEach(function (e) { e.hidden = true; e.innerHTML = ''; });
    $('#brief-note').removeAttribute('aria-invalid');
  }

  /* ---------- Review & summary ---------- */
  function labelFor(key) {
    var v = answers[key];
    if (key === 'occasion') return v ? OCCASIONS[v] : 'Not answered yet';
    if (key === 'format') return v ? FORMATS[v] : 'Not answered yet';
    if (key === 'style') return v ? STYLES[v].name : 'Not answered yet';
    if (key === 'flavour') return v ? FLAVOURS[v].name : 'Not answered yet';
    return answers.note.trim() ? answers.note.trim() : 'No note added';
  }

  function renderReview() {
    var dl = $('#review');
    dl.innerHTML = '';
    ['occasion', 'format', 'style', 'flavour', 'note'].forEach(function (key) {
      var row = document.createElement('div');
      var dt = document.createElement('dt');
      dt.textContent = FIELDS[key].label;
      var dd = document.createElement('dd');
      dd.textContent = labelFor(key);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'button button--ghost review__edit';
      btn.setAttribute('data-edit', key);
      btn.innerHTML = 'Edit<span class="visually-hidden"> ' + FIELDS[key].label.toLowerCase() + '</span>';
      row.appendChild(dt); row.appendChild(dd); row.appendChild(btn);
      dl.appendChild(row);
    });
  }

  function sentence() {
    var occ = { birthday: 'a birthday', thanks: 'a thank-you', gathering: 'a gathering', because: 'a just-because moment', unsure: 'an occasion still to be decided' }[answers.occasion];
    var fmt = { cake: 'one celebration cake', individual: 'individual bakes', unsure: 'a format still to be decided' }[answers.format];
    var styleOpen = answers.style === 'unsure';
    var flavourOpen = answers.flavour === 'unsure';
    var tail;
    if (styleOpen && flavourOpen) tail = 'with the visual style and flavour direction still open';
    else if (styleOpen) tail = 'with the visual style still open, leaning ' + FLAVOURS[answers.flavour].name;
    else if (flavourOpen) tail = 'in the ' + STYLES[answers.style].name + ' style, with the flavour direction still open';
    else tail = 'in the ' + STYLES[answers.style].name + ' style, leaning ' + FLAVOURS[answers.flavour].name;
    return 'For ' + occ + ': ' + fmt + ', ' + tail + '.';
  }

  function renderSummary() {
    $('#summary-sentence').textContent = sentence();

    var holder = $('#summary-image');
    holder.innerHTML = '';
    if (answers.style === 'unsure') {
      var m = document.createElement('div');
      m.className = 'montage';
      m.setAttribute('role', 'img');
      m.setAttribute('aria-label', 'All four illustrative style concepts together.');
      ['c1', 'c2', 'c3', 'c4'].forEach(function (id) {
        var i = document.createElement('img');
        i.src = STYLES[id].img; i.alt = ''; i.width = 560; i.height = 700;
        m.appendChild(i);
      });
      holder.appendChild(m);
    } else {
      var img = document.createElement('img');
      img.src = STYLES[answers.style].img;
      img.alt = STYLES[answers.style].alt;
      img.width = 560; img.height = 700;
      holder.appendChild(img);
    }

    var dl = $('#summary-list');
    dl.innerHTML = '';
    ['occasion', 'format', 'style', 'flavour', 'note'].forEach(function (key) {
      var row = document.createElement('div');
      var dt = document.createElement('dt');
      dt.textContent = FIELDS[key].label;
      var dd = document.createElement('dd');
      dd.textContent = labelFor(key);
      row.appendChild(dt); row.appendChild(dd);
      dl.appendChild(row);
    });

    var stripe = $('#summary-stripe');
    stripe.innerHTML = '';
    [STYLES[answers.style].colour, FLAVOURS[answers.flavour].colour, 'var(--butter)'].forEach(function (c) {
      var s = document.createElement('span');
      s.style.background = c;
      stripe.appendChild(s);
    });
    updateFormatNotes();
  }

  /* ---------- Reset ---------- */
  function openReset() {
    $('#reset-confirm').hidden = false;
    $('#reset-open').setAttribute('aria-expanded', 'true');
    $('#reset-yes').focus({ preventScroll: false });
  }
  function closeReset() {
    $('#reset-confirm').hidden = true;
    $('#reset-open').setAttribute('aria-expanded', 'false');
  }
  function resetAll() {
    answers = { occasion: null, format: null, style: null, flavour: null, note: '' };
    phase = 'intro';
    step = 1;
    editingFromReview = false;
    closeReset();
    clearErrors();
    render();
  }

  function setStatus(msg) {
    var el = $('#brief-status');
    el.textContent = '';
    if (msg) {
      // Set after a tick so screen readers announce the change.
      window.setTimeout(function () { el.textContent = msg; }, 60);
    }
  }

  /* ---------- Carry-over from the explorer (one-way, button only) ---------- */
  function carryIntoBrief() {
    closeReset();
    var carried = [];
    var changed = false;
    if (explorer.style) {
      if (answers.style !== explorer.style) changed = true;
      answers.style = explorer.style;
      carried.push('style “' + STYLES[explorer.style].name + '”');
    }
    if (explorer.flavour) {
      if (answers.flavour !== explorer.flavour) changed = true;
      answers.flavour = explorer.flavour;
      carried.push('flavour “' + FLAVOURS[explorer.flavour].name + '”');
    }

    var msg;
    if (!carried.length) {
      msg = 'No style or flavour was chosen above, so nothing was carried over.';
    } else if (phase === 'intro') {
      msg = 'Carried over: ' + carried.join(' and ') + '. You\'ll see them in step 2.';
    } else if (phase === 'summary' && changed) {
      phase = 'steps';
      step = 3;
      editingFromReview = false;
      clearErrors();
      msg = 'Updated from your selection: ' + carried.join(' and ') + '. Review your answers, then choose “Create sample brief” again.';
    } else if (!changed) {
      msg = 'Your brief already has ' + carried.join(' and ') + '.';
    } else {
      msg = 'Updated from your selection: ' + carried.join(' and ') + '.';
    }

    render();
    focusBelowHeader($('#brief-title'));
    setStatus(msg);
  }

  /* Start up last, once every state variable above has been assigned. */
  try {
    initPastries();
    initStyles();
    initBrief();
  } catch (err) {
    // If anything fails, fall back to the static, fully readable page.
    root.classList.remove('js');
    if (window.console) console.error(err);
  }
})();
