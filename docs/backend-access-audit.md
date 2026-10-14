# Revisión de acceso del backend

## Corrección de autenticación

Las rutas de auditoría, asistente, contenido, investigación de competidores y consultas
protegidas de Search Console usan `requireSupabaseAuth`. Antes, si faltaba la configuración
de Supabase, el middleware dejaba continuar sin comprobar la sesión. Ahora devuelve 503
y no ejecuta la función protegida. No se añade una excepción de acceso anónimo para
desarrollo; las pruebas de rutas deben proporcionar una identidad simulada válida.

Sin token o con token rechazado por Supabase, devuelve 401. La identidad confirmada
permite continuar. Una caída del proveedor, un error de red o una respuesta de identidad
malformada devuelve 503, sin clasificarlo como sesión vencida. La consulta de validación
incluye un límite de ocho segundos. Las respuestas no incorporan tokens ni los detalles
internos del error.

181 pruebas locales aprobadas, comprobación de tipos y compilación correctas. Las pruebas
nuevas usan un proveedor simulado: no prueban una cuenta real de Supabase ni una caída
real del servicio publicado.

## Revisión del esquema y límites

El esquema publicado en el repositorio incluye RLS por espacio de trabajo. Clientes y
sus PDFs restringen el acceso al propietario. Las políticas de uso comprueban además
la correspondencia entre negocio y espacio. Esto se revisó en código, sin cambiar datos
ni consultar contenido privado de Supabase.

En las tablas de auditoría, palabras clave, snapshots, oportunidades y tareas, las
referencias a negocio y espacio son claves foráneas independientes. Estas referencias
por sí solas no garantizan que ambos identificadores correspondan entre sí. El refuerzo
está preparado en `202610140002_launch_plan_and_business_scope.sql`, con claves compuestas
que preservan filas existentes y las políticas actuales. Se probó con PostgreSQL local;
falta aplicarlo y verificarlo en Supabase. No se afirma que existan registros mezclados
en la base desplegada.

Siguen pendientes la prueba del aislamiento con el Supabase desplegado, la importación
real no vacía de Search Console y el circuito completo del PDF de un cliente.
