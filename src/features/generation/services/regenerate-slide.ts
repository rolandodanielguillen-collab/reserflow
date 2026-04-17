'use server'

import { generateObject } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { SlideSchema, type SlideOutput } from '../types'

const aiSdk = createOpenAI({ apiKey: process.env.OPENAI_API_KEY! })

const SingleSlideSchema = z.object({ slide: SlideSchema })

export async function regenerateSlide(
  carouselId: string,
  slideIndex: number,
  context: { topic: string; tone: string; totalSlides: number }
): Promise<{ slide: SlideOutput } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: carousel } = await supabase
    .from('carousels')
    .select('slides_json, generation_prompt')
    .eq('id', carouselId)
    .eq('user_id', user.id)
    .single()

  if (!carousel) return { error: 'Carrusel no encontrado' }

  const slides = carousel.slides_json as SlideOutput[]
  const currentSlide = slides[slideIndex]
  const slideType = currentSlide?.type ?? (slideIndex === 0 ? 'cover' : slideIndex === slides.length - 1 ? 'cta' : 'content')

  const prompt = `Eres un experto en contenido de Instagram para marcas deportivas en Latinoamérica.

CONTEXTO:
- Tema del carrusel: "${context.topic}"
- Tono: ${context.tone}
- Este es el slide ${slideIndex + 1} de ${context.totalSlides}
- Tipo de slide: ${slideType} (${slideType === 'cover' ? 'portada impactante' : slideType === 'cta' ? 'llamada a la acción' : 'contenido de valor'})

SLIDE ACTUAL (que necesita mejora):
- Headline actual: "${currentSlide?.headline ?? ''}"
- Body actual: "${currentSlide?.body ?? ''}"

Genera UNA NUEVA VERSIÓN completamente diferente, más creativa y original para este slide.
El slide debe tener personalidad propia y complementar el carrusel completo.`

  try {
    const { object } = await generateObject({
      model: aiSdk('gpt-4o-mini'),
      schema: SingleSlideSchema,
      prompt,
    })

    const newSlide = { ...object.slide, index: slideIndex, type: slideType as SlideOutput['type'] }

    // Update slides_json in DB
    const updatedSlides = [...slides]
    updatedSlides[slideIndex] = newSlide
    await supabase.from('carousels').update({ slides_json: updatedSlides }).eq('id', carouselId)

    return { slide: newSlide }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return { error: `Error regenerando slide: ${message}` }
  }
}
