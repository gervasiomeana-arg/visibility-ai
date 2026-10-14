# Clientes: gestión interna

## Corregir un envío registrado por error

En cada informe marcado como enviado aparece **Corregir un envío marcado por error**.
El propietario escribe un motivo de 12 a 500 caracteres y pulsa **Volver a pendiente
y guardar corrección**. El cambio utiliza el guardado existente con versión de la ficha:
si hay conflicto o falla de Supabase no se confirma el resultado.

Se conservan el PDF, su huella, nombre, tamaño y fecha de carga. El canal, fecha de
envío y fecha del registro anterior pasan al historial de correcciones junto con motivo
y fecha de corrección; no se eliminan sin dejar rastro. El informe vuelve a la lista de
pendientes y puede recibir un nuevo registro manual, manteniendo ese historial. No se
modifican otros informes, pagos ni abonos. El historial vive en el JSON existente del
cliente; no requiere SQL ni cambio de políticas.

Antes del formulario de envío se aclara la secuencia: descargar, enviar desde WhatsApp
o correo y registrar después. La función no envía mensajes ni confirma recepción.
La prueba de envío real del usuario sigue aplazada; los registros erróneos no se han
corregido automáticamente en producción. Pruebas locales comprueban conservación,
motivo obligatorio, pertenencia al cliente, historial al reenviar y presentación segura.

## Corrección de la política de archivos — 14 de octubre

La captura posterior muestra el error de Storage «new row violates row-level security
policy» con todos los campos completos. Se encontró un defecto en la política original:
`split_part(name, ...)` dentro de la subconsulta se vincula a `workspaces.name`, porque
esa tabla también tiene una columna `name`. Debe referirse a `storage.objects.name`.

Aplicar **202610140003_client_report_storage_policy.sql** en el SQL Editor del proyecto
Supabase usado por Visibility. Sustituye solamente la política de archivos de Clientes
dentro de una transacción. Es repetible, no borra registros o archivos ni desactiva RLS.
Mantiene bucket privado y acceso exclusivo del propietario al espacio y cliente de la
ruta. Después de ejecutarlo, repetir Guardar PDF, recargar y descargar desde la ficha.
El cambio se aplica en Supabase; incorporar el código por sí solo no ejecuta el script.

Prueba con PostgreSQL local: la política original rechaza la carga del propietario con
un nombre de espacio ordinario; la política corregida permite su inserción y lectura.
Rechaza otro propietario, usuario anónimo, cliente ajeno, combinación incorrecta de
espacio/cliente y cambio de ruta a otro espacio. La aplicación repetida conserva filas
existentes y el bucket privado. La ejecución en Supabase y la prueba real siguen
pendientes: no se cambiaron datos de producción desde esta revisión.

## Confirmación del PDF después de guardar

La captura del 14 de octubre muestra la ficha y sus pagos conservados después de
recargar, pero ninguna entrada en Informes PDF. No permite determinar si faltó un
campo obligatorio, falló la carga del archivo o falló la escritura del registro.
No se afirma que el archivo esté recuperado ni que el problema real esté resuelto.

Para evitar confirmaciones ambiguas, guardar un informe ahora siempre vuelve a leer
la fila del cliente desde Supabase. Solo confirma si están registrados el mismo
informe, negocio, archivo, tamaño y huella, título, período y fecha en el cliente y
espacio correctos. La respuesta de escritura sola no basta. Si la lectura falla o
no coincide, mantiene un error y conserva el archivo subido; no borra PDFs ante un
resultado incierto. La recuperación tras perder la respuesta de escritura se mantiene.

La confirmación o error aparece junto al formulario de Informes PDF, con instrucciones
de completar negocio, título, período y archivo y esperar antes de recargar. Se indica
expresamente cuando no hay informes. La validación nativa de campos obligatorios también
deja un aviso local. Si el cliente tiene un único negocio asociado disponible, queda
preseleccionado al abrir su ficha; no se deduce el período del nombre del archivo.

Pruebas locales: una escritura aparentemente exitosa sin registro confirmado no puede
devolver éxito; se rechazan lecturas ajenas, ausentes, fallidas o con otra huella. Se
devuelve la versión recién leída, preservando la comprobación de igualdad del PDF.
Pendiente publicar y repetir la carga, recarga y descarga reales en la ficha de Neomed.
Este ajuste no requiere SQL ni cambios de políticas o claves.

