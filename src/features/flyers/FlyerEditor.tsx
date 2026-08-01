'use client'

// Editor de Flyers — página dedicada, amigable y profesional.
// Lista de flyers · preview grande EN VIVO · colores, fondo y caption con
// vista previa instantánea · publicar / programar / mandar a aprobación.

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { EventIntroScene } from '@/features/content-studio/components/EventIntroScene'
import { T, FD, FM, ARG_TZ, STATUS_META, dbToUI, argInputToDate, utcISOToLocalInput } from '@/features/content-studio/components/studio-shared'

const RemotionPlayer = dynamic(() => import('@remotion/player').then(m => m.Player), { ssr: false })
import { ScaledSlide } from '@/features/content-studio/components/SlideCanvas'
import { PALETTES } from '@/features/design/palettes'
import { updateEventDesign, listLibraryImagesForPicker } from '@/features/content-studio/services/event-design'
import { publishCarouselNow } from '@/features/content-studio/services/update-carousel-status'
import { setCarouselStatus } from '@/features/content-studio/services/set-carousel-status'
import { getFlyerPieces, type FlyerPiece } from './flyer-actions'
import type { DesignSlide, EventFlyerData, PaletteTokens } from '@/features/content-studio/types'
import type { EventDataOverrides } from '@/features/ingest/flyer-ingest'

const INK_SOFT = 'rgba(245,242,235,0.55)'
const LINE = 'rgba(245,242,235,0.09)'
const SECTION: React.CSSProperties = { fontFamily: FM, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: INK_SOFT, fontWeight: 700, marginBottom: 10 }

type Busy = null | 'guardar' | 'publicar' | 'programar' | 'aprobar'

