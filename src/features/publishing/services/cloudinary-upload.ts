'use server'

import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
})

async function renderSlide(slide: Record<string, unknown>, index: number, total: number): Promise<Buffer> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null
  const baseUrl = siteUrl ?? vercelUrl ?? 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/slides/render`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...slide, index, total }),
  })
  if (!res.ok) throw new Error(`Error renderizando slide ${index}: ${res.statusText}`)
  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}


export async function uploadSlidesToCloudinary(
  carouselId: string,
  slides: Record<string, unknown>[]
): Promise<{ urls: string[] } | { error: string }> {
  try {
    const urls: string[] = []

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i]
      const buffer = await renderSlide(slide, i, slides.length)


      const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            folder: `reserflow/carousels/${carouselId}`,
            public_id: `slide-${i}`,
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

export async function createVideoSlideshow(
  carouselId: string,
  imageUrls: string[]
): Promise<{ videoUrl: string } | { error: string }> {
  try {
    const publicIds: string[] = []

    for (let i = 0; i < imageUrls.length; i++) {
      const result = await cloudinary.uploader.upload(imageUrls[i]!, {
        folder: `reserflow/videos/${carouselId}`,
        public_id: `slide-${i}`,
        overwrite: true,
        resource_type: 'image',
      })
      publicIds.push(result.public_id)
    }

    const slideDuration = 3000
    const transitionDuration = 800
    const manifest = {
      w: 1080,
      h: 1350,
      du: (publicIds.length * slideDuration + (publicIds.length - 1) * transitionDuration) / 1000,
      vars: {
        sdur: slideDuration,
        tdur: transitionDuration,
        transition_s: 'fade',
        slides: publicIds.map(pid => ({ media: `i:${pid}` })),
      },
    }

    const slideshowResult = await cloudinary.uploader.create_slideshow({
      manifest_json: JSON.stringify(manifest),
      folder: `reserflow/videos/${carouselId}`,
      public_id: 'reel',
      overwrite: true,
      resource_type: 'video',
    } as Record<string, unknown>) as { public_id?: string; batch_id?: string; status?: string; secure_url?: string }

    if (slideshowResult.secure_url) {
      return { videoUrl: slideshowResult.secure_url }
    }

    const publicId = slideshowResult.public_id ?? `reserflow/videos/${carouselId}/reel`
    let attempts = 0
    const maxAttempts = 40

    while (attempts < maxAttempts) {
      await new Promise(r => setTimeout(r, 3000))
      attempts++

      try {
        const resource = await cloudinary.api.resource(publicId, {
          resource_type: 'video',
        }) as { secure_url?: string; status?: string }

        if (resource.secure_url) {
          return { videoUrl: resource.secure_url }
        }
      } catch {
        // Resource not ready yet
      }
    }

    return { error: 'Video slideshow timeout — Cloudinary tardó demasiado' }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return { error: message }
  }
}
