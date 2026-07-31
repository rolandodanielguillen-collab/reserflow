'use server'

import { auth } from '@/lib/auth'
import { prismaAdmin } from '@/lib/prisma-admin'
import { isMetaAdsConnected } from './meta-ads-service'

export type AdIntentRow = {
  id: string
  carouselTitle: string | null
  budget: number | null
  durationDays: number | null
  status: string
  createdAt: string
}

/** Guarda la intención de promocionar un post. Se ejecuta al conectar Meta Ads. */
export async function createAdIntent(input: {
  carouselId?: string
  campaignId?: string
  budget?: number
  durationDays?: number
}): Promise<{ id?: string; error?: string; connected?: boolean }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'No autenticado' }

  const intent = await prismaAdmin.adIntent.create({
    data: {
      userId: session.user.id,
      carouselId: input.carouselId ?? null,
      campaignId: input.campaignId ?? null,
      budget: input.budget ?? null,
      durationDays: input.durationDays ?? 7,
      objective: 'boost',
      status: 'sin_conexion',
    },
  })
  return { id: intent.id, connected: isMetaAdsConnected() }
}

export async function listAdIntents(): Promise<{ connected: boolean; intents: AdIntentRow[] }> {
  const session = await auth()
  if (!session?.user?.id) return { connected: false, intents: [] }

  const intents = await prismaAdmin.adIntent.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  const carouselIds = intents.map(i => i.carouselId).filter((x): x is string => !!x)
  const carousels = carouselIds.length
    ? await prismaAdmin.carousel.findMany({ where: { id: { in: carouselIds } }, select: { id: true, title: true } })
    : []
  const titleBy = new Map(carousels.map(c => [c.id, c.title]))

  return {
    connected: isMetaAdsConnected(),
    intents: intents.map(i => ({
      id: i.id,
      carouselTitle: i.carouselId ? (titleBy.get(i.carouselId) ?? null) : null,
      budget: i.budget,
      durationDays: i.durationDays,
      status: i.status,
      createdAt: i.createdAt.toISOString(),
    })),
  }
}

export async function cancelAdIntent(id: string): Promise<{ success?: boolean }> {
  const session = await auth()
  if (!session?.user?.id) return {}
  await prismaAdmin.adIntent.deleteMany({ where: { id, userId: session.user.id, status: 'sin_conexion' } })
  return { success: true }
}
