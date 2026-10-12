# Investigación web de competidores

## Recorrido
En Competidores, usar «Investigar un negocio en la web». Completar nombre, ciudad y país, pregunta y, si se conoce, web de referencia. Para distinguir negocios con nombres parecidos se exige ubicación. La investigación se inicia únicamente al pulsar el botón.

## Fuentes y límites
El servidor usa Gemini 3.8 Flash con Google Search habilitado. Solo conserva segmentos de respuesta que el proveedor vincula con URLs válidas en groundingSupports/groundingChunks, con consultas de búsqueda y el widget de sugerencias devuelto. Un texto sin estas referencias no se guarda como investigación. Las fuentes del proveedor se muestran por fragmento y se deben revisar antes de usar la información. Esta relación no prueba de forma independiente cada afirmación ni convierte la categoría de una web comercial en una clasificación oficial. No se calculan posiciones ni puntajes del competidor, ni se modifican perfiles o borradores comerciales.

Referencias técnicas oficiales: https://ai.google.dev/gemini-api/docs/generate-content/google-search y https://ai.google.dev/gemini-api/terms . Las sugerencias de Google se presentan en un iframe sandbox con política de contenido restringida; no se ejecuta HTML del proveedor dentro del DOM de la aplicación.

## Configuración y persistencia
Usa GEMINI_API_KEY existente, no OAuth de Search Console. Google puede aplicar cuotas y facturación por búsquedas además del consumo de Gemini. El endpoint comparte la autenticación Supabase existente, admite hasta 12 peticiones por ventana del rate limiter y limita la llamada al proveedor a 60 segundos. No se necesitan nuevas variables.

Las últimas diez investigaciones quedan en el navegador y se aíslan por usuario/espacio de trabajo y negocio. No están sincronizadas con Supabase ni otros dispositivos. El panel avisa si el guardado no pudo confirmarse. Al cambiar de contexto, la solicitud anterior no puede actualizar ni guardar en el nuevo negocio.

## Validación
Pruebas de identificación y URLs, rechazo de respuestas sin fuentes o segmentos inventados, habilitación explícita de Google Search, persistencia e aislamiento, errores de almacenamiento y endpoint sin configuración. Tipado y compilación revisados. La llamada real al proveedor y la experiencia del navegador deben comprobarse en AI Studio con la clave existente; no se usó una clave de producción desde el entorno de desarrollo.
