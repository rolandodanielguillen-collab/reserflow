import { prismaAdmin } from '@/lib/prisma-admin'
import { notifyOperator } from '@/features/telegram/notify'

const WARN_AFTER_DAYS = 50 // long-lived de Meta vence a los 60
const REWARN_EVERY_DAYS = 5

/**
 * Avisa por Telegram cuando el token de Meta está por vencer.
 * Lo llama el cron de publicación (barato: un findMany chico).
 */
export async function warnExpiringMetaTokens(): Promise<void> {
  const now = Date.now()
  const brands = await prismaAdmin.brandSettings.findMany({
    where: { metaTokenUpdatedAt: { not: null } },
    select: { id: true, userId: true, brandName: true, metaTokenUpdatedAt: true, metaTokenWarnedAt: true },
  })

  for (const b of brands) {
    const ageDays = (now - b.metaTokenUpdatedAt!.getTime()) / 86_400_000
    if (ageDays < WARN_AFTER_DAYS) continue
    const warnedDays = b.metaTokenWarnedAt ? (now - b.metaTokenWarnedAt.getTime()) / 86_400_000 : Infinity
    if (warnedDays < REWARN_EVERY_DAYS) continue

    const daysLeft = Math.max(0, Math.round(60 - ageDays))
    await notifyOperator(
      b.userId,
      `⚠️ El token de Instagram de <b>${b.brandName ?? 'tu marca'}</b> vence en ~${daysLeft} días.\nRenoválo en Ajustes antes de que las publicaciones empiecen a fallar.`,
    ).catch(() => {})
    await prismaAdmin.brandSettings.update({
      where: { id: b.id },
      data: { metaTokenWarnedAt: new Date() },
    })
  }
}
