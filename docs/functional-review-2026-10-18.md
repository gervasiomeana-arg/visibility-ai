# Revisión funcional del 18 de octubre de 2026

## Pruebas sobre la versión publicada

- Se abrió la sesión existente, el selector de negocios y Redes en la ficha QA.
- Se recuperaron las observaciones guardadas de Duolingo y sus dos referencias. Los meses sin capturas permanecieron sin datos.
- Una consulta nueva a Instagram devolvió autorización propia de Visibility vencida o inválida (referencia 5026ed3b-1689-4734-a86e-60ae154965a8). La aplicación conservó los datos anteriores. No se renovaron secretos ni se obtuvieron publicaciones nuevas.
- Informe mostró auditoría y PageSpeed guardados, fuentes y límites, pero omitió Redes. Esta revisión corrige esa omisión.
- Contenido detectó la falta de descripción confirmada en la ficha QA y mostró el formulario y el destino del resultado. No se generó un texto con servicios supuestos.
- Evolución mostró una sola auditoría y sin comparación numérica. Se corrigió la explicación para que pida una segunda medición antes de atribuir la falta de comparación a las fuentes.
- Clientes recuperó ficha, abono, pago parcial, informe privado y registro manual del envío. Esta revisión no registró pagos ni envió mensajes.

## Cambio del informe

El PDF, la impresión y el guardado en Clientes usan el mismo documento, ahora con las últimas observaciones de seguidores de Instagram, Facebook y TikTok: perfil, fecha, fuente y evidencia. Se excluyen otros negocios, otros espacios, competidores, precargas conocidas y observaciones inválidas. Cero observado se distingue de dato desconocido. Una captura antigua no acredita acceso actual.

La carga de Redes debe completarse antes de exportar o guardar. Los errores permiten reintentar y no se transforman en ausencia de datos. Las respuestas de un negocio anterior no se incorporan al nuevo informe. Si solo existe evidencia social válida, el informe es parcial real y no promueve prioridades ni cifras DEMO.

Este resumen social no incorpora alcance ni visualizaciones para un período de entrega: siguen requiriendo sus respectivos informes con fuente y período. No son métricas inferidas de seguidores.

## Validación local y pendientes

- 316 pruebas aprobadas mediante `node --import tsx --test server/tests/*.test.ts`. El lanzador `npm test` encontró una restricción IPC del entorno antes de ejecutar; se usó el mismo conjunto con el cargador de Node.
- Tipado y compilación de producción verificados.
- Pendiente publicar y verificar visualmente el nuevo PDF con las observaciones sociales reales.
- Pendiente renovar la autorización propia de Meta y validar la paginación real de hasta 500 publicaciones.
- Search Console: las consultas previas de 28, 90 y 365 días de Open Voley devolvieron cero filas y se conservaron. Sigue pendiente una importación real no vacía; un fixture no completa esa comprobación.

No se declara cerrado el plan de salida ni se asigna un porcentaje nuevo.
