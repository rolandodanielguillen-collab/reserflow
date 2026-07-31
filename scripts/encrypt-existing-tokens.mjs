// Cifra in-place los metaAccessToken/ycloudApiKey que sigan en texto plano.
// Correr una vez tras el deploy: npx tsx scripts/encrypt-existing-tokens.mjs
import 'dotenv/config'

const { PrismaClient } = await import('../src/generated/prisma/client.ts')
const { PrismaMariaDb } = await import('@prisma/adapter-mariadb')
const { encryptSecret, isEncrypted } = await import('../src/lib/crypto.ts')

const prisma = new PrismaClient({ adapter: new PrismaMariaDb(process.env.DATABASE_URL) })

const rows = await prisma.brandSettings.findMany({
  select: { id: true, metaAccessToken: true, ycloudApiKey: true },
})

let updated = 0
for (const row of rows) {
  const data = {}
  if (row.metaAccessToken && !isEncrypted(row.metaAccessToken)) data.metaAccessToken = encryptSecret(row.metaAccessToken)
  if (row.ycloudApiKey && !isEncrypted(row.ycloudApiKey)) data.ycloudApiKey = encryptSecret(row.ycloudApiKey)
  if (Object.keys(data).length) {
    await prisma.brandSettings.update({ where: { id: row.id }, data })
    updated++
  }
}
console.log(`encrypt-existing-tokens: ${updated} fila(s) cifrada(s) de ${rows.length}`)
await prisma.$disconnect()
