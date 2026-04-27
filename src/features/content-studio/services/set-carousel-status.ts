'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export type DBStatus = 'draft' | 'review' | 'approved' | 'scheduled' | 'published'

const YCLOUD_BASE = 'https://api.ycloud.com/v2'

async function sendWA(to: string, message: string) {
  const apiKey = process.env.YCLOUD_API_KEY
  const from   = process.env.YCLOUD_WHATSAPP_FROM
  if (!apiKey || !from) return

  await fetch(`${YCLOUD_BASE}/whatsapp/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
    body: JSON.stringify({ from, to, type: 'text', text: { body: message } }),
  }).catch(e => console.error('[WA]', e))
}

/**
 * Actualiza el status de un carrusel.
 * Si newStatus = 'review': auto-envía WA al admin para aprobar.
 */
export async function setCarouselStatus(
  carouselId: string,
  newStatus: DBStatus
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Fetch carousel title for notifications
  const { data: carousel } = await supabase
    .from('carousels')
    .select('title')
    .eq('id', carouselId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!carousel) return { error: 'Carrusel no encontrado' }
  const title = carousel.title as string

  const { error } = await supabase
    .from('carousels')
    .update({ status: newStatus })
    .eq('id', carouselId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  // Auto-send WA when transitioning to review (pendiente)
  if (newStatus === 'review') {
    const { data: brand } = await supabase
      .from('brand_settings')
      .select('whatsapp_phone')
      .eq('user_id', user.id)
      .maybeSingle()

    const phone = brand?.whatsapp_phone as string | undefined
    if (phone) {
      // Track pending approval
      await supabase
        .from('brand_settings')
        .update({ pending_approval_carousel_id: carouselId })
        .eq('user_id', user.id)

      const msg = `🗓 *Reser+* — Carrusel listo para aprobar:\n\n📝 *${title}*\n\nRespondé *Sí* para aprobar o *No* para rechazar.`
      await sendWA(phone, msg)
    }
  }

  return { success: true }
}

/**
 * Programa un carrusel (status → scheduled + scheduled_at).
 */
export async function scheduleCarouselAt(
  carouselId: string,
  scheduledAt: Date
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Usar service role para evitar problemas de RLS en server actions de Vercel
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: updated, error } = await admin
    .from('carousels')
    .update({ status: 'scheduled', scheduled_at: scheduledAt.toISOString() })
    .eq('id', carouselId)
    .eq('user_id', user.id)
    .select('id')

  if (error) return { error: error.message }
  if (!updated || updated.length === 0) return { error: `Carrusel no encontrado (id: ${carouselId}, user: ${user.id})` }
  return { success: true }
}
