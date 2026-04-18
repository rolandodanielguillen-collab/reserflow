'use server'

import { createClient } from '@/lib/supabase/server'

export type CarouselRow = {
  id: string
  title: string
  status: string
  slides_json: unknown
  cover_image_url: string | null
  scheduled_at: string | null
  published_at: string | null
  instagram_permalink: string | null
  caption: string | null
  hashtags: string[] | null
  created_at: string
  template_piece_id: number | null
}

export async function getCarousels(): Promise<CarouselRow[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('carousels')
    .select('id, title, status, slides_json, cover_image_url, scheduled_at, published_at, instagram_permalink, caption, hashtags, created_at, template_piece_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return []
  return (data ?? []) as CarouselRow[]
}

export async function getCarouselById(id: string): Promise<CarouselRow | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('carousels')
    .select('id, title, status, slides_json, cover_image_url, scheduled_at, published_at, instagram_permalink, caption, hashtags, created_at, template_piece_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  return (data ?? null) as CarouselRow | null
}
