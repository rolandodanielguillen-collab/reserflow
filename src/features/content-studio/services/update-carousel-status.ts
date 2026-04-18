'use server'

import { createClient } from '@/lib/supabase/server'
import { publishToInstagram } from '@/features/scheduler/services/instagram-publish'
import { sendApprovalRequest, notifyPublished, notifyPublishFailed } from '@/features/notifications/services/ycloud'
import { renderCarouselCover } from '@/features/generation/services/render-slide'

export async function approveCarousel(carouselId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase
    .from('carousels')
    .update({ status: 'approved' })
    .eq('id', carouselId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  return { success: true }
}

export async function rejectCarousel(carouselId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase
    .from('carousels')
    .update({ status: 'review' })
    .eq('id', carouselId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  return { success: true }
}

export async function scheduleCarousel(carouselId: string, scheduledAt: Date) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase
    .from('carousels')
    .update({ scheduled_at: scheduledAt.toISOString(), status: 'scheduled' })
    .eq('id', carouselId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  return { success: true }
}

export async function requestWhatsAppApproval(carouselId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const [carouselResult, brandResult] = await Promise.all([
    supabase.from('carousels').select('title').eq('id', carouselId).eq('user_id', user.id).maybeSingle(),
    supabase.from('brand_settings').select('whatsapp_phone').eq('user_id', user.id).maybeSingle(),
  ])

  if (!carouselResult.data) return { error: 'Carrusel no encontrado' }
  if (!brandResult.data?.whatsapp_phone) return { error: 'Configura tu número de WhatsApp en Ajustes de marca.' }

  try {
    await sendApprovalRequest(carouselId, carouselResult.data.title as string, brandResult.data.whatsapp_phone, user.id)
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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  if (!imageUrls.length) return { error: 'Sin imágenes para publicar' }

  const { data: carousel } = await supabase
    .from('carousels')
    .select('title, caption')
    .eq('id', carouselId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!carousel) return { error: 'Carrusel no encontrado' }

  const result = await publishToInstagram({
    carouselId,
    imageUrls,
    caption: (carousel.caption as string) ?? (carousel.title as string),
  })

  const { data: brand } = await supabase
    .from('brand_settings')
    .select('whatsapp_phone')
    .eq('user_id', user.id)
    .maybeSingle()

  const phone = brand?.whatsapp_phone as string | undefined
  if (phone) {
    if ('error' in result && result.error) {
      await notifyPublishFailed(carousel.title as string, result.error, phone).catch(() => {})
    } else if ('permalink' in result && result.permalink) {
      await notifyPublished(carousel.title as string, result.permalink, phone).catch(() => {})
    }
  }

  return result
}

export async function publishCarouselNow(carouselId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: carousel } = await supabase
    .from('carousels')
    .select('title, caption, cover_image_url, slides_json')
    .eq('id', carouselId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!carousel) return { error: 'Carrusel no encontrado' }

  const imageUrls: string[] = []
  if (carousel.cover_image_url) {
    imageUrls.push(carousel.cover_image_url as string)
  }

  // No cover image → render first slide server-side
  if (imageUrls.length === 0 && carousel.slides_json) {
    const rendered = await renderCarouselCover(
      carouselId,
      user.id,
      carousel.title as string,
      carousel.slides_json
    )
    if (rendered) imageUrls.push(rendered)
  }

  if (imageUrls.length === 0) {
    return { error: 'No se pudo generar la imagen. Verifica que el bucket brand-assets existe en Supabase Storage.' }
  }

  const result = await publishToInstagram({
    carouselId,
    imageUrls,
    caption: (carousel.caption as string) ?? (carousel.title as string),
  })

  // Best-effort WhatsApp notification
  const { data: brand } = await supabase
    .from('brand_settings')
    .select('whatsapp_phone')
    .eq('user_id', user.id)
    .maybeSingle()

  const phone = brand?.whatsapp_phone as string | undefined
  if (phone) {
    if ('error' in result && result.error) {
      await notifyPublishFailed(carousel.title as string, result.error, phone).catch(() => {})
    } else if ('permalink' in result && result.permalink) {
      await notifyPublished(carousel.title as string, result.permalink, phone).catch(() => {})
    }
  }

  return result
}
