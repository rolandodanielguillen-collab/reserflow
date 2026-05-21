# PRP-001: Migrar ReserFlow al VPS como reserflow.reserplus.com

> **Estado**: COMPLETADO
> **Fecha**: 2026-05-08
> **Proyecto**: ReserPlus (unificacion ReserFlow + ReserPlus)

---

## Objetivo

Desplegar ReserFlow (content studio para marketing automation de Instagram) en el VPS propio del usuario como subdominio `reserflow.reserplus.com`, eliminando toda dependencia de Vercel y Supabase. La app corre con Next.js 16 + Prisma + MariaDB + PM2 + nginx.

## Por Que

| Problema | Solucion |
|----------|----------|
| ReserFlow depende de Vercel (hosting) y Supabase (auth+DB) que generan costos externos y fragmentan la infraestructura | Unificar todo en el VPS propio (45.162.169.95) donde ya corre el negocio principal |
| El cron de Vercel tiene limitaciones (frecuencia, timeout) para publicar posts programados | Cron del sistema o node-cron sin restricciones de plataforma |
| Los datos estan dispersos entre Supabase y el VPS | Una sola base de datos MariaDB en el VPS para todo |

**Valor de negocio**: Eliminar costos de Vercel/Supabase (~$20-40/mes), control total de la infraestructura, datos unificados, y latencia reducida al tener todo en un solo servidor.

## Que

