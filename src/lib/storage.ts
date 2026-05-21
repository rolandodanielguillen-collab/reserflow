import fs from "fs/promises"
import path from "path"
import crypto from "crypto"

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads")
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true })
}

export async function uploadFile(
  buffer: Buffer,
  folder: string,
  filename: string
): Promise<string> {
  const dir = path.join(UPLOADS_DIR, folder)
  await ensureDir(dir)

  const ext = path.extname(filename)
  const safeName = `${crypto.randomUUID()}${ext}`
  const filePath = path.join(dir, safeName)

  await fs.writeFile(filePath, buffer)

  return `${BASE_URL}/uploads/${folder}/${safeName}`
}

export async function uploadBase64(
  base64: string,
  folder: string,
  filename: string
): Promise<string> {
  const buffer = Buffer.from(base64, "base64")
  return uploadFile(buffer, folder, filename)
}

export async function deleteFile(url: string): Promise<void> {
  const relative = url.replace(`${BASE_URL}/uploads/`, "")
  const filePath = path.join(UPLOADS_DIR, relative)
  try {
    await fs.unlink(filePath)
  } catch {
    // File already deleted or doesn't exist
  }
}

export function getPublicUrl(folder: string, filename: string): string {
  return `${BASE_URL}/uploads/${folder}/${filename}`
}
