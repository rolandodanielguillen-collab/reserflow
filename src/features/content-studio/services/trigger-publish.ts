'use server'

import { prismaAdmin } from '@/lib/prisma-admin'
import { auth } from '@/lib/auth'
import { uploadSlidesToStorage } from '@/features/publishing/services/cloudinary-upload'
import { renderReelToFile } from '@/features/publishing/services/render-reel'
import {
  publishToInstagram,
  publishReelToInstagram,
} from '@/features/scheduler/services/instagram-publish'
import type { SlideOutput } from '@/features/generation/types'

export async function triggerPublishDuePosts(): Promise<{
  processed: number
  results: Array<{ id: string; status: string; reason?: string; postId?: string }>
  error?: string
}> {
  const session = await auth()
  if (!session?.user?.id) return { processed: 0, results: [], error: 'No autenticado' }

  const now = new Date()
  const duePosts = await prismaAdmin.carousel.findMany({
    where: {
      status: 'scheduled',
      userId: session.user.id,
      scheduledAt: { lte: now },
    },
    take: 10,
  })

  if (!duePosts || duePosts.length === 0) {
    return { processed: 0, results: [], error: 'No hay posts programados para ahora' }
  }

  const results: Array<{ id: string; status: string; reason?: string; postId?: string }> = []

  for (const post of duePosts) {
    try {
      await prismaAdmin.carousel.update({
        where: { id: post.id },
        data: { status: 'publishing', failReason: null },
      })

      const isReel = post.publishFormat === 'reel'
      let publishResult: { success?: boolean; postId?: string; permalink?: string; error?: string }

      if (isReel) {
        let videoUrl = post.videoUrl

        if (!videoUrl) {
          const scriptId = (post as Record<string, unknown>).reelScriptId as string | null
          if (!scriptId) {
            const reason = 'publishFormat=reel pero sin videoUrl ni reelScriptId'
            await prismaAdmin.carousel.update({
              where: { id: post.id },
              data: { status: 'failed', failReason: reason },
            })
            results.push({ id: post.id, status: 'failed', reason })
            continue
          }

          const renderResult = await renderReelToFile({
            scriptId,
            dark: post.darkMode,
            cta: '',
            carouselId: post.id,
            userId: post.userId,
          })

          if ('error' in renderResult) {
            const reason = `Remotion render: ${renderResult.error}`
            await prismaAdmin.carousel.update({
              where: { id: post.id },
              data: { status: 'failed', failReason: reason },
            })
            results.push({ id: post.id, status: 'failed', reason })
            continue
          }

          videoUrl = renderResult.url
          await prismaAdmin.carousel.update({
            where: { id: post.id },
            data: { videoUrl },
          })
        }

        publishResult = await publishReelToInstagram({
          carouselId: post.id,
          videoUrl,
          caption: post.caption ?? post.title,
          userId: post.userId,
        })
      } else {
        const preCapUrls: string[] | null = post.slideImageUrls
          ? JSON.parse(post.slideImageUrls)
          : null
        let imageUrls: string[]

        if (preCapUrls && preCapUrls.length > 0) {
          imageUrls = preCapUrls
        } else {
          const slidesJson = post.slidesJson
          if (!slidesJson || (Array.isArray(slidesJson) && slidesJson.length === 0)) {
            const reason = 'slides_json vacío o sin slides'
            await prismaAdmin.carousel.update({
              where: { id: post.id },
              data: { status: 'failed', failReason: reason },
            })
            results.push({ id: post.id, status: 'failed', reason })
            continue
          }

          const slides = slidesJson as SlideOutput[]
          const uploadResult = await uploadSlidesToStorage(post.id, slides)

          if ('error' in uploadResult) {
            const reason = `Upload: ${uploadResult.error}`
            await prismaAdmin.carousel.update({
              where: { id: post.id },
              data: { status: 'failed', failReason: reason },
            })
            results.push({ id: post.id, status: 'failed', reason })
            continue
          }
          imageUrls = uploadResult.urls
        }

        publishResult = await publishToInstagram({
          carouselId: post.id,
          imageUrls,
          caption: post.caption ?? post.title,
          userId: post.userId,
        })
      }

      if (publishResult.error) {
        const reason = `Instagram: ${publishResult.error}`
        await prismaAdmin.carousel.update({
          where: { id: post.id },
          data: { status: 'failed', failReason: reason },
        })
        results.push({ id: post.id, status: 'failed', reason })
      } else {
        results.push({ id: post.id, status: 'published', postId: publishResult.postId })
      }
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'Error desconocido'
      await prismaAdmin.carousel.update({
        where: { id: post.id },
        data: { status: 'failed', failReason: reason },
      })
      results.push({ id: post.id, status: 'failed', reason })
    }
  }

  const processed = results.filter(r => r.status === 'published').length
  return { processed, results }
}
