// Cerebro del bot de Telegram: vinculación, ingesta de flyers, Q&A de campos
// faltantes, aprobación con botones y programación. Reemplaza el circuito
// WhatsApp/YCloud de padelpost-ai.

import { prismaAdmin } from '@/lib/prisma-admin'
import { Prisma } from '@/generated/prisma/client'
import { uploadFile } from '@/lib/storage'
import {
  analyzeFlyer, generateCaption, cleanFieldValue, buildEventSlides,
  missingFields, type ExtractedFlyer,
} from '@/features/ingest/flyer-ingest'
import { pickBackgroundImage } from '@/features/ingest/player-image'
import { PALETTES, getPaletteByColor } from '@/features/design/palettes'
import { renderCarouselMedia } from '@/features/publishing/services/render-event-media'
import { publishToInstagram } from '@/features/scheduler/services/instagram-publish'
import { tgSendMessage, tgAnswerCallback, tgDownloadFile } from './telegram'

// ── Tipos del update de Telegram (solo lo que usamos) ─────────────────────
type TgUpdate = {
  message?: {
    message_id: number
    chat: { id: number }
    text?: string
    photo?: Array<{ file_id: string; width: number; height: number }>
    document?: { file_id: string; mime_type?: string }
  }
  callback_query?: {
    id: string
    data?: string
    message?: { message_id: number; chat: { id: number } }
  }
}

type ChatState =
  | { mode: 'awaiting_field'; carouselId: string }
  | { mode: 'awaiting_schedule'; carouselId: string }
  | { mode: 'awaiting_client'; pendingFileId: string }

async function getState(chatId: string): Promise<ChatState | null> {
  const row = await prismaAdmin.telegramChatState.findUnique({ where: { chatId } })
  return (row?.state as ChatState | null) ?? null
}

async function setState(chatId: string, state: ChatState | null): Promise<void> {
  const value = state === null ? Prisma.DbNull : (state as unknown as Prisma.InputJsonValue)
  await prismaAdmin.telegramChatState.upsert({
    where: { chatId },
    create: { chatId, state: value },
    update: { state: value },
  })
}

// ── Entry point ───────────────────────────────────────────────────────────
export async function handleTelegramUpdate(update: TgUpdate): Promise<void> {
  if (update.callback_query) {
    await handleCallback(update.callback_query)
    return
  }
  const msg = update.message
  if (!msg) return
  const chatId = String(msg.chat.id)

  if (msg.text?.startsWith('/start')) {
    await handleStart(chatId, msg.text)
    return
  }

  const photoFileId = msg.photo?.length
    ? msg.photo[msg.photo.length - 1]!.file_id
    : (msg.document?.mime_type?.startsWith('image/') ? msg.document.file_id : null)

  if (photoFileId) {
    await handleFlyerPhoto(chatId, photoFileId)
    return
  }

  if (msg.text) {
    await handleText(chatId, msg.text.trim())
  }
}

// ── /start CODIGO — vinculación por tenant ────────────────────────────────
async function handleStart(chatId: string, text: string) {
  // Tolerante a pegadas con texto extra: solo el primer token tipo código
  const code = (text.replace(/\/start/g, ' ').match(/[A-Fa-f0-9]{8}/)?.[0] ?? '').toUpperCase()
  if (code) {
    const brand = await prismaAdmin.brandSettings.findFirst({ where: { telegramLinkCode: code } })
    if (brand) {
      await prismaAdmin.brandSettings.update({
        where: { id: brand.id },
        data: { telegramChatId: chatId, telegramLinkCode: null },
      })
      await tgSendMessage(chatId, `✅ Chat vinculado con <b>${brand.brandName ?? 'tu marca'}</b>.\n\nMandame la foto de un flyer y armo la publicación. Si falta un dato te lo pregunto por acá, y cuando esté listo te paso el link para revisar, editar y publicar desde la web.`)
      return
    }
    await tgSendMessage(chatId, '❌ Código de vinculación inválido o ya usado. Generá uno nuevo en Ajustes → Telegram.')
    return
  }
  await tgSendMessage(chatId, '👋 Soy el bot del Content Studio.\n\nPara vincular tu marca: entrá a <b>Ajustes → Telegram</b> en el panel, generá el código y mandámelo así:\n<code>/start TUCODIGO</code>')
}

