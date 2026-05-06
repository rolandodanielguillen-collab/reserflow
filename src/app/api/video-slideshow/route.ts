import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createVideoSlideshow } from '@/features/publishing/services/cloudinary-upload'

export const maxDuration = 120

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await request.json() as { carouselId?: string; slideImageUrls?: string[] }
  const { carouselId, slideImageUrls } = body

  if (!carouselId || !slideImageUrls?.length) {
    return NextResponse.json({ error: 'Faltan carouselId o slideImageUrls' }, { status: 400 })
  }

  const result = await createVideoSlideshow(carouselId, slideImageUrls)

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({ videoUrl: result.videoUrl })
}
