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
