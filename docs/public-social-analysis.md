# Análisis público de redes

En Redes se conserva el flujo cliente → red → fechas → consulta. Debajo de los gráficos aparecen actividad, interacción y sugerencias; la comparación con dos competidores es opcional y permanece plegada.

## Obtención

- Instagram Business Discovery pide contadores de cuenta y una página de hasta 50 publicaciones recientes: permalink, timestamp, like_count y comments_count. Una consulta, sin paginación ni Insights privados. La configuración existente no cambia.
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
