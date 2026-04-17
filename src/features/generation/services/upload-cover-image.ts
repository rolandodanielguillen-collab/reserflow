'use server'

import { createClient } from '@/lib/supabase/server'

export async function uploadCoverImage(
  carouselId: string,
  formData: FormData
): Promise<{ url: string } | { error: string }> {
  const file = formData.get('file')
  if (!(file instanceof File)) return { error: 'Archivo inválido' }
  if (!file.type.startsWith('image/')) return { error: 'Solo se permiten imágenes' }
  if (file.size > 10 * 1024 * 1024) return { error: 'La imagen no puede superar 10 MB' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${user.id}/covers/${carouselId}-${Date.now()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabase.storage
    .from('brand-assets')
    .upload(path, buffer, { contentType: file.type, upsert: true })

  if (uploadError) return { error: `Error subiendo imagen: ${uploadError.message}` }

  const { data: { publicUrl } } = supabase.storage.from('brand-assets').getPublicUrl(path)
  await supabase.from('carousels').update({ cover_image_url: publicUrl }).eq('id', carouselId)

  return { url: publicUrl }
}
