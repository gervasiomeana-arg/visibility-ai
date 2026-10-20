# Controles de salida — 19 de octubre de 2026 (Argentina)

Las pruebas se ejecutaron a partir de las 21:30 de Argentina; los registros originales usan UTC del 20 de octubre. No se reescribieron fechas de medición.

## Dos negocios, auditorías reales

Se usaron exclusivamente fichas identificadas como QA. No se registraron pagos, abonos, mensajes ni entregas.

| Negocio | Resultado de la auditoría publicada | Persistencia |
| --- | --- | --- |
| Open Voley, cliente QA existente | https://openvoley.com/ → https://open-voley-2026.ai.studio/; HTTP 200; respuesta inicial 7480 ms; PageSpeed móvil 83/100, FCP 3,1 s, LCP 3,3 s; 17 factores correctos, 2 advertencias, 1 error | El navegador confirmó guardado y recuperación. No se interpreta el cambio de tiempo de respuesta como una regresión causal sin mediciones repetidas. |
| Hotel Nuevo Horizonte, nueva ficha `PRUEBA QA · Hotel · NO COBRAR · 19-10-2026` | https://www.nuevohorizontehotel.com.ar/ → https://nuevohorizontehotel.com.ar/; HTTP 200; respuesta inicial 631 ms; PageSpeed móvil 72/100, FCP 2,9 s, LCP 4,7 s, CLS 0,001 y TBT 20 ms; 12 correctos, 7 advertencias, 1 error | Auditoría guardada; plan preparado, guardado y reabierto. Copia PDF privada guardada en ficha con envío pendiente. |

Hotel: auditoría `48ad8cba-cd1a-4eb1-a3a3-69a83a1ec622`, observada `2026-10-20T00:34:41.970Z`; plan `2d9dcf91-379e-4822-8ae5-abe8c06607bc`, preparado `2026-10-20T00:35:03.234Z`, guardado `2026-10-20T00:35:06.821913+00:00`. Confirmación adicional de estos identificadores mediante consulta de metadatos limitada a la ficha QA.

No se aportaron preguntas de clientes ficticias. El H1 del hotel se informa como cero etiquetas detectadas en HTML inicial; la propuesta exige comprobar el DOM antes de agregar otro. No se deduce que Google lo ignore. El viewport `width=1024` se distingue de una prueba visual del diseño móvil. PageSpeed es laboratorio, no medición de todos los visitantes.

## PDF: revisión y corrección

Se revisaron las siete páginas renderizadas de los dos PDF anteriormente aportados por el usuario (Open Voley, 17 de octubre, y QA Visibility, 18 de octubre). Son documentos históricos, no consultas nuevas. El documento QA contiene perfiles de Duolingo explícitos; no se considera un informe comercial de Visibility ni evidencia de las redes de Open Voley.

Para revisar el documento actual se recuperó únicamente el plan QA del hotel y sus evidencias, sin leer otros clientes. La exportación inicial con el mismo generador y tipografías coincidió con la huella de contenido de la copia privada guardada: `dc8e7024fa1e54e4e08f44fddb98bcb8166aa1637fea8cf266424dce6c8c265d`. Esta comparación acredita el mismo contenido de entrada; no prueba igualdad binaria con el archivo almacenado.

La revisión visual detectó una recomendación dividida entre páginas (Configuración móvil). Se corrige agregando metadatos de paginación al exportar los bloques del servicio: cada sección que cabe en una página conserva título, dato, propuesta, comprobación y fuente juntos. Las secciones mayores que una página pueden continuar. Se compacta la lista final de fuentes. La corrección también se aplica al exportar planes guardados anteriormente, sin reescribir su payload ni los PDF originales.

Se reexportó el plan con el ajuste, se comprobó igualdad exacta de todos los textos y fuentes y se inspeccionaron sus cuatro páginas renderizadas; sin recortes ni solapamientos. Archivo entregable: `Visibility_Plan_Hotel_QA_Revisado.pdf`. Es una nueva exportación revisada, no el archivo original descargado del navegador. El archivo privado anterior permanece intacto. La impresión nativa y la inspección binaria del archivo descargado en el navegador siguen sin comprobarse.

Prueba de regresión: un plan guardado mantiene una acción con su último párrafo de comprobación/fuente en la misma página, sin alterar la evidencia. Suite total: 351 pruebas aprobadas; tipado y build correctos.

## Search Console: consulta real, datos positivos pendientes

En la publicación, el navegador confirmó conexión con `sc-domain:openvoley.com`. Una consulta oficial del **2025-10-18 al 2026-10-17**, ejecutada una vez, devolvió **0 consultas, 0 clics, 0 impresiones y CTR no calculable** para las consultas recuperadas. Se guardó en el historial QA. No se inventaron consultas ni se concluyó que el sitio no recibiera visitas.

La ruta y el guardado se comprobaron. La aceptación con consultas positivas **sigue pendiente**: no hay un conjunto real recuperado en esta prueba. No se usaron propiedades de otros clientes ni se cambiaron conexiones OAuth para fabricar un caso.

## Gemini: bloqueo externo confirmado, no resuelto

Consulta exacta: `¿Qué información pública verificable existe sobre app voley (https://openvoley.com)?`; mercado Mar del Plata, Argentina; idioma Español; modelo mostrado `gemini-3.8-flash`, Gemini API con Google Search. Una ejecución real volvió a recibir límite de uso con ventana no especificada, referencia `6277c23d-da01-4ec7-83b2-fd28a828e8de`. No se generó ni guardó una respuesta nueva. No hubo reintentos automáticos ni cambio de modelo/clave para eludir límites.

No puede concluirse saldo agotado ni hora de recuperación con ese diagnóstico. Para resolver el bloqueo falta acceso al estado de cuota del proyecto exacto que usa el servidor. Los límites se aplican por proyecto y modelo; una nueva clave del mismo proyecto no los modifica. Documentación oficial consultada: https://ai.google.dev/gemini-api/docs/rate-limits ; panel del propietario: https://aistudio.google.com/rate-limit . No se habilitó facturación ni se contrataron servicios.

## Evidencia del navegador

- Dos negocios, auditorías, plan y copia privada: TinyFish `121f7b05-6988-4013-a6c7-7a6ad17b5500` (completado, 50 pasos).
- Search Console y Gemini: TinyFish `b1f71197-dde7-4886-9cf3-380f138cd746` (completado, 21 pasos).

## Estado de los controles

- [x] Dos negocios con auditoría y persistencia real.
- [x] PDF actual reexportado desde la evidencia guardada, revisado visualmente y corregido; textos preservados.
- [x] Consulta oficial de Search Console y ausencia de resultados tratada correctamente.
- [ ] Search Console con consultas positivas reales.
- [ ] Gemini operativo: bloqueo de cuota persiste.
- [ ] Publicar la corrección de paginación en AI Studio; los PDF ya guardados no se sustituyen.
- [ ] Impresión nativa y archivo descargado en el navegador: revisión directa pendiente.

No se declara cerrado el plan de salida completo ni validada la cobertura integral de redes/IA.
