import type { DesignSlide } from './types'

type LegacyAISlide = { type: 'cover' | 'content' | 'cta'; headline: string; body: string }

/**
 * Normaliza el slidesJson de la DB a DesignSlide[].
 * Soporta el formato nativo (con `kind`) y el legacy de IA (con `type`).
 */
export function normalizeSlides(json: unknown): DesignSlide[] {
  if (!Array.isArray(json)) return []
  return json
    .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
    .map((o): DesignSlide => {
      if (typeof o.kind === 'string') return o as unknown as DesignSlide
      const a = o as unknown as LegacyAISlide
      if (a.type === 'cover') return { kind: 'cover', big: a.headline, foot: a.body }
      if (a.type === 'cta') return { kind: 'cta', big: a.headline, cta: a.body }
      return { kind: 'list', title: a.headline, items: [a.body] }
    })
}
