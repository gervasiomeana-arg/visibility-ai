# Control funcional de Visibility — 19 de octubre de 2026

## Verificado en la publicación real

- `/version.json`: HTTP 200, release `2026-10-19-identity`, incluye el flujo privado de PR86.
- `/api/health`: HTTP 200 en producción. El servidor declara presentes las configuraciones Supabase, OAuth de Search Console, persistencia de tokens, PageSpeed y Gemini. Esto no demuestra cuotas, permisos o consultas operativas de cada proveedor.
- Bundle `index-DGNcENqx.js`: HTTP 200 e incluye `client_audit_runs`. CSS `index-Br65tvm-.css`: HTTP 200. La actualización visual y funcional llegó al servidor.
- Auditoría SEO y propiedades Search Console sin autenticación: HTTP 401, sin ejecutar consultas ni exponer datos.
- Ruta API inexistente: HTTP 404 con JSON, sin página HTML de éxito ficticio.

## Verificado en código

338 pruebas automatizadas aprobadas, sin fallos; TypeScript y build de producción correctos. La suite comprueba navegación, datos reales frente a ausencia de medición, ámbitos de cliente/negocio/espacio, persistencia y errores, PDF y huellas de archivos, pagos manuales, historial, OAuth y validadores de fuentes. Los proveedores simulados de esas pruebas no prueban la disponibilidad de las integraciones reales.

## Correcciones encontradas durante esta revisión

1. Editar una ficha antigua sin negocio o sin país del negocio podía introducir propiedades opcionales `undefined` y rechazar el guardado. La validación ahora admite campos opcionales ausentes y sigue rechazando valores de tipo incorrecto, URL insegura y textos excesivos. Prueba de regresión incluida.
2. Vaciar el selector global de cliente podía dejar visible la ficha previamente seleccionada. Ahora se limpia la selección local y el borrador al quitar el cliente desde el selector.

Estas correcciones necesitan actualizar y publicar desde AI Studio después de integrarlas en main. No alteran pagos, informes ni datos existentes.

## Pendiente de comprobar con sesión real

- Iniciar sesión y recorrer Clientes, Página web, Redes, Buscadores, IA e Historial.
- Guardar una ficha, recargar y confirmar su contenido.
- Ejecutar cada integración con un cliente confirmado y revisar fuente, fecha, cuota y permisos reales.
- Guardar una auditoría, recargar, abrirla y combinar/comparar mediciones compatibles.
- Descargar e imprimir un PDF desde el navegador y preparar su entrega manual.
- Comprobar navegación móvil y comportamiento visual.

El navegador del entorno rechazó la observación porque su estado de credenciales no podía reanudarse de forma segura, incluso después de reiniciar el runtime. No se reutilizaron contraseñas ni tokens y no se sustituyeron estas pruebas por lecturas privilegiadas de datos de clientes. No se enviaron mensajes ni se registraron pagos o entregas de prueba en producción.

Conclusión: la publicación está accesible y la suite técnica pasa. No se declara aprobado el recorrido funcional completo con sesión hasta realizar las comprobaciones pendientes.

## Control adicional de navegación durante operaciones

El selector global de cliente ahora se bloquea mientras Clientes carga, guarda o descarga un PDF. Los botones de la lista ya estaban bloqueados; el selector global había quedado fuera de esa protección. Así se evita cambiar de ficha durante una operación y que una respuesta tardía vuelva a seleccionar el cliente anterior. La protección se libera al finalizar o abandonar la vista. Esta comprobación se hizo sobre el código, con validación de tipos y pruebas de navegación; no sustituye la prueba autenticada pendiente.

## Actualización: pruebas autenticadas con TinyFish

La sesión guardada por el propietario permitió entrar. Esta sección reemplaza el bloqueo de acceso mencionado anteriormente, pero no convierte pruebas pendientes en aprobadas.

| Control | Evidencia del navegador | Estado |
| --- | --- | --- |
| Acceso y menú | Se recorrieron las seis solapas y la ficha QA existente | Aprobado en el recorrido observado |
| Selección de cliente | Se mantuvo al navegar entre solapas | Aprobado |
| Auditoría web | Se ejecutó una vez para openvoley.com desde la ficha QA; respuesta HTTP 200, URL final open-voley-2026.ai.studio | Aprobado |
| Guardado de auditoría | Confirmación explícita; Historial mostró el registro guardado a 2026-10-19T20:31:28.920238+00:00 | Aprobado |
| Relectura tras recargar | Se reabrió el mismo registro con la misma URL, fecha y hallazgos | Aprobado |
| Search Console | Propiedad sc-domain:openvoley.com; consulta real del 2026-09-20 al 2026-10-18 devolvió cero filas | Consulta operativa; cero filas no acredita ausencia de visitas |
| Gemini | Mensaje de límite de uso cuya ventana no fue especificada; no se generó resultado nuevo | Bloqueado por el proveedor; no equivale a confirmar créditos agotados |
| Instagram | Campo de perfil confirmado vacío para esta ficha/negocio | No probado |
| YouTube | Perfil vacío y estado de configuración sin confirmar o pendiente de clave | No probado; la etiqueta ambigua no confirma por sí sola ausencia de clave |
| PDF | La app mostró confirmación de descarga, sin inspección del archivo | Archivo no verificado |
| Impresión y móvil | En el control posterior la automatización quedó esperando el paso de impresión | Pendientes |

La prueba web guardó una medición real en la ficha existente marcada QA/NO COBRAR. No creó clientes, modificó fichas, registró pagos ni envió informes. Las respuestas nuevas de Search Console e IA no fueron guardadas. El período de Search Console se informa por sus fechas exactas; no se lo etiqueta como 28 días, porque ambas fechas incluidas abarcan 29 días.

El bundle publicado comprobado después de estas pruebas fue index-CGQDxGS7.js: incluye la corrección de campos opcionales de PR88, pero no la propiedad onInteractionLockChange de PR89. La publicación de PR89 sigue pendiente; que esté integrado en GitHub no demuestra despliegue.

### Resultado final del control de descarga, impresión y móvil

La automatización terminó sin poder inspeccionar el historial de descargas, el diálogo nativo de impresión ni cambiar el viewport. Por ello, PDF descargado/abierto, vista previa impresa y ancho móvil de 390 px permanecen NO PROBADOS. El clic en los botones no acredita el resultado final. No se enviaron trabajos a impresoras ni se modificaron registros durante este control.

Se corrige el texto de confirmación del botón PDF: ahora indica que el documento se preparó y pide comprobar la descarga en el navegador, en lugar de afirmar que el archivo ya fue recibido. La generación, las fechas/fuentes y la persistencia del informe no cambian.
