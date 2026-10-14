# Disponibilidad del asistente

Una falla de red, sesión, límite de uso o proveedor ya no se sustituye silenciosamente por una plantilla local. El cliente acepta únicamente una respuesta de texto no vacía. Una respuesta anterior con `reply: null`, un HTML de acceso o un cuerpo malformado se muestran como consulta sin respuesta.

El modal distingue problemas de sesión, límite temporal y disponibilidad; permite **Reintentar consulta**. Los avisos de error se excluyen del historial que se envía al modelo. No representan nuevos hallazgos ni una auditoría ejecutada.

El servidor devuelve 503 si falta Gemini, 502 ante respuesta vacía o falla del proveedor, y aplica un tiempo límite de 45 segundos a la consulta del proveedor. El cuerpo HTTP no incluye el mensaje interno del error de Gemini.

Pruebas locales: respuestas válidas, errores 401/403/429/500/503, falla de red, respuestas vacías, formatos inesperados y mensajes sin detalles internos. No se provocaron caídas en la cuenta de producción. Sigue pendiente el circuito real de PDF, Clientes y envío manual del plan de cierre.
