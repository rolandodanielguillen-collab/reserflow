'use client'

import { useState, useEffect, useCallback } from 'react'
import { CONTENT } from '../content'
import type { ContentPiece, PieceStatus } from '../types'
import { ScaledSlide, VideoPreview } from './SlideCanvas'

// ── Design tokens ─────────────────────────────────────────────────────────
const T = {
  navy:     '#0F1E3D',
  navyDeep: '#0A1529',
  navySoft: '#1A2D52',
  mint:     '#17B095',
  cream:    '#F5F2EB',
}
const FD = `'Archivo', 'Helvetica Neue', Helvetica, Arial, sans-serif`
const FM = `'JetBrains Mono', ui-monospace, SFMono-Regular, monospace`

const STORAGE_KEY = 'reser-content-studio-v1'

function statusToColor(s: PieceStatus | undefined): string {
  const map: Record<PieceStatus, string> = {
    borrador:  '#9B9B9B',
    pendiente: '#F4A94A',
    aprobado:  T.mint,
    publicado: T.navy,
  }
  return map[s ?? 'borrador'] ?? '#9B9B9B'
}

function audienceLabel(a: string): string {
  const map: Record<string, string> = { B2C: 'Jugadores', B2B: 'Clubes', edificios: 'Edificios', all: 'Todos' }
  return map[a] ?? a
}

function angleLabel(a: string): string {
  const map: Record<string, string> = {
    'no-app': 'Sin app, solo WA',
    'speed': 'Rapidez',
    'compare': 'Antes/después',
    'brand': 'Marca',
    'problem': 'Problemas',
    'use-case': 'Caso de uso',
    'benefit-club': 'Beneficio club',
    'feature': 'Feature',
  }
  return map[a] ?? a
}

function buildDefaultStatuses(): Record<number, PieceStatus> {
  const init: Record<number, PieceStatus> = {}
  CONTENT.forEach((p, i) => {
    init[p.id] = i < 5 ? 'publicado' : i < 10 ? 'aprobado' : i < 18 ? 'pendiente' : 'borrador'
  })
  return init
}

// ── Loading skeleton ──────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div style={{ minHeight: '100vh', background: T.navyDeep, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: FM, fontSize: 13, letterSpacing: '0.14em', color: 'rgba(245,242,235,0.4)', textTransform: 'uppercase' }}>
        Cargando Content Studio...
      </div>
    </div>
  )
}

// ── Stats strip ───────────────────────────────────────────────────────────
function HeadlineStrip({ statuses, dark }: { statuses: Record<number, PieceStatus>; dark: boolean }) {
  const th = dark
    ? { panel: T.navySoft, ink: T.cream, inkSoft: 'rgba(245,242,235,0.65)', line: 'rgba(245,242,235,0.08)' }
    : { panel: '#fff', ink: T.navy, inkSoft: 'rgba(15,30,61,0.65)', line: 'rgba(15,30,61,0.08)' }

  const counts = { total: CONTENT.length, aprobado: 0, pendiente: 0, publicado: 0, borrador: 0 }
  CONTENT.forEach(p => {
    const s = statuses[p.id] ?? 'borrador'
    counts[s as PieceStatus] = (counts[s as PieceStatus] || 0) + 1
  })

  const stats = [
    { n: counts.total,     label: 'piezas',     sub: '30 días' },
    { n: counts.publicado, label: 'publicadas',  sub: 'ya en IG',            color: T.navy },
    { n: counts.aprobado,  label: 'aprobadas',   sub: 'listas para salir',   color: T.mint },
    { n: counts.pendiente, label: 'pendientes',  sub: 'esperan aprobación',  color: '#F4A94A' },
    { n: counts.borrador,  label: 'borradores',  sub: 'en edición',          color: '#9B9B9B' },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 28 }}>
      {stats.map((s, i) => (
        <div key={i} style={{ padding: '20px 22px', background: th.panel, border: `1px solid ${th.line}`, borderRadius: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <div style={{ fontFamily: FD, fontWeight: 900, fontSize: 42, letterSpacing: '-0.04em', lineHeight: 1, color: s.color ?? th.ink }}>{s.n}</div>
            <div style={{ fontFamily: FD, fontSize: 14, fontWeight: 600, color: th.ink }}>{s.label}</div>
          </div>
          <div style={{ fontFamily: FM, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: th.inkSoft }}>{s.sub}</div>
        </div>
      ))}
    </div>
  )
}

