import { prismaAdmin } from '@/lib/prisma-admin'
import { Prisma } from '@/generated/prisma/client'
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

    await prismaAdmin.carousel.createMany({
      data: slots.map(scheduledAt => ({
        userId: piece.userId,
        title: `Historia · ${piece.title}`,
        publishFormat: 'story',
        status: 'scheduled',
        scheduledAt,
        coverImageUrl: imageUrl,
        slideImageUrls: JSON.stringify([imageUrl]),
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
