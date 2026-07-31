'use server'

// Panel de diseño para piezas de evento (equivalente al panel de padelpost):
// paleta predefinida o personalizada, fondo desde la biblioteca, caption.

import { auth } from '@/lib/auth'
import { prismaAdmin } from '@/lib/prisma-admin'
import { buildEventSlides, type ExtractedFlyer } from '@/features/ingest/flyer-ingest'
import type { PaletteTokens } from '@/features/content-studio/types'

export type EventDesignInput = {
  paletteId?: string | null       // id de paleta predefinida (null = volver a automática)
  customPalette?: PaletteTokens | null
  playerImageUrl?: string | null  // url de la biblioteca; null = sin fondo; undefined = mantener
  caption?: string
}

export async function updateEventDesign(
  carouselId: string,
  input: EventDesignInput,
): Promise<{ success?: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'No autenticado' }

  const carousel = await prismaAdmin.carousel.findFirst({
    where: { id: carouselId, userId: session.user.id },
    select: { id: true, userId: true, extractedJson: true, slidesJson: true },
  })
  if (!carousel) return { error: 'Pieza no encontrada' }
  if (!carousel.extractedJson) return { error: 'Esta pieza no es un flyer de evento' }

  const extracted = { ...(carousel.extractedJson as ExtractedFlyer) }

  if (input.customPalette) {
    extracted.custom_palette = input.customPalette
    extracted.palette_id = null
  } else if (input.paletteId !== undefined) {
    extracted.palette_id = input.paletteId
    extracted.custom_palette = null
  }

  // Fondo: mantener el actual salvo elección explícita
  let playerImageUrl: string | undefined
  if (input.playerImageUrl === undefined) {
    const first = Array.isArray(carousel.slidesJson)
      ? (carousel.slidesJson as Array<{ data?: { playerImageUrl?: string } }>)[0]
      : null
    playerImageUrl = first?.data?.playerImageUrl
  } else {
    playerImageUrl = input.playerImageUrl ?? undefined
  }

  const brand = await prismaAdmin.brandSettings.findFirst({
    where: { userId: carousel.userId },
    select: { brandName: true, logoUrl: true },
  })
  const igHandle = brand?.brandName ? `@${brand.brandName.toLowerCase().replace(/[^a-z0-9_.]/g, '')}` : undefined

  const slides = buildEventSlides(extracted, {
    brandName: brand?.brandName,
    logoUrl: brand?.logoUrl,
    igHandle,
  }, { playerImageUrl })

  await prismaAdmin.carousel.update({
    where: { id: carousel.id },
    data: {
      extractedJson: extracted as object,
      slidesJson: slides as unknown as object,
      // invalidar el render cacheado: se re-renderiza al publicar/aprobar
      slideImageUrls: null,
      ...(input.caption !== undefined ? { caption: input.caption } : {}),
    },
  })

  return { success: true }
}

/** Imágenes de la biblioteca para el selector de fondo. */
export async function listLibraryImagesForPicker(): Promise<Array<{ id: string; url: string; tags: string[] }>> {
  const session = await auth()
  if (!session?.user?.id) return []
  const assets = await prismaAdmin.asset.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: { id: true, url: true, tags: true },
  })
  return assets.map(a => ({
    id: a.id,
    url: a.url,
    tags: Array.isArray(a.tags) ? (a.tags as string[]) : [],
  }))
}
