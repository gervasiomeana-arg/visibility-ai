# Entregables operativos de Visibility

## Recorrido del operador

Se mantienen las seis solapas. En **Clientes**, con cliente y negocio seleccionados, el bloque **Servicios** aparece antes de la gestión administrativa.

1. **Diagnóstico inicial** abre Página web. Ejecutar y revisar las consultas en Web, Redes, Buscadores e IA según lo contratado. Guardar las mediciones deseadas. Desde Historial, seleccionar hasta doce mediciones y preparar un informe combinado; no es una consulta nueva.
2. **Plan de mejoras** toma la última medición guardada por fuente entre los últimos 100 registros cargados. Los factores web pendientes conservan dato, propuesta y comprobación. Redes, Search Console y presencia conservan la evidencia y las recomendaciones. Hasta diez preguntas reales aportadas por el operador generan esquemas editoriales, no artículos terminados ni demanda de búsqueda inferida. Las prioridades iniciales se basan en estado técnico, no en ventas estimadas.
3. **Seguimiento mensual** pide mes y reúne observaciones guardadas dentro de él. Search Console exige período exacto. Compara con el mes anterior únicamente cuando el comparador considera homogéneas las fuentes. Mes actual lleva corte parcial. Sin mediciones actuales no genera un informe vacío; ausencia de canal se identifica explícitamente. No suma capturas de seguidores ni reconstruye alcance.
4. **Implementación adicional** registra título, alcance, presupuesto, moneda, fecha objetivo, aprobación declarada y evidencia/avance. Avanzar más allá de propuesta exige aprobación; declarar implementado exige nota de evidencia. Un avance crea otro registro y conserva el anterior. No cobra, no modifica sitios externos y no acredita una mejora por marcar un estado.

Cada documento se revisa antes de guardar. Reutiliza historial privado, PDF, impresión, copia PDF en ficha y preparación manual de WhatsApp. La gestión administrativa se oculta al imprimir un entregable. Abrir WhatsApp no envía archivos ni prueba recepción. Los nombres de PDF distinguen negocio y tipo de documento.

## Persistencia y seguridad

La migración `20261019211527_service_deliveries_channels.sql` amplía únicamente el CHECK de canales de `client_audit_runs`. No cambia tablas de clientes, pagos, informes previos, RLS ni permisos. Fuentes de servicios: mediciones guardadas del mismo espacio/cliente/negocio; no se permiten servicios o combinados recursivos. Se excluyen auditorías web de una URL anterior del negocio. No se confirma éxito de guardado ante error.

Aplicada al proyecto activo y verificada: el registro previo permanece (1 antes y después), RLS habilitada, únicamente SELECT/INSERT para authenticated, sin acceso anon; políticas del propietario conservadas. Los avisos de seguridad previos del proyecto permanecen: 9 funciones SECURITY DEFINER accesibles a anon, 9 a authenticated y protección de contraseñas filtradas deshabilitada. La migración no introduce funciones ni cambia sus permisos. Remediaciones de referencia:

- https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Validación y límites pendientes

- Suite completa: 350 pruebas aprobadas. Cobertura nueva: fuentes, aislamiento, meses, comparabilidad, propuestas y avances inmutables, PDF y migración repetible con preservación del historial y permisos.
- `npm run lint` y `npm run build` aprobados. Persisten avisos de Vite por tamaño de bundle e imports dinámicos ya presentes.
- Tres tipos de PDF generados y comprobados mediante extracción de texto con pdftotext: nombres de servicio, preparación, períodos, referencias y naturaleza declarativa de implementaciones.
- No se insertaron fixtures ni presupuestos de prueba en producción. Los datos sintéticos existen solo en pruebas locales.
- Pendiente: importar main y Publish en AI Studio, luego validar la interfaz publicada, guardar/reabrir los nuevos documentos con un caso de prueba identificado, y comprobar el PDF descargado/impresión real del navegador. Esta entrega no declara hecha esa comprobación.
- Gemini mantiene el bloqueo de cuota observado en la auditoría funcional anterior; esta entrega no lo resuelve ni sustituye Gemini por ChatGPT/Claude. Las métricas de redes siguen limitadas a las fuentes realmente disponibles. El seguimiento no agenda ni ejecuta nuevas consultas automáticamente.
