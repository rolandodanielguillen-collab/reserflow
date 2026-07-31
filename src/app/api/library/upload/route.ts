import { NextResponse } from 'next/server'
import sharp from 'sharp'
import { auth } from '@/lib/auth'
import { prismaAdmin } from '@/lib/prisma-admin'
import { uploadFile } from '@/lib/storage'
import { openaiChat } from '@/features/ingest/flyer-ingest'

export const maxDuration = 300

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 15 * 1024 * 1024

// Subida múltiple a la biblioteca. FormData con files[].
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const userId = session.user.id

  const form = await request.formData()
  const files = form.getAll('files').filter((f): f is File => f instanceof File)
  if (files.length === 0) return NextResponse.json({ error: 'Sin archivos' }, { status: 400 })

  const results: Array<{ filename: string; id?: string; error?: string }> = []

  for (const file of files) {
    if (!ALLOWED.includes(file.type)) {
      results.push({ filename: file.name, error: 'Formato no soportado (jpg/png/webp)' })
      continue
    }
    if (file.size > MAX_BYTES) {
      results.push({ filename: file.name, error: 'Máximo 15MB' })
      continue
    }

    try {
      const buffer = Buffer.from(await file.arrayBuffer())
      const meta = await sharp(buffer).metadata()
      const url = await uploadFile(buffer, `library/${userId}`, file.name)
      const orientation = meta.width && meta.height
        ? (meta.width > meta.height ? 'landscape' : meta.width < meta.height ? 'portrait' : 'square')
        : null

      const asset = await prismaAdmin.asset.create({
        data: {
          userId,
          url,
          filename: file.name,
          mimeType: file.type,
          width: meta.width ?? null,
          height: meta.height ?? null,
          sizeBytes: file.size,
          orientation,
        },
      })

      // Auto-etiquetado IA (barato, best-effort)
      autoTagAsset(asset.id, buffer).catch(e => console.error('[library] auto-tag falló:', e))

      results.push({ filename: file.name, id: asset.id })
    } catch (err) {
      results.push({ filename: file.name, error: err instanceof Error ? err.message : 'Error subiendo' })
    }
  }

  return NextResponse.json({ results })
}

async function autoTagAsset(assetId: string, buffer: Buffer) {
  // Miniatura para abaratar el análisis
  const thumb = await sharp(buffer).resize(512, 512, { fit: 'inside' }).jpeg({ quality: 70 }).toBuffer()
  const content = await openaiChat({
    model: 'gpt-4o-mini',
    max_tokens: 200,
    temperature: 0,
    messages: [
      {
        role: 'system',
        content: 'Analizas imágenes para una biblioteca de diseño deportivo. Devuelves EXCLUSIVAMENTE JSON válido.',
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Devolvé JSON: {"tags": [3-6 etiquetas en español, en minúsculas; usá "jugador" si hay una persona jugando pádel/tenis, "cancha" si se ve una cancha, "textura" si es un fondo abstracto], "dominant_colors": [2-3 colores HEX dominantes], "text_space": "top"|"bottom"|"left"|"right"|"center"|"none" (la zona más despejada para superponer texto)}',
          },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${thumb.toString('base64')}`, detail: 'low' } },
        ],
      },
    ],
  }, 30000)
  if (!content) return

  try {
    const stripped = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
    const parsed = JSON.parse(stripped) as { tags?: string[]; dominant_colors?: string[]; text_space?: string }
    await prismaAdmin.asset.update({
      where: { id: assetId },
      data: {
        tags: (parsed.tags ?? []).map(t => String(t).toLowerCase()),
        dominantColors: parsed.dominant_colors ?? [],
        textSpace: parsed.text_space ?? null,
      },
    })
  } catch {
    console.warn('[library] auto-tag JSON inválido:', content.slice(0, 120))
  }
}
