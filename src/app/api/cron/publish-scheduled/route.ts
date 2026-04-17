import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Cron job: publica los carruseles programados cuya fecha ya pasó.
 * Se invoca vía Vercel Cron o llamada externa con el CRON_SECRET.
 *
 * Vercel cron config en vercel.json:
 * { "crons": [{ "path": "/api/cron/publish-scheduled", "schedule": "0 * * * *" }] }
 */
export async function GET(request: Request) {
  // Verificar autenticación del cron
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Usar service role para acceso completo
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Obtener carruseles programados cuya fecha ya llegó
  const now = new Date().toISOString()
  const { data: duePosts, error } = await supabase
    .from('carousels')
    .select(`
      id,
      user_id,
      title,
      slides_json,
      scheduled_at,
      content_ideas!inner(*)
    `)
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

  const results = await Promise.allSettled(
    duePosts.map(async post => {
      const { data: brand } = await supabase
        .from('brand_settings')
        .select('meta_access_token, instagram_account_id')
        .eq('user_id', post.user_id)
        .single()

      if (!brand?.meta_access_token) {
        return { id: post.id, status: 'skipped', reason: 'Sin credenciales de Meta' }
      }

      // Renderizar slides → subir a Cloudinary → publicar en Instagram
      const res = await fetch(`${siteUrl}/api/publishing/export-and-publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.CRON_SECRET}`,
        },
        body: JSON.stringify({ carouselId: post.id }),
      })
      const result = await res.json() as { error?: string; postId?: string }

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
