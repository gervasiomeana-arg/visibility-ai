# Instagram Business Discovery — cuenta propia de Visibility

## La diferencia que faltaba
El lector HTML anónimo consulta el sitio web y puede recibir la pantalla de acceso. Eso no prueba que una cuenta no tenga seguidores. La integración oficial anterior de Visibility consultaba solo la cuenta autorizada: no implementaba Business Discovery para otros negocios.

Business Discovery consulta los campos públicos de otras cuentas profesionales Business o Creator mediante una cuenta profesional propia autorizada. El cliente no entrega su contraseña ni autoriza su cuenta para esos campos públicos. No es una solución para toda cuenta personal ni habilita los Insights privados del cliente.

Documentación primaria de Meta revisada el 17/10/2026:
- https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-facebook-login/business-discovery.md/
- https://developers.facebook.com/documentation/instagram-platform/instagram-graph-api/reference/ig-user/business_discovery.md/
- https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-facebook-login.md/
- https://developers.facebook.com/documentation/instagram-platform/overview.md/

## Activar una vez, como administrador
1. Disponer de una cuenta Instagram profesional propia de Visibility vinculada a una página de Facebook y una aplicación Meta para Instagram API con Facebook Login. La variante Instagram Login no ofrece esta misma función.
2. Autorizar la aplicación propia con los permisos que Meta exige para Business Discovery: instagram_basic, instagram_manage_insights y pages_read_engagement; según el rol concedido por Business Manager puede requerir ads_read o ads_management. La obtención de la página/cuenta propia puede requerir pages_show_list. Revisar los requisitos de permisos, App Review y nivel de acceso que corresponden a esa aplicación. No se garantiza aprobación ni acceso universal.
3. Obtener el ID de Instagram profesional **propio** y el token autorizado de esa cuenta. No usar el ID del hotel como cuenta que ejecuta la consulta. No enviar contraseñas ni tokens por chat.
4. Configurar en los secretos del servidor, nunca en variables VITE_:
   - META_GRAPH_API_VERSION: versión habilitada en la aplicación Meta (el ejemplo documental revisado usa v25.0).
   - META_DISCOVERY_IG_USER_ID: ID numérico de la cuenta propia que hace las consultas.
   - META_DISCOVERY_ACCESS_TOKEN: token propio con los permisos vigentes.
   - META_DISCOVERY_OPERATOR_USER_ID: UUID de Supabase del único operador autorizado de Visibility. Restringe el uso del token del servidor a ese usuario.
5. Publicar. En Redes → Instagram → Consulta oficial de otros negocios se indica si la configuración está completa. GET /api/social/instagram/discovery/status requiere sesión y solo revela nombres de variables faltantes, nunca valores secretos.
6. Con cliente y perfil confirmados, pulsar Buscar datos públicos. Si la configuración está completa, el servidor consulta Business Discovery directamente; no intenta entrar en la web de Instagram ni pedir datos al cliente.

Solicitud conceptual: GET graph.facebook.com/{version}/{ID_PROPIO}?fields=business_discovery.username(usuario_cliente){id,username,followers_count,media_count}. El token se envía como cabecera Authorization, no en la URL.

## Validación y seguridad
- La respuesta debe identificar tanto la cuenta propia que consulta como el username solicitado. Ambos contadores deben ser enteros exactos no negativos. Se conserva cero real.
- Se guarda la fuente official-public-api, evidencia identificable y fecha actual. Solo el mes observado recibe seguidores; publicaciones es acumulado, no el total del mes. Esta consulta no devuelve alcance ni visualizaciones mensuales.
- No se incluye el token en el frontend, la base de datos de perfiles, las respuestas, las URLs o los mensajes de error. No se utilizan claves del cliente.
- La falta de permisos, token vencido, cuota, perfil incompatible o fallo de red se distinguen sin reproducir mensajes privados de Meta. No hay reintento ni fallback a otra ruta si Meta rechaza una consulta oficial configurada.
- Sin nueva dependencia o proveedor comercial de datos. Sigue siendo necesaria la autorización técnica propia de Visibility y su mantenimiento; «sin claves del cliente» no significa «sin ninguna credencial técnica».

## Estado real
Integración preparada y probada con fixtures y una prueba HTTP autenticada. No se dispone aquí de un token propio autorizado de Visibility: no se ejecutó una consulta real de Business Discovery al hotel. No se da por comprobado que su cuenta sea Business/Creator ni se carga ningún contador de ejemplo como real. Falta activar la cuenta propia y comprobar la respuesta real de @nuevohorizontehotel.

El experimento de extensión de navegador quedó sin integrar: no forma parte de esta solución automática del servidor.
