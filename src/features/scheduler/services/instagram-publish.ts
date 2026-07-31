'use server'

import { prismaRls } from '@/lib/prisma-rls'
import { prismaAdmin } from '@/lib/prisma-admin'
import { auth } from '@/lib/auth'
import { decryptSecret } from '@/lib/crypto'


interface InstagramPublishParams {
  carouselId: string
  imageUrls: string[]
  caption: string
  userId?: string
}


interface ReelsPublishParams {
  carouselId: string
  videoUrl: string
  caption: string
  userId?: string
}

export async function publishReelToInstagram({ carouselId, videoUrl, caption, userId: passedUserId }: ReelsPublishParams) {
  let userId = passedUserId
  const isCron = !!passedUserId

  if (!isCron) {
    const session = await auth()
    userId = session?.user?.id
  }

  if (!userId) return { error: 'No autenticado' }
  const db = isCron ? prismaAdmin : prismaRls

  const brand = await db.brandSettings.findFirst({
    where: { userId },
    select: { metaAccessToken: true, instagramAccountId: true },
  })

  if (!brand?.metaAccessToken || !brand?.instagramAccountId) {
    return { error: 'Configura el token de Meta y el ID de cuenta Instagram en Ajustes.' }
  }

  const token = decryptSecret(brand.metaAccessToken)!
  const igId  = brand.instagramAccountId
  const BASE  = 'https://graph.facebook.com/v21.0'

  try {
    // Step 1: Create Reel media container
    const params = new URLSearchParams({
      video_url:    videoUrl,
      media_type:   'REELS',
      caption,
      access_token: token,
    })
    const containerRes  = await fetch(`${BASE}/${igId}/media`, { method: 'POST', body: params })
    const containerJson = await containerRes.json() as { id?: string; error?: { message: string } }
    if (!containerJson.id) throw new Error(containerJson.error?.message ?? 'Error creando contenedor de Reel')
    const containerId = containerJson.id

    // Step 2: Poll until Instagram processes the video (max 120s)
    const statusCheck = async () => {
      const r = await fetch(`${BASE}/${containerId}?fields=status_code,status&access_token=${token}`)
      return r.json() as Promise<{ status_code?: string; status?: string }>
    }

    let status = await statusCheck()
    let attempts = 0
    while (status.status_code !== 'FINISHED' && attempts < 24) {
      await new Promise(r => setTimeout(r, 5_000))
      status = await statusCheck()
      attempts++
    }
    if (status.status_code !== 'FINISHED') {
      throw new Error(`Instagram aún procesa el video (estado: ${status.status_code}). Intentá de nuevo en unos minutos.`)
    }

    // Step 3: Publish
    const pubParams = new URLSearchParams({ creation_id: containerId, access_token: token })
    const pubRes    = await fetch(`${BASE}/${igId}/media_publish`, { method: 'POST', body: pubParams })
    const pubJson   = await pubRes.json() as { id?: string; error?: { message: string } }
    if (!pubJson.id) throw new Error(pubJson.error?.message ?? 'Error publicando Reel')

    const permalink = `https://www.instagram.com/reel/${pubJson.id}/`
    await db.carousel.update({
      where: { id: carouselId },
      data: {
        instagramPostId:    pubJson.id,
        instagramPermalink: permalink,
        publishedAt:        new Date(),
        status:             'published',
      },
    })

    return { success: true, postId: pubJson.id, permalink }

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    await db.carousel.update({
      where: { id: carouselId },
      data: { status: 'failed' },
    })
    return { error: message }
  }
}

/**
 * Publica en Instagram usando Meta Graph API v21.0.
 * - 1 imagen  → IMAGE post
 * - 2-10 imgs → CAROUSEL post
 */
