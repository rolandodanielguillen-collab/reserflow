import { z } from 'zod'

// =====================================================
// Zod schemas — Structured Output de la IA
// =====================================================

export const SlideSchema = z.object({
  index: z.number(),
  type: z.enum(['cover', 'content', 'cta']),
  headline: z.string().describe('Titular principal del slide, máximo 8 palabras'),
  body: z.string().describe('Texto de cuerpo del slide, máximo 30 palabras'),
  visual_suggestion: z.string().describe('Descripción breve del elemento visual sugerido'),
  emoji: z.string().describe('1-2 emojis relevantes para el slide'),
})

export const CarouselOutputSchema = z.object({
  title: z.string().describe('Título del carrusel completo'),
  slides: z.array(SlideSchema).min(4).max(10),
  hashtags: z.array(z.string()).min(5).max(15).describe('Hashtags relevantes sin el #'),
  caption: z.string().describe('Caption para el post de Instagram, máximo 150 caracteres'),
})

export type SlideOutput = z.infer<typeof SlideSchema>
export type CarouselOutput = z.infer<typeof CarouselOutputSchema>

// =====================================================
// Tipos del formulario de ideación
// =====================================================

export const IdeationFormSchema = z.object({
  topic: z.string().min(10, 'Describe el tema con al menos 10 caracteres').max(500),
  content_type: z.enum(['carousel', 'single_post']).default('carousel'),
  target_pillar: z.enum(['Reservas', 'Deporte', 'Comunidad', 'Tips', 'Otro']).optional(),
  slides_count: z.number().min(4).max(10).default(6),
  tone: z.enum(['motivador', 'educativo', 'promocional', 'entretenido']).default('educativo'),
})

export type IdeationFormValues = z.infer<typeof IdeationFormSchema>

// =====================================================
// Estado de la generación
// =====================================================

export type GenerationState =
  | { status: 'idle' }
  | { status: 'generating' }
  | { status: 'success'; carousel: CarouselOutput; carouselId: string }
  | { status: 'error'; message: string }
