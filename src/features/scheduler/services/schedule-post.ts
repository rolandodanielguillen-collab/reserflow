'use server'

import { prismaRls } from '@/lib/prisma-rls'
import { prismaAdmin } from '@/lib/prisma-admin'
import { auth } from '@/lib/auth'

export async function schedulePost(carouselId: string, scheduledAt: Date) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'No autenticado' }

  const updated = await prismaAdmin.carousel.updateMany({
    where: { id: carouselId, userId: session.user.id },
    data: { scheduledAt, status: 'scheduled' },
  })

  if (updated.count === 0) return { error: `Carrusel no encontrado (id: ${carouselId}, user: ${session.user.id})` }
  return { success: true }
}

export async function getScheduledCarousels() {
  const session = await auth()
  if (!session?.user?.id) return { error: 'No autenticado', data: [] }

  const data = await prismaRls.carousel.findMany({
    where: {
      status: { in: ['scheduled', 'published', 'failed'] },
    },
    select: {
      id: true,
      title: true,
      status: true,
      scheduledAt: true,
      publishedAt: true,
      instagramPermalink: true,
    },
    orderBy: { scheduledAt: 'asc' },
  })

  return { data }
}

export async function cancelScheduledPost(carouselId: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'No autenticado' }

  await prismaRls.carousel.update({
    where: { id: carouselId },
    data: { scheduledAt: null, status: 'review' },
  })

  return { success: true }
}
