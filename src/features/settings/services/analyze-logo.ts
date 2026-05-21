'use server'

import { uploadFile } from '@/lib/storage'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

export interface ExtractedBrand {
  primaryColor: string
  secondaryColor: string
  accentColor: string
  brandName?: string
  logoUrl: string
}

export async function uploadLogoAndAnalyze(
  base64: string,
  mimeType: string,
  fileName: string
): Promise<{ data: ExtractedBrand } | { error: string }> {
  if (!mimeType.startsWith('image/')) return { error: 'El archivo debe ser una imagen' }

  // Upload to local storage
  const ext = fileName.split('.').pop() ?? 'png'
  const buffer = Buffer.from(base64, 'base64')

  let publicUrl: string
  try {
    publicUrl = await uploadFile(buffer, 'logos', `logo-${Date.now()}.${ext}`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido'
    return { error: `Error subiendo logo: ${msg}` }
  }

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
        primaryColor: parsed.primary_color,
        secondaryColor: parsed.secondary_color,
        accentColor: parsed.accent_color,
        brandName: parsed.brand_name ?? undefined,
        logoUrl: publicUrl,
      },
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido'
    return { error: `Error analizando logo: ${msg}` }
  }
}
