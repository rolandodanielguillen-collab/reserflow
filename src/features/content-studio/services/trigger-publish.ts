'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { uploadSlidesToCloudinary } from '@/features/publishing/services/cloudinary-upload'
import { publishToInstagram } from '@/features/scheduler/services/instagram-publish'
import type { SlideOutput } from '@/features/generation/types'

export async function triggerPublishDuePosts(): Promise<{
  processed: number
  results: Array<{ id: string; status: string; reason?: string; postId?: string }>
  error?: string
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { processed: 0, results: [], error: 'No autenticado' }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const now = new Date().toISOString()
  const { data: duePosts, error } = await admin
    .from('carousels')
    .select('id, user_id, title, caption, slides_json')
    .eq('status', 'scheduled')
    .eq('user_id', user.id)
    .lte('scheduled_at', now)
    .limit(10)

  if (error) return { processed: 0, results: [], error: error.message }
  if (!duePosts || duePosts.length === 0) {
    return { processed: 0, results: [], error: 'No hay posts programados para ahora' }
  }

  const results: Array<{ id: string; status: string; reason?: string; postId?: string }> = []

  for (const post of duePosts) {
    try {
      await admin.from('carousels').update({ status: 'processing' }).eq('id', post.id)

      const slides = post.slides_json as SlideOutput[]
      const uploadResult = await uploadSlidesToCloudinary(post.id, slides)

      if ('error' in uploadResult) {
        await admin.from('carousels').update({ status: 'failed' }).eq('id', post.id)
        results.push({ id: post.id, status: 'failed', reason: uploadResult.error })
        continue
      }

      const publishResult = await publishToInstagram({
        carouselId: post.id,
        imageUrls: uploadResult.urls,
        caption: post.caption ?? post.title,
        userId: post.user_id,
      })

      if (publishResult.error) {
        results.push({ id: post.id, status: 'failed', reason: publishResult.error })
      } else {
        results.push({ id: post.id, status: 'published', postId: publishResult.postId })
      }
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'Error desconocido'
      await admin.from('carousels').update({ status: 'failed' }).eq('id', post.id)
      results.push({ id: post.id, status: 'failed', reason })
    }
  }

  const processed = results.filter(r => r.status === 'published').length
  return { processed, results }
}
