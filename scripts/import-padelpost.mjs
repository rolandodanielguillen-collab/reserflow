// Migra un cliente de padelpost-ai a un tenant de reserflow.
// Uso: npx tsx scripts/import-padelpost.mjs <json> <email> <password> [carpeta-imagenes]
//   <json>: {"name":"PadelSys","instagram_account_id":"...","instagram_access_token":"...","logo":"/ruta/logo.png"}
//   [carpeta-imagenes]: dir con fotos de jugadores → se importan a la biblioteca con tag "jugador"
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'

const [jsonPath, email, password, imagesDir] = process.argv.slice(2)
if (!jsonPath || !email || !password) {
  console.error('Uso: npx tsx scripts/import-padelpost.mjs <json> <email> <password> [carpeta-imagenes]')
  process.exit(1)
}

const { PrismaClient } = await import('../src/generated/prisma/client.ts')
const { PrismaMariaDb } = await import('@prisma/adapter-mariadb')
const { encryptSecret } = await import('../src/lib/crypto.ts')

const prisma = new PrismaClient({ adapter: new PrismaMariaDb(process.env.DATABASE_URL) })
const client = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), 'public', 'uploads')
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

function saveToUploads(buffer, folder, ext) {
  const dir = path.join(UPLOADS_DIR, folder)
  fs.mkdirSync(dir, { recursive: true })
  const name = `${crypto.randomUUID()}${ext}`
  fs.writeFileSync(path.join(dir, name), buffer)
  return `${BASE_URL}/uploads/${folder}/${name}`
}

// 1. Usuario tenant
let user = await prisma.user.findUnique({ where: { email } })
if (!user) {
  user = await prisma.user.create({
    data: { email, name: client.name, password: await bcrypt.hash(password, 10) },
  })
  console.log(`Usuario creado: ${email} (${user.id})`)
} else {
  console.log(`Usuario ya existía: ${email} (${user.id})`)
}

// 2. Logo (opcional)
let logoUrl = null
if (client.logo && fs.existsSync(client.logo)) {
  logoUrl = saveToUploads(fs.readFileSync(client.logo), `library/${user.id}`, path.extname(client.logo) || '.png')
  console.log(`Logo importado: ${logoUrl}`)
}

// 3. BrandSettings con token cifrado
const existing = await prisma.brandSettings.findUnique({ where: { userId: user.id } })
const brandData = {
  brandName: client.name,
  instagramAccountId: client.instagram_account_id || null,
  metaAccessToken: client.instagram_access_token ? encryptSecret(client.instagram_access_token) : null,
  metaTokenUpdatedAt: client.instagram_access_token ? new Date() : null,
  ...(logoUrl ? { logoUrl } : {}),
}
if (existing) {
  await prisma.brandSettings.update({ where: { id: existing.id }, data: brandData })
} else {
  await prisma.brandSettings.create({ data: { userId: user.id, ...brandData } })
}
console.log('BrandSettings listo (token cifrado).')

// 4. Imágenes de jugadores → biblioteca con tag "jugador"
if (imagesDir && fs.existsSync(imagesDir)) {
  const files = fs.readdirSync(imagesDir).filter(f => /\.(jpe?g|png|webp)$/i.test(f))
  let n = 0
  for (const f of files) {
    const buffer = fs.readFileSync(path.join(imagesDir, f))
    const url = saveToUploads(buffer, `library/${user.id}`, path.extname(f))
    await prisma.asset.create({
      data: {
        userId: user.id,
        url,
        filename: f,
        mimeType: f.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg',
        sizeBytes: buffer.length,
        tags: ['jugador'],
        orientation: null,
      },
    })
    n++
  }
  console.log(`${n} imágenes de jugadores importadas a la biblioteca.`)
}

await prisma.$disconnect()
console.log('Migración OK.')
