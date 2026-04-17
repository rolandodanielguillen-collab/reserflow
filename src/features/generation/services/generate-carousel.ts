'use server'

import { generateObject } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createClient } from '@/lib/supabase/server'
import { CarouselOutputSchema, type IdeationFormValues } from '../types'
import { notifyDraftReady } from '@/features/notifications/services/ycloud'

const aiSdk = createOpenAI({ apiKey: process.env.OPENAI_API_KEY! })

export async function generateCarousel(values: IdeationFormValues) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Load brand settings for personalized content
  const { data: brand } = await supabase
    .from('brand_settings')
    .select('brand_name, brand_tagline, brand_voice, target_audience, product_description')
    .eq('user_id', user.id)
    .maybeSingle()

  const brandName = brand?.brand_name ?? 'RESER+'
  const brandVoice = brand?.brand_voice ?? 'Profesional, cercano, motivador'
  const targetAudience = brand?.target_audience ?? 'Deportistas activos y administradores de canchas en Latinoamérica'
  const productDescription = brand?.product_description ?? 'Plataforma de reservas de canchas deportivas y amenities vía WhatsApp. Sin instalar apps nuevas. El usuario envía un mensaje y en segundos tiene su reserva confirmada.'

  const toneGuide: Record<string, string> = {
    motivador: 'Usa frases de energía, verbos de acción, lenguaje inspirador. Ej: "¡Dejá todo en la cancha!", "Tu momento es AHORA"',
    educativo: 'Aporta datos concretos, pasos claros, estadísticas. Ej: "3 de cada 5 canchas se reservan en el último momento", "Paso 1: Abrí WhatsApp"',
    promocional: 'Crea urgencia y escasez. Ej: "Solo por esta semana", "Últimas canchas disponibles", "Aprovechá antes de que se llene"',
    entretenido: 'Humor deportivo, referencias culturales latinas, situaciones cotidianas. Ej: "¿Llueve? Problema del arquero", "El grupito de siempre ya reservó"',
  }

  const pillarAngles: Record<string, string> = {
    Reservas: 'Muestra la facilidad y rapidez de reservar con RESER+. Destaca el proceso en segundos vía WhatsApp.',
    Deporte: 'Conecta con la pasión deportiva: fútbol, pádel, tenis, piscinas. La cancha como lugar de encuentro.',
    Comunidad: 'El equipo, los amigos, el ritual del deporte semanal. RESER+ une personas a través del deporte.',
    Tips: 'Consejos prácticos de deportes, cuidado físico, o administración de canchas. Valor real para el lector.',
    General: 'Mix de beneficios: conveniencia, comunidad y deporte en un solo lugar.',
  }

  const prompt = `Eres el director creativo de contenido de ${brandName}, una app que revoluciona las reservas deportivas en Latinoamérica.

IDENTIDAD DE MARCA:
- Nombre: ${brandName}
- Audiencia: ${targetAudience}
- Voz: ${brandVoice}
- Producto: ${productDescription}

TEMA DEL CARRUSEL: "${values.topic}"
PILAR: ${values.target_pillar ?? 'General'} → ${pillarAngles[values.target_pillar ?? 'General']}
TONO: ${values.tone} → ${toneGuide[values.tone]}
CANTIDAD DE SLIDES: ${values.slides_count}

ESTRUCTURA NARRATIVA (sigue este arco):
- Slide 1 (cover): GANCHO disruptivo. Una frase que para el scroll. Pregunta provocadora, dato sorprendente, o afirmación bold. Máximo 6 palabras. Ejemplo real: "¿Y si reservar fuera así de fácil?"
- Slides intermedios (content): Desarrolla la historia con ESPECIFICIDAD. Cada slide = un solo insight poderoso. NO hagas listas genéricas. Habla de situaciones reales del usuario.
- Último slide (cta): Llamada a la acción directa y urgente hacia ${brandName}. Incluye una razón para actuar HOY.

REGLAS DE ORO:
1. Cada headline debe poder pararse solo — que tenga sentido sin leer el body
2. El body añade el "por qué" o el detalle que hace click en la mente del usuario
3. Varía la longitud: algunos slides solo headline + emoji, otros con body completo
4. visual_suggestion debe ser específico y filmable: "Mano sosteniendo teléfono con WhatsApp abierto en cancha de pádel al atardecer" NO "imagen de deporte"
5. Todo en español latinoamericano, coloquial y cercano
6. Los emojis deben ser ultra-relevantes para el deporte/contexto específico

EJEMPLOS DE BUENOS HEADLINES (adapta el estilo, no copies):
- "Tu cancha. Tu hora. Sin drama."
- "¿Apps nuevas? Olvídate."
- "El partido del viernes ya está guardado."
- "3 segundos. 1 cancha. Listo."
- "Jugaste bien. Reservá mejor."

Genera el carrusel ahora. Sé CREATIVO, ESPECÍFICO, y que cada slide tenga personalidad propia.`

  try {
    const { object: carousel } = await generateObject({
      model: aiSdk('gpt-4o-mini'),
      schema: CarouselOutputSchema,
      prompt,
    })

    const { data: idea, error: ideaError } = await supabase
      .from('content_ideas')
      .insert({
        user_id: user.id,
        title: carousel.title,
        topic: values.topic,
        content_type: values.content_type,
        target_pillar: values.target_pillar ?? null,
        status: 'review',
      })
      .select()
      .single()

    if (ideaError) return { error: `Error guardando idea: ${ideaError.message}` }

    const { data: savedCarousel, error: carouselError } = await supabase
      .from('carousels')
      .insert({
        user_id: user.id,
        content_idea_id: idea.id,
        title: carousel.title,
        slides_count: carousel.slides.length,
        slides_json: carousel.slides,
        hashtags: carousel.hashtags,
        caption: carousel.caption,
        generation_prompt: prompt,
        ai_model: 'gpt-4o-mini',
        status: 'review',
      })
      .select()
      .single()

    if (carouselError) return { error: `Error guardando carrusel: ${carouselError.message}` }

    void notifyDraftReady(savedCarousel.id, carousel.title)

    return { carousel, carouselId: savedCarousel.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return { error: `Error generando carrusel: ${message}` }
  }
}
