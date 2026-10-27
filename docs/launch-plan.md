# Plan de cierre comercial: tres jornadas estimadas

El plan vigente está en «Cierre centrado en los clientes» al final. Los estados
fechados anteriores se conservan como historial, no como lista vigente de pendientes.

Por indicación del operador, el plan se sigue en el chat y ya no se monta el panel
flotante en Visibility. Los registros anteriores se conservan. Los siete controles
son pruebas reales; no se completan porque pasen pruebas de código ni por tener
variables configuradas.

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

## Implementación anterior (referencia técnica)

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

## Evidencia revisada al 15/10/2026

Este estado documenta comprobaciones de la sesión; no modifica las casillas guardadas
en Supabase. Cada marca requiere guardar la evidencia en el espacio correspondiente.

| Control | Estado comprobado |
|---|---|
| Revisar un PDF real | Completado: PDF Neomed del 14/10, tres páginas, perfil, fuentes, fechas y disposición revisados. Los valores PageSpeed se contrastaron con su registro exportado; no se repitió esa medición histórica en la API. |
| Guardar y recuperar el PDF en Clientes | Completado: el operador confirmó recarga y descarga desde Clientes; el archivo recuperado coincide exactamente con el original (32005 bytes, SHA-256 06bf924e13c42cb3c74c7e762912513e994069c6a3f95d8d0901f1ad036749eb). |
| Pagos y registro de envío | Pendiente: pago de prueba registrado, pero el envío real y su confirmación por WhatsApp quedaron aplazados. |
| Importar consultas reales de Google | Pendiente: falta una importación autorizada no vacía y comprobar conservación. Un resultado vacío válido no completa este control. |
| Separación de datos en Supabase | Pendiente: el diagnóstico de correspondencia pasó; falta cambio interactivo entre negocios. Las pruebas locales no sustituyen esa comprobación. |
| Piloto completo | Pendiente de recorrer la app publicada con guardado y entrega reales. |
| Revisión final | Pendiente de repetir el recorrido completo con otro negocio. |

Redes se revisará después de estos controles, por indicación del operador.

## Actualización del 26/10/2026

Este registro distingue pruebas de código de comprobaciones en producción. No cambia
automáticamente las marcas de Supabase ni certifica funciones sin evidencia.

| Control | Evidencia disponible y límite |
|---|---|
| PDFs e historial | El 25/10 se generaron y recuperaron tras recarga un PDF individual de Search Console para Open Voley y uno combinado de Duolingo. Se contrastaron contenido, fechas y fuentes; el combinado tenía cuatro páginas revisadas visualmente. |
| Search Console | Consulta oficial del 25/10: 1 impresión y 0 clics en los totales de propiedad, sin filas de consultas. Guardado y recuperación comprobados. Los totales no se calculan sumando la tabla de consultas; sigue sin prueba una importación con filas de palabras clave no vacías. |
| Redes | Lecturas reales del 25/10 de Instagram del hotel y YouTube, Facebook y TikTok de Duolingo, guardadas en fichas QA identificadas. Son recuentos observados; no acreditan alcance, vistas mensuales ni evolución histórica. |
| Seguridad y separación | Revisión previa de RLS, operador exclusivo y almacenamiento privado. La suite vuelve a cubrir accesos ajenos, aislamiento de negocio, estados OAuth y ausencia de claves en respuestas. No implica riesgo cero. La protección de contraseñas filtradas de Supabase no está habilitada en el plan gratuito. |
| Respaldo | Exportación real del 25/10 verificada en restauración aislada: 16 tablas y 9 PDFs. No incluye credenciales, sesiones, conexiones OAuth ni la bandeja independiente de la web pública. |
| Pagos y entrega | Cobro por enlace PayPal y registro manual; no hay suscripción con débito automático. El operador confirmó anteriormente recepción de adjuntos por WhatsApp; no se realizó un envío nuevo en esta revisión ni se marcaron informes como enviados. |
| IA | Existe evidencia guardada de Gemini con fuentes y revisión pendiente. No se interpreta como medición de ChatGPT, Claude ni recomendación espontánea. |
| Google Business Profile | Autorización guardada visible en captura del operador. Habilitación de APIs declarada por él. Sin cuenta/ficha real recuperada todavía; falta revisar cuota/aprobación y completar lectura, informe y conservación. |
| Verificación del código | 26/10: 373 pruebas aprobadas, ninguna fallida u omitida; TypeScript y compilación aprobados. Las pruebas usan proveedores simulados aislados, no sustituyen la activación real de Google. |

