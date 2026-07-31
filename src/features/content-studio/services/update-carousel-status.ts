'use server'

import { prismaRls } from '@/lib/prisma-rls'
import { auth } from '@/lib/auth'
import { publishToInstagram } from '@/features/scheduler/services/instagram-publish'
import { sendApprovalRequest, notifyPublished, notifyPublishFailed } from '@/features/notifications/services/ycloud'
import { renderSlideImages } from '@/features/publishing/services/render-slides'
import { normalizeSlides } from '@/features/content-studio/slide-utils'

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
 * Publica el carrusel COMPLETO ahora: renderiza todos los slides server-side
 * con Remotion (mismo componente que el preview) y publica via Graph API.
 */
export async function publishCarouselNow(carouselId: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'No autenticado' }

  const carousel = await prismaRls.carousel.findFirst({
    where: { id: carouselId },
    select: { title: true, caption: true, slidesJson: true, darkMode: true, slideImageUrls: true },
  })

  if (!carousel) return { error: 'Carrusel no encontrado' }

  let imageUrls: string[] = []

  // Imágenes ya renderizadas (o subidas a mano) → usarlas
  if (carousel.slideImageUrls) {
    try {
      const parsed = JSON.parse(carousel.slideImageUrls) as string[]
      if (Array.isArray(parsed)) imageUrls = parsed
    } catch { /* formato viejo → re-render abajo */ }
  }

  if (imageUrls.length === 0) {
    const slides = normalizeSlides(carousel.slidesJson)
    if (slides.length === 0) {
      return { error: 'Este carrusel no tiene slides para renderizar.' }
    }
    const rendered = await renderSlideImages({
      carouselId,
      userId: session.user.id,
      slides,
      dark: carousel.darkMode,
    })
    if ('error' in rendered) return { error: `Render: ${rendered.error}` }
    imageUrls = rendered.urls
    await prismaRls.carousel.updateMany({
      where: { id: carouselId },
      data: { slideImageUrls: JSON.stringify(imageUrls) },
    })
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