// ── Foto de flyer → ingesta ───────────────────────────────────────────────
async function handleFlyerPhoto(chatId: string, fileId: string) {
  const brands = await prismaAdmin.brandSettings.findMany({
    where: { telegramChatId: chatId },
    select: { id: true, userId: true, brandName: true, logoUrl: true },
  })

  if (brands.length === 0) {
    await tgSendMessage(chatId, 'Este chat no está vinculado a ninguna marca. Generá el código en Ajustes → Telegram y mandá /start CODIGO.')
    return
  }

  if (brands.length > 1) {
    await setState(chatId, { mode: 'awaiting_client', pendingFileId: fileId })
    await tgSendMessage(chatId, '¿Para qué cliente es este flyer?', [
      brands.map(b => ({ text: b.brandName ?? b.id.slice(0, 6), callback_data: `client:${b.id}` })),
    ])
    return
  }

  await processFlyer(chatId, fileId, brands[0]!.id)
}

async function processFlyer(chatId: string, fileId: string, brandSettingsId: string) {
  const brand = await prismaAdmin.brandSettings.findUnique({
    where: { id: brandSettingsId },
    select: { userId: true, brandName: true, logoUrl: true },
  })
  if (!brand) return

  await tgSendMessage(chatId, '📸 Recibido. Analizando el flyer con IA...')

  const buffer = await tgDownloadFile(fileId)
  if (!buffer) {
    await tgSendMessage(chatId, '❌ No pude descargar la imagen. Probá mandarla de nuevo.')
    return
  }

  const flyerUrl = await uploadFile(buffer, `flyers/${brand.userId}`, 'flyer.jpg')
  const extracted = await analyzeFlyer(buffer.toString('base64'))
  if (!extracted) {
    await tgSendMessage(chatId, '❌ No pude leer los datos del flyer. Mandá una foto más nítida o con mejor luz.')
    return
  }

  const carousel = await prismaAdmin.carousel.create({
    data: {
      userId: brand.userId,
      title: extracted.tournament_name ?? 'Flyer sin nombre',
      status: 'draft',
      publishFormat: 'carousel',
      darkMode: true,
      extractedJson: extracted as object,
      sourceFlyerUrl: flyerUrl,
    },
  })

  const missing = missingFields(extracted)
  if (missing.length > 0) {
    await setState(chatId, { mode: 'awaiting_field', carouselId: carousel.id })
    await tgSendMessage(chatId, `Leí el flyer pero me falta un dato:\n\n❓ ${missing[0]!.question}`)
    return
  }

  await generateAndSendPreview(chatId, carousel.id)
}

// ── Generación de slides + preview con botones ────────────────────────────
async function generateAndSendPreview(chatId: string, carouselId: string, opts?: { excludeBgUrl?: string; keepBg?: boolean }) {
  const carousel = await prismaAdmin.carousel.findUnique({
    where: { id: carouselId },
    select: { id: true, userId: true, extractedJson: true, caption: true, slidesJson: true },
  })
  if (!carousel) return
  const extracted = (carousel.extractedJson ?? {}) as ExtractedFlyer

  const brand = await prismaAdmin.brandSettings.findFirst({
    where: { userId: carousel.userId },
    select: { brandName: true, logoUrl: true, whatsappPhone: true },
  })

  await tgSendMessage(chatId, '🎨 Armando el diseño...')

  let playerImageUrl: string | undefined
  if (opts?.keepBg && Array.isArray(carousel.slidesJson)) {
    // Cambio de colores: mantener el fondo actual
    const first = (carousel.slidesJson as Array<{ data?: { playerImageUrl?: string } }>)[0]
    playerImageUrl = first?.data?.playerImageUrl
  }
  if (!playerImageUrl) {
    playerImageUrl = await pickBackgroundImage(carousel.userId, {
      paletteHex: extracted.primary_color ?? undefined,
      excludeUrl: opts?.excludeBgUrl,
    })
  }
  if (opts?.excludeBgUrl && !playerImageUrl) {
    await tgSendMessage(chatId, 'No hay más fondos en la biblioteca para alternar. Subí más imágenes con etiqueta "jugador".')
    return
  }
  const igHandle = brand?.brandName ? `@${brand.brandName.toLowerCase().replace(/[^a-z0-9_.]/g, '')}` : undefined
  const slides = buildEventSlides(extracted, {
    brandName: brand?.brandName,
    logoUrl: brand?.logoUrl,
    whatsappPhone: brand?.whatsappPhone,
    igHandle,
  }, { playerImageUrl })

  const caption = carousel.caption ?? await generateCaption(extracted)

  const title = extracted.tournament_name ?? 'Flyer'
  await prismaAdmin.carousel.update({
    where: { id: carouselId },
    data: {
      title,
      slidesJson: slides as unknown as object,
      slidesCount: slides.length,
      caption,
      status: 'review',
    },
  })

  // La revisión, edición y publicación se hacen en la web (pedido del
  // operador): acá solo se avisa con el link directo a la pieza.
  // Sin render en la ingesta → el bot responde en segundos.
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://reserflow.reserplus.com'
  await tgSendMessage(
    chatId,
    `✅ <b>${title}</b> está listo para revisar.\n\n✏️ Editá colores, fondo y datos, mirá la animación con play y publicá desde acá (PC o celu):\n${base}/dashboard/flyers?piece=${carouselId}`,
  )
  await setState(chatId, null)
}

