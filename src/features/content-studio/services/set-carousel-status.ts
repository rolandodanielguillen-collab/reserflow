'use server'

import { prismaRls } from '@/lib/prisma-rls'
import { prismaAdmin } from '@/lib/prisma-admin'
import { auth } from '@/lib/auth'

export type DBStatus = 'draft' | 'review' | 'approved' | 'scheduled' | 'published'

const YCLOUD_BASE = 'https://api.ycloud.com/v2'

async function sendWA(to: string, message: string) {
  const apiKey = process.env.YCLOUD_API_KEY
  const from   = process.env.YCLOUD_WHATSAPP_FROM
  if (!apiKey || !from) return

  await fetch(`${YCLOUD_BASE}/whatsapp/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
    body: JSON.stringify({ from, to, type: 'text', text: { body: message } }),
  }).catch(e => console.error('[WA]', e))
}

/**
 * Actualiza el status de un carrusel.
 * Si newStatus = 'review': auto-envía WA al admin para aprobar.
 */
export async function setCarouselStatus(
  carouselId: string,
  newStatus: DBStatus
): Promise<{ success?: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'No autenticado' }

  // Fetch carousel title for notifications
  const carousel = await prismaRls.carousel.findFirst({
    where: { id: carouselId },
    select: { title: true },
  })

  if (!carousel) return { error: 'Carrusel no encontrado' }
  const title = carousel.title

  await prismaRls.carousel.updateMany({
    where: { id: carouselId },
    data: { status: newStatus },
  })

  // Auto-send WA when transitioning to review (pendiente)
  if (newStatus === 'review') {
    const brand = await prismaRls.brandSettings.findFirst({
      where: {},
      select: { whatsappPhone: true },
    })

    const phone = brand?.whatsappPhone as string | undefined
    if (phone) {
      // Track pending approval
      await prismaRls.brandSettings.updateMany({
        where: {},
        data: { pendingApprovalCarouselId: carouselId },
      })

      const msg = `🗓 *Reser+* — Carrusel listo para aprobar:\n\n📝 *${title}*\n\nRespondé *Sí* para aprobar o *No* para rechazar.`
      await sendWA(phone, msg)
    }
  }

  return { success: true }
}

/**
 * Programa un carrusel (status → scheduled + scheduled_at).
 */
export async function scheduleCarouselAt(
  carouselId: string,
  scheduledAt: Date
): Promise<{ success?: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'No autenticado' }

  // Usar prismaAdmin para evitar problemas de RLS en server actions
  const updated = await prismaAdmin.carousel.updateMany({
    where: { id: carouselId, userId: session.user.id },
    data: { status: 'scheduled', scheduledAt },
  })

  if (updated.count === 0) return { error: `Carrusel no encontrado (id: ${carouselId}, user: ${session.user.id})` }
  return { success: true }
}
