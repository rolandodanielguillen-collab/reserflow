'use client'

import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import type { SlideOutput } from '@/features/generation/types'

// =====================================================
// Brand Kit de RESER+
// =====================================================
const BRAND = {
  primary: '#1E40AF',
  secondary: '#F59E0B',
  accent: '#10B981',
  bg: '#F8FAFC',
  text: '#0F172A',
  textMuted: '#64748B',
}

const SLIDE_BACKGROUNDS: Record<SlideOutput['type'], string> = {
  cover: `linear-gradient(135deg, ${BRAND.primary} 0%, #1D4ED8 50%, #1E3A8A 100%)`,
  content: `linear-gradient(135deg, ${BRAND.text} 0%, #1E293B 100%)`,
  cta: `linear-gradient(135deg, ${BRAND.secondary} 0%, #F97316 100%)`,
}

// =====================================================
// Componente de un slide individual
// =====================================================
interface SlideProps {
  slide: SlideOutput
  total: number
}

function SlideFrame({ slide, total }: SlideProps) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // Animación de entrada
  const progress = spring({ frame, fps, config: { damping: 12, stiffness: 100 } })
  const opacity = interpolate(progress, [0, 1], [0, 1])
  const translateY = interpolate(progress, [0, 1], [40, 0])
  const scale = interpolate(progress, [0, 1], [0.95, 1])

  // Animación del headline (delay leve)
  const textProgress = spring({ frame: Math.max(0, frame - 8), fps, config: { damping: 14 } })
  const textOpacity = interpolate(textProgress, [0, 1], [0, 1])
  const textTranslate = interpolate(textProgress, [0, 1], [20, 0])

  return (
    <AbsoluteFill style={{ background: SLIDE_BACKGROUNDS[slide.type] }}>
      {/* Overlay decorativo */}
      <div style={{
        position: 'absolute',
        top: -60,
        right: -60,
        width: 300,
        height: 300,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.05)',
        opacity,
      }} />
      <div style={{
        position: 'absolute',
        bottom: -40,
        left: -40,
        width: 200,
        height: 200,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.04)',
        opacity,
      }} />

      {/* Contenido principal */}
      <div style={{
        padding: '60px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        opacity,
        transform: `scale(${scale}) translateY(${translateY}px)`,
      }}>
        {/* Header: numeración + emoji */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 20, fontWeight: 500 }}>
            {slide.index + 1} / {total}
          </span>
          <span style={{ fontSize: 48 }}>{slide.emoji}</span>
        </div>

        {/* Texto central */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 20,
          transform: `translateY(${textTranslate}px)`,
          opacity: textOpacity,
        }}>
          <h2 style={{
            color: 'white',
            fontSize: slide.type === 'cover' ? 64 : 48,
            fontWeight: 700,
            lineHeight: 1.15,
            margin: 0,
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}>
            {slide.headline}
          </h2>
          {slide.body && (
            <p style={{
              color: 'rgba(255,255,255,0.75)',
              fontSize: 28,
              lineHeight: 1.5,
              margin: 0,
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontWeight: 400,
            }}>
              {slide.body}
            </p>
          )}
        </div>

        {/* Footer: marca */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 700,
            fontSize: 14,
          }}>
            R+
          </div>
          <span style={{
            color: 'rgba(255,255,255,0.6)',
            fontSize: 18,
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}>
            RESER+
          </span>
        </div>
      </div>
    </AbsoluteFill>
  )
}

// =====================================================
// Composición principal del carrusel
// =====================================================
export interface CarouselCompositionProps {
  slides: SlideOutput[]
  currentSlideIndex: number
}

export function CarouselComposition({ slides, currentSlideIndex }: CarouselCompositionProps) {
  const slide = slides[currentSlideIndex]
  if (!slide) return null

  return (
    <AbsoluteFill style={{ background: BRAND.bg }}>
      <SlideFrame slide={slide} total={slides.length} />
    </AbsoluteFill>
  )
}
