import sharp from 'sharp'
import { prismaAdmin } from '@/lib/prisma-admin'
import { Prisma } from '@/generated/prisma/client'
import { uploadFile } from '@/lib/storage'
import { notifyOperator } from '@/features/telegram/notify'
import type { ExtractedFlyer } from '@/features/ingest/flyer-ingest'

// Regla acordada 2026-08-06: por cada flyer publicado con fecha de evento,
// 2 historias de recordatorio, 4 y 2 días antes del torneo, a las 10:00 de
// Paraguay. Al pasar la fecha no se genera nada más: el siguiente torneo
// agendado trae sus propias historias.
const STORY_OFFSETS_DAYS = [4, 2]
const STORY_HOUR_UTC = 13 // 10:00 America/Asuncion (UTC-3, sin DST)
const LOOKBACK_DAYS = 60 // no escanear piezas publicadas hace más de esto

/** Acepta "YYYY-MM-DD" (formato del editor) y "dd/mm[/yyyy]" (extracción IA). */
export function parseEventDate(raw: string | null | undefined): Date | null {
  if (!raw) return null
  let m = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
  m = raw.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/)
  if (m) {
    const yearRaw = m[3] ? Number(m[3]) : new Date().getUTCFullYear()
    const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw
    return new Date(Date.UTC(year, Number(m[2]) - 1, Number(m[1])))
  }
  return null
}

function parseImageUrls(raw: string | null): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as string[]) : []
  } catch {
    return raw.split(',').map(u => u.trim()).filter(Boolean)
  }
}

// El slide 1 de un carrusel publicado suele ser el VIDEO de intro (mp4):
// la historia necesita la primera imagen real.
const isVideoUrl = (u: string) => /\.(mp4|mov)(\?|$)/i.test(u)

export function firstImageUrl(coverImageUrl: string | null, slideImageUrls: string | null): string | undefined {
  return [coverImageUrl, ...parseImageUrls(slideImageUrls)]
    .filter((u): u is string => !!u)
    .find(u => !isVideoUrl(u))
}

const STORY_BADGE_TEXT = 'INSCRIBITE EN LA APP'

/**
 * Arma la imagen de la historia en 9:16 real (1080×1920): lienzo navy con el
 * flyer centrado y el badge "INSCRIBITE EN LA APP" en la banda libre de abajo
 * (no tapa nada del flyer). sharp + SVG, cero Chrome en el server.
 */
async function badgeStoryImage(parentId: string, imageUrl: string): Promise<string> {
  const res = await fetch(imageUrl)
  if (!res.ok) throw new Error(`No pude descargar ${imageUrl} (${res.status})`)
  const flyer = Buffer.from(await res.arrayBuffer())
  const meta = await sharp(flyer).metadata()
  const W = meta.width ?? 1080
  const H = meta.height ?? 1350

  const CH = Math.round((W * 16) / 9)         // lienzo 9:16 (1920 para 1080)
  if (H >= CH - 120) throw new Error('flyer sin banda libre para el badge')
  const flyerY = Math.round((CH - H) * 0.42)  // flyer apenas arriba del centro

  const pw = Math.round(W * 0.64)             // píldora
  const ph = Math.round(W * 0.09)
  const px = Math.round((W - pw) / 2)
  const bandTop = flyerY + H
  const py = Math.round(bandTop + (CH - bandTop - ph) / 2)
  const fontSize = Math.round(ph * 0.4)
  const textY = Math.round(py + ph / 2 + fontSize * 0.35)

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${CH}">
  <rect x="${px + 4}" y="${py + 6}" width="${pw}" height="${ph}" rx="${Math.round(ph / 2)}" fill="#000000" fill-opacity="0.35"/>
  <rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="${Math.round(ph / 2)}" fill="#FFFFFF"/>
  <text x="${W / 2}" y="${textY}" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-weight="bold" font-size="${fontSize}" letter-spacing="2" fill="#0F1E3D">${STORY_BADGE_TEXT}</text>
</svg>`

  const out = await sharp({
    create: { width: W, height: CH, channels: 4, background: '#0F1E3D' },
  })
    .composite([
      { input: flyer, top: flyerY, left: 0 },
      { input: Buffer.from(svg), top: 0, left: 0 },
    ])
    .png()
    .toBuffer()
  return uploadFile(out, `slides/${parentId}`, 'story-badge.png')
}

/**
 * Genera las historias pendientes para todo flyer ya publicado cuyo torneo
 * aún no ocurrió y que no tenga historias creadas. Idempotente: corre en cada
 * ciclo del cron; la publicación real la hace publish-due como cualquier pieza.
 */
export async function ensureStoriesForUpcomingEvents(): Promise<void> {
  const now = new Date()
  const lookback = new Date(now.getTime() - LOOKBACK_DAYS * 86_400_000)

  const candidates = await prismaAdmin.carousel.findMany({
    where: {
      status: 'published',
      publishFormat: { in: ['carousel', 'reel'] },
      publishedAt: { gte: lookback },
      NOT: { extractedJson: { equals: Prisma.AnyNull } },
      stories: { none: {} },
    },
    select: {
      id: true, userId: true, title: true, darkMode: true,
      extractedJson: true, coverImageUrl: true, slideImageUrls: true,
    },
  })

  for (const piece of candidates) {
    const extracted = (piece.extractedJson ?? {}) as ExtractedFlyer
    const eventDate = parseEventDate(extracted.overrides?.startDate ?? extracted.start_date)
    if (!eventDate || eventDate.getTime() <= now.getTime()) continue

    const imageUrl = firstImageUrl(piece.coverImageUrl, piece.slideImageUrls)
    if (!imageUrl) continue

    const slots = STORY_OFFSETS_DAYS
      .map(days => new Date(eventDate.getTime() - days * 86_400_000 + STORY_HOUR_UTC * 3_600_000))
      .filter(d => d.getTime() > now.getTime())
    if (slots.length === 0) continue

    // Badge "INSCRIBITE EN LA APP" — si falla, la historia sale con el flyer plano
    let storyImage = imageUrl
    try {
      storyImage = await badgeStoryImage(piece.id, imageUrl)
    } catch (err) {
      console.error('[story-schedule] badge falló, uso flyer plano:', err)
    }

    await prismaAdmin.carousel.createMany({
      data: slots.map(scheduledAt => ({
        userId: piece.userId,
        title: `Historia · ${piece.title}`,
        publishFormat: 'story',
        status: 'scheduled',
        scheduledAt,
        coverImageUrl: storyImage,
        slideImageUrls: JSON.stringify([storyImage]),
        parentCarouselId: piece.id,
        darkMode: piece.darkMode,
      })),
    })

    const fmt = (d: Date) =>
      d.toLocaleString('es-PY', { weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Asuncion' })
    console.log('[story-schedule]', piece.title, '→', slots.length, 'historias:', slots.map(fmt).join(', '))
    await notifyOperator(
      piece.userId,
      `📅 Programé ${slots.length === 1 ? '1 historia' : `${slots.length} historias`} para <b>${piece.title}</b>:\n${slots.map(fmt).join('\n')}`,
    ).catch(() => {})
  }
}
