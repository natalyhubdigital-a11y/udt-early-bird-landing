/* =========================================================
   University Discovery Tours — envío de formularios al CRM
   Compartido por index.html y espana.html (y cualquier otra
   landing de destino que se agregue con la misma estructura
   de formulario: id="lead-form" + id="form-status").
========================================================= */

(function () {
  const ENDPOINT = 'https://script.google.com/macros/s/AKfycbyGCGMxoBCrhBmBrAOsipk5oCt4cA3E5HqL6SggofanOU3nlNzYjgJCkIZ_hvViiRTt/exec';

  // Puede haber más de un formulario en la página (hero y cierre) y
  // todos usan id="lead-form" a propósito, así que se enganchan con
  // querySelectorAll (getElementById solo encontraría el primero).
  const forms = document.querySelectorAll('#lead-form');

  forms.forEach(function (form) {
    const status = form.querySelector('#form-status');
    if (!status) return;

    form.addEventListener('submit', async function (ev) {
      ev.preventDefault();
      const btn = form.querySelector('[type="submit"]');
      const textoOriginal = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = 'Enviando…'; }

      // Cuerpo urlencoded: evita el preflight CORS que Apps Script no sabe responder.
      const datos = new URLSearchParams(new FormData(form));

      // Captura de UTMs desde la URL actual; si no trae ninguna, se
      // respeta lo que ya haya en los campos ocultos (persistido por
      // main.js desde el aterrizaje original con pauta).
      const qs = new URLSearchParams(location.search);
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']
        .forEach(function (k) { datos.set(k, qs.get(k) || datos.get(k) || ''); });
      datos.set('pagina', location.href);

      try {
        const res  = await fetch(ENDPOINT, { method: 'POST', body: datos });
        const json = await res.json();
        if (json.result !== 'ok') throw new Error(json.message || 'Error');

        form.reset();
        status.style.display = 'block';
        status.style.color = '#1C203D';
        status.textContent = '¡Listo! Recibimos tus datos. Te contactamos en menos de 24 horas hábiles.';

        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: 'lead_form_submit', modalidad: datos.get('modalidad') || '' });

      } catch (err) {
        status.style.display = 'block';
        status.style.color = '#b00020';
        status.innerHTML = 'No pudimos enviar tu solicitud. Escríbenos por WhatsApp al <a href="https://wa.me/525612972014">+52 561 297 2014</a>.';
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = textoOriginal; }
      }
    });
  });
})();
