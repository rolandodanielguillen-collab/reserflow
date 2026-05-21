import { NextResponse } from "next/server"

export async function POST() {
  return NextResponse.json(
    { error: "Usa /api/render-reel para generar videos con Remotion" },
    { status: 410 }
  )
}
