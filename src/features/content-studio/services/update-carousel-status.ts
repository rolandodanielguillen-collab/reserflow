'use server'

import { prismaRls } from '@/lib/prisma-rls'
import { auth } from '@/lib/auth'
import { sendApprovalRequest } from '@/features/notifications/services/ycloud'
import { normalizeSlides } from '@/features/content-studio/slide-utils'
import { publishDuePosts } from '@/features/scheduler/services/publish-due'

export async function approveCarousel(carouselId: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'No autenticado' }

  try {
    await prismaRls.carousel.updateMany({
      where: { id: carouselId },
      data: { status: 'approved' },
    })
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error desconocido' }
  }

  return { success: true }
}

export async function rejectCarousel(carouselId: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'No autenticado' }

  try {
    await prismaRls.carousel.updateMany({
      where: { id: carouselId },
      data: { status: 'review' },
    })
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error desconocido' }
  }

  return { success: true }
}

export async function scheduleCarousel(carouselId: string, scheduledAt: Date) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'No autenticado' }

  try {
    await prismaRls.carousel.updateMany({
      where: { id: carouselId },
      data: { scheduledAt, status: 'scheduled' },
    })
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error desconocido' }
  }

  return { success: true }
}

export async function requestWhatsAppApproval(carouselId: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'No autenticado' }

  const [carousel, brand] = await Promise.all([
    prismaRls.carousel.findFirst({
      where: { id: carouselId },
      select: { title: true },
    }),
    prismaRls.brandSettings.findFirst({
      where: {},
      select: { whatsappPhone: true },
    }),
  ])

  if (!carousel) return { error: 'Carrusel no encontrado' }
  if (!brand?.whatsappPhone) return { error: 'Configura tu número de WhatsApp en Ajustes de marca.' }

  try {
    await sendApprovalRequest(carouselId, carousel.title, brand.whatsappPhone, session.user.id)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error enviando mensaje' }
  }
}

/**
 * "Publicar ahora" = ENCOLAR con salida inmediata: marca la pieza para
 * publicación ya y dispara el motor en segundo plano (mismo motor que el
 * cron: render + publicación + reintentos + aviso por Telegram).
 * NO depende de que la página siga abierta, y el claim atómico del motor
 * hace imposible el doble post aunque se cliquee dos veces.
 */
export async function publishCarouselNow(carouselId: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'No autenticado' }

  const carousel = await prismaRls.carousel.findFirst({
    where: { id: carouselId },
    select: { status: true, slidesJson: true, slideImageUrls: true },
  })
  if (!carousel) return { error: 'Carrusel no encontrado' }

  if (carousel.status === 'published') return { error: 'Esta pieza ya está publicada en Instagram.' }
  if (carousel.status === 'publishing') return { error: 'Ya se está publicando — te llega la confirmación por Telegram.' }

  const hasImages = !!carousel.slideImageUrls && carousel.slideImageUrls !== '[]'
  const hasSlides = normalizeSlides(carousel.slidesJson).length > 0
  if (!hasImages && !hasSlides) return { error: 'Este carrusel no tiene slides ni imágenes para publicar.' }

  await prismaRls.carousel.updateMany({
    where: { id: carouselId },
    data: { status: 'scheduled', scheduledAt: new Date(), failReason: null, retryCount: 0 },
  })

  // Fire-and-forget: el proceso del servidor sigue aunque el browser se cierre
  publishDuePosts().catch(err => console.error('[publicar-ahora] motor falló:', err))

  return { success: true, queued: true }
}
