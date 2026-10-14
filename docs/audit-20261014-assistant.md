# Auditoría del asistente y presentación de fechas

## Correcciones

- El asistente presenta negritas, títulos, listas y bloques de código con un formato básico legible. No interpreta HTML ni genera enlaces activos a partir de las respuestas.
- Los fragmentos como `<h1>` se muestran literalmente, sin insertar etiquetas en la conversación.
- Una consulta rechazada o fallida muestra un aviso visible para reintentar. No se presenta el error como evidencia de auditoría.
- Un bloqueo inmediato evita solicitudes simultáneas por pulsaciones repetidas. Al cambiar de negocio, la instancia anterior no actualiza la conversación desmontada.
- Las fechas del asistente, la auditoría y el detalle del plan de acción utilizan 24 horas y muestran la zona horaria del negocio. Una zona inválida usa UTC y lo indica.

## Verificación local

159 pruebas aprobadas, comprobación de tipos y compilación correctas. Las pruebas nuevas verifican lectura del contenido, escape de HTML y horario nocturno con cambio de día. La prueba de renderizado es de servidor; no reemplaza la revisión visual en el navegador publicado.

## Pendientes de pruebas reales

- Incorporar estos cambios a AI Studio y publicar antes de revisar su presentación en producción.
- Exportar un PDF real de Informe y comprobar páginas, cortes y datos frente a las fuentes del negocio.
- Adjuntar ese PDF en Clientes, descargarlo y confirmar que el documento es el mismo. Registrar manualmente un envío de prueba con fecha y hora, y recargar para comprobar persistencia.
- Comprobar la solicitud PayPal copiada de un abono pendiente y la persistencia del enlace. Un enlace o una solicitud copiada no acredita un cobro.
- Validar una importación de Search Console con consultas reales no vacías de una propiedad autorizada y correspondiente al negocio. La importación vacía ya observada de Open Voley no sustituye esta prueba.

Estas pruebas pendientes no deben presentarse como aprobadas por los tests locales.
