'use server'

import { prismaRls } from '@/lib/prisma-rls'
import { auth } from '@/lib/auth'
import { publishToInstagram } from '@/features/scheduler/services/instagram-publish'
import { sendApprovalRequest, notifyPublished, notifyPublishFailed } from '@/features/notifications/services/ycloud'
import { renderCarouselCover } from '@/features/generation/services/render-slide'

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
 * Publica con URLs de imágenes capturadas desde el cliente (html2canvas).
 * Llamado desde el Modal después de capturar los slides reales.
 */
export async function publishCarouselWithImages(carouselId: string, imageUrls: string[]) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'No autenticado' }

  if (!imageUrls.length) return { error: 'Sin imágenes para publicar' }

  const carousel = await prismaRls.carousel.findFirst({
    where: { id: carouselId },
    select: { title: true, caption: true },
  })

  if (!carousel) return { error: 'Carrusel no encontrado' }

  const result = await publishToInstagram({
    carouselId,
    imageUrls,
    caption: carousel.caption ?? carousel.title,
  })

  const brand = await prismaRls.brandSettings.findFirst({
    where: {},
    select: { whatsappPhone: true },
  })

  const phone = brand?.whatsappPhone as string | undefined
  if (phone) {
    if ('error' in result && result.error) {
      await notifyPublishFailed(carousel.title, result.error, phone).catch(() => {})
    } else if ('permalink' in result && result.permalink) {
      await notifyPublished(carousel.title, result.permalink, phone).catch(() => {})
    }
  }

  return result
}

export async function publishCarouselNow(carouselId: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'No autenticado' }

  const carousel = await prismaRls.carousel.findFirst({
    where: { id: carouselId },
    select: { title: true, caption: true, coverImageUrl: true, slidesJson: true },
  })

  if (!carousel) return { error: 'Carrusel no encontrado' }

  const imageUrls: string[] = []
  if (carousel.coverImageUrl) {
    imageUrls.push(carousel.coverImageUrl)
  }

  // No cover image → render first slide server-side
  if (imageUrls.length === 0 && carousel.slidesJson) {
    const rendered = await renderCarouselCover(
      carouselId,
      session.user.id,
      carousel.title,
      carousel.slidesJson
    )
    if (rendered) imageUrls.push(rendered)
  }

  if (imageUrls.length === 0) {
    return { error: 'No se pudo generar la imagen. Verifica la configuración de almacenamiento.' }
  }

  const result = await publishToInstagram({
    carouselId,
    imageUrls,
    caption: carousel.caption ?? carousel.title,
  })

  // Best-effort WhatsApp notification
  const brand = await prismaRls.brandSettings.findFirst({
    where: {},
    select: { whatsappPhone: true },
  })

  const phone = brand?.whatsappPhone as string | undefined
  if (phone) {
    if ('error' in result && result.error) {
      await notifyPublishFailed(carousel.title, result.error, phone).catch(() => {})
    } else if ('permalink' in result && result.permalink) {
      await notifyPublished(carousel.title, result.permalink, phone).catch(() => {})
    }
  }

  return result
}
