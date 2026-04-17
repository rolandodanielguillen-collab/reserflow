'use server'

import { createClient } from '@/lib/supabase/server'

interface InstagramPublishParams {
  carouselId: string
  imageUrls: string[]         // URLs públicas de las imágenes del carrusel
  caption: string
}

/**
 * Publica un carrusel en Instagram usando Meta Graph API.
 * Requiere que el usuario tenga configurado meta_access_token e instagram_account_id en brand_settings.
 *
 * Flow: Create containers → Create carousel container → Publish
 * Docs: https://developers.facebook.com/docs/instagram-api/guides/content-publishing
 */
export async function publishToInstagram({ carouselId, imageUrls, caption }: InstagramPublishParams) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Obtener credenciales del brand kit
  const { data: brand } = await supabase
    .from('brand_settings')
    .select('meta_access_token, instagram_account_id')
    .eq('user_id', user.id)
    .single()

  if (!brand?.meta_access_token || !brand?.instagram_account_id) {
    return { error: 'Configura el token de Meta y el ID de cuenta Instagram en Ajustes de marca.' }
  }

  const { meta_access_token: token, instagram_account_id: igAccountId } = brand
  const BASE = `https://graph.facebook.com/v21.0`

  try {
    // PASO 1: Crear containers individuales para cada imagen
    const containerIds: string[] = []
    for (const url of imageUrls) {
      const res = await fetch(
        `${BASE}/${igAccountId}/media?image_url=${encodeURIComponent(url)}&is_carousel_item=true&access_token=${token}`,
        { method: 'POST' }
      )
      const json = await res.json() as { id?: string; error?: { message: string } }
      if (!json.id) throw new Error(json.error?.message ?? 'Error creando container de imagen')
      containerIds.push(json.id)
    }

    // PASO 2: Crear container del carrusel
    const carouselRes = await fetch(
      `${BASE}/${igAccountId}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_type: 'CAROUSEL',
          children: containerIds.join(','),
          caption,
          access_token: token,
        }),
      }
    )
    const carouselContainer = await carouselRes.json() as { id?: string; error?: { message: string } }
    if (!carouselContainer.id) throw new Error(carouselContainer.error?.message ?? 'Error creando carrusel container')

    // PASO 3: Publicar
    const publishRes = await fetch(
      `${BASE}/${igAccountId}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: carouselContainer.id,
          access_token: token,
        }),
      }
    )
    const publishResult = await publishRes.json() as { id?: string; error?: { message: string } }
    if (!publishResult.id) throw new Error(publishResult.error?.message ?? 'Error publicando')

    // Guardar resultado en BD
    const permalink = `https://www.instagram.com/p/${publishResult.id}/`
    await supabase
      .from('carousels')
      .update({
        instagram_post_id: publishResult.id,
        instagram_permalink: permalink,
        published_at: new Date().toISOString(),
        status: 'published',
      })
      .eq('id', carouselId)
      .eq('user_id', user.id)

    return { success: true, postId: publishResult.id, permalink }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'

    // Marcar como fallido
    await supabase
      .from('carousels')
      .update({ status: 'failed' })
      .eq('id', carouselId)
      .eq('user_id', user.id)

    return { error: message }
  }
}
