'use client'

import { useState } from 'react'
import { IdeationForm } from './IdeationForm'
import { CarouselPreview } from './CarouselPreview'
import type { CarouselOutput } from '../types'

export interface BrandConfig {
  primaryColor: string
  secondaryColor: string
  accentColor: string
  brandName: string
  logoUrl?: string
}

interface GeneratedState {
  carousel: CarouselOutput
  carouselId: string
  topic: string
  coverImageUrl?: string
}

interface GeneratorSectionProps {
  initialCarousel?: { carousel: CarouselOutput; carouselId: string; coverImageUrl?: string } | null
  brand: BrandConfig
}

export function GeneratorSection({ initialCarousel, brand }: GeneratorSectionProps) {
  const [generated, setGenerated] = useState<GeneratedState | null>(
    initialCarousel
      ? { carousel: initialCarousel.carousel, carouselId: initialCarousel.carouselId, topic: '', coverImageUrl: initialCarousel.coverImageUrl ?? '' }
      : null
  )

  function handleSuccess(carousel: CarouselOutput, carouselId: string, topic: string) {
    setGenerated({ carousel, carouselId, topic })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Generador de carruseles</h2>
        <p className="text-sm text-gray-500 mt-1">
          Describe un tema y la IA genera el copy completo para tu carrusel de Instagram.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <IdeationForm onSuccess={handleSuccess} />

        {generated ? (
          <CarouselPreview
            carousel={generated.carousel}
            carouselId={generated.carouselId}
            brand={brand}
            coverImageUrl={generated.coverImageUrl}
            topic={generated.topic}
          />
        ) : (
          <EmptyPreview primaryColor={brand.primaryColor} />
        )}
      </div>
    </div>
  )
}

function EmptyPreview({ primaryColor }: { primaryColor: string }) {
  return (
    <div className="bg-white rounded-xl border border-dashed border-gray-300 p-6 flex flex-col items-center justify-center min-h-64 text-center">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: `${primaryColor}15` }}>
        <svg className="w-6 h-6" style={{ color: primaryColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <p className="text-sm font-medium text-gray-600">Preview del carrusel</p>
      <p className="text-xs text-gray-400 mt-1 max-w-xs">
        Completa el formulario y el carrusel generado aparecerá aquí para revisión.
      </p>
    </div>
  )
}
