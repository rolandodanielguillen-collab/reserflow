'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { T, FD, FM } from '@/features/content-studio/components/studio-shared'

const NAV = [
  { href: '/dashboard', label: 'Inicio', icon: '⌂', exact: true },
  { href: '/dashboard/content-studio', label: 'Studio', icon: '▦' },
  { href: '/dashboard/biblioteca', label: 'Biblioteca', icon: '🖼' },
  { href: '/dashboard/campanas', label: 'Campañas', icon: '📣' },
  { href: '/ajustes', label: 'Ajustes', icon: '⚙' },
]

export function Sidebar() {
  const pathname = usePathname()

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
    </aside>
  )
}
