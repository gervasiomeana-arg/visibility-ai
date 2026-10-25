# Respaldo operativo y ensayo de recuperación

## Uso

En Ajustes, **Descargar respaldo con PDF** solicita una copia mediante la sesión del operador. El archivo JSON incluye 16 tablas de datos privados —fichas, abonos, pagos, negocios, auditorías e historial— y los archivos completos del depósito privado de PDF. Conserva las fechas originales. Se descarga al dispositivo; debe guardarse en un lugar privado y fuera del dispositivo.

**Revisar un respaldo** comprueba localmente formato, propietario, pertenencia al espacio, límites, archivos vinculados, firma PDF inicial, tamaños y SHA-256 de cada PDF y del contenido. No sube el archivo a un proveedor ni modifica datos. SHA-256 detecta cambios accidentales; no es una firma de autenticidad y una copia debe proceder del operador.

La exportación pagina las tablas y el depósito completo. Relee las tablas al finalizar y rechaza cambios concurrentes en lugar de confirmar una mezcla. Si falta una tabla, permiso o PDF, no devuelve una copia como completa. Admite hasta 64 MB de JSON, 48 MB acumulados de PDF y 20 MB por PDF. El operador tiene un máximo de tres exportaciones por hora. No ejecuta IA ni auditorías.

## Alcance y exclusiones

No incluye contraseñas, sesiones, claves de APIs, conexiones OAuth ni invitaciones. Google se debe autorizar nuevamente si se recupera el servicio en otro entorno. La identidad del operador y su acceso deben conservarse o recuperarse por separado. Las consultas de WEB CLIENTES están en la base independiente de la web pública y tampoco se incluyen en esta copia. Los cambios que solo existan en el navegador deben guardarse en la nube primero.

El código y las migraciones permanecen en GitHub. Esta copia no equivale a una imagen completa de infraestructura ni acredita por sí sola la restauración de un proyecto Supabase o del servicio web público.

## Recuperación aislada

Con las dependencias de desarrollo instaladas:

`node --import tsx scripts/verify-backup.ts /ruta/Visibility_respaldo_FECHA.json`

El programa solo acepta el archivo de entrada: no acepta URL de base ni credenciales de producción. Reconstruye el esquema en PostgreSQL en memoria (PGlite), carga las filas, comprueba sus restricciones y compara cada registro completo. Reconstruye los PDF en memoria y comprueba sus bytes. Rehabilita las protecciones y prueba el acceso del operador y el rechazo de otra identidad.

Los disparadores de usuario que actualizan fechas se deshabilitan únicamente durante la carga en esa base temporal y se vuelven a habilitar; las claves foráneas permanecen activas. No existe una ruta HTTP para importar o sobrescribir la base de trabajo. Una recuperación real requiere revisar la copia y preparar un entorno separado antes de autorizar cualquier reemplazo.

## Evidencia y pendiente

La prueba automatizada exporta y recupera registros aislados de prueba, incluidos pagos, fecha de envío y PDF, conservando el aislamiento. También rechaza datos alterados, archivos faltantes, rutas inseguras y ediciones concurrentes, y verifica paginación de más de 500 registros.

El inventario real leído al implementar incluye 9 PDF, 307028 bytes, todos con rutas válidas. No se descargaron esos archivos ni se restauraron los datos reales. Tras publicar en AI Studio, queda descargar el respaldo real y ejecutar el ensayo con ese archivo antes de marcar terminado el control de recuperación.
