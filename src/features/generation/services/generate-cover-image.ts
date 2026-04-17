'use server'

import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

interface PexelsPhoto {
  src: { original: string; large2x: string }
}

interface PexelsResponse {
  photos: PexelsPhoto[]
  total_results: number
}

interface Imagen3Response {
  predictions: Array<{ bytesBase64Encoded: string; mimeType: string }>
}

export async function generateCoverImage(
  carouselId: string,
  visualSuggestion: string,
  topic: string,
  persist = true
): Promise<{ url: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Try Imagen 3 first, fall back to Pexels
  const googleKey = process.env.GOOGLE_AI_API_KEY
  if (googleKey) {
    const result = await generateWithImagen3(googleKey, topic, visualSuggestion, carouselId, user.id, supabase, persist)
    if ('url' in result) return result
  }

  const pexelsKey = process.env.PEXELS_API_KEY
  if (!pexelsKey) return { error: 'No hay motor de imágenes configurado' }
  return searchPexels(pexelsKey, buildSearchQuery(topic, visualSuggestion), carouselId, user.id, supabase, persist)
}

// ── Imagen 3 ──────────────────────────────────────────────────────────────────

async function generateWithImagen3(
  apiKey: string,
  topic: string,
  visualSuggestion: string,
  carouselId: string,
  userId: string,
  supabase: SupabaseClient,
  persist: boolean
): Promise<{ url: string } | { error: string }> {
  const prompt = await buildImagenPrompt(topic, visualSuggestion)

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: { sampleCount: 1, aspectRatio: '1:1' },
        }),
      }
    )

    if (!res.ok) {
      const err = await res.text()
      return { error: `Imagen 3 error ${res.status}: ${err}` }
    }

    const data = await res.json() as Imagen3Response
    const prediction = data.predictions?.[0]
    if (!prediction?.bytesBase64Encoded) return { error: 'Imagen 3 no devolvió imagen' }

    const buffer = Buffer.from(prediction.bytesBase64Encoded, 'base64')
    const mimeType = prediction.mimeType ?? 'image/png'
    const ext = mimeType.split('/')[1] ?? 'png'
    const path = `${userId}/covers/${carouselId}-${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('brand-assets')
      .upload(path, buffer, { contentType: mimeType, upsert: true })

    if (uploadError) return { error: `Error guardando imagen: ${uploadError.message}` }

    const { data: { publicUrl } } = supabase.storage.from('brand-assets').getPublicUrl(path)
    if (persist) await supabase.from('carousels').update({ cover_image_url: publicUrl }).eq('id', carouselId)

    return { url: publicUrl }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return { error: `Imagen 3: ${message}` }
  }
}

async function buildImagenPrompt(topic: string, visualSuggestion: string): Promise<string> {
  const openaiKey = process.env.OPENAI_API_KEY
  if (openaiKey) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{
            role: 'system',
            content: `You are an expert prompt engineer for Imagen 3, Google's photorealistic AI image model.
Your job: convert a Spanish visual description into a perfect Imagen 3 English prompt.

