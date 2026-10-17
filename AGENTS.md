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
