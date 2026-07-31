// MetaAdsService — MODO PREPARADO.
// El usuario está gestionando la app de Meta + app review (ads_management).
// Mientras tanto: las intenciones de boost se guardan (AdIntent) y este
// servicio queda como único punto a enchufar cuando llegue el token.
//
// Para conectar, setear en .env:
//   META_ADS_ACCESS_TOKEN  → system user token con ads_management
//   META_AD_ACCOUNT_ID     → act_XXXXXXXX
//
// Implementación real del boost (cuando haya conexión):
//   1. GET  /{ig-media-id}?fields=media_url — o usar el post de la página vinculada
//   2. POST /act_{id}/campaigns     {objective: OUTCOME_ENGAGEMENT, status: PAUSED}
//   3. POST /act_{id}/adsets        {daily_budget, targeting, promoted_object}
//   4. POST /act_{id}/adcreatives   {object_story_id | instagram_actor_id + source_instagram_media_id}
//   5. POST /act_{id}/ads           {creative, status: ACTIVE}
// Docs: https://developers.facebook.com/docs/marketing-api/guides/instagram-boost-post

import { prismaAdmin } from '@/lib/prisma-admin'

export function isMetaAdsConnected(): boolean {
  return !!process.env.META_ADS_ACCESS_TOKEN && !!process.env.META_AD_ACCOUNT_ID
}

export type AdsStatus = {
  connected: boolean
  pendingIntents: number
}

export async function getAdsStatus(userId: string): Promise<AdsStatus> {
  const pendingIntents = await prismaAdmin.adIntent.count({
    where: { userId, status: 'sin_conexion' },
  })
  return { connected: isMetaAdsConnected(), pendingIntents }
}

/**
 * Punto de enchufe: cuando la conexión esté activa, procesa las intenciones
 * guardadas. Hoy solo informa que falta la conexión.
 */
export async function executePendingIntents(userId: string): Promise<{ executed: number; skipped: number }> {
  if (!isMetaAdsConnected()) {
    const pending = await prismaAdmin.adIntent.count({ where: { userId, status: 'sin_conexion' } })
    return { executed: 0, skipped: pending }
  }
  // ponytail: implementación real al recibir el token de Marketing API (ver cabecera)
  return { executed: 0, skipped: 0 }
}
