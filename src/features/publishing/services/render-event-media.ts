import path from "path"
import os from "os"
import fs from "fs"
import Ffmpeg from "fluent-ffmpeg"
import ffmpegPath from "ffmpeg-static"
import { renderSlideImages } from "./render-slides"
import { uploadFile } from "@/lib/storage"
import { prismaAdmin } from "@/lib/prisma-admin"
import type { DesignSlide } from "@/features/content-studio/types"

/**
 * Animación de portada (10s): slide 2 se desliza sobre el slide 1 con
 * 3 ciclos coseno — la MISMA curva que EventIntroScene del preview.
 * Se compone con ffmpeg directo desde los 2 PNG ya renderizados:
 * cero Chrome en el server (en este VPS de 4GB el render por browser
 * crasheaba y/o tardaba 25+ min; ffmpeg lo hace en segundos).
 *   x(t) = 1080 - 190*(1 - cos(0.6*π*t))   con t en segundos [0,10]
 */
async function renderIntroVideo(carouselId: string, slide1Url: string, slide2Url: string): Promise<string> {
  const ts = Date.now()
  const p1 = path.join(os.tmpdir(), `intro1-${carouselId}-${ts}.png`)
  const p2 = path.join(os.tmpdir(), `intro2-${carouselId}-${ts}.png`)
  const mp4 = path.join(os.tmpdir(), `intro-${carouselId}-${ts}.mp4`)

  try {
    for (const [url, dest] of [[slide1Url, p1], [slide2Url, p2]] as const) {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`No pude descargar ${url} (${res.status})`)
      fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()))
    }

    console.log(`[event-media] ${carouselId} componiendo intro con ffmpeg...`)
    await new Promise<void>((resolve, reject) => {
      Ffmpeg.setFfmpegPath(ffmpegPath as string)
      Ffmpeg()
        .input(p1).inputOptions(["-loop 1"])
        .input(p2).inputOptions(["-loop 1"])
        .complexFilter("[0:v][1:v]overlay=x='1080-190*(1-cos(0.6*PI*t))':y=0,format=yuv420p")
        .videoCodec("libx264")
        .outputOptions(["-t 10", "-r 30", "-preset fast", "-crf 18", "-movflags +faststart", "-an", "-threads 3"])
        .save(mp4)
        .on("end", () => resolve())
        .on("error", reject)
    })

    const url = await uploadFile(fs.readFileSync(mp4), `slides/${carouselId}`, "intro.mp4")
    console.log(`[event-media] ${carouselId} intro ok`)
    return url
  } finally {
    for (const f of [p1, p2, mp4]) {
      if (fs.existsSync(f)) fs.unlinkSync(f)
    }
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
    const introUrl = await renderIntroVideo(opts.carouselId, stills.urls[0]!, stills.urls[1]!)
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
