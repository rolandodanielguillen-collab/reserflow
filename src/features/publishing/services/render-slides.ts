import path from "path"
import os from "os"
import fs from "fs"
import { renderStill, selectComposition } from "@remotion/renderer"
import { getRemotionBundle } from "./remotion-bundle"
import { uploadFile } from "@/lib/storage"
import type { DesignSlide } from "@/features/content-studio/types"

/**
 * Renderiza los slides como PNG 1080x1350 usando la MISMA composición React
 * que muestra el preview (SlideCanvas via Remotion Still). Un solo motor de
 * render: lo aprobado es exactamente lo publicado.
 */
export async function renderSlideImages(opts: {
  carouselId: string
  userId: string
  slides: DesignSlide[]
  dark: boolean
}): Promise<{ urls: string[] } | { error: string }> {
  if (opts.slides.length === 0) return { error: "Sin slides para renderizar" }

  try {
    const serveUrl = await getRemotionBundle()
    const urls: string[] = []

    for (let i = 0; i < opts.slides.length; i++) {
      const inputProps = {
        slide: opts.slides[i] as unknown as Record<string, unknown>,
        dark: opts.dark,
        index: i,
        total: opts.slides.length,
      }
      const composition = await selectComposition({ serveUrl, id: "SlideStill", inputProps })
      const out = path.join(os.tmpdir(), `slide-${opts.carouselId}-${i}-${Date.now()}.png`)

      await renderStill({
        composition,
        serveUrl,
        output: out,
        inputProps,
        chromiumOptions: { disableWebSecurity: true, gl: "swangle", headless: true },
      })

      const buffer = fs.readFileSync(out)
      fs.unlinkSync(out)
      urls.push(await uploadFile(buffer, `slides/${opts.carouselId}`, `slide-${i}.png`))
      console.log(`[render-slides] ${opts.carouselId} slide ${i + 1}/${opts.slides.length} ok`)
    }

    return { urls }
  } catch (err) {
    console.error("[render-slides] ERROR:", err)
    return { error: err instanceof Error ? err.message : String(err) }
  }
}
