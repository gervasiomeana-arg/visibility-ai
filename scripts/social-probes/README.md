# Pruebas anónimas de Instagram

Experimentos separados de la aplicación. No se importan desde el servidor, no se ejecutan al publicar y no guardan mediciones en Supabase. No tienen modo de login, carga de cookies, proxies alternativos, mecanismos de evasión ni reintentos automáticos. No descargan fotos, videos, listas de seguidores o mensajes.

## Instaloader

Licencia MIT del proyecto: https://github.com/instaloader/instaloader/blob/master/LICENSE

En un entorno de desarrollo:

```bash
python -m venv /tmp/visibility-instagram-probe
/tmp/visibility-instagram-probe/bin/pip install -r scripts/social-probes/requirements.txt
/tmp/visibility-instagram-probe/bin/python scripts/social-probes/instaloader_probe.py nuevohorizontehotel
```

Salida JSON con método, versión, fecha y `authenticated: false`. Si hay acceso, intenta recuentos de seguidores/publicaciones y una muestra de hasta tres publicaciones. Máximo 12 segundos por solicitud y 40 segundos para el experimento. HTTP 401/403/429 interrumpe la consulta; no se lee ni reutiliza una sesión. Los errores de biblioteca no se exponen completos.

## Playwright

Licencia Apache 2.0 del proyecto: https://github.com/microsoft/playwright/blob/main/LICENSE

El paquete experimental fija `playwright-core` 1.62.1. Su navegador debe estar disponible en el entorno donde se ejecute; no agrega Chromium al despliegue actual de Visibility.

```bash
npm install --prefix scripts/social-probes
scripts/social-probes/node_modules/.bin/playwright-core install chromium --only-shell
node scripts/social-probes/playwright_probe.mjs nuevohorizontehotel
```

Crea un contexto vacío, navega al perfil indicado y solo admite Instagram y sus recursos estáticos. No carga estado de navegador ni credenciales. Comprueba identidad con el canonical/og:url, y solo extrae contadores enteros visibles (no convierte 1.2K en 1200). No pretende medir alcance, estadísticas privadas o interacciones por publicación. Si hay login o verificación, informa el bloqueo sin resolverlo. No se usa como mecanismo para reintentar un límite existente.

## Resultados reales del 17/10/2026

- Instaloader **4.15.4**: consulta anónima a `nuevohorizontehotel`, `2026-10-17T20:19:15.568096+00:00`, resultado `unavailable / rate-limited`, `AbortDownloadException` con HTTP 429 identificado. No produjo cifras y no se repitió la consulta.
- Playwright: la instalación del navegador desde el CDN oficial entregó un archivo inválido (ZIP truncado/no válido). El instalador terminó con error. El experimento devolvió `browser-unavailable` a `2026-10-17T20:20:47.786Z`; **no llegó a consultar Instagram**. No se probó otro navegador, proxy ni ruta para eludir el límite anterior.

Estos resultados no demuestran que el perfil no exista, que la biblioteca esté rota o que Instagram bloquee permanentemente el acceso. No acreditan una integración funcional de métricas. No se incorporan estos experimentos al servidor de producción hasta validar cobertura, recursos y condiciones de operación.

## Diagnóstico de Visibility

El lector existente ahora conserva un código seguro para DNS, timeout, TLS, HTTP 401/403/404/429/otros, contenido no HTML, respuesta demasiado grande, redirección a login y HTML sin contadores públicos. No transmite cuerpos de respuesta, cookies, tokens ni errores internos completos al usuario. No infiere bot detection únicamente de un 403/429. El mensaje visible distingue que un fallo DNS no llegó a consultar el sitio de una respuesta HTTP de la plataforma.
