'use server'

import { prismaRls } from '@/lib/prisma-rls'
import { auth } from '@/lib/auth'

const YCLOUD_BASE = 'https://api.ycloud.com/v2'

interface SendWhatsAppParams {
  to: string         // Numero en formato E.164: +5491112345678
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
// Notificaciones especificas de ReserFlow
// =====================================================

export async function notifyDraftReady(carouselId: string, title: string) {
  const session = await auth()
  if (!session?.user?.id) return

  const brand = await prismaRls.brandSettings.findFirst({
    select: { whatsappPhone: true },
  })

  if (!brand?.whatsappPhone) return

  // Track which carousel is pending approval
  await prismaRls.brandSettings.update({
    where: { userId: session.user.id },
    data: { pendingApprovalCarouselId: carouselId },
  })

  const message = `🗓 *Reser+* — Carrusel listo para aprobar:\n\n📝 *${title}*\n\nRespondé *Sí* para aprobar y programar, o *No* para rechazar.`

  try {
    await sendWhatsApp({ to: brand.whatsappPhone, message })
  } catch (err) {
    console.error('[YCloud] Error enviando notificación de borrador:', err)
  }
}

export async function sendApprovalRequest(carouselId: string, title: string, phone: string, userId: string) {
  await prismaRls.brandSettings.update({
    where: { userId },
    data: { pendingApprovalCarouselId: carouselId },
  })

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
