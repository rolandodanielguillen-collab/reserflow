'use server'

import { auth } from '@/lib/auth'
import { prismaAdmin } from '@/lib/prisma-admin'

export type CampaignRow = {
  id: string
  name: string
  objective: string | null
  startDate: string | null
  endDate: string | null
  budget: number | null
  status: string
  pieces: number
  published: number
  reach: number
  likes: number
}

export type CampaignPiece = {
  id: string
  title: string
  status: string
  scheduledAt: string | null
  permalink: string | null
  reach: number | null
  likes: number | null
  comments: number | null
  saved: number | null
}

async function requireUser(): Promise<string | null> {
  const session = await auth()
  return session?.user?.id ?? null
}

export async function listCampaigns(): Promise<CampaignRow[]> {
  const userId = await requireUser()
  if (!userId) return []

  const campaigns = await prismaAdmin.campaign.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { carousels: { select: { id: true, status: true } } },
  })

  const allIds = campaigns.flatMap(c => c.carousels.map(x => x.id))
  const insights = allIds.length
    ? await prismaAdmin.postInsight.findMany({ where: { carouselId: { in: allIds } } })
    : []
  const insightBy = new Map(insights.map(i => [i.carouselId, i]))

  return campaigns.map(c => {
    let reach = 0, likes = 0
    for (const piece of c.carousels) {
      const ins = insightBy.get(piece.id)
      reach += ins?.reach ?? 0
      likes += ins?.likes ?? 0
    }
    return {
      id: c.id,
      name: c.name,
      objective: c.objective,
      startDate: c.startDate?.toISOString() ?? null,
      endDate: c.endDate?.toISOString() ?? null,
      budget: c.budget,
      status: c.status,
      pieces: c.carousels.length,
      published: c.carousels.filter(x => x.status === 'published').length,
      reach,
      likes,
    }
  })
}

export async function createCampaign(input: {
  name: string
  objective?: string
  startDate?: string
  endDate?: string
  budget?: number
}): Promise<{ id?: string; error?: string }> {
  const userId = await requireUser()
  if (!userId) return { error: 'No autenticado' }
  if (!input.name.trim()) return { error: 'Poné un nombre' }

  const campaign = await prismaAdmin.campaign.create({
    data: {
      userId,
      name: input.name.trim(),
      objective: input.objective?.trim() || null,
      startDate: input.startDate ? new Date(input.startDate) : null,
      endDate: input.endDate ? new Date(input.endDate) : null,
      budget: input.budget ?? null,
    },
  })
  return { id: campaign.id }
}

export async function deleteCampaign(id: string): Promise<{ success?: boolean; error?: string }> {
  const userId = await requireUser()
  if (!userId) return { error: 'No autenticado' }
  // Las piezas quedan sin campaña (SetNull), no se borran
  const deleted = await prismaAdmin.campaign.deleteMany({ where: { id, userId } })
  if (deleted.count === 0) return { error: 'Campaña no encontrada' }
  return { success: true }
}

export async function getCampaignPieces(campaignId: string): Promise<CampaignPiece[]> {
  const userId = await requireUser()
  if (!userId) return []

  const pieces = await prismaAdmin.carousel.findMany({
    where: { userId, campaignId },
    orderBy: { scheduledAt: 'asc' },
    select: { id: true, title: true, status: true, scheduledAt: true, instagramPermalink: true },
  })
  const insights = await prismaAdmin.postInsight.findMany({
    where: { carouselId: { in: pieces.map(p => p.id) } },
  })
  const by = new Map(insights.map(i => [i.carouselId, i]))

  return pieces.map(p => ({
    id: p.id,
    title: p.title,
    status: p.status,
    scheduledAt: p.scheduledAt?.toISOString() ?? null,
    permalink: p.instagramPermalink,
    reach: by.get(p.id)?.reach ?? null,
    likes: by.get(p.id)?.likes ?? null,
    comments: by.get(p.id)?.comments ?? null,
    saved: by.get(p.id)?.saved ?? null,
  }))
}

/** Carruseles del usuario sin campaña (para asignar). */
export async function listUnassignedPieces(): Promise<Array<{ id: string; title: string; status: string }>> {
  const userId = await requireUser()
  if (!userId) return []
  const pieces = await prismaAdmin.carousel.findMany({
    where: { userId, campaignId: null },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: { id: true, title: true, status: true },
  })
  return pieces
}

export async function assignPiecesToCampaign(campaignId: string, carouselIds: string[]): Promise<{ success?: boolean; error?: string }> {
  const userId = await requireUser()
  if (!userId) return { error: 'No autenticado' }
  const campaign = await prismaAdmin.campaign.findFirst({ where: { id: campaignId, userId } })
  if (!campaign) return { error: 'Campaña no encontrada' }
  await prismaAdmin.carousel.updateMany({
    where: { id: { in: carouselIds }, userId },
    data: { campaignId },
  })
  return { success: true }
}

export async function removePieceFromCampaign(carouselId: string): Promise<{ success?: boolean }> {
  const userId = await requireUser()
  if (!userId) return {}
  await prismaAdmin.carousel.updateMany({
    where: { id: carouselId, userId },
    data: { campaignId: null },
  })
  return { success: true }
}

/** Duplica una campaña con sus piezas como borradores sin fecha. */
export async function duplicateCampaign(id: string): Promise<{ id?: string; error?: string }> {
  const userId = await requireUser()
  if (!userId) return { error: 'No autenticado' }

  const original = await prismaAdmin.campaign.findFirst({
    where: { id, userId },
    include: { carousels: true },
  })
  if (!original) return { error: 'Campaña no encontrada' }

  const copy = await prismaAdmin.campaign.create({
    data: {
      userId,
      name: `${original.name} (copia)`,
      objective: original.objective,
      budget: original.budget,
    },
  })

  for (const piece of original.carousels) {
    await prismaAdmin.carousel.create({
      data: {
        userId,
        campaignId: copy.id,
        title: piece.title,
        caption: piece.caption,
        slidesJson: piece.slidesJson ?? undefined,
        slidesCount: piece.slidesCount,
        slideImageUrls: piece.slideImageUrls,
        publishFormat: piece.publishFormat,
        reelScriptId: piece.reelScriptId,
        darkMode: piece.darkMode,
        templatePieceId: piece.templatePieceId,
        extractedJson: piece.extractedJson ?? undefined,
        status: 'draft',
      },
    })
  }

  return { id: copy.id }
}
