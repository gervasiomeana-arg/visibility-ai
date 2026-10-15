# Integridad de la respuesta de auditoría

Antes de entregar una auditoría nueva a la pantalla de resultados, el cliente valida
la respuesta completa: URL solicitada coincidente, destino HTTPS sin credenciales,
fecha, estado HTTP, duración numérica no negativa y factores únicos con fuente real,
fecha, textos, categoría, estado e impacto válidos. No completa campos ausentes con
ceros ni convierte errores de formato en resultados exitosos. Un fallo muestra error
y no alcanza el flujo de guardado de nuevos hallazgos, tareas, puntuaciones o historial.

Si se devuelve PageSpeed, se comprueban su fecha, puntuación y métricas, conservando
ceros numéricos y valores nulos que expresan falta de medición. Una respuesta que
incluya simultáneamente medición PageSpeed y error no se admite como válida. La
respuesta HTML válida sin PageSpeed sigue admitida; se conserva el error del servicio
opcional y no se exige que siempre esté disponible.

Los generadores de hallazgos y tareas también filtran factores DEMO o sin fuente antes
de asignar etiquetas reales. Las oportunidades ya tenían este filtro. No se borran
borradores, notas, informes ni datos históricos y no se reescriben registros antiguos.
El contenido aprobado sigue siendo un borrador: no publica ni verifica tareas.

Pruebas controladas: respuesta de URL ajena, campos inválidos, fechas ausentes,
factores sin fuente o duplicados, PageSpeed malformado, ceros válidos y HTML válido
con PageSpeed caído. Se renderiza un informe con factores mezclados para comprobar
que los DEMO no aparecen como prioridades reales. El generador del servidor se prueba
con una web de fixture y debe satisfacer el mismo contrato. No es una prueba de
importación real de Google ni de cambio interactivo entre negocios.
