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

El botón Registrar perfil de cada tarjeta desplaza al formulario de la red elegida y
enfoca su URL, incluso si esa red ya estaba seleccionada. Si falló la carga, el mismo
formulario explica el bloqueo y permite reintentar; no simula un perfil guardado.

## Investigación pública propia (17/10/2026)

En Redes, «Presencia pública y dos competidores» permite investigar sin contraseñas, tokens sociales, proveedores de datos pagos ni llamadas a Gemini.

1. Elegir Facebook, Instagram o TikTok y el rol (negocio / competidor 1 / competidor 2).
2. Buscar enlaces de perfiles en el HTML del dominio (href y sameAs JSON-LD). No es una búsqueda global en la red social. Los candidatos se revisan y confirman manualmente para no atribuir datos a homónimos.
3. Intentar recopilar HTML público sin sesión. Se reutiliza el transporte HTTPS con DNS fijado, protección SSRF, validación de redirecciones, límite de respuesta de 2 MiB y tiempo de espera del auditor.
4. El lector solo interpreta JSON estructurado asociado al perfil: TikTok userInfo/stats y publicaciones con autor coincidente; estructuras públicas conocidas de Instagram; JSON-LD con URL/autor coincidente. No ejecuta scripts, no interpreta instrucciones de la página y no usa cookies o credenciales sociales.
5. Si no hay datos identificables o hay bloqueo, se informa «no disponible» y no se guarda una medición vacía. La alternativa es transcribir lo visible con fecha y evidencia.
6. Revisar valores y publicaciones antes de guardar. Una publicación manual utiliza `URL;AAAA-MM-DD;Me gusta;comentarios;visualizaciones` y los campos no visibles quedan vacíos.

### Qué se mide

- Seguidores observados y publicaciones acumuladas, si están disponibles como enteros exactos.
- Muestra de publicaciones fechadas dentro del período: Me gusta, comentarios y visualizaciones visibles.
- Promedio de interacciones: solo publicaciones con Me gusta **y** comentarios disponibles. Se expone n; no se rellenan campos ocultos con cero.
- Los recuentos de publicaciones son acumulados a la fecha de observación. No se interpretan como interacciones que ocurrieron exclusivamente dentro del período de publicación.
- La muestra no acredita cobertura completa ni una frecuencia mensual total. No hay alcance, impresiones privadas, ventas, demografía inferida ni calificaciones universales.
- La evolución de seguidores muestra la última observación guardada de cada mes (sin interpolación). Se requieren dos meses para evaluar un cambio. Un perfil cambiado no hereda cifras del anterior.
- Recomendaciones deterministas, basadas en observaciones: evolución y publicación con mayor respuesta en la muestra. La comparación de medias exige mismo período, mismo día de observación y al menos tres publicaciones completas por perfil. No atribuye causalidad ni promete resultados.

### Persistencia y operación

Se amplía el JSON existente `business_social_accounts.payload.publicProfiles`: hasta tres roles y 120 observaciones por rol, con hasta 100 publicaciones por observación. No se requiere migración SQL. Se mantienen aislamiento por workspace/negocio, RLS de propietario y control de versión `updated_at`. Los guardados del formulario anterior conservan el nuevo historial.

La consulta se inicia desde el botón: no hay tarea mensual automática ni extracción garantizada. Registrar una observación cada mes crea el historial. Las plataformas pueden cambiar su HTML o bloquear consultas; no se evaden esas restricciones. No se contrataron servicios ni se configuraron claves nuevas.

### Validación

Pruebas de descubrimiento y rechazo de enlaces falsos/publicaciones; identidad del autor; ceros y datos ocultos; redirecciones a login; recuentos inválidos; persistencia serializada; comparación temporal y exclusión de perfiles anteriores; autenticación/validación de rutas. Suite completa: 266 pruebas aprobadas, tipado y build correctos.

Pendiente de validación de campo en despliegue: accesibilidad y cobertura real de cada plataforma. El intento desde el entorno de desarrollo a openvoley.com y neomed.com.uy devolvió EAI_AGAIN (DNS); no produjo mediciones reales.