Corrección preparada: preservar el diagnóstico de cuota Google en lugar de ocultarlo
tras un aviso genérico de límite temporal. Falta publicar esta corrección en AI Studio
y repetir una consulta. Si Google tiene cuota cero, se requiere aprobación externa;
publicar o renovar tokens no la concede.

No declarar el servicio completo al 100%: Google Business aún no tiene validación
real y esta versión solo consulta datos de ficha, sin métricas de rendimiento ni reseñas.
El alcance comercial debe coincidir con los canales y datos efectivamente comprobados.

## Cierre centrado en los clientes — plan vigente del 26/10/2026

Objetivo ratificado por el operador: medir y explicar la presencia de cada cliente
en web, buscadores, asistentes de IA y redes, y preparar mejoras concretas e informes
con evidencia. Visibility no necesita una ficha propia de Google Maps para auditar
la presencia pública de sus clientes. Google Business queda fuera de este cierre;
no crear fichas, reclamar negocios ajenos ni cambiar permisos para resolverlo.

Esta es la única lista activa de cierre. Los registros anteriores son antecedentes.
El plan se comunica en el chat; no añadir otro panel a la aplicación.

| Control | Estado | Criterio de cierre |
|---|---|---|
| Alcance y fuentes de cada módulo | Revisado en código | Distinguir medición automática, comprobación manual, declaración del cliente y propuesta. No intercambiar Google Search Console, Google Business y resultados del buscador. |
| Precisión de informes y condiciones | Corrección preparada; publicación pendiente | La comprobación puntual no aparece como monitoreo mensual; país/dispositivo no acreditan condiciones técnicas no configuradas. Fuentes, consulta, modelo y fecha permanecen. Las recomendaciones se rotulan como propuestas. |
| Buscadores públicos | Validación publicada pendiente | Para un cliente autorizado, comprobar una búsqueda de marca y una de servicio sin marca. Guardar consulta, fecha, idioma, condiciones reales, resultados observados y posición orgánica solo si se comprobó. Recuperar tras recarga. Google/Bing/DuckDuckGo son manuales en esta versión. No requieren acceso a la cuenta del cliente. |
| Search Console | Parcial: totales reales ya comprobados | Validar también una respuesta con filas de consultas y contrastarla con la propiedad/período autorizados. No inventar filas cuando Google las omite. Es una fuente adicional, no requisito para toda auditoría de buscadores. |
| IA por plataforma | Gemini API probado antes; nueva revisión y otros asistentes pendientes | Conservar la respuesta real, fuentes y consulta de cada proveedor. ChatGPT/Claude/Perplexity se comprueban manualmente en esta versión. Gemini con contexto de marca no demuestra recomendación espontánea ni mide los demás asistentes. Verificar preguntas con y sin marca por separado. |
| Web y redes | Evidencia previa disponible; repetir en piloto final | Contrastar URL/perfil correcto, datos/fecha y límites de la muestra. HTML inicial no es DOM renderizado; ALT decorativo vacío no es atributo ausente. Seguidores actuales no son historial ni alcance. Si falla una fuente, conservar lo anterior y no calcular datos para rellenar. |
| Propuestas útiles | Validación editorial pendiente | Entregar 3–5 acciones justificadas por evidencias, con cambio concreto, prioridad explicada y forma de comprobarlo. No atribuir servicios o competidores sin confirmar. Separar los trabajos adicionales cotizados. |
| Recorrido completo | Nueva prueba publicada pendiente | Ficha → cuatro auditorías → revisión → guardar → recargar → PDF → guardar copia → recuperar. Repetir con otro cliente y comprobar aislamiento. La entrega WhatsApp es manual; no marcar enviada por descargar. |
| Acceso, respaldo y comercial | Controles previos documentados; conservar | Mantener operador exclusivo, RLS, PDFs privados y respaldo verificado. Cobro por enlace y registro manual; precios no equivalen a suscripciones automáticas. Revisar que la web pública prometa solo el alcance comprobado. |

