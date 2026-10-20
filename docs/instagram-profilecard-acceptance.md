# Descubrimiento de Instagram y autorización de Meta — 19 de octubre de 2026, Argentina

## Fallo reproducido y corregido

La web https://nuevohorizontehotel.com.ar/ contiene un enlace explícito a Instagram con formato `/nuevohorizontehotel/profilecard/?igsh=...`. El parser de Visibility aceptaba únicamente una parte de ruta, por lo que descartaba el enlace y solo encontraba Facebook. Se reprodujo con el HTML real descargado del hotel, sin ejecutar scripts ni inferir el usuario por su nombre.

La normalización acepta ahora exclusivamente el sufijo conocido `/profilecard/` de Instagram, lo elimina y conserva el identificador explícito: `https://www.instagram.com/nuevohorizontehotel/`. Deduplica ese enlace con la URL normal del mismo perfil. Continúa rechazando publicaciones, inicio de sesión, identificadores reservados, rutas anidadas extra, puertos y dominios ajenos. No se admiten sufijos similares para otras redes. El resultado sigue siendo un candidato para confirmación; encontrar un enlace no produce seguidores ni métricas.

La reproducción posterior sobre el mismo HTML encontró tanto Instagram como Facebook. No se interpreta el enlace a Facebook como prueba de métricas ni actividad actual del perfil.

## Prueba publicada de recolección: bloqueo real

Una primera automatización (`1baecbf2-430a-40d6-96a2-5d008dd05558`) acabó en la pantalla de login de Instagram y concluyó equivocadamente que no había enlace al perfil. No ejecutó la consulta de métricas ni guardó un resultado. Esa conclusión se descartó al comprobar el href del HTML real. El borrador de perfil de esa navegación no se guardó en la ficha.

Una segunda prueba acotada (`48e9de2a-61c4-45e4-baec-6bbb2faf680b`) usó el enlace confirmado, desde Redes de la ficha `PRUEBA QA · Hotel · NO COBRAR · 19-10-2026`. Período UTC 2026-10-01 a 2026-10-20. Ejecutó una sola consulta de Instagram Business Discovery y obtuvo:

> La autorización de la cuenta propia de Visibility venció o no es válida. Debe renovarla el administrador; no el cliente.

Referencia de la solicitud: `d19a99aa-84f9-47a5-8fe4-a1d368adfcdb`. Es un bloqueo de autorización del proveedor. No demuestra que la cuenta del hotel sea inexistente, personal o inaccesible después de renovar la autorización. No se recuperaron contadores nuevos, no se guardó una captura ficticia y no se intentó una alternativa HTML tras el rechazo de Meta.

## Pendientes para el propietario

- Actualizar desde GitHub y Publish en AI Studio para desplegar este ajuste y la corrección de paginación de PR92. La comprobación inicial de este control seguía viendo el bundle `index-CHiPLnfp.js`, sin la nueva agrupación de PDF.
- Renovar la autorización de Meta de la cuenta administradora de Visibility y actualizar el secreto servidor `META_DISCOVERY_ACCESS_TOKEN` por el canal de configuración habitual. No pegar tokens en el chat, frontend ni GitHub. Mantener identificadores, versión y permisos del mismo flujo de Business Discovery. No cambiar a Instagram Login ni mezclar tipos de token como arreglo improvisado.
- Repetir una consulta real y validar sus contadores y persistencia; esta prueba sigue pendiente de una autorización válida.
- Google AI Studio: no existe una sesión confirmada de Google en el perfil de navegación, por lo que no se accedió al panel privado de cuotas ni se modificó facturación. Gemini sigue con el bloqueo diagnosticado en el control anterior.

## Validación

352 pruebas automatizadas aprobadas, tipado y build correctos. Regresión nueva: la tarjeta de perfil se convierte en el mismo candidato explícito y deduplicado, sin crear cifras; enlaces reservados, puertos, dominios ajenos y rutas extra siguen rechazados. Sin cambios de esquema, credenciales, clientes, pagos ni informes almacenados.
