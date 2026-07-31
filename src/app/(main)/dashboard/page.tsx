import Link from 'next/link'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prismaAdmin } from '@/lib/prisma-admin'
import { T, FD, FM, ARG_TZ, STATUS_META, dbToUI } from '@/features/content-studio/components/studio-shared'

export const dynamic = 'force-dynamic'

function fmtDate(d: Date | null): string {
  if (!d) return '—'
  return d.toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: ARG_TZ })
}

function StatusBadge({ status }: { status: string }) {
  const ui = dbToUI(status)
  const { color, label } = STATUS_META[ui]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: FM, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, color, padding: '2px 8px', borderRadius: 5, background: `${color}1F`, border: `1px solid ${color}38` }}>
      <span style={{ width: 5, height: 5, borderRadius: 3, background: color }}/>
      {label}
    </span>
  )
}

const CARD: React.CSSProperties = {
  background: T.navySoft, border: '1px solid rgba(245,242,235,0.08)', borderRadius: 16, padding: '20px 22px',
}
const H2: React.CSSProperties = {
  fontFamily: FM, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(245,242,235,0.5)', fontWeight: 700, marginBottom: 14,
}
const ROW: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderTop: '1px solid rgba(245,242,235,0.06)',
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const userId = session.user.id

  const now = new Date()
  const [brand, pendientes, proximos, recientes] = await Promise.all([
    prismaAdmin.brandSettings.findFirst({ where: { userId }, select: { brandName: true } }),
    prismaAdmin.carousel.findMany({
      where: { userId, status: 'review' },
      orderBy: { updatedAt: 'desc' }, take: 6,
      select: { id: true, title: true, status: true, updatedAt: true },
    }),
    prismaAdmin.carousel.findMany({
      where: { userId, status: 'scheduled', scheduledAt: { gte: now } },
      orderBy: { scheduledAt: 'asc' }, take: 6,
      select: { id: true, title: true, status: true, scheduledAt: true, publishFormat: true },
    }),
    prismaAdmin.carousel.findMany({
      where: { userId, status: { in: ['published', 'failed', 'publishing'] } },
      orderBy: { updatedAt: 'desc' }, take: 6,
      select: { id: true, title: true, status: true, publishedAt: true, updatedAt: true, instagramPermalink: true, failReason: true },
    }),
  ])

  const nombre = brand?.brandName || session.user.name || 'tu marca'

  return (
    <div style={{ minHeight: '100vh', background: T.navyDeep, color: T.cream, fontFamily: FD, padding: '32px 40px 80px' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: FM, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: T.mint, fontWeight: 700, marginBottom: 6 }}>
          Inicio
        </div>
        <h1 style={{ fontFamily: FD, fontWeight: 900, fontSize: 30, letterSpacing: '-0.03em', margin: 0 }}>
          {nombre}
        </h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        {/* Pendientes de aprobación */}
        <section style={{ ...CARD, borderColor: pendientes.length ? `${T.amber}44` : 'rgba(245,242,235,0.08)' }}>
          <div style={H2}>Esperan tu aprobación · {pendientes.length}</div>
          {pendientes.length === 0 ? (
            <div style={{ fontFamily: FM, fontSize: 11, color: 'rgba(245,242,235,0.35)' }}>Nada pendiente ✓</div>
          ) : pendientes.map(p => (
            <Link key={p.id} href="/dashboard/content-studio" style={{ ...ROW, textDecoration: 'none', color: T.cream }}>
              <StatusBadge status={p.status}/>
              <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</span>
            </Link>
          ))}
        </section>

        {/* Próximos programados */}
        <section style={CARD}>
          <div style={H2}>Próximos en salir</div>
          {proximos.length === 0 ? (
            <div style={{ fontFamily: FM, fontSize: 11, color: 'rgba(245,242,235,0.35)' }}>Nada programado</div>
          ) : proximos.map(p => (
            <Link key={p.id} href="/dashboard/content-studio" style={{ ...ROW, textDecoration: 'none', color: T.cream }}>
              <span style={{ fontFamily: FM, fontSize: 10, color: '#6B9FFF', minWidth: 92 }}>{fmtDate(p.scheduledAt)}</span>
              <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{p.title}</span>
              {p.publishFormat === 'reel' && <span style={{ fontFamily: FM, fontSize: 9, color: 'rgba(245,242,235,0.4)' }}>REEL</span>}
            </Link>
          ))}
        </section>

        {/* Últimas publicaciones */}
        <section style={CARD}>
          <div style={H2}>Últimas publicaciones</div>
          {recientes.length === 0 ? (
            <div style={{ fontFamily: FM, fontSize: 11, color: 'rgba(245,242,235,0.35)' }}>Todavía no publicaste</div>
          ) : recientes.map(p => (
            <div key={p.id} style={ROW}>
              <StatusBadge status={p.status}/>
              <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{p.title}</span>
              {p.status === 'published' && p.instagramPermalink && (
                <a href={p.instagramPermalink} target="_blank" rel="noopener noreferrer" style={{ fontFamily: FM, fontSize: 10, color: T.mint, textDecoration: 'none' }}>
                  Ver en IG ↗
                </a>
              )}
              {p.status === 'failed' && p.failReason && (
                <span title={p.failReason} style={{ fontFamily: FM, fontSize: 9, color: '#E05252', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.failReason}
                </span>
              )}
            </div>
          ))}
        </section>
      </div>

      <div style={{ marginTop: 22, display: 'flex', gap: 10 }}>
        <Link href="/dashboard/content-studio" style={{ padding: '11px 20px', borderRadius: 10, background: T.mint, color: T.navy, fontFamily: FD, fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
          Abrir Studio →
        </Link>
        <Link href="/dashboard/biblioteca" style={{ padding: '11px 20px', borderRadius: 10, background: 'rgba(245,242,235,0.07)', color: T.cream, fontFamily: FD, fontWeight: 600, fontSize: 13, textDecoration: 'none', border: '1px solid rgba(245,242,235,0.1)' }}>
          Biblioteca
        </Link>
      </div>
    </div>
  )
}
