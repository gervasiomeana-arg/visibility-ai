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

Para un proyecto nuevo, aplicar las migraciones en orden:

1. `supabase/migrations/202610090001_visibility_ai_baseline_v6.sql`
2. `supabase/migrations/202610090002_usage_telemetry_v7.sql`

`supabase/schema.sql` se mantiene como snapshot legible del schema actual. La carpeta `supabase/migrations/` es la fuente para cambios de base de datos en producción.

La v7 agrega telemetría de uso por workspace con RLS y resumen de auditorías, IA, tokens y consultas Search Console.

Después de aplicar las migraciones y configurar las variables, abrir **Admin → Estado de Integraciones → Verificar schema**. El resultado esperado es **Schema v7**, **SCHEMA COMPLETO** y todos los checks críticos en verde.

Si Supabase está configurado pero el RPC de readiness no existe, la base está desactualizada y debe aplicarse la migración antes de probar login o persistencia.

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


## Arquitectura del backend

El servidor Express funciona como bootstrap y montaje de routers. La lógica está separada por responsabilidad:

- `server/runtimeConfig.ts`: lectura segura de configuración y flags de integraciones.
- `server/supabaseAuth.ts`: validación de Bearer token y middleware de autenticación.
- `server/searchConsoleRouter.ts`: OAuth, tokens cifrados, refresh, sitios y consultas de Search Console.
- `server/seoAuditService.ts`: validación URL/SSRF, fetch seguro, parsing HTML, PageSpeed y armado de auditoría.
- `server/seoAuditRouter.ts`: endpoint HTTP de auditoría SEO.
- `server/aiRouter.ts`: asistente IA y generación de contenido.
- `server/healthRouter.ts`: diagnóstico de despliegue sin exponer secretos.
- `server.ts`: Express, middlewares, montaje de routers y Vite/static hosting.

Endpoint de diagnóstico:

`GET /api/health`

Devuelve únicamente estado booleano de integraciones, entorno y uptime. Nunca devuelve claves, secretos, tokens ni credenciales.

### Regla arquitectónica

No agregar nueva lógica de negocio directamente en `server.ts`. Las nuevas integraciones deben vivir en un servicio/router específico y montarse desde el bootstrap principal.

## Protección de consumo API

Las rutas costosas tienen rate limiting configurable:

- Auditoría SEO: `SEO_AUDIT_RATE_LIMIT_PER_WINDOW` (default 30)
- IA: `AI_RATE_LIMIT_PER_WINDOW` (default 120)
- Ventana: `API_RATE_LIMIT_WINDOW_SECONDS` (default 600 segundos)

El límite se aplica por usuario autenticado y, en modo local sin Supabase, por identidad de red disponible.

Esta implementación usa memoria del proceso y funciona como safety net inicial. Si Visibility AI escala a múltiples instancias, el límite deberá migrarse a almacenamiento distribuido (por ejemplo Redis) para tener cuotas globales consistentes.

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
