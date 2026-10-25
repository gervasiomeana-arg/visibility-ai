# Google Business Profile — conexión y lectura autorizada

Implementación inicial: OAuth independiente de Search Console, listado paginado de cuentas y fichas administradas, identificación confirmada por el operador, informe con fuente/fecha, historial y PDF usando el flujo existente.

## Activación

1. Sincronizar GitHub en AI Studio y publicar.
2. En el cliente OAuth web existente, agregar la URI exacta mostrada en Ajustes → Google Business Profile → Requisitos. Con APP_URL=https://visibility-ia.ai.studio es https://visibility-ia.ai.studio/api/google-business/oauth/callback. Con APP_URL de Cloud Run, registrar la de Cloud Run que muestre el panel. No reemplazar la URI de Search Console.
3. Solicitar aprobación de acceso a Google Business Profile APIs para el proyecto. Habilitar My Business Account Management API y My Business Business Information API. Cuota cero puede requerir aprobación de Google; no equivale a falta de fichas.
4. Autorizar desde Ajustes o Buscadores → Fuente → Google Business Profile. Google exige `business.manage`; el conector implementa exclusivamente GET para los datos de negocio, sin publicar, editar, invitar ni responder reseñas.
5. Consultar cuentas, elegir cuenta y consultar fichas. En Buscadores, seleccionar y confirmar expresamente que la ficha corresponde al cliente activo. Preparar informe; luego guardar en historial, descargar o guardar copia PDF.

## Variables y seguridad

Reutiliza GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, APP_URL y SEARCH_CONSOLE_TOKEN_KEY. La clave AES de GBP se deriva con contexto independiente. Tokens nunca se devuelven en JSON ni se ponen en localStorage. Conexión en cookie AES-256-GCM HttpOnly, Secure, SameSite=Lax, restringida a /api/google-business, máximo 30 días y vinculada al operador verificado. La cookie sobrevive reinicios del servidor mientras permanezca la clave y el navegador; no se sincroniza entre navegadores ni se incluye en el respaldo de Supabase.

Estado OAuth con propósito, caducidad de 10 minutos, nonce ligado al navegador y revalidación de identidad Supabase. Callback permitido públicamente solo para verificar ese estado; demás rutas sujetas al acceso exclusivo del operador. Search Console conserva tokens, scope y cookie separados. Desconectar GBP elimina la conexión de este navegador; no revoca globalmente permisos de la cuenta de Google.

## Alcance y estado de validación

Lectura actual: nombre, categoría principal, web, teléfono, dirección y horarios disponibles, enlace de Maps. Campos ausentes indican Sin dato verificado. La selección requiere confirmación para evitar asociar un hotel de la cuenta Google a otro cliente.

Esta versión no mide reseñas, rendimiento, llamadas, alcance ni evolución histórica; no afirma que una ficha esté verificada por su presencia en la respuesta. No es un buscador público de cualquier negocio. El cliente puede otorgar acceso administrativo a la cuenta operadora sin compartir contraseñas.

Pruebas automatizadas con fixtures aislados verifican paginación, errores de permisos/API/cuota, campos desconocidos, fechas, generación de bloques PDF y aislamiento de sesión OAuth. La consulta real del proyecto publicado sigue pendiente de aprobación/configuración y autorización. No marcar como integración comprobada hasta recuperar al menos una cuenta/ficha real.

Fuentes oficiales:
- https://developers.google.com/my-business/content/prereqs
- https://developers.google.com/my-business/reference/accountmanagement/rest/v1/accounts/list
- https://developers.google.com/my-business/reference/businessinformation/rest/v1/accounts.locations/list
