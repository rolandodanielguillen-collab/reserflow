'use server'

import { createClient } from '@/lib/supabase/server'

const YCLOUD_BASE = 'https://api.ycloud.com/v2'

interface SendWhatsAppParams {
  to: string         // Número en formato E.164: +5491112345678
  message: string
}

async function sendWhatsApp({ to, message }: SendWhatsAppParams) {
  const apiKey = process.env.YCLOUD_API_KEY
  if (!apiKey) {
    console.warn('[YCloud] YCLOUD_API_KEY no configurada. Notificación omitida.')
    return { skipped: true }
  }

  const res = await fetch(`${YCLOUD_BASE}/whatsapp/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: JSON.stringify({
      from: process.env.YCLOUD_WHATSAPP_FROM,
      to,
      type: 'text',
      text: { body: message },
    }),
  })

  const data = await res.json() as { id?: string; error?: string }
  if (!res.ok) throw new Error(data.error ?? `YCloud error ${res.status}`)
  return { messageId: data.id }
}

// =====================================================
// Notificaciones específicas de ReserFlow
// =====================================================

export async function notifyDraftReady(carouselId: string, title: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: brand } = await supabase
    .from('brand_settings')
    .select('whatsapp_phone')
    .eq('user_id', user.id)
    .single()

  if (!brand?.whatsapp_phone) return

  // Track which carousel is pending approval
  await supabase
    .from('brand_settings')
    .update({ pending_approval_carousel_id: carouselId })
    .eq('user_id', user.id)

  const message = `🗓 *Reser+* — Carrusel listo para aprobar:\n\n📝 *${title}*\n\nRespondé *Sí* para aprobar y programar, o *No* para rechazar.`

  try {
    await sendWhatsApp({ to: brand.whatsapp_phone, message })
  } catch (err) {
    console.error('[YCloud] Error enviando notificación de borrador:', err)
  }
}

export async function sendApprovalRequest(carouselId: string, title: string, phone: string, userId: string) {
  const supabase = await createClient()

  await supabase
    .from('brand_settings')
    .update({ pending_approval_carousel_id: carouselId })
    .eq('user_id', userId)

  const message = `🗓 *Reser+* — Nuevo carrusel listo para aprobar:\n\n📝 *${title}*\n\nRespondé *Sí* para aprobar o *No* para rechazar.`

  return sendWhatsApp({ to: phone, message })
}

export async function notifyPublished(title: string, permalink: string, phone: string) {
  const message = `🚀 *ReserFlow* — Publicación exitosa en Instagram:\n\n📸 *${title}*\n\n🔗 ${permalink}`

  try {
    await sendWhatsApp({ to: phone, message })
  } catch (err) {
    console.error('[YCloud] Error enviando notificación de publicación:', err)
  }
}

export async function notifyPublishFailed(title: string, reason: string, phone: string) {
  const message = `⚠️ *ReserFlow* — Error al publicar en Instagram:\n\n📸 *${title}*\n❌ ${reason}\n\nIngresá al dashboard para revisar.`

  try {
    await sendWhatsApp({ to: phone, message })
  } catch (err) {
    console.error('[YCloud] Error enviando notificación de fallo:', err)
  }
}
