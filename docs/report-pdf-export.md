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
