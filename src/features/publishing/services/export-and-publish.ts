'use server'

import { prismaRls } from '@/lib/prisma-rls'
import { auth } from '@/lib/auth'
import { uploadSlidesToStorage } from './cloudinary-upload'
import { publishToInstagram } from '@/features/scheduler/services/instagram-publish'
import type { SlideOutput } from '@/features/generation/types'

export async function exportAndPublish(carouselId: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'No autenticado' }

  // Obtener carrusel con sus slides y generation_prompt
  const carousel = await prismaRls.carousel.findFirst({
    where: { id: carouselId },
    select: { id: true, title: true, slidesJson: true, slidesCount: true, generationPrompt: true },
  })

  if (!carousel) return { error: 'Carrusel no encontrado' }

  const slides = carousel.slidesJson as SlideOutput[]
  if (!slides?.length) return { error: 'El carrusel no tiene slides' }

  // Marcar como processing
  await prismaRls.carousel.update({
    where: { id: carouselId },
    data: { status: 'publishing' },
  })

  // Renderizar y subir a Cloudinary
  const uploadResult = await uploadSlidesToStorage(carouselId, slides)
  if ('error' in uploadResult) {
    await prismaRls.carousel.update({
      where: { id: carouselId },
      data: { status: 'failed' },
    })
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