Para cada nueva prueba se registra cliente, canal, consulta/perfil, momento, fuente,
resultado y evidencia recuperable. No tachar un control por aprobar pruebas unitarias,
tener una clave o publicar. No asignar porcentaje global sin un denominador estable
ni declarar 100% mientras haya controles anteriores sin comprobar.

En la sesión del 26/10 el navegador del agente llegó al acceso privado de Visibility;
no tenía una sesión iniciada. No se ejecutó una nueva auditoría de producción ni se
guardaron resultados simulados. El siguiente control interactivo requiere acceso
del operador en ese navegador; el trabajo de código puede continuar mientras tanto.

### Comprobación focalizada tras publicar — 26/10/2026

Por indicación expresa del operador se reutiliza la evidencia anterior, sin repetir
la suite completa ni lanzar consultas de pago para comprobar que un documento abre.

- Acceso privado: sesión del operador confirmada en la app publicada mediante el
  formulario seguro. Se pudo acceder a Clientes, Buscadores e Historial.
- Buscadores publicado: comprobación pública manual seleccionada por defecto,
  fecha puntual, fuentes adicionales separadas y campo de mejora propuesta visibles.
- Informe combinado de Duolingo recuperado del historial: conserva los recuentos
  del 25/10 (TikTok 18.326.147, Facebook 2.402.449, YouTube 7.040.000 redondeados),
  la observación manual Google del 24/10 y Gemini pendiente de revisión. Las cifras
  coinciden con los registros conservados en Supabase; no son recuentos nuevos de hoy.
- Cambio de cliente a Hotel Nuevo Horizonte: el informe de Duolingo se desmontó
  y se cargó el historial del hotel. Su plan guardado del 20/10 conserva LCP de
  laboratorio 4,7 s, viewport width=1024, fuentes y pasos de comprobación.
- Intento único de consulta nueva Google, «aplicaciones para aprender idiomas»,
  el 26/10 a las 14:24 UTC: navegador remoto detenido por tráfico inusual/reCAPTCHA.
  No se obtuvieron resultados; no se guardó una ausencia, posición ni medición.
  No se intentó resolver la verificación ni se repitió la consulta.
- IA: el registro de Gemini responde una pregunta que identifica a Duolingo.
  No demuestra descubrimiento sin marca. Las fuentes oficiales sobre Duolingo Max
  y English Test respaldan esas funciones generales; no se verificó aquí la
  afirmación negativa general sobre ausencia de tutorías humanas. El registro y
  sus diez referencias permanecen sin alterar, con estado unreviewed. No hay una
  nueva consulta ni evidencia de ChatGPT o Claude en esta revisión.
  Referencias contrastadas: https://blog.duolingo.com/duolingo-max/ y
  https://blog.englishtest.duolingo.com/duolingo-english-test-readiness/.
- Hallazgo editorial real: el consejo de H2 aún proponía incorporarlos aunque
  solo se inspeccionó HTML inicial. Se condiciona ahora a revisar el DOM renderizado
  para no duplicar encabezados existentes. Una prueba local específica aprobada;
  no se repitieron las 376 pruebas ni se consultaron proveedores externos para ello.
  Los informes anteriores se conservan con su redacción original; la corrección
  se aplica a auditorías nuevas después de publicar.

Pendiente efectivo: evidencia por plataforma de IA (en particular ChatGPT/Claude
y preguntas de descubrimiento sin marca), la consulta pública Google hoy bloqueada,
y la muestra de consultas no vacías de Search Console. No cerrar estos puntos por
tener opciones de menú o porque se pueda generar un PDF con registros previos.

### Premisa ratificada: ChatGPT y Claude sin costos adicionales

El operador pidió incorporar ambas plataformas sin pagar proveedores. El flujo
principal de IA pasa a consulta web manual para todas sus plataformas, con ChatGPT
seleccionado inicialmente, botón para copiar la pregunta, apertura de la plataforma,
registro de respuesta/enlace y propuesta de mejora. No invoca presenceService.research
ni consume Gemini API al preparar ese informe. No se agregan claves de OpenAI o
Anthropic, suscripciones ni cobros. Los registros previos de Gemini API se conservan
con su método y fuentes originales.

