import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prismaAdmin } from "@/lib/prisma-admin"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  const body = (await request.json()) as {
    carouselId?: string
    scheduledAt?: string
    slideImageUrls?: string[]
    videoUrl?: string
    publishFormat?: "carousel" | "reel"
    reelScriptId?: string
    darkMode?: boolean
  }
  const { carouselId, scheduledAt, slideImageUrls, videoUrl, publishFormat, reelScriptId, darkMode } = body

  if (!carouselId || !scheduledAt) {
    return NextResponse.json(
      { error: "Faltan parámetros: carouselId y scheduledAt" },
      { status: 400 }
    )
  }

  const scheduledDate = new Date(scheduledAt)
  if (isNaN(scheduledDate.getTime())) {
    return NextResponse.json({ error: "scheduledAt inválido" }, { status: 400 })
  }

  const hasImages = slideImageUrls && slideImageUrls.length > 0
  const hasVideo = !!videoUrl
  const isReel = publishFormat === "reel" || hasVideo

  if (!hasImages && !hasVideo && !isReel) {
    const existing = await prismaAdmin.carousel.findFirst({
      where: { id: carouselId, userId: session.user.id },
      select: { slidesJson: true },
    })

    const slides = existing?.slidesJson as unknown[] | null
    if (!slides || (Array.isArray(slides) && slides.length === 0)) {
      return NextResponse.json(
        {
          error:
            "No se puede programar: el carrusel no tiene slides ni imágenes capturadas. Editá el carrusel primero.",
        },
        { status: 400 }
      )
    }
  }

  const updated = await prismaAdmin.carousel.updateMany({
    where: { id: carouselId, userId: session.user.id },
    data: {
      status: "scheduled",
      scheduledAt: scheduledDate,
      slideImageUrls: hasImages ? JSON.stringify(slideImageUrls) : "[]",
      videoUrl: hasVideo ? videoUrl : null,
      publishFormat: isReel ? "reel" : "carousel",
      reelScriptId: reelScriptId ?? null,
      darkMode: darkMode ?? true,
      failReason: null,
      retryCount: 0,
    },
  })

  if (updated.count === 0) {
    return NextResponse.json(
      { error: `Carrusel no encontrado (id: ${carouselId})` },
      { status: 404 }
    )
  }

  return NextResponse.json({ success: true })
}
