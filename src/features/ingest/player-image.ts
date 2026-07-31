import { prismaAdmin } from '@/lib/prisma-admin'

/**
 * Elige la imagen de jugador menos usada de la biblioteca del tenant
 * (rotación simple). Registra el uso.
 * ponytail: scoring por color/espacio de texto llega en F4; rotación alcanza hoy.
 */
export async function pickPlayerImage(userId: string): Promise<string | undefined> {
  const assets = await prismaAdmin.asset.findMany({
    where: { userId },
    orderBy: [{ lastUsedAt: 'asc' }],
    take: 200,
  })
  const players = assets.filter(a => Array.isArray(a.tags) && (a.tags as unknown[]).includes('jugador'))
  const pick = players[0]
  if (!pick) return undefined

  await prismaAdmin.asset.update({
    where: { id: pick.id },
    data: { useCount: { increment: 1 }, lastUsedAt: new Date() },
  })
  return pick.url
}
