import { prismaAdmin } from '@/lib/prisma-admin'
import { rgbToHsl } from '@/features/design/palettes'

type ScoredAsset = { id: string; url: string; score: number }

function hexToHue(hex: string): number | null {
  let clean = hex.replace('#', '')
  if (clean.length === 3) clean = clean.split('').map(ch => ch + ch).join('')
  if (clean.length !== 6) return null
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  const [h, s] = rgbToHsl(r, g, b)
  return s < 12 ? null : h
}

/**
 * Elige la mejor imagen de fondo de la biblioteca del tenant.
 * Score = rotación (menos usada primero) + compatibilidad de color con la
 * paleta (distancia de tono HSL) + bonus por espacio libre para texto.
 */
export async function pickBackgroundImage(
  userId: string,
  opts?: { paletteHex?: string; excludeUrl?: string; tag?: string },
): Promise<string | undefined> {
  const tag = opts?.tag ?? 'jugador'
  const assets = await prismaAdmin.asset.findMany({
    where: { userId },
    take: 300,
  })

  const candidates = assets.filter(a =>
    Array.isArray(a.tags) && (a.tags as unknown[]).includes(tag) && a.url !== opts?.excludeUrl,
  )
  if (candidates.length === 0) return undefined

  const paletteHue = opts?.paletteHex ? hexToHue(opts.paletteHex) : null
  const now = Date.now()

  const scored: ScoredAsset[] = candidates.map(a => {
    let score = 0

    // Rotación: días sin usarse (cap 30) — nunca usada = máximo
    const days = a.lastUsedAt ? Math.min(30, (now - a.lastUsedAt.getTime()) / 86_400_000) : 30
    score += days
    score -= Math.min(10, a.useCount) // castigo suave a las muy usadas

    // Compatibilidad de color con la paleta (0-20)
    if (paletteHue !== null && Array.isArray(a.dominantColors)) {
      const hues = (a.dominantColors as string[]).map(hexToHue).filter((h): h is number => h !== null)
      if (hues.length > 0) {
        const best = Math.min(...hues.map(h => {
          const diff = Math.abs(h - paletteHue)
          return Math.min(diff, 360 - diff)
        }))
        score += Math.max(0, 20 - best / 9) // 0° → +20, 180° → 0
      }
    }

    // Espacio para texto: el slide 1 pone el texto abajo
    if (a.textSpace === 'bottom' || a.textSpace === 'center') score += 5

    // Orientación: el hueco es apaisado (1080x680)
    if (a.orientation === 'landscape') score += 3

    return { id: a.id, url: a.url, score }
  })

  scored.sort((a, b) => b.score - a.score)
  const pick = scored[0]!

  await prismaAdmin.asset.update({
    where: { id: pick.id },
    data: { useCount: { increment: 1 }, lastUsedAt: new Date() },
  })
  return pick.url
}

/** Compat: elección simple de imagen de jugador (rotación + score). */
export async function pickPlayerImage(userId: string, paletteHex?: string): Promise<string | undefined> {
  return pickBackgroundImage(userId, { paletteHex })
}
