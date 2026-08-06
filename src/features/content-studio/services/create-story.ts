'use server'

import { auth } from '@/lib/auth'
import { prismaAdmin } from '@/lib/prisma-admin'

export type StorySource = { id: string; title: string; imageUrl: string; kind: 'flyer' | 'asset' }

const isVideoUrl = (u: string) => /\.(mp4|mov)(\?|$)/i.test(u)

/** Imágenes disponibles para una historia manual: portadas de flyers publicados + biblioteca. */
export async function getStorySources(): Promise<StorySource[]> {
  const session = await auth()
  if (!session?.user?.id) return []
  const userId = session.user.id

  const [flyers, assets] = await Promise.all([
    prismaAdmin.carousel.findMany({
      where: { userId, publishFormat: { in: ['carousel', 'reel'] }, status: 'published', coverImageUrl: { not: null } },
      orderBy: { publishedAt: 'desc' },
      take: 12,
      select: { id: true, title: true, coverImageUrl: true },
    }),
    prismaAdmin.asset.findMany({
      where: { userId, OR: [{ mimeType: { startsWith: 'image/' } }, { mimeType: null }] },
      orderBy: { createdAt: 'desc' },
      take: 24,
      select: { id: true, filename: true, url: true },
    }),
  ])

  return [
    ...flyers
      .filter(f => f.coverImageUrl && !isVideoUrl(f.coverImageUrl))
      .map(f => ({ id: f.id, title: f.title, imageUrl: f.coverImageUrl!, kind: 'flyer' as const })),
    ...assets
      .filter(a => !isVideoUrl(a.url))
      .map(a => ({ id: a.id, title: a.filename, imageUrl: a.url, kind: 'asset' as const })),
  ]
}

/** Crea una historia manual: entra al mismo pipeline del cron que las automáticas. */
export async function createStory(input: {
  imageUrl: string
  scheduledAtIso: string
  title?: string
  parentCarouselId?: string
}): Promise<{ success?: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'No autenticado' }

  const imageUrl = input.imageUrl?.trim()
  if (!imageUrl || !/^https:\/\//.test(imageUrl)) return { error: 'Imagen inválida' }
  if (isVideoUrl(imageUrl)) return { error: 'La historia necesita una imagen, no un video' }

  const scheduledAt = new Date(input.scheduledAtIso)
  if (isNaN(scheduledAt.getTime())) return { error: 'Fecha inválida' }
  if (scheduledAt.getTime() <= Date.now()) return { error: 'La fecha tiene que ser futura' }

  // El vínculo con el flyer padre es opcional (borra en cascada con él)
  let parentId: string | null = null
  if (input.parentCarouselId) {
    const parent = await prismaAdmin.carousel.findFirst({
      where: { id: input.parentCarouselId, userId: session.user.id },
      select: { id: true },
    })
    parentId = parent?.id ?? null
  }

  await prismaAdmin.carousel.create({
    data: {
      userId: session.user.id,
      title: input.title?.trim() || 'Historia',
      publishFormat: 'story',
      status: 'scheduled',
      scheduledAt,
      coverImageUrl: imageUrl,
      slideImageUrls: JSON.stringify([imageUrl]),
      parentCarouselId: parentId,
    },
  })
  return { success: true }
}
