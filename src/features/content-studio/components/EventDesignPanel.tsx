'use client'

// Panel de diseño para flyers de evento — el equivalente al panel de padelpost:
// paletas predefinidas, paleta personalizada, fondo de la biblioteca y caption.

import { useEffect, useState } from 'react'
import { T, FD, FM } from './studio-shared'
import { PALETTES } from '@/features/design/palettes'
import { updateEventDesign, listLibraryImagesForPicker } from '../services/event-design'
import type { PaletteTokens } from '../types'

const LBL: React.CSSProperties = {
  fontFamily: FM, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase',
  opacity: 0.45, fontWeight: 700, marginBottom: 10,
}

export function EventDesignPanel({ carouselId, currentPaletteId, currentBgUrl, currentCaption, dark, ink, divLine, onApplied }: {
  carouselId: string
  currentPaletteId?: string | null
  currentBgUrl?: string
  currentCaption?: string | null
  dark: boolean
  ink: string
  divLine: string
  onApplied: () => void
}) {
  const [paletteId, setPaletteId] = useState<string | null>(currentPaletteId ?? null)
  const [useCustom, setUseCustom] = useState(false)
  const [custom, setCustom] = useState<PaletteTokens>({ background: '#0f1923', primary: '#39ff14', accent: '#00c8ff', text: '#ffffff' })
  const [bgUrl, setBgUrl] = useState<string | null | undefined>(undefined) // undefined = sin cambio
  const [caption, setCaption] = useState(currentCaption ?? '')
  const [images, setImages] = useState<Array<{ id: string; url: string; tags: string[] }>>([])
  const [showBgPicker, setShowBgPicker] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    if (showBgPicker && images.length === 0) {
      listLibraryImagesForPicker().then(setImages)
    }
  }, [showBgPicker, images.length])

  async function apply() {
    setBusy(true)
    setMsg(null)
    const res = await updateEventDesign(carouselId, {
      ...(useCustom ? { customPalette: custom } : { paletteId }),
      ...(bgUrl !== undefined ? { playerImageUrl: bgUrl } : {}),
      caption,
    })
    setBusy(false)
    if (res.error) { setMsg(`⚠ ${res.error}`); return }
    setMsg('✓ Diseño aplicado')
    onApplied()
    setTimeout(() => setMsg(null), 2500)
  }

  const effectiveBg = bgUrl === undefined ? currentBgUrl : (bgUrl ?? undefined)

  return (
    <div style={{ padding: '18px 26px', borderBottom: `1px solid ${divLine}` }}>
      <div style={{ ...LBL, color: ink }}>DISEÑO DEL FLYER</div>

      {/* Paletas predefinidas */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 10 }}>
        {PALETTES.map(p => {
          const active = !useCustom && paletteId === p.id
          return (
            <button
              key={p.id}
              title={p.name}
              onClick={() => { setPaletteId(p.id); setUseCustom(false) }}
              style={{
                all: 'unset', cursor: 'pointer', width: 44, height: 30, borderRadius: 7, overflow: 'hidden',
                display: 'flex', outline: active ? `2.5px solid ${T.mint}` : `1px solid ${divLine}`, outlineOffset: 1,
              }}
            >
              <span style={{ flex: 2, background: p.background }}/>
              <span style={{ flex: 1, background: p.primary }}/>
              <span style={{ flex: 1, background: p.accent }}/>
            </button>
          )
        })}
        <button
          onClick={() => { setPaletteId(null); setUseCustom(false) }}
          title="Automática (según el color del flyer original)"
          style={{ all: 'unset', cursor: 'pointer', padding: '5px 10px', borderRadius: 7, fontFamily: FM, fontSize: 9, border: `1px solid ${!useCustom && paletteId === null ? T.mint : divLine}`, color: !useCustom && paletteId === null ? T.mint : ink, opacity: 0.9 }}
        >AUTO</button>
        <button
          onClick={() => setUseCustom(v => !v)}
          style={{ all: 'unset', cursor: 'pointer', padding: '5px 10px', borderRadius: 7, fontFamily: FM, fontSize: 9, border: `1px solid ${useCustom ? T.mint : divLine}`, color: useCustom ? T.mint : ink, opacity: 0.9 }}
        >PERSONALIZADA</button>
      </div>

      {/* Paleta personalizada */}
      {useCustom && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          {([['background', 'Fondo'], ['primary', 'Principal'], ['accent', 'Acento'], ['text', 'Texto']] as const).map(([key, label]) => (
            <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: 3, fontFamily: FM, fontSize: 8.5, color: ink, opacity: 0.85, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {label}
              <input
                type="color"
                value={custom[key]}
                onChange={e => setCustom(c => ({ ...c, [key]: e.target.value }))}
                style={{ width: 52, height: 30, border: `1px solid ${divLine}`, borderRadius: 6, background: 'transparent', cursor: 'pointer', padding: 1 }}
              />
            </label>
          ))}
        </div>
      )}

      {/* Fondo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        {effectiveBg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={effectiveBg} alt="" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 7, border: `1px solid ${divLine}` }}/>
        ) : (
          <div style={{ width: 44, height: 44, borderRadius: 7, border: `1px dashed ${divLine}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FM, fontSize: 8, color: ink, opacity: 0.5 }}>sin<br/>fondo</div>
        )}
        <button onClick={() => setShowBgPicker(v => !v)} style={{ all: 'unset', cursor: 'pointer', fontFamily: FM, fontSize: 10, color: T.mint }}>
          {showBgPicker ? '▾ Elegir fondo' : '▸ Elegir fondo'}
        </button>
        {effectiveBg && (
          <button onClick={() => setBgUrl(null)} style={{ all: 'unset', cursor: 'pointer', fontFamily: FM, fontSize: 10, color: ink, opacity: 0.6 }}>
            ✕ quitar
          </button>
        )}
      </div>
      {showBgPicker && (
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 12, padding: '2px 0' }}>
          {images.length === 0 ? (
            <span style={{ fontFamily: FM, fontSize: 10, color: ink, opacity: 0.5 }}>Cargando biblioteca...</span>
          ) : images.map(img => (
            <button key={img.id} onClick={() => { setBgUrl(img.url); setShowBgPicker(false) }} style={{ all: 'unset', cursor: 'pointer', flexShrink: 0, borderRadius: 6, overflow: 'hidden', outline: effectiveBg === img.url ? `2px solid ${T.mint}` : 'none' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" style={{ width: 56, height: 70, objectFit: 'cover', display: 'block' }}/>
            </button>
          ))}
        </div>
      )}

      {/* Caption */}
      <textarea
        value={caption}
        onChange={e => setCaption(e.target.value)}
        placeholder="Caption de Instagram"
        rows={4}
        style={{ width: '100%', boxSizing: 'border-box', padding: '9px 11px', borderRadius: 8, border: `1px solid ${divLine}`, background: dark ? T.navyDeep : '#fff', color: ink, fontFamily: FD, fontSize: 12, outline: 'none', resize: 'vertical', marginBottom: 10 }}
      />

      {msg && <div style={{ fontFamily: FM, fontSize: 10, color: msg.startsWith('✓') ? T.mint : '#ff6666', marginBottom: 8 }}>{msg}</div>}

      <button
        disabled={busy}
        onClick={apply}
        style={{ all: 'unset', cursor: busy ? 'wait' : 'pointer', width: '100%', boxSizing: 'border-box', padding: '11px 0', borderRadius: 9, background: T.mint, color: T.navy, fontFamily: FD, fontWeight: 700, fontSize: 13, textAlign: 'center', opacity: busy ? 0.6 : 1 }}
      >
        {busy ? 'Aplicando...' : '✨ Aplicar diseño'}
      </button>
    </div>
  )
}
