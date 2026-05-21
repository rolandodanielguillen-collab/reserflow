import { NextRequest, NextResponse } from "next/server"
import { prismaAdmin } from "@/lib/prisma-admin"
import { uploadSlidesToStorage } from "@/features/publishing/services/cloudinary-upload"
import { publishToInstagram } from "@/features/scheduler/services/instagram-publish"
import type { SlideOutput } from "@/features/generation/types"

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { carouselId } = (await req.json()) as { carouselId: string }
  if (!carouselId) {
    return NextResponse.json({ error: "carouselId requerido" }, { status: 400 })
  }

  const carousel = await prismaAdmin.carousel.findUnique({
    where: { id: carouselId },
  })

  if (!carousel) {
    return NextResponse.json({ error: "Carrusel no encontrado" }, { status: 404 })
  }

  await prismaAdmin.carousel.update({
    where: { id: carouselId },
    data: { status: "publishing" },
  })

  const slides = carousel.slidesJson as SlideOutput[]
  const uploadResult = await uploadSlidesToStorage(carouselId, slides)

  if ("error" in uploadResult) {
    await prismaAdmin.carousel.update({
      where: { id: carouselId },
      data: { status: "failed" },
    })
    return NextResponse.json({ error: uploadResult.error }, { status: 500 })
  }

  const publishResult = await publishToInstagram({
    carouselId,
    imageUrls: uploadResult.urls,
    caption: carousel.title,
    userId: carousel.userId,
  })

  if ("error" in publishResult && publishResult.error) {
    return NextResponse.json({ error: publishResult.error }, { status: 500 })
  }

  return NextResponse.json(publishResult)
}
