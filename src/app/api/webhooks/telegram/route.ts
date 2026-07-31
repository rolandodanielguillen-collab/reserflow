import { NextResponse } from 'next/server'
import { handleTelegramUpdate } from '@/features/telegram/handle-update'

// Webhook del bot de Telegram. Configurar con:
// setWebhook?url=https://.../api/webhooks/telegram&secret_token=$TELEGRAM_WEBHOOK_SECRET
export async function POST(request: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (secret && request.headers.get('x-telegram-bot-api-secret-token') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let update: unknown
  try {
    update = await request.json()
  } catch {
    return NextResponse.json({ ok: true })
  }

  try {
    await handleTelegramUpdate(update as Parameters<typeof handleTelegramUpdate>[0])
  } catch (err) {
    // Siempre 200: si devolvemos error, Telegram reintenta en loop
    console.error('[telegram webhook] error:', err)
  }

  return NextResponse.json({ ok: true })
}
