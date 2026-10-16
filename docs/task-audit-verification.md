# Verificación de tareas mediante una auditoría posterior

Las tareas antiguas se conservaban al repetir la auditoría, pero un resultado correcto
no actualizaba su estado. Ahora se reconcilian al guardar o leer el plan, utilizando
los factores y metadatos disponibles del mismo negocio y espacio.

Solo una tarea de fuente seo-audit, con URL HTTPS explícita idéntica a la solicitada,
puede verificarse con un factor único de la misma clave, fuente real y fecha válida.
Se conserva el query string; otra página o una tarea sin URL no se verifica por inferencia.
La evidencia no puede ser anterior a la medición de la tarea, posterior a la fecha de
la auditoría ni anterior/igual a una edición manual posterior del operador.

Un factor correcto registra verificada_auditoria, fecha y evidencia con URL, estado y
valor medido. No borra la nota ni reemplaza los datos del hallazgo original. Si una
medición posterior vuelve a detectar una advertencia/error, se reabre la verificación
anterior por auditoría. Un cierre manual se conserva como registro manual, con la
advertencia técnica visible. Reabrir o editar después de una medición conserva la
prioridad del registro manual. Los estados viejos de la nube no anulan una medición
más reciente disponible en el espacio local.

Si falta PageSpeed, no hay factor de rendimiento correcto y no se cierran LCP/FCP por
haber leído HTML. Un H1 correcto verifica únicamente el factor en HTML inicial; no
certifica renderizado, indexación, posiciones ni toda la web. Las tareas manuales y
DEMO quedan fuera de la verificación automática.

La ficha y el informe muestran fecha, valor y URL de hasta tres verificaciones técnicas.
La fecha de una nota usa únicamente manualUpdatedAt: no se reutiliza completedAt,
que puede corresponder a una auditoría posterior. Los bloques de métricas y verificación
se mantienen juntos en el PDF cuando caben en una página.

## Comprobaciones realizadas

Pruebas de regla de verificación, URL/página/query distintos, tarea ajena, ausencia de
PageSpeed, fuente DEMO, fechas inválidas/anteriores, duplicados, edición manual más
reciente, reapertura por regresión, persistencia local por espacio y representación del
informe. PDF de prueba de tres páginas renderizado y revisado; datos explícitamente
de ejemplo, no un informe real de cliente.

Diagnóstico adicional del 15/10/2026: el transporte nativo del auditor falló con EAI_AGAIN
al resolver Neomed y Open Voley desde este entorno. Una descarga alternativa de HTML
público respondió 200 en ambos, y Open Voley redirigió a open-voley-2026.ai.studio.
Con esas capturas se verificó únicamente el análisis y armado de informe: 15 factores
por sitio, seis tareas para Neomed y ninguna tarea HTML para Open Voley. El encabezado
H1 de Open Voley estaba presente en ese HTML inicial. No se midió tiempo de respuesta
comparable con producción ni se obtuvieron métricas nuevas de PageSpeed o Search Console.

Esto no completa el piloto de producción, guardado en Supabase, cambio interactivo
entre negocios, importación autorizada de Google ni entrega real. Sin SQL nuevo.
