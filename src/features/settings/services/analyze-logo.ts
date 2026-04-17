'use server'

import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

export interface ExtractedBrand {
  primary_color: string
  secondary_color: string
  accent_color: string
  brand_name?: string
  logo_url: string
}

export async function uploadLogoAndAnalyze(
  base64: string,
  mimeType: string,
  fileName: string
): Promise<{ data: ExtractedBrand } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  if (!mimeType.startsWith('image/')) return { error: 'El archivo debe ser una imagen' }

  // Subir a Supabase Storage
  const ext = fileName.split('.').pop() ?? 'png'
  const path = `${user.id}/logo-${Date.now()}.${ext}`
  const buffer = Buffer.from(base64, 'base64')

  const { error: uploadError } = await supabase.storage
    .from('brand-assets')
    .upload(path, buffer, { contentType: mimeType, upsert: true })

  if (uploadError) return { error: `Error subiendo logo: ${uploadError.message}` }

  const { data: { publicUrl } } = supabase.storage
    .from('brand-assets')
    .getPublicUrl(path)

  // Analizar con GPT-4 Vision
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: publicUrl, detail: 'low' },
            },
            {
              type: 'text',
              text: `Analiza esta imagen de logo/marca y extrae la paleta de colores principal.
Responde ÚNICAMENTE con un JSON válido, sin texto adicional, con este formato exacto:
{
  "primary_color": "#RRGGBB",
  "secondary_color": "#RRGGBB",
  "accent_color": "#RRGGBB",
  "brand_name": "nombre de la marca si lo detectas o null"
}
Elige:
- primary_color: el color más prominente/dominante de la marca
- secondary_color: el segundo color más usado
- accent_color: color de contraste o acento (si no hay uno claro, elige un complementario)
Solo colores en formato hexadecimal #RRGGBB.`,
            },
          ],
        },
      ],
    })

    const raw = response.choices[0]?.message?.content ?? ''
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return { error: 'La IA no pudo extraer los colores' }

    const parsed = JSON.parse(jsonMatch[0]) as {
      primary_color: string
      secondary_color: string
      accent_color: string
      brand_name?: string | null
    }

    // Validar que sean hex válidos
    const hexRegex = /^#[0-9A-Fa-f]{6}$/
    if (!hexRegex.test(parsed.primary_color) || !hexRegex.test(parsed.secondary_color) || !hexRegex.test(parsed.accent_color)) {
      return { error: 'Los colores extraídos no son válidos' }
    }

    return {
      data: {
        primary_color: parsed.primary_color,
        secondary_color: parsed.secondary_color,
        accent_color: parsed.accent_color,
        brand_name: parsed.brand_name ?? undefined,
        logo_url: publicUrl,
      },
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido'
    return { error: `Error analizando logo: ${msg}` }
  }
}
