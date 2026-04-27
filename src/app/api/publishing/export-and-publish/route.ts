import { NextRequest, NextResponse } from 'next/server'
import { uploadSlidesToCloudinary } from '@/features/publishing/services/cloudinary-upload'
import { publishToInstagram } from '@/features/scheduler/services/instagram-publish'
import { createClient } from '@supabase/supabase-js'
import type { SlideOutput } from '@/features/generation/types'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { carouselId } = await req.json() as { carouselId: string }
  if (!carouselId) return NextResponse.json({ error: 'carouselId requerido' }, { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: carousel } = await supabase
    .from('carousels')
    .select('id, title, slides_json, user_id')
    .eq('id', carouselId)
    .single()

  if (!carousel) return NextResponse.json({ error: 'Carrusel no encontrado' }, { status: 404 })

  await supabase.from('carousels').update({ status: 'processing' }).eq('id', carouselId)

  const slides = carousel.slides_json as SlideOutput[]
  const uploadResult = await uploadSlidesToCloudinary(carouselId, slides)

  if ('error' in uploadResult) {
    await supabase.from('carousels').update({ status: 'failed' }).eq('id', carouselId)
    return NextResponse.json({ error: uploadResult.error }, { status: 500 })
  }

  const publishResult = await publishToInstagram({
    carouselId,
    imageUrls: uploadResult.urls,
    caption: carousel.title,
    userId: carousel.user_id,
  })

  if ('error' in publishResult && publishResult.error) {
    return NextResponse.json({ error: publishResult.error }, { status: 500 })
  }

  return NextResponse.json(publishResult)
}
