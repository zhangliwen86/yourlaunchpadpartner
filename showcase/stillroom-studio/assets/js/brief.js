// Space brief demonstration.
// Answers live only in the page's memory (the form controls themselves). Nothing is submitted,
// stored, logged or sent anywhere; there is no <form> element, so the browser cannot submit it.
(function () {
  'use strict';

  var root = document.querySelector('[data-brief]');
  if (!root) return;

  var MAX_PRIORITIES = 3;
  var TOTAL = 3;
  var step = 1;

  var panels = root.querySelectorAll('[data-step-panel]');
  var progressItems = root.querySelectorAll('[data-progress]');
  var statusEl = root.querySelector('[data-status]');
  var errorBox = root.querySelector('[data-errors]');
  var body = root.querySelector('[data-brief-body]');
  var result = root.querySelector('[data-result]');
  var resultProse = root.querySelector('[data-result-prose]');
  var nav = root.querySelector('[data-nav]');
  var backBtn = root.querySelector('[data-action="back"]');
  var nextBtn = root.querySelector('[data-action="next"]');
  var resetConfirm = root.querySelector('[data-reset-confirm]');
  var reviewList = root.querySelector('[data-review]');
  var areasNote = root.querySelector('[data-areas-note]');
  var priCount = root.querySelector('[data-pri-count]');
  var note = root.querySelector('#note');
  var noteCount = root.querySelector('[data-note-count]');
  var header = document.querySelector('.site-header');
  var lastResetTrigger = null;

  root.querySelectorAll('[data-js-only]').forEach(function (el) { el.hidden = false; });

  /* ---------- Reading answers ---------- */
  function checkedValues(name) {
    return Array.prototype.map.call(root.querySelectorAll('input[name="' + name + '"]:checked'), function (i) { return i.value; });
  }
  function answers() {
    return {
      flat: checkedValues('flat')[0] || '',
      areas: checkedValues('areas'),
      priorities: checkedValues('priorities'),
      atmosphere: checkedValues('atmosphere')[0] || '',
      note: note.value.trim()
    };
  }

  /* ---------- Scrolling that respects the sticky header ---------- */
  function focusAndReveal(el) {
    if (!el) return;
    if (!el.hasAttribute('tabindex') && !/^(INPUT|BUTTON|TEXTAREA|A)$/.test(el.tagName)) el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
    var offset = (header ? header.getBoundingClientRect().height : 0) + 24;
    var top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
  }

  /* ---------- Rooms: "Whole flat" / "Not sure yet" are exclusive ---------- */
  var areaInputs = root.querySelectorAll('input[name="areas"]');
  areaInputs.forEach(function (input) {
    input.addEventListener('change', function () {
      if (!input.checked) { areasNote.textContent = ''; return; }
      var cleared = [];
      areaInputs.forEach(function (other) {
        if (other === input || !other.checked) return;
        var clash = input.dataset.kind === 'room' ? other.dataset.kind !== 'room' : true;
        if (clash) { other.checked = false; cleared.push(other.value); }
      });
      if (cleared.length) {
        areasNote.textContent = input.dataset.kind === 'room'
          ? '“' + cleared.join('” and “') + '” cleared, because you chose a specific room.'
          : 'Individual room choices cleared, because “' + input.value + '” covers them.';
      } else {
        areasNote.textContent = '';
      }
    });
  });

  /* ---------- Priorities: up to three ---------- */
  var priInputs = root.querySelectorAll('input[name="priorities"]');
  function syncPriorities() {
    var n = checkedValues('priorities').length;
    priCount.textContent = n + ' of ' + MAX_PRIORITIES + ' chosen.' + (n >= MAX_PRIORITIES ? ' Untick one to choose another.' : '');
    priInputs.forEach(function (i) { i.disabled = !i.checked && n >= MAX_PRIORITIES; });
  }
  priInputs.forEach(function (i) { i.addEventListener('change', syncPriorities); });

  /* ---------- Note counter ---------- */
  function syncNote() { noteCount.textContent = note.value.length + ' of 280 characters'; }
  note.addEventListener('input', syncNote);

  /* ---------- Validation ---------- */
  var fieldErrors = {
    'f-flat': 'Choose a flat type, or “Not sure”.',
    'f-areas': 'Choose at least one room or area, or “Not sure yet”.',
    'f-priorities': 'Choose at least one everyday priority.',
    'f-atmos': 'Choose an atmosphere, or “Not sure yet”.'
  };
  function problemsFor(s) {
    var a = answers(), p = [];
    if (s === 1) {
      if (!a.flat) p.push('f-flat');
      if (!a.areas.length) p.push('f-areas');
    } else if (s === 2) {
      if (!a.priorities.length) p.push('f-priorities');
      if (!a.atmosphere) p.push('f-atmos');
    }
    return p;
  }
  function clearErrors() {
    errorBox.hidden = true;
    errorBox.innerHTML = '';
    root.querySelectorAll('fieldset.has-error').forEach(function (f) { f.classList.remove('has-error'); });
    root.querySelectorAll('.field-error').forEach(function (e) { e.hidden = true; e.textContent = ''; });
  }
  function showErrors(ids) {
    clearErrors();
    var h = document.createElement('h4');
    h.textContent = ids.length === 1 ? 'One thing to check' : ids.length + ' things to check';
    var ul = document.createElement('ul');
    ids.forEach(function (id) {
      var fs = document.getElementById(id);
      fs.classList.add('has-error');
      var msg = fs.querySelector('.field-error');
      msg.textContent = fieldErrors[id];
      msg.hidden = false;
      var li = document.createElement('li');
      var link = document.createElement('a');
      link.href = '#' + id;
      link.textContent = fieldErrors[id];
      link.addEventListener('click', function (e) {
        e.preventDefault();
        var first = fs.querySelector('input:not(:disabled)');
        focusAndReveal(fs.querySelector('legend'));
        if (first) first.focus({ preventScroll: true });
      });
      li.appendChild(link);
      ul.appendChild(li);
    });
    errorBox.appendChild(h);
    errorBox.appendChild(ul);
    errorBox.hidden = false;
    focusAndReveal(errorBox);
  }
  // Clear a fieldset's error as soon as it is answered
  root.querySelectorAll('fieldset').forEach(function (fs) {
    fs.addEventListener('change', function () {
      if (!fs.classList.contains('has-error')) return;
      if (problemsFor(step).indexOf(fs.id) === -1) {
        fs.classList.remove('has-error');
        var msg = fs.querySelector('.field-error');
        if (msg) { msg.hidden = true; msg.textContent = ''; }
        if (!root.querySelector('fieldset.has-error')) { errorBox.hidden = true; errorBox.innerHTML = ''; }
      }
    });
  });

  /* ---------- Review ---------- */
  // Several options contain "and", so use a serial comma for three or more items to keep them distinct.
  function listText(arr) {
    if (arr.length <= 1) return arr.join('');
    if (arr.length === 2) return arr[0] + ' and ' + arr[1];
    return arr.slice(0, -1).join(', ') + ', and ' + arr[arr.length - 1];
  }
  function lower(v) { return v.charAt(0).toLowerCase() + v.slice(1); }
  function renderReview() {
    var a = answers();
    var rows = [
      ['Flat type', a.flat, 1, 'f-flat'],
      ['Rooms or areas', a.areas.join(', '), 1, 'f-areas'],
      ['Everyday priorities', a.priorities.join(', '), 2, 'f-priorities'],
      ['Atmosphere', a.atmosphere, 2, 'f-atmos'],
      ['Note', a.note || 'No note added', 3, 'note']
    ];
    reviewList.innerHTML = '';
    rows.forEach(function (r) {
      var row = document.createElement('div');
      row.className = 'review-row';
      var dt = document.createElement('dt'); dt.textContent = r[0];
      var dd = document.createElement('dd'); dd.textContent = r[1];
      var btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'edit';
      btn.textContent = 'Edit';
      btn.setAttribute('aria-label', 'Edit ' + r[0].toLowerCase());
      btn.addEventListener('click', function () { goTo(r[2], r[3]); });
      row.appendChild(dt); row.appendChild(dd); row.appendChild(btn);
      reviewList.appendChild(row);
    });
  }

  /* ---------- Step navigation ---------- */
  function render() {
    panels.forEach(function (p) { p.hidden = Number(p.dataset.stepPanel) !== step; });
    progressItems.forEach(function (li) {
      var n = Number(li.dataset.progress);
      if (n === step) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
      li.classList.toggle('is-done', n < step);
    });
    statusEl.textContent = 'Step ' + step + ' of ' + TOTAL;
    backBtn.hidden = step === 1;
    nextBtn.textContent = step === TOTAL ? 'Create sample brief' : 'Continue →';
    if (step === TOTAL) renderReview();
  }

  function goTo(s, focusId) {
    resetConfirm.hidden = true;
    lastResetTrigger = null;
    clearErrors();
    step = s;
    result.hidden = true;
    body.hidden = false;
    nav.hidden = false;
    render();
    var target = focusId ? document.getElementById(focusId) : null;
    if (target && target.tagName === 'FIELDSET') {
      focusAndReveal(target.querySelector('legend'));
      var first = target.querySelector('input:checked:not(:disabled)') || target.querySelector('input:not(:disabled)');
      if (first) first.focus({ preventScroll: true });
    } else if (target) {
      focusAndReveal(target);
    } else {
      focusAndReveal(document.getElementById('s' + s + '-title'));
    }
  }

  nextBtn.addEventListener('click', function () {
    var problems = problemsFor(step);
    if (problems.length) { showErrors(problems); return; }
    if (step < TOTAL) goTo(step + 1);
    else createBrief();
  });
  backBtn.addEventListener('click', function () { if (step > 1) goTo(step - 1); });

  /* ---------- Completed brief ---------- */
  function createBrief() {
    resetConfirm.hidden = true;
    lastResetTrigger = null;
    // Guard: every earlier step must still be valid
    for (var s = 1; s < TOTAL; s++) {
      if (problemsFor(s).length) { goTo(s); showErrors(problemsFor(s)); return; }
    }
    var a = answers();
    var home = a.flat === 'Not sure' ? 'A home where the flat type is still to be confirmed.' : 'A ' + a.flat + ' HDB resale flat.';
    var areas;
    if (a.areas[0] === 'Whole flat') areas = 'The whole flat is to be considered.';
    else if (a.areas[0] === 'Not sure yet') areas = 'The rooms to focus on are not decided yet.';
    else areas = 'Areas to consider: ' + listText(a.areas.map(lower)) + '.';
    var pri = 'Everyday priorities: ' + listText(a.priorities.map(lower)) + '.';
    var atm = a.atmosphere === 'Not sure yet'
      ? 'Preferred atmosphere: not sure yet — comparing directions first.'
      : 'Preferred atmosphere: ' + a.atmosphere + '.';

    resultProse.innerHTML = '';
    [home, areas, pri, atm].forEach(function (t) {
      var p = document.createElement('p'); p.textContent = t; resultProse.appendChild(p);
    });
    if (a.note) {
      var p = document.createElement('p');
      p.textContent = 'Note: “' + a.note + '”';
      resultProse.appendChild(p);
    }

    body.hidden = true;
    nav.hidden = true;
    result.hidden = false;
    progressItems.forEach(function (li) { li.removeAttribute('aria-current'); li.classList.add('is-done'); });
    statusEl.textContent = 'Sample brief ready';
    focusAndReveal(document.getElementById('result-title'));
  }

  /* ---------- Edit / reset ---------- */
  root.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var action = btn.dataset.action;
    if (action === 'edit-answers') {
      goTo(TOTAL);
    } else if (action === 'reset') {
      lastResetTrigger = btn;
      resetConfirm.hidden = false;
      resetConfirm.querySelector('[data-action="reset-no"]').focus();
    } else if (action === 'reset-no') {
      resetConfirm.hidden = true;
      if (lastResetTrigger) lastResetTrigger.focus();
    } else if (action === 'reset-yes') {
      root.querySelectorAll('input').forEach(function (i) { i.checked = false; i.disabled = false; });
      note.value = '';
      areasNote.textContent = '';
      syncNote();
      syncPriorities();
      resetConfirm.hidden = true;
      goTo(1);
      statusEl.textContent = 'Answers cleared. Step 1 of 3';
    }
  });

  // Start clean on every load; do not let the browser restore earlier answers.
  root.querySelectorAll('input').forEach(function (i) { i.checked = false; i.setAttribute('autocomplete', 'off'); });
  note.value = '';
  syncNote();
  syncPriorities();
  render();
})();
