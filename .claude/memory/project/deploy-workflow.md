---
name: Deploy workflow ReserFlow
description: Cómo deployar cambios a producción en ReserFlow — Vercel NO está conectado a GitHub
type: project
originSessionId: a373f9d2-6fb4-43c0-9791-8dac9a4164f3
---
Vercel NO está configurado con auto-deploy desde GitHub. Los git push no disparan nada en Vercel.

**Why:** El proyecto fue configurado con deploy manual via CLI, sin integración GitHub.

**How to apply:** Para que los cambios lleguen a producción siempre hay que correr:
```
vercel --prod
```
El git push sirve solo para versionar el código, no para deployar.

## Limitación cron Vercel Hobby
- Plan Hobby solo permite crons diarios (una vez por día)
- El cron estaba en `0 * * * *` (cada hora) → bloqueaba nuevos deploys
- Se cambió a `0 21 * * *` = 18:00 ARG (21:00 UTC) una vez por día
- Para publicar a otras horas: usar botón manual "Publicar programados"

## Botón "Publicar programados"
Hace lo mismo que el cron pero en el momento que se presiona: busca todos los carruseles con estado `scheduled` y `scheduled_at <= ahora` y los publica en Instagram.
