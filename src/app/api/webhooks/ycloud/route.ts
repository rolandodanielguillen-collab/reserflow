import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'

/**
 * Webhook handler para eventos de YCloud WhatsApp.
 * Verifica la firma HMAC-SHA256 antes de procesar.
 *
 * Configurar en YCloud Dashboard:
 * URL: https://tu-dominio.com/api/webhooks/ycloud
 * Secret: valor de YCLOUD_WEBHOOK_SECRET
 *
 * Flujo de aprobación:
 *   Admin recibe WA "¿Apruebas?" → responde "Sí" o "No"
 *   → webhook actualiza status del carousel en Supabase
 */

type YCloudMessageEvent = {
  type: string
  data: {
    id?: string
    from?: string
    to?: string
    direction?: 'inbound' | 'outbound'
    status?: string
    text?: { body: string }
    type?: string
    // inbound_message.received shape
    message?: {
      from?: string
      type?: string
      text?: { body: string }
    }
  }
}

const APPROVAL_KEYWORDS  = ['sí', 'si', 's', 'yes', 'y', 'ok', 'dale', 'listo', 'aprobado', 'aprobar']
const REJECTION_KEYWORDS = ['no', 'n', 'rechazar', 'rechazado', 'cancelar']

function normalizeText(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
}

async function handleApprovalReply(from: string, bodyText: string) {
  // Only process messages from the configured admin phone
  const adminPhone = process.env.YCLOUD_ADMIN_PHONE
  if (adminPhone) {
    const normalize = (p: string) => p.replace(/\D/g, '').slice(-10)
    if (normalize(from) !== normalize(adminPhone)) return false
  }

  const supabase = await createClient()
  const normalized = normalizeText(bodyText)

  // Normalize splits on spaces to get first word only
  const firstWord = normalized.split(/\s+/)[0]

  const isApproval  = APPROVAL_KEYWORDS.includes(firstWord) || APPROVAL_KEYWORDS.includes(normalized)
  const isRejection = REJECTION_KEYWORDS.includes(firstWord) || REJECTION_KEYWORDS.includes(normalized)

  if (!isApproval && !isRejection) return false

  // Find user by admin WhatsApp phone
  const { data: brand } = await supabase
    .from('brand_settings')
    .select('user_id, pending_approval_carousel_id')
    .eq('whatsapp_phone', from)
    .maybeSingle()

  if (!brand?.pending_approval_carousel_id) {
    // Try matching without country code variations
    const stripped = from.replace(/^\+/, '')
    const { data: brand2 } = await supabase
      .from('brand_settings')
      .select('user_id, pending_approval_carousel_id')
      .ilike('whatsapp_phone', `%${stripped.slice(-10)}`)
      .maybeSingle()

    if (!brand2?.pending_approval_carousel_id) return false

    return applyDecision(supabase, brand2.user_id, brand2.pending_approval_carousel_id, isApproval)
  }

  return applyDecision(supabase, brand.user_id, brand.pending_approval_carousel_id, isApproval)
}

async function applyDecision(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  carouselId: string,
  approve: boolean
) {
  const newStatus = approve ? 'approved' : 'review'

  const { error } = await supabase
    .from('carousels')
    .update({ status: newStatus })
    .eq('id', carouselId)
    .eq('user_id', userId)

  if (error) {
    console.error('[YCloud] Error actualizando status:', error)
    return false
  }

  // Clear pending approval
  await supabase
    .from('brand_settings')
    .update({ pending_approval_carousel_id: null })
    .eq('user_id', userId)

  console.log(`[YCloud] Carrusel ${carouselId} → ${newStatus}`)
  return true
}

export async function POST(request: Request) {
  const signature = request.headers.get('x-ycloud-signature-256')
  const secret    = process.env.YCLOUD_WEBHOOK_SECRET

  if (!secret) {
    return NextResponse.json({ error: 'Webhook secret no configurado' }, { status: 500 })
  }

  const rawBody = await request.text()

  if (signature) {
    const expectedSig = `sha256=${crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex')}`

    if (signature !== expectedSig) {
      return NextResponse.json({ error: 'Firma inválida' }, { status: 401 })
    }
  }

  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  const event = payload as YCloudMessageEvent

  switch (event.type) {
    case 'whatsapp.inbound_message.received': {
      // YCloud inbound_message.received: data.message contains the message
      const msg = event.data.message
      if (msg?.type === 'text' && msg.from && msg.text?.body) {
        await handleApprovalReply(msg.from, msg.text.body)
      }
      break
    }
    case 'whatsapp.message.updated': {
      // Fallback for outbound status updates — check if inbound reply
      const data = event.data
      if (data.direction === 'inbound' && data.type === 'text' && data.from && data.text?.body) {
        await handleApprovalReply(data.from, data.text.body)
      }
      break
    }
    default:
      break
  }

  return NextResponse.json({ received: true })
}