Esto no implementa una API gratuita ni automatiza las interfaces de ChatGPT/Claude:
la respuesta se obtiene con el acceso web disponible del operador y se documenta
manualmente. Si la plataforma exige pago o limita el acceso, no contratar nada ni
rellenar la respuesta. Los módulos anteriores y herramientas complementarias que
todavía ofrezcan Gemini API no forman parte de esta modalidad sin API; no usarlos
para estas comprobaciones. Su clave presente no garantiza cuota gratuita.

Verificación acotada: prueba local de H2 y prueba de evidencia manual para las dos
plataformas. El tipado y la compilación comprueban el cambio de interfaz; no se
repiten las pruebas generales ni se lanzan nuevas consultas de pago. La captura del
plan del hotel documenta la revisión del informe existente, no valida todavía el
nuevo flujo de IA antes de publicarlo y obtener respuestas reales de cada plataforma.

### Cierre focalizado — 27/10/2026

Google Business queda expresamente fuera del lanzamiento por decisión del operador:
no es un requisito para analizar la presencia de sus clientes en buscadores.
No se configura ni se solicita administrar la ficha del hotel.

- ChatGPT y Claude: ya se obtuvieron respuestas web reales el 26/10 a la misma
  pregunta de descubrimiento sin marca sobre scouting y estadísticas de voleibol
  para entrenadores. Se guardaron para el cliente QA Open Voley, con sus respuestas,
  fechas, condiciones y referencias. Registros f9c5617d-f458-4d73-9e9e-7c397fa02498
  y fbbffb73-a1fd-46ea-9507-855c53d29123. Open Voley no se observó en esas respuestas;
  esto no acredita ausencia general ni posiciones en ninguna plataforma. Claude
  usó una sesión y ChatGPT acceso anónimo; no se comparan cuantitativamente.
- Publicación: GitHub main 72487d1 incluye el flujo manual sin API, pero la app
  publicada todavía muestra Gemini como valor inicial y «Consultar Gemini con
  fuentes». No se pulsó ese botón. Falta sincronizar y publicar los cambios;
  no declarar verificada en producción la interfaz nueva.
- Google público: la consulta «herramientas de scouting y estadísticas de voleibol
  para entrenadores» terminó en unusual traffic/reCAPTCHA en este navegador remoto.
  No hubo resultados ni se guardó una posición o ausencia. Pendiente la verificación
  humana; no repetir intentos automáticos ni cambiar la ruta de red.
- Informe: los combinados incorporan resumen ejecutivo, canales sin medición
  explícitos, hasta cinco acciones sustentadas en las fuentes y un anexo completo.
  Preparar el documento no cambia fechas ni actualiza mediciones. No llama IA.
- Corrección PDF: los símbolos de uso privado copiados de una plataforma impedían
  exportar el informe real de Claude. Se representan explícitamente como [U+...]
  con nota de transcripción; el texto guardado permanece intacto. Otros caracteres
  sin tipografía compatible siguen produciendo el error de validación existente.
- Prueba real: PDF de revisión Open Voley con Web del 20/10, Search Console del
  25/10 y ChatGPT/Claude del 26/10. Conserva 0 clics, 1 impresión y 0 consultas
  recuperadas; Redes figura sin medición en esta selección. Resumen en tres páginas
  y anexo de evidencia, 20 páginas en total, revisadas visualmente.
- El PDF se cargó por la UI en la ficha «PRUEBA QA · NO COBRAR · 16-10-2026»,
  título «PRUEBA QA · Open Voley · resumen y evidencias · 27-10-2026».
  La app confirmó lectura posterior de Supabase. Se descargó la copia privada y
  su SHA-256 coincide con el archivo original. Envío pendiente: no se mandó ni se
  marcó enviado por WhatsApp. No se modificaron pagos ni otras fichas.
- Validación de código: 9 pruebas específicas de resumen/PDF aprobadas,
  tsc --noEmit y vite build aprobados. No se repitió la suite completa.

Pendientes efectivos: publicar el código más reciente, completar la consulta
pública Google bloqueada y obtener una muestra no vacía de consultas de Search
Console cuando la propiedad disponga de ella. El resultado vacío actual es real;
no completarlo con datos inventados. No declarar el lanzamiento al 100%.
