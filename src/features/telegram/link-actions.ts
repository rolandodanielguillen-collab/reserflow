'use server'

import crypto from 'crypto'
import { auth } from '@/lib/auth'
import { prismaAdmin } from '@/lib/prisma-admin'

/** Genera un código de vinculación de un solo uso para el bot de Telegram. */
export async function generateTelegramLinkCode(): Promise<{ code?: string; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'No autenticado' }

  const code = crypto.randomBytes(4).toString('hex').toUpperCase()
  const existing = await prismaAdmin.brandSettings.findFirst({ where: { userId: session.user.id } })
  if (!existing) return { error: 'Primero guardá tus ajustes de marca.' }

  await prismaAdmin.brandSettings.update({
    where: { id: existing.id },
    data: { telegramLinkCode: code },
  })
  return { code }
}

export async function getTelegramLinkStatus(): Promise<{ linked: boolean; botUsername?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { linked: false }
  const brand = await prismaAdmin.brandSettings.findFirst({
    where: { userId: session.user.id },
    select: { telegramChatId: true },
  })
  return { linked: !!brand?.telegramChatId, botUsername: process.env.TELEGRAM_BOT_USERNAME }
}

export async function unlinkTelegram(): Promise<{ success?: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'No autenticado' }
  await prismaAdmin.brandSettings.updateMany({
    where: { userId: session.user.id },
    data: { telegramChatId: null, telegramLinkCode: null },
  })
  return { success: true }
}
