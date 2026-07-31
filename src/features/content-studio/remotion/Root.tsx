import React from 'react'
import { Composition, Still, useCurrentFrame, useVideoConfig } from 'remotion'
import type { AnyZodObject } from 'zod'
import { VideoScene, TimelineContext } from '../components/VideoCanvas'
import { ScaledSlide } from '../components/SlideCanvas'
import type { DesignSlide } from '../types'

const FPS      = 30
const DURATION = 10  // seconds
const W        = 1080
const H        = 1920

type SceneProps = {
  scriptId: string
  dark: boolean
  cta: string
  [key: string]: unknown
}

// Feeds Remotion frame time into the existing TimelineContext so all
// scene components render identically to the browser preview.
function RemotionScene({ scriptId, dark, cta }: SceneProps) {
  const frame  = useCurrentFrame()
  const { fps } = useVideoConfig()
  const time   = frame / fps

  const ctx = React.useMemo(
    () => ({ time, duration: DURATION, playing: true }),
    [time],
  )

  return (
    <TimelineContext.Provider value={ctx}>
      <div style={{ width: W, height: H, overflow: 'hidden', position: 'relative' }}>
        <VideoScene scriptId={scriptId} dark={dark} cta={cta}/>
      </div>
    </TimelineContext.Provider>
  )
}

type SlideStillProps = {
  slide: DesignSlide
  dark: boolean
  index: number
  total: number
  [key: string]: unknown
}

type EventIntroProps = {
  slide1: DesignSlide
  slide2: DesignSlide
  [key: string]: unknown
}

// Animación de portada (port de padelpost VideoIntro): slide 1 fijo,
// slide 2 asoma desde la derecha con 3 ciclos coseno en 10s.
function EventIntroScene({ slide1, slide2 }: EventIntroProps) {
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

// Mismo componente que el preview del Studio → misma fidelidad al publicar.
function SlideStillScene({ slide, dark, index, total }: SlideStillProps) {
  return (
    <div style={{ width: 1080, height: 1350, overflow: 'hidden', position: 'relative' }}>
      <ScaledSlide slide={slide} dark={dark} index={index} total={total} width={1080}/>
    </div>
  )
}

export function RemotionRoot() {
  return (
    <>
      <Composition<AnyZodObject, SceneProps>
        id="VideoScene"
        component={RemotionScene}
        durationInFrames={DURATION * FPS}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={{ scriptId: 'plus-bloom', dark: true, cta: '' }}
      />
      <Still<AnyZodObject, SlideStillProps>
        id="SlideStill"
        component={SlideStillScene}
        width={1080}
        height={1350}
        defaultProps={{ slide: { kind: 'cover', big: '' }, dark: true, index: 0, total: 1 }}
      />
      <Composition<AnyZodObject, EventIntroProps>
        id="EventIntro"
        component={EventIntroScene}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1350}
        defaultProps={{ slide1: { kind: 'cover', big: '' }, slide2: { kind: 'cover', big: '' } }}
      />
    </>
  )
}
