'use server'

import { prismaRls } from '@/lib/prisma-rls'
import { auth } from '@/lib/auth'
import { encryptSecret, decryptSecret } from '@/lib/crypto'
import { z } from 'zod'

const BrandSettingsSchema = z.object({
  brandName: z.string().min(1).max(100),
  brandTagline: z.string().max(200).optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  brandVoice: z.string().max(300).optional(),
  targetAudience: z.string().max(300).optional(),
  ycloudApiKey: z.string().max(500).optional(),
  whatsappPhone: z.string().max(20).optional(),
  metaAccessToken: z.string().max(1000).optional(),
  instagramAccountId: z.string().max(100).optional(),
  productDescription: z.string().max(2000).optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
  contentPillars: z.string().max(2000).optional(),
})

export type BrandSettingsValues = z.infer<typeof BrandSettingsSchema>

export async function getBrandSettings() {
  const data = await prismaRls.brandSettings.findFirst()

  if (!data) return { data: null }

  // Convert null to undefined for optional fields (Prisma returns null, Zod expects undefined)
  const cleaned = Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, v === null ? undefined : v])
  ) as Partial<BrandSettingsValues> & { id: string; userId: string }

  // Secretos cifrados en reposo → el dueño autenticado los ve en claro
  if (cleaned.metaAccessToken) cleaned.metaAccessToken = decryptSecret(cleaned.metaAccessToken) ?? undefined
  if (cleaned.ycloudApiKey) cleaned.ycloudApiKey = decryptSecret(cleaned.ycloudApiKey) ?? undefined

  return { data: cleaned }
}

export async function saveBrandSettings(values: BrandSettingsValues) {
  const parsed = BrandSettingsSchema.safeParse(values)
  if (!parsed.success) return { error: 'Datos inválidos' }

  const session = await auth()
  if (!session?.user?.id) return { error: 'No autenticado' }

  const userId = session.user.id

  // Cifrar secretos antes de tocar la DB; detectar cambio de token Meta
  const data = { ...parsed.data } as typeof parsed.data & { metaTokenUpdatedAt?: Date }
  if (data.metaAccessToken) {
    const prev = await prismaRls.brandSettings.findFirst({ select: { metaAccessToken: true } })
    const prevPlain = prev?.metaAccessToken ? decryptSecret(prev.metaAccessToken) : null
    if (prevPlain !== data.metaAccessToken) data.metaTokenUpdatedAt = new Date()
    data.metaAccessToken = encryptSecret(data.metaAccessToken)
  }
  if (data.ycloudApiKey) data.ycloudApiKey = encryptSecret(data.ycloudApiKey)

  try {
    await prismaRls.brandSettings.upsert({
      where: { userId },
      create: { ...data, userId },
      update: data,
    })

    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return { error: message }
  }
}