// ── Respuestas de texto (state machine) ───────────────────────────────────
async function handleText(chatId: string, text: string) {
  const state = await getState(chatId)

  if (state?.mode === 'awaiting_field') {
    const carousel = await prismaAdmin.carousel.findUnique({
      where: { id: state.carouselId },
      select: { id: true, extractedJson: true },
    })
    if (!carousel) { await setState(chatId, null); return }

    const extracted = (carousel.extractedJson ?? {}) as ExtractedFlyer
    const missing = missingFields(extracted)
    if (missing.length === 0) { await generateAndSendPreview(chatId, state.carouselId); return }

    const field = missing[0]!
    const cleaned = await cleanFieldValue(String(field.key), field.question, text)
    const updated = { ...extracted, [field.key]: cleaned }
    await prismaAdmin.carousel.update({
      where: { id: carousel.id },
      data: { extractedJson: updated as object },
    })

    const stillMissing = missingFields(updated)
    if (stillMissing.length > 0) {
      await tgSendMessage(chatId, `Anotado ✓\n\n❓ ${stillMissing[0]!.question}`)
      return
    }
    await generateAndSendPreview(chatId, state.carouselId)
    return
  }

  if (state?.mode === 'awaiting_schedule') {
    const date = parseScheduleInput(text)
    if (!date) {
      await tgSendMessage(chatId, 'No entendí la fecha. Formato: <code>dd/mm hh:mm</code> (ej: 15/08 18:00)')
      return
    }
    await prismaAdmin.carousel.update({
      where: { id: state.carouselId },
      data: { status: 'scheduled', scheduledAt: date, failReason: null, retryCount: 0 },
    })
    await setState(chatId, null)
    const shown = date.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Argentina/Buenos_Aires' })
    await tgSendMessage(chatId, `📅 Programado para el <b>${shown}</b>. El cron lo publica solo; te aviso cuando salga.`)
    return
  }

  await tgSendMessage(chatId, 'Mandame la <b>foto de un flyer</b> y armo la publicación. También podés aprobar o programar desde los botones cuando te mande un diseño.')
}

/** "15/08 18:00" o "15/08/2026 18:00" → Date (hora AR/PY, UTC-3). */
function parseScheduleInput(text: string): Date | null {
  const m = text.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s+(\d{1,2}):(\d{2})/)
  if (!m) return null
  const [, dd, mm, yy, hh, min] = m
  const year = yy ? (yy.length === 2 ? 2000 + parseInt(yy) : parseInt(yy)) : new Date().getFullYear()
  const iso = `${year}-${mm!.padStart(2, '0')}-${dd!.padStart(2, '0')}T${hh!.padStart(2, '0')}:${min}:00-03:00`
  const date = new Date(iso)
  if (isNaN(date.getTime())) return null
  // Si quedó en el pasado y no especificó año, asumir año siguiente
  if (date < new Date() && !yy) date.setFullYear(year + 1)
  return date
}

