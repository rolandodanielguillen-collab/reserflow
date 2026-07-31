import path from "path"
import os from "os"
import fs from "fs"
import { renderMedia, selectComposition } from "@remotion/renderer"
import Ffmpeg from "fluent-ffmpeg"
import ffmpegPath from "ffmpeg-static"
import { uploadFile } from "@/lib/storage"
import { getRemotionBundle } from "./remotion-bundle"

function convertWebmToMp4(webmPath: string, mp4Path: string): Promise<void> {
  return new Promise((resolve, reject) => {
    Ffmpeg.setFfmpegPath(ffmpegPath as string)
    Ffmpeg(webmPath)
      .videoCodec("libx264")
      .audioCodec("aac")
      .outputOptions(["-pix_fmt yuv420p", "-movflags +faststart", "-preset fast", "-crf 18"])
      .save(mp4Path)
      .on("end", () => resolve())
      .on("error", (err) => reject(err))
  })
}

export async function renderReelToFile(opts: {
  scriptId: string
  dark: boolean
  cta: string
  carouselId: string
  userId: string
}): Promise<{ url: string } | { error: string }> {
  const ts = Date.now()
  const webmPath = path.join(os.tmpdir(), `reel-${opts.carouselId}-${ts}.webm`)
  const mp4Path = path.join(os.tmpdir(), `reel-${opts.carouselId}-${ts}.mp4`)

  try {
    console.log("[render-reel] bundling...")
    const serveUrl = await getRemotionBundle()

    const inputProps = { scriptId: opts.scriptId, dark: opts.dark, cta: opts.cta }
    const composition = await selectComposition({
      serveUrl,
      id: "VideoScene",
      inputProps,
    })

    console.log("[render-reel] renderMedia vp8...")
    await renderMedia({
      composition,
      serveUrl,
      codec: "vp8",
      outputLocation: webmPath,
      inputProps,
      concurrency: 2,
      chromiumOptions: {
        disableWebSecurity: true,
        gl: "swangle",
        headless: true,
      },
      onProgress: ({ progress }) => {
        if (Math.round(progress * 100) % 20 === 0)
          console.log(`[render-reel] progress: ${Math.round(progress * 100)}%`)
      },
    })

    console.log("[render-reel] converting to mp4...")
    await convertWebmToMp4(webmPath, mp4Path)

    const buffer = fs.readFileSync(mp4Path)
    const url = await uploadFile(
      buffer,
      `videos/${opts.userId}`,
      `${opts.carouselId}-${ts}.mp4`
    )

    console.log("[render-reel] done:", url)
    return { url }
  } catch (err) {
    console.error("[render-reel] ERROR:", err)
    const msg = err instanceof Error ? err.message : String(err)
    return { error: msg }
  } finally {
    if (fs.existsSync(webmPath)) fs.unlinkSync(webmPath)
    if (fs.existsSync(mp4Path)) fs.unlinkSync(mp4Path)
  }
}
