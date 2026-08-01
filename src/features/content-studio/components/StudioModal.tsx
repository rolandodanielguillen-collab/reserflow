'use client'

import { useState, useEffect, useCallback, useTransition } from 'react'
import type { RichPiece, UIStatus } from './studio-shared'
import { T, FD, FM, ARG_TZ, STATUS_META, dbToUI, uiToDB, utcISOToLocalInput, argInputToDate } from './studio-shared'
import { ScaledSlide, VideoPreview } from './SlideCanvas'
import { EventDesignPanel } from './EventDesignPanel'
import { setCarouselStatus } from '../services/set-carousel-status'
import { publishCarouselNow } from '../services/update-carousel-status'

type RecordPhase = 'idle' | 'recording' | 'uploading'

// ── Modal ─────────────────────────────────────────────────────────────────
export function Modal({ piece, dark, onClose, onStatusChange, onRefresh }: {
  piece: RichPiece
  dark: boolean
  onClose: () => void
  onStatusChange: (dbId: string, newDbStatus: string, scheduledAt?: string) => void
  onRefresh?: () => void
}) {
  const [idx, setIdx] = useState(0)
  const [isPending, startTransition] = useTransition()
  const [publishing, setPublishing] = useState(false)
  const [recordPhase, setRecordPhase] = useState<RecordPhase>('idle')
  const [recordPct, setRecordPct] = useState(0)
  const [showScheduler, setShowScheduler] = useState(false)
  const [schedInput, setSchedInput] = useState(
    piece.scheduledAt ? utcISOToLocalInput(piece.scheduledAt) : ''
  )
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)

  const uiStatus = dbToUI(piece.dbStatus)
  const total    = piece.type === 'carousel' ? (piece.slides?.length ?? piece.imageUrls?.length ?? 0) : 1

  // Use piece's own darkMode for rendering slides; UI chrome follows global dark
  const slideDark = piece.darkMode

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
    const isVideo = piece.type === 'video' && !!piece.script
    if (!piece.slides?.length && !piece.imageUrls?.length && !isVideo) {
      setFeedback({ type: 'err', msg: 'Este carrusel no tiene slides ni imágenes. Editalo antes de programar.' })
      return
    }
    const date = argInputToDate(schedInput)
    startTransition(async () => {
      setFeedback(null)

      setFeedback({ type: 'ok', msg: 'Programando...' })
      const schedBody: Record<string, unknown> = {
        carouselId: piece.dbId,
        scheduledAt: date.toISOString(),
        darkMode: slideDark,
      }
      if (isVideo) {
        schedBody.publishFormat = 'reel'
        schedBody.reelScriptId = piece.script
      }

      const res = await fetch('/api/carousel/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schedBody),
      })
      const json = await res.json() as { success?: boolean; error?: string }
      if (json.error) {
        setFeedback({ type: 'err', msg: json.error })
      } else {
        setFeedback({ type: 'ok', msg: isVideo ? 'Video programado ✓ (se renderizará automáticamente)' : 'Programado ✓' })
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
        <div style={{ background: slideDark ? '#05080F' : '#EAE5D8', padding: 40, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
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
              <ScaledSlide slide={piece.slides[idx]!} dark={slideDark} index={idx} total={total} width={420}/>
            ) : piece.type === 'carousel' && piece.imageUrls?.length ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={piece.imageUrls[idx]} alt="" style={{ width: 420, maxHeight: 525, objectFit: 'contain', borderRadius: 8, display: 'block' }}/>
            ) : (
              <VideoPreview dark={slideDark} width={420} scriptId={piece.script}/>
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
                  <ScaledSlide slide={s} dark={slideDark} index={i} total={total} width={64}/>
                </button>
              ))}
            </div>
          )}
          {piece.type === 'carousel' && !piece.slides && (piece.imageUrls?.length ?? 0) > 1 && (
            <div style={{ marginTop: 20, display: 'flex', gap: 8, overflowX: 'auto', padding: '4px 2px' }}>
              {piece.imageUrls!.map((u, i) => (
                <button key={i} onClick={() => setIdx(i)} style={{ all: 'unset', cursor: 'pointer', borderRadius: 7, overflow: 'hidden', outline: i === idx ? `2.5px solid ${T.mint}` : 'none', outlineOffset: 2, flexShrink: 0, transition: 'outline 160ms' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u} alt="" style={{ width: 64, height: 80, objectFit: 'cover', display: 'block' }}/>
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
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
              <div style={{ fontFamily: FD, fontWeight: 800, fontSize: 18, lineHeight: 1.25, letterSpacing: '-0.02em' }}>
                {piece.hook}
              </div>
              <span style={{ fontFamily: FM, fontSize: 9, color: inkSoft, opacity: 0.55, letterSpacing: '0.06em', flexShrink: 0 }}>
                #{piece.dbId.slice(0, 8)}
              </span>
            </div>
            {piece.scheduledAt ? (
              <div style={{ fontFamily: FM, fontSize: 10, color: '#6B9FFF', letterSpacing: '0.06em' }}>
                📅 {new Date(piece.scheduledAt).toLocaleString('es-AR', { dateStyle: 'long', timeStyle: 'short', timeZone: ARG_TZ })}
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

          {/* Panel de diseño (flyers de evento) */}
          {piece.type === 'carousel' && piece.slides?.[0]?.kind === 'event' && (
            <EventDesignPanel
              carouselId={piece.dbId}
              currentBgUrl={piece.slides[0].data.playerImageUrl}
              currentCaption={piece.caption}
              dark={dark}
              ink={ink}
              divLine={divLine}
              onApplied={() => onRefresh?.()}
            />
          )}

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
                    ? new Date(piece.scheduledAt).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short', timeZone: ARG_TZ })
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
                <div style={{ fontFamily: FM, fontSize: 9, color: T.mint, opacity: 0.75, letterSpacing: '0.08em' }}>
                  hora Argentina (UTC-3)
                </div>
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
                          body:    JSON.stringify({ scriptId: piece.script, dark: slideDark, cta: '', carouselId: piece.dbId }),
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
                disabled={isPending || publishing}
                onClick={async () => {
                  setPublishing(true)
                  try {
                    const result = await publishCarouselNow(piece.dbId)
                    if ('error' in result && result.error) {
                      setFeedback({ type: 'err', msg: result.error })
                    } else {
                      setFeedback({ type: 'ok', msg: '🚀 Publicándose en segundo plano — aviso por Telegram al terminar' })
                      onStatusChange(piece.dbId, 'publishing')
                    }
                  } catch (e) {
                    setFeedback({ type: 'err', msg: e instanceof Error ? e.message : 'Error publicando' })
                  } finally {
                    setPublishing(false)
                  }
                }}
                style={{ all: 'unset', cursor: (isPending || publishing) ? 'wait' : 'pointer', width: '100%', padding: '12px 14px', borderRadius: 10, background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(15,30,61,0.05)', border: `1.5px solid ${dark ? 'rgba(255,255,255,0.09)' : 'rgba(15,30,61,0.09)'}`, color: ink, fontFamily: FD, fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 9, boxSizing: 'border-box' as const, opacity: (isPending || publishing) ? 0.5 : 1 }}
              >
                <span>⚡</span> {publishing ? 'Renderizando y publicando...' : 'Publicar ahora en Instagram'}
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

