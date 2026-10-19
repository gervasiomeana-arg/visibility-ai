# YouTube y presencia en buscadores e IA

## Publicación

1. Aplicar `supabase/migrations/20261019145910_youtube_presence.sql`. Amplía Redes con YouTube y crea un historial de evidencias separado por negocio/espacio, con RLS de propietario. No borra mediciones existentes.
2. Habilitar YouTube Data API v3 en Google Cloud y crear una clave propia, restringida a esa API y al servidor cuando el alojamiento lo permita. Guardarla como `YOUTUBE_API_KEY`, nunca `VITE_YOUTUBE_API_KEY` ni en GitHub. No hace falta la contraseña ni autorización del canal del cliente.
3. Conservar `GEMINI_API_KEY` y un `GEMINI_MODEL` compatible con Google Search para la consulta automática identificada como Gemini. El proyecto puede consumir cuota/costos propios; no se contrata un proveedor de métricas intermediario.
4. Actualizar GitHub en AI Studio y Publish. Validar con un canal real confirmado antes de ofrecerlo como integración verificada en producción.

## Redes / YouTube

El flujo sigue siendo cliente, red, fechas y tres gráficos. Se admiten enlaces `/@identificador`, `/channel/UC…` y `/user/nombre`. Solo se consulta `channels.list` en un endpoint fijo de Google, con tiempo máximo y sin seguir redirecciones. Un rechazo o falta de configuración no habilita scraping alternativo.

Se guardan suscriptores observados y videos públicos acumulados. YouTube redondea hacia abajo los suscriptores a tres cifras significativas y puede ocultarlos. El gráfico y el PDF identifican esa precisión; no es un recuento exacto de personas. La API pública actual no reconstruye suscriptores de meses anteriores y este adaptador no entrega visualizaciones mensuales ni alcance. Un total acumulado de vistas no se convierte en vistas del período. La selección del período no cambia el momento de la observación.

Fuentes: https://developers.google.com/youtube/v3/docs/channels y https://developers.google.com/youtube/v3/docs/channels/list

## Buscadores e IA

Plataformas: Google, Bing, DuckDuckGo, ChatGPT, Claude, Gemini y Perplexity. Solo Gemini tiene consulta automática en esta entrega. Las demás plataformas permiten abrir la consulta y registrar evidencia manual; no afirmar que sus API o interfaces fueron consultadas automáticamente.

Cada registro conserva cliente, plataforma, consulta exacta, país/ciudad, idioma, dispositivo, fecha UTC, método, evidencia y propuesta opcional. País e idioma describen el contexto; no configuran ubicación real, VPN, idioma de Google Search ni dispositivo del proveedor. Comparar únicamente consultas y condiciones compatibles. Search Console sigue en Búsquedas, con sus métricas medidas por Google.

La comprobación manual exige texto realmente observado y URL. Solo buscadores admiten posición orgánica observada (1–100), excluyendo anuncios. No es una posición media de Search Console ni un ranking permanente. Una declaración del operador no es una verificación automática de Visibility. «No observada» solo describe la muestra consultada.

La investigación automática usa Gemini + Google Search y exige afirmaciones enlazadas a fuentes, búsquedas efectivas y referencias del proveedor. Se guarda solo después de revisión explícita, como pendiente de revisión y sin asignar posición ni concluir presencia/ausencia por coincidencias de nombres. La solicitud incluye contexto del negocio y no demuestra recomendación espontánea. Una respuesta API no reproduce necesariamente la interfaz del asistente, sesiones personalizadas ni respuestas de otros proveedores.

Los registros son append-only: correcciones mediante nueva observación. La fecha observada es distinta del momento de guardar. El informe consolidado incluye hasta diez observaciones más recientes, con método y fuentes; no las llama resultados del mes si sus fechas son otras. El historial de la sección muestra hasta 120 registros más recientes.

## Validación de producción pendiente

- Configurar clave YouTube propia y contrastar un canal real, incluyendo ocultamiento y precisión de suscriptores.
- Contrastar una consulta manual con su resultado visible en Google y otra en ChatGPT/Claude; conservar referencia o respuesta compartida.
- Consultar Gemini con la configuración del despliegue, revisar citas y guardar; comprobar recarga y PDF.
- Las pruebas automatizadas usan respuestas sintéticas identificadas dentro de tests; no se guardan como clientes reales.

## Diagnóstico de integraciones

`GET /api/integrations/status` requiere sesión y devuelve solo presencia de configuración y nombre de modelo; nunca claves, tokens, proyectos ni cuota supuesta. La pantalla YouTube indica si falta `YOUTUBE_API_KEY`. Una clave presente no confirma permisos ni cuota.

Ante un 429 de Gemini se leen únicamente detalles estructurados `google.rpc.QuotaFailure` y `google.rpc.RetryInfo`, si existen. Se muestran categorías fijas (por minuto, diario, búsqueda/generación o desconocido) y la espera indicada por el proveedor, limitada a un día. Sin esos detalles no se inventa ventana, saldo de créditos ni fecha de recuperación. No hay reintentos automáticos del 429 ni cambios de clave/modelo para eludir límites. Los límites se consultan en https://aistudio.google.com/rate-limit y se aplican al proyecto según https://ai.google.dev/gemini-api/docs/rate-limits .

Al cambiar consulta, país, idioma o dispositivo se descarta el borrador automático pendiente; no puede guardarse con condiciones diferentes. Los errores de carga del historial están separados de los errores de investigación.
