'use client'

import { createClient } from '@/lib/supabase/client'

/**
 * Captura slides como PNGs moviéndolos al viewport durante la captura.
 * El browser no pinta elementos off-screen, por eso movemos cada slide
 * a posición fixed (0,0) con z-index:-1 (invisible para el usuario)
 * antes de capturar con html2canvas.
 */
export async function captureAndUploadSlides(
  elements: HTMLElement[],
  carouselId: string,
  userId: string,
): Promise<string[]> {
  const html2canvas = (await import('html2canvas')).default
  const supabase = createClient()
  const urls: string[] = []

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i]!
    const W = 1080
    const H = 1350

    // Move into viewport so the browser paints it
    const prev = {
      position: el.style.position,
      left:     el.style.left,
      top:      el.style.top,
      zIndex:   el.style.zIndex,
      width:    el.style.width,
      height:   el.style.height,
    }
    el.style.position = 'fixed'
    el.style.left     = '0px'
    el.style.top      = '0px'
    el.style.zIndex   = '-1'
    el.style.width    = `${W}px`
    el.style.height   = `${H}px`

    // Two rAF frames so the browser has time to paint
    await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())))

    const canvas = await html2canvas(el, {
      scale:           2,
      useCORS:         true,
      allowTaint:      false,
      backgroundColor: null,
      logging:         false,
      width:           W,
      height:          H,
      x:               0,
      y:               0,
      scrollX:         0,
      scrollY:         0,
    })

    // Restore original position
    el.style.position = prev.position
    el.style.left     = prev.left
    el.style.top      = prev.top
    el.style.zIndex   = prev.zIndex
    el.style.width    = prev.width
    el.style.height   = prev.height

    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob falló')), 'image/png', 1.0)
    )

    // Cache-bust the path so CDN sirve la versión nueva
    const path = `${userId}/slides/${carouselId}-slide-${i}-${Date.now()}.png`
    const { error } = await supabase.storage
      .from('brand-assets')
      .upload(path, blob, { contentType: 'image/png', upsert: false })

    if (error) throw new Error(`Error subiendo slide ${i}: ${error.message}`)

    const { data: { publicUrl } } = supabase.storage.from('brand-assets').getPublicUrl(path)
    urls.push(publicUrl)
  }

  return urls
}
