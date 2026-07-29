---
name: Server-side render supports all 15 slide types
description: Render route rewritten to handle all DesignSlide kinds with RESER+ branding at 1080x1350. Schedule flow blocks without captured images.
type: project
originSessionId: 5bd33335-4e42-4e0e-82b5-5ecaccd84598
---
On 2026-05-03, carousel ce62d4a0 published wrong content to Instagram because:
1. `slide_image_urls` was empty at publish time (capture happened AFTER publish)
2. Server-side fallback renderer only supported 3 types (cover, content, cta)
3. Slides with `beforeAfter` and `quote` kinds rendered as blank generic slides

**Why:** The old render route (`/api/slides/render`) used a different design system (generic navy/teal 1080x1080) vs the client SlideCanvas (RESER+ branded 1080x1350). 13 of 15 slide types had no server-side renderer.

**How to apply:**
- `/api/slides/render` now supports all 15 DesignSlide kinds with RESER+ branding (navy/mint/cream) at 1080x1350
- ContentStudio.tsx blocks scheduling if slide capture returns 0 URLs
- Cron uses pre-captured URLs first, falls back to server render via Cloudinary
- ~32 scheduled carousels without URLs will use the new server renderer as fallback
- cloudinary-upload.ts accepts `Record<string, unknown>[]` instead of old `SlideOutput[]`
