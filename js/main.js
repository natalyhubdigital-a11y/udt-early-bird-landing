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
     7. Botón flotante de WhatsApp — se inyecta una sola vez acá
     para que aparezca igual en todas las páginas del sitio sin
     duplicar el HTML en cada una.
  --------------------------------------------------------- */
  var WHATSAPP_NUMBER = "525612972014";
  var WHATSAPP_MESSAGE = "Hola, quiero más información sobre los tours de UDT";

  function whatsappUrl() {
    return "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(WHATSAPP_MESSAGE);
  }

  function initWhatsappFloat() {
    var link = document.createElement("a");
    link.href = whatsappUrl();
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.className = "wa-float";
    link.setAttribute("aria-label", "Escribinos por WhatsApp");
    link.innerHTML =
      '<svg viewBox="0 0 32 32" fill="#fff" aria-hidden="true">' +
      '<path d="M16.004 3C9.377 3 4 8.373 4 15c0 2.34.671 4.523 1.834 6.37L4 29l7.86-1.79A11.94 11.94 0 0 0 16.004 27C22.63 27 28 21.627 28 15S22.63 3 16.004 3Zm0 2c5.523 0 10 4.477 10 10s-4.477 10-10 10a9.94 9.94 0 0 1-5.06-1.377l-.363-.213-4.66 1.06 1.078-4.55-.238-.374A9.93 9.93 0 0 1 6.004 15c0-5.523 4.477-10 10-10Zm-3.49 5.36c-.207 0-.542.078-.826.39-.284.313-1.084 1.06-1.084 2.585 0 1.526 1.11 3 1.264 3.207.155.207 2.14 3.428 5.29 4.667 2.617 1.03 3.15.826 3.717.775.567-.052 1.83-.748 2.088-1.47.258-.723.258-1.34.181-1.47-.077-.13-.284-.207-.593-.362-.31-.155-1.83-.903-2.114-1.006-.284-.104-.49-.155-.696.155-.207.31-.8 1.006-.981 1.213-.181.207-.362.233-.671.078-.31-.155-1.31-.483-2.494-1.538-.922-.822-1.545-1.837-1.726-2.147-.181-.31-.02-.478.136-.633.14-.14.31-.362.465-.543.155-.181.207-.31.31-.517.104-.207.052-.388-.026-.543-.077-.155-.696-1.688-.955-2.31-.25-.6-.505-.52-.696-.53-.18-.008-.386-.01-.593-.01Z"/>' +
      "</svg>";
    document.body.appendChild(link);
  }

  /* ---------------------------------------------------------
     8. Modal de la calculadora de financiamiento Laudex.
     Cualquier elemento con [data-laudex-trigger] abre el modal
     con un iframe a la calculadora en vez de navegar afuera.
     Si por algún motivo el JS no corre, el trigger sigue siendo
     un <a target="_blank"> normal a la misma URL (fallback).
  --------------------------------------------------------- */
  var LAUDEX_URL = "https://www.laudex.mx/university-discovery-tour";

  function initLaudexModal() {
    var triggers = document.querySelectorAll("[data-laudex-trigger]");
    if (triggers.length === 0) return;

    var overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML =
      '<div class="modal-box" role="dialog" aria-modal="true" aria-label="Calculadora de financiamiento Laudex">' +
      '<div class="modal-head">' +
      "<p>Simulá tu financiamiento educativo con Laudex, nuestro aliado financiero, y descubrí cuánto pagarías al mes. La página empieza con la portada de Laudex — deslizá hacia abajo <b>dentro de este recuadro</b> para llegar a la calculadora.</p>" +
      '<button type="button" class="modal-close" aria-label="Cerrar">&times;</button>' +
      "</div>" +
      '<iframe title="Calculadora de financiamiento Laudex" loading="lazy"></iframe>' +
      "</div>";
    document.body.appendChild(overlay);

    var iframe = overlay.querySelector("iframe");
    var closeBtn = overlay.querySelector(".modal-close");
    var iframeLoaded = false;

    function openModal(ev) {
      if (ev) ev.preventDefault();
      if (!iframeLoaded) {
        iframe.src = LAUDEX_URL;
        iframeLoaded = true;
      }
      overlay.classList.add("open");
      document.body.style.overflow = "hidden";
    }

    function closeModal() {
      overlay.classList.remove("open");
      document.body.style.overflow = "";
    }

    triggers.forEach(function (trigger) { trigger.addEventListener("click", openModal); });
    closeBtn.addEventListener("click", closeModal);
    overlay.addEventListener("click", function (ev) {
      if (ev.target === overlay) closeModal();
    });
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape" && overlay.classList.contains("open")) closeModal();
    });
  }

  /* ---------------------------------------------------------
     Inicialización
  --------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", function () {
    startCountdowns();
    initFaqAccordion();
    initScrollReveal();
    initWhatsappFloat();
    initLaudexModal();

    var utms = captureUtms();
    var forms = document.querySelectorAll(".lead-form");

    forms.forEach(function (form) {
      fillUtmFields(form, utms);
      instrumentForm(form);
    });
  });
})();
