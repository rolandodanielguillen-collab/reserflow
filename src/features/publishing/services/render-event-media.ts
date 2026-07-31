import path from "path"
import os from "os"
import fs from "fs"
import { renderMedia, selectComposition } from "@remotion/renderer"
import Ffmpeg from "fluent-ffmpeg"
import ffmpegPath from "ffmpeg-static"
import { getRemotionBundle } from "./remotion-bundle"
import { renderSlideImages } from "./render-slides"
import { uploadFile } from "@/lib/storage"
import { prismaAdmin } from "@/lib/prisma-admin"
import type { DesignSlide } from "@/features/content-studio/types"

function webmToMp4(webm: string, mp4: string): Promise<void> {
  return new Promise((resolve, reject) => {
    Ffmpeg.setFfmpegPath(ffmpegPath as string)
    Ffmpeg(webm)
      .videoCodec("libx264")
      .outputOptions(["-pix_fmt yuv420p", "-movflags +faststart", "-preset fast", "-crf 18", "-an"])
      .save(mp4)
      .on("end", () => resolve())
      .on("error", reject)
  })
}

/** Renderiza la animación de portada (slide1 + slide2, 10s) → mp4. */
async function renderIntroVideo(carouselId: string, slide1: DesignSlide, slide2: DesignSlide): Promise<string> {
  const serveUrl = await getRemotionBundle()
  const ts = Date.now()
  const webm = path.join(os.tmpdir(), `intro-${carouselId}-${ts}.webm`)
  const mp4 = path.join(os.tmpdir(), `intro-${carouselId}-${ts}.mp4`)

  try {
    const inputProps = {
      slide1: slide1 as unknown as Record<string, unknown>,
      slide2: slide2 as unknown as Record<string, unknown>,
    }
    const composition = await selectComposition({ serveUrl, id: "EventIntro", inputProps })
    console.log(`[event-media] ${carouselId} renderizando intro animada (10s)...`)
    let lastLogged = -1
    await renderMedia({
      composition,
      serveUrl,
      codec: "vp8",
      outputLocation: webm,
      inputProps,
      // ponytail: 2 workers — el VPS (6 cores) comparte con todos los sitios;
      // más concurrencia lo ahoga (load 30+) y tarda MÁS por swap
      concurrency: 2,
      chromiumOptions: { disableWebSecurity: true, gl: "swangle", headless: true },
      onProgress: ({ progress }) => {
        const pct = Math.floor(progress * 10) * 10
        if (pct > lastLogged) {
          lastLogged = pct
          console.log(`[event-media] ${carouselId} intro ${pct}%`)
        }
      },
    })
    await webmToMp4(webm, mp4)
    const url = await uploadFile(fs.readFileSync(mp4), `slides/${carouselId}`, "intro.mp4")
    console.log(`[event-media] ${carouselId} intro ok`)
    return url
  } finally {
    if (fs.existsSync(webm)) fs.unlinkSync(webm)
    if (fs.existsSync(mp4)) fs.unlinkSync(mp4)
  }
}

/**
 * Media completa del carrusel. Para flyers de evento:
 *   [intro animada 10s (mp4), slide2.png, slide3.png, video de cierre de marca]
 * Para el resto: stills de todos los slides.
 * Si la animación falla, cae al slide 1 estático (nunca bloquea la publicación).
 */
export async function renderCarouselMedia(opts: {
  carouselId: string
  userId: string
  slides: DesignSlide[]
  dark: boolean
}): Promise<{ urls: string[] } | { error: string }> {
  const isEvent = opts.slides[0]?.kind === "event"

  const stills = await renderSlideImages(opts)
  if ("error" in stills) return stills
  if (!isEvent || opts.slides.length < 2) return stills

  const urls = [...stills.urls]

  // Portada animada en lugar del still del slide 1
  try {
    const introUrl = await renderIntroVideo(opts.carouselId, opts.slides[0]!, opts.slides[1]!)
    urls[0] = introUrl
  } catch (err) {
    console.error("[event-media] intro falló, uso slide estático:", err)
  }

  // Video de cierre de marca (pack final)
  const brand = await prismaAdmin.brandSettings.findFirst({
    where: { userId: opts.userId },
    select: { closingVideoUrl: true },
  })
  if (brand?.closingVideoUrl) urls.push(brand.closingVideoUrl)

  return { urls: urls.slice(0, 10) }
}
