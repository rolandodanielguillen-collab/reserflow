'use client'

// Animación de portada (port de padelpost VideoIntro): slide 1 fijo,
// slide 2 asoma desde la derecha con 3 ciclos coseno en 10s.
// La usa el render server-side (Root.tsx) y el preview en vivo del editor
// (@remotion/player) — mismo componente, mismo resultado.

import React from 'react'
import { useCurrentFrame, useVideoConfig } from 'remotion'
import { ScaledSlide } from './SlideCanvas'
import type { DesignSlide } from '../types'

export type EventIntroProps = {
  slide1: DesignSlide
  slide2: DesignSlide
  [key: string]: unknown
}

export function EventIntroScene({ slide1, slide2 }: EventIntroProps) {
  const frame = useCurrentFrame()
  const { durationInFrames } = useVideoConfig()
  const t = frame / durationInFrames
  const translateX = 1080 - (380 * (1 - Math.cos(6 * Math.PI * t)) / 2)

  return (
    <div style={{ position: 'absolute', inset: 0, width: 1080, height: 1350, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0 }}>
        <ScaledSlide slide={slide1} dark index={0} total={2} width={1080}/>
      </div>
      <div style={{
        position: 'absolute', top: 0, left: 0, width: 1080, height: 1350,
        transform: `translateX(${translateX}px)`,
        boxShadow: '-8px 0 24px rgba(0,0,0,0.5)',
      }}>
        <ScaledSlide slide={slide2} dark index={1} total={2} width={1080}/>
      </div>
    </div>
  )
}
