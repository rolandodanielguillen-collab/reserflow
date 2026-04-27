'use server'

import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'


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
}

export async function publishReelToInstagram({ carouselId, videoUrl, caption }: ReelsPublishParams) {
  const supabase = await createServerClient()
  let userId: string | undefined

  const { data: { user } } = await supabase.auth.getUser()
  userId = user?.id

  if (!userId) return { error: 'No autenticado' }

  const { data: brand } = await supabase
    .from('brand_settings')
    .select('meta_access_token, instagram_account_id')
    .eq('user_id', userId)
    .single()


  if (!brand?.meta_access_token || !brand?.instagram_account_id) {
    return { error: 'Configura el token de Meta y el ID de cuenta Instagram en Ajustes.' }
  }

  const token = brand.meta_access_token as string
  const igId  = brand.instagram_account_id as string
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
    await supabase
      .from('carousels')
      .update({
        instagram_post_id:   pubJson.id,
        instagram_permalink: permalink,
        published_at:        new Date().toISOString(),
        status:              'published',
      })
      .eq('id', carouselId)
      .eq('user_id', userId)

    return { success: true, postId: pubJson.id, permalink }

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    await supabase
      .from('carousels')
      .update({ status: 'failed' })
      .eq('id', carouselId)
      .eq('user_id', userId)
    return { error: message }
  }
}

/**
 * Publica en Instagram usando Meta Graph API v21.0.
 * - 1 imagen  → IMAGE post
 * - 2-10 imgs → CAROUSEL post
 */
export async function publishToInstagram({ carouselId, imageUrls, caption, userId: passedUserId }: InstagramPublishParams) {
  let supabase
  let userId = passedUserId

  if (passedUserId) {
    // Modo sistema/cron: usar Service Role para saltar RLS
    supabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  } else {
    // Modo cliente: usar sesión de usuario
    supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    userId = user?.id
  }

  if (!userId) return { error: 'No autenticado' }


  const { data: brand } = await supabase
    .from('brand_settings')
    .select('meta_access_token, instagram_account_id')
    .eq('user_id', userId)
    .single()


  if (!brand?.meta_access_token || !brand?.instagram_account_id) {
    return { error: 'Configura el token de Meta y el ID de cuenta Instagram en Ajustes.' }
  }

  const token      = brand.meta_access_token as string
  const igId       = brand.instagram_account_id as string
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
      // ── Carousel post (2-10 images) ──────────────────────────────────────
      const containerIds: string[] = []
      for (const url of imageUrls.slice(0, 10)) {
        const params = new URLSearchParams({
          image_url:        url,
          is_carousel_item: 'true',
          access_token:     token,
        })
        const res  = await fetch(`${BASE}/${igId}/media`, { method: 'POST', body: params })
        const json = await res.json() as { id?: string; error?: { message: string } }
        if (!json.id) throw new Error(json.error?.message ?? `Error creando container para ${url}`)
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

    // ── Publish ──────────────────────────────────────────────────────────
    const pubParams = new URLSearchParams({ creation_id: creationId, access_token: token })
    const pubRes    = await fetch(`${BASE}/${igId}/media_publish`, { method: 'POST', body: pubParams })
    const pubJson   = await pubRes.json() as { id?: string; error?: { message: string } }
    if (!pubJson.id) throw new Error(pubJson.error?.message ?? 'Error publicando en Instagram')

    const permalink = `https://www.instagram.com/p/${pubJson.id}/`
    await supabase
      .from('carousels')
      .update({
        instagram_post_id:   pubJson.id,
        instagram_permalink: permalink,
        published_at:        new Date().toISOString(),
        status:              'published',
      })
      .eq('id', carouselId)
      .eq('user_id', userId)


    return { success: true, postId: pubJson.id, permalink }

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    await supabase
      .from('carousels')
      .update({ status: 'failed' })
      .eq('id', carouselId)
      .eq('user_id', userId)

    return { error: message }
  }
}
