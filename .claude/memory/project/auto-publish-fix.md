---
name: Auto-publish pipeline fix
description: Publicación automática de carruseles corregida — 3 root causes encontradas y resueltas (abril 2026)
type: project
originSessionId: fc99d424-3933-44b9-b99f-3f32db440db0
---
## Publicación automática arreglada (2026-04-29)

El cron de publicación automática nunca había funcionado. Se encontraron y corrigieron 3 causas raíz:

1. **VERCEL_URL bloqueada por Deployment Protection** — El fetch interno a `/api/slides/render` usaba `VERCEL_URL` (URL de deployment protegida) causando 401. Fix: `NEXT_PUBLIC_SITE_URL` ahora tiene prioridad. Se configuró como `https://reserflow.vercel.app` en Vercel env.

2. **Instagram "Media ID not available"** — No había polling de status del container antes de publicar. Instagram necesita tiempo para procesar las imágenes. Fix: polling cada 2s hasta 60s esperando `status_code=FINISHED`.

3. **Slides renderizados diferentes al preview** — El cron usaba un renderer server-side (`next/og`) que solo soporta cover/content/cta. Los slides `flowScreen` (mockup WhatsApp) se renderizaban genéricos. Fix: al programar desde Content Studio, se capturan los slides reales con `html2canvas` y se guardan en `slide_image_urls`. El cron usa esas imágenes directamente.

## Infraestructura actual

- **pg_cron + pg_net** en Supabase: ejecuta cada 15 minutos (`*/15 * * * *`), llama a `https://reserflow.vercel.app/api/cron/publish-scheduled` con `Bearer CRON_SECRET`
- **Vercel cron** sigue en `vercel.json` como safety net (1x/día 21:00 UTC)
- **Columnas nuevas**: `fail_reason` (text), `retry_count` (int), `slide_image_urls` (text[])
- **Reintentos**: posts `failed` con `retry_count < 3` se reintentan automáticamente
- **Logging completo** en Vercel Function Logs para diagnóstico

**Why:** El sistema de publicación es core para ReserFlow — automatiza el marketing de clubes deportivos.

**How to apply:** Si hay problemas de publicación, revisar `/api/debug-scheduler` en producción para diagnóstico de env vars y estado de posts. Los logs del cron están en Vercel Function Logs con tag `[Cron]`.
