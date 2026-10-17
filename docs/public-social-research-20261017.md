# Investigación de lectura pública sin cuentas ni proveedores pagos — 17/10/2026

## Objetivo solicitado
Consultar clientes en Instagram/Facebook/TikTok sin claves del cliente ni proveedores pagos. Mantener la pantalla simple de Redes. Nunca afirmar cobertura universal ni crear métricas para llenar un gráfico.

## Revisión de proyectos y fuentes primarias

| Proyecto | Evidencia revisada | Evaluación para Visibility |
| --- | --- | --- |
| Instaloader (MIT) | README, licencia; incidencia abierta #2726 de agosto de 2026 sobre 429 anónimo en web_profile_info | Se probó anónimamente antes: 429, sin cifras. No repetir con otros encabezados, proxies o sesiones para eludirlo. No valida una solución universal. |
| drawrowfly/instagram-scraper (InstaTouch, README MIT) | README dice «No login», pero Features y Get Session Id exigen sesión activa para varias funciones. Código getUserMeta y GraphQL revisados | No adoptar como solución garantizada sin sesión. |
| The-Cool-Coders/Instascrape (MIT) | README indica funcionamiento probado en diciembre de 2020 | Es una referencia histórica, no una prueba de funcionamiento actual. |
| MmdUnion/instagram-scraper | README requiere proxies residenciales; no se verificó una licencia de reutilización | No satisface el alcance sin proveedores/proxies. No se instaló. |
| kevinzg/facebook-scraper (MIT) | README, LICENSE y facebook_scraper.py: JSON-LD FollowAction y HTML; usa sesiones móviles y tiene opciones de cookies | Referencia para campos y formatos. No importar todo el paquete ni afirmar acceso actual probado. Visibility ya leía FollowAction, pero solo como número JSON; ahora también acepta enteros exactos en cadena. |
| davidteather/TikTok-Api (MIT) | Quick Start requiere ms_token de cookies y navegador | No presentar su configuración de ejemplo como libre de sesión. |
| yt-dlp (Unlicense, con dependencias/licencias adicionales si se distribuye) | TikTokUserIE: webapp.user-detail, userInfo, stats/statsV2; extractor con alternativas y suplantación opcionales | Se incorporó soporte propio de los formatos JSON statsV2 y contadores exactos en cadena, sin importar el programa ni mecanismos de suplantación. |
| Actores comerciales anunciados en GitHub | Ej. WaveLeKick/instagram-profile anuncia $2.50/1000 perfiles en su README | Un repositorio público no demuestra que su servicio sea gratuito ni que publique un extractor autónomo reutilizable. Excluidos del alcance. |

Fuentes:
- https://github.com/instaloader/instaloader
- https://github.com/instaloader/instaloader/issues/2726
- https://github.com/drawrowfly/instagram-scraper
- https://github.com/The-Cool-Coders/Instascrape
- https://github.com/MmdUnion/instagram-scraper
- https://github.com/kevinzg/facebook-scraper/blob/master/LICENSE
- https://github.com/kevinzg/facebook-scraper/blob/master/facebook_scraper/facebook_scraper.py
- https://github.com/davidteather/TikTok-Api
- https://github.com/yt-dlp/yt-dlp/blob/master/yt_dlp/extractor/tiktok.py
- https://github.com/WaveLeKick/instagram-profile

## Otra vía oficial investigada
TikTok Creator Profile Embed muestra seguidores, seguidos y Me gusta en la tarjeta pública. Su oEmbed documentado acepta una URL sin una clave en el ejemplo. Sin embargo, el JSON documentado devuelve código de inserción, autor y título, **no los contadores numéricos**. Mostrar esa tarjeta no equivale a importar cifras para nuestros gráficos. No se añadió una tarjeta extra a la pantalla simple ni se ejecuta su HTML arbitrario en Visibility.
https://developers.tiktok.com/docs/en/embed-creator-profiles

## Mejora concreta implementada
- Lectura de descripción Open Graph/meta solamente si canonical/og:url identifican el perfil solicitado. Si las identidades discrepan se rechaza esa fuente.
- Lectura de seguidores y publicaciones acumuladas en metadatos de perfil, con etiquetas inglés/español/portugués/francés. No leer números de comentarios, tarjetas de competidores ni todo el texto de la página.
- Separadores enteros exactos permitidos; 1.2K, 1,2 mil y cifras ambiguas no se expanden. Descripciones contradictorias se descartan.
- TikTok userInfo.statsV2 además de stats, con identidad de usuario y enteros seguros.
- FollowAction JSON-LD acepta recuentos enteros exactos en cadena.
- Se conserva la procedencia en evidencia y la fecha de observación real. Nada de esto acredita alcance o totales mensuales de vistas.
- Sin nuevas dependencias, cookies, pagos, tokens ni Gemini. Mismo lector HTTPS con protección SSRF. No hay segunda ruta ni reintentos frente a una pantalla de login.

## Pruebas reales y límites
- El 17/10/2026 a las 21:57:50 UTC se ejecutó una consulta anónima con el lector real a https://www.facebook.com/NASA/. Resultado **dns**: el entorno no resolvió el dominio. No se llegó a Facebook y no se obtuvieron cifras. No se infiere bloqueo de Facebook de este fallo local.
- El experimento anterior de Instaloader contra nuevohorizontehotel devolvió HTTP 429. No se repitió ni se cambiaron sesiones/proxies/huellas para sortearlo.
- Las pruebas de extracción usan **fixtures explícitos**, no mediciones del hotel ni de NASA. Prueban la lectura e identidad, no la disponibilidad de las plataformas en producción.
- No se ha validado un extractor gratuito, anónimo y universal para cualquier cliente y red. El cambio amplía formatos que podemos leer cuando el sitio los entrega; no promete desbloquear Instagram ni reconstruir historial.
- Pendiente después de Publish: probar desde el servidor publicado con perfiles confirmados y registrar por red resultado, fuente, fecha y cifras realmente entregadas. No usar una prueba local o el README como sustituto de esta verificación.