export function FlyerEditor({ initialPieceId }: { initialPieceId?: string | null }) {
  const [pieces, setPieces] = useState<FlyerPiece[]>([])
  const [closingVideoUrl, setClosingVideoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selId, setSelId] = useState<string | null>(null)
  const [slideIdx, setSlideIdx] = useState(0)
  const [view, setView] = useState<'slides' | 'anim'>('slides')
  const [flyerZoom, setFlyerZoom] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)')
    const apply = () => setIsMobile(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  const previewW = isMobile ? 330 : 520

  // Diseño en edición (preview instantáneo, se persiste con Guardar)
  const [paletteId, setPaletteId] = useState<string | null>(null)
  const [custom, setCustom] = useState<PaletteTokens | null>(null)
  const [bgUrl, setBgUrl] = useState<string | null | undefined>(undefined)
  const [caption, setCaption] = useState('')
  const [dataEdit, setDataEdit] = useState<EventDataOverrides>({})
  const [showDatos, setShowDatos] = useState(false)
  const [dirty, setDirty] = useState(false)

  const [images, setImages] = useState<Array<{ id: string; url: string; tags: string[] }>>([])
  const [busy, setBusy] = useState<Busy>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [schedInput, setSchedInput] = useState('')
  const [showSched, setShowSched] = useState(false)

  const sel = pieces.find(p => p.id === selId) ?? null

  async function refresh(keepSel = true) {
    setLoading(true)
    const data = await getFlyerPieces()
    setPieces(data.pieces)
    setClosingVideoUrl(data.closingVideoUrl)
    if (!keepSel || !data.pieces.some(r => r.id === selId)) {
      // Deep-link desde Telegram: ?piece=<id> preselecciona la pieza
      const target = initialPieceId && data.pieces.some(r => r.id === initialPieceId)
        ? initialPieceId
        : data.pieces[0]?.id ?? null
      setSelId(target)
    }
    setLoading(false)
  }
  useEffect(() => { refresh(false); listLibraryImagesForPicker().then(setImages) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Al cambiar de pieza, cargar su diseño actual
  useEffect(() => {
    if (!sel) return
    setPaletteId(sel.paletteId)
    setCustom(null)
    setBgUrl(undefined)
    setCaption(sel.caption ?? '')
    setDataEdit({})
    setSlideIdx(0)
    setDirty(false)
    setMsg(null)
    setSchedInput(sel.scheduledAt ? utcISOToLocalInput(sel.scheduledAt) : '')
  }, [selId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Paleta efectiva para el preview en vivo
  const livePalette: PaletteTokens | null = useMemo(() => {
    if (custom) return custom
    if (paletteId) {
      const p = PALETTES.find(x => x.id === paletteId)
      if (p) return { background: p.background, primary: p.primary, accent: p.accent, text: p.text }
    }
    return null // usar la que trae el slide
  }, [custom, paletteId])

  // Datos actuales del flyer (para prefill del formulario)
  const baseData: EventFlyerData = useMemo(() => {
    const first = sel?.slides[0]
    return first?.kind === 'event' ? first.data : {}
  }, [sel])

  const liveSlides: DesignSlide[] = useMemo(() => {
    if (!sel) return []
    return sel.slides.map(s => {
      if (s.kind !== 'event') return s
      const data: EventFlyerData = { ...s.data, ...cleanOverrides(dataEdit) }
      if (bgUrl !== undefined && s.slide === 1) data.playerImageUrl = bgUrl ?? undefined
      else data.playerImageUrl = s.data.playerImageUrl
      return { ...s, data, palette: livePalette ?? s.palette }
    })
  }, [sel, livePalette, bgUrl, dataEdit])

  function cleanOverrides(o: EventDataOverrides): Partial<EventFlyerData> {
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(o)) {
      if (v !== undefined && v !== null) out[k] = v
    }
    return out as Partial<EventFlyerData>
  }

  function setField(key: keyof EventDataOverrides, value: string) {
    setDataEdit(prev => ({ ...prev, [key]: value }))
    setDirty(true)
  }

  async function guardar(): Promise<boolean> {
    if (!sel) return false
    setBusy('guardar')
    const res = await updateEventDesign(sel.id, {
      ...(custom ? { customPalette: custom } : { paletteId }),
      ...(bgUrl !== undefined ? { playerImageUrl: bgUrl } : {}),
      ...(Object.keys(dataEdit).length ? { dataOverrides: dataEdit } : {}),
      caption,
    })
    setBusy(null)
    if (res.error) { setMsg({ ok: false, text: res.error }); return false }
    setDirty(false)
    setMsg({ ok: true, text: 'Diseño guardado' })
    refresh()
    return true
  }

  async function publicar() {
    if (!sel) return
    if (dirty && !(await guardar())) return
    if (!confirm(`¿Publicar "${sel.title}" en Instagram ahora?`)) return
    setBusy('publicar')
    const res = await publishCarouselNow(sel.id)
    setBusy(null)
    if ('error' in res && res.error) setMsg({ ok: false, text: res.error })
    else {
      setMsg({ ok: true, text: '🚀 Publicándose en segundo plano — podés cerrar esta página. Te llega la confirmación por Telegram (~2-4 min).' })
      refresh()
    }
  }

  async function programar() {
    if (!sel || !schedInput) return
    if (dirty && !(await guardar())) return
    setBusy('programar')
    const res = await fetch('/api/carousel/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ carouselId: sel.id, scheduledAt: argInputToDate(schedInput).toISOString(), darkMode: true }),
    }).then(r => r.json()) as { success?: boolean; error?: string }
    setBusy(null)
    if (res.error) setMsg({ ok: false, text: res.error })
    else { setMsg({ ok: true, text: '📅 Programado — el sistema lo publica solo' }); setShowSched(false); refresh() }
  }

  async function aAprobacion() {
    if (!sel) return
    if (dirty && !(await guardar())) return
    setBusy('aprobar')
    const res = await setCarouselStatus(sel.id, 'review')
    setBusy(null)
    if (res.error) setMsg({ ok: false, text: res.error })
    else { setMsg({ ok: true, text: '💬 Enviado a tu Telegram para aprobar' }); refresh() }
  }

  const total = liveSlides.length

  return (
    <div style={{ minHeight: '100vh', background: T.navyDeep, color: T.cream, fontFamily: FD, display: 'flex', flexDirection: isMobile ? 'column' : 'row' }}>

      {/* ── Columna 1: lista de flyers ─────────────────────────────── */}
      <aside style={isMobile
        ? { width: '100%', borderBottom: `1px solid ${LINE}`, padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 250, overflowY: 'auto' }
        : { width: 270, minWidth: 270, borderRight: `1px solid ${LINE}`, padding: '24px 14px', display: 'flex', flexDirection: 'column', gap: 8, height: '100vh', overflowY: 'auto', position: 'sticky', top: 0 }}>
        <div style={{ padding: '0 8px 10px' }}>
          <div style={{ fontFamily: FM, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: T.mint, fontWeight: 700, marginBottom: 4 }}>Flyers</div>
          <div style={{ fontFamily: FD, fontWeight: 900, fontSize: 21, letterSpacing: '-0.03em' }}>Editor de flyers</div>
          <div style={{ fontFamily: FM, fontSize: 9.5, color: INK_SOFT, marginTop: 6, lineHeight: 1.6 }}>
            Mandá la foto de un flyer a <b style={{ color: T.mint }}>@flyersys_bot</b> y aparece acá.
          </div>
        </div>
        {loading ? (
          <div style={{ fontFamily: FM, fontSize: 11, color: INK_SOFT, padding: 12 }}>Cargando...</div>
        ) : pieces.length === 0 ? (
          <div style={{ fontFamily: FM, fontSize: 11, color: INK_SOFT, padding: 12, lineHeight: 1.7 }}>
            Todavía no hay flyers.<br/>Mandale uno al bot de Telegram para arrancar.
          </div>
        ) : pieces.map(p => {
          const ui = dbToUI(p.status)
          const meta = STATUS_META[ui]
          const active = p.id === selId
          const first = p.slides[0]
          return (
            <button key={p.id} onClick={() => setSelId(p.id)} style={{
              all: 'unset', cursor: 'pointer', display: 'flex', gap: 10, padding: 10, borderRadius: 12,
              background: active ? `${T.mint}12` : 'transparent',
              border: `1.5px solid ${active ? `${T.mint}55` : 'transparent'}`,
            }}>
              <div style={{ borderRadius: 7, overflow: 'hidden', flexShrink: 0, border: `1px solid ${LINE}` }}>
                {first ? <ScaledSlide slide={first} dark index={0} total={p.slides.length} width={54}/> : <div style={{ width: 54, height: 67, background: T.navySoft }}/>}
              </div>
              <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5, justifyContent: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{p.title}</div>
                <span style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: FM, fontSize: 8.5, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, color: meta.color, padding: '2px 7px', borderRadius: 5, background: `${meta.color}1c` }}>
                  <span style={{ width: 5, height: 5, borderRadius: 3, background: meta.color }}/>{meta.label}
                </span>
              </div>
            </button>
          )
        })}
      </aside>

      {!sel ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 46 }}>🎾</div>
          <div style={{ fontFamily: FD, fontWeight: 800, fontSize: 20 }}>Elegí un flyer de la lista</div>
          <div style={{ fontFamily: FM, fontSize: 11, color: INK_SOFT }}>o mandá una foto nueva a @flyersys_bot</div>
        </div>
      ) : (
        <>
          {/* ── Columna 2: preview grande en vivo ─────────────────────── */}
          <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: isMobile ? '18px 10px 24px' : '26px 28px 40px' }}>
            <div style={{ width: '100%', maxWidth: previewW + 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontFamily: FD, fontWeight: 800, fontSize: 19, letterSpacing: '-0.02em' }}>{sel.title}</div>
                <div style={{ fontFamily: FM, fontSize: 9.5, color: INK_SOFT, marginTop: 3 }}>
                  {sel.scheduledAt
                    ? `📅 ${new Date(sel.scheduledAt).toLocaleString('es-AR', { dateStyle: 'long', timeStyle: 'short', timeZone: ARG_TZ })}`
                    : 'Sin fecha programada'}
                  {sel.permalink && <> · <a href={sel.permalink} target="_blank" rel="noopener noreferrer" style={{ color: T.mint }}>Ver en Instagram ↗</a></>}
                </div>
              </div>
              {/* Tabs Láminas / Animación */}
              <div style={{ display: 'flex', gap: 2, padding: 3, background: 'rgba(245,242,235,0.06)', borderRadius: 9 }}>
                {([['slides', 'Láminas'], ['anim', '▶ Animación']] as const).map(([v, label]) => (
                  <button key={v} onClick={() => setView(v)} style={{ all: 'unset', cursor: 'pointer', padding: '6px 14px', borderRadius: 7, fontFamily: FD, fontSize: 12, fontWeight: 600, background: view === v ? T.navySoft : 'transparent', color: view === v ? T.mint : INK_SOFT, transition: 'all 160ms' }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {view === 'slides' ? (
              <>
                <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', boxShadow: '0 24px 70px rgba(0,0,0,0.5)', border: `1px solid ${LINE}` }}>
                  {liveSlides[slideIdx] && (
                    <ScaledSlide slide={liveSlides[slideIdx]!} dark index={slideIdx} total={total} width={previewW}/>
                  )}
                  {total > 1 && (
                    <>
                      <button onClick={() => setSlideIdx(i => Math.max(0, i - 1))} disabled={slideIdx === 0} style={{ all: 'unset', cursor: slideIdx === 0 ? 'default' : 'pointer', position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 40, height: 40, borderRadius: 20, background: 'rgba(0,0,0,0.55)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, opacity: slideIdx === 0 ? 0.3 : 1 }}>‹</button>
                      <button onClick={() => setSlideIdx(i => Math.min(total - 1, i + 1))} disabled={slideIdx === total - 1} style={{ all: 'unset', cursor: slideIdx === total - 1 ? 'default' : 'pointer', position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', width: 40, height: 40, borderRadius: 20, background: 'rgba(0,0,0,0.55)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, opacity: slideIdx === total - 1 ? 0.3 : 1 }}>›</button>
                    </>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  {liveSlides.map((s, i) => (
                    <button key={i} onClick={() => setSlideIdx(i)} style={{ all: 'unset', cursor: 'pointer', borderRadius: 6, overflow: 'hidden', outline: i === slideIdx ? `2.5px solid ${T.mint}` : `1px solid ${LINE}`, outlineOffset: 2 }}>
                      <ScaledSlide slide={s} dark index={i} total={total} width={56}/>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                {/* Animación de portada en vivo (con las ediciones actuales) */}
                <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 24px 70px rgba(0,0,0,0.5)', border: `1px solid ${LINE}`, width: previewW, height: previewW * 1.25 }}>
                  {liveSlides.length >= 2 ? (
                    <RemotionPlayer
                      component={EventIntroScene as React.ComponentType<Record<string, unknown>>}
                      inputProps={{ slide1: liveSlides[0]!, slide2: liveSlides[1]! }}
                      durationInFrames={300}
                      fps={30}
                      compositionWidth={1080}
                      compositionHeight={1350}
                      controls
                      loop
                      autoPlay
                      style={{ width: previewW, height: previewW * 1.25 }}
                    />
                  ) : (
                    <div style={{ width: previewW, height: previewW * 1.25, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FM, fontSize: 11, color: INK_SOFT }}>
                      Esta pieza no tiene los 2 slides de la animación
                    </div>
                  )}
                </div>
                <div style={{ fontFamily: FM, fontSize: 9.5, color: INK_SOFT, marginTop: 10 }}>
                  Así sale la portada animada (10s) como primer elemento del carrusel — refleja tus ediciones al instante
                </div>

                {closingVideoUrl && (
                  <div style={{ marginTop: 18, width: previewW }}>
                    <div style={{ fontFamily: FM, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: INK_SOFT, fontWeight: 700, marginBottom: 8 }}>Video de cierre (último elemento)</div>
                    <video src={closingVideoUrl} controls preload="metadata" style={{ width: 240, borderRadius: 12, border: `1px solid ${LINE}`, display: 'block' }}/>
                  </div>
                )}
              </>
            )}

            {/* Flyer original de referencia — esquina */}
            {sel.sourceFlyerUrl && (
              <button
                onClick={() => setFlyerZoom(true)}
                title="Flyer original (referencia)"
                style={{ all: 'unset', cursor: 'zoom-in', position: 'fixed', right: isMobile ? 12 : 350, bottom: isMobile ? 12 : 20, zIndex: 40, borderRadius: 10, overflow: 'hidden', border: `2px solid ${T.amber}88`, boxShadow: '0 10px 30px rgba(0,0,0,0.55)', background: T.navySoft }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sel.sourceFlyerUrl} alt="Flyer original" style={{ width: isMobile ? 76 : 110, display: 'block' }}/>
                <div style={{ fontFamily: FM, fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.amber, textAlign: 'center', padding: '4px 0' }}>Original ⤢</div>
              </button>
            )}
            {flyerZoom && sel.sourceFlyerUrl && (
              <div onClick={() => setFlyerZoom(false)} style={{ position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(10,21,41,0.93)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sel.sourceFlyerUrl} alt="Flyer original" style={{ maxHeight: '92vh', maxWidth: '92vw', borderRadius: 12 }}/>
                <div style={{ position: 'fixed', top: 18, left: '50%', transform: 'translateX(-50%)', fontFamily: FM, fontSize: 11, color: T.amber, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Flyer original — click para cerrar</div>
              </div>
            )}

            {dirty && (
              <div style={{ marginTop: 14, fontFamily: FM, fontSize: 10, color: T.amber }}>
                ● Cambios sin guardar — se guardan solos al publicar/programar
              </div>
            )}
          </main>

          {/* ── Columna 3: diseño y acciones ──────────────────────────── */}
          <aside style={isMobile
            ? { width: '100%', borderTop: `1px solid ${LINE}`, background: T.navySoft, padding: '20px 14px 90px' }
            : { width: 330, minWidth: 330, borderLeft: `1px solid ${LINE}`, background: T.navySoft, padding: '24px 22px 40px', height: '100vh', overflowY: 'auto', position: 'sticky', top: 0 }}>

            <div style={SECTION}>Combinación de colores</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 8 }}>
              {PALETTES.map(p => {
                const active = !custom && paletteId === p.id
                return (
                  <button key={p.id} title={p.name} onClick={() => { setPaletteId(p.id); setCustom(null); setDirty(true) }} style={{
                    all: 'unset', cursor: 'pointer', width: 46, height: 32, borderRadius: 8, overflow: 'hidden', display: 'flex',
                    outline: active ? `2.5px solid ${T.mint}` : `1px solid ${LINE}`, outlineOffset: 1,
                  }}>
                    <span style={{ flex: 2, background: p.background }}/>
                    <span style={{ flex: 1, background: p.primary }}/>
                    <span style={{ flex: 1, background: p.accent }}/>
                  </button>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 7, marginBottom: 16 }}>
              <button onClick={() => { setPaletteId(null); setCustom(null); setDirty(true) }} style={{ all: 'unset', cursor: 'pointer', padding: '6px 12px', borderRadius: 8, fontFamily: FM, fontSize: 9.5, border: `1px solid ${!custom && !paletteId ? T.mint : LINE}`, color: !custom && !paletteId ? T.mint : INK_SOFT }}>AUTOMÁTICA</button>
              <button onClick={() => { setCustom(c => c ?? (livePalette ?? { background: '#0f1923', primary: '#39ff14', accent: '#00c8ff', text: '#ffffff' })); setDirty(true) }} style={{ all: 'unset', cursor: 'pointer', padding: '6px 12px', borderRadius: 8, fontFamily: FM, fontSize: 9.5, border: `1px solid ${custom ? T.mint : LINE}`, color: custom ? T.mint : INK_SOFT }}>MIS COLORES</button>
            </div>
            {custom && (
              <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                {([['background', 'Fondo'], ['primary', 'Principal'], ['accent', 'Acento'], ['text', 'Texto']] as const).map(([key, label]) => (
                  <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4, fontFamily: FM, fontSize: 8.5, color: INK_SOFT, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {label}
                    <input type="color" value={custom[key]} onChange={e => { setCustom(c => ({ ...(c!), [key]: e.target.value })); setDirty(true) }} style={{ width: 56, height: 32, border: `1px solid ${LINE}`, borderRadius: 7, background: 'transparent', cursor: 'pointer', padding: 1 }}/>
                  </label>
                ))}
              </div>
            )}

            <div style={SECTION}>Imagen de fondo</div>
            <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 6, marginBottom: 6 }}>
              <button onClick={() => { setBgUrl(null); setDirty(true) }} title="Sin fondo" style={{ all: 'unset', cursor: 'pointer', width: 56, height: 70, borderRadius: 7, flexShrink: 0, border: `1.5px ${(bgUrl === null) ? `solid ${T.mint}` : `dashed ${LINE}`}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FM, fontSize: 8, color: INK_SOFT, textAlign: 'center' }}>sin<br/>fondo</button>
              {images.map(img => {
                const effective = bgUrl === undefined ? sel.bgUrl : bgUrl
                const active = effective === img.url
                return (
                  <button key={img.id} onClick={() => { setBgUrl(img.url); setDirty(true) }} style={{ all: 'unset', cursor: 'pointer', flexShrink: 0, borderRadius: 7, overflow: 'hidden', outline: active ? `2.5px solid ${T.mint}` : `1px solid ${LINE}` }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt="" loading="lazy" style={{ width: 56, height: 70, objectFit: 'cover', display: 'block' }}/>
                  </button>
                )
              })}
            </div>
            <div style={{ fontFamily: FM, fontSize: 9, color: INK_SOFT, marginBottom: 16 }}>Subí más fotos en <b>Biblioteca</b> · el fondo va en el slide 1</div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ ...SECTION, marginBottom: 0 }}>Datos del torneo</div>
              <button onClick={() => setShowDatos(v => !v)} style={{ all: 'unset', cursor: 'pointer', fontFamily: FM, fontSize: 10, color: T.mint }}>
                {showDatos ? '▾ ocultar' : '▸ editar'}
              </button>
            </div>
            {showDatos && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {([
                  ['tournamentName', 'Torneo', baseData.tournamentName],
                  ['clubName', 'Club', baseData.clubName],
                  ['city', 'Ciudad', baseData.city],
                  ['startDate', 'Fecha inicio (YYYY-MM-DD)', baseData.startDate],
                  ['endDate', 'Fecha fin (YYYY-MM-DD)', baseData.endDate],
                  ['phone', 'Teléfono', baseData.phone],
                  ['categoriesSummary', 'Categorías (portada)', baseData.categoriesSummary],
                  ['categoriesMen', 'Categorías caballeros', baseData.categoriesMen],
                  ['categoriesWomen', 'Categorías damas', baseData.categoriesWomen],
                  ['price', 'Inscripción', baseData.price],
                  ['conditions', 'Condición premios', baseData.conditions],
                ] as Array<[keyof EventDataOverrides, string, string | undefined]>).map(([key, label, base]) => (
                  <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ fontFamily: FM, fontSize: 8.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: INK_SOFT }}>{label}</span>
                    <input
                      value={dataEdit[key] ?? base ?? ''}
                      onChange={e => setField(key, e.target.value)}
                      style={{ padding: '8px 11px', borderRadius: 8, border: `1px solid ${LINE}`, background: T.navyDeep, color: T.cream, fontFamily: FD, fontSize: 12.5, outline: 'none' }}
                    />
                  </label>
                ))}
                {([
                  ['prizesMen', 'Premios caballeros (uno por línea)', baseData.prizesMen],
                  ['prizesWomen', 'Premios damas (uno por línea)', baseData.prizesWomen],
                ] as Array<[keyof EventDataOverrides, string, string | undefined]>).map(([key, label, base]) => (
                  <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ fontFamily: FM, fontSize: 8.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: INK_SOFT }}>{label}</span>
                    <textarea
                      value={dataEdit[key] ?? base ?? ''}
                      onChange={e => setField(key, e.target.value)}
                      rows={3}
                      style={{ padding: '8px 11px', borderRadius: 8, border: `1px solid ${LINE}`, background: T.navyDeep, color: T.cream, fontFamily: FD, fontSize: 12.5, outline: 'none', resize: 'vertical' }}
                    />
                  </label>
                ))}
              </div>
            )}

            <div style={SECTION}>Caption de Instagram</div>
            <textarea value={caption} onChange={e => { setCaption(e.target.value); setDirty(true) }} rows={6} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, border: `1px solid ${LINE}`, background: T.navyDeep, color: T.cream, fontFamily: FD, fontSize: 12.5, lineHeight: 1.5, outline: 'none', resize: 'vertical', marginBottom: 16 }}/>

            {msg && (
              <div style={{ marginBottom: 12, padding: '9px 12px', borderRadius: 9, fontFamily: FM, fontSize: 11, background: msg.ok ? `${T.mint}16` : '#ff444420', color: msg.ok ? T.mint : '#ff7777', border: `1px solid ${msg.ok ? `${T.mint}40` : '#ff444440'}` }}>{msg.text}</div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              <button disabled={!!busy || !dirty} onClick={guardar} style={{ all: 'unset', cursor: dirty ? 'pointer' : 'default', padding: '12px 0', borderRadius: 10, background: dirty ? T.mint : 'rgba(245,242,235,0.08)', color: dirty ? T.navy : INK_SOFT, fontFamily: FD, fontWeight: 700, fontSize: 14, textAlign: 'center', opacity: busy === 'guardar' ? 0.6 : 1 }}>
                {busy === 'guardar' ? 'Guardando...' : dirty ? '💾 Guardar diseño' : 'Diseño guardado ✓'}
              </button>

              {sel.status === 'publishing' && (
                <div style={{ padding: '12px 14px', borderRadius: 10, background: '#9B6BFF18', color: '#B99CFF', fontFamily: FD, fontWeight: 600, fontSize: 13, textAlign: 'center', border: '1px solid #9B6BFF40' }}>
                  🚀 Publicándose... te aviso por Telegram (podés cerrar la página)
                </div>
              )}
              {sel.status !== 'published' && sel.status !== 'publishing' && (
                <>
                  <button disabled={!!busy} onClick={publicar} style={{ all: 'unset', cursor: 'pointer', padding: '12px 0', borderRadius: 10, background: 'rgba(245,242,235,0.07)', border: `1.5px solid ${T.mint}66`, color: T.mint, fontFamily: FD, fontWeight: 700, fontSize: 14, textAlign: 'center', opacity: busy === 'publicar' ? 0.6 : 1 }}>
                    {busy === 'publicar' ? 'Publicando...' : '⚡ Publicar ahora en Instagram'}
                  </button>

                  {!showSched ? (
                    <button disabled={!!busy} onClick={() => setShowSched(true)} style={{ all: 'unset', cursor: 'pointer', padding: '12px 0', borderRadius: 10, background: 'rgba(245,242,235,0.07)', border: `1px solid ${LINE}`, color: T.cream, fontFamily: FD, fontWeight: 600, fontSize: 13.5, textAlign: 'center' }}>
                      📅 Programar fecha y hora
                    </button>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                      <input type="datetime-local" value={schedInput} onChange={e => setSchedInput(e.target.value)} style={{ padding: '10px 12px', borderRadius: 9, border: `1px solid ${LINE}`, background: T.navyDeep, color: T.cream, fontFamily: FM, fontSize: 12, outline: 'none' }}/>
                      <div style={{ fontFamily: FM, fontSize: 9, color: T.mint }}>hora Argentina / Paraguay (UTC-3)</div>
                      <div style={{ display: 'flex', gap: 7 }}>
                        <button disabled={!!busy || !schedInput} onClick={programar} style={{ all: 'unset', flex: 1, cursor: 'pointer', padding: '10px 0', borderRadius: 9, background: T.mint, color: T.navy, fontFamily: FD, fontWeight: 700, fontSize: 13, textAlign: 'center', opacity: busy === 'programar' || !schedInput ? 0.6 : 1 }}>Confirmar</button>
                        <button onClick={() => setShowSched(false)} style={{ all: 'unset', cursor: 'pointer', padding: '10px 14px', borderRadius: 9, background: 'rgba(245,242,235,0.07)', color: INK_SOFT, fontFamily: FD, fontSize: 13 }}>Cancelar</button>
                      </div>
                    </div>
                  )}

                  <button disabled={!!busy} onClick={aAprobacion} style={{ all: 'unset', cursor: 'pointer', padding: '12px 0', borderRadius: 10, background: 'rgba(245,242,235,0.07)', border: `1px solid ${LINE}`, color: T.cream, fontFamily: FD, fontWeight: 600, fontSize: 13.5, textAlign: 'center', opacity: busy === 'aprobar' ? 0.6 : 1 }}>
                    {busy === 'aprobar' ? 'Enviando...' : '💬 Mandarme el link a Telegram'}
                  </button>
                </>
              )}
              {sel.status === 'published' && (
                <div style={{ padding: '12px 14px', borderRadius: 10, background: `${T.mint}14`, color: T.mint, fontFamily: FD, fontWeight: 600, fontSize: 13, textAlign: 'center', border: `1px solid ${T.mint}30` }}>
                  ✓ Publicado en Instagram
                </div>
              )}
            </div>
          </aside>
        </>
      )}
    </div>
  )
}
