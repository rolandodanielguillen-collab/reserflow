'use server'

import { prismaRls } from '@/lib/prisma-rls'
import { auth } from '@/lib/auth'
import { CONTENT } from '../content'

export type SeedResult = {
  created: number
  skipped: number
  error?: string
}

/**
 * Crea las 30 piezas del calendario de Mayo 2026
 * usando templatePieceId para linkear con CONTENT array.
 * Idempotente: no duplica si ya existen.
 */
export async function seedMayCalendar(): Promise<SeedResult> {
  const session = await auth()
  if (!session?.user?.id) return { created: 0, skipped: 0, error: 'No autenticado' }

  const userId = session.user.id

  // Check which template pieces already exist
  const existing = await prismaRls.carousel.findMany({
    where: { templatePieceId: { not: null } },
    select: { templatePieceId: true },
  })

  const existingIds = new Set(existing.map(r => r.templatePieceId as number))

  const toInsert = CONTENT
    .filter(piece => !existingIds.has(piece.id))
    .map(piece => {
      // May 2026: scheduled_at = 2026-05-{day}T18:00:00Z
      const day = String(piece.day).padStart(2, '0')
      const scheduledAt = new Date(`2026-05-${day}T18:00:00Z`)

      // Alternate dark/light by day: odd days = dark, even days = light
      const darkMode = piece.day % 2 !== 0

      return {
        userId,
        title: piece.hook,
        status: 'draft' as const,
        scheduledAt,
        templatePieceId: piece.id,
        slidesJson: piece.slides ?? [],
        hashtags: JSON.stringify([]),
        caption: piece.hook,
        darkMode,
      }
    })

  if (toInsert.length === 0) {
    return { created: 0, skipped: CONTENT.length }
  }

  try {
    await prismaRls.carousel.createMany({ data: toInsert })
  } catch (err) {
    return { created: 0, skipped: existingIds.size, error: err instanceof Error ? err.message : 'Error desconocido' }
  }

  return { created: toInsert.length, skipped: existingIds.size }
}

/**
 * Resetea todas las piezas del calendario de Mayo a borrador.
 */
export async function resetAllToDraft(): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'No autenticado' }

  try {
    await prismaRls.carousel.updateMany({
      where: { templatePieceId: { not: null } },
      data: { status: 'draft' },
    })
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error desconocido' }
  }

  return { success: true }
}

/**
 * Actualiza darkMode en piezas existentes para que alterne: impares=dark, pares=light.
 */
export async function fixDarkModeAlternation(): Promise<{ updated: number; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { updated: 0, error: 'No autenticado' }

  const pieces = await prismaRls.carousel.findMany({
    where: { templatePieceId: { not: null } },
    select: { id: true, templatePieceId: true },
  })

  let updated = 0
  for (const p of pieces) {
    const tmpl = CONTENT.find(c => c.id === p.templatePieceId)
    if (!tmpl) continue
    const darkMode = tmpl.day % 2 !== 0
    await prismaRls.carousel.update({
      where: { id: p.id },
      data: { darkMode },
    })
    updated++
  }

  return { updated }
}
