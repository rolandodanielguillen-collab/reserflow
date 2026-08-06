'use client'

import { useState, useEffect } from 'react'
import { T, FD, FM, ARG_TZ, argInputToDate } from './studio-shared'
import { getStorySources, createStory, type StorySource } from '../services/create-story'

// Default: mañana a las 10:00 hora local (misma hora que las automáticas)
function tomorrowAt10(): string {
  const d = new Date(Date.now() + 86_400_000)
  const ymd = d.toLocaleString('sv-SE', { timeZone: ARG_TZ }).slice(0, 10)
  return `${ymd}T10:00`
}

export function NewStoryModal({ dark, onClose, onCreated }: {
  dark: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const [sources, setSources]   = useState<StorySource[]>([])
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState<StorySource | null>(null)
  const [title, setTitle]       = useState('')
  const [when, setWhen]         = useState(tomorrowAt10)
  const [withBadge, setWithBadge] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => {
    getStorySources().then(s => { setSources(s); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const th = dark
    ? { panel: T.navySoft, ink: T.cream, inkSoft: 'rgba(245,242,235,0.6)', line: 'rgba(245,242,235,0.1)', input: T.navyDeep }
    : { panel: '#fff', ink: T.navy, inkSoft: 'rgba(15,30,61,0.6)', line: 'rgba(15,30,61,0.12)', input: '#f4f2ec' }

  const flyers = sources.filter(s => s.kind === 'flyer')
  const assets = sources.filter(s => s.kind === 'asset')

  function pick(s: StorySource) {
    setSelected(s)
    setTitle(s.kind === 'flyer' ? `Historia · ${s.title}` : 'Historia')
    setWithBadge(s.kind === 'flyer')
  }

  async function handleCreate() {
    if (!selected) { setError('Elegí una imagen'); return }
    setSaving(true)
    setError(null)
    const res = await createStory({
      imageUrl: selected.imageUrl,
      scheduledAtIso: argInputToDate(when).toISOString(),
      title,
      parentCarouselId: selected.kind === 'flyer' ? selected.id : undefined,
      withBadge,
    })
    setSaving(false)
    if (res.error) { setError(res.error); return }
    onCreated()
  }

  const thumb = (s: StorySource) => (
    <button
      key={`${s.kind}-${s.id}`}
      onClick={() => pick(s)}
      title={s.title}
      style={{
        all: 'unset', cursor: 'pointer', borderRadius: 10, overflow: 'hidden', position: 'relative',
        border: selected?.id === s.id && selected.kind === s.kind ? `2px solid ${T.mint}` : `1px solid ${th.line}`,
        boxShadow: selected?.id === s.id && selected.kind === s.kind ? `0 0 0 3px ${T.mint}44` : 'none',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={s.imageUrl} alt={s.title} style={{ width: 96, height: 120, objectFit: 'cover', display: 'block' }}/>
    </button>
  )

  const sectionLabel = (text: string) => (
    <div style={{ fontFamily: FM, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: th.inkSoft, fontWeight: 700, margin: '14px 0 8px' }}>
      {text}
    </div>
  )

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: 'min(680px, 100%)', maxHeight: '86vh', overflowY: 'auto', background: th.panel, border: `1px solid ${th.line}`, borderRadius: 18, padding: 24, color: th.ink, fontFamily: FD }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
          <div style={{ fontWeight: 900, fontSize: 20, letterSpacing: '-0.03em' }}>+ Historia</div>
          <button onClick={onClose} style={{ all: 'unset', cursor: 'pointer', marginLeft: 'auto', fontSize: 18, color: th.inkSoft, padding: 6 }}>✕</button>
        </div>
        <div style={{ fontFamily: FM, fontSize: 10, color: th.inkSoft, letterSpacing: '0.06em', marginBottom: 10 }}>
          Elegí la imagen y cuándo sale. Se publica sola por el mismo motor que las automáticas.
        </div>

        {loading ? (
          <div style={{ padding: '30px 0', fontFamily: FM, fontSize: 11, color: th.inkSoft }}>Cargando imágenes...</div>
        ) : (
          <>
            {flyers.length > 0 && (
              <>
                {sectionLabel(`Flyers publicados · ${flyers.length}`)}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{flyers.map(thumb)}</div>
              </>
            )}
            {assets.length > 0 && (
              <>
                {sectionLabel(`Biblioteca · ${assets.length}`)}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{assets.map(thumb)}</div>
              </>
            )}
            {flyers.length === 0 && assets.length === 0 && (
              <div style={{ padding: '20px 0', fontFamily: FM, fontSize: 11, color: th.inkSoft }}>
                No hay imágenes disponibles: publicá un flyer o subí imágenes a la biblioteca.
              </div>
            )}
          </>
        )}

        <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
          <label style={{ flex: '1 1 240px', display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={{ fontFamily: FM, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: th.inkSoft, fontWeight: 700 }}>Título</span>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Historia"
              style={{ padding: '10px 12px', borderRadius: 10, border: `1px solid ${th.line}`, background: th.input, color: th.ink, fontFamily: FD, fontSize: 14, outline: 'none' }}
            />
          </label>
          <label style={{ flex: '0 1 220px', display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={{ fontFamily: FM, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: th.inkSoft, fontWeight: 700 }}>Fecha y hora</span>
            <input
              type="datetime-local"
              value={when}
              onChange={e => setWhen(e.target.value)}
              style={{ padding: '10px 12px', borderRadius: 10, border: `1px solid ${th.line}`, background: th.input, color: th.ink, fontFamily: FM, fontSize: 13, outline: 'none' }}
            />
          </label>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, cursor: 'pointer', width: 'fit-content' }}>
          <input
            type="checkbox"
            checked={withBadge}
            onChange={e => setWithBadge(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: T.mint, cursor: 'pointer' }}
          />
          <span style={{ fontFamily: FM, fontSize: 11, color: th.ink, letterSpacing: '0.04em' }}>
            Badge <b>INSCRIBITE EN LA APP</b> (formato historia 9:16 con banda)
          </span>
        </label>

        {error && (
          <div style={{ marginTop: 12, fontFamily: FM, fontSize: 11, color: '#E05252' }}>{error}</div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ all: 'unset', cursor: 'pointer', padding: '10px 18px', borderRadius: 10, color: th.inkSoft, fontFamily: FM, fontSize: 11, letterSpacing: '0.08em', border: `1px solid ${th.line}` }}>
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={saving || !selected}
            style={{ all: 'unset', cursor: saving || !selected ? 'default' : 'pointer', padding: '10px 22px', borderRadius: 10, background: T.mint, color: T.navy, fontFamily: FD, fontWeight: 700, fontSize: 14, opacity: saving || !selected ? 0.5 : 1 }}
          >
            {saving ? 'Programando...' : 'Programar historia'}
          </button>
        </div>
      </div>
    </div>
  )
}
