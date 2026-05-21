'use server'

import { prismaRls } from '@/lib/prisma-rls'
import { uploadFile } from '@/lib/storage'

export async function uploadCoverImage(
  carouselId: string,
  formData: FormData
): Promise<{ url: string } | { error: string }> {
  const file = formData.get('file')
  if (!(file instanceof File)) return { error: 'Archivo inválido' }
  if (!file.type.startsWith('image/')) return { error: 'Solo se permiten imágenes' }
  if (file.size > 10 * 1024 * 1024) return { error: 'La imagen no puede superar 10 MB' }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const buffer = Buffer.from(await file.arrayBuffer())

  try {
    const publicUrl = await uploadFile(buffer, 'covers', `${carouselId}-${Date.now()}.${ext}`)

    await prismaRls.carousel.update({
      where: { id: carouselId },
      data: { coverImageUrl: publicUrl },
    })

    return { url: publicUrl }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return { error: `Error subiendo imagen: ${message}` }
  }
}
