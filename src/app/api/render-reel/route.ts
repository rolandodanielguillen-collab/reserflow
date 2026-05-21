import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { renderReelToFile } from "@/features/publishing/services/render-reel"

export async function POST(req: NextRequest) {
  const { scriptId, dark, cta, carouselId } = (await req.json()) as {
    scriptId: string
    dark: boolean
    cta: string
    carouselId: string
  }

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  const result = await renderReelToFile({
    scriptId,
    dark,
    cta,
    carouselId,
    userId: session.user.id,
  })

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({ url: result.url })
}
