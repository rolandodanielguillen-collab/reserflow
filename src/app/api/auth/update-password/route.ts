import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    const { password, token } = await req.json()

    if (!password || !token) {
      return NextResponse.json(
        { error: "Contraseña y token requeridos" },
        { status: 400 }
      )
    }

    const verification = await prisma.verificationToken.findUnique({
      where: { token },
    })

    if (!verification || verification.expires < new Date()) {
      return NextResponse.json(
        { error: "Token inválido o expirado" },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    await prisma.user.update({
      where: { email: verification.identifier },
      data: { password: hashedPassword },
    })

    await prisma.verificationToken.delete({
      where: { token },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: "Error al actualizar la contraseña" },
      { status: 500 }
    )
  }
}
