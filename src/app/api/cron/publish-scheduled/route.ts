import { NextResponse } from "next/server"
import { prismaAdmin } from "@/lib/prisma-admin"
import { uploadSlidesToStorage } from "@/features/publishing/services/cloudinary-upload"
import { renderReelToFile } from "@/features/publishing/services/render-reel"
import {
  publishToInstagram,
  publishReelToInstagram,
} from "@/features/scheduler/services/instagram-publish"

const MAX_RETRIES = 3

export async function GET(request: Request) {
  const start = Date.now()
  console.log("[Cron] === Publish-scheduled START ===", new Date().toISOString())

  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error("[Cron] CRON_SECRET env var is NOT SET")
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 })
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    console.error("[Cron] Auth failed.")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

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
    console.log("[Cron] No posts due. Done in", Date.now() - start, "ms")
    return NextResponse.json({ message: "No hay posts pendientes", processed: 0 })
  }

  console.log("[Cron] Found", duePosts.length, "posts to process")

  const ycApiKey = process.env.YCLOUD_API_KEY
  const ycFrom = process.env.YCLOUD_WHATSAPP_FROM

  const results = await Promise.allSettled(
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
        let publishResult: {
          success?: boolean
          postId?: string
          permalink?: string
          error?: string
        }

        if (isReel) {
          // === REEL PATH ===
          let videoUrl = post.videoUrl

          if (!videoUrl) {
            const scriptId = (post as Record<string, unknown>).reelScriptId as string | null
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
            await prismaAdmin.carousel.update({
              where: { id: post.id },
              data: { videoUrl },
            })
          }

          console.log(postTag, "Publishing as Reel...")
          publishResult = await publishReelToInstagram({
            carouselId: post.id,
            videoUrl,
            caption: post.caption ?? post.title,
            userId: post.userId,
          })
        } else {
          // === CAROUSEL PATH ===
          const preCapUrls = post.slideImageUrls
            ? (post.slideImageUrls.startsWith("[")
                ? (JSON.parse(post.slideImageUrls) as string[])
                : post.slideImageUrls.split(",").map(u => u.trim()).filter(Boolean))
            : []
          let imageUrls: string[]

          if (preCapUrls.length > 0) {
            console.log(postTag, "Using", preCapUrls.length, "pre-captured slide images")
            imageUrls = preCapUrls
          } else {
            const slides = post.slidesJson as Record<string, unknown>[] | null
            if (!slides || slides.length === 0) {
              const reason = "Sin imágenes capturadas ni slides_json"
              await prismaAdmin.carousel.update({
                where: { id: post.id },
                data: { status: "failed", failReason: reason, retryCount: MAX_RETRIES },
              })
              return { id: post.id, status: "failed", reason }
            }

            console.log(postTag, "Rendering", slides.length, "slides server-side... dark:", post.darkMode)
            const uploadResult = await uploadSlidesToStorage(post.id, slides, post.darkMode)

            if ("error" in uploadResult) {
              const reason = `Upload slides: ${uploadResult.error}`
              await prismaAdmin.carousel.update({
                where: { id: post.id },
                data: { status: "failed", failReason: reason, retryCount: currentRetry },
              })
              return { id: post.id, status: "failed", reason }
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
            data: { status: "failed", failReason: reason, retryCount: currentRetry },
          })
          return { id: post.id, status: "failed", reason }
        }

        console.log(postTag, "PUBLISHED! postId:", publishResult.postId)

        const brand = await prismaAdmin.brandSettings.findFirst({
          where: { userId: post.userId },
          select: { whatsappPhone: true },
        })

        const phone = brand?.whatsappPhone
        if (phone && ycApiKey && ycFrom) {
          const msg = `Reser+ Publicado en Instagram:\n\n${post.title}\n${publishResult.permalink ?? ""}`
          await fetch("https://api.ycloud.com/v2/whatsapp/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-API-Key": ycApiKey },
            body: JSON.stringify({ from: ycFrom, to: phone, type: "text", text: { body: msg } }),
          }).catch((e) => console.error(postTag, "WA notify failed:", e))
        }

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

  const published = results.filter(
    (r) => r.status === "fulfilled" && (r.value as { status: string }).status === "published"
  ).length
  const failed = results.filter(
    (r) => r.status === "fulfilled" && (r.value as { status: string }).status === "failed"
  ).length

  console.log(
    `[Cron] === DONE === Published: ${published} | Failed: ${failed} | Time: ${Date.now() - start}ms`
  )

  return NextResponse.json({
    message: `Publicados ${published} de ${duePosts.length} posts`,
    processed: published,
    failed,
    duration_ms: Date.now() - start,
  })
}
