'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { CONTENT } from '../content'
import { normalizeSlides } from '../slide-utils'
import { ScaledSlide, VideoPreview } from './SlideCanvas'
import { getCarousels } from '../services/get-carousels'
import { seedMayCalendar, resetAllToDraft, fixDarkModeAlternation } from '../services/seed-content-calendar'
import { runDuePublishes } from '@/features/scheduler/services/publish-due-action'
import { Modal } from './StudioModal'
import type { RichPiece } from './studio-shared'
import { T, FD, FM, ARG_TZ, MONTHS_ES, DAYS_ES, STATUS_META, dbToUI } from './studio-shared'


// ── Calendar helpers ──────────────────────────────────────────────────────
function firstDayOfWeek(year: number, month: number): number {
  // 0=Sun,1=Mon... → convert to Mon-first (0=Mon,...,6=Sun)
  const d = new Date(year, month, 1).getDay()
  return (d + 6) % 7
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function prevMonth(year: number, month: number) {
  return month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }
}

function nextMonth(year: number, month: number) {
  return month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }
}

// ── Skeleton ──────────────────────────────────────────────────────────────
function Skeleton({ dark }: { dark: boolean }) {
  return (
    <div style={{ minHeight: '100vh', background: dark ? T.navyDeep : T.cream, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: FM, fontSize: 13, letterSpacing: '0.14em', color: 'rgba(245,242,235,0.4)', textTransform: 'uppercase' }}>
        Cargando Content Studio...
      </div>
    </div>
  )
}

// ── Stats strip ───────────────────────────────────────────────────────────
function HeadlineStrip({ pieces, dark }: { pieces: RichPiece[]; dark: boolean }) {
  const th = dark
    ? { panel: T.navySoft, ink: T.cream, inkSoft: 'rgba(245,242,235,0.65)', line: 'rgba(245,242,235,0.08)' }
    : { panel: '#fff', ink: T.navy, inkSoft: 'rgba(15,30,61,0.65)', line: 'rgba(15,30,61,0.08)' }

  const counts = { total: pieces.length, publicado: 0, aprobado: 0, programado: 0, pendiente: 0, borrador: 0, fallido: 0 }
  pieces.forEach(p => { counts[dbToUI(p.dbStatus)]++ })

  const stats = [
    { n: counts.total,     label: 'total',      sub: 'en calendario' },
    { n: counts.publicado, label: 'publicadas', sub: 'ya en Instagram', color: T.navy },
    { n: counts.aprobado,  label: 'aprobadas',  sub: 'listas para salir', color: T.mint },
    { n: counts.programado,label: 'programadas',sub: 'con fecha confirmada', color: '#6B9FFF' },
    { n: counts.pendiente, label: 'pendientes', sub: 'esperan aprobación', color: T.amber },
    { n: counts.borrador,  label: 'borradores', sub: 'en edición', color: T.gray },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 28 }}>
      {stats.map((s, i) => (
        <div key={i} style={{ padding: '16px 18px', background: th.panel, border: `1px solid ${th.line}`, borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <div style={{ fontFamily: FD, fontWeight: 900, fontSize: 34, letterSpacing: '-0.04em', lineHeight: 1, color: s.color ?? th.ink }}>{s.n}</div>
            <div style={{ fontFamily: FD, fontSize: 11, fontWeight: 600, color: th.ink }}>{s.label}</div>
          </div>
          <div style={{ fontFamily: FM, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: th.inkSoft }}>{s.sub}</div>
        </div>
      ))}
    </div>
  )
}

