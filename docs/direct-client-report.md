# Guardado directo del informe en Clientes

La vista Informe permite guardar su PDF en una ficha asociada al negocio sin descargarlo y cargarlo manualmente. Se conserva el flujo anterior de descarga y carga de archivos.

## Alcance

- Disponible para el propietario del workspace, en informes con fuentes reales y negocios del mismo workspace.
- El operador elige un cliente asociado y confirma título y período/alcance. El período no modifica las fechas de las mediciones.
- Se genera el PDF desde el mismo artículo y con el mismo generador de la descarga existente.
- Se vuelve a leer la ficha antes de guardar y se conserva el control de concurrencia de `clientService.save`.
- El guardado existente valida PDF, calcula SHA-256, carga el archivo privado y confirma el registro mediante otra lectura.
- Cambiar de negocio, salir de la vista o actualizar el informe durante su preparación cancela la carga. Una escritura ya iniciada permanece vinculada al cliente original; no se transfiere al siguiente negocio.
- Un documento idéntico, con el mismo negocio, título y período, no vuelve a cargarse tras recargar la lista.
- El registro queda sin fecha ni canal de envío. Guardar no envía WhatsApp, no acredita recepción y no registra pagos.

## Verificación antes de cerrar el piloto

1. Publicar el cambio aprobado.
2. En Informe de un negocio asociado a una ficha QA, elegir cliente, título y período; guardar.
3. Esperar la confirmación, abrir Clientes y recargar. Comprobar nombre, período y estado pendiente del PDF.
4. Descargar y abrir el archivo. Enviar manualmente como documento a un destinatario de prueba autorizado y confirmar recepción.
5. Registrar el envío únicamente después de realizarlo.

Las pruebas locales cubren aislamiento, cambios durante las operaciones, conservación del registro de pagos, confirmación de persistencia, integridad del archivo y duplicados. No sustituyen una prueba del cambio publicado ni la recepción real por WhatsApp.

No requiere nuevas tablas, permisos, dependencias ni variables de entorno.
