'use server'

import { uploadFile } from '@/lib/storage'

async function renderSlide(slide: Record<string, unknown>, index: number, total: number, dark: boolean): Promise<Buffer> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/slides/render`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...slide, index, total, dark }),
  })
  if (!res.ok) throw new Error(`Error renderizando slide ${index}: ${res.statusText}`)
  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

export async function uploadSlidesToStorage(
  carouselId: string,
  slides: Record<string, unknown>[],
  dark: boolean = true
): Promise<{ urls: string[] } | { error: string }> {
  try {
    const urls: string[] = []

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i]
      const buffer = await renderSlide(slide, i, slides.length, dark)
      const url = await uploadFile(buffer, `carousels/${carouselId}`, `slide-${i}.png`)
      urls.push(url)
    }

    return { urls }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return { error: message }
  }
}
