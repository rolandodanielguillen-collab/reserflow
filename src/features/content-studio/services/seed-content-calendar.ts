'use server'

import { createClient } from '@/lib/supabase/server'
import { CONTENT } from '../content'

export type SeedResult = {
  created: number
  skipped: number
  error?: string
}

/**
 * Crea en Supabase las 30 piezas del calendario de Mayo 2026
 * usando template_piece_id para linkear con CONTENT array.
 * Idempotente: no duplica si ya existen.
 */
export async function seedMayCalendar(): Promise<SeedResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { created: 0, skipped: 0, error: 'No autenticado' }

  // Check which template pieces already exist
  const { data: existing } = await supabase
    .from('carousels')
    .select('template_piece_id')
    .eq('user_id', user.id)
    .not('template_piece_id', 'is', null)

  const existingIds = new Set((existing ?? []).map(r => r.template_piece_id as number))

  const toInsert = CONTENT
    .filter(piece => !existingIds.has(piece.id))
    .map(piece => {
      // May 2026: scheduled_at = 2026-05-{day}T18:00:00Z
      const day = String(piece.day).padStart(2, '0')
      const scheduled_at = `2026-05-${day}T18:00:00Z`

      return {
        user_id: user.id,
        title: piece.hook,
        status: 'draft' as const,
        scheduled_at,
        template_piece_id: piece.id,
        slides_json: piece.slides ?? [],
        hashtags: [],
        caption: piece.hook,
      }
    })

  if (toInsert.length === 0) {
    return { created: 0, skipped: CONTENT.length }
  }

  const { error } = await supabase.from('carousels').insert(toInsert)
  if (error) return { created: 0, skipped: existingIds.size, error: error.message }

  return { created: toInsert.length, skipped: existingIds.size }
}

/**
 * Resetea todas las piezas del calendario de Mayo a borrador.
 */
export async function resetAllToDraft(): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const { error } = await supabase
    .from('carousels')
    .update({ status: 'draft' })
    .eq('user_id', user.id)
    .not('template_piece_id', 'is', null)

  if (error) return { success: false, error: error.message }
  return { success: true }
}
