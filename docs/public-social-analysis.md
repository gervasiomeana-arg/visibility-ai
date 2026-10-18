# Análisis público de redes

En Redes se conserva el flujo cliente → red → fechas → consulta. Debajo de los gráficos aparecen actividad, interacción y sugerencias; la comparación con dos competidores es opcional y permanece plegada.

## Obtención

- Instagram Business Discovery pide contadores de cuenta y hasta cinco páginas de 100 publicaciones: permalink, timestamp, like_count y comments_count. Presupuesto total de 25 segundos, sin Insights privados. Los cursores se validan y las consultas se reconstruyen siempre sobre graph.facebook.com; nunca se sigue paging.next ni se guardan cursores o tokens. La configuración existente no cambia.
- Facebook y TikTok usan el lector público existente: analizan únicamente publicaciones identificadas y fechadas que la respuesta realmente entregue. Una respuesta con seguidores pero sin publicaciones no permite calcular interacción.
- Se guardan las observaciones con fuente, fecha, perfil, período y evidencia en el registro existente del negocio. No se modifica el esquema ni se introducen valores de ejemplo.
- Los dos competidores necesitan enlaces explícitos de la misma red. Se consultan y guardan secuencialmente, con el control de concurrencia existente. Un rechazo del proveedor conserva las observaciones anteriores.

## Cálculos y límites

- Se usa una sola captura: la más reciente dentro del período, con identidad coincidente. No se suman capturas repetidas.
- Publicaciones recuperadas: cantidad de elementos identificados de la muestra cuya fecha de publicación cae en el intervalo. No equivale al total publicado por la cuenta.
- Frecuencia observada semanal: recuperadas / días del intervalo × 7. Es un mínimo observado. Sin publicaciones recuperadas, se muestra sin dato y no se declara inactividad.
- Interacción media: suma de Me gusta + comentarios, dividida por publicaciones que contienen ambos recuentos. Los ausentes no se convierten en cero. La cobertura muestra ese denominador.
- Engagement: esa media / seguidores de la captura × 100. Sin seguidores o con cero seguidores, sin tasa.
- Los recuentos de publicaciones acumulan interacciones hasta la captura; no acreditan que hayan ocurrido durante el intervalo elegido. Vistas por publicación, cuando existen, no alimentan el gráfico de visualizaciones mensuales ni el alcance.
- Crecimiento: diferencia entre la primera y última observación de seguidores dentro del período, solo si pertenecen a días diferentes. Se muestran ambas fechas.
- Las sugerencias son reglas transparentes basadas en cobertura y publicaciones verificadas. No inventan temas, formatos, competidores ni promesas de ventas.

## Verificación

Las pruebas cubren fórmulas, cero frente a ausencia, cobertura parcial, duplicados, identidad, semillas descartadas, cambios de fecha y filtrado de publicaciones de Meta. La prueba en producción de publicaciones/interacciones requiere publicar esta versión y volver a consultar un perfil; los seguidores guardados por la versión anterior no contienen publicaciones.

## Cobertura del período

Una captura puede conservar hasta 500 publicaciones. La interfaz muestra páginas, elementos examinados, elementos descartados y publicaciones del período. Solo se etiqueta como completa para el contenido disponible en la API cuando se agota el recorrido, no se descartan elementos, no hay duplicados y el total de enlaces únicos examinados concuerda con media_count de la cuenta. Si el total cambia entre páginas, el resultado sigue siendo parcial. No se presupone orden temporal ni se detiene el recorrido al encontrar una publicación antigua (puede estar fijada).

Límites de páginas/tiempo, errores posteriores a la primera página, cursores inválidos o repetidos, respuestas sin media y diferencias de recuento conservan lo verificado con cobertura parcial y motivo. Los errores de la primera consulta siguen rechazando la medición. Las capturas anteriores sin metadatos de cobertura siguen siendo muestras parciales.

Al cambiar fechas, una captura solo puede acreditar cobertura si su ventana original contiene toda la seleccionada. Cobertura de publicaciones no es cobertura de métricas: los Me gusta ocultos permanecen ausentes, el alcance sigue sin calcularse, las interacciones son acumuladas a la captura y no se reconstruye evolución histórica de seguidores. Ni siquiera el recorrido completo incluye contenido eliminado o privado. La comprobación real de la paginación queda pendiente de publicar esta versión.
