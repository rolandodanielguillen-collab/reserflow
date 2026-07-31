// Ingesta de flyers: GPT-4o Vision extrae los datos del torneo y se generan
// los slides de evento. Port del pipeline de padelpost-ai (ProcessFlyerJob +
// OpenAIService + RemotionService::construirProps).

import type { DesignSlide, EventFlyerData, PaletteTokens } from '@/features/content-studio/types'
import { getPaletteByColor, getPaletteById, DEFAULT_PALETTE } from '@/features/design/palettes'
import { ensureReadableText } from '@/features/design/contrast'

const OPENAI_BASE = 'https://api.openai.com/v1'

export type ExtractedFlyer = {
  tournament_name?: string | null
  club_name?: string | null
  city?: string | null
  start_date?: string | null
  end_date?: string | null
  price_per_person?: number | null
  currency?: string | null
  categories?: Array<{ name?: string; gender?: string; level?: string }> | null
  prizes?: Array<{ category?: string; champion_prize?: string; runner_up_prize?: string }> | null
  primary_color?: string | null
  style?: string | null
  contact_phone?: string | null
  additional_info?: string | null
  palette_id?: string | null // override manual del operador (botón Cambiar colores)
  custom_palette?: PaletteTokens | null // paleta personalizada desde el panel
}

export const REQUIRED_FIELDS: Array<{ key: keyof ExtractedFlyer; question: string }> = [
  { key: 'tournament_name', question: '¿Cómo se llama el torneo?' },
  { key: 'city', question: '¿En qué ciudad o club se juega?' },
  { key: 'start_date', question: '¿Qué fecha arranca? (ej: 15/08)' },
]

export function missingFields(data: ExtractedFlyer): Array<{ key: keyof ExtractedFlyer; question: string }> {
  return REQUIRED_FIELDS.filter(f => {
    const v = data[f.key]
    return v === null || v === undefined || v === ''
  })
}

export async function openaiChat(body: Record<string, unknown>, timeoutMs = 60000): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY no configurada')

  const backoffs = [3000, 8000]
  for (let intento = 0; intento < 3; intento++) {
    try {
      const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      })
      if (res.ok) {
        const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
        const content = json.choices?.[0]?.message?.content?.trim()
        if (content) return content
      } else if ([400, 401, 403].includes(res.status)) {
        console.error('[ingest] OpenAI error permanente', res.status, await res.text())
        return null
      }
    } catch (err) {
      console.warn('[ingest] OpenAI intento', intento + 1, 'falló:', err)
    }
    if (intento < 2) await new Promise(r => setTimeout(r, backoffs[intento]))
  }
  return null
}

const EXTRACTION_PROMPT = `Actúa como un experto analista de marketing deportivo.
Analiza el flyer de torneo de pádel adjunto y devuelve
EXCLUSIVAMENTE un objeto JSON válido con estas claves:

1. tournament_name (string)
2. club_name (string)
3. city (string)
4. start_date (string, formato YYYY-MM-DD)
5. end_date (string, formato YYYY-MM-DD)
6. price_per_person (number)
7. currency (string)
8. categories (array de objetos con claves: name, gender, level)
9. prizes (array de objetos con claves: category, champion_prize, runner_up_prize)
10. primary_color (string, código HEX)
11. style (string)
12. contact_phone (string)
13. additional_info (string)

REGLAS ESTRICTAS:
- Si un dato no existe en el flyer, usa null (no inventes).
- Devuelve SOLO el JSON, sin bloques de código, sin texto adicional.
- AÑO DE LAS FECHAS: El año actual es ${new Date().getFullYear()}. Si el año no aparece explícitamente en el flyer, usa ${new Date().getFullYear()}. Si el año extraído parece incorrecto o es anterior a ${new Date().getFullYear() - 1}, corrígelo.
- CAMPO city: extrae la ciudad o localidad donde se realiza el torneo. Si aparece el nombre de un club o cancha como ubicación (ej: "Campo 9"), inclúyelo completo tal como aparece. NO extraigas solo el número de un nombre compuesto.`

