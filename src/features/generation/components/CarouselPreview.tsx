'use client'

import { useState } from 'react'
import { RemotionPlayerWrapper } from '@/features/remotion/components'
import { schedulePost } from '@/features/scheduler/services/schedule-post'
import { exportAndPublish } from '@/features/publishing/services/export-and-publish'
import type { BrandConfig } from './GeneratorSection'
import type { CarouselOutput } from '../types'

interface CarouselPreviewProps {
  carousel: CarouselOutput
  carouselId: string
  brand: BrandConfig
  coverImageUrl?: string
  topic?: string
}

type ViewMode = 'animated' | 'grid'
type ActionState = 'idle' | 'scheduling' | 'scheduled' | 'publishing' | 'published' | 'error'

// Devuelve "YYYY-MM-DDTHH:mm" en hora LOCAL del browser para usar en min/value de datetime-local
function localNowInput(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function CarouselPreview({ carousel, carouselId, brand, coverImageUrl, topic }: CarouselPreviewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('animated')
  const [scheduledAt, setScheduledAt] = useState('')
  const [actionState, setActionState] = useState<ActionState>('idle')
  const [actionError, setActionError] = useState('')
  const [publishedLink, setPublishedLink] = useState('')

  async function handleSchedule() {
    if (!scheduledAt) return
    setActionState('scheduling')
    setActionError('')
    const result = await schedulePost(carouselId, new Date(scheduledAt))
    if (result.error) { setActionError(result.error); setActionState('error') }
    else setActionState('scheduled')
  }

  async function handlePublishNow() {
    setActionState('publishing')
    setActionError('')
    const result = await exportAndPublish(carouselId)
    if ('error' in result && result.error) {
      setActionError(result.error); setActionState('error')
    } else {
      if ('permalink' in result && result.permalink) setPublishedLink(result.permalink)
      setActionState('published')
    }
  }

  const slideColors = {
    cover: `linear-gradient(135deg, ${brand.primaryColor} 0%, ${brand.primaryColor}cc 100%)`,
    content: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
    cta: `linear-gradient(135deg, ${brand.secondaryColor} 0%, ${brand.accentColor} 100%)`,
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">{carousel.title}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{carousel.slides.length} slides generados</p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Listo para revisar
        </span>
      </div>

      {/* Toggle vista */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {(['animated', 'grid'] as ViewMode[]).map(mode => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              viewMode === mode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {mode === 'animated' ? 'Player animado' : 'Vista grid'}
          </button>
        ))}
      </div>

      {/* Player animado */}
      {viewMode === 'animated' && (
        <RemotionPlayerWrapper slides={carousel.slides} brand={brand} carouselId={carouselId} coverImageUrl={coverImageUrl} topic={topic} />
      )}

      {/* Vista grid — formato cuadrado Instagram */}
      {viewMode === 'grid' && (
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          {carousel.slides.map((slide, i) => (
            <div
              key={slide.index}
              className="relative flex-shrink-0 rounded-2xl p-4 flex flex-col justify-between text-white overflow-hidden"
              style={{ width: 180, height: 180, background: slideColors[slide.type] }}
            >
              <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/5" />
              <div className="flex justify-between items-start relative">
                <span className="text-[10px] font-medium text-white/60">{i + 1}/{carousel.slides.length}</span>
                <span className="text-lg">{slide.emoji}</span>
              </div>
              <div className="space-y-1 relative">
                <p className={`font-bold leading-tight ${slide.type === 'cover' ? 'text-sm' : 'text-xs'}`}>
                  {slide.headline}
                </p>
                {slide.body && (
                  <p className="text-[10px] text-white/70 leading-relaxed line-clamp-2">{slide.body}</p>
                )}
              </div>
              <div className="flex items-center gap-1 relative">
                <div className="w-4 h-4 rounded bg-white/20 flex items-center justify-center text-[8px] font-bold">
                  {brand.brandName.slice(0, 2).toUpperCase()}
                </div>
                <span className="text-[9px] text-white/50">{brand.brandName}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Caption */}
      {carousel.caption && (
        <div className="rounded-lg bg-gray-50 border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Caption sugerido</p>
          <p className="text-sm text-gray-700">{carousel.caption}</p>
        </div>
      )}

      {/* Hashtags */}
      {carousel.hashtags.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Hashtags</p>
          <div className="flex flex-wrap gap-1.5">
            {carousel.hashtags.map(tag => (
              <span key={tag} className="text-xs rounded-full px-2 py-0.5" style={{ color: brand.primaryColor, backgroundColor: `${brand.primaryColor}15` }}>
                #{tag.replace(/^#+/, '')}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Acciones */}
      <div className="border-t border-gray-100 pt-4 space-y-4">
        {actionState === 'published' ? (
          <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>
              Publicado en Instagram.{' '}
              {publishedLink && <a href={publishedLink} target="_blank" rel="noopener noreferrer" className="underline font-medium">Ver post →</a>}
            </span>
          </div>
        ) : (
          <button
            onClick={handlePublishNow}
            disabled={['publishing', 'scheduled'].includes(actionState)}
            className="w-full rounded-lg text-white text-sm font-semibold py-2.5 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            style={{ background: `linear-gradient(135deg, #7C3AED, #EC4899)` }}
          >
            {actionState === 'publishing' ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Renderizando y publicando...
              </span>
            ) : 'Publicar ahora en Instagram'}
          </button>
        )}

        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">O programar para después</p>
          {actionState === 'scheduled' ? (
            <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Programado. Aparece en tu calendario.
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={e => setScheduledAt(e.target.value)}
                  min={localNowInput()}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1"
                  style={{ ['--tw-ring-color' as string]: brand.primaryColor }}
                />
                <button
                  onClick={handleSchedule}
                  disabled={!scheduledAt || ['scheduling', 'publishing'].includes(actionState)}
                  className="px-4 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                  style={{ backgroundColor: brand.primaryColor }}
                >
                  {actionState === 'scheduling' ? 'Guardando...' : 'Programar'}
                </button>
              </div>
              {actionState === 'error' && <p className="text-xs text-red-600">{actionError}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
