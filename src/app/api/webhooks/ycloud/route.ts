import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'

/**
 * Webhook unificado YCloud — punto de entrada único.
 *
 * Responsabilidades:
 *  1. Verificar firma HMAC (acepta x-ycloud-signature-256 y x-ycloud-signature)
 *  2. Procesar respuestas de aprobación de carruseles (sí/no)
 *  3. Reenviar TODOS los eventos a BotFlow (BOTFLOW_WEBHOOK_URL) para el chatbot IA
 *
 * Configurar en YCloud Dashboard:
 *   URL: https://reserplus.com/api/webhooks/ycloud
 *   Secret: YCLOUD_WEBHOOK_SECRET
 *
 * Env vars necesarias:
 *   YCLOUD_WEBHOOK_SECRET   — secreto compartido para verificar firma
 *   BOTFLOW_WEBHOOK_URL     — https://padelpost.reserplus.com/api/webhook/ycloud
 */

// ── Tipos ──────────────────────────────────────────────────────────────────

// YCloud API v2 (nuevo formato)
type EventV2 = {
  type: string
  data: {
    id?: string
    from?: string
    to?: string
    direction?: 'inbound' | 'outbound'
    status?: string
    text?: { body: string }
    type?: string
    message?: {
      from?: string
      to?: string
      type?: string
      text?: { body: string }
    }
  }
}

// YCloud API v1 (formato BotFlow legacy)
type EventV1 = {
  type: string
  message?: {
    id: string
    from: string
    to: string
    text?: { body: string }
    type: string
    timestamp: string
  }
}

type AnyEvent = EventV2 & EventV1

// ── Helpers ────────────────────────────────────────────────────────────────

const APPROVAL_KEYWORDS  = ['sí', 'si', 's', 'yes', 'y', 'ok', 'dale', 'listo', 'aprobado', 'aprobar']
const REJECTION_KEYWORDS = ['no', 'n', 'rechazar', 'rechazado', 'cancelar']

function normalizeText(text: string) {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
}

function verifySignature(rawBody: string, secret: string, header256: string | null, header: string | null): boolean {
  // Acepta cualquiera de los dos formatos de firma que YCloud puede enviar
  if (header256) {
    const expected = `sha256=${crypto.createHmac('sha256', secret).update(rawBody).digest('hex')}`
    if (header256 === expected) return true
  }
  if (header) {
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
    if (header === expected) return true
  }
  return false
}

// ── Lógica de aprobación (ReserFlow) ──────────────────────────────────────

async function handleApprovalReply(from: string, bodyText: string) {
  const adminPhone = process.env.YCLOUD_ADMIN_PHONE
  if (adminPhone) {
    const normalize = (p: string) => p.replace(/\D/g, '').slice(-10)
    if (normalize(from) !== normalize(adminPhone)) return false
  }

  const supabase  = await createClient()
  const normalized = normalizeText(bodyText)
  const firstWord  = normalized.split(/\s+/)[0]

  const isApproval  = APPROVAL_KEYWORDS.includes(firstWord)  || APPROVAL_KEYWORDS.includes(normalized)
  const isRejection = REJECTION_KEYWORDS.includes(firstWord) || REJECTION_KEYWORDS.includes(normalized)

  if (!isApproval && !isRejection) return false

  const { data: brand } = await supabase
    .from('brand_settings')
    .select('user_id, pending_approval_carousel_id')
    .eq('whatsapp_phone', from)
    .maybeSingle()

  const target = brand ?? await (async () => {
    const stripped = from.replace(/^\+/, '')
    const { data } = await supabase
      .from('brand_settings')
      .select('user_id, pending_approval_carousel_id')
      .ilike('whatsapp_phone', `%${stripped.slice(-10)}`)
      .maybeSingle()
    return data
  })()

  if (!target?.pending_approval_carousel_id) return false

  const newStatus = isApproval ? 'approved' : 'review'
  const { error } = await supabase
    .from('carousels')
    .update({ status: newStatus })
    .eq('id', target.pending_approval_carousel_id)
    .eq('user_id', target.user_id)

  if (error) { console.error('[YCloud] Error actualizando status:', error); return false }

  await supabase
    .from('brand_settings')
    .update({ pending_approval_carousel_id: null })
    .eq('user_id', target.user_id)

  console.log(`[YCloud] Carrusel ${target.pending_approval_carousel_id} → ${newStatus}`)
  return true
}

// ── Reenvío a BotFlow (fire and forget) ───────────────────────────────────

function forwardToBotFlow(rawBody: string, headers: Record<string, string>) {
  const url = process.env.BOTFLOW_WEBHOOK_URL
  if (!url) return
  fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body:    rawBody,
  }).catch(err => console.error('[YCloud→BotFlow] Error al reenviar:', err))
}

// ── Handler principal ─────────────────────────────────────────────────────

export async function POST(request: Request) {
  const sig256 = request.headers.get('x-ycloud-signature-256')
  const sig    = request.headers.get('x-ycloud-signature')
  const secret = process.env.YCLOUD_WEBHOOK_SECRET

  const rawBody = await request.text()

  // Verificar firma si el secreto está configurado
  if (secret) {
    if (!verifySignature(rawBody, secret, sig256, sig)) {
      console.warn('[YCloud] Firma inválida')
      return NextResponse.json({ error: 'Firma inválida' }, { status: 401 })
    }
  }

  // Reenviar a BotFlow (chatbot IA) — siempre, antes de procesar
  forwardToBotFlow(rawBody, {
    ...(sig256 ? { 'x-ycloud-signature-256': sig256 } : {}),
    ...(sig    ? { 'x-ycloud-signature': sig }         : {}),
  })

  let payload: unknown
  try { payload = JSON.parse(rawBody) }
  catch { return NextResponse.json({ error: 'Payload inválido' }, { status: 400 }) }

  const event = payload as AnyEvent

  // Extraer mensaje entrante — soporta formato v1 y v2 de YCloud
  let from: string | undefined
  let text: string | undefined

  switch (event.type) {
    // v2: whatsapp.inbound_message.received
    case 'whatsapp.inbound_message.received': {
      const msg = event.data?.message
      if (msg?.type === 'text' && msg.from && msg.text?.body) {
        from = msg.from; text = msg.text.body
      }
      break
    }
    // v2: whatsapp.message.updated (inbound reply)
    case 'whatsapp.message.updated': {
      const d = event.data
      if (d?.direction === 'inbound' && d?.type === 'text' && d?.from && d?.text?.body) {
        from = d.from; text = d.text.body
      }
      break
    }
    // v1: message.received (legacy BotFlow format)
    case 'message.received': {
      const msg = event.message
      if (msg?.type === 'text' && msg.from && msg.text?.body) {
        from = msg.from; text = msg.text.body
      }
      break
    }
    default: break
  }

  if (from && text) {
    await handleApprovalReply(from, text)
  }

  return NextResponse.json({ received: true })
}
