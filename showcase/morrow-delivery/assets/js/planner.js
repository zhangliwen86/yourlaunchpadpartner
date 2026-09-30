// Morrow sample delivery planner. Runs entirely in the browser:
// nothing is sent, stored or booked.
(function () {
  'use strict';

  var form = document.getElementById('planner');
  if (!form) return;

  var fallback = document.getElementById('planner-fallback');
  var complete = document.getElementById('complete');
  var summary = document.getElementById('error-summary');
  var errorList = document.getElementById('error-list');
  var progress = document.querySelectorAll('#progress li');
  var panels = form.querySelectorAll('.step-panel');
  var current = 1;

  var SERVICE_NAMES = { 'same-day': 'Same-day parcel', 'scheduled': 'Scheduled delivery', 'recurring': 'Recurring business run' };

  fallback.hidden = true;
  form.hidden = false;

  // ---- Helpers ----
  function todayISO() {
    var d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  }
  function formatDate(iso) {
    if (!iso) return '';
    var parts = iso.split('-');
    var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    try {
      return d.toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) { return iso; }
  }
  function service() {
    var checked = form.querySelector('input[name="service"]:checked');
    return checked ? checked.value : '';
  }
  function values(name) {
    return Array.prototype.map.call(form.querySelectorAll('input[name="' + name + '"]:checked'), function (i) { return i.value; });
  }
  function el(tag, attrs, text) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    if (text != null) node.textContent = text;
    return node;
  }

  ['date', 'start'].forEach(function (id) { document.getElementById(id).min = todayISO(); });

  // ---- Service-specific fields ----
  function applyService() {
    var s = service();
    form.querySelectorAll('[data-for]').forEach(function (block) {
      var on = !s || block.getAttribute('data-for').split(' ').indexOf(s) !== -1;
      block.hidden = !on;
      block.querySelectorAll('input, select, textarea').forEach(function (c) { c.disabled = !on; });
      if (block.tagName === 'FIELDSET') block.disabled = !on;
    });
    document.getElementById('count-label').textContent = s === 'recurring' ? 'Parcels per run (roughly)' : 'Number of parcels';
    var intro = document.getElementById('s2-intro');
    intro.textContent = (s ? SERVICE_NAMES[s] + '. ' : '') + 'Sample areas only. Please don\'t enter names, phone numbers or addresses.';
  }
  form.addEventListener('change', function (e) {
    if (e.target.name === 'service') { applyService(); clearError(document.getElementById('f-service')); }
  });

  // ---- Validation ----
  function errorFor(control) {
    var ids = (control.getAttribute('aria-describedby') || '').split(' ');
    for (var i = 0; i < ids.length; i++) {
      if (ids[i].indexOf('err-') === 0) return document.getElementById(ids[i]);
    }
    return null;
  }
  function setError(control, message) {
    var box = errorFor(control);
    control.setAttribute('aria-invalid', 'true');
    if (box) { box.textContent = message; box.hidden = false; }
  }
  function clearError(control) {
    var box = errorFor(control);
    control.removeAttribute('aria-invalid');
    if (box) { box.textContent = ''; box.hidden = true; }
  }
  function labelText(control) {
    if (control.tagName === 'FIELDSET') {
      var legend = control.querySelector('legend');
      return legend && !legend.classList.contains('visually-hidden') ? legend.textContent : 'Service';
    }
    var label = form.querySelector('label[for="' + control.id + '"]');
    return label ? label.textContent.trim() : control.name;
  }

  function checkControl(control) {
    if (control.tagName === 'FIELDSET') {
      var min = Number(control.getAttribute('data-min') || (control.id === 'f-service' ? 1 : 0));
      var count = control.querySelectorAll('input:checked').length;
      return count < min ? control.getAttribute('data-msg') : '';
    }
    var v = control.value.trim();
    if (control.required && !v) return control.getAttribute('data-msg') || 'Complete ' + labelText(control).toLowerCase() + '.';
    if (control.type === 'number') {
      var n = Number(v);
      if (!/^\d+$/.test(v) || n < Number(control.min) || n > Number(control.max)) return control.getAttribute('data-msg');
    }
    if (control.type === 'date' && v) {
      if (control.validity.badInput || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return 'Enter a valid date.';
      if (v < control.min) return 'Choose today or a later date.';
    }
    return '';
  }

  function controlsFor(step) {
    var panel = form.querySelector('.step-panel[data-step="' + step + '"]');
    var list = [];
    if (step === 1) return [document.getElementById('f-service')];
    panel.querySelectorAll('select[required], input[required], fieldset[data-min]').forEach(function (c) {
      if (!c.disabled && !c.closest('[hidden]')) list.push(c);
    });
    return list;
  }

  function validateStep(step) {
    var problems = [];
    controlsFor(step).forEach(function (c) {
      var msg = checkControl(c);
      if (msg) { setError(c, msg); problems.push({ control: c, msg: msg }); }
      else clearError(c);
    });

    errorList.textContent = '';
    if (!problems.length) { summary.hidden = true; return true; }

    problems.forEach(function (p) {
      var isGroup = p.control.tagName === 'FIELDSET';
      var target = isGroup ? (p.control.querySelector('input:checked') || p.control.querySelector('input')) : p.control;
      // Scroll to the whole field (label, hint and message), not just the input.
      var region = isGroup ? p.control : (p.control.closest('.field') || p.control);
      var li = el('li');
      var a = el('a', { href: '#' + (p.control.id || target.id) }, p.msg);
      a.addEventListener('click', function (e) {
        e.preventDefault();
        target.focus({ preventScroll: true });
        scrollBelowHeader(region);
      });
      li.appendChild(a);
      errorList.appendChild(li);
    });
    summary.hidden = false;
    summary.focus({ preventScroll: true });
    scrollBelowHeader(summary);
    return false;
  }

  // Scroll so the element's top sits just below the sticky header.
  function headerOffset() {
    var header = document.querySelector('.site-header');
    return (header ? header.getBoundingClientRect().height : 0) + 16;
  }
  function scrollBelowHeader(node) {
    var top = node.getBoundingClientRect().top + window.pageYOffset - headerOffset();
    window.scrollTo({ top: Math.max(0, top), behavior: 'instant' });
  }

  // Clear a field's error as soon as it is corrected.
  form.addEventListener('input', onEdit);
  form.addEventListener('change', onEdit);
  function onEdit(e) {
    var t = e.target;
    var group = t.closest('fieldset[data-min], #f-service');
    var control = group && (t.type === 'checkbox' || t.type === 'radio') ? group : t;
    if (control.getAttribute('aria-invalid') === 'true' && !checkControl(control)) {
      clearError(control);
      if (!form.querySelector('[aria-invalid="true"]')) summary.hidden = true;
    }
  }

  // ---- Steps ----
  function show(step, focusHeading) {
    current = step;
    panels.forEach(function (p) { p.hidden = Number(p.getAttribute('data-step')) !== step; });
    progress.forEach(function (li) {
      var n = Number(li.getAttribute('data-step'));
      if (n === step) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
      li.classList.toggle('is-done', n < step);
    });
    summary.hidden = true;
    if (step === 3) buildReview();
    if (focusHeading !== false) {
      var h = form.querySelector('.step-panel[data-step="' + step + '"] h2');
      h.focus({ preventScroll: true });
      scrollToTop(form);
    }
  }

  function scrollToTop(node) {
    var top = node.getBoundingClientRect().top + window.pageYOffset - headerOffset();
    if (window.pageYOffset > top) window.scrollTo({ top: top, behavior: 'instant' });
  }

  form.addEventListener('click', function (e) {
    var next = e.target.closest('[data-next]');
    var back = e.target.closest('[data-back]');
    var edit = e.target.closest('[data-edit]');
    if (next) { if (validateStep(current)) show(current + 1); }
    else if (back) show(current - 1);
    else if (edit) show(Number(edit.getAttribute('data-edit')));
  });

  // Enter in a text field should advance, not submit the whole form.
  form.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT' && current < 3) {
      e.preventDefault();
      if (validateStep(current)) show(current + 1);
    }
  });

  // ---- Review & brief ----
  function planRows() {
    var s = service();
    var rows = { service: [['Service', SERVICE_NAMES[s] || '']], details: [] };
    var d = rows.details;
    d.push(['Pickup area', form.elements.pickup.value]);
    if (s === 'recurring') d.push(['Drop-off areas', values('dropoffs').join(', ')]);
    else d.push(['Drop-off area', form.elements.dropoff.value]);
    d.push(['Size', form.elements.size.value]);
    d.push([s === 'recurring' ? 'Parcels per run' : 'Parcels', form.elements.count.value]);
    if (s === 'same-day') d.push(['Ready for pickup', form.elements.ready.value]);
    if (s === 'scheduled') { d.push(['Date', formatDate(form.elements.date.value)]); d.push(['Time window', values('window')[0]]); }
    if (s === 'recurring') {
      d.push(['First run', formatDate(form.elements.start.value)]);
      d.push(['Collection days', values('days').join(', ')]);
      d.push(['Time window', values('window')[0]]);
    }
    d.push(['Handling', values('handling').join(', ') || 'None noted']);
    d.push(['Notes', form.elements.notes.value.trim() || 'None']);
    return rows;
  }

  function dl(rows) {
    var list = el('dl');
    rows.forEach(function (r) {
      var div = el('div');
      div.appendChild(el('dt', null, r[0]));
      div.appendChild(el('dd', null, r[1]));
      list.appendChild(div);
    });
    return list;
  }

  function reviewCard(title, step, rows) {
    var card = el('article', { class: 'review-card' });
    var head = el('header');
    head.appendChild(el('h3', null, title));
    var btn = el('button', { type: 'button', class: 'edit-btn', 'data-edit': String(step) }, 'Edit');
    btn.appendChild(el('span', { class: 'visually-hidden' }, ' ' + title.toLowerCase()));
    head.appendChild(btn);
    card.appendChild(head);
    card.appendChild(dl(rows));
    return card;
  }

  function buildReview() {
    var rows = planRows();
    var review = document.getElementById('review');
    review.textContent = '';
    review.appendChild(reviewCard('Service', 1, rows.service));
    review.appendChild(reviewCard('Details', 2, rows.details));
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault(); // Demo: never submit anywhere.
    if (current !== 3) return;
    // Re-check earlier steps in case something changed.
    if (!validateStep(1)) { show(1, false); validateStep(1); return; }
    if (!validateStep(2)) { show(2, false); validateStep(2); return; }
    var rows = planRows();
    var brief = document.getElementById('brief');
    brief.textContent = '';
    brief.appendChild(el('h3', null, 'Sample brief'));
    brief.appendChild(dl(rows.service.concat(rows.details)));
    form.hidden = true;
    complete.hidden = false;
    progress.forEach(function (li) { li.removeAttribute('aria-current'); li.classList.add('is-done'); });
    document.getElementById('done-title').focus({ preventScroll: true });
    scrollToTop(complete);
  });

  document.getElementById('back-to-review').addEventListener('click', function () {
    complete.hidden = true;
    form.hidden = false;
    show(3);
  });

  document.getElementById('restart').addEventListener('click', function () {
    form.reset();
    form.querySelectorAll('[aria-invalid]').forEach(clearError);
    applyService();
    complete.hidden = true;
    form.hidden = false;
    show(1);
  });

  // ---- Start ----
  var preset = new URLSearchParams(window.location.search).get('service');
  if (preset && SERVICE_NAMES[preset]) {
    var radio = form.querySelector('input[name="service"][value="' + preset + '"]');
    if (radio) radio.checked = true;
  }
  applyService();
  show(1, false);
})();