/** GPT-4o Vision: extrae los datos estructurados del flyer (imagen en base64). */
export async function analyzeFlyer(imageBase64: string): Promise<ExtractedFlyer | null> {
  const clean = imageBase64.replace(/^data:image\/\w+;base64,/, '')
  const content = await openaiChat({
    model: 'gpt-4o',
    max_tokens: 1000,
    temperature: 0,
    messages: [
      {
        role: 'system',
        content: 'Eres un experto analista de marketing deportivo. Cuando analizas un flyer devuelves EXCLUSIVAMENTE un objeto JSON válido, sin bloques de código, sin explicaciones, sin texto adicional.',
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: EXTRACTION_PROMPT },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${clean}`, detail: 'high' } },
        ],
      },
    ],
  })
  if (!content) return null
  const stripped = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  try {
    return JSON.parse(stripped) as ExtractedFlyer
  } catch {
    console.error('[ingest] JSON inválido de Vision:', stripped.slice(0, 200))
    return null
  }
}

/** GPT-4o-mini: caption de Instagram con hashtags. Fallback genérico si falla. */
export async function generateCaption(data: ExtractedFlyer): Promise<string> {
  const cats = (data.categories ?? []).map(c => [c.gender, c.name, c.level].filter(Boolean).join(' ')).join(', ')
  const prizes = (data.prizes ?? []).map(p => `${p.category ?? ''}: ${p.champion_prize ?? ''}`).join(' | ')
  const price = data.price_per_person ? `${data.price_per_person} ${data.currency ?? ''}` : ''

  const content = await openaiChat({
    model: 'gpt-4o-mini',
    max_tokens: 500,
    temperature: 0.8,
    messages: [
      {
        role: 'system',
        content: 'Eres un experto en marketing deportivo especializado en pádel. Redactas captions para Instagram que generan emoción y engagement. Escribes en español, con energía, emojis estratégicos y llamadas a la acción claras. El caption siempre termina con un bloque de hashtags relevantes.',
      },
      {
        role: 'user',
        content: `Crea un caption para Instagram para este torneo de pádel:

🏆 Torneo: ${data.tournament_name ?? ''}
🏟️ Club: ${data.club_name ?? ''}
📍 Ciudad: ${data.city ?? ''}
📅 Fechas: ${data.start_date ?? ''} al ${data.end_date ?? ''}
💰 Precio inscripción: ${price} por persona
🎾 Categorías: ${cats}
🥇 Premios: ${prizes}
📞 Contacto: ${data.contact_phone ?? ''}
ℹ️ Info adicional: ${data.additional_info ?? ''}

INSTRUCCIONES:
- Máximo 2.200 caracteres (límite Instagram)
- Empieza con una frase gancho que genere emoción (NO empieces con "¡")
- Incluye los datos clave: nombre, fechas, categorías, precio, contacto
- Termina con una llamada a la acción clara (inscripción, contacto, etc.)
- Agrega 15-20 hashtags relevantes de pádel al final, separados por espacios
- Usa emojis pero con moderación (máximo 8-10 en todo el texto)
- Tono: energético, deportivo, inclusivo

Devuelve SOLO el caption, sin explicaciones ni comillas.`,
      },
    ],
  }, 30000)

  if (content) return content
  // Fallback sin IA
  return `🎾 ${data.tournament_name ?? 'Torneo de pádel'} — ${data.city ?? ''}\n📅 ${data.start_date ?? ''}\n📞 Inscripciones: ${data.contact_phone ?? ''}\n\n#padel #torneo #padelsys`
}

/** GPT-4o-mini: limpia la respuesta del operador a una pregunta de campo faltante. */
export async function cleanFieldValue(fieldKey: string, question: string, answer: string): Promise<string> {
  const isDate = fieldKey.includes('date')
  const content = await openaiChat({
    model: 'gpt-4o-mini',
    max_tokens: 60,
    temperature: 0,
    messages: [
      {
        role: 'system',
        content: 'Extraes el valor limpio de una respuesta conversacional. Devuelves SOLO el valor, sin explicaciones ni comillas.',
      },
      {
        role: 'user',
        content: `Pregunta al operador: "${question}"\nRespuesta del operador: "${answer}"\n${isDate ? `Devuelve la fecha en formato YYYY-MM-DD (año actual: ${new Date().getFullYear()} si no se especifica).` : 'Devuelve solo el valor limpio.'}`,
      },
    ],
  }, 20000)
  return (content ?? answer).trim()
}

// ── Construcción de slides de evento ──────────────────────────────────────

function matchGender(gender: string | undefined, keys: string[]): boolean {
  if (!gender) return false
  const g = gender.toLowerCase()
  return keys.some(k => g.includes(k))
}

const MEN = ['caballero', 'masculino', 'hombre', 'male']
const WOMEN = ['dama', 'femenino', 'mujer', 'female']

function categoriesByGender(cats: ExtractedFlyer['categories'], keys: string[]): string {
  return (cats ?? [])
    .filter(c => matchGender(c.gender, keys))
    .map(c => [c.name, c.level].filter(Boolean).join(' '))
    .filter(Boolean)
    .join(', ')
}

function prizesByGender(prizes: ExtractedFlyer['prizes'], keys: string[]): string {
  return (prizes ?? [])
    .filter(p => matchGender(p.category, keys))
    .map(p => `${p.category ?? ''}: ${p.champion_prize ?? ''}`.trim())
    .filter(s => s !== ':')
    .join('\n')
}

function allPrizes(prizes: ExtractedFlyer['prizes']): string {
  return (prizes ?? [])
    .map(p => `${p.category ?? ''}: ${p.champion_prize ?? ''}`.trim())
    .filter(s => s !== ':')
    .join('\n')
}

export type BrandForFlyer = {
  brandName?: string | null
  logoUrl?: string | null
  igHandle?: string | null
  clientNumber?: string | null
  website?: string | null
}

/** Arma los 3 slides de evento a partir de los datos extraídos + marca del tenant. */
export function buildEventSlides(
  data: ExtractedFlyer,
  brand: BrandForFlyer,
  opts?: { playerImageUrl?: string; palette?: PaletteTokens },
): DesignSlide[] {
  // Prioridad: override del llamador > custom del panel > paleta elegida > match por color
  const paletteFull = opts?.palette
    ? { id: 'custom', name: 'Custom', ...opts.palette }
    : data.custom_palette
      ? { id: 'custom', name: 'Custom', ...data.custom_palette }
      : data.palette_id
        ? getPaletteById(data.palette_id)
        : (data.primary_color ? getPaletteByColor(data.primary_color) : DEFAULT_PALETTE)
  // Contraste WCAG garantizado: si el texto no llega a AA sobre el fondo,
  // se reemplaza por blanco/negro según convenga.
  const palette: PaletteTokens = {
    background: paletteFull.background,
    primary: paletteFull.primary,
    accent: paletteFull.accent,
    text: ensureReadableText(paletteFull.background, paletteFull.text),
  }

  const phone = (data.contact_phone ?? '').replace(/-+/g, ' ').trim()
  const price = data.price_per_person
    ? `${Number(data.price_per_person).toLocaleString('es-PY')} ${data.currency ?? ''} / persona`.trim()
    : ''

  let prizesMen = prizesByGender(data.prizes, MEN)
  let prizesWomen = prizesByGender(data.prizes, WOMEN)
  if (!prizesMen && !prizesWomen) {
    prizesMen = allPrizes(data.prizes)
    prizesWomen = ''
  }

  const categoriesSummary = (data.categories ?? [])
    .map(c => [c.name, c.level].filter(Boolean).join(' '))
    .filter(Boolean)
    .slice(0, 8)
    .join(' | ')

  const base: EventFlyerData = {
    clubName: data.club_name ?? '',
    tournamentName: data.tournament_name ?? '',
    startDate: data.start_date ?? undefined,
    endDate: data.end_date ?? undefined,
    categoriesSummary,
    city: data.city ?? '',
    phone,
    year: String(new Date().getFullYear()),
    logoUrl: brand.logoUrl ?? undefined,
    headerBrand: brand.brandName?.toLowerCase() || 'padel sys',
    footerLeft: 'SISTEMA DE GESTIÓN',
    footerRight: brand.website?.toUpperCase() || (brand.brandName ? brand.brandName.toUpperCase() : 'WWW.PADELSYS.COM'),
    igHandle: brand.igHandle ?? undefined,
    clientNumber: brand.clientNumber ?? '01',
    playerImageUrl: opts?.playerImageUrl,
    categoriesMen: categoriesByGender(data.categories, MEN),
    categoriesWomen: categoriesByGender(data.categories, WOMEN),
    prizesMen,
    prizesWomen,
    price,
    conditions: extractCondition(data.additional_info ?? ''),
  }

  return [
    { kind: 'event', slide: 1, data: base, palette },
    { kind: 'event', slide: 2, data: { ...base, clientNumber: '02' }, palette },
    { kind: 'event', slide: 3, data: { ...base, clientNumber: '03' }, palette },
  ]
}

/** Extrae una condición corta tipo "10 PAREJAS INSCRIPTAS" del texto adicional. */
function extractCondition(info: string): string {
  const m = info.match(/(\d+\s*parejas[^.,;]*)/i)
  if (m?.[1]) return m[1].trim().toUpperCase()
  return ''
}
