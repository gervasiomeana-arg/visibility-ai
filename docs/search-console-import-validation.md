# Validación de importaciones de Search Console

El importador deja de convertir campos ausentes en ceros mediante `Number(value || 0)`.
Antes de presentar o guardar consultas, valida el formato de la respuesta y cada fila:
una consulta no vacía, conteos enteros no negativos y coherentes, CTR numérico entre
0 y 1 y posición válida. Rechaza filas duplicadas. Calcula el CTR a partir de los clics
e impresiones del mismo registro; cero impresiones no habilita una posición media.
Un cero numérico medido permanece disponible.

Una respuesta Google válida sin `rows`, o con `rows: []`, sigue siendo un resultado
vacío. No demuestra ausencia de visitas. Un cuerpo nulo, lista, HTML, `rows: null`,
campos ausentes o métricas inválidas producen error y no se importan como cero consultas.
Se rechaza el resultado completo, sin sumar parcialmente filas válidas e inválidas.

La consulta exige fechas reales de calendario y un intervalo ordenado. El límite propio
de Visibility se mantiene entre 1 y 500 filas (la interfaz solicita 100), con validación
entera. Se consulta por dimensión `query` y `dataState: final`, sin afirmar que se
recuperan todos los datos del sitio. Google documenta que la API devuelve resultados
limitados y no garantiza todas las filas:
https://developers.google.com/webmaster-tools/v1/searchanalytics/query

El servidor devuelve la propiedad y fechas consultadas junto con la fuente. El cliente
comprueba esa identidad y valida de nuevo las filas antes de modificar la caché, métricas,
oportunidades o snapshots. El control de respuestas tardías por negocio/espacio/URL se
mantiene. Se conserva la autenticación Supabase y autorización Google; no se usan datos
de ejemplo como importación real. Consulta al proveedor limitada a 45 segundos y espera
del cliente a 60. Los errores no exponen el cuerpo diagnóstico de Google.

Pruebas controladas: respuesta positiva, ceros, vacío legítimo, cuerpos malformados,
métricas ausentes/inválidas, propiedad o período ajenos, fechas imposibles, duplicados,
límite de filas, autenticación y rechazo antes de consultar al proveedor. La revisión
de código mantiene los filtros de negocio y espacio en las lecturas de Supabase.
Estas pruebas no completan la importación real no vacía ni la prueba interactiva de
cambio entre negocios; ambas siguen pendientes del plan de salida. Sin SQL nuevo.

## Sesión de Google y disponibilidad

El inicio OAuth requiere una sesión Supabase válida incluso cuando no hay clave de
persistencia. En modo temporal, la conexión queda vinculada al usuario autenticado,
incluida la renovación del token. Una cookie de otra cuenta no permite consultar sus
propiedades ni borrar su conexión. Las sesiones temporales anteriores sin propietario
requieren volver a conectar Google. En modo persistente se conserva el filtro por
usuario y su propio bearer token; no se utiliza una clave de servicio.

Una caída de Supabase, una respuesta guardada malformada o una falla temporal al
renovar el token devuelve un error reintentable; no se presenta como `connected: false`
ni se elimina la conexión temporal. Una lectura válida vacía o una autorización
vencida/revocada sí devuelve desconectado. Las respuestas OAuth se validan antes de
usar o guardar el token; las consultas de autenticación, almacenamiento y Google
están limitadas en tiempo. La lista de propiedades distingue un vacío legítimo de
una respuesta malformada. Los errores no devuelven diagnósticos privados del proveedor.

Pruebas HTTP controladas con dos usuarios: inicio sin sesión rechazado, renovación que
conserva al propietario, cookie ajena sin acceso, desconexión ajena sin efecto, filtros
persistentes por usuario, interrupción y recuperación de Supabase/Google, renovación
inválida y consentimiento revocado. No se usaron credenciales reales. Estos controles
no sustituyen la importación con datos reales ni la prueba de cambio entre negocios.
