import { prismaAdmin } from '@/lib/prisma-admin'
import { encryptSecret, decryptSecret } from '@/lib/crypto'
import { notifyOperator } from '@/features/telegram/notify'

const REFRESH_AFTER_DAYS = 45 // renovar antes de que venza (long-lived = 60d)
const WARN_AFTER_DAYS = 50    // si la renovación automática falla, avisar
const REWARN_EVERY_DAYS = 5

type MetaApp = { id: string; secret: string }

function configuredApps(): MetaApp[] {
  const apps: MetaApp[] = []
  if (process.env.META_APP_ID && process.env.META_APP_SECRET) {
    apps.push({ id: process.env.META_APP_ID, secret: process.env.META_APP_SECRET })
  }
  if (process.env.META_APP_ID_2 && process.env.META_APP_SECRET_2) {
    apps.push({ id: process.env.META_APP_ID_2, secret: process.env.META_APP_SECRET_2 })
  }
  return apps
}

async function exchangeToken(current: string, app: MetaApp): Promise<string | null> {
  try {
    const res = await (await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${app.id}&client_secret=${app.secret}&fb_exchange_token=${current}`,
    )).json() as { access_token?: string; error?: { message?: string } }
    return res.access_token ?? null
  } catch {
    return null
  }
}

/**
 * Mantiene vivos los tokens de Meta: a los 45 días los renueva solo
 * (fb_exchange_token → nuevo long-lived de 60d). Si no puede (app sin
 * credenciales configuradas), avisa por Telegram como antes.
 * Lo llama el cron de publicación.
 */
export async function warnExpiringMetaTokens(): Promise<void> {
  const now = Date.now()
  const apps = configuredApps()
  const brands = await prismaAdmin.brandSettings.findMany({
    where: { metaTokenUpdatedAt: { not: null } },
    select: { id: true, userId: true, brandName: true, metaAccessToken: true, metaTokenUpdatedAt: true, metaTokenWarnedAt: true },
  })

  for (const b of brands) {
    const ageDays = (now - b.metaTokenUpdatedAt!.getTime()) / 86_400_000
    if (ageDays < REFRESH_AFTER_DAYS) continue

    // 1) Intento de renovación automática
    if (apps.length > 0 && b.metaAccessToken) {
      const current = decryptSecret(b.metaAccessToken)
      for (const app of apps) {
        const fresh = current ? await exchangeToken(current, app) : null
        if (fresh) {
          await prismaAdmin.brandSettings.update({
            where: { id: b.id },
            data: { metaAccessToken: encryptSecret(fresh), metaTokenUpdatedAt: new Date(), metaTokenWarnedAt: null },
          })
          console.log(`[token-watch] token de ${b.brandName} renovado automáticamente`)
          await notifyOperator(b.userId, `🔄 Token de Instagram de <b>${b.brandName ?? 'tu marca'}</b> renovado automáticamente por 60 días más.`).catch(() => {})
          break
        }
      }
      // recargar para saber si se renovó
      const check = await prismaAdmin.brandSettings.findUnique({ where: { id: b.id }, select: { metaTokenUpdatedAt: true } })
      if (check?.metaTokenUpdatedAt && (now - check.metaTokenUpdatedAt.getTime()) / 86_400_000 < REFRESH_AFTER_DAYS) continue
    }

    // 2) Renovación imposible → aviso manual como antes
    if (ageDays < WARN_AFTER_DAYS) continue
    const warnedDays = b.metaTokenWarnedAt ? (now - b.metaTokenWarnedAt.getTime()) / 86_400_000 : Infinity
    if (warnedDays < REWARN_EVERY_DAYS) continue

    const daysLeft = Math.max(0, Math.round(60 - ageDays))
    await notifyOperator(
      b.userId,
      `⚠️ El token de Instagram de <b>${b.brandName ?? 'tu marca'}</b> vence en ~${daysLeft} días y no pude renovarlo solo.\nGenerá uno nuevo y pegámelo, o cargalo en Ajustes.`,
    ).catch(() => {})
    await prismaAdmin.brandSettings.update({
      where: { id: b.id },
      data: { metaTokenWarnedAt: new Date() },
    })
  }
}
