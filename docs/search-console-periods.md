# Consulta y recuperación de Search Console

Búsquedas permite elegir 28, 90 o 365 días. Las fechas son inclusivas, se calculan en UTC y excluyen los dos días más recientes, conservando el uso de datos finalizados y el límite de 100 consultas. Ampliar el intervalo no garantiza filas ni hace exhaustivo el resultado. El botón identifica el intervalo que se va a consultar; el aviso del resultado conserva sus propias fechas aunque se cambie la selección.

Cada importación nueva registra explícitamente el número de consultas en los metadatos locales. El estado que se recupera desde Supabase obtiene ese número de la lista de palabras clave del snapshot aceptado por la reconciliación existente. No se requieren migraciones ni credenciales adicionales.

Al volver a Búsquedas se recupera el resumen del negocio y propiedad seleccionados con fechas y un recuento explícito válido. Cero es un resultado real distinto de no haber consultado. El aviso recuperado dice «Última consulta guardada», no afirma una consulta nueva ni confirma de nuevo el guardado en la nube. Una captura antigua sin número de filas explícito no se interpreta como vacía: se puede volver a consultar o recuperar desde su snapshot remoto. Los fallos de almacenamiento conservan los avisos de guardado existentes.

Pruebas: ventanas inclusivas con año bisiesto; rechazo de duraciones no soportadas; restauración de cero explícito; rechazo de otra propiedad/negocio, registros antiguos sin recuento y fechas malformadas. La consulta de 90/365 días y el aviso tras recargar deben repetirse en la app publicada para validar el recorrido real. El control de salida exige consultas reales no vacías; un resultado vacío no lo completa.
