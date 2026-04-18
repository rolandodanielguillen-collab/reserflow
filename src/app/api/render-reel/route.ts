import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import os from 'os'
import fs from 'fs'
import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition } from '@remotion/renderer'
import Ffmpeg from 'fluent-ffmpeg'
import ffmpegPath from 'ffmpeg-static'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 300

function convertWebmToMp4(webmPath: string, mp4Path: string): Promise<void> {
  return new Promise((resolve, reject) => {
    Ffmpeg.setFfmpegPath(ffmpegPath as string)
    Ffmpeg(webmPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions(['-pix_fmt yuv420p', '-movflags +faststart', '-preset fast', '-crf 18'])
      .save(mp4Path)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
  })
}

export async function POST(req: NextRequest) {
  const { scriptId, dark, cta, carouselId } = await req.json() as {
    scriptId: string
    dark: boolean
    cta: string
    carouselId: string
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const entryPoint = path.resolve(
    process.cwd(),
    'src/features/content-studio/remotion/index.ts',
  )

  const ts       = Date.now()
  const webmPath = path.join(os.tmpdir(), `reel-${carouselId}-${ts}.webm`)
  const mp4Path  = path.join(os.tmpdir(), `reel-${carouselId}-${ts}.mp4`)

  try {
    // 1. Bundle Remotion compositions
    console.log('[render-reel] bundling...')
    const serveUrl = await bundle({
      entryPoint,
      webpackOverride: (cfg) => cfg,
    })
    console.log('[render-reel] bundle ok:', serveUrl)

    // 2. Resolve composition
    const inputProps = { scriptId, dark, cta }
    console.log('[render-reel] selecting composition...')
    const composition = await selectComposition({
      serveUrl,
      id: 'VideoScene',
      inputProps,
    })
    console.log('[render-reel] composition ok:', composition.id)

    // 3. Render WebM/VP8 — Chrome headless supports this natively
    console.log('[render-reel] renderMedia vp8...')
    await renderMedia({
      composition,
      serveUrl,
      codec:          'vp8',
      outputLocation: webmPath,
      inputProps,
      chromiumOptions: {
        disableWebSecurity: true,
        gl: 'swangle',
        headless: true,
      },
      onProgress: ({ progress }) => {
        if (Math.round(progress * 100) % 20 === 0)
          console.log(`[render-reel] progress: ${Math.round(progress * 100)}%`)
      },
    })
    console.log('[render-reel] render ok, converting to mp4...')

    // 4. Convert WebM → H.264/MP4 via ffmpeg-static
    await convertWebmToMp4(webmPath, mp4Path)
    console.log('[render-reel] conversion ok')

    // 5. Upload MP4 to Supabase
    const buffer     = fs.readFileSync(mp4Path)
    const uploadPath = `${user.id}/videos/${carouselId}-${ts}.mp4`

    const { error: uploadError } = await supabase.storage
      .from('brand-assets')
      .upload(uploadPath, buffer, { contentType: 'video/mp4', upsert: false })

    if (uploadError) throw new Error(uploadError.message)

    const { data: { publicUrl } } = supabase.storage
      .from('brand-assets')
      .getPublicUrl(uploadPath)

    return NextResponse.json({ url: publicUrl })

  } catch (err) {
    console.error('[render-reel] ERROR:', err)
    const msg   = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error ? err.stack   : ''
    return NextResponse.json({ error: msg, stack }, { status: 500 })
  } finally {
    if (fs.existsSync(webmPath)) fs.unlinkSync(webmPath)
    if (fs.existsSync(mp4Path))  fs.unlinkSync(mp4Path)
  }
}
