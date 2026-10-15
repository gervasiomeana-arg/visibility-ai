# Redes por negocio

La nueva solapa Redes aparece después de Búsquedas, en escritorio y móvil. Está separada
del informe PDF. Muestra Facebook, Instagram, TikTok y Google Search Console. No produce
un índice general ni suma métricas con definiciones distintas. Un selector elige la
métrica del gráfico de barras; un vacío se muestra como «Sin medición», y el cero
observado se conserva. Google no tiene seguidores: esa barra dice «No aplica».

## Activación

1. Aplicar en Supabase la migración `202610150001_business_social_accounts.sql`.
   Es repetible, no modifica informes anteriores y crea la tabla aislada por propietario,
   espacio y negocio, con clave foránea compuesta. El guardado comprueba versión para
   evitar sobrescribir cambios de otra pestaña.
2. Incorporar el código a AI Studio y publicar. Abrir Redes, registrar la URL del perfil
   confirmado y guardar. Recargar para comprobar persistencia.
3. Cargar mediciones manuales con fecha y evidencia (por ejemplo, el nombre del informe
   exportado por el cliente). Las cifras de período requieren fechas completas válidas.
   Las fechas manuales no inventan una hora de medición. Se guardan hasta 100 mediciones
   por red, mostrando las doce últimas del negocio. Un cambio de perfil conserva los
   registros anteriores, pero los excluye del gráfico actual.
4. Google reutiliza las consultas importadas en Búsquedas desde Search Console para la
   URL actual del negocio. Se muestran clics e impresiones de las consultas recuperadas,
   con propiedad y período validado por el flujo existente. No son datos de Maps, reseñas,
   visitas ni consultas comerciales. No se consulta Google solo por registrar un perfil.

## Consultas oficiales habilitadas por token

El formulario avanzado permite una consulta autenticada a las APIs oficiales sin guardar
el token en la ficha, localStorage o historial. Se elimina del campo al terminar. El
servidor requiere sesión Supabase, limita frecuencia y tiempo, utiliza hosts fijos y
no sigue redirecciones con el bearer. El registro guarda identidad de cuenta, fuente y
fecha de consulta, sin secretos. Requiere permisos y un token vigente obtenido mediante
la autorización de la plataforma; no solicita contraseñas de redes.

- Facebook: página administrada, identificador numérico y token con permisos para leer
  el campo followers_count. Se solicita a Graph API id y followers_count.
- Instagram: cuenta profesional mediante Facebook Login, identificador numérico y
  permisos correspondientes; se solicita id, followers_count y media_count.
- TikTok Display API: open_id exacto y permisos user.info.basic y user.info.stats;
  se solicitan follower_count, video_count y likes_count. Son acumulados del perfil.
- Meta requiere configurar META_GRAPH_API_VERSION con una versión habilitada en la app
  del desarrollador. No se supone una versión activa a partir de una fecha ni se envían
  tokens en el query string.

La URL del perfil la declara el operador: debe comprobar que el identificador autorizado
corresponde a ese perfil. La respuesta de API debe confirmar ese identificador exacto;
si falta alguna métrica solicitada, hay error o cuenta distinta, no se guarda como cero.

No está implementado OAuth con un clic para estas tres redes ni renovación automática
de tokens. No hay sincronización programada. Alcance, visualizaciones e interacciones
se cargan manualmente con evidencia; el módulo no presenta esa carga como API oficial.
Las cuotas, revisión de aplicaciones y permisos dependen de cada plataforma y requieren
configuración externa. Las consultas con tokens de clientes reales siguen pendientes.

Referencias primarias:
https://developers.facebook.com/docs/graph-api/reference/page/
https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/
https://developers.tiktok.com/docs/en/tiktok-api-v2-get-user-info

## Verificación

Pruebas controladas de validación, perfiles ajenos, métricas ausentes, ceros, fechas,
períodos diferentes, gráficos sin medición, identidad del proveedor, autorización HTTP,
no exposición de tokens y fallas de API. PostgreSQL embebido prueba migración repetida,
conservación de filas, permisos por propietario, claves negocio/espacio, identidad
inmutable y rechazo de versión vieja. No equivalen a aplicar la migración en Supabase,
conectar cuentas reales ni verificar la interfaz publicada con el operador.
