import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { uploadSlidesToCloudinary } from '@/features/publishing/services/cloudinary-upload'
import { publishToInstagram } from '@/features/scheduler/services/instagram-publish'
import type { SlideOutput } from '@/features/generation/types'

const MAX_RETRIES = 3

export async function GET(request: Request) {
  const start = Date.now()
  console.log('[Cron] === Publish-scheduled START ===', new Date().toISOString())

  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[Cron] CRON_SECRET env var is NOT SET')
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    console.error('[Cron] Auth failed. Header:', authHeader?.slice(0, 20) ?? 'null')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  console.log('[Cron] Auth OK')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const now = new Date().toISOString()
  console.log('[Cron] Now (UTC):', now)

  // Fetch scheduled posts that are due + failed posts eligible for retry
  const { data: duePosts, error } = await supabase
    .from('carousels')
    .select('id, user_id, title, caption, slides_json, status, retry_count, slide_image_urls')
    .lte('scheduled_at', now)
    .or(`status.eq.scheduled,and(status.eq.failed,retry_count.lt.${MAX_RETRIES})`)
    .limit(10)

  if (error) {
    console.error('[Cron] DB query error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!duePosts || duePosts.length === 0) {
    console.log('[Cron] No posts due. Done in', Date.now() - start, 'ms')
    return NextResponse.json({ message: 'No hay posts pendientes', processed: 0 })
  }

  console.log('[Cron] Found', duePosts.length, 'posts to process:', duePosts.map(p => ({ id: p.id.slice(0, 8), title: p.title, status: p.status, retry: p.retry_count })))

  const ycApiKey = process.env.YCLOUD_API_KEY
  const ycFrom  = process.env.YCLOUD_WHATSAPP_FROM

  const results = await Promise.allSettled(
    duePosts.map(async post => {
      const postTag = `[${post.id.slice(0, 8)}]`
      const currentRetry = (post.retry_count ?? 0) + (post.status === 'failed' ? 1 : 0)
      try {
        console.log(postTag, 'Processing:', post.title, '| retry:', currentRetry)
        await supabase.from('carousels').update({
          status: 'processing',
          retry_count: currentRetry,
          fail_reason: null,
        }).eq('id', post.id)

        const preCapUrls = post.slide_image_urls as string[] | null
        let imageUrls: string[]

        if (preCapUrls && preCapUrls.length > 0) {
          console.log(postTag, 'Using', preCapUrls.length, 'pre-captured slide images')
          imageUrls = preCapUrls
        } else {
          if (!post.slides_json || (Array.isArray(post.slides_json) && post.slides_json.length === 0)) {
            const reason = 'slides_json vacío o sin slides'
            console.error(postTag, 'FAIL:', reason)
            await supabase.from('carousels').update({ status: 'failed', fail_reason: reason, retry_count: currentRetry }).eq('id', post.id)
            return { id: post.id, status: 'failed', reason }
          }

          const slides = post.slides_json as SlideOutput[]
          console.log(postTag, 'No pre-captured images, rendering', slides.length, 'slides server-side...')
          const uploadResult = await uploadSlidesToCloudinary(post.id, slides)

          if ('error' in uploadResult) {
            const reason = `Cloudinary upload: ${uploadResult.error}`
            console.error(postTag, 'FAIL:', reason)
            await supabase.from('carousels').update({ status: 'failed', fail_reason: reason, retry_count: currentRetry }).eq('id', post.id)
            return { id: post.id, status: 'failed', reason }
          }
          imageUrls = uploadResult.urls
        }

        console.log(postTag, 'Images ready:', imageUrls.length, '| Publishing to Instagram...')
        const publishResult = await publishToInstagram({
          carouselId: post.id,
          imageUrls,
          caption: post.caption ?? post.title,
          userId: post.user_id,
        })

        if (publishResult.error) {
          const reason = `Instagram: ${publishResult.error}`
          console.error(postTag, 'FAIL:', reason)
          await supabase.from('carousels').update({ status: 'failed', fail_reason: reason, retry_count: currentRetry }).eq('id', post.id)
          return { id: post.id, status: 'failed', reason }
        }

        console.log(postTag, 'PUBLISHED! postId:', publishResult.postId)

        // WhatsApp notification (best-effort)
        const { data: brand } = await supabase
          .from('brand_settings')
          .select('whatsapp_phone')
          .eq('user_id', post.user_id)
          .maybeSingle()

        const phone = brand?.whatsapp_phone as string | undefined
        if (phone && ycApiKey && ycFrom) {
          const msg = `Reser+ Publicado en Instagram:\n\n${post.title}\n${publishResult.permalink ?? ''}`
          await fetch('https://api.ycloud.com/v2/whatsapp/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-API-Key': ycApiKey },
            body: JSON.stringify({ from: ycFrom, to: phone, type: 'text', text: { body: msg } }),
          }).catch(e => console.error(postTag, 'WA notify failed:', e))
        }

        return { id: post.id, status: 'published', postId: publishResult.postId }

      } catch (err) {
        const reason = err instanceof Error ? err.message : 'Error desconocido'
        console.error(postTag, 'EXCEPTION:', reason)
        const currentRetryCount = (post.retry_count ?? 0) + (post.status === 'failed' ? 1 : 0)
        await supabase.from('carousels').update({ status: 'failed', fail_reason: reason, retry_count: currentRetryCount }).eq('id', post.id)
        return { id: post.id, status: 'failed', reason }
      }
    })
  )

  const published = results.filter(r => r.status === 'fulfilled' && (r.value as { status: string }).status === 'published').length
  const failed = results.filter(r => r.status === 'fulfilled' && (r.value as { status: string }).status === 'failed').length

  console.log(`[Cron] === DONE === Published: ${published} | Failed: ${failed} | Time: ${Date.now() - start}ms`)

  return NextResponse.json({
    message: `Publicados ${published} de ${duePosts.length} posts`,
    processed: published,
    failed,
    duration_ms: Date.now() - start,
    results: results.map(r => r.status === 'fulfilled' ? r.value : { error: 'promise rejected' }),
  })
}
