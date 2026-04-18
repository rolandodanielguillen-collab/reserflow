import React from 'react'
import { Composition, useCurrentFrame, useVideoConfig } from 'remotion'
import type { AnyZodObject } from 'zod'
import { VideoScene, TimelineContext } from '../components/VideoCanvas'

const FPS      = 30
const DURATION = 10  // seconds
const W        = 1080
const H        = 1350

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

export function RemotionRoot() {
  return (
    <Composition<AnyZodObject, SceneProps>
      id="VideoScene"
      component={RemotionScene}
      durationInFrames={DURATION * FPS}
      fps={FPS}
      width={W}
      height={H}
      defaultProps={{ scriptId: 'plus-bloom', dark: true, cta: '' }}
    />
  )
}
