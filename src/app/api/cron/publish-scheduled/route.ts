import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
    .select('id, user_id, title, caption')
    .eq('status', 'scheduled')
    .lte('scheduled_at', now)
    .limit(10)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!duePosts || duePosts.length === 0) {
    return NextResponse.json({ message: 'No hay posts pendientes', processed: 0 })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const ycApiKey = process.env.YCLOUD_API_KEY
  const ycFrom  = process.env.YCLOUD_WHATSAPP_FROM

  const results = await Promise.allSettled(
    duePosts.map(async post => {
      // Publish via export-and-publish pipeline
      const res = await fetch(`${siteUrl}/api/publishing/export-and-publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.CRON_SECRET}`,
        },
        body: JSON.stringify({ carouselId: post.id }),
      })
      const result = await res.json() as { error?: string; postId?: string; permalink?: string }

      // Send WhatsApp notification (best-effort)
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
    })
  )

  const processed = results.filter(r => r.status === 'fulfilled').length

  return NextResponse.json({
    message: `Procesados ${processed} de ${duePosts.length} posts`,
    processed,
    results: results.map(r => r.status === 'fulfilled' ? r.value : { error: 'failed' }),
  })
}
