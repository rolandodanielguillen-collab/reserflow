import { prismaAdmin } from '@/lib/prisma-admin'
import { tgSendMessage } from './telegram'

/**
 * Avisa al operador por Telegram que una pieza espera revisión, con el link
 * directo al Editor de Flyers (la revisión/edición/publicación es en la web,
 * por pedido del operador — sin botones de aprobar en el chat).
 * Devuelve false si el tenant no tiene chat vinculado.
 */
export async function sendApprovalToTelegram(carouselId: string): Promise<boolean> {
  if (!process.env.TELEGRAM_BOT_TOKEN) return false

  const carousel = await prismaAdmin.carousel.findUnique({
    where: { id: carouselId },
    select: { id: true, userId: true, title: true },
  })
  if (!carousel) return false

  const brand = await prismaAdmin.brandSettings.findFirst({
    where: { userId: carousel.userId },
    select: { telegramChatId: true, brandName: true },
  })
  if (!brand?.telegramChatId) return false

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://reserflow.reserplus.com'
  await tgSendMessage(
    brand.telegramChatId,
    `📝 <b>${brand.brandName ?? ''}</b> — "${carousel.title}" espera tu revisión.\n\n✏️ Miralo y publicalo desde acá:\n${base}/dashboard/flyers?piece=${carousel.id}`,
  )
  return true
}
