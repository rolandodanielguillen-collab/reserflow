import { Sidebar } from '@/components/Sidebar'
import { auth } from '@/lib/auth'
import { prismaAdmin } from '@/lib/prisma-admin'

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  let brandName: string | null = null
  if (session?.user?.id) {
    const brand = await prismaAdmin.brandSettings.findFirst({
      where: { userId: session.user.id },
      select: { brandName: true },
    })
    brandName = brand?.brandName ?? null
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0A1529' }}>
      <Sidebar userEmail={session?.user?.email} brandName={brandName} />
      <main style={{ flex: 1, minWidth: 0 }}>{children}</main>
    </div>
  )
}
