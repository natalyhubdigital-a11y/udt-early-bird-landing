# University Discovery Tours — Landing Early Bird

Landing de conversión de una sola página para **University Discovery Tours (UDT)**. Objetivo
único: captar registros al programa antes del 31 de agosto (early bird). Sin menú de navegación,
un solo CTA primario repetido en el hero y en el cierre.

## Stack

HTML/CSS/JS estático, sin build ni dependencias de Node. Todo el código vive en 3 archivos:

```
index.html      → estructura y copy de las 7 secciones
css/style.css   → estilos (paleta navy #1C203D + dorado #D3AF37, tipografía Montserrat)
js/main.js      → countdown, acordeón FAQ, scroll reveal, atribución UTM y eventos de embudo
assets/img/     → fotos e imágenes del sitio
```

## Cómo correrlo en local

No requiere instalación. Cualquier servidor estático sirve:

```bash
# Python
python3 -m http.server 8000

# o con Node, si lo tenés instalado
npx serve .
```

Después abrí `http://localhost:8000`.

## Envío del formulario

El envío del formulario **no pasa por `main.js`**: el `<script>` inline al final de
`index.html` hace un `fetch` POST a un Google Apps Script Web App (variable `ENDPOINT` en ese
mismo bloque). Ahí también vive el honeypot antibot (`name="website"`) y el mensaje de fallback
por WhatsApp si falla el envío.

Hay dos formularios en la página (hero y cierre) y ambos comparten a propósito `id="lead-form"` —
el script los engancha a los dos con `querySelectorAll`, no con `getElementById`.

## Deploy en Vercel

Sitio 100% estático — Vercel lo detecta automáticamente sin configuración de build
(`Framework Preset: Other`, sin build command, output = raíz del repo). El archivo
`vercel.json` solo agrega encabezados de seguridad básicos (`X-Content-Type-Options`,
`X-Frame-Options`, `Referrer-Policy`).

1. Subí este repositorio a GitHub.
2. En Vercel: **New Project** → importar el repo → Deploy (sin tocar configuración).

## Pendientes conocidos

- Favicon (`assets/img/favicon.png`, referenciado en `index.html`, todavía no existe).
- Logo real de Laudex (hay un SVG placeholder en `assets/img/laudex-logo.svg`).
- ID de GTM/GA4 para que los eventos de `dataLayer` (`form_start`, `form_field_abandon`,
  `lead_form_submit`) lleguen a una propiedad real.
