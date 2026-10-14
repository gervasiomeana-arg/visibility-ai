# Descarga directa del informe

Informe ahora ofrece Descargar PDF y mantiene Imprimir como alternativa. La impresión
puede no abrir el diálogo dentro de la vista previa incrustada de AI Studio. La captura
del usuario del 14 de octubre muestra que continuó en la app publicada y manifestó que
funcionaba; no acredita por sí sola el guardado o descarga de un informe en Clientes.

La nueva descarga genera un PDF A4 en el navegador, con texto seleccionable, tipografías
incluidas, márgenes y páginas numeradas. Toma los bloques del artículo del informe
seleccionado: no consulta otro negocio ni calcula métricas diferentes. La composición
es de una columna y no reproduce la cuadrícula de pantalla.

Se conserva un enlace al archivo preparado por si la descarga automática no comienza.
Si el contenedor de AI Studio bloquea también descargas, se indica abrir la app publicada.
Un cambio del negocio o de los datos invalida una preparación anterior. Las URLs locales
se liberan al reemplazar el documento o desmontar la vista.

jsPDF 4.2.1 se carga bajo demanda. Los subconjuntos DejaVu Sans incluyen caracteres latinos,
griegos, cirílicos, puntuación y euro. Su licencia se incluye con los archivos. Un carácter
sin glifo compatible muestra un error y recomienda Imprimir, en lugar de omitirlo. No se
envían datos a un servicio externo para preparar el PDF. esbuild se actualiza a 0.28.2
para satisfacer el requisito opcional de Vite 8 al resolver las dependencias con npm.

Verificación local: 166 pruebas aprobadas, tipado y compilación correctos. Un PDF de prueba
de tres páginas se abrió con pypdf, se comprobó la conservación de todos los bloques y
se renderizó con Poppler para revisar visualmente acentos, márgenes, títulos y numeración.
Es una fixture local, no un informe real del cliente. Falta probar la nueva descarga
desde la app publicada, cargarla en Clientes y comprobar persistencia y descarga.

## Coherencia de Search Console en el informe

Antes de presentar cifras, se valida que los períodos, etiquetas, clics e impresiones
tengan la misma cantidad de registros; que el último período y la fecha de carga sean
válidos; que la propiedad corresponda a la URL actual del negocio; y que los conteos
sean enteros no negativos y coherentes. Si falla una comprobación, se omiten las cifras
y el período afectados, y se explica que hace falta volver a importar los datos. No se
reemplazan por ceros ni se busca silenciosamente una medición anterior.

El CTR se calcula con clics e impresiones del mismo registro. Si las impresiones son
cero, no se calcula una tasa. Los resultados vacíos válidos permanecen visibles como
mediciones de cero. El cambio de posición requiere además períodos comparables de la
misma propiedad y posiciones válidas; no se compara cuando faltan impresiones.

170 pruebas locales aprobadas. Casos nuevos: propiedad ajena, arrays desalineados,
fechas inválidas, conteos inconsistentes y CTR almacenado desactualizado. La revisión
del PDF exportado con datos reales y la importación real no vacía siguen pendientes.

## Variación de hallazgos

Informe y Evolución distinguen `2 menos`, `2 más` y `Sin cambio` respecto de la primera
auditoría comparable. El historial calculado conserva aumentos con valores negativos;
antes se truncaban a cero. En el gráfico, el tamaño de la barra representa la magnitud
y el rojo distingue los aumentos, con una explicación de la convención de signos.
Los conteos inválidos y las fuentes cambiadas no habilitan una comparación. Estas
variaciones no acreditan tareas completadas ni identifican por sí solas la causa.

173 pruebas locales aprobadas, con casos de empeoramiento y recuperación en historial,
conservación tras lectura y presentación explícita en Informe y Evolución.

## Coherencia con Evolución

Los gráficos de Evolución aplican la validación de cada período de Search Console:
propiedad del sitio actual, fechas, conteos y alineación. Conservan los índices originales
al omitir valores inválidos, para no unir por error métricas y períodos distintos. Las
etiquetas se generan desde las fechas del registro validado. Se avisa de las exclusiones.
Una medición anterior mostrada no se rotula como el estado actual si el último registro
no pudo validarse. Las comparaciones siguen requiriendo el par final completo.

El CTR se calcula con los conteos de cada período; cero clics con impresiones produce
0%, y cero impresiones queda sin tasa ni posición. 177 pruebas locales aprobadas.
Los casos nuevos cubren registros ajenos, datos desalineados, fecha de carga inválida,
ceros y avisos de exclusión en el renderizado de Evolución.

## Revisión del primer PDF real de Neomed — 14 de octubre

El usuario adjuntó el PDF descargado de la app: 3 páginas A4, texto seleccionable,
numeración correcta, sin JavaScript ni recortes o superposiciones visibles en las tres
páginas renderizadas. La descarga y apertura quedan comprobadas; no se comprobó todavía
su carga, persistencia, descarga ni registro de envío en Clientes.

El documento todavía describe a Neomed como «medicina prepaga». No se aprueba para
entrega: la página oficial https://www.neomed.com.uy/empresa/ describe tecnología
médica, equipos, material médico y servicio técnico. La ayuda de IA no guarda el perfil
por sí sola: hace falta aplicar la propuesta, revisar, guardar y regenerar el PDF.
No se modificó el archivo adjuntado ni el perfil de producción.

Los clics, impresiones, CTR y ventas figuran sin medición, sin inventar ceros. El informe
declara el alcance parcial y distingue la fecha del documento de la fecha de medición.
El 59/100 y las advertencias de FCP/LCP proceden de los datos exportados: el PDF no
incluye la respuesta cruda de PageSpeed ni los valores de FCP/LCP y esta revisión no
los certifica de manera independiente. Una lectura actual de la portada devolvió HTTP
200 y ninguna meta description, coherente con ese hallazgo específico del documento.

Se detectó una prioridad LCP partida entre las páginas 2 y 3. El exportador ahora agrupa
título, hallazgo, propuesta y fecha de cada prioridad cuando caben en una página.
Las prioridades demasiado extensas conservan la división normal; no se omiten textos
ni se fuerzan páginas vacías. El título de sección también acompaña al primer grupo
si ambos caben. Pruebas con extracción de texto del PDF comprueban el salto y la
conservación del final en un grupo extenso. La revisión visual del PDF corregido usa
una fixture, no un nuevo PDF descargado desde la app publicada.