Rules:
- Output ONLY the prompt, no explanations
- Keep it under 120 words
- Be specific and cinematic: describe lighting, angle, mood, colors
- Style: professional lifestyle photography, Latin America context
- Always end with: photorealistic, high resolution, 8K, magazine quality
- No text, logos, or overlays in the image`,
          }, {
            role: 'user',
            content: `Topic: ${topic}\nVisual description: ${visualSuggestion}`,
          }],
          max_tokens: 180,
          temperature: 0.7,
        }),
      })
      if (res.ok) {
        const data = await res.json() as { choices: Array<{ message: { content: string } }> }
        const prompt = data.choices?.[0]?.message?.content?.trim()
        if (prompt) return prompt
      }
    } catch {
      // fall through to static prompt
    }
  }

  // Static fallback — no OpenAI key
  return buildStaticPrompt(topic, visualSuggestion)
}

function buildStaticPrompt(topic: string, visualSuggestion: string): string {
  const text = `${topic} ${visualSuggestion}`.toLowerCase()
  const sport = /p[aá]del/.test(text) ? 'padel' :
    /tenis|tennis/.test(text) ? 'tennis' :
    /f[uú]tbol|soccer/.test(text) ? 'soccer' :
    /basketball|b[aá]squet/.test(text) ? 'basketball' :
    /nataci[oó]n|piscina/.test(text) ? 'swimming' : 'sports'

  const hasPhone = /tel[eé]fono|celular|smartphone|whatsapp/.test(text)
  const hasGroup = /amigos|grupo|equipo|friends|team/.test(text)
  const hasSunset = /atardecer|sunset/.test(text)

  const subject = hasPhone ? 'person holding smartphone' :
    hasGroup ? 'group of athletes' : 'athlete in action'

  return `Professional lifestyle photography, ${subject} on a ${sport} court, ${hasSunset ? 'golden hour lighting' : 'cinematic lighting'}, vibrant colors, shallow depth of field, Latin America sports culture, photorealistic, high resolution, 8K, magazine quality`
}

// ── Pexels fallback ───────────────────────────────────────────────────────────

async function searchPexels(
  apiKey: string,
  query: string,
  carouselId: string,
  userId: string,
  supabase: SupabaseClient,
  persist: boolean
): Promise<{ url: string } | { error: string }> {
  const res = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5&orientation=square`,
    { headers: { Authorization: apiKey } }
  )
  if (!res.ok) return { error: 'No se encontraron fotos' }
  const data = await res.json() as PexelsResponse
  if (!data.photos?.length) return { error: 'No se encontraron fotos' }

  const photo = data.photos[Math.floor(Math.random() * Math.min(3, data.photos.length))]!
  const imgRes = await fetch(photo.src.large2x || photo.src.original)
  const buffer = Buffer.from(await imgRes.arrayBuffer())
  const path = `${userId}/covers/${carouselId}-${Date.now()}.jpg`

  const { error: uploadError } = await supabase.storage
    .from('brand-assets')
    .upload(path, buffer, { contentType: 'image/jpeg', upsert: true })

  if (uploadError) return { error: uploadError.message }

  const { data: { publicUrl } } = supabase.storage.from('brand-assets').getPublicUrl(path)
  if (persist) await supabase.from('carousels').update({ cover_image_url: publicUrl }).eq('id', carouselId)
  return { url: publicUrl }
}

function buildSearchQuery(topic: string, visualSuggestion: string): string {
  const text = `${topic} ${visualSuggestion}`.toLowerCase()

  const termMap: Array<{ re: RegExp; term: string; priority: number }> = [
    { re: /p[aá]del/, term: 'padel', priority: 1 },
    { re: /tenis|tennis/, term: 'tennis', priority: 1 },
    { re: /f[uú]tbol|soccer/, term: 'soccer', priority: 1 },
    { re: /basketball|b[aá]squet/, term: 'basketball', priority: 1 },
    { re: /nataci[oó]n|piscina/, term: 'swimming', priority: 1 },
    { re: /volei|volleyball/, term: 'volleyball', priority: 1 },
    { re: /cancha|court/, term: 'court', priority: 2 },
    { re: /tel[eé]fono|celular|smartphone|whatsapp/, term: 'smartphone', priority: 2 },
    { re: /amigos|grupo|friends/, term: 'friends', priority: 2 },
    { re: /equipo|team/, term: 'team', priority: 2 },
    { re: /entrenar|training|workout/, term: 'training', priority: 2 },
    { re: /atleta|athlete|deportista/, term: 'athlete', priority: 2 },
    { re: /atardecer|sunset/, term: 'sunset', priority: 3 },
    { re: /noche|night/, term: 'night', priority: 3 },
    { re: /outdoor|exterior/, term: 'outdoor', priority: 3 },
  ]

  const matched = termMap
    .filter(({ re }) => re.test(text))
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 3)
    .map(({ term }) => term)

  if (matched.length >= 2) return [...new Set(matched)].join(' ')
  if (matched.length === 1) return `${matched[0]} sports lifestyle`
  return 'sports athlete active lifestyle'
}
