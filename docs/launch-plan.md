# Plan de cierre comercial: tres jornadas estimadas

La lista se muestra al propietario del espacio en un panel flotante. Comienza expandida
y permanece disponible al navegar. Se puede minimizar para liberar la pantalla y no
aparece dentro del PDF. Los siete controles son pruebas reales; no se completan porque
pasen pruebas de código ni por tener variables configuradas.

| Jornada | Control | Evidencia para completarlo |
|---|---|---|
| 1 | PDF real | Documento abierto y contraste con fuentes, datos, fechas y páginas. |
| 1 | PDF en Clientes | Carga, recarga, descarga y apertura correctas para el mismo cliente. |
| 1 | Pagos y envío | Registro de prueba de pago y envío manual, con fechas y persistencia. |
| 2 | Search Console | Consultas reales no vacías de una propiedad autorizada del negocio; período y conservación comprobados. |
| 2 | Separación de datos | Protección en Supabase, comprobación de registros existentes y cambio de negocio sin mezclar resultados. |
| 3 | Piloto completo | Auditoría, prioridades, PDF, ficha y entrega registrada, de principio a fin. |
| 3 | Revisión final | Repetición con otro negocio, revisión de límites, pendientes y calidad antes de ofrecer el servicio. |

Para completar o reabrir un control, se guarda una nota y fecha de registro. El progreso
se confirma solo cuando Supabase devuelve el guardado. Se conserva por espacio, con
política de acceso del propietario y bloqueo de escrituras con versión desactualizada.
No hay almacenamiento local que simule sincronización. Un error mantiene el control
sin confirmar y permite recargar. El marcado es un registro manual, no certificación
automática de los resultados.

## Activación

1. Aplicar `supabase/migrations/202610140002_launch_plan_and_business_scope.sql` en SQL
   Editor del Supabase utilizado por Visibility. Crea la lista y refuerza la relación
   negocio/espacio de cinco tablas. El script es repetible y no borra ni reasigna filas.
2. Incorporar el código de GitHub y publicar en AI Studio.
3. Recargar Visibility. En el control de Supabase, usar Comprobar correspondencia.
   Comprueba las cinco protecciones y cuenta posibles registros inconsistentes visibles
   del espacio actual. No completa automáticamente el control; sigue faltando la prueba
   de cambio de negocio, que se describe en la nota. Al completar ese control se repite
   la comprobación de Supabase y se guarda el resultado junto con la evidencia manual.

Las claves foráneas se añaden con `NOT VALID`: protegen nuevas cargas y cambios de
identificadores, preservando filas anteriores aunque hubiera inconsistencias. La función
de revisión detecta esas filas; no las corrige ni valida automáticamente toda la base.
Las tablas ausentes se informan como pendientes. Las políticas anteriores permanecen.

## Verificación y estado inicial

Prueba local sobre PostgreSQL embebido (PGlite): aplicación repetida de la migración,
preservación de una fila inconsistente de fixture, rechazo de nuevas combinaciones
incorrectas en las cinco tablas, diagnóstico y acceso de propietario a la lista.
También se prueba evidencia obligatoria, reapertura y visualización de las tres jornadas.

Los siete controles reales comienzan pendientes. Las pruebas locales no completan
ninguno de ellos. Falta aplicar el script en Supabase, publicar y comprobar guardado
del plan en la app, además de realizar las pruebas reales enumeradas.
