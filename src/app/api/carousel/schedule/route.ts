import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await request.json() as { carouselId?: string; scheduledAt?: string }
  const { carouselId, scheduledAt } = body

  if (!carouselId || !scheduledAt) {
    return NextResponse.json({ error: 'Faltan parámetros: carouselId y scheduledAt' }, { status: 400 })
  }

  const scheduledDate = new Date(scheduledAt)
  if (isNaN(scheduledDate.getTime())) {
    return NextResponse.json({ error: 'scheduledAt inválido' }, { status: 400 })
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: updated, error } = await admin
    .from('carousels')
    .update({ status: 'scheduled', scheduled_at: scheduledDate.toISOString() })
    .eq('id', carouselId)
    .eq('user_id', user.id)
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!updated || updated.length === 0) {
    return NextResponse.json({ error: `Carrusel no encontrado (id: ${carouselId})` }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
