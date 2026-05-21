'use client'

import { useState } from 'react'
import { generateCarousel } from '../services/generate-carousel'
import type { IdeationFormValues, GenerationState, CarouselOutput } from '../types'

interface IdeationFormProps {
  onSuccess: (carousel: CarouselOutput, carouselId: string, topic: string) => void
}

const PILLARS = ['Reservas', 'Deporte', 'Comunidad', 'Tips', 'Otro'] as const
const TONES = [
  { value: 'educativo', label: 'Educativo' },
  { value: 'motivador', label: 'Motivador' },
  { value: 'promocional', label: 'Promocional' },
  { value: 'entretenido', label: 'Entretenido' },
] as const

export function IdeationForm({ onSuccess }: IdeationFormProps) {
  const [state, setState] = useState<GenerationState>({ status: 'idle' })
  const [values, setValues] = useState<IdeationFormValues>({
    topic: '',
    content_type: 'carousel',
    target_pillar: undefined,
    slides_count: 6,
    tone: 'educativo',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!values.topic.trim()) return

    setState({ status: 'generating' })

    const result = await generateCarousel(values)

    if (result.error) {
      setState({ status: 'error', message: result.error })
      return
    }

    setState({ status: 'success', carousel: result.carousel!, carouselId: result.carouselId! })
    onSuccess(result.carousel!, result.carouselId!, values.topic)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Generar carrusel</h2>
        <p className="text-sm text-gray-500 mt-1">Describe el tema y la IA construye el contenido completo.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Tema */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tema o idea central *
          </label>
          <textarea
            rows={3}
            value={values.topic}
            onChange={e => setValues(v => ({ ...v, topic: e.target.value }))}
            placeholder="Ej: 5 razones para reservar tu cancha con anticipación y no quedarte sin lugar el fin de semana"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Pilar */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pilar de contenido</label>
            <select
              value={values.target_pillar ?? ''}
              onChange={e => setValues(v => ({ ...v, target_pillar: e.target.value as typeof values.target_pillar }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">Sin pilar específico</option>
              {PILLARS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Tono */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tono</label>
            <select
              value={values.tone}
              onChange={e => setValues(v => ({ ...v, tone: e.target.value as typeof values.tone }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              {TONES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>

        {/* Slides count */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Número de slides: <span className="text-blue-600 font-semibold">{values.slides_count}</span>
          </label>
          <input
            type="range"
            min={4}
            max={10}
            value={values.slides_count}
            onChange={e => setValues(v => ({ ...v, slides_count: parseInt(e.target.value) }))}
            className="w-full accent-blue-600"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>4 slides</span>
            <span>10 slides</span>
          </div>
        </div>

        {/* Error */}
        {state.status === 'error' && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {state.message}
          </div>
        )}

        <button
          type="submit"
          disabled={state.status === 'generating' || !values.topic.trim()}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {state.status === 'generating' ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generando carrusel...
            </span>
          ) : 'Generar con IA'}
        </button>
      </form>
    </div>
  )
}
