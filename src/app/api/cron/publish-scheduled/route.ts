import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { uploadSlidesToCloudinary } from '@/features/publishing/services/cloudinary-upload'
import { publishToInstagram } from '@/features/scheduler/services/instagram-publish'
import type { SlideOutput } from '@/features/generation/types'

/**
 * Cron job: publica los carruseles programados cuya fecha ya pasó.
 * Vercel Cron: { "path": "/api/cron/publish-scheduled", "schedule": "0 * * * *" }
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const now = new Date().toISOString()
  const { data: duePosts, error } = await supabase
    .from('carousels')
    .select('id, user_id, title, caption, slides_json')
    .eq('status', 'scheduled')
    .lte('scheduled_at', now)
    .limit(10)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!duePosts || duePosts.length === 0) {
    return NextResponse.json({ message: 'No hay posts pendientes', processed: 0 })
  }

  const ycApiKey = process.env.YCLOUD_API_KEY
  const ycFrom  = process.env.YCLOUD_WHATSAPP_FROM

  const results = await Promise.allSettled(
    duePosts.map(async post => {
      try {
        await supabase.from('carousels').update({ status: 'processing' }).eq('id', post.id)

        if (!post.slides_json) {
          await supabase.from('carousels').update({ status: 'failed' }).eq('id', post.id)
          return { id: post.id, status: 'failed', reason: 'slides_json vacío' }
        }

        const slides = post.slides_json as SlideOutput[]
        const uploadResult = await uploadSlidesToCloudinary(post.id, slides)

        if ('error' in uploadResult) {
          await supabase.from('carousels').update({ status: 'failed' }).eq('id', post.id)
          return { id: post.id, status: 'failed', reason: uploadResult.error }
        }

        const publishResult = await publishToInstagram({
          carouselId: post.id,
          imageUrls: uploadResult.urls,
          caption: post.caption ?? post.title,
          userId: post.user_id,
        })

        const result = { postId: publishResult.success ? publishResult.postId : undefined, error: publishResult.error, permalink: publishResult.permalink }

        // Notificación WhatsApp (best-effort)
        const { data: brand } = await supabase
          .from('brand_settings')
          .select('whatsapp_phone')
          .eq('user_id', post.user_id)
          .maybeSingle()

        const phone = brand?.whatsapp_phone as string | undefined
        if (phone && ycApiKey && ycFrom) {
          const msg = result.error
            ? `⚠️ *Reser+* — Error al publicar:\n\n📸 *${post.title}*\n❌ ${result.error}`
            : `🚀 *Reser+* — Publicado en Instagram:\n\n📸 *${post.title}*\n🔗 ${result.permalink ?? ''}`

          await fetch('https://api.ycloud.com/v2/whatsapp/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-API-Key': ycApiKey },
            body: JSON.stringify({ from: ycFrom, to: phone, type: 'text', text: { body: msg } }),
          }).catch(e => console.error('[Cron] WA notify failed:', e))
        }

        if (result.error) return { id: post.id, status: 'failed', reason: result.error }
        return { id: post.id, status: 'published', postId: result.postId }

      } catch (err) {
        const reason = err instanceof Error ? err.message : 'Error desconocido'
        await supabase.from('carousels').update({ status: 'failed' }).eq('id', post.id)
        return { id: post.id, status: 'failed', reason }
      }
    })
  )

  const processed = results.filter(r => r.status === 'fulfilled' && (r.value as { status: string }).status === 'published').length

  return NextResponse.json({
    message: `Publicados ${processed} de ${duePosts.length} posts`,
    processed,
    results: results.map(r => r.status === 'fulfilled' ? r.value : { error: 'failed' }),
  })
}
