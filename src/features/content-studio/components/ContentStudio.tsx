'use client'

import { useState, useEffect, useCallback, useTransition, useRef } from 'react'
import Link from 'next/link'
import { CONTENT } from '../content'
import type { ContentPiece, DesignSlide } from '../types'
import { ScaledSlide, VideoPreview } from './SlideCanvas'
import { getCarousels } from '../services/get-carousels'
import { seedMayCalendar, resetAllToDraft } from '../services/seed-content-calendar'
import { setCarouselStatus } from '../services/set-carousel-status'
import { publishCarouselNow, publishCarouselWithImages } from '../services/update-carousel-status'
import { captureAndUploadSlides } from '../services/capture-slides'
import { triggerPublishDuePosts } from '../services/trigger-publish'
type RecordPhase = 'idle' | 'recording' | 'uploading'

// ── Design tokens ─────────────────────────────────────────────────────────
const T = {
  navy:     '#0F1E3D',
  navyDeep: '#0A1529',
  navySoft: '#1A2D52',
  mint:     '#17B095',
  cream:    '#F5F2EB',
  amber:    '#F4A94A',
  gray:     '#9B9B9B',
}
const FD = `'Archivo', 'Helvetica Neue', Helvetica, Arial, sans-serif`
const FM = `'JetBrains Mono', ui-monospace, SFMono-Regular, monospace`

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAYS_ES   = ['LU','MA','MI','JU','VI','SÁ','DO']

