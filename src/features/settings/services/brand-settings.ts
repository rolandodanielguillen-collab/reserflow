'use server'

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const BrandSettingsSchema = z.object({
  brand_name: z.string().min(1).max(100),
  brand_tagline: z.string().max(200).optional(),
  primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  secondary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  accent_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  brand_voice: z.string().max(300).optional(),
  target_audience: z.string().max(300).optional(),
  ycloud_api_key: z.string().max(500).optional(),
  whatsapp_phone: z.string().max(20).optional(),
  meta_access_token: z.string().max(1000).optional(),
  instagram_account_id: z.string().max(100).optional(),
  logo_url: z.string().url().optional().or(z.literal('')),
  product_description: z.string().max(1000).optional(),
})

export type BrandSettingsValues = z.infer<typeof BrandSettingsSchema>

export async function getBrandSettings() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado', data: null }

  const { data, error } = await supabase
    .from('brand_settings')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return { error: error.message, data: null }
  return { data }
}

export async function saveBrandSettings(values: BrandSettingsValues) {
  const parsed = BrandSettingsSchema.safeParse(values)
  if (!parsed.success) return { error: 'Datos inválidos' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase
    .from('brand_settings')
    .upsert({ ...parsed.data, user_id: user.id }, { onConflict: 'user_id' })

  if (error) return { error: error.message }
  return { success: true }
}