// ── Calendar View ─────────────────────────────────────────────────────────
const DAYS = ['LU', 'MA', 'MI', 'JU', 'VI', 'SÁ', 'DO']

function CalendarView({ dark, statuses, onOpen, filteredContent }: {
  dark: boolean
  statuses: Record<number, PieceStatus>
  onOpen: (id: number) => void
  filteredContent: ContentPiece[]
}) {
  const th = dark
    ? { panel: T.navySoft, ink: T.cream, inkSoft: 'rgba(245,242,235,0.65)', line: 'rgba(245,242,235,0.08)' }
    : { panel: '#fff', ink: T.navy, inkSoft: 'rgba(15,30,61,0.65)', line: 'rgba(15,30,61,0.08)' }

  const startOffset = 2 // April 1 2026 is a Wednesday
  const cells: (number | null)[] = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= 30; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const byDay: Record<number, ContentPiece[]> = {}
  filteredContent.forEach(p => {
    if (!byDay[p.day]) byDay[p.day] = []
    byDay[p.day].push(p)
  })

  return (
    <div style={{ background: th.panel, border: `1px solid ${th.line}`, borderRadius: 18, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: `1px solid ${th.line}` }}>
        {DAYS.map(d => (
          <div key={d} style={{ padding: '14px 16px', fontFamily: FM, fontSize: 11, letterSpacing: '0.14em', color: th.inkSoft, fontWeight: 600 }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {cells.map((day, i) => {
          const pieces = day ? (byDay[day] ?? []) : []
          const isWeekend = (i % 7) >= 5
          return (
            <div key={i} style={{
              minHeight: 200, padding: 10,
              background: day && isWeekend ? (dark ? 'rgba(255,255,255,0.02)' : 'rgba(15,30,61,0.02)') : 'transparent',
              borderRight: (i % 7 !== 6) ? `1px solid ${th.line}` : 'none',
              borderBottom: `1px solid ${th.line}`,
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              {day && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <div style={{ fontFamily: FM, fontSize: 13, fontWeight: 700, color: th.ink }}>{String(day).padStart(2, '0')}</div>
                  {pieces.length > 0 && (
                    <div style={{ fontFamily: FM, fontSize: 9, letterSpacing: '0.1em', color: th.inkSoft, textTransform: 'uppercase' }}>{pieces.length}</div>
                  )}
                </div>
              )}
              {pieces.map(p => (
                <CalendarPiece key={p.id} piece={p} dark={dark} status={statuses[p.id] ?? 'borrador'} onClick={() => onOpen(p.id)}/>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CalendarPiece({ piece, dark, status, onClick }: { piece: ContentPiece; dark: boolean; status: PieceStatus; onClick: () => void }) {
  const width = 120
  const sColor = statusToColor(status)
  return (
    <button onClick={onClick} style={{ all: 'unset', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4, position: 'relative' }}>
      <div style={{ width, borderRadius: 6, overflow: 'hidden', border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(15,30,61,0.1)'}`, position: 'relative' }}>
        {piece.type === 'carousel' && piece.slides ? (
          <ScaledSlide slide={piece.slides[0]!} dark={dark} index={0} total={piece.slides.length} width={width}/>
        ) : (
          <VideoPreview dark={dark} width={width}/>
        )}
        <div style={{ position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: 4, background: sColor, boxShadow: '0 0 0 2px rgba(0,0,0,0.25)' }}/>
        {piece.type === 'video' && (
          <div style={{ position: 'absolute', bottom: 4, left: 4, background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '2px 5px', borderRadius: 3, fontFamily: FM, fontSize: 8, letterSpacing: '0.08em', fontWeight: 700 }}>▶ 10S</div>
        )}
      </div>
      <div style={{ fontSize: 10, fontWeight: 600, lineHeight: 1.2, letterSpacing: '-0.01em', color: dark ? T.cream : T.navy, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, maxWidth: width }}>
        {piece.hook}
      </div>
    </button>
  )
}

// ── List View ─────────────────────────────────────────────────────────────
function ListView({ dark, statuses, onOpen, filteredContent }: {
  dark: boolean
  statuses: Record<number, PieceStatus>
  onOpen: (id: number) => void
  filteredContent: ContentPiece[]
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: 14 }}>
      {filteredContent.map(p => (
        <PieceCard key={p.id} piece={p} dark={dark} onClick={() => onOpen(p.id)} statusColor={statusToColor(statuses[p.id] ?? 'borrador')}/>
      ))}
    </div>
  )
}

function PieceCard({ piece, dark, onClick, statusColor }: { piece: ContentPiece; dark: boolean; onClick: () => void; statusColor: string }) {
  const typeLabel = piece.type === 'video' ? 'Video 10s' : `Carrusel · ${piece.slides?.length ?? 0}`
  const th = dark
    ? { ink: T.cream, inkSoft: 'rgba(245,242,235,0.65)' }
    : { ink: T.navy, inkSoft: 'rgba(15,30,61,0.65)' }
  return (
    <div
      style={{ background: dark ? T.navySoft : '#fff', border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(15,30,61,0.1)'}`, borderRadius: 18, padding: 16, display: 'flex', gap: 16, cursor: 'pointer', transition: 'transform 160ms, box-shadow 160ms' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = dark ? '0 12px 32px rgba(0,0,0,0.4)' : '0 12px 32px rgba(15,30,61,0.1)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
      onClick={onClick}
    >
      <div style={{ flexShrink: 0, borderRadius: 10, overflow: 'hidden', border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(15,30,61,0.1)'}` }}>
        {piece.type === 'carousel' && piece.slides ? (
          <ScaledSlide slide={piece.slides[0]!} dark={dark} index={0} total={piece.slides.length} width={120}/>
        ) : (
          <VideoPreview dark={dark} width={120}/>
        )}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: FM, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: th.inkSoft, fontWeight: 600 }}>
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: statusColor }}/>
          DÍA {String(piece.day).padStart(2, '0')} · {typeLabel}
        </div>
        <div style={{ marginTop: 8, fontFamily: FD, fontWeight: 700, fontSize: 18, lineHeight: 1.2, letterSpacing: '-0.02em', color: th.ink }}>
          {piece.hook}
        </div>
        <div style={{ marginTop: 6, fontSize: 13, color: th.inkSoft, lineHeight: 1.4 }}>
          {audienceLabel(piece.audience)} · {angleLabel(piece.angle)}
        </div>
        <div style={{ flex: 1 }}/>
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <span style={{ display: 'inline-block', fontFamily: FM, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '4px 9px', borderRadius: 6, background: `${T.mint}22`, color: T.mint, fontWeight: 600, border: `1px solid ${T.mint}44` }}>{piece.angle}</span>
          {piece.sport && piece.sport !== 'mix' && (
            <span style={{ display: 'inline-block', fontFamily: FM, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '4px 9px', borderRadius: 6, background: dark ? 'rgba(245,242,235,0.08)' : 'rgba(15,30,61,0.06)', color: dark ? 'rgba(245,242,235,0.7)' : 'rgba(15,30,61,0.65)', fontWeight: 600 }}>{piece.sport}</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────
function Modal({ piece, dark, statuses, onClose, onChangeStatus }: {
  piece: ContentPiece
  dark: boolean
  statuses: Record<number, PieceStatus>
  onClose: () => void
  onChangeStatus: (id: number, s: PieceStatus) => void
}) {
  const [idx, setIdx] = useState(0)
  const total = piece.type === 'carousel' ? (piece.slides?.length ?? 0) : 1
  const status = statuses[piece.id] ?? 'borrador'

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

  const previewW = 440
  const panelBg  = dark ? T.navyDeep : T.cream
  const infoBg   = dark ? T.navySoft : '#fff'
  const ink      = dark ? T.cream : T.navy
  const inkSoft  = dark ? 'rgba(245,242,235,0.65)' : 'rgba(15,30,61,0.65)'
  const divLine  = dark ? 'rgba(255,255,255,0.06)' : 'rgba(15,30,61,0.08)'

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(10,21,41,0.85)', backdropFilter: 'blur(14px)', display: 'flex', alignItems: 'stretch', justifyContent: 'center', fontFamily: FD }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 1280, background: panelBg, margin: 28, borderRadius: 24, overflow: 'hidden', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 380px', boxShadow: '0 40px 100px rgba(0,0,0,0.5)' }}
      >
        {/* Preview panel */}
        <div style={{ background: dark ? '#05080F' : '#EAE5D8', padding: 40, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, color: ink }}>
            <div style={{ fontFamily: FM, fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.6 }}>
              {piece.type === 'carousel' ? `Slide ${idx + 1} / ${total}` : 'Video 10s · loop'}
            </div>
            {piece.type === 'carousel' && (
              <div style={{ display: 'flex', gap: 6 }}>
                {piece.slides?.map((_, i) => (
                  <button key={i} onClick={() => setIdx(i)} style={{ all: 'unset', cursor: 'pointer', width: i === idx ? 24 : 8, height: 8, borderRadius: 4, background: i === idx ? T.mint : (dark ? 'rgba(255,255,255,0.2)' : 'rgba(15,30,61,0.2)'), transition: 'all 160ms' }}/>
                ))}
              </div>
            )}
          </div>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0, position: 'relative' }}>
            {piece.type === 'carousel' && piece.slides ? (
              <ScaledSlide slide={piece.slides[idx]!} dark={dark} index={idx} total={total} width={previewW}/>
            ) : (
              <VideoPreview dark={dark} width={previewW}/>
            )}
            {piece.type === 'carousel' && total > 1 && (
              <>
                <ArrowBtn dark={dark} side="left"  disabled={idx === 0}         onClick={() => setIdx(i => Math.max(0, i - 1))}/>
                <ArrowBtn dark={dark} side="right" disabled={idx === total - 1} onClick={() => setIdx(i => Math.min(total - 1, i + 1))}/>
              </>
            )}
          </div>

          {piece.type === 'carousel' && piece.slides && (
            <div style={{ marginTop: 24, display: 'flex', gap: 12, overflowX: 'auto', padding: '4px 2px' }}>
              {piece.slides.map((s, i) => (
                <button key={i} onClick={() => setIdx(i)} style={{ all: 'unset', cursor: 'pointer', borderRadius: 8, overflow: 'hidden', outline: i === idx ? `3px solid ${T.mint}` : 'none', outlineOffset: 2, flexShrink: 0, transition: 'outline 160ms' }}>
                  <ScaledSlide slide={s} dark={dark} index={i} total={total} width={80}/>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info panel */}
        <div style={{ background: infoBg, borderLeft: `1px solid ${divLine}`, display: 'flex', flexDirection: 'column', color: ink, overflow: 'auto' }}>
          <div style={{ padding: 28, borderBottom: `1px solid ${divLine}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ fontFamily: FM, fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.mint, fontWeight: 600 }}>
                DÍA {String(piece.day).padStart(2, '0')} DE ABRIL
              </div>
              <button onClick={onClose} style={{ all: 'unset', cursor: 'pointer', width: 32, height: 32, borderRadius: 16, background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(15,30,61,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>×</button>
            </div>
            <div style={{ fontFamily: FD, fontWeight: 800, fontSize: 22, lineHeight: 1.15, letterSpacing: '-0.02em' }}>
              {piece.hook}
            </div>
          </div>

          <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <MetaRow label="Tipo"      value={piece.type === 'video' ? 'Video 10s' : `Carrusel ${total} slides`} ink={ink} inkSoft={inkSoft}/>
            <MetaRow label="Audiencia" value={audienceLabel(piece.audience)} ink={ink} inkSoft={inkSoft}/>
            <MetaRow label="Enfoque"   value={angleLabel(piece.angle)} ink={ink} inkSoft={inkSoft}/>
            {piece.sport && <MetaRow label="Deporte" value={piece.sport} ink={ink} inkSoft={inkSoft}/>}
            <MetaRow label="CTA"       value="Conocé más en el link" ink={ink} inkSoft={inkSoft}/>
          </div>

          {/* Status selector */}
          <div style={{ padding: 28, borderTop: `1px solid ${divLine}` }}>
            <div style={{ fontFamily: FM, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', opacity: 0.55, fontWeight: 600, marginBottom: 12 }}>ESTADO DE PUBLICACIÓN</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(['borrador', 'pendiente', 'aprobado', 'publicado'] as PieceStatus[]).map(s => (
                <button key={s} onClick={() => onChangeStatus(piece.id, s)} style={{ all: 'unset', cursor: 'pointer', padding: '12px 16px', borderRadius: 10, background: status === s ? T.mint : (dark ? 'rgba(255,255,255,0.04)' : 'rgba(15,30,61,0.04)'), color: status === s ? T.navy : ink, fontFamily: FD, fontWeight: status === s ? 700 : 500, fontSize: 14, letterSpacing: '-0.01em', textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 5, background: status === s ? T.navy : statusToColor(s) }}/>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* WhatsApp approval preview */}
          <div style={{ padding: 28, borderTop: `1px solid ${divLine}` }}>
            <div style={{ fontFamily: FM, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', opacity: 0.55, fontWeight: 600, marginBottom: 12 }}>APROBACIÓN VÍA WHATSAPP</div>
            <div style={{ background: dark ? '#0b141a' : '#ECE5DD', borderRadius: 14, padding: 14, fontSize: 13, lineHeight: 1.4, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ alignSelf: 'flex-start', background: dark ? '#202C33' : '#FFFFFF', color: dark ? '#E9EDEF' : '#111B21', padding: '10px 14px', borderRadius: 12, borderTopLeftRadius: 4, maxWidth: '90%' }}>
                🗓 Publicación programada<br/>
                <strong>{piece.hook}</strong><br/>
                Hoy · 18:00hs<br/>
                ¿Apruebas?
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ArrowBtn({ side, dark, onClick, disabled }: { side: 'left' | 'right'; dark: boolean; onClick: () => void; disabled: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ all: 'unset', cursor: disabled ? 'default' : 'pointer', position: 'absolute', top: '50%', transform: 'translateY(-50%)', [side]: 12, width: 44, height: 44, borderRadius: 22, background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(15,30,61,0.08)', color: dark ? T.cream : T.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, opacity: disabled ? 0.3 : 1 }}>
      {side === 'left' ? '‹' : '›'}
    </button>
  )
}

function MetaRow({ label, value, ink, inkSoft }: { label: string; value: string; ink: string; inkSoft: string }) {
  return (
    <div>
      <div style={{ fontFamily: FM, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', opacity: 0.55, fontWeight: 600, marginBottom: 4, color: ink }}>{label}</div>
      <div style={{ fontFamily: FD, fontSize: 15, fontWeight: 500, textTransform: 'capitalize', color: ink }}>{value}</div>
    </div>
  )
}

// ── Top Bar ───────────────────────────────────────────────────────────────
function TopBar({ dark, view, setView, filter, setFilter }: {
  dark: boolean
  view: 'calendar' | 'list'
  setView: (v: 'calendar' | 'list') => void
  filter: string
  setFilter: (f: string) => void
}) {
  const bg     = dark ? T.navyDeep : T.cream
  const ink    = dark ? T.cream : T.navy
  const inkSoft = dark ? 'rgba(245,242,235,0.65)' : 'rgba(15,30,61,0.65)'
  const line   = dark ? 'rgba(245,242,235,0.08)' : 'rgba(15,30,61,0.08)'

  return (
    <header style={{ padding: '18px 40px', background: bg, borderBottom: `1px solid ${line}`, display: 'flex', alignItems: 'center', gap: 20, position: 'sticky', top: 0, zIndex: 40, backdropFilter: 'blur(12px)' }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: FD, fontWeight: 900, fontSize: 22, letterSpacing: '-0.04em', color: ink, lineHeight: 1 }}>
        <span>RESER</span>
        <svg viewBox="0 0 100 100" width={20} height={20} style={{ position: 'relative', top: 1 }}>
          <rect x="38" y="8" width="24" height="84" fill={T.mint}/>
          <rect x="8" y="38" width="84" height="24" fill={T.mint}/>
        </svg>
      </div>
      <div style={{ fontFamily: FM, fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: inkSoft, fontWeight: 600 }}>
        Content Studio · Abril 2026
      </div>

      <div style={{ flex: 1 }}/>

      {/* View toggle */}
      <div style={{ display: 'flex', gap: 2, padding: 3, background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(15,30,61,0.06)', borderRadius: 10 }}>
        {(['calendar', 'list'] as const).map(v => (
          <button key={v} onClick={() => setView(v)} style={{ all: 'unset', cursor: 'pointer', padding: '7px 16px', borderRadius: 8, fontFamily: FD, fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em', background: view === v ? (dark ? T.navy : '#fff') : 'transparent', color: view === v ? (dark ? T.cream : T.navy) : inkSoft, textTransform: 'capitalize', transition: 'all 160ms' }}>
            {v === 'calendar' ? 'Calendario' : 'Lista'}
          </button>
        ))}
      </div>

      {/* Filter */}
      <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: '8px 14px', background: dark ? 'rgba(255,255,255,0.06)' : '#fff', color: ink, border: `1px solid ${line}`, borderRadius: 10, fontFamily: FD, fontSize: 13, fontWeight: 500, cursor: 'pointer', outline: 'none' }}>
        <option value="all">Todos</option>
        <option value="carousel">Carruseles</option>
        <option value="video">Videos</option>
        <option value="B2B">Clubes (B2B)</option>
        <option value="B2C">Jugadores (B2C)</option>
        <option value="edificios">Edificios</option>
      </select>

      {/* Nueva pieza button */}
      <button style={{ all: 'unset', cursor: 'pointer', padding: '9px 18px', background: T.mint, color: T.navy, borderRadius: 10, fontFamily: FD, fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
        <svg width="14" height="14" viewBox="0 0 14 14"><rect x="4" y="0" width="6" height="14" fill={T.navy}/><rect x="0" y="4" width="14" height="6" fill={T.navy}/></svg>
        Nueva pieza
      </button>
    </header>
  )
}

// ── Main component ────────────────────────────────────────────────────────
export function ContentStudio() {
  const [mounted, setMounted] = useState(false)
  const [view, setView]       = useState<'calendar' | 'list'>('calendar')
  const [filter, setFilter]   = useState('all')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const dark = true
  const [statuses, setStatuses] = useState<Record<number, PieceStatus>>({})

  useEffect(() => {
    setMounted(true)
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        setStatuses(JSON.parse(raw) as Record<number, PieceStatus>)
      } else {
        const init = buildDefaultStatuses()
        setStatuses(init)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(init))
      }
    } catch {
      setStatuses(buildDefaultStatuses())
    }
  }, [])

  useEffect(() => {
    if (!mounted) return
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(statuses)) } catch {}
  }, [statuses, mounted])

  const setStatus = useCallback((id: number, s: PieceStatus) => {
    setStatuses(prev => ({ ...prev, [id]: s }))
  }, [])

  const filteredContent = CONTENT.filter(p => {
    if (filter === 'all')      return true
    if (filter === 'carousel') return p.type === 'carousel'
    if (filter === 'video')    return p.type === 'video'
    return p.audience === filter
  })

  const selectedPiece = selectedId != null ? CONTENT.find(p => p.id === selectedId) : undefined

  const bgColor = dark ? T.navyDeep : T.cream

  if (!mounted) return <Skeleton/>

  return (
    <div style={{ minHeight: '100vh', background: bgColor, color: dark ? T.cream : T.navy, fontFamily: FD }}>
      <TopBar dark={dark} view={view} setView={setView} filter={filter} setFilter={setFilter}/>

      <div style={{ padding: '24px 40px 80px' }}>
        <HeadlineStrip statuses={statuses} dark={dark}/>

        {view === 'calendar' ? (
          <CalendarView dark={dark} statuses={statuses} onOpen={setSelectedId} filteredContent={filteredContent}/>
        ) : (
          <ListView dark={dark} statuses={statuses} onOpen={setSelectedId} filteredContent={filteredContent}/>
        )}
      </div>

      {selectedPiece && (
        <Modal piece={selectedPiece} dark={dark} statuses={statuses} onClose={() => setSelectedId(null)} onChangeStatus={setStatus}/>
      )}
    </div>
  )
}