Solo el propietario del espacio de trabajo puede cargar o consultar fichas y PDF.
Los clientes no reciben cuentas de acceso. La sección está en el encabezado de escritorio
y en el menú de cuenta móvil, fuera de los diez pasos de auditoría.

## Activación

1. Aplicar `supabase/migrations/202610140001_client_accounts.sql` en el proyecto Supabase
   utilizado por Visibility. Crea `client_accounts` y el bucket privado
   `visibility-client-reports`. No modifica los negocios ni los resultados de auditoría.
2. Incorporar el código en AI Studio y publicar. Sin la migración, Clientes muestra el
   error de carga: no simula un guardado ni utiliza almacenamiento local de respaldo.
3. Crear una ficha, asociar negocios existentes y definir importe, moneda y vencimiento.

## Abonos y pagos

- Registrar explícitamente cada mes. No se generan cargos bancarios ni facturas fiscales.
- El importe y moneda de cada mes son una copia de la tarifa vigente; editar la ficha
  no altera deudas anteriores.
- Los importes usan centavos enteros. Cada pago se asigna a un mes, permite pagos
  parciales y no admite importes negativos, pagos duplicados por identificador ni pagos
  superiores al saldo. No se suman monedas diferentes.
- Se guarda fecha/hora del pago declarada y fecha/hora de registro por separado.
- Las escrituras comparan `updated_at`: si otra pestaña modificó la ficha, el guardado
  falla y pide recargar. No sobrescribe silenciosamente el historial.

## Enlace PayPal

La ficha admite un enlace HTTPS generado por el propietario en PayPal. En cada abono
pendiente, Copiar solicitud prepara un texto con cliente, mes, saldo, moneda y enlace.
El propietario lo envía por WhatsApp; el botón no envía mensajes ni registra cobros.
El enlace no cambia automáticamente su configuración en PayPal. Comprobar destinatario,
importe y moneda antes de enviarlo. Confirmar el ingreso en PayPal antes de registrarlo
manualmente. No requiere nuevas credenciales ni migración SQL: usa la ficha existente.

Las horas de pagos, cargas y envíos se presentan explícitamente en formato de 24 horas
con la zona del espacio. Los timestamps guardados no se modifican.

## Informes y envíos

Exportar el PDF desde Informe, cargarlo en la ficha, descargarlo y enviarlo manualmente.
Se admiten PDF de hasta 20 MB, con cabecera PDF; el bucket no es público.
El archivo se vincula a espacio, cliente e informe. Las nuevas cargas conservan tamaño
y huella SHA-256; al descargar, se comprueban contra esos datos. Esto detecta diferencias
de bytes, pero no acredita que el contenido de la auditoría sea correcto. Los informes
anteriores siguen disponibles y se identifican como documentos sin huella guardada.

Si falla la respuesta del guardado tras subir el PDF, se consulta de nuevo la ficha.
Solo se confirma el guardado si se recupera el mismo informe con todos sus datos y
huella. Si no se puede confirmar, el PDF se conserva y se pide recargar: no se elimina
porque la base podría haber guardado el registro aunque se perdiera la respuesta.
Esta medida puede dejar una carga sin registro si el guardado realmente falló; no hay
limpieza automática de esos archivos en esta versión.

Después del envío, registrar fecha/hora y canal. Se conserva también cuándo se anotó.
No envía WhatsApp ni correo y no confirma recepción o lectura. La primera versión
registra un envío por informe; no hay reenvíos, cobros automáticos, comprobantes de pago,
recordatorios automáticos ni eliminación de fichas desde la interfaz.

## Validaciones

Pruebas locales: importes, vencimientos de febrero, tarifas históricas, pagos parciales,
saldos, registros duplicados, aislamiento por cliente/espacio y rutas de archivos.
Tipo y compilación deben pasar antes de publicar.

Pendiente después de aplicar la migración: probar creación y recarga de una ficha real,
carga/descarga de PDF, pago parcial/completo, envío manual y rechazo con cuenta no
propietaria. Las pruebas unitarias no verifican las políticas del Supabase desplegado.
