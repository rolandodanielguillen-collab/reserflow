import { prismaAdmin } from '@/lib/prisma-admin'
import { tgSendMessage } from './telegram'

/**
 * Notificación al operador del tenant: Telegram primero (gratis),
 * YCloud/WhatsApp como fallback legacy si no hay chat vinculado.
 */
export async function notifyOperator(userId: string, text: string): Promise<void> {
  const brand = await prismaAdmin.brandSettings.findFirst({
    where: { userId },
    select: { telegramChatId: true, whatsappPhone: true },
  })
  if (!brand) return

  if (brand.telegramChatId && process.env.TELEGRAM_BOT_TOKEN) {
    await tgSendMessage(brand.telegramChatId, text)
    return
  }

  // Fallback legacy WhatsApp (se elimina cuando todos los tenants estén en Telegram)
  const ycApiKey = process.env.YCLOUD_API_KEY
  const ycFrom = process.env.YCLOUD_WHATSAPP_FROM
  if (brand.whatsappPhone && ycApiKey && ycFrom) {
    await fetch('https://api.ycloud.com/v2/whatsapp/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': ycApiKey },
      body: JSON.stringify({ from: ycFrom, to: brand.whatsappPhone, type: 'text', text: { body: text.replace(/<[^>]+>/g, '') } }),
    }).catch((e) => console.error('[notify] WA fallback failed:', e))
  }
}
