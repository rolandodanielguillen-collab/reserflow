'use server'

import { prismaRls } from '@/lib/prisma-rls'
import { auth } from '@/lib/auth'

export type CarouselRow = {
  id: string
  title: string
  status: string
  slides_json: unknown
  cover_image_url: string | null
  scheduled_at: string | null
  published_at: string | null
  instagram_permalink: string | null
  caption: string | null
  hashtags: string[] | null
  created_at: string
  template_piece_id: number | null
  dark_mode: boolean
  slide_image_urls: string[]
}

function toRow(c: Record<string, unknown>): CarouselRow {
  return {
    id: c.id as string,
    title: c.title as string,
    status: c.status as string,
    slides_json: c.slidesJson ?? null,
    cover_image_url: (c.coverImageUrl as string) ?? null,
    scheduled_at: c.scheduledAt ? (c.scheduledAt as Date).toISOString() : null,
    published_at: c.publishedAt ? (c.publishedAt as Date).toISOString() : null,
    instagram_permalink: (c.instagramPermalink as string) ?? null,
    caption: (c.caption as string) ?? null,
    hashtags: c.hashtags ? (c.hashtags as string).split(',').map(h => h.trim()) : null,
    created_at: (c.createdAt as Date).toISOString(),
    template_piece_id: (c.templatePieceId as number) ?? null,
    dark_mode: (c.darkMode as boolean) ?? true,
    slide_image_urls: parseImageUrls(c.slideImageUrls as string | null),
  }
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

export async function getCarousels(): Promise<CarouselRow[]> {
  const session = await auth()
  if (!session?.user?.id) return []

  const carousels = await prismaRls.carousel.findMany({
    orderBy: { createdAt: 'desc' },
  })

  return carousels.map(c => toRow(c as unknown as Record<string, unknown>))
}

export async function getCarouselById(id: string): Promise<CarouselRow | null> {
  const session = await auth()
  if (!session?.user?.id) return null

  const carousel = await prismaRls.carousel.findFirst({
    where: { id },
  })

  if (!carousel) return null
  return toRow(carousel as unknown as Record<string, unknown>)
}