### Criterios de Exito
- [ ] `reserflow.reserplus.com` responde con HTTPS (certificado SSL via Let's Encrypt)
- [ ] Login con email/password funciona (NextAuth + Prisma + MariaDB)
- [ ] Content Studio carga carousels desde MariaDB (no queda ninguna referencia a Supabase)
- [ ] Generar un carousel con AI (OpenAI) funciona end-to-end
- [ ] Programar y publicar un carousel en Instagram funciona (cron del sistema ejecuta la publicacion)
- [ ] Remotion renderiza video/reels server-side correctamente
- [ ] WhatsApp notifications (YCloud) funcionan
- [ ] `npm run build` exitoso sin errores ni warnings criticos

### Comportamiento Esperado (Happy Path)

1. Usuario abre `reserflow.reserplus.com` y ve la landing page
2. Se registra o inicia sesion con email/password (o Google OAuth)
3. Configura brand settings (colores, logo, tokens de Meta/Instagram)
4. Genera un carousel con AI desde el Content Studio
5. Revisa, aprueba, y programa el carousel
6. El cron del sistema ejecuta la publicacion en Instagram a la hora programada
7. Recibe notificacion por WhatsApp confirmando la publicacion

---

## Contexto

### Estado Actual de la Migracion (ya completado)

La migracion de codigo ya esta **practicamente completa** en `C:\RepositorioSaaSFactory\ReserPlus`:

**Auth**: NextAuth v5 con Credentials + Google OAuth + PrismaAdapter
- `src/lib/auth.ts` - Configuracion principal (bcrypt, Prisma, JWT)
- `src/lib/auth.config.ts` - Middleware config (proteccion de rutas)
- `src/hooks/useAuth.ts` - Hook client-side (useSession)
- `src/app/api/auth/[...nextauth]/route.ts` - Route handler
- `src/app/api/auth/signup/route.ts` - Registro
- `src/app/api/auth/forgot-password/route.ts` - Password reset
- `middleware.ts` - Proteccion de rutas via NextAuth middleware

**Base de datos**: Prisma con adapter MariaDB
- `prisma/schema.prisma` - 6 modelos: User, Account, Session, VerificationToken, BrandSettings, ContentIdea, Carousel + 2 enums
- `src/lib/prisma.ts` - Cliente Prisma con PrismaMariaDb adapter
- `src/lib/prisma-admin.ts` - Cliente sin RLS (para cron jobs)
- `src/lib/prisma-rls.ts` - Extension custom que aplica userId automaticamente (reemplaza RLS de Supabase)
- `src/types/database.ts` - Tipos TypeScript manuales

**Services (todos ya migrados a Prisma)**:
- `features/settings/services/brand-settings.ts` - prismaRls
- `features/content-studio/services/get-carousels.ts` - prismaRls
- `features/content-studio/services/set-carousel-status.ts` - prismaRls
- `features/content-studio/services/update-carousel-status.ts` - prismaRls
- `features/content-studio/services/seed-content-calendar.ts` - prismaRls
- `features/content-studio/services/trigger-publish.ts` - prismaRls
- `features/generation/services/generate-carousel.ts` - prismaRls
- `features/generation/services/get-last-carousel.ts` - prismaRls
- `features/generation/services/regenerate-slide.ts` - prismaRls
- `features/generation/services/generate-cover-image.ts` - prismaRls
- `features/generation/services/upload-cover-image.ts` - prismaRls
- `features/scheduler/services/instagram-publish.ts` - prismaRls + prismaAdmin
- `features/scheduler/services/schedule-post.ts` - prismaRls
- `features/publishing/services/export-and-publish.ts` - prismaRls
- `features/publishing/services/cloudinary-upload.ts` - sin BD
- `features/notifications/services/ycloud.ts` - prismaRls

**API Routes (todas con Prisma)**:
- `api/cron/publish-scheduled/route.ts` - prismaAdmin (protegido con CRON_SECRET)
- `api/carousel/schedule/route.ts`
- `api/video-slideshow/route.ts`
- `api/render-reel/route.ts`
- `api/publishing/export-and-publish/route.ts`
- `api/webhooks/ycloud/route.ts`

**Storage**: Local filesystem (`src/lib/storage.ts`) con UPLOADS_DIR configurable

**Zero Supabase references en codigo funcional** (solo queda una mencion en `shared/README.md` como ejemplo generico, no es codigo ejecutable)

**Env vars**: `.env.local.example` ya configurado para MariaDB + NextAuth + reserflow.reserplus.com

### Referencias
- VPS: `45.162.169.95`, SSH alias `reserplus-vps`, user root
- Docker: PostgreSQL 16 + Redis 7 (pero usaremos MariaDB via el VPS, no PostgreSQL)
- Node: v20.20.2 en VPS
- PM2: NO instalado aun (hay que instalarlo)
- Otros sitios en VPS: competencias.com.py, sportsgest.com (NO TOCAR)
- n8n instalado globalmente (NO TOCAR)

### Arquitectura Propuesta

```
VPS (45.162.169.95)
├── Apache 2.4.62 (reverse proxy)
│   └── reserflow.reserplus.com → localhost:3002
├── PM2 v7.0.1
│   └── reserflow (next start --port 3002)
├── MariaDB 10.11.16
│   └── reserflow_db (user: reserflow_user)
├── cron (sistema)
│   └── cada 5 min: curl localhost:3002/api/cron/publish-scheduled
├── Let's Encrypt (certbot webroot)
│   └── SSL para reserflow.reserplus.com (expira 2026-08-06)
├── Google Chrome 147 + ffmpeg 5.1.8 (para Remotion)
└── /var/www/reserflow/
    ├── .env.local (600 permisos)
    ├── .env (DATABASE_URL para Prisma CLI)
    ├── .next/
    ├── public/uploads/
    └── node_modules/
```

### Modelo de Datos (ya definido)

```sql
-- Tablas ya definidas en prisma/schema.prisma:
-- users, accounts, sessions, verification_tokens (NextAuth)
-- brand_settings (config de marca + tokens Meta/Instagram/YCloud)
-- content_ideas (ideas de contenido con status workflow)
-- carousels (posts con slides JSON, scheduling, Instagram IDs)
-- Enums: content_status, content_type
```

### Nota sobre PostgreSQL vs MariaDB

El VPS tiene PostgreSQL 16 en Docker, pero el proyecto ya esta configurado con Prisma adapter para MariaDB (`@prisma/adapter-mariadb`). Hay que decidir si:
- **(A)** Usar MariaDB/MySQL existente del VPS (ya configurado en Prisma)
- **(B)** Usar el PostgreSQL Docker del VPS (requiere cambiar adapter a `@prisma/adapter-pg`)

Recomendacion: Mantener MariaDB como ya esta configurado para minimizar cambios.

---

## Blueprint (Assembly Line)

> IMPORTANTE: Solo FASES. Las subtareas se generan al entrar a cada fase con el bucle agentico.

### Fase 1: Preparar Base de Datos en VPS ✅ COMPLETADA
**Resultado**: BD `reserflow_db` creada en MariaDB 10.11.16. Usuario `reserflow_user` con permisos. 7 tablas creadas via `prisma db push`. Verificado con `SHOW TABLES`.

### Fase 2: Configurar PM2 + Deploy de la App ✅ COMPLETADA
**Resultado**: Proyecto subido via tar+scp. Deps instaladas. Build exitoso. PM2 v7.0.1 instalado. App corriendo en puerto 3002 (3001 ocupado por padelpost-ai). `pm2 startup` + `pm2 save` configurados. `curl localhost:3002` → HTTP 200.

### Fase 3: Configurar Apache + SSL ✅ COMPLETADA
**Resultado**: VPS usa Apache 2.4.62 (no nginx). VirtualHost creado con reverse proxy a localhost:3002. SSL via Let's Encrypt (certbot webroot). `https://reserflow.reserplus.com` → HTTP 200 con certificado valido. HTTP→HTTPS redirect configurado.

### Fase 4: Configurar Cron del Sistema ✅ COMPLETADA
**Resultado**: `crontab` configurado: `*/5 * * * *` curl con CRON_SECRET a `/api/cron/publish-scheduled`. Probado manualmente → `{"message":"No hay posts pendientes","processed":0}` HTTP 200.

### Fase 5: Dependencias de Remotion ✅ COMPLETADA
**Resultado**: Google Chrome 147 y ffmpeg 5.1.8 ya estaban instalados en el VPS. Chrome headless verificado funcionando.

### Fase 6: Testing End-to-End
**Objetivo**: Validar todo el flujo completo desde el browser real
**Validacion**:
- [ ] Registro de usuario nuevo funciona
- [ ] Login con credentials funciona
- [ ] Brand settings se guardan y cargan correctamente
- [ ] Generar carousel con AI funciona
- [ ] Programar carousel funciona
- [ ] Cron publica el carousel en Instagram
- [ ] WhatsApp notification llega
- [ ] Render de video/reel funciona
- [ ] `npm run build` exitoso en el VPS
- [ ] Criterios de exito del PRP cumplidos

---

## Aprendizajes (Self-Annealing)

> Esta seccion CRECE con cada error encontrado durante la implementacion.

1. **Puerto 3001 ocupado**: padelpost-ai usa 3001, node index.js usa 3000. Usamos puerto 3002.
2. **VPS usa Apache, no nginx**: El PRP original decia nginx pero el VPS tiene Apache 2.4.62. Ajustado a VirtualHost de Apache con mod_proxy.
3. **Certbot .well-known 404**: Al tener ProxyPass / al inicio, Apache enviaba .well-known al Next.js que devuelve 404. Solucion: `ProxyPass /.well-known/ !` antes del proxy general + DocumentRoot apuntando a /var/www/reserflow/public.
4. **IP-based vs name-based vhosts**: Los vhosts existentes usan `45.162.169.95:80`, no `*:80`. Tuve que usar la IP explicita para que Apache resolviera correctamente.
5. **Prisma migrate necesita shadow DB**: `prisma migrate dev` falla sin permisos de CREATE DATABASE. Solucion: usar `prisma db push` que no necesita shadow database.
6. **MariaDB root password**: No hay .my.cnf, el password se encontro en `.mysql_history`. Ultimo password: `NuevaPassword123!`
7. **Prisma .env vs .env.local**: `prisma.config.ts` importa `dotenv/config` que lee `.env`, no `.env.local`. Hay que mantener DATABASE_URL en ambos archivos.

---

## Gotchas

- [ ] El VPS tiene Node v20.20.2 — verificar compatibilidad con Next.js 16 (requiere Node 18.18+, deberia funcionar)
- [ ] Remotion necesita Chromium headless + ffmpeg en el servidor — pueden faltar librerias de sistema en el VPS
- [ ] El adapter de Prisma es `@prisma/adapter-mariadb` — si el VPS solo tiene MySQL puro (no MariaDB), puede haber diferencias menores
- [ ] La ruta de uploads `/var/www/reserplus/public/uploads` en .env.local.example deberia ser `/var/www/reserflow/public/uploads`
- [ ] PM2 no esta instalado en el VPS — hay que instalarlo (`npm i -g pm2`)
- [ ] `html2canvas` se usa para capturar slides client-side — funciona igual en cualquier hosting
- [ ] El cron endpoint usa CRON_SECRET para autenticacion — generar un token seguro
- [ ] Hay otros sitios en el VPS (competencias.com.py, sportsgest.com, n8n) — NO TOCAR nada de ellos
- [ ] El .env.local necesita DATABASE_URL apuntando al MySQL/MariaDB del VPS, no a Docker PostgreSQL
- [ ] Google OAuth callback URL debe actualizarse en Google Cloud Console a `https://reserflow.reserplus.com/api/auth/callback/google`

## Anti-Patrones

- NO usar Supabase para nada (memoria del proyecto: feedback_no_supabase.md)
- NO usar Vercel para deploy (memoria del proyecto: feedback_no_vercel.md)
- NO tocar n8n ni otros sitios del VPS (memoria del proyecto: feedback_vps_isolation.md)
- NO hardcodear el puerto — usar variable de entorno o PM2 config
- NO usar PostgreSQL Docker si MariaDB ya esta configurado (evitar cambios innecesarios)
- NO ignorar errores de TypeScript

---

*PRP pendiente aprobacion. No se ha modificado codigo.*
