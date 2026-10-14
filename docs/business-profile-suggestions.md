# Descripción asistida del negocio

En **Panorama → Editar perfil → Leer web y proponer descripción con IA**, el servidor consulta la URL del negocio y propone una descripción breve en español. Se muestran la URL final, la fecha de consulta y citas literales del texto consultado. Si hubo una redirección se conserva también la URL solicitada.

La propuesta no sustituye el perfil por sí sola: **Usar esta propuesta en el formulario** permite revisarla y editarla; **Guardar perfil** conserva el cambio mediante la persistencia existente del negocio y espacio activos. Los PDF anteriores no se modifican. Regenerar el informe después de guardar el perfil corregido.

El servidor usa el mismo fetch HTTPS con DNS fijado, bloqueo de redes privadas, comprobación de cada redirección, tiempo límite y límite de 2 MB de la auditoría. El endpoint POST `/api/business/profile/suggest` exige sesión Supabase y limita a 12 consultas por ventana. Necesita Gemini configurado. No escribe perfiles ni resultados de auditoría.

Se retiran scripts, estilos, comentarios y plantillas y se envían como máximo 18.000 caracteres de texto a Gemini. El contenido de la web se trata como documento no confiable, no como instrucciones. Las citas deben existir literalmente en ese texto; las citas inventadas, respuestas ilegibles y páginas con menos de 100 caracteres se rechazan sin una descripción de relleno. Esa comprobación no certifica que cada afirmación del modelo sea correcta: la revisión humana sigue siendo necesaria. El sitio puede estar desactualizado o describir otras entidades.

Esta consulta lee el **HTML inicial**, sin ejecutar JavaScript, y no investiga otros dominios ni páginas internas. Una SPA o una portada con poca información puede requerir completar el perfil manualmente. No infiere ciudad, país ni categoría ni cambia esos campos.

## Validación

Pruebas automatizadas de extracción, límites de contexto, citas, contexto del proveedor, ausencia de texto, aislamiento de la respuesta por negocio, autenticación y bloqueo de direcciones privadas. La comprobación interactiva en la app publicada y la generación real con Gemini quedan pendientes del despliegue; las pruebas usan respuestas controladas, no equivalen a una lectura real de Neomed.
