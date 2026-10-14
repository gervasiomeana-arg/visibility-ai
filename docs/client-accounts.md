# Clientes: gestión interna

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
El archivo se vincula a espacio, cliente e informe. Si no se guarda el registro tras
subir el archivo, se intenta eliminar únicamente esa nueva carga incompleta.

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
