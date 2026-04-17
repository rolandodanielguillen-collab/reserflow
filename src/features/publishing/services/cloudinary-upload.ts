'use server'

import { v2 as cloudinary } from 'cloudinary'
import type { SlideOutput } from '@/features/generation/types'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
})

async function renderSlide(slide: SlideOutput, total: number): Promise<Buffer> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/slides/render`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...slide, total }),
  })
  if (!res.ok) throw new Error(`Error renderizando slide ${slide.index}: ${res.statusText}`)
  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

export async function uploadSlidesToCloudinary(
  carouselId: string,
  slides: SlideOutput[]
): Promise<{ urls: string[] } | { error: string }> {
  try {
    const urls: string[] = []

    for (const slide of slides) {
      const buffer = await renderSlide(slide, slides.length)

      const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            folder: `reserflow/carousels/${carouselId}`,
            public_id: `slide-${slide.index}`,
            overwrite: true,
            resource_type: 'image',
            format: 'png',
          },
          (error, result) => {
            if (error || !result) reject(error ?? new Error('Upload fallido'))
            else resolve(result as { secure_url: string })
          }
        ).end(buffer)
      })

      urls.push(result.secure_url)
    }

    return { urls }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return { error: message }
  }
}