// ── Calendar View ─────────────────────────────────────────────────────────
function CalendarView({ dark, pieces, year, month, onOpen, setYear, setMonth }: {
  dark: boolean
  pieces: RichPiece[]
  year: number
  month: number
  onOpen: (id: string) => void
  setYear: (y: number) => void
  setMonth: (m: number) => void
}) {
  const th = dark
    ? { panel: T.navySoft, ink: T.cream, inkSoft: 'rgba(245,242,235,0.65)', line: 'rgba(245,242,235,0.08)', bg: T.navyDeep }
    : { panel: '#fff', ink: T.navy, inkSoft: 'rgba(15,30,61,0.65)', line: 'rgba(15,30,61,0.08)', bg: '#f8f8f8' }

  const offset    = firstDayOfWeek(year, month)
  const totalDays = daysInMonth(year, month)
  const prev      = prevMonth(year, month)
  const next      = nextMonth(year, month)

  // Build cells: prefix empty + days 1..N + suffix empty
  const cells: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  // Group pieces by day-of-month for this month
  const byDay: Record<number, RichPiece[]> = {}
  pieces.forEach(p => {
    if (!p.scheduledAt) return
    const d = new Date(p.scheduledAt)
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate()
      if (!byDay[day]) byDay[day] = []
      byDay[day].push(p)
    }
  })

  // Unscheduled pieces
  const unscheduled = pieces.filter(p => !p.scheduledAt)

  // Year range for selector
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 6 }, (_, i) => currentYear + i - 1)

  return (
    <div>
      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <button
          onClick={() => { const p = prevMonth(year, month); setYear(p.year); setMonth(p.month) }}
          style={{ all: 'unset', cursor: 'pointer', width: 36, height: 36, borderRadius: 10, background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(15,30,61,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: dark ? T.cream : T.navy }}
        >‹</button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Month selector */}
          <select
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            style={{ padding: '8px 12px', background: dark ? T.navySoft : '#fff', color: dark ? T.cream : T.navy, border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(15,30,61,0.12)'}`, borderRadius: 10, fontFamily: FD, fontSize: 16, fontWeight: 700, cursor: 'pointer', outline: 'none', letterSpacing: '-0.01em' }}
          >
            {MONTHS_ES.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>

          {/* Year selector */}
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            style={{ padding: '8px 12px', background: dark ? T.navySoft : '#fff', color: dark ? T.cream : T.navy, border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(15,30,61,0.12)'}`, borderRadius: 10, fontFamily: FM, fontSize: 14, fontWeight: 700, cursor: 'pointer', outline: 'none' }}
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <button
          onClick={() => { const n = nextMonth(year, month); setYear(n.year); setMonth(n.month) }}
          style={{ all: 'unset', cursor: 'pointer', width: 36, height: 36, borderRadius: 10, background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(15,30,61,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: dark ? T.cream : T.navy }}
        >›</button>

        <div style={{ marginLeft: 'auto', fontFamily: FM, fontSize: 11, color: dark ? 'rgba(245,242,235,0.4)' : 'rgba(15,30,61,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {Object.values(byDay).flat().length} piezas en {MONTHS_ES[month].toLowerCase()} {year}
          {unscheduled.length > 0 && <span style={{ marginLeft: 12, color: T.amber }}>· {unscheduled.length} sin fecha</span>}
        </div>
      </div>

      {/* Calendar grid */}
      <div style={{ background: dark ? T.navySoft : '#fff', border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(15,30,61,0.08)'}`, borderRadius: 18, overflow: 'hidden' }}>
        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(15,30,61,0.08)'}` }}>
          {DAYS_ES.map(d => (
            <div key={d} style={{ padding: '12px 14px', fontFamily: FM, fontSize: 10, letterSpacing: '0.16em', color: dark ? 'rgba(245,242,235,0.45)' : 'rgba(15,30,61,0.45)', fontWeight: 700, textTransform: 'uppercase' }}>{d}</div>
          ))}
        </div>

        {/* Days */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {cells.map((day, i) => {
            const ps = day ? (byDay[day] ?? []) : []
            const isWeekend = (i % 7) >= 5
            const isToday = day != null && new Date().getFullYear() === year && new Date().getMonth() === month && new Date().getDate() === day
            return (
              <div key={i} style={{
                minHeight: 160, padding: 8,
                background: !day ? 'transparent' : isWeekend ? (dark ? 'rgba(255,255,255,0.015)' : 'rgba(15,30,61,0.015)') : 'transparent',
                borderRight: (i % 7 !== 6) ? `1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(15,30,61,0.06)'}` : 'none',
                borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(15,30,61,0.06)'}`,
                display: 'flex', flexDirection: 'column', gap: 6,
              }}>
                {day && (
                  <div style={{ fontFamily: FM, fontSize: 12, fontWeight: 700, color: isToday ? T.mint : (dark ? T.cream : T.navy), width: 26, height: 26, borderRadius: 8, background: isToday ? `${T.mint}22` : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {String(day).padStart(2, '0')}
                  </div>
                )}
                {ps.slice(0, 3).map(p => (
                  <CalendarPiece key={p.dbId} piece={p} dark={dark} onClick={() => onOpen(p.dbId)}/>
                ))}
                {ps.length > 3 && (
                  <button
                    onClick={() => onOpen(ps[3].dbId)}
                    style={{ all: 'unset', cursor: 'pointer', fontFamily: FM, fontSize: 9, color: T.mint, letterSpacing: '0.08em' }}
                  >
                    +{ps.length - 3} más
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Unscheduled section */}
      {unscheduled.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontFamily: FM, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.amber, fontWeight: 600, marginBottom: 12 }}>
            SIN FECHA PROGRAMADA · {unscheduled.length} PIEZAS
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 10 }}>
            {unscheduled.map(p => (
              <PieceCard key={p.dbId} piece={p} dark={dark} onClick={() => onOpen(p.dbId)} compact/>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CalendarPiece({ piece, dark, onClick }: { piece: RichPiece; dark: boolean; onClick: () => void }) {
  const uiStatus = dbToUI(piece.dbStatus)
  const sColor = STATUS_META[uiStatus].color
  const w = 108
  return (
    <button onClick={onClick} style={{ all: 'unset', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div style={{ width: w, borderRadius: 5, overflow: 'hidden', border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(15,30,61,0.1)'}`, position: 'relative' }}>
        {piece.type === 'carousel' && piece.slides ? (
          <ScaledSlide slide={piece.slides[0]!} dark={piece.darkMode} index={0} total={piece.slides.length} width={w}/>
        ) : piece.type === 'carousel' && piece.imageUrls?.length ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={piece.imageUrls[0]} alt="" style={{ width: w, height: w * 1.25, objectFit: 'cover', display: 'block' }}/>
        ) : (
          <VideoPreview dark={piece.darkMode} width={w} scriptId={piece.script}/>
        )}
        <div style={{ position: 'absolute', top: 4, right: 4, width: 7, height: 7, borderRadius: 4, background: sColor, boxShadow: '0 0 0 2px rgba(0,0,0,0.3)' }}/>
        {piece.type === 'video' && (
          <div style={{ position: 'absolute', bottom: 3, left: 3, background: 'rgba(0,0,0,0.75)', color: '#fff', padding: '1px 4px', borderRadius: 3, fontFamily: FM, fontSize: 7, fontWeight: 700 }}>▶ 10S</div>
        )}
      </div>
      <div style={{ fontSize: 9, fontWeight: 600, lineHeight: 1.2, color: dark ? T.cream : T.navy, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, maxWidth: w }}>
        {piece.hook}
      </div>
    </button>
  )
}

// ── List View ─────────────────────────────────────────────────────────────
function ListView({ dark, pieces, onOpen }: { dark: boolean; pieces: RichPiece[]; onOpen: (id: string) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 12 }}>
      {pieces.map(p => (
        <PieceCard key={p.dbId} piece={p} dark={dark} onClick={() => onOpen(p.dbId)}/>
      ))}
    </div>
  )
}

function PieceCard({ piece, dark, onClick, compact }: { piece: RichPiece; dark: boolean; onClick: () => void; compact?: boolean }) {
  const uiStatus = dbToUI(piece.dbStatus)
  const { color, label } = STATUS_META[uiStatus]
  const typeLabel = piece.type === 'video' ? 'Video 10s' : `Carrusel ${piece.slides?.length ?? 0} slides`
  const th = dark
    ? { ink: T.cream, inkSoft: 'rgba(245,242,235,0.6)' }
    : { ink: T.navy, inkSoft: 'rgba(15,30,61,0.6)' }
  const dateStr = piece.scheduledAt
    ? new Date(piece.scheduledAt).toLocaleString('es-AR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: ARG_TZ })
    : null
  return (
    <div
      onClick={onClick}
      style={{ background: dark ? T.navySoft : '#fff', border: `1px solid ${dark ? 'rgba(255,255,255,0.07)' : 'rgba(15,30,61,0.09)'}`, borderRadius: 16, padding: compact ? 12 : 16, display: 'flex', gap: 12, cursor: 'pointer', transition: 'transform 120ms, box-shadow 120ms' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = dark ? '0 10px 28px rgba(0,0,0,0.4)' : '0 10px 28px rgba(15,30,61,0.1)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
    >
      <div style={{ flexShrink: 0, borderRadius: 8, overflow: 'hidden', border: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(15,30,61,0.08)'}` }}>
        {piece.type === 'carousel' && piece.slides ? (
          <ScaledSlide slide={piece.slides[0]!} dark={piece.darkMode} index={0} total={piece.slides.length} width={compact ? 80 : 100}/>
        ) : piece.type === 'carousel' && piece.imageUrls?.length ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={piece.imageUrls[0]} alt="" style={{ width: compact ? 80 : 100, height: (compact ? 80 : 100) * 1.25, objectFit: 'cover', display: 'block' }}/>
        ) : (
          <VideoPreview dark={piece.darkMode} width={compact ? 80 : 100} scriptId={piece.script}/>
        )}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' as const }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: FM, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, color, padding: '2px 7px', borderRadius: 5, background: `${color}18`, border: `1px solid ${color}33` }}>
            <span style={{ width: 5, height: 5, borderRadius: 3, background: color }}/>
            {label}
          </span>
          {dateStr && (
            <span style={{ fontFamily: FM, fontSize: 9, color: '#6B9FFF', letterSpacing: '0.06em' }}>📅 {dateStr}</span>
          )}
        </div>
        <div style={{ fontFamily: FD, fontWeight: 700, fontSize: compact ? 14 : 16, lineHeight: 1.2, letterSpacing: '-0.02em', color: th.ink, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
          {piece.hook}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontFamily: FM, fontSize: 9, color: th.inkSoft, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {typeLabel}
          </div>
          <div style={{ fontFamily: FM, fontSize: 9, color: th.inkSoft, opacity: 0.5, letterSpacing: '0.06em' }}>
            #{piece.dbId.slice(0, 8)}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Top Bar ───────────────────────────────────────────────────────────────
function TopBar({ dark, toggleDark, view, setView, filter, setFilter, onReset, onTriggerCron, totalPieces }: {
  dark: boolean; toggleDark: () => void
  view: 'calendar' | 'list'; setView: (v: 'calendar' | 'list') => void
  filter: string; setFilter: (f: string) => void
  onReset: () => void; onTriggerCron: () => void; totalPieces: number
}) {
  const bg      = dark ? T.navyDeep : T.cream
  const ink     = dark ? T.cream : T.navy
  const inkSoft = dark ? 'rgba(245,242,235,0.55)' : 'rgba(15,30,61,0.55)'
  const line    = dark ? 'rgba(245,242,235,0.07)' : 'rgba(15,30,61,0.07)'

  return (
    <header style={{ padding: '14px 36px', background: bg, borderBottom: `1px solid ${line}`, display: 'flex', alignItems: 'center', gap: 14, position: 'sticky', top: 0, zIndex: 40, backdropFilter: 'blur(12px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: FD, fontWeight: 900, fontSize: 18, letterSpacing: '-0.04em', color: ink, lineHeight: 1 }}>
        <span>RESER</span>
        <svg viewBox="0 0 100 100" width={16} height={16} style={{ position: 'relative', top: 1 }}>
          <rect x="38" y="8" width="24" height="84" fill={T.mint}/>
          <rect x="8" y="38" width="84" height="24" fill={T.mint}/>
        </svg>
      </div>
      <div style={{ fontFamily: FM, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: inkSoft, fontWeight: 700 }}>
        Content Studio
      </div>
      <div style={{ fontFamily: FM, fontSize: 10, color: T.mint, fontWeight: 600, padding: '2px 8px', borderRadius: 5, background: `${T.mint}18`, border: `1px solid ${T.mint}33` }}>
        {totalPieces} piezas
      </div>

      <div style={{ flex: 1 }}/>

      {totalPieces > 0 && (
        <>
          <button onClick={onTriggerCron} style={{ all: 'unset', cursor: 'pointer', padding: '7px 12px', borderRadius: 8, background: `${T.mint}22`, color: T.mint, fontFamily: FM, fontSize: 10, letterSpacing: '0.08em', border: `1px solid ${T.mint}55`, fontWeight: 700 }}>
            ⚡ Publicar programados
          </button>
          <button onClick={onReset} style={{ all: 'unset', cursor: 'pointer', padding: '7px 12px', borderRadius: 8, background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(15,30,61,0.05)', color: inkSoft, fontFamily: FM, fontSize: 10, letterSpacing: '0.08em', border: `1px solid ${line}` }}>
            ↺ Resetear a Borrador
          </button>
        </>
      )}

      <div style={{ display: 'flex', gap: 2, padding: 3, background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(15,30,61,0.06)', borderRadius: 9 }}>
        {(['calendar', 'list'] as const).map(v => (
          <button key={v} onClick={() => setView(v)} style={{ all: 'unset', cursor: 'pointer', padding: '6px 14px', borderRadius: 7, fontFamily: FD, fontSize: 12, fontWeight: 600, background: view === v ? (dark ? T.navy : '#fff') : 'transparent', color: view === v ? (dark ? T.cream : T.navy) : inkSoft, transition: 'all 160ms' }}>
            {v === 'calendar' ? 'Calendario' : 'Lista'}
          </button>
        ))}
      </div>

      <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: '7px 10px', background: dark ? 'rgba(255,255,255,0.06)' : '#fff', color: ink, border: `1px solid ${line}`, borderRadius: 9, fontFamily: FD, fontSize: 12, cursor: 'pointer', outline: 'none' }}>
        <option value="all">Todos los estados</option>
        <option value="borrador">Borradores</option>
        <option value="pendiente">Pendientes</option>
        <option value="aprobado">Aprobados</option>
        <option value="programado">Programados</option>
        <option value="publicado">Publicados</option>
        <option value="carousel">Solo carruseles</option>
        <option value="video">Solo videos</option>
      </select>

      <Link
        href="/ajustes"
        style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 8, background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(15,30,61,0.05)', color: inkSoft, fontFamily: FM, fontSize: 10, letterSpacing: '0.08em', border: `1px solid ${line}`, textDecoration: 'none', whiteSpace: 'nowrap' as const }}
      >
        ⚙ Ajustes
      </Link>

      <button onClick={toggleDark} style={{ all: 'unset', cursor: 'pointer', width: 32, height: 32, borderRadius: 9, background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(15,30,61,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
        {dark ? '☀️' : '🌙'}
      </button>
    </header>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────
function EmptyState({ dark, onSeed, seeding }: { dark: boolean; onSeed: () => void; seeding: boolean }) {
  const ink = dark ? T.cream : T.navy
  return (
    <div style={{ textAlign: 'center' as const, padding: '80px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
      <div style={{ fontSize: 48 }}>🗓</div>
      <div style={{ fontFamily: FD, fontWeight: 800, fontSize: 26, color: ink, letterSpacing: '-0.03em' }}>
        Inicializar calendario de Mayo 2026
      </div>
      <div style={{ fontFamily: FM, fontSize: 12, color: dark ? 'rgba(245,242,235,0.5)' : 'rgba(15,30,61,0.5)', maxWidth: 380, lineHeight: 1.7 }}>
        Crea las 30 piezas del plan de contenidos en tu base de datos. Todas arrancan en Borrador con fecha programada desde el 1 de mayo.
      </div>
      <button disabled={seeding} onClick={onSeed} style={{ all: 'unset', cursor: seeding ? 'wait' : 'pointer', padding: '13px 30px', background: T.mint, color: T.navy, borderRadius: 13, fontFamily: FD, fontWeight: 700, fontSize: 15, opacity: seeding ? 0.7 : 1 }}>
        {seeding ? 'Creando piezas...' : '→ Inicializar Mayo 2026'}
      </button>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────
export function ContentStudio() {
  const [mounted, setMounted]           = useState(false)
  const [view, setView]                 = useState<'calendar' | 'list'>('calendar')
  const [filter, setFilter]             = useState('all')
  const [selectedDbId, setSelectedDbId] = useState<string | null>(null)
  const [dark, setDark]                 = useState(true)
  const [pieces, setPieces]             = useState<RichPiece[]>([])
  const [seeding, setSeeding]           = useState(false)
  const [loading, setLoading]           = useState(true)

  // Calendar navigation: start at May 2026
  const [calYear, setCalYear]   = useState(2026)
  const [calMonth, setCalMonth] = useState(4) // 0-indexed: 4 = May

  function mergePieces(rows: Awaited<ReturnType<typeof getCarousels>>): RichPiece[] {
    const result: RichPiece[] = []

    // Template pieces first
    rows.filter(r => r.template_piece_id != null).forEach(row => {
      const tmpl = CONTENT.find(c => c.id === row.template_piece_id)
      if (!tmpl) return
      result.push({ ...tmpl, dbId: row.id, dbStatus: row.status, scheduledAt: row.scheduled_at, caption: row.caption, isTemplate: true, darkMode: row.dark_mode, imageUrls: row.slide_image_urls })
    })

    // AI-generated pieces
    rows.filter(r => r.template_piece_id == null).forEach((row, i) => {
      const slides = normalizeSlides(row.slides_json)
      result.push({
        id: 10000 + i, day: 1, type: 'carousel', variant: 'ai', angle: 'feature',
        audience: 'all', sport: 'mix', hook: row.title,
        slides: slides.length > 0 ? slides : undefined,
        dbId: row.id, dbStatus: row.status, scheduledAt: row.scheduled_at,
        caption: row.caption, isTemplate: false, darkMode: row.dark_mode,
        imageUrls: row.slide_image_urls,
      })
    })

    return result
  }

  async function loadPieces() {
    setLoading(true)
    try {
      const rows = await getCarousels()
      setPieces(mergePieces(rows))
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    setMounted(true)
    const savedDark = localStorage.getItem('reser-cs-dark')
    if (savedDark !== null) setDark(savedDark !== 'false')
    loadPieces()
  }, [])

  const toggleDark = useCallback(() => {
    setDark(d => { const next = !d; localStorage.setItem('reser-cs-dark', String(next)); return next })
  }, [])

  async function handleSeed() {
    setSeeding(true)
    await seedMayCalendar()
    await loadPieces()
    setSeeding(false)
    setCalYear(2026); setCalMonth(4) // jump to May 2026 after seed
  }

  async function handleReset() {
    if (!confirm('¿Resetear todas las piezas a Borrador y corregir alternancia claro/oscuro?')) return
    await resetAllToDraft()
    await fixDarkModeAlternation()
    await loadPieces()
  }

  async function handleTriggerCron() {
    const result = await runDuePublishes()
    if ('error' in result) {
      alert(`Error: ${result.error}`)
    } else if (result.processed === 0 && result.failed === 0) {
      alert('Sin posts vencidos para publicar.')
    } else {
      alert(`✅ Publicados: ${result.processed}\n${result.results.map(r => `• ${r.status}: ${r.reason ?? r.postId ?? ''}`).join('\n')}`)
      await loadPieces()
    }
  }

  function handleStatusChange(dbId: string, newDbStatus: string, scheduledAt?: string) {
    setPieces(prev => prev.map(p =>
      p.dbId === dbId
        ? { ...p, dbStatus: newDbStatus, ...(scheduledAt !== undefined ? { scheduledAt } : {}) }
        : p
    ))
  }

  const hasTemplates = pieces.some(p => p.isTemplate)

  // Filter by status/type
  const filtered = pieces.filter(p => {
    const ui = dbToUI(p.dbStatus)
    if (filter === 'all')      return true
    if (filter === 'carousel') return p.type === 'carousel'
    if (filter === 'video')    return p.type === 'video'
    return ui === filter
  })

  const selectedPiece = selectedDbId ? pieces.find(p => p.dbId === selectedDbId) : undefined

  if (!mounted) return <Skeleton dark={dark}/>

  return (
    <div style={{ minHeight: '100vh', background: dark ? T.navyDeep : T.cream, color: dark ? T.cream : T.navy, fontFamily: FD }}>
      <TopBar
        dark={dark} toggleDark={toggleDark}
        view={view} setView={setView}
        filter={filter} setFilter={setFilter}
        onReset={handleReset}
        onTriggerCron={handleTriggerCron}
        totalPieces={pieces.length}
      />

      <div style={{ padding: '24px 36px 80px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0', fontFamily: FM, fontSize: 12, color: dark ? 'rgba(245,242,235,0.35)' : 'rgba(15,30,61,0.35)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            Cargando piezas...
          </div>
        ) : pieces.length === 0 ? (
          <EmptyState dark={dark} onSeed={handleSeed} seeding={seeding}/>
        ) : (
          <>
            <HeadlineStrip pieces={pieces} dark={dark}/>

            {view === 'calendar' ? (
              <CalendarView
                dark={dark}
                pieces={filtered}
                year={calYear}
                month={calMonth}
                onOpen={setSelectedDbId}
                setYear={setCalYear}
                setMonth={setCalMonth}
              />
            ) : (
              <ListView dark={dark} pieces={filtered} onOpen={setSelectedDbId}/>
            )}
          </>
        )}
      </div>

      {selectedPiece && (
        <Modal
          piece={selectedPiece}
          dark={dark}
          onClose={() => setSelectedDbId(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  )
}