export async function publishToInstagram({ carouselId, imageUrls, caption, userId: passedUserId }: InstagramPublishParams) {
  let userId = passedUserId
  const isCron = !!passedUserId

  if (!isCron) {
    const session = await auth()
    userId = session?.user?.id
  }

  if (!userId) return { error: 'No autenticado' }
  const db = isCron ? prismaAdmin : prismaRls

  const brand = await db.brandSettings.findFirst({
    where: { userId },
    select: { metaAccessToken: true, instagramAccountId: true },
  })

  if (!brand?.metaAccessToken || !brand?.instagramAccountId) {
    return { error: 'Configura el token de Meta y el ID de cuenta Instagram en Ajustes.' }
  }

  const token      = decryptSecret(brand.metaAccessToken)!
  const igId       = brand.instagramAccountId
  const BASE       = 'https://graph.facebook.com/v21.0'

  try {
    let creationId: string

    if (imageUrls.length === 1) {
      // ── Single image post ────────────────────────────────────────────────
      const params = new URLSearchParams({
        image_url:    imageUrls[0]!,
        caption,
        access_token: token,
      })
      const res  = await fetch(`${BASE}/${igId}/media`, { method: 'POST', body: params })
      const json = await res.json() as { id?: string; error?: { message: string } }
      if (!json.id) throw new Error(json.error?.message ?? 'Error creando media container')
      creationId = json.id

    } else {
      // ── Carousel post (2-10 items, imágenes y/o videos) ─────────────────
      const isVideoUrl = (u: string) => /\.(mp4|mov)(\?|$)/i.test(u)
      const pollChild = async (childId: string) => {
        // Los videos necesitan procesamiento server-side de IG antes del carrusel
        for (let i = 0; i < 24; i++) {
          const r = await fetch(`${BASE}/${childId}?fields=status_code,status&access_token=${token}`)
          const j = await r.json() as { status_code?: string; status?: string }
          if (j.status_code === 'FINISHED') return
          if (j.status_code === 'ERROR') throw new Error(`Video rechazado por Instagram: ${j.status ?? 'unknown'}`)
          await new Promise(res => setTimeout(res, 5_000))
        }
        throw new Error('Instagram no terminó de procesar un video del carrusel (120s)')
      }

      const containerIds: string[] = []
      for (const url of imageUrls.slice(0, 10)) {
        const video = isVideoUrl(url)
        const params = new URLSearchParams({
          is_carousel_item: 'true',
          access_token:     token,
          ...(video ? { media_type: 'VIDEO', video_url: url } : { image_url: url }),
        })
        const res  = await fetch(`${BASE}/${igId}/media`, { method: 'POST', body: params })
        const json = await res.json() as { id?: string; error?: { message: string } }
        if (!json.id) throw new Error(json.error?.message ?? `Error creando container para ${url}`)
        if (video) await pollChild(json.id)
        containerIds.push(json.id)
      }

      const params = new URLSearchParams({
        media_type:   'CAROUSEL',
        children:     containerIds.join(','),
        caption,
        access_token: token,
      })
      const res  = await fetch(`${BASE}/${igId}/media`, { method: 'POST', body: params })
      const json = await res.json() as { id?: string; error?: { message: string } }
      if (!json.id) throw new Error(json.error?.message ?? 'Error creando carousel container')
      creationId = json.id
    }

    // ── Wait for container to be ready ──────────────────────────────────
    const checkStatus = async (containerId: string) => {
      const r = await fetch(`${BASE}/${containerId}?fields=status_code,status&access_token=${token}`)
      return r.json() as Promise<{ status_code?: string; status?: string }>
    }

    let containerStatus = await checkStatus(creationId)
    let pollAttempts = 0
    while (containerStatus.status_code !== 'FINISHED' && pollAttempts < 30) {
      if (containerStatus.status_code === 'ERROR') {
        throw new Error(`Instagram container error: ${containerStatus.status ?? 'unknown'}`)
      }
      await new Promise(r => setTimeout(r, 2_000))
      containerStatus = await checkStatus(creationId)
      pollAttempts++
    }
    if (containerStatus.status_code !== 'FINISHED') {
      throw new Error(`Instagram container no listo después de 60s (status: ${containerStatus.status_code})`)
    }

    // ── Publish ──────────────────────────────────────────────────────────
    const pubParams = new URLSearchParams({ creation_id: creationId, access_token: token })
    const pubRes    = await fetch(`${BASE}/${igId}/media_publish`, { method: 'POST', body: pubParams })
    const pubJson   = await pubRes.json() as { id?: string; error?: { message: string } }
    if (!pubJson.id) throw new Error(pubJson.error?.message ?? 'Error publicando en Instagram')

    const permalink = `https://www.instagram.com/p/${pubJson.id}/`
    await db.carousel.update({
      where: { id: carouselId },
      data: {
        instagramPostId:    pubJson.id,
        instagramPermalink: permalink,
        publishedAt:        new Date(),
        status:             'published',
      },
    })

    return { success: true, postId: pubJson.id, permalink }

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    await db.carousel.update({
      where: { id: carouselId },
      data: { status: 'failed' },
    })

    return { error: message }
  }
}
