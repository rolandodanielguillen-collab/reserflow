'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { T, FD, FM } from '@/features/content-studio/components/studio-shared'
import { doSignOut } from './signout-action'

const NAV = [
  { href: '/dashboard', label: 'Inicio', icon: '⌂', exact: true },
  { href: '/dashboard/flyers', label: 'Flyers', icon: '🎾' },
  { href: '/dashboard/content-studio', label: 'Studio', icon: '▦' },
  { href: '/dashboard/biblioteca', label: 'Biblioteca', icon: '🖼' },
  { href: '/dashboard/campanas', label: 'Campañas', icon: '📣' },
  { href: '/ajustes', label: 'Ajustes', icon: '⚙' },
]

export function Sidebar({ userEmail, brandName }: { userEmail?: string | null; brandName?: string | null }) {
  const pathname = usePathname()
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)')
    const apply = () => setIsMobile(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  if (isMobile) {
    return (
      <aside style={{ width: '100%', background: T.navyDeep, borderBottom: '1px solid rgba(245,242,235,0.07)', padding: '10px 10px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <svg viewBox="0 0 100 100" width={16} height={16}>
            <rect x="38" y="8" width="24" height="84" fill={T.mint}/>
            <rect x="8" y="38" width="84" height="24" fill={T.mint}/>
          </svg>
          {brandName && <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 13, color: T.mint }}>{brandName}</span>}
          <span style={{ fontFamily: FM, fontSize: 9, color: 'rgba(245,242,235,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{userEmail}</span>
          <button onClick={() => doSignOut()} style={{ all: 'unset', cursor: 'pointer', fontFamily: FM, fontSize: 10, color: 'rgba(245,242,235,0.6)', padding: '4px 8px' }}>⏻ Salir</button>
        </div>
        <nav style={{ display: 'flex', gap: 4, overflowX: 'auto' }}>
          {NAV.map(item => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
            return (
              <Link key={item.href} href={item.href} style={{
                flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 9,
                textDecoration: 'none', fontFamily: FD, fontSize: 12.5, fontWeight: active ? 700 : 500,
                color: active ? T.mint : 'rgba(245,242,235,0.72)',
                background: active ? `${T.mint}16` : 'rgba(245,242,235,0.04)',
              }}>
                <span>{item.icon}</span>{item.label}
              </Link>
            )
          })}
        </nav>
      </aside>
    )
  }

  return (
    <aside style={{
      width: 200, minWidth: 200, minHeight: '100vh', background: T.navyDeep,
      borderRight: '1px solid rgba(245,242,235,0.07)', display: 'flex', flexDirection: 'column',
      padding: '20px 12px', position: 'sticky', top: 0, alignSelf: 'flex-start', height: '100vh',
    }}>
      <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '4px 10px 22px', textDecoration: 'none' }}>
        <svg viewBox="0 0 100 100" width={18} height={18}>
          <rect x="38" y="8" width="24" height="84" fill={T.mint}/>
          <rect x="8" y="38" width="84" height="24" fill={T.mint}/>
        </svg>
        <span style={{ fontFamily: FM, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(245,242,235,0.55)', fontWeight: 700 }}>
          Content OS
        </span>
      </Link>

      {(brandName || userEmail) && (
        <div style={{ margin: '0 4px 14px', padding: '10px 12px', borderRadius: 10, background: 'rgba(245,242,235,0.05)', border: '1px solid rgba(245,242,235,0.08)' }}>
          <div style={{ fontFamily: FM, fontSize: 8.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(245,242,235,0.45)', marginBottom: 3 }}>Cuenta activa</div>
          {brandName && <div style={{ fontFamily: FD, fontWeight: 800, fontSize: 14, color: T.mint }}>{brandName}</div>}
          {userEmail && <div style={{ fontFamily: FM, fontSize: 9.5, color: 'rgba(245,242,235,0.6)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userEmail}</div>}
        </div>
      )}

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {NAV.map(item => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10,
                textDecoration: 'none', fontFamily: FD, fontSize: 13.5, fontWeight: active ? 700 : 500,
                color: active ? T.mint : 'rgba(245,242,235,0.72)',
                background: active ? `${T.mint}16` : 'transparent',
                border: `1px solid ${active ? `${T.mint}33` : 'transparent'}`,
                transition: 'all 120ms',
              }}
            >
              <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div style={{ flex: 1 }}/>

      <button
        onClick={() => doSignOut()}
        style={{
          all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 12px', borderRadius: 10, fontFamily: FD, fontSize: 13,
          color: 'rgba(245,242,235,0.6)', border: '1px solid transparent',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(224,82,82,0.12)'; e.currentTarget.style.color = '#E05252' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(245,242,235,0.6)' }}
      >
        <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>⏻</span>
        Cerrar sesión
      </button>
    </aside>
  )
}
