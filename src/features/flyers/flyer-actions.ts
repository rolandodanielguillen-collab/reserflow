'use server'

import { auth } from '@/lib/auth'
import { prismaAdmin } from '@/lib/prisma-admin'
import { Prisma } from '@/generated/prisma/client'
import { normalizeSlides } from '@/features/content-studio/slide-utils'
import type { DesignSlide } from '@/features/content-studio/types'
import type { ExtractedFlyer } from '@/features/ingest/flyer-ingest'

export type FlyerPiece = {
  id: string
  title: string
  status: string
  caption: string | null
  scheduledAt: string | null
  permalink: string | null
  slides: DesignSlide[]
  bgUrl: string | null
  paletteId: string | null
  sourceFlyerUrl: string | null
  createdAt: string
}

export type FlyerData = {
  pieces: FlyerPiece[]
  closingVideoUrl: string | null
}

/** Flyers de evento del tenant (piezas con datos extraídos por IA). */
export async function getFlyerPieces(): Promise<FlyerData> {
  const session = await auth()
  if (!session?.user?.id) return { pieces: [], closingVideoUrl: null }

  const [rows, brand] = await Promise.all([
    prismaAdmin.carousel.findMany({
      where: { userId: session.user.id, NOT: { extractedJson: { equals: Prisma.AnyNull } } },
      orderBy: { createdAt: 'desc' },
      take: 60,
    }),
    prismaAdmin.brandSettings.findFirst({
      where: { userId: session.user.id },
      select: { closingVideoUrl: true },
    }),
  ])

  const pieces = rows.map(r => {
    const slides = normalizeSlides(r.slidesJson)
    const first = slides[0]
    const extracted = (r.extractedJson ?? {}) as ExtractedFlyer
    return {
      id: r.id,
      title: r.title,
      status: r.status,
      caption: r.caption,
      scheduledAt: r.scheduledAt?.toISOString() ?? null,
      permalink: r.instagramPermalink,
      slides,
      bgUrl: first?.kind === 'event' ? (first.data.playerImageUrl ?? null) : null,
      paletteId: extracted.palette_id ?? null,
      sourceFlyerUrl: r.sourceFlyerUrl,
      createdAt: r.createdAt.toISOString(),
    }
  })

  return { pieces, closingVideoUrl: brand?.closingVideoUrl ?? null }
}
