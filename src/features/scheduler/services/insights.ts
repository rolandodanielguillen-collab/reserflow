import { prismaAdmin } from '@/lib/prisma-admin'
import { decryptSecret } from '@/lib/crypto'

const BASE = 'https://graph.facebook.com/v21.0'

/**
 * Refresca métricas orgánicas (reach/likes/comments/saved/shares) de las
 * publicaciones de los últimos 60 días cuyo insight falta o tiene >24h.
 * Auto-paced: máx 10 por corrida, lo llama el cron cada 5 min.
 */
export async function refreshStaleInsights(): Promise<number> {
  const cutoff = new Date(Date.now() - 60 * 86_400_000)
  const staleBefore = new Date(Date.now() - 24 * 3_600_000)

  const published = await prismaAdmin.carousel.findMany({
    where: {
      status: 'published',
      instagramPostId: { not: null },
      publishedAt: { gte: cutoff },
    },
    select: { id: true, userId: true, instagramPostId: true },
    take: 200,
  })
  if (published.length === 0) return 0

  const insights = await prismaAdmin.postInsight.findMany({
    where: { carouselId: { in: published.map(p => p.id) } },
    select: { carouselId: true, fetchedAt: true },
  })
  const byCarousel = new Map(insights.map(i => [i.carouselId, i.fetchedAt]))

  const due = published.filter(p => {
    const fetched = byCarousel.get(p.id)
    return !fetched || fetched < staleBefore
  }).slice(0, 10)

  let done = 0
  const tokenCache = new Map<string, string | null>()

  for (const post of due) {
    try {
      let token = tokenCache.get(post.userId)
      if (token === undefined) {
        const brand = await prismaAdmin.brandSettings.findFirst({
          where: { userId: post.userId },
          select: { metaAccessToken: true },
        })
        token = brand?.metaAccessToken ? decryptSecret(brand.metaAccessToken) : null
        tokenCache.set(post.userId, token)
      }
      if (!token) continue

      const mediaId = post.instagramPostId!
      const [fieldsRes, insightsRes] = await Promise.all([
        fetch(`${BASE}/${mediaId}?fields=like_count,comments_count&access_token=${token}`),
        fetch(`${BASE}/${mediaId}/insights?metric=reach,saved,shares&access_token=${token}`),
      ])

      const fields = (await fieldsRes.json()) as { like_count?: number; comments_count?: number; error?: unknown }
      const ins = (await insightsRes.json()) as { data?: Array<{ name: string; values?: Array<{ value: number }> }>; error?: unknown }

      const metric = (name: string): number | null => {
        const m = ins.data?.find(d => d.name === name)
        return m?.values?.[0]?.value ?? null
      }

      await prismaAdmin.postInsight.upsert({
        where: { carouselId: post.id },
        create: {
          carouselId: post.id,
          reach: metric('reach'),
          likes: fields.like_count ?? null,
          comments: fields.comments_count ?? null,
          saved: metric('saved'),
          shares: metric('shares'),
        },
        update: {
          reach: metric('reach'),
          likes: fields.like_count ?? null,
          comments: fields.comments_count ?? null,
          saved: metric('saved'),
          shares: metric('shares'),
        },
      })
      done++
    } catch (err) {
      console.error('[insights]', post.id, err)
    }
  }

  if (done > 0) console.log(`[insights] refrescados ${done}`)
  return done
}
