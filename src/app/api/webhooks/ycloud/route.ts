import { NextResponse } from 'next/server'
import crypto from 'crypto'

/**
 * Webhook handler para eventos de YCloud WhatsApp.
 * Verifica la firma HMAC-SHA256 antes de procesar.
 *
 * Configurar en YCloud Dashboard:
 * URL: https://tu-dominio.com/api/webhooks/ycloud
 * Secret: valor de YCLOUD_WEBHOOK_SECRET
 */
export async function POST(request: Request) {
  const signature = request.headers.get('x-ycloud-signature-256')
  const secret = process.env.YCLOUD_WEBHOOK_SECRET

  if (!secret) {
    return NextResponse.json({ error: 'Webhook secret no configurado' }, { status: 500 })
  }

  const rawBody = await request.text()

  // Verificar firma
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

  // Loggear para debugging (en producción usar un sistema de logs)
  console.log('[YCloud Webhook]', JSON.stringify(payload, null, 2))

  // Procesar eventos según tipo
  const event = payload as { type?: string; data?: unknown }
  switch (event.type) {
    case 'whatsapp.message.updated':
      // Aquí se pueden procesar respuestas del usuario via WhatsApp
      break
    default:
      // Evento no manejado, ignorar silenciosamente
      break
  }

  return NextResponse.json({ received: true })
}
