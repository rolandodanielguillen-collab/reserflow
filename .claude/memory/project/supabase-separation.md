---
name: Separación Supabase ReserFlow/Botflow
description: ReserFlow tiene su propio proyecto Supabase separado de Botflow
type: project
originSessionId: f9f332f7-177a-4216-afcd-e440865f0f1d
---
ReserFlow y Botflow ahora tienen proyectos Supabase separados.

**Why:** Compartían el mismo proyecto Supabase, lo que causaba que Google OAuth redirigiera a Botflow (el Site URL apuntaba a localhost:3000).

**How to apply:** No mezclar credenciales. ReserFlow usa exclusivamente `bzwpmmhiccykppnnjrwn`.

## ReserFlow
- Supabase project: `bzwpmmhiccykppnnjrwn` (https://bzwpmmhiccykppnnjrwn.supabase.co)
- Vercel: https://reserflow.vercel.app  ← PRODUCCIÓN ACTIVA (no usar servidor local)
- GitHub: https://github.com/rolandodanielguillen-collab/reserflow
- Puerto local: 3002 (ya no se usa, todo va directo a Vercel)
- Login: Google OAuth con rolandodanielguillen@gmail.com
- **IMPORTANTE:** El ambiente de trabajo es producción en Vercel. Para ver cambios hay que hacer git push → Vercel despliega automáticamente.

## Botflow
- Supabase project: `sdotkwinkvicfepngxhw` (viejo, sin cambios)
- Puerto local: 3000

## Tablas ReserFlow (nuevo proyecto)
- `profiles`, `carousels` (45 filas), `content_ideas`, `brand_settings`
- Todas con RLS habilitado
- Trigger auto-create profile on signup
