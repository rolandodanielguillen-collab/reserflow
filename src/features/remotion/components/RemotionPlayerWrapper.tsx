'use client'

import dynamic from 'next/dynamic'
import type { SlideOutput } from '@/features/generation/types'
import type { BrandConfig } from '@/features/generation/components/GeneratorSection'

const RemotionSlidePlayer = dynamic(
  () => import('./RemotionSlidePlayer').then(m => ({ default: m.RemotionSlidePlayer })),
  {
    ssr: false,
    loading: () => (
      <div className="bg-gray-100 rounded-2xl flex items-center justify-center" style={{ aspectRatio: '1/1' }}>
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-gray-400">Cargando...</p>
        </div>
      </div>
    ),
  }
)

interface RemotionPlayerWrapperProps {
  slides: SlideOutput[]
  brand: BrandConfig
  carouselId: string
  coverImageUrl?: string
  topic?: string
}

export function RemotionPlayerWrapper({ slides, brand, carouselId, coverImageUrl, topic }: RemotionPlayerWrapperProps) {
  return (
    <RemotionSlidePlayer
      slides={slides}
      brand={brand}
      carouselId={carouselId}
      coverImageUrl={coverImageUrl}
      topic={topic}
    />
  )
}
