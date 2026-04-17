'use server'

import { createClient } from '@/lib/supabase/server'
import { uploadSlidesToCloudinary } from './cloudinary-upload'
import { publishToInstagram } from '@/features/scheduler/services/instagram-publish'
import type { SlideOutput } from '@/features/generation/types'

export async function exportAndPublish(carouselId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Obtener carrusel con sus slides y generation_prompt (caption está en slides_json[last])
  const { data: carousel, error: fetchError } = await supabase
    .from('carousels')
    .select('id, title, slides_json, slides_count, generation_prompt')
    .eq('id', carouselId)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !carousel) return { error: 'Carrusel no encontrado' }

  const slides = carousel.slides_json as SlideOutput[]
  if (!slides?.length) return { error: 'El carrusel no tiene slides' }

  // Marcar como processing
  await supabase.from('carousels').update({ status: 'processing' }).eq('id', carouselId)

  // Renderizar y subir a Cloudinary
  const uploadResult = await uploadSlidesToCloudinary(carouselId, slides)
  if ('error' in uploadResult) {
    await supabase.from('carousels').update({ status: 'failed' }).eq('id', carouselId)
    return { error: `Error subiendo imágenes: ${uploadResult.error}` }
  }

  // Obtener caption del content_idea asociado o usar el título
  const caption = carousel.title

  // Publicar en Instagram
  const publishResult = await publishToInstagram({
    carouselId,
    imageUrls: uploadResult.urls,
    caption,
  })

  return publishResult
}
