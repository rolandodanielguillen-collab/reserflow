'use client'

import { createClient } from '@/lib/supabase/client'

const MIME_PRIORITY = [
  'video/mp4;codecs="avc1.42e01f"',
  'video/mp4;codecs=h264',
  'video/mp4',
  'video/webm;codecs=h264',
  'video/webm;codecs=vp9',
  'video/webm',
]

function pickMimeType() {
  for (const t of MIME_PRIORITY) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) {
      return { mimeType: t, ext: t.startsWith('video/mp4') ? 'mp4' : 'webm' }
    }
  }
  return { mimeType: 'video/webm', ext: 'webm' }
}

export type RecordPhase = 'idle' | 'permission' | 'recording' | 'uploading' | 'done' | 'error'

export async function recordAndUploadVideo(
  animationEl: HTMLElement,
  carouselId: string,
  userId: string,
  onPhase: (phase: RecordPhase, pct: number, msg?: string) => void,
): Promise<string> {
  const DURATION_MS = 10_500 // slightly over 10s loop
  const W = Math.round(animationEl.offsetWidth)
  const H = Math.round(animationEl.offsetHeight)

  // 1. Request tab capture — user must select "this tab"
  onPhase('permission', 0)
  let tabStream: MediaStream
  try {
    tabStream = await (navigator.mediaDevices as MediaDevices & {
      getDisplayMedia: (opts: unknown) => Promise<MediaStream>
    }).getDisplayMedia({
      video: { frameRate: { ideal: 60, max: 60 } },
      audio: false,
      preferCurrentTab: true,
    })
  } catch {
    throw new Error('Captura de pantalla cancelada o no permitida.')
  }

  // 2. Feed tab stream into a hidden video element to read pixels
  const srcVideo = document.createElement('video')
  srcVideo.srcObject = tabStream
  srcVideo.muted = true
  await new Promise<void>(resolve => { srcVideo.onloadedmetadata = () => resolve() })
  await srcVideo.play()

  // 3. Canvas sized to the element's layout pixels
  const canvas = document.createElement('canvas')
  canvas.width  = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  // Scale factor: captured stream may differ from CSS pixel dimensions
  const scaleX = () => srcVideo.videoWidth  / window.innerWidth
  const scaleY = () => srcVideo.videoHeight / window.innerHeight

  let rafId: number

  function renderFrame() {
    const rect = animationEl.getBoundingClientRect()
    const sx = scaleX(), sy = scaleY()
    ctx.drawImage(
      srcVideo,
      rect.left * sx, rect.top * sy,
      rect.width * sx, rect.height * sy,
      0, 0, W, H,
    )
    rafId = requestAnimationFrame(renderFrame)
  }

  // 4. Record the canvas stream
  const { mimeType, ext } = pickMimeType()
  const canvasStream = canvas.captureStream(30)
  const recorder = new MediaRecorder(canvasStream, { mimeType, videoBitsPerSecond: 8_000_000 })
  const chunks: BlobPart[] = []
  recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }

  recorder.start(200)
  renderFrame()
  onPhase('recording', 5)

  // 5. Record for DURATION_MS, reporting progress
  await new Promise<void>(resolve => {
    const start = Date.now()
    const tickInterval = setInterval(() => {
      const elapsed = Date.now() - start
      const pct = Math.min(95, 5 + Math.round((elapsed / DURATION_MS) * 85))
      onPhase('recording', pct)
    }, 500)

    setTimeout(() => {
      clearInterval(tickInterval)
      recorder.onstop = () => resolve()
      recorder.stop()
    }, DURATION_MS)
  })

  // 6. Tear down capture
  cancelAnimationFrame(rafId!)
  tabStream.getTracks().forEach(t => t.stop())
  srcVideo.srcObject = null

  const blob = new Blob(chunks, { type: mimeType })

  // 7. Upload to Supabase
  onPhase('uploading', 92)
  const path = `${userId}/videos/${carouselId}-${Date.now()}.${ext}`
  const supabase = createClient()
  const { error } = await supabase.storage
    .from('brand-assets')
    .upload(path, blob, { contentType: mimeType, upsert: false })
  if (error) throw new Error(`Error subiendo video: ${error.message}`)

  const { data: { publicUrl } } = supabase.storage.from('brand-assets').getPublicUrl(path)
  onPhase('done', 100)
  return publicUrl
}
