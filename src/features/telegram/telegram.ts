// Cliente mínimo de Telegram Bot API (canal del operador).
// Gratis, sin SDK: fetch directo.

const api = () => {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN no configurado')
  return `https://api.telegram.org/bot${token}`
}

type InlineButton = { text: string; callback_data: string }
export type InlineKeyboard = InlineButton[][]

async function call<T = unknown>(method: string, body: Record<string, unknown>): Promise<T | null> {
  try {
    const res = await fetch(`${api()}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = (await res.json()) as { ok: boolean; result?: T; description?: string }
    if (!json.ok) {
      console.error(`[telegram] ${method} failed:`, json.description)
      return null
    }
    return json.result ?? null
  } catch (err) {
    console.error(`[telegram] ${method} error:`, err)
    return null
  }
}

export async function tgSendMessage(chatId: string, text: string, keyboard?: InlineKeyboard) {
  return call('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    ...(keyboard ? { reply_markup: { inline_keyboard: keyboard } } : {}),
  })
}

export async function tgSendPhoto(chatId: string, photoUrl: string, caption?: string, keyboard?: InlineKeyboard) {
  return call('sendPhoto', {
    chat_id: chatId,
    photo: photoUrl,
    ...(caption ? { caption: caption.slice(0, 1024) } : {}),
    ...(keyboard ? { reply_markup: { inline_keyboard: keyboard } } : {}),
  })
}

/** Manda hasta 10 fotos/videos como álbum (el preview del carrusel). */
export async function tgSendMediaGroup(chatId: string, mediaUrls: string[], caption?: string) {
  const media = mediaUrls.slice(0, 10).map((url, i) => ({
    type: /\.(mp4|mov)(\?|$)/i.test(url) ? 'video' : 'photo',
    media: url,
    ...(i === 0 && caption ? { caption: caption.slice(0, 1024) } : {}),
  }))
  return call('sendMediaGroup', { chat_id: chatId, media })
}

export async function tgAnswerCallback(callbackQueryId: string, text?: string) {
  return call('answerCallbackQuery', { callback_query_id: callbackQueryId, ...(text ? { text } : {}) })
}

export async function tgEditReplyMarkup(chatId: string, messageId: number, keyboard?: InlineKeyboard) {
  return call('editMessageReplyMarkup', {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: { inline_keyboard: keyboard ?? [] },
  })
}

/** Descarga un archivo subido al bot y lo devuelve como Buffer. */
export async function tgDownloadFile(fileId: string): Promise<Buffer | null> {
  const file = await call<{ file_path: string }>('getFile', { file_id: fileId })
  if (!file?.file_path) return null
  const token = process.env.TELEGRAM_BOT_TOKEN
  const res = await fetch(`https://api.telegram.org/file/bot${token}/${file.file_path}`)
  if (!res.ok) return null
  return Buffer.from(await res.arrayBuffer())
}
