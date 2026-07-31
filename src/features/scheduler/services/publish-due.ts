import { prismaAdmin } from "@/lib/prisma-admin"
import { notifyOperator } from "@/features/telegram/notify"
import { renderSlideImages } from "@/features/publishing/services/render-slides"
import { renderReelToFile } from "@/features/publishing/services/render-reel"
import { normalizeSlides } from "@/features/content-studio/slide-utils"
import {
  publishToInstagram,
  publishReelToInstagram,
} from "@/features/scheduler/services/instagram-publish"

const MAX_RETRIES = 3

export type PublishDueResult = {
  message: string
  processed: number
  failed: number
  results: Array<{ id: string; status: string; reason?: string; postId?: string }>
  duration_ms: number
}

/**
 * Publica todos los posts vencidos (status scheduled, o failed con reintentos
 * disponibles). Única implementación: la usan el cron del VPS y el botón del
 * Studio. El render de slides es server-side (Remotion) cuando no hay
 * imágenes pre-renderizadas.
 */
export async function publishDuePosts(): Promise<PublishDueResult> {
  const start = Date.now()
  const now = new Date()

  const duePosts = await prismaAdmin.carousel.findMany({
    where: {
      scheduledAt: { lte: now },
      OR: [
        { status: "scheduled" },
        { status: "failed", retryCount: { lt: MAX_RETRIES } },
      ],
    },
    take: 10,
  })

  if (duePosts.length === 0) {
    return { message: "No hay posts pendientes", processed: 0, failed: 0, results: [], duration_ms: Date.now() - start }
  }

  console.log("[publish-due] Found", duePosts.length, "posts to process")

  const settled = await Promise.allSettled(
    duePosts.map(async (post) => {
      const postTag = `[${post.id.slice(0, 8)}]`
      const currentRetry = (post.retryCount ?? 0) + (post.status === "failed" ? 1 : 0)
      try {
        console.log(postTag, "Processing:", post.title, "| format:", post.publishFormat, "| retry:", currentRetry)
        await prismaAdmin.carousel.update({
          where: { id: post.id },
          data: { status: "publishing", retryCount: currentRetry, failReason: null },
        })

        const isReel = post.publishFormat === "reel"
        let publishResult: { success?: boolean; postId?: string; permalink?: string; error?: string }

        if (isReel) {
          let videoUrl = post.videoUrl

          if (!videoUrl) {
            const scriptId = post.reelScriptId
            if (!scriptId) {
              const reason = "publishFormat=reel pero sin videoUrl ni reelScriptId"
              await prismaAdmin.carousel.update({
                where: { id: post.id },
                data: { status: "failed", failReason: reason, retryCount: MAX_RETRIES },
              })
              return { id: post.id, status: "failed", reason }
            }

            console.log(postTag, "Rendering reel with Remotion (script:", scriptId, ") dark:", post.darkMode)
            const renderResult = await renderReelToFile({
              scriptId,
              dark: post.darkMode,
              cta: "",
              carouselId: post.id,
              userId: post.userId,
            })

            if ("error" in renderResult) {
              const reason = `Remotion render: ${renderResult.error}`
              await prismaAdmin.carousel.update({
                where: { id: post.id },
                data: { status: "failed", failReason: reason, retryCount: currentRetry },
              })
              return { id: post.id, status: "failed", reason }
            }

            videoUrl = renderResult.url
            await prismaAdmin.carousel.update({ where: { id: post.id }, data: { videoUrl } })
          }

          console.log(postTag, "Publishing as Reel...")
          publishResult = await publishReelToInstagram({
            carouselId: post.id,
            videoUrl,
            caption: post.caption ?? post.title,
            userId: post.userId,
          })
        } else {
          const preCapUrls = post.slideImageUrls
            ? (post.slideImageUrls.startsWith("[")
                ? (JSON.parse(post.slideImageUrls) as string[])
                : post.slideImageUrls.split(",").map(u => u.trim()).filter(Boolean))
            : []
          let imageUrls: string[]

          if (preCapUrls.length > 0) {
            console.log(postTag, "Using", preCapUrls.length, "pre-rendered slide images")
            imageUrls = preCapUrls
          } else {
            const slides = normalizeSlides(post.slidesJson)
            if (slides.length === 0) {
              const reason = "Sin imágenes renderizadas ni slides_json"
              await prismaAdmin.carousel.update({
                where: { id: post.id },
                data: { status: "failed", failReason: reason, retryCount: MAX_RETRIES },
              })
              return { id: post.id, status: "failed", reason }
            }

            console.log(postTag, "Rendering", slides.length, "slides con Remotion... dark:", post.darkMode)
            const renderResult = await renderSlideImages({
              carouselId: post.id,
              userId: post.userId,
              slides,
              dark: post.darkMode,
            })

            if ("error" in renderResult) {
              const reason = `Render slides: ${renderResult.error}`
              await prismaAdmin.carousel.update({
                where: { id: post.id },
                data: { status: "failed", failReason: reason, retryCount: currentRetry },
              })
              return { id: post.id, status: "failed", reason }
            }
            imageUrls = renderResult.urls
            // Cachear el render: los reintentos no vuelven a renderizar
            await prismaAdmin.carousel.update({
              where: { id: post.id },
              data: { slideImageUrls: JSON.stringify(imageUrls) },
            })
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
            data: { status: "failed", failReason: reason, retryCount: currentRetry },
          })
          if (currentRetry >= MAX_RETRIES - 1) {
            await notifyOperator(post.userId, `❌ Falló la publicación de "${post.title}" (sin más reintentos):\n${reason}`).catch(() => {})
          }
          return { id: post.id, status: "failed", reason }
        }

        console.log(postTag, "PUBLISHED! postId:", publishResult.postId)
        await notifyOperator(
          post.userId,
          `✅ Publicado en Instagram:\n\n${post.title}\n${publishResult.permalink ?? ""}`,
        ).catch(e => console.error(postTag, "notify failed:", e))
        return { id: post.id, status: "published", postId: publishResult.postId }
      } catch (err) {
        const reason = err instanceof Error ? err.message : "Error desconocido"
        console.error(postTag, "EXCEPTION:", reason)
        await prismaAdmin.carousel.update({
          where: { id: post.id },
          data: { status: "failed", failReason: reason, retryCount: currentRetry },
        })
        return { id: post.id, status: "failed", reason }
      }
    })
  )

  const results: Array<{ id: string; status: string; reason?: string; postId?: string }> = []
  for (const r of settled) {
    if (r.status === "fulfilled") results.push(r.value)
  }
  const published = results.filter(r => r.status === "published").length
  const failed = results.filter(r => r.status === "failed").length

  console.log(`[publish-due] === DONE === Published: ${published} | Failed: ${failed} | Time: ${Date.now() - start}ms`)

  return {
    message: `Publicados ${published} de ${duePosts.length} posts`,
    processed: published,
    failed,
    results,
    duration_ms: Date.now() - start,
  }
}

