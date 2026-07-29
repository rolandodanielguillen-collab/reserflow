---
name: Test cron publish 28 de abril
description: Prueba de publicación automática programada para validar fix de timezone
type: project
originSessionId: a373f9d2-6fb4-43c0-9791-8dac9a4164f3
---
Carrusel #3ed3229c ("Reservar cancha ya no duele") reprogramado para 2026-04-28 07:00 ARG (10:00 UTC).

**Why:** Validar que el fix de timezone (argInputToDate con -03:00) guarda correctamente en UTC.

**How to apply:** El 28 de abril a las 18:00 ARG el cron debe publicarlo automáticamente en Instagram. Verificar en la DB que `status = published` y que `instagram_permalink` tiene valor. Si falla, revisar logs del cron en Vercel.
