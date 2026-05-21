import { prisma } from "./prisma"
import { auth } from "./auth"

async function getUserId() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized: no session")
  return session.user.id
}

function rlsExtension() {
  async function applyRls({ operation, args, query }: { operation: string; args: Record<string, unknown>; query: (args: Record<string, unknown>) => Promise<unknown> }) {
    const userId = await getUserId()

    switch (operation) {
      case "findMany":
      case "findFirst":
      case "count":
        args.where = { ...(args.where as object ?? {}), userId }
        break
      case "findUnique":
      case "findUniqueOrThrow":
        args.where = { ...(args.where as object ?? {}), userId }
        break
      case "create":
        args.data = { ...(args.data as object ?? {}), userId }
        break
      case "createMany":
      case "createManyAndReturn": {
        const data = args.data
        if (Array.isArray(data)) {
          args.data = data.map((d: Record<string, unknown>) => ({ ...d, userId }))
        }
        break
      }
      case "update":
      case "delete":
        args.where = { ...(args.where as object ?? {}), userId }
        break
      case "updateMany":
      case "deleteMany":
        args.where = { ...(args.where as object ?? {}), userId }
        break
    }

    return query(args)
  }

  return applyRls
}

const applyRls = rlsExtension()

export const prismaRls = prisma.$extends({
  query: {
    brandSettings: {
      $allOperations: applyRls as never,
    },
    contentIdea: {
      $allOperations: applyRls as never,
    },
    carousel: {
      $allOperations: applyRls as never,
    },
  },
})
