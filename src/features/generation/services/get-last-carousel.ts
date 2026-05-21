'use server'

import { prismaRls } from '@/lib/prisma-rls'
import type { CarouselOutput } from '../types'

export async function getLastCarousel(): Promise<{
  carousel: CarouselOutput
  carouselId: string
  coverImageUrl: string
} | null> {
  const data = await prismaRls.carousel.findFirst({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      slidesJson: true,
      hashtags: true,
      caption: true,
      coverImageUrl: true,
    },
  })

  if (!data) return null

  const hashtags: string[] = data.hashtags
    ? (() => { try { return JSON.parse(data.hashtags) } catch { return [] } })()
    : []

  return {
    carouselId: data.id,
    coverImageUrl: data.coverImageUrl ?? '',
    carousel: {
      title: data.title,
      slides: data.slidesJson as CarouselOutput['slides'],
      hashtags,
      caption: data.caption ?? '',
    },
  }
}