// Convierte un ISO UTC a string "YYYY-MM-DDTHH:mm" en hora LOCAL del browser
// (necesario para el atributo value de datetime-local, que opera en hora local)
function utcISOToLocalInput(utcIso: string): string {
  const d = new Date(utcIso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ── Status system ─────────────────────────────────────────────────────────
type UIStatus = 'borrador' | 'pendiente' | 'aprobado' | 'programado' | 'publicado' | 'fallido'

function dbToUI(s: string): UIStatus {
  if (s === 'published')  return 'publicado'
  if (s === 'approved')   return 'aprobado'
  if (s === 'scheduled')  return 'programado'
  if (s === 'review')     return 'pendiente'
  if (s === 'failed')     return 'fallido'
  return 'borrador'
}

function uiToDB(s: UIStatus): string {
  if (s === 'publicado')   return 'published'
  if (s === 'aprobado')    return 'approved'
  if (s === 'programado')  return 'scheduled'
  if (s === 'pendiente')   return 'review'
  return 'draft'
}

const STATUS_META: Record<UIStatus, { color: string; label: string }> = {
  borrador:  { color: T.gray,      label: 'Borrador'   },
  pendiente: { color: T.amber,     label: 'Pendiente'  },
  aprobado:  { color: T.mint,      label: 'Aprobado'   },
  programado:{ color: '#6B9FFF',   label: 'Programado' },
  publicado: { color: T.navy,      label: 'Publicado'  },
  fallido:   { color: '#E05252',   label: 'Fallido'    },
}

type AISlide = { type: 'cover' | 'content' | 'cta'; headline: string; body: string }

function mapAISlidesToDesign(slides: AISlide[]): DesignSlide[] {
  return slides.map(s => {
    if (s.type === 'cover') return { kind: 'cover' as const, big: s.headline, foot: s.body }
    if (s.type === 'cta')   return { kind: 'cta' as const, big: s.headline, cta: s.body }
    return { kind: 'list' as const, title: s.headline, items: [s.body] }
  })
}

// Piece augmented with DB data
type RichPiece = ContentPiece & {
  dbId: string
  dbStatus: string
  scheduledAt?: string | null
  caption?: string | null
  isTemplate: boolean
}

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
          <ScaledSlide slide={piece.slides[0]!} dark={dark} index={0} total={piece.slides.length} width={w}/>
        ) : (
          <VideoPreview dark={dark} width={w} scriptId={piece.script}/>
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
    ? new Date(piece.scheduledAt).toLocaleString('es-AR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
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
          <ScaledSlide slide={piece.slides[0]!} dark={dark} index={0} total={piece.slides.length} width={compact ? 80 : 100}/>
        ) : (
          <VideoPreview dark={dark} width={compact ? 80 : 100} scriptId={piece.script}/>
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
        <div style={{ fontFamily: FM, fontSize: 9, color: th.inkSoft, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {typeLabel}
        </div>
      </div>
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────
function Modal({ piece, dark, onClose, onStatusChange }: {
  piece: RichPiece
  dark: boolean
  onClose: () => void
  onStatusChange: (dbId: string, newDbStatus: string, scheduledAt?: string) => void
}) {
  const [idx, setIdx] = useState(0)
  const [isPending, startTransition] = useTransition()
  const [capturing, setCapturing] = useState(false)
  const [recordPhase, setRecordPhase] = useState<RecordPhase>('idle')
  const [recordPct, setRecordPct] = useState(0)
  const [showScheduler, setShowScheduler] = useState(false)
  const [schedInput, setSchedInput] = useState(
    piece.scheduledAt ? utcISOToLocalInput(piece.scheduledAt) : ''
  )
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)
  const slideContainerRef = useRef<HTMLDivElement>(null)

  const uiStatus = dbToUI(piece.dbStatus)
  const total    = piece.type === 'carousel' ? (piece.slides?.length ?? 0) : 1

  const panelBg = dark ? T.navyDeep : T.cream
  const infoBg  = dark ? T.navySoft : '#fff'
  const ink     = dark ? T.cream : T.navy
  const inkSoft = dark ? 'rgba(245,242,235,0.55)' : 'rgba(15,30,61,0.55)'
  const divLine = dark ? 'rgba(255,255,255,0.06)' : 'rgba(15,30,61,0.07)'

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
    if (piece.type === 'carousel') {
      if (e.key === 'ArrowRight') setIdx(i => Math.min(total - 1, i + 1))
      if (e.key === 'ArrowLeft')  setIdx(i => Math.max(0, i - 1))
    }
  }, [total, piece.type, onClose])

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  function run(fn: () => Promise<{ success?: boolean; error?: string }>, onSuccess: () => void) {
    startTransition(async () => {
      setFeedback(null)
      const res = await fn()
      if (res.error) {
        setFeedback({ type: 'err', msg: res.error })
      } else {
        setFeedback({ type: 'ok', msg: res.success ? 'Guardado ✓' : 'Listo ✓' })
        onSuccess()
        setTimeout(() => setFeedback(null), 3000)
      }
    })
  }

  function changeStatus(newUI: UIStatus) {
    const newDB = uiToDB(newUI)
    const isWA = newDB === 'review'
    run(
      () => setCarouselStatus(piece.dbId, newDB as Parameters<typeof setCarouselStatus>[1]),
      () => {
        onStatusChange(piece.dbId, newDB)
        if (isWA) setFeedback({ type: 'ok', msg: 'Guardado ✓ — WA enviado al admin' })
      }
    )
  }

  function handleSchedule() {
    if (!schedInput) return
    const date = new Date(schedInput)
    startTransition(async () => {
      setFeedback(null)
      const res = await fetch('/api/carousel/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ carouselId: piece.dbId, scheduledAt: date.toISOString() }),
      })
      const json = await res.json() as { success?: boolean; error?: string }
      if (json.error) {
        setFeedback({ type: 'err', msg: json.error })
      } else {
        setFeedback({ type: 'ok', msg: 'Programado ✓' })
        onStatusChange(piece.dbId, 'scheduled', date.toISOString())
        setShowScheduler(false)
        setTimeout(() => setFeedback(null), 3000)
      }
    })
  }


  const statuses: UIStatus[] = ['borrador', 'pendiente', 'aprobado', 'publicado']

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(10,21,41,0.88)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'stretch', justifyContent: 'center', fontFamily: FD }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 1280, background: panelBg, margin: 24, borderRadius: 24, overflow: 'hidden', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', boxShadow: '0 40px 100px rgba(0,0,0,0.6)' }}
      >
        {/* Preview */}
        <div ref={slideContainerRef} style={{ background: dark ? '#05080F' : '#EAE5D8', padding: 40, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
          {/* Hidden full-size slides for capture */}
          {piece.type === 'carousel' && piece.slides && (
            <div style={{ position: 'absolute', left: -9999, top: -9999, pointerEvents: 'none', display: 'flex', flexDirection: 'column' }}>
              {piece.slides.map((s, i) => (
                <div key={i} data-slide-capture="true" style={{ width: 1080, height: 1350, flexShrink: 0 }}>
                  <ScaledSlide slide={s} dark={dark} index={i} total={piece.slides!.length} width={1080} forCapture={true}/>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, color: ink }}>
            <div style={{ fontFamily: FM, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.5 }}>
              {piece.type === 'carousel' ? `Slide ${idx + 1} / ${total}` : 'Video 10s · loop'}
            </div>
            {piece.type === 'carousel' && (
              <div style={{ display: 'flex', gap: 5 }}>
                {piece.slides?.map((_, i) => (
                  <button key={i} onClick={() => setIdx(i)} style={{ all: 'unset', cursor: 'pointer', width: i === idx ? 22 : 7, height: 7, borderRadius: 4, background: i === idx ? T.mint : (dark ? 'rgba(255,255,255,0.2)' : 'rgba(15,30,61,0.2)'), transition: 'all 160ms' }}/>
                ))}
              </div>
            )}
          </div>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0, position: 'relative' }}>
            {piece.type === 'carousel' && piece.slides ? (
              <ScaledSlide slide={piece.slides[idx]!} dark={dark} index={idx} total={total} width={420}/>
            ) : (
              <VideoPreview dark={dark} width={420} scriptId={piece.script}/>
            )}
            {piece.type === 'carousel' && total > 1 && (
              <>
                <ArrowBtn dark={dark} side="left"  disabled={idx === 0}         onClick={() => setIdx(i => Math.max(0, i - 1))}/>
                <ArrowBtn dark={dark} side="right" disabled={idx === total - 1} onClick={() => setIdx(i => Math.min(total - 1, i + 1))}/>
              </>
            )}
          </div>

          {piece.type === 'carousel' && piece.slides && piece.slides.length > 1 && (
            <div style={{ marginTop: 20, display: 'flex', gap: 8, overflowX: 'auto', padding: '4px 2px' }}>
              {piece.slides.map((s, i) => (
                <button key={i} onClick={() => setIdx(i)} style={{ all: 'unset', cursor: 'pointer', borderRadius: 7, overflow: 'hidden', outline: i === idx ? `2.5px solid ${T.mint}` : 'none', outlineOffset: 2, flexShrink: 0, transition: 'outline 160ms' }}>
                  <ScaledSlide slide={s} dark={dark} index={i} total={total} width={64}/>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Control panel */}
        <div style={{ background: infoBg, borderLeft: `1px solid ${divLine}`, display: 'flex', flexDirection: 'column', color: ink, overflow: 'auto' }}>
          {/* Header */}
          <div style={{ padding: '22px 26px', borderBottom: `1px solid ${divLine}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ width: 8, height: 8, borderRadius: 4, background: STATUS_META[uiStatus].color, display: 'inline-block' }}/>
                <span style={{ fontFamily: FM, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: STATUS_META[uiStatus].color, fontWeight: 700 }}>
                  {STATUS_META[uiStatus].label}
                </span>
              </div>
              <button onClick={onClose} style={{ all: 'unset', cursor: 'pointer', width: 28, height: 28, borderRadius: 14, background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(15,30,61,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>×</button>
            </div>
            <div style={{ fontFamily: FD, fontWeight: 800, fontSize: 18, lineHeight: 1.25, letterSpacing: '-0.02em', marginBottom: 6 }}>
              {piece.hook}
            </div>
            {piece.scheduledAt ? (
              <div style={{ fontFamily: FM, fontSize: 10, color: '#6B9FFF', letterSpacing: '0.06em' }}>
                📅 {new Date(piece.scheduledAt).toLocaleString('es-AR', { dateStyle: 'long', timeStyle: 'short' })}
              </div>
            ) : (
              <div style={{ fontFamily: FM, fontSize: 10, color: T.amber, letterSpacing: '0.06em' }}>
                ⚠ Sin fecha programada
              </div>
            )}
          </div>

          {/* Feedback */}
          {feedback && (
            <div style={{ margin: '14px 26px 0', padding: '9px 13px', borderRadius: 9, background: feedback.type === 'ok' ? `${T.mint}1A` : '#ff444420', color: feedback.type === 'ok' ? T.mint : '#ff6666', fontFamily: FM, fontSize: 11, border: `1px solid ${feedback.type === 'ok' ? T.mint + '40' : '#ff444440'}` }}>
              {feedback.msg}
            </div>
          )}

          {/* Status selector */}
          <div style={{ padding: '20px 26px', borderBottom: `1px solid ${divLine}` }}>
            <div style={{ fontFamily: FM, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', opacity: 0.45, fontWeight: 700, marginBottom: 10, color: ink }}>ESTADO</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
              {statuses.map(s => {
                const meta = STATUS_META[s]
                const isActive = uiStatus === s
                return (
                  <button
                    key={s}
                    disabled={isPending}
                    onClick={() => changeStatus(s)}
                    style={{
                      all: 'unset', cursor: isPending ? 'wait' : 'pointer',
                      padding: '10px 12px', borderRadius: 10,
                      background: isActive ? `${meta.color}1A` : (dark ? 'rgba(255,255,255,0.04)' : 'rgba(15,30,61,0.04)'),
                      border: `1.5px solid ${isActive ? meta.color : (dark ? 'rgba(255,255,255,0.08)' : 'rgba(15,30,61,0.08)')}`,
                      color: isActive ? meta.color : inkSoft,
                      fontFamily: FD, fontWeight: isActive ? 700 : 500, fontSize: 13,
                      display: 'flex', alignItems: 'center', gap: 7,
                      opacity: isPending ? 0.5 : 1, transition: 'all 120ms',
                    }}
                  >
                    <span style={{ width: 7, height: 7, borderRadius: 4, background: isActive ? meta.color : (dark ? 'rgba(255,255,255,0.2)' : 'rgba(15,30,61,0.15)') }}/>
                    {meta.label}
                    {s === 'pendiente' && <span style={{ marginLeft: 'auto', fontSize: 10, opacity: 0.8 }}>💬</span>}
                  </button>
                )
              })}
            </div>
            <div style={{ marginTop: 8, fontFamily: FM, fontSize: 9, color: inkSoft, letterSpacing: '0.05em', lineHeight: 1.5 }}>
              💬 Pendiente envía WA automático al admin para aprobar
            </div>
          </div>

          {/* Programar */}
          <div style={{ padding: '18px 26px', borderBottom: `1px solid ${divLine}` }}>
            <div style={{ fontFamily: FM, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', opacity: 0.45, fontWeight: 700, marginBottom: 10, color: ink }}>PROGRAMAR</div>
            {!showScheduler ? (
              <button
                onClick={() => setShowScheduler(true)}
                style={{ all: 'unset', cursor: 'pointer', width: '100%', padding: '11px 14px', borderRadius: 10, background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(15,30,61,0.04)', border: `1.5px solid ${dark ? 'rgba(255,255,255,0.09)' : 'rgba(15,30,61,0.09)'}`, color: ink, fontFamily: FD, fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 9, boxSizing: 'border-box' as const }}
              >
                <span>📅</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                  {piece.scheduledAt
                    ? new Date(piece.scheduledAt).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
                    : 'Elegir fecha y hora'}
                </span>
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                <input
                  type="datetime-local"
                  value={schedInput}
                  onChange={e => setSchedInput(e.target.value)}
                  style={{ padding: '9px 11px', borderRadius: 8, border: `1.5px solid ${divLine}`, background: dark ? T.navyDeep : '#fff', color: ink, fontFamily: FM, fontSize: 12, outline: 'none', width: '100%', boxSizing: 'border-box' as const }}
                />
                <div style={{ display: 'flex', gap: 7 }}>
                  <button disabled={isPending || !schedInput} onClick={handleSchedule} style={{ all: 'unset', flex: 1, cursor: schedInput ? 'pointer' : 'default', padding: '10px 0', borderRadius: 9, background: T.mint, color: T.navy, fontFamily: FD, fontWeight: 700, fontSize: 13, textAlign: 'center' as const, opacity: isPending ? 0.6 : 1 }}>
                    Confirmar
                  </button>
                  <button onClick={() => setShowScheduler(false)} style={{ all: 'unset', cursor: 'pointer', padding: '10px 14px', borderRadius: 9, background: dark ? 'rgba(255,255,255,0.07)' : 'rgba(15,30,61,0.06)', color: inkSoft, fontFamily: FD, fontSize: 13 }}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Publicar ahora */}
          <div style={{ padding: '18px 26px' }}>
            <div style={{ fontFamily: FM, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', opacity: 0.45, fontWeight: 700, marginBottom: 10, color: ink }}>PUBLICAR EN INSTAGRAM</div>
            {piece.dbStatus === 'published' ? (
              <div style={{ padding: '12px 14px', borderRadius: 10, background: `${T.mint}14`, color: T.mint, fontFamily: FD, fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 9, border: `1px solid ${T.mint}30` }}>
                <span>✓</span> Publicado en Instagram
              </div>
            ) : piece.type === 'video' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recordPhase === 'idle' && (
                  <button
                    onClick={async () => {
                      if (!piece.script) { setFeedback({ type: 'err', msg: 'Sin script asignado a este video.' }); return }
                      setRecordPhase('recording')
                      setRecordPct(10)
                      try {
                        // 1. Render MP4 server-side via Remotion
                        // cta = '' → cada escena usa su texto por defecto ("Conocé más en el link")
                        // caption es solo para la descripción de Instagram, no para el video
                        const caption = piece.caption ?? piece.hook
                        const res = await fetch('/api/render-reel', {
                          method:  'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body:    JSON.stringify({ scriptId: piece.script, dark, cta: '', carouselId: piece.dbId }),
                        })
                        const renderResult = await res.json() as { url?: string; error?: string }
                        if (!renderResult.url) throw new Error(renderResult.error ?? 'Error en el render')

                        // 2. Publish as Reel
                        setRecordPhase('uploading')
                        setRecordPct(85)
                        const { publishReelToInstagram } = await import('@/features/scheduler/services/instagram-publish')
                        const pubResult = await publishReelToInstagram({ carouselId: piece.dbId, videoUrl: renderResult.url, caption })
                        if ('error' in pubResult && pubResult.error) {
                          setFeedback({ type: 'err', msg: pubResult.error })
                        } else {
                          setFeedback({ type: 'ok', msg: 'Reel publicado en Instagram ✓' })
                          onStatusChange(piece.dbId, 'published')
                        }
                      } catch (e) {
                        setFeedback({ type: 'err', msg: e instanceof Error ? e.message : 'Error renderizando video' })
                      } finally {
                        setRecordPhase('idle')
                        setRecordPct(0)
                      }
                    }}
                    style={{ all: 'unset', cursor: 'pointer', width: '100%', padding: '12px 14px', borderRadius: 10, background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(15,30,61,0.05)', border: `1.5px solid ${dark ? 'rgba(255,255,255,0.09)' : 'rgba(15,30,61,0.09)'}`, color: ink, fontFamily: FD, fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 9, boxSizing: 'border-box' as const }}
                  >
                    <span>🎬</span> Renderizar y publicar como Reel
                  </button>
                )}
                {recordPhase !== 'idle' && (
                  <div style={{ padding: '12px 14px', borderRadius: 10, background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(15,30,61,0.03)', border: `1px solid ${T.mint}33`, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontFamily: FM, fontSize: 11, color: T.mint, letterSpacing: '0.06em' }}>
                      {recordPhase === 'recording'  && '⚙ Renderizando MP4 con Remotion...'}
                      {recordPhase === 'uploading'  && '⬆ Publicando en Instagram...'}
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: dark ? 'rgba(255,255,255,0.1)' : 'rgba(15,30,61,0.1)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 2, background: T.mint, width: `${recordPct}%`, transition: 'width 1s ease' }}/>
                    </div>
                    <div style={{ fontFamily: FM, fontSize: 10, color: inkSoft }}>
                      {recordPhase === 'recording' && 'Render server-side — tarda ~30-60s en dev'}
                    </div>
                  </div>
                )}
                <div style={{ fontFamily: FM, fontSize: 9, color: inkSoft, letterSpacing: '0.06em', lineHeight: 1.5, padding: '4px 2px' }}>
                  Remotion renderiza el MP4 server-side con Chromium.<br/>
                  Calidad idéntica al preview, sin permisos de pantalla.
                </div>
              </div>
            ) : (
              <button
                disabled={isPending || capturing}
                onClick={async () => {
                  if (piece.slides?.length && slideContainerRef.current) {
                    setCapturing(true)
                    setFeedback(null)
                    try {
                      const { createClient } = await import('@/lib/supabase/client')
                      const supabase = createClient()
                      const { data: { user } } = await supabase.auth.getUser()
                      if (!user) { setFeedback({ type: 'err', msg: 'No autenticado' }); return }
                      const slideEls = slideContainerRef.current.querySelectorAll<HTMLElement>('[data-slide-capture]')
                      const urls = await captureAndUploadSlides(Array.from(slideEls), piece.dbId, user.id)
                      const result = await publishCarouselWithImages(piece.dbId, urls)
                      if ('error' in result && result.error) {
                        setFeedback({ type: 'err', msg: result.error })
                      } else {
                        setFeedback({ type: 'ok', msg: 'Publicado en Instagram ✓' })
                        onStatusChange(piece.dbId, 'published')
                      }
                    } catch (e) {
                      setFeedback({ type: 'err', msg: e instanceof Error ? e.message : 'Error capturando slides' })
                    } finally {
                      setCapturing(false)
                    }
                  } else {
                    run(() => publishCarouselNow(piece.dbId), () => onStatusChange(piece.dbId, 'published'))
                  }
                }}
                style={{ all: 'unset', cursor: (isPending || capturing) ? 'wait' : 'pointer', width: '100%', padding: '12px 14px', borderRadius: 10, background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(15,30,61,0.05)', border: `1.5px solid ${dark ? 'rgba(255,255,255,0.09)' : 'rgba(15,30,61,0.09)'}`, color: ink, fontFamily: FD, fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 9, boxSizing: 'border-box' as const, opacity: (isPending || capturing) ? 0.5 : 1 }}
              >
                <span>⚡</span> {capturing ? 'Capturando slides...' : 'Publicar ahora en Instagram'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ArrowBtn({ side, dark, onClick, disabled }: { side: 'left' | 'right'; dark: boolean; onClick: () => void; disabled: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ all: 'unset', cursor: disabled ? 'default' : 'pointer', position: 'absolute', top: '50%', transform: 'translateY(-50%)', [side]: 12, width: 42, height: 42, borderRadius: 21, background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(15,30,61,0.08)', color: dark ? T.cream : T.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, opacity: disabled ? 0.25 : 1 }}>
      {side === 'left' ? '‹' : '›'}
    </button>
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
  const autoTriggeredRef                = useRef(false)

  // Calendar navigation: start at May 2026
  const [calYear, setCalYear]   = useState(2026)
  const [calMonth, setCalMonth] = useState(4) // 0-indexed: 4 = May

  function mergePieces(rows: Awaited<ReturnType<typeof getCarousels>>): RichPiece[] {
    const result: RichPiece[] = []

    // Template pieces first
    rows.filter(r => r.template_piece_id != null).forEach(row => {
      const tmpl = CONTENT.find(c => c.id === row.template_piece_id)
      if (!tmpl) return
      result.push({ ...tmpl, dbId: row.id, dbStatus: row.status, scheduledAt: row.scheduled_at, caption: row.caption, isTemplate: true })
    })

    // AI-generated pieces
    rows.filter(r => r.template_piece_id == null).forEach((row, i) => {
      const rawSlides = Array.isArray(row.slides_json) ? (row.slides_json as AISlide[]) : []
      const slides = mapAISlidesToDesign(rawSlides)
      result.push({
        id: 10000 + i, day: 1, type: 'carousel', variant: 'ai', angle: 'feature',
        audience: 'all', sport: 'mix', hook: row.title,
        slides: slides.length > 0 ? slides : undefined,
        dbId: row.id, dbStatus: row.status, scheduledAt: row.scheduled_at,
        caption: row.caption, isTemplate: false,
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

  // Auto-publicar posts vencidos al cargar el Content Studio
  useEffect(() => {
    if (loading || pieces.length === 0 || autoTriggeredRef.current) return
    const now = new Date()
    const hasDue = pieces.some(p =>
      p.dbStatus === 'scheduled' &&
      p.scheduledAt &&
      new Date(p.scheduledAt) <= now
    )
    if (!hasDue) return
    autoTriggeredRef.current = true
    triggerPublishDuePosts()
      .then(result => { if (result.processed > 0) loadPieces() })
      .catch(() => {})
  }, [loading, pieces])

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
    if (!confirm('¿Resetear todas las piezas a Borrador?')) return
    await resetAllToDraft()
    setPieces(prev => prev.map(p => ({ ...p, dbStatus: 'draft' })))
  }

  async function handleTriggerCron() {
    const result = await triggerPublishDuePosts()
    if (result.error) {
      alert(`Sin posts para publicar: ${result.error}`)
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
        ) : !hasTemplates ? (
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
