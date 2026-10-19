# Visibility — reglas de datos reales (también para AI Studio)

- Redes presenta cliente, red, fechas y tres gráficos mensuales: seguidores, visualizaciones y alcance. No agregar paneles de competidores, tokens o formularios avanzados a este flujo sin pedido explícito.
- Nunca crear cifras, capturas, evidencias, perfiles confirmados ni meses históricos para llenar gráficos. Nunca promover fixtures de pruebas a datos de clientes.
- Cuando falta una medición verificable del perfil y período solicitados, mostrar «Sin datos verificados». Un dato desconocido no es cero.
- Seguidores es un recuento observado en una fecha: no copiarlo a otros meses. Una consulta pública de hoy no reconstruye enero, febrero, etc.
- No convertir muestras de publicaciones en visualizaciones mensuales totales; no deducir alcance, personas o distribución Me gusta/comentarios.
- Visualizaciones y alcance mensuales requieren un informe con fuente y período exactos. Conservar fuente y fecha visibles. No usar Gemini para inventar o completar métricas.
- Mantener SSRF, autenticación, aislamiento por negocio/espacio y errores de persistencia. Un error de Supabase nunca es éxito ni habilita datos de ejemplo.
- No borrar registros de clientes al corregir un fallo: excluir precargas conocidas y conservar originales para revisión.
- Los datos de ejemplo solo pueden existir en pruebas o demostraciones identificadas y aisladas del servicio real.

- Instagram: Business Discovery consulta cuentas profesionales de terceros mediante la cuenta propia autorizada de Visibility. No confundir esta autorización técnica propia con pedir la contraseña o token del cliente. Nunca prometer cobertura de cuentas personales ni Insights privados.
- Si Business Discovery está configurado, usarlo directamente para el operador permitido, conservar su fuente oficial y no volver a HTML tras un rechazo de permisos/cuota.
- La ampliación solicitada de análisis público permite dos competidores en un bloque opcional plegado. Mostrar denominadores, fechas y fuentes; las medias de interacción solo usan publicaciones con Me gusta y comentarios completos. Nunca sumar capturas repetidas ni confundir recuentos acumulados por publicación con métricas del período.
- YouTube usa YouTube Data API propia (`YOUTUBE_API_KEY`) sin clave del cliente. Suscriptores redondeados por YouTube, videos acumulados; no convertirlos en alcance, vistas mensuales ni historial inexistente.
- Buscadores e IA: no confundir respuestas de API con interfaces públicas, investigación Gemini/Google Search con posiciones SERP, ni Gemini con ChatGPT/Claude. Guardar consulta, mercado, idioma, dispositivo, fecha, método y evidencia. Solo posiciones orgánicas comprobadas manualmente en buscadores; ninguna posición fija inventada para IA. Las consultas automáticas incluyen contexto de la marca y no demuestran recomendación espontánea.
