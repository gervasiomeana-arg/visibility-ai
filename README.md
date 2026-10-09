# Visibility AI

Visibility AI es un SaaS de visibilidad digital para negocios locales y agencias.

## Estado actual

La rama `phase-3-international-saas` incluye:

- auditoría SEO técnica real;
- Google PageSpeed Insights;
- Google Search Console;
- diferenciación explícita entre REAL / PARCIAL / DEMO;
- oportunidades y plan de acción;
- historial y evolución;
- autenticación con Supabase;
- workspaces multi-tenant;
- roles owner / admin / member / viewer;
- negocios aislados por workspace;
- persistencia en Supabase;
- invitaciones de colaboradores;
- restauración cross-device;
- migración explícita desde datos locales anteriores;
- base internacional por país, moneda, idioma y zona horaria;
- UI/UX premium responsive.

## Regla de producto

Visibility AI no debe presentar como hecho ningún dato que no tenga una fuente real verificable.

Cada resultado debe encajar en una de estas categorías:

- Dato real
- Estimación
- Recomendación IA
- DEMO

## Stack

- React 19
- TypeScript
- Vite
- Express
- Supabase Auth + PostgreSQL
- Google Search Console API
- Google PageSpeed Insights API
- Google GenAI
- Tailwind CSS

## Configuración local / despliegue

Copiar `.env.example` y completar solo las integraciones que se vayan a activar.

### Supabase

Variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

En **Authentication → URL Configuration** del proyecto Supabase, configurar:

- **Site URL**: la URL pública de Visibility AI.
- **Redirect URLs**: agregar la misma URL pública y cualquier URL de desarrollo autorizada que vaya a usarse para recuperación de contraseña.

El flujo “Olvidé mi contraseña” vuelve a `window.location.origin + window.location.pathname`, por lo que ese destino debe estar permitido por Supabase.

Ejecutar `supabase/schema.sql` una vez en el SQL Editor del proyecto Supabase.

El schema crea perfiles, workspaces, miembros, invitaciones, negocios, auditorías, snapshots de Search Console, oportunidades, tareas y políticas RLS.

### Search Console

Variables:

- `APP_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `SEARCH_CONSOLE_TOKEN_KEY`

Callback autorizado en Google Cloud:

`${APP_URL}/api/search-console/oauth/callback`

`SEARCH_CONSOLE_TOKEN_KEY` debe ser una clave aleatoria de 32 bytes codificada en base64 y debe permanecer solo en el servidor.

Cuando Supabase y la clave de cifrado están configurados, los tokens de Search Console se guardan cifrados y asociados al usuario autenticado. Si todavía falta esa configuración, el proyecto conserva temporalmente el modo sesión para no bloquear desarrollo.

### PageSpeed

`PAGESPEED_API_KEY` es opcional. Sin clave se puede usar el endpoint público sujeto a cuotas más estrictas.

### Gemini

`GEMINI_API_KEY` activa las funciones de IA. Si no está configurada, la aplicación debe evitar inventar respuestas o métricas.

## Scripts

- `npm run dev` / `npm start`: servidor Express + Vite
- `npm run lint`: TypeScript `tsc --noEmit`
- `npm run build`: build de Vite

## Seguridad

- RLS por workspace en Supabase.
- `viewer` es solo lectura.
- OAuth Search Console usa scope `webmasters.readonly`.
- Tokens Google persistentes se cifran con AES-256-GCM.
- La auditoría de URLs permite únicamente HTTPS y bloquea hosts/IPs privadas conocidas.
- Los datos locales quedan namespaced por workspace cuando la autenticación está activa.

## Pendiente para producción

- pruebas reales de RLS y OAuth contra un proyecto Supabase configurado;
- endurecer la defensa SSRF con resolución/socket pinning;
- telemetría y observabilidad;
- recuperación de contraseña y gestión completa de cuenta;
- facturación y límites por plan;
- Google Business Profile / GA4;
- rank tracking y competencia real;
- reportes exportables y automatización mensual.
