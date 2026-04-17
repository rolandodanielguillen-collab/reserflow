'use server'

import { createClient } from '@/lib/supabase/server'
import type { CarouselOutput } from '../types'

export async function getLastCarousel(): Promise<{
  carousel: CarouselOutput
  carouselId: string
  coverImageUrl: string
} | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('carousels')
    .select('id, title, slides_json, hashtags, caption, cover_image_url')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) return null

  return {
    carouselId: data.id,
    coverImageUrl: (data.cover_image_url as string) ?? '',
    carousel: {
      title: data.title,
      slides: data.slides_json as CarouselOutput['slides'],
      hashtags: (data.hashtags as string[]) ?? [],
      caption: data.caption ?? '',
    },
  }
}
