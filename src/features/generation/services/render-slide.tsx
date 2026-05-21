'use server'

import { ImageResponse } from 'next/og'
import { prismaRls } from '@/lib/prisma-rls'
import { uploadFile } from '@/lib/storage'

type SlideData = Record<string, unknown>

function SlideImage({ hook, slide }: { hook: string; slide: SlideData }) {
  const big = (slide.big as string) || (slide.title as string) || hook
  const sub = (slide.foot as string) || (slide.cta as string) || (slide.sub as string) || ''
  const eyebrow = (slide.eyebrow as string) || ''
  const fontSize = big.length > 50 ? 68 : big.length > 30 ? 82 : 96

  return (
    <div
      style={{
        width: 1080,
        height: 1080,
        background: '#0F1E3D',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'flex-end',
        padding: '88px',
        position: 'relative',
        fontFamily: 'sans-serif',
      }}
    >
      {/* Mint cross accent */}
      <div style={{ position: 'absolute', top: 72, right: 72, display: 'flex', gap: 0 }}>
        <div style={{ width: 12, height: 52, background: '#17B095', borderRadius: 4, marginRight: 14 }}/>
        <div style={{ width: 52, height: 12, background: '#17B095', borderRadius: 4, position: 'absolute', top: 20, left: -14 }}/>
      </div>

      {eyebrow && (
        <div style={{ fontSize: 22, fontWeight: 700, color: '#17B095', letterSpacing: '0.16em', marginBottom: 28, display: 'flex' }}>
          {eyebrow.toUpperCase()}
        </div>
      )}

      <div style={{ fontSize, fontWeight: 900, color: '#F5F2EB', lineHeight: 1.05, letterSpacing: '-0.04em', marginBottom: 32, maxWidth: 900, display: 'flex', flexWrap: 'wrap' }}>
        {big}
      </div>

      {sub && (
        <div style={{ fontSize: 30, color: 'rgba(245,242,235,0.55)', letterSpacing: '-0.01em', display: 'flex' }}>
          {sub}
        </div>
      )}

      {/* Brand mark */}
      <div style={{ position: 'absolute', bottom: 60, right: 88, fontSize: 18, fontWeight: 900, color: '#17B095', letterSpacing: '0.14em', display: 'flex' }}>
        RESER+
      </div>
    </div>
  )
}

export async function renderCarouselCover(
  carouselId: string,
  userId: string,
  hook: string,
  slidesJson: unknown
): Promise<string | null> {
  try {
    const slides = Array.isArray(slidesJson) ? slidesJson as SlideData[] : []
    const first = slides[0] ?? {}

    const response = new ImageResponse(
      <SlideImage hook={hook} slide={first}/>,
      { width: 1080, height: 1080 }
    )

    const buffer = Buffer.from(await response.arrayBuffer())
    const publicUrl = await uploadFile(buffer, 'rendered', `${carouselId}-cover.png`)

    await prismaRls.carousel.update({
      where: { id: carouselId },
      data: { coverImageUrl: publicUrl },
    })

    return publicUrl
  } catch {
    return null
  }
}
