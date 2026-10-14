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
