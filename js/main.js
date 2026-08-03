/* =========================================================
   University Discovery Tours — Landing Early Bird
   main.js: countdown D/H/M/S, acordeón FAQ, scroll reveal,
   atribución UTM y eventos de inicio/abandono de formulario.

   El envío del formulario (submit) NO se maneja acá: lo hace
   el <script> inline al final de index.html, que postea al
   endpoint (Google Apps Script). Ya no se usa el CRM Escala.
========================================================= */

(function () {
  "use strict";

  /* ---------------------------------------------------------
     1. Año en el footer
  --------------------------------------------------------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------------------------------------------------------
     2. Countdown al 31 de agosto (early bird) — días/horas/min/seg
     Si la fecha del año en curso ya pasó, apunta al año siguiente
     para que el contador nunca muestre un número negativo.
  --------------------------------------------------------- */
  function getEarlyBirdDeadline() {
    var now = new Date();
    var deadline = new Date(now.getFullYear(), 7, 31, 23, 59, 59); // mes 7 = agosto
    if (now > deadline) {
      deadline = new Date(now.getFullYear() + 1, 7, 31, 23, 59, 59);
    }
    return deadline;
  }

  function renderCountdown(box, deadline) {
    var diff = deadline - Date.now();
    if (diff < 0) diff = 0;

    var days = Math.floor(diff / 86400000);
    var hours = Math.floor((diff % 86400000) / 3600000);
    var minutes = Math.floor((diff % 3600000) / 60000);
    var seconds = Math.floor((diff % 60000) / 1000);

    var pad = function (n) { return (n < 10 ? "0" : "") + n; };
    var set = function (unit, value) {
      var el = box.querySelector('[data-cd="' + unit + '"]');
      if (el) el.textContent = pad(value);
    };
    set("d", days);
    set("h", hours);
    set("m", minutes);
    set("s", seconds);
  }

  function startCountdowns() {
    var deadline = getEarlyBirdDeadline();
    var boxes = [
      document.getElementById("countdown-hero"),
      document.getElementById("countdown-closing"),
    ].filter(Boolean);

    if (boxes.length === 0) return;

    boxes.forEach(function (box) { renderCountdown(box, deadline); });
    setInterval(function () {
      boxes.forEach(function (box) { renderCountdown(box, deadline); });
    }, 1000);
  }

  /* ---------------------------------------------------------
     3. Acordeón de preguntas frecuentes
  --------------------------------------------------------- */
  function initFaqAccordion() {
    document.querySelectorAll(".qa > button").forEach(function (button) {
      button.addEventListener("click", function () {
        var item = button.parentElement;
        var isOpen = item.classList.toggle("open");
        button.setAttribute("aria-expanded", isOpen ? "true" : "false");
      });
    });
  }

  /* ---------------------------------------------------------
     4. Scroll reveal
  --------------------------------------------------------- */
  function initScrollReveal() {
    if (!("IntersectionObserver" in window)) {
      document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("in"); });
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    document.querySelectorAll(".reveal").forEach(function (el) { io.observe(el); });
  }

  /* ---------------------------------------------------------
     5. Captura y persistencia de UTMs por fuente
     Se guardan en sessionStorage la primera vez que llegan
     en la URL, y se reutilizan aunque el usuario navegue
     entre secciones o vuelva a cargar la página sin ellas.
  --------------------------------------------------------- */
  var UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
  var STORAGE_KEY = "udt_utm";

  function captureUtms() {
    var params = new URLSearchParams(window.location.search);
    var hasNewUtms = UTM_KEYS.some(function (key) { return params.has(key); });

    var stored = {};
    try {
      stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY)) || {};
    } catch (e) {
      stored = {};
    }

    if (hasNewUtms) {
      UTM_KEYS.forEach(function (key) {
        if (params.has(key)) stored[key] = params.get(key);
      });
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
      } catch (e) { /* sessionStorage no disponible: se sigue sin persistencia */ }
    }

    // Fuente por defecto para tráfico directo, útil para separarlo en los reportes.
    if (!stored.utm_source) stored.utm_source = "directo";

    return stored;
  }

  function fillUtmFields(form, utms) {
    UTM_KEYS.forEach(function (key) {
      var field = form.querySelector('[data-utm="' + key + '"]');
      if (field) field.value = utms[key] || "";
    });
  }

  /* ---------------------------------------------------------
     6. Eventos de analítica sobre el inicio y abandono del
     formulario. Se envían a window.dataLayer (estándar GA4 / GTM).
     El evento de envío (lead_form_submit) lo dispara el script
     de conexión al endpoint, al final de index.html.
     TODO: agregar el contenedor de GTM / ID de GA4 en el
     <head> de index.html para que estos eventos lleguen a
     una propiedad real.
  --------------------------------------------------------- */
  window.dataLayer = window.dataLayer || [];

  function trackEvent(name, params) {
    var payload = Object.assign({ event: name }, params || {});
    window.dataLayer.push(payload);
  }

  function instrumentForm(form) {
    var location = form.getAttribute("data-form-location") || "unknown";
    var startedFired = false;
    var abandonedFields = {};

    form.addEventListener(
      "focusin",
      function (e) {
        var field = e.target.closest("[data-field]");
        if (!field) return;

        if (!startedFired) {
          startedFired = true;
          trackEvent("form_start", { form_location: location });
        }
      },
      true
    );

    form.addEventListener(
      "focusout",
      function (e) {
        var field = e.target.closest("[data-field]");
        if (!field) return;

        var fieldName = field.getAttribute("data-field");
        var isEmpty = !field.value || field.value.trim() === "";

        if (isEmpty && !abandonedFields[fieldName]) {
          abandonedFields[fieldName] = true;
          trackEvent("form_field_abandon", {
            form_location: location,
            field_name: fieldName,
          });
        }
      },
      true
    );
  }

  /* ---------------------------------------------------------
     Inicialización
  --------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", function () {
    startCountdowns();
    initFaqAccordion();
    initScrollReveal();

    var utms = captureUtms();
    var forms = document.querySelectorAll(".lead-form");

    forms.forEach(function (form) {
      fillUtmFields(form, utms);
      instrumentForm(form);
    });
  });
})();
