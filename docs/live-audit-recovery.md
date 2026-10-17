# Correcciones tras la prueba operativa del 16/10/2026

La prueba autenticada encontró errores al generar contenido, investigar en la web y cargar Redes. No se obtuvieron los registros privados de producción: no se afirma que una cuota, permiso o modelo concreto sea la causa del fallo observado.

## IA

- `dotenv/config` se carga antes de los módulos del servidor. El cliente Gemini se resuelve al recibir la solicitud, en lugar de fijar un cliente ausente durante la importación; una clave que llega después o cambia no deja el módulo bloqueado.
- Se utiliza `GEMINI_MODEL` si está definido, con `gemini-3.8-flash` como valor por defecto. No se cambia automáticamente a otro modelo.
- El SDK recibe un solo intento interno. La aplicación reintenta una vez únicamente rechazos explícitos 500/502/503, dentro del presupuesto original. Cuota, permisos, parámetros, expiración y errores de red con resultado incierto no disparan duplicados automáticos.
- Las tareas breves con modelos Gemini 3 usan razonamiento LOW salvo configuración explícita. Los límites de tiempo del cliente se conservan.
- Los errores públicos distinguen configuración, credenciales/permisos, cuota, modelo, parámetros, timeout y disponibilidad. El servidor registra categoría, operación, estado del proveedor y requestId, sin imprimir prompts, claves ni errores completos del proveedor.
- Un error no se transforma en contenido local ni en una investigación sin referencias.

## Redes

Se distinguen estructura ausente/desactualizada, permiso denegado, sesión inválida, conflicto y red. El mensaje de migración solo aparece ante códigos de esquema conocidos, no ante cualquier fallo. La estructura se prepara con la migración existente `supabase/migrations/202610150001_business_social_accounts.sql`; no se desactiva RLS ni se agrega una clave administrativa al navegador.

La instalación del conector Supabase fue confirmada. En esta sesión no se expusieron operaciones para consultar proyectos o ejecutar SQL, por lo que no se aplicó una migración ni se declaró reparada la base real. Primero comprobar el proyecto correcto, estructura, políticas y respuesta autenticada; después guardar y recargar un perfil.

OAuth social continúa pendiente, sin pedir contraseñas de redes a clientes. El campo avanzado existente es un token técnico para esa consulta; no equivale a OAuth integrado.

## Lectura de resultados

Las oportunidades usan la misma prioridad técnica de las tareas; los empates siguen el mismo orden por nombre que el informe. Los registros antiguos solo recuperan prioridad de un factor real coincidente en clave y fecha. El impacto no se transforma en una urgencia comercial artificial.

El panel denomina el agregado de auditoría como índice técnico parcial. Para negocios con auditoría real, visibilidad en asistentes de IA queda Sin medir, en vez de una puntuación DEMO 0/100.

LCP identifica la fase de mayor duración registrada. Si domina la espera de renderizado, propone revisarla antes de atribuir la demora a la descarga, y conserva las recomendaciones explícitas de Lighthouse sin inventar fallos de lazy loading.

## Validación y pendientes reales

Pruebas de configuración tardía y rotación, compatibilidad del SDK, recuperación transitoria acotada, ausencia de reintentos por cuota/timeout, mensajes y logs sanitizados, diagnósticos de almacenamiento, prioridades entre vistas, lectura del panel y fase dominante LCP. Se ejecutan además la suite completa, tipado y compilación.

Falta publicar los cambios y repetir las acciones en la app con una sesión operativa. Las pruebas controladas no acreditan llamadas nuevas a Gemini, permisos en producción ni entrega por WhatsApp. El plan de salida conserva 2/7 controles completados.
