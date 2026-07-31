import { prismaAdmin } from '@/lib/prisma-admin'
import { renderCarouselMedia } from '@/features/publishing/services/render-event-media'
import { normalizeSlides } from '@/features/content-studio/slide-utils'
import { tgSendMediaGroup, tgSendMessage } from './telegram'

/**
 * Manda el carrusel renderizado al Telegram del operador con botones de
 * aprobación. Renderiza los slides si todavía no hay imágenes.
 * Devuelve false si el tenant no tiene chat vinculado.
 */
export async function sendApprovalToTelegram(carouselId: string): Promise<boolean> {
  if (!process.env.TELEGRAM_BOT_TOKEN) return false

  const carousel = await prismaAdmin.carousel.findUnique({
    where: { id: carouselId },
    select: { id: true, userId: true, title: true, caption: true, slidesJson: true, slideImageUrls: true, darkMode: true },
  })
  if (!carousel) return false

  const brand = await prismaAdmin.brandSettings.findFirst({
    where: { userId: carousel.userId },
    select: { telegramChatId: true, brandName: true },
  })
  if (!brand?.telegramChatId) return false
  const chatId = brand.telegramChatId

  // Imágenes: usar las renderizadas o renderizar ahora
  let urls: string[] = []
  if (carousel.slideImageUrls) {
    try {
      const parsed = JSON.parse(carousel.slideImageUrls) as string[]
      if (Array.isArray(parsed)) urls = parsed
    } catch { /* re-render */ }
  }
  if (urls.length === 0) {
    const slides = normalizeSlides(carousel.slidesJson)
    if (slides.length === 0) {
      await tgSendMessage(chatId, `⚠️ <b>${carousel.title}</b> no tiene slides para renderizar.`)
      return true
    }
    await tgSendMessage(chatId, `🎨 Renderizando <b>${carousel.title}</b>... (~1 min)`)
    const rendered = await renderCarouselMedia({
      carouselId: carousel.id,
      userId: carousel.userId,
      slides,
      dark: carousel.darkMode,
    })
    if ('error' in rendered) {
      await tgSendMessage(chatId, `❌ Error renderizando <b>${carousel.title}</b>:\n${rendered.error}`)
      return true
    }
    urls = rendered.urls
    await prismaAdmin.carousel.update({
      where: { id: carousel.id },
      data: { slideImageUrls: JSON.stringify(urls) },
    })
  }

  await tgSendMediaGroup(chatId, urls, carousel.caption ?? carousel.title)
  await tgSendMessage(
    chatId,
    `<b>${brand.brandName ?? ''}</b> — ¿Aprobás esta publicación?\n📝 ${carousel.title}`,
    [
      [{ text: '✅ Aprobar y publicar', callback_data: `approve:${carousel.id}` }],
      [
        { text: '📅 Programar', callback_data: `schedule:${carousel.id}` },
        { text: '❌ Rechazar', callback_data: `reject:${carousel.id}` },
      ],
    ],
  )
  return true
}
