'use server'

import { auth } from '@/lib/auth'
import { prismaAdmin } from '@/lib/prisma-admin'
import { deleteFile } from '@/lib/storage'
import { openaiChat } from '@/features/ingest/flyer-ingest'

export type AssetRow = {
  id: string
  url: string
  filename: string
  width: number | null
  height: number | null
  tags: string[]
  dominantColors: string[]
  useCount: number
  lastUsedAt: string | null
  createdAt: string
}

function toRow(a: {
  id: string; url: string; filename: string; width: number | null; height: number | null
  tags: unknown; dominantColors: unknown; useCount: number; lastUsedAt: Date | null; createdAt: Date
}): AssetRow {
  return {
    id: a.id,
    url: a.url,
    filename: a.filename,
    width: a.width,
    height: a.height,
    tags: Array.isArray(a.tags) ? (a.tags as string[]) : [],
    dominantColors: Array.isArray(a.dominantColors) ? (a.dominantColors as string[]) : [],
    useCount: a.useCount,
    lastUsedAt: a.lastUsedAt ? a.lastUsedAt.toISOString() : null,
    createdAt: a.createdAt.toISOString(),
  }
}

export async function listAssets(): Promise<AssetRow[]> {
  const session = await auth()
  if (!session?.user?.id) return []
  const assets = await prismaAdmin.asset.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  })
  return assets.map(toRow)
}

export async function deleteAsset(id: string): Promise<{ success?: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'No autenticado' }
  const asset = await prismaAdmin.asset.findFirst({ where: { id, userId: session.user.id } })
  if (!asset) return { error: 'Imagen no encontrada' }
  await deleteFile(asset.url).catch(() => {})
  await prismaAdmin.asset.delete({ where: { id } })
  return { success: true }
}

export async function updateAssetTags(id: string, tags: string[]): Promise<{ success?: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'No autenticado' }
  const updated = await prismaAdmin.asset.updateMany({
    where: { id, userId: session.user.id },
    data: { tags: tags.map(t => t.trim().toLowerCase()).filter(Boolean) },
  })
  if (updated.count === 0) return { error: 'Imagen no encontrada' }
  return { success: true }
}

/**
 * Crea una publicación directa desde diseños ya listos de la biblioteca:
 * las imágenes seleccionadas SON los slides (no se renderiza nada).
 */
export async function createPostFromAssets(
  assetIds: string[],
  title: string,
  caption: string,
): Promise<{ id?: string; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'No autenticado' }
  if (assetIds.length === 0) return { error: 'Elegí al menos una imagen' }
  if (assetIds.length > 10) return { error: 'Instagram permite máximo 10 imágenes por carrusel' }
  if (!title.trim()) return { error: 'Poné un título' }

  const assets = await prismaAdmin.asset.findMany({
    where: { id: { in: assetIds }, userId: session.user.id },
  })
  const byId = new Map(assets.map(a => [a.id, a]))
  const urls = assetIds.map(id => byId.get(id)?.url).filter((u): u is string => !!u)
  if (urls.length === 0) return { error: 'Imágenes no encontradas' }

  const carousel = await prismaAdmin.carousel.create({
    data: {
      userId: session.user.id,
      title: title.trim(),
      caption: caption.trim() || title.trim(),
      status: 'draft',
      publishFormat: 'carousel',
      slideImageUrls: JSON.stringify(urls),
      slidesCount: urls.length,
      darkMode: true,
    },
  })

  await prismaAdmin.asset.updateMany({
    where: { id: { in: assetIds } },
    data: { useCount: { increment: 1 }, lastUsedAt: new Date() },
  })

  return { id: carousel.id }
}

/** Caption con IA para una publicación desde biblioteca, con la voz de la marca. */
export async function aiCaptionFromText(topic: string): Promise<{ caption?: string; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'No autenticado' }

  const brand = await prismaAdmin.brandSettings.findFirst({
    where: { userId: session.user.id },
    select: { brandName: true, brandVoice: true, targetAudience: true },
  })

  const content = await openaiChat({
    model: 'gpt-4o-mini',
    max_tokens: 500,
    temperature: 0.8,
    messages: [
      {
        role: 'system',
        content: `Redactas captions de Instagram en español para la marca "${brand?.brandName ?? ''}". ${brand?.brandVoice ? `Voz de marca: ${brand.brandVoice}.` : ''} ${brand?.targetAudience ? `Audiencia: ${brand.targetAudience}.` : ''} Terminas siempre con hashtags relevantes.`,
      },
      {
        role: 'user',
        content: `Escribí un caption para esta publicación: ${topic}\n\n- Máximo 2.200 caracteres\n- Gancho inicial, datos clave, llamada a la acción\n- 10-15 hashtags al final\n- Emojis con moderación\n\nDevolvé SOLO el caption.`,
      },
    ],
  }, 30000)

  if (!content) return { error: 'No se pudo generar el caption' }
  return { caption: content }
}
