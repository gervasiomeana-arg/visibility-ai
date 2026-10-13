# Verificación para clientes reales — 13/10/2026

## Comprobado

- Servidor iniciado en modo producción local; GET / y GET /api/health devolvieron 200.
- GET /api/search-console/status devolvió 200 y distinguió conexión/configuración ausentes.
- Esta copia local no tiene credenciales de Supabase, Google OAuth, PageSpeed ni Gemini. No se infiere el estado del despliegue de AI Studio desde esta copia.
- 142 pruebas aprobadas, tsc --noEmit y vite build correctos.
- Pruebas del perfil: escritura por workspace/negocio, rechazo sin fila confirmada, error remoto, descripción vacía, almacenamiento bloqueado y Uruguay.

## Correcciones de este bloque

El perfil editado se guardaba únicamente en el navegador. El formulario ahora espera confirmación del guardado en Supabase y muestra si solo se conserva localmente. El perfil remoto incluye la descripción confirmada. Uruguay es seleccionable con es-UY y America/Montevideo; el país no se deduce automáticamente de un dominio.

## Aplicación del esquema

Aplicar en el Supabase del proyecto `supabase/migrations/202610130001_business_profile_description.sql` antes de utilizar el nuevo guardado de perfiles. Solo agrega una columna nullable; no elimina filas ni cambia RLS. Si no se aplica, el guardado remoto puede fallar y la interfaz lo informa.

## Pendiente y sin aprobar

- Aplicar la migración en la base real.
- Guardar un perfil y recuperar sus valores en otra sesión/equipo.
- Completar OAuth con una cuenta real y comprobar persistencia tras reinicio.
- Ejecutar Gemini con la clave del despliegue.
- Auditar un negocio, cambiar de negocio y recargar en el navegador real.
- Revisar visualmente escritorio/móvil y el PDF imprimible.

Playwright está disponible como librería, pero no hay ejecutable de Chromium en este entorno. Su descarga falló por un archivo incompleto; no se ejecutó una prueba visual ni se generó un PDF validado. Para continuar la verificación del despliegue se necesita su URL publicada actual. No se requiere compartir claves secretas en el chat.
