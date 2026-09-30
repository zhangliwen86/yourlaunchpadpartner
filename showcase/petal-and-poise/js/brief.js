// Petal & Poise — demo bouquet brief.
// Answers live only in the `state` object below (page memory). Nothing is
// written to storage, cookies or the URL, and nothing is sent anywhere.
(function () {
  "use strict";

  var app = document.getElementById("brief-app");
  var form = document.getElementById("brief-form");
  if (!app || !form) return;

  var FIELDS = [
    { name: "occasion", step: 1, label: "Occasion", error: "Choose an occasion." },
    { name: "format", step: 1, label: "Format", error: "Choose a bouquet, a vase arrangement or “Not sure”." },
    { name: "mood", step: 2, label: "Mood", error: "Choose a mood, or “Florist’s choice”." },
    { name: "palette", step: 2, label: "Palette", error: "Choose a palette, or “Florist’s choice”." },
    { name: "freedom", step: 2, label: "Florist’s freedom", error: "Choose how much freedom to give the florist." },
    { name: "note", step: 3, label: "Note", optional: true }
  ];
  var NOTE_MAX = 200;
  var CONTACT_ERROR = "Your note looks like it may include an email address or phone number. Please remove it: this demo doesn’t need contact details.";
  var EMAIL_PATTERN = /[^\s@]+@[^\s@]+\.[^\s@]{2,}/;
  var PHONE_PATTERN = /(?:\+?\d[\s\-().]*){8,}/;

  // Every mood has its own illustrative photograph (square web copies).
  var MOOD_IMAGES = {
    warm: { src: "assets/images/web/mood-warm-480.jpg", alt: "A loose bouquet of apricot garden roses, rust ranunculus and white lisianthus." },
    bright: { src: "assets/images/web/mood-bright-480.jpg", alt: "A bright bouquet of coral dahlias, pink ranunculus and marigold-yellow blooms." },
    serene: { src: "assets/images/web/mood-serene-480.jpg", alt: "A white and cream bouquet of garden roses, cosmos and lisianthus." },
    dramatic: { src: "assets/images/web/mood-dramatic-480.jpg", alt: "A rich bouquet of deep magenta dahlias, crimson ranunculus and violet sprigs." },
    fresh: { src: "assets/images/web/mood-fresh-480.jpg", alt: "A leafy green bouquet with lime-green blooms, white cosmos and ferns." },
    florist: { src: "assets/images/web/mood-florist-480.jpg", alt: "A soft mixed bouquet of peach roses, lilac lisianthus and pale yellow ranunculus." }
  };

  var steps = form.querySelectorAll("[data-step]");
  var progress = app.querySelector(".progress");
  var progressItems = app.querySelectorAll("[data-progress]");
  var completion = document.getElementById("completion");
  var preview = document.getElementById("page-preview");
  var previewList = document.getElementById("preview-list");
  var reviewList = document.getElementById("review-list");
  var doneList = document.getElementById("done-list");
  var doneVisual = document.getElementById("done-visual");
  var statusEl = document.getElementById("status");
  var note = document.getElementById("note");
  var noteCount = document.getElementById("note-count");
  var fallback = document.getElementById("js-fallback");

  var state = blankState();
  var current = 1;
  var returnToReview = false;

  function blankState() {
    return { occasion: "", format: "", mood: "", palette: "", freedom: "", note: "" };
  }

  function fieldByName(name) {
    for (var i = 0; i < FIELDS.length; i++) if (FIELDS[i].name === name) return FIELDS[i];
    return null;
  }

  function displayValue(name) {
    if (name === "note") return state.note.trim();
    if (!state[name]) return "";
    var inputs = form.querySelectorAll('input[name="' + name + '"]');
    for (var i = 0; i < inputs.length; i++) {
      if (inputs[i].value === state[name]) return inputs[i].getAttribute("data-label") || "";
    }
    return "";
  }

  function announce(message) {
    statusEl.textContent = "";
    window.setTimeout(function () { statusEl.textContent = message; }, 60);
  }

  function scrollAndFocus(scrollTarget, focusTarget) {
    scrollTarget.scrollIntoView({ block: "start", behavior: "instant" });
    focusTarget.focus({ preventScroll: true });
  }

  // ---------- Rendering ----------
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function renderList(dl, options) {
    dl.textContent = "";
    FIELDS.forEach(function (field) {
      var row = el("div");
      var value = displayValue(field.name);
      row.appendChild(el("dt", "key", field.label));
      var dd = el("dd", value ? "" : "is-empty", value || (field.optional ? options.emptyOptional : options.emptyRequired));
      row.appendChild(dd);
      if (options.edit) {
        var btn = el("button", "edit-btn");
        btn.type = "button";
        btn.setAttribute("data-edit", field.name);
        btn.appendChild(document.createTextNode("Edit"));
        btn.appendChild(el("span", "visually-hidden", " " + field.label.toLowerCase()));
        row.appendChild(btn);
      }
      dl.appendChild(row);
    });
  }

  function renderPreview() {
    renderList(previewList, { emptyRequired: "not yet chosen", emptyOptional: "optional" });
  }
  function renderReview() {
    renderList(reviewList, { edit: true, emptyRequired: "Not chosen", emptyOptional: "None added" });
  }

  function renderCompletionVisual() {
    doneVisual.textContent = "";
    var image = MOOD_IMAGES[state.mood];
    if (!image) return;
    var img = el("img", "completion__img");
    img.src = image.src;
    img.alt = image.alt;
    img.width = 480;
    img.height = 480;
    doneVisual.appendChild(img);
    doneVisual.appendChild(el("figcaption", "completion__imgcap small", state.mood === "florist"
      ? "Florist’s choice: one illustrative interpretation, not a promised arrangement. AI-generated concept."
      : "Mood reference: " + displayValue("mood") + ". AI-generated illustrative concept, not a product available to order."));
  }

  // ---------- Errors ----------
  function fieldContainer(name) { return document.getElementById("fs-" + name); }
  function errorEl(name) { return document.getElementById("err-" + name); }
  function stepSection(n) { return form.querySelector('[data-step="' + n + '"]'); }

  function clearFieldError(name) {
    var box = fieldContainer(name);
    var err = errorEl(name);
    if (!box || !err || err.hidden) return;
    box.classList.remove("has-error");
    err.hidden = true;
    err.textContent = "";
    if (name === "note") {
      note.removeAttribute("aria-invalid");
      note.setAttribute("aria-describedby", "note-hint note-count");
    } else {
      box.removeAttribute("aria-describedby");
    }
    var field = fieldByName(name);
    var summary = stepSection(field.step).querySelector("[data-error-summary]");
    var link = summary.querySelector('a[href="#fs-' + name + '"]');
    if (link) link.parentNode.remove();
    if (!summary.querySelector("li")) summary.hidden = true;
  }

  function clearStepErrors(n) {
    FIELDS.forEach(function (f) { if (f.step === n) clearFieldError(f.name); });
    stepSection(n).querySelector("[data-error-summary]").hidden = true;
  }

  function stepErrors(n) {
    var errors = [];
    FIELDS.forEach(function (f) {
      if (f.step !== n) return;
      if (!f.optional && !state[f.name]) errors.push({ name: f.name, message: f.error });
    });
    if (n === 3 && state.note && (EMAIL_PATTERN.test(state.note) || PHONE_PATTERN.test(state.note))) {
      errors.push({ name: "note", message: CONTACT_ERROR });
    }
    return errors;
  }

  function showErrors(n, errors) {
    clearStepErrors(n);
    var summary = stepSection(n).querySelector("[data-error-summary]");
    var list = summary.querySelector("ul");
    list.textContent = "";
    errors.forEach(function (e) {
      var box = fieldContainer(e.name);
      var err = errorEl(e.name);
      box.classList.add("has-error");
      err.textContent = e.message;
      err.hidden = false;
      if (e.name === "note") {
        note.setAttribute("aria-invalid", "true");
        note.setAttribute("aria-describedby", "err-note note-hint note-count");
      } else {
        box.setAttribute("aria-describedby", "err-" + e.name);
      }
      var li = el("li");
      var a = el("a", "", e.message);
      a.href = "#fs-" + e.name;
      li.appendChild(a);
      list.appendChild(li);
    });
    summary.hidden = false;
    scrollAndFocus(summary, summary);
  }

  function validate(n) {
    var errors = stepErrors(n);
    if (errors.length) { showErrors(n, errors); return false; }
    clearStepErrors(n);
    return true;
  }

  function focusField(name) {
    var box = fieldContainer(name);
    var target = name === "note"
      ? note
      : (box.querySelector("input:checked") || box.querySelector("input"));
    scrollAndFocus(box, target);
  }

  // ---------- Navigation ----------
  function updateNextLabels() {
    form.querySelectorAll('[data-action="next"]').forEach(function (btn) {
      if (!btn.hasAttribute("data-default-html")) btn.setAttribute("data-default-html", btn.innerHTML);
      if (returnToReview) btn.textContent = "Return to review";
      else btn.innerHTML = btn.getAttribute("data-default-html");
    });
  }

  function showStep(n, options) {
    options = options || {};
    current = n;
    steps.forEach(function (s) { s.hidden = Number(s.getAttribute("data-step")) !== n; });
    progressItems.forEach(function (li) {
      var p = Number(li.getAttribute("data-progress"));
      if (p === n) li.setAttribute("aria-current", "step");
      else li.removeAttribute("aria-current");
      li.classList.toggle("is-done", p < n);
    });
    updateNextLabels();
    if (n === 3) renderReview();

    if (options.noFocus) return;
    if (options.field) { focusField(options.field); return; }
    if (options.focusEl) { scrollAndFocus(options.focusEl, options.focusEl); return; }
    var heading = stepSection(n).querySelector(".step__heading");
    scrollAndFocus(heading, heading);
  }

  function next() {
    if (!validate(current)) return;
    if (returnToReview) {
      returnToReview = false;
      var reviewTitle = document.getElementById("review-title");
      reviewTitle.setAttribute("tabindex", "-1");
      showStep(3, { focusEl: reviewTitle });
      return;
    }
    showStep(Math.min(current + 1, 3));
  }

  function back() {
    showStep(Math.max(current - 1, 1));
  }

  function finish() {
    for (var n = 1; n <= 3; n++) {
      if (stepErrors(n).length) {
        if (n !== current) showStep(n, { noFocus: true });
        validate(n);
        return;
      }
    }
    renderList(doneList, { emptyRequired: "Not chosen", emptyOptional: "None added" });
    renderCompletionVisual();
    form.hidden = true;
    progress.hidden = true;
    preview.hidden = true;
    completion.hidden = false;
    var heading = document.getElementById("done-title");
    scrollAndFocus(heading, heading);
  }

  function reset() {
    state = blankState();
    returnToReview = false;
    form.reset();
    [1, 2, 3].forEach(clearStepErrors);
    updateCounter();
    renderPreview();
    doneList.textContent = "";
    doneVisual.textContent = "";
    completion.hidden = true;
    form.hidden = false;
    progress.hidden = false;
    preview.hidden = false;
    announce("Answers cleared.");
    showStep(1);
  }

  function updateCounter() {
    noteCount.textContent = note.value.length + " of " + NOTE_MAX + " characters";
  }

  // ---------- Events ----------
  form.addEventListener("submit", function (e) {
    e.preventDefault(); // never submit anywhere
    if (current < 3) next(); else finish();
  });

  form.addEventListener("change", function (e) {
    var t = e.target;
    if (t.type === "radio" && Object.prototype.hasOwnProperty.call(state, t.name)) {
      state[t.name] = t.value;
      clearFieldError(t.name);
      renderPreview();
      if (current === 3) renderReview();
    }
  });

  note.addEventListener("input", function () {
    state.note = note.value.slice(0, NOTE_MAX);
    updateCounter();
    if (!EMAIL_PATTERN.test(state.note) && !PHONE_PATTERN.test(state.note)) clearFieldError("note");
    renderPreview();
    renderReview();
  });

  app.addEventListener("click", function (e) {
    var actionBtn = e.target.closest("[data-action]");
    if (actionBtn) {
      var action = actionBtn.getAttribute("data-action");
      if (action === "next") next();
      else if (action === "back") back();
      else if (action === "finish") finish();
      else if (action === "reset") reset();
      return;
    }
    var editBtn = e.target.closest("[data-edit]");
    if (editBtn) {
      var field = fieldByName(editBtn.getAttribute("data-edit"));
      if (field.step === 3) { focusField("note"); return; }
      returnToReview = true;
      showStep(field.step, { field: field.name });
      return;
    }
    var errLink = e.target.closest(".error-summary a");
    if (errLink) {
      e.preventDefault();
      focusField(errLink.getAttribute("href").replace("#fs-", ""));
    }
  });

  // ---------- Init ----------
  form.reset(); // discard any browser-restored values so answers never survive a reload
  updateCounter();
  renderPreview();
  showStep(1, { noFocus: true });
  fallback.hidden = true;
  app.hidden = false;
  preview.hidden = false;
})();
