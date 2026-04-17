'use server'

import { createClient } from '@/lib/supabase/server'

export async function schedulePost(carouselId: string, scheduledAt: Date) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase
    .from('carousels')
    .update({ scheduled_at: scheduledAt.toISOString(), status: 'scheduled' })
    .eq('id', carouselId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  return { success: true }
}

export async function getScheduledCarousels() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado', data: [] }

  const { data, error } = await supabase
    .from('carousels')
    .select('id, title, status, scheduled_at, published_at, instagram_permalink')
    .eq('user_id', user.id)
    .in('status', ['scheduled', 'published', 'failed'])
    .order('scheduled_at', { ascending: true })

  if (error) return { error: error.message, data: [] }
  return { data: data ?? [] }
}

export async function cancelScheduledPost(carouselId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase
    .from('carousels')
    .update({ scheduled_at: null, status: 'review' })
    .eq('id', carouselId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  return { success: true }
}
