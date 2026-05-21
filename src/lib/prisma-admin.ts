import { PrismaClient } from "@/generated/prisma/client"
import { PrismaMariaDb } from "@prisma/adapter-mariadb"

const globalForPrismaAdmin = globalThis as unknown as {
  prismaAdmin: PrismaClient | undefined
}

function createPrismaAdminClient() {
  const adapter = new PrismaMariaDb(process.env.DATABASE_URL!)
  return new PrismaClient({ adapter })
}

export const prismaAdmin =
  globalForPrismaAdmin.prismaAdmin ?? createPrismaAdminClient()

if (process.env.NODE_ENV !== "production")
  globalForPrismaAdmin.prismaAdmin = prismaAdmin