// ── Callbacks de botones ──────────────────────────────────────────────────
async function handleCallback(cb: NonNullable<TgUpdate['callback_query']>) {
  const data = cb.data ?? ''
  const chatId = cb.message ? String(cb.message.chat.id) : null
  const [action, id] = data.split(':')
  if (!chatId || !id) { await tgAnswerCallback(cb.id); return }

  if (action === 'client') {
    const state = await getState(chatId)
    await tgAnswerCallback(cb.id)
    if (state?.mode === 'awaiting_client') {
      await setState(chatId, null)
      await processFlyer(chatId, state.pendingFileId, id)
    }
    return
  }

  if (action === 'approve') {
    await tgAnswerCallback(cb.id, 'Publicando...')
    const carousel = await prismaAdmin.carousel.findUnique({
      where: { id },
      select: { id: true, userId: true, title: true, caption: true, slideImageUrls: true, slidesJson: true, darkMode: true },
    })
    if (!carousel) { await tgSendMessage(chatId, '❌ Publicación no encontrada.'); return }

    let urls: string[] = []
    try { urls = JSON.parse(carousel.slideImageUrls ?? '[]') as string[] } catch { /* vacío */ }
    if (urls.length === 0) {
      // Diseño cambiado desde el panel → re-render con el diseño vigente
      const { normalizeSlides } = await import('@/features/content-studio/slide-utils')
      const slides = normalizeSlides(carousel.slidesJson)
      if (slides.length === 0) {
        await tgSendMessage(chatId, '❌ No hay slides para renderizar. Abrí el Studio.')
        return
      }
      await tgSendMessage(chatId, '🎨 Renderizando con el diseño actual... (~1 min)')
      const rendered = await renderCarouselMedia({ carouselId: id, userId: carousel.userId, slides, dark: carousel.darkMode })
      if ('error' in rendered) {
        await tgSendMessage(chatId, `❌ Error renderizando: ${rendered.error}`)
        return
      }
      urls = rendered.urls
      await prismaAdmin.carousel.update({ where: { id }, data: { slideImageUrls: JSON.stringify(urls) } })
    }

    await tgSendMessage(chatId, '🚀 Publicando en Instagram...')
    const result = await publishToInstagram({
      carouselId: carousel.id,
      imageUrls: urls,
      caption: carousel.caption ?? carousel.title,
      userId: carousel.userId,
    })
    if ('error' in result && result.error) {
      await tgSendMessage(chatId, `❌ Instagram rechazó la publicación:\n${result.error}`)
    } else {
      const permalink = 'permalink' in result ? result.permalink : undefined
      await tgSendMessage(chatId, `✅ <b>${carousel.title}</b> publicado en Instagram.${permalink ? `\n${permalink}` : ''}`)
    }
    return
  }

  if (action === 'schedule') {
    await tgAnswerCallback(cb.id)
    await setState(chatId, { mode: 'awaiting_schedule', carouselId: id })
    await tgSendMessage(chatId, '¿Para cuándo lo programo? Formato: <code>dd/mm hh:mm</code> (hora AR/PY)')
    return
  }

  if (action === 'bg') {
    await tgAnswerCallback(cb.id, 'Cambiando fondo...')
    const carousel = await prismaAdmin.carousel.findUnique({
      where: { id },
      select: { slidesJson: true },
    })
    let currentBg: string | undefined
    if (Array.isArray(carousel?.slidesJson)) {
      const first = (carousel.slidesJson as Array<{ data?: { playerImageUrl?: string } }>)[0]
      currentBg = first?.data?.playerImageUrl
    }
    await generateAndSendPreview(chatId, id, { excludeBgUrl: currentBg })
    return
  }

  if (action === 'pal') {
    const carousel = await prismaAdmin.carousel.findUnique({
      where: { id },
      select: { extractedJson: true },
    })
    if (!carousel) { await tgAnswerCallback(cb.id); return }
    const extracted = (carousel.extractedJson ?? {}) as ExtractedFlyer
    const currentId = extracted.palette_id
      ?? (extracted.primary_color ? getPaletteByColor(extracted.primary_color).id : PALETTES[0]!.id)
    const idx = PALETTES.findIndex(p => p.id === currentId)
    const next = PALETTES[(idx + 1) % PALETTES.length]!
    await prismaAdmin.carousel.update({
      where: { id },
      data: { extractedJson: { ...extracted, palette_id: next.id } as object },
    })
    await tgAnswerCallback(cb.id, `Paleta: ${next.name}`)
    await generateAndSendPreview(chatId, id, { keepBg: true })
    return
  }

  if (action === 'reject') {
    await tgAnswerCallback(cb.id, 'Rechazado')
    await prismaAdmin.carousel.update({ where: { id }, data: { status: 'draft' } })
    await tgSendMessage(chatId, '❌ Rechazado. Quedó como borrador en el Studio por si querés retocarlo.')
    return
  }

  await tgAnswerCallback(cb.id)
}
