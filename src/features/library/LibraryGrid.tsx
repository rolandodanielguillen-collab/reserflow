'use client'

import { useEffect, useRef, useState } from 'react'
import { T, FD, FM } from '@/features/content-studio/components/studio-shared'
import { listAssets, deleteAsset, updateAssetTags, createPostFromAssets, aiCaptionFromText, type AssetRow } from './asset-actions'

const INK_SOFT = 'rgba(245,242,235,0.55)'
const LINE = 'rgba(245,242,235,0.09)'

export function LibraryGrid() {
  const [assets, setAssets] = useState<AssetRow[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [tagFilter, setTagFilter] = useState('all')
  const [selected, setSelected] = useState<string[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState('')
  const [caption, setCaption] = useState('')
  const [creating, setCreating] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function refresh() {
    setLoading(true)
    setAssets(await listAssets())
    setLoading(false)
  }
  useEffect(() => { refresh() }, [])

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return
    setUploading(true)
    setMsg(`Subiendo ${files.length} imagen(es)...`)
    const fd = new FormData()
    Array.from(files).forEach(f => fd.append('files', f))
    try {
      const res = await fetch('/api/library/upload', { method: 'POST', body: fd })
      const json = await res.json() as { results?: Array<{ filename: string; error?: string }>; error?: string }
      const errors = (json.results ?? []).filter(r => r.error)
      setMsg(errors.length ? `⚠ ${errors.map(e => `${e.filename}: ${e.error}`).join(' · ')}` : `✓ ${files.length} subida(s). Etiquetando con IA...`)
      await refresh()
      // Las etiquetas IA llegan async: refrescar de nuevo en unos segundos
      setTimeout(() => { refresh(); setMsg(null) }, 8000)
    } catch {
      setMsg('Error subiendo imágenes')
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  function toggleSelect(id: string) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function handleCreate() {
    setCreating(true)
    const res = await createPostFromAssets(selected, title, caption)
    setCreating(false)
    if (res.error) { setMsg(`⚠ ${res.error}`); return }
    setShowCreate(false)
    setSelected([])
    setTitle('')
    setCaption('')
    setMsg('✓ Publicación creada. Está en el Studio como borrador: abrila para publicar o programar.')
  }

  const allTags = Array.from(new Set(assets.flatMap(a => a.tags))).sort()
  const filtered = tagFilter === 'all' ? assets : assets.filter(a => a.tags.includes(tagFilter))

  return (
    <div style={{ minHeight: '100vh', background: T.navyDeep, color: T.cream, fontFamily: FD, padding: '28px 36px 120px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: FM, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: T.mint, fontWeight: 700, marginBottom: 4 }}>Biblioteca</div>
          <h1 style={{ fontFamily: FD, fontWeight: 900, fontSize: 26, letterSpacing: '-0.03em', margin: 0 }}>Imágenes y diseños</h1>
        </div>
        <div style={{ flex: 1 }}/>
        <select value={tagFilter} onChange={e => setTagFilter(e.target.value)} style={{ padding: '8px 12px', background: T.navySoft, color: T.cream, border: `1px solid ${LINE}`, borderRadius: 9, fontFamily: FD, fontSize: 12, cursor: 'pointer', outline: 'none' }}>
          <option value="all">Todas las etiquetas</option>
          {allTags.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          style={{ all: 'unset', cursor: 'pointer', padding: '10px 18px', borderRadius: 10, background: T.mint, color: T.navy, fontFamily: FD, fontWeight: 700, fontSize: 13, opacity: uploading ? 0.6 : 1 }}
        >
          {uploading ? 'Subiendo...' : '⬆ Subir imágenes'}
        </button>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={e => handleUpload(e.target.files)}/>
      </div>

      {msg && (
        <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: `${T.mint}14`, border: `1px solid ${T.mint}33`, fontFamily: FM, fontSize: 11, color: T.mint }}>
          {msg}
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div style={{ fontFamily: FM, fontSize: 12, color: INK_SOFT, padding: '40px 0', textAlign: 'center' }}>Cargando biblioteca...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '70px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 42 }}>🖼</div>
          <div style={{ fontFamily: FD, fontWeight: 700, fontSize: 18 }}>Tu biblioteca está vacía</div>
          <div style={{ fontFamily: FM, fontSize: 11, color: INK_SOFT, maxWidth: 420, lineHeight: 1.7 }}>
            Subí fotos de jugadores, canchas y fondos para los flyers automáticos, o tus diseños ya listos para publicarlos directo.
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
          {filtered.map(a => {
            const isSel = selected.includes(a.id)
            return (
              <div key={a.id} style={{ background: T.navySoft, border: `1.5px solid ${isSel ? T.mint : LINE}`, borderRadius: 14, overflow: 'hidden', position: 'relative' }}>
                <button onClick={() => toggleSelect(a.id)} style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.url} alt={a.filename} loading="lazy" style={{ width: '100%', height: 170, objectFit: 'cover', display: 'block', opacity: isSel ? 0.75 : 1 }}/>
                </button>
                {isSel && (
                  <div style={{ position: 'absolute', top: 8, left: 8, width: 26, height: 26, borderRadius: 13, background: T.mint, color: T.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13 }}>
                    {selected.indexOf(a.id) + 1}
                  </div>
                )}
                <div style={{ position: 'absolute', top: 8, right: 8, fontFamily: FM, fontSize: 9, padding: '2px 7px', borderRadius: 5, background: 'rgba(0,0,0,0.55)', color: a.useCount > 0 ? T.amber : T.mint }}>
                  {a.useCount > 0 ? `usada ${a.useCount}×` : 'sin usar'}
                </div>
                <div style={{ padding: '9px 11px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontFamily: FM, fontSize: 10, color: T.cream, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.filename}</div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', minHeight: 16 }}>
                    {a.tags.map(t => (
                      <span key={t} style={{ fontFamily: FM, fontSize: 8.5, padding: '1px 6px', borderRadius: 4, background: `${T.mint}18`, color: T.mint, border: `1px solid ${T.mint}30` }}>{t}</span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontFamily: FM, fontSize: 9, color: INK_SOFT }}>{a.width && a.height ? `${a.width}×${a.height}` : ''}</span>
                    <div style={{ flex: 1 }}/>
                    <button
                      onClick={async () => {
                        const nuevo = prompt('Etiquetas separadas por coma:', a.tags.join(', '))
                        if (nuevo === null) return
                        await updateAssetTags(a.id, nuevo.split(',').map(s => s.trim()).filter(Boolean))
                        refresh()
                      }}
                      style={{ all: 'unset', cursor: 'pointer', fontFamily: FM, fontSize: 9, color: INK_SOFT }}
                    >✏ tags</button>
                    <button
                      onClick={async () => {
                        if (!confirm(`¿Borrar ${a.filename}?`)) return
                        await deleteAsset(a.id)
                        setSelected(prev => prev.filter(x => x !== a.id))
                        refresh()
                      }}
                      style={{ all: 'unset', cursor: 'pointer', fontFamily: FM, fontSize: 9, color: '#E05252' }}
                    >🗑</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Barra de selección */}
      {selected.length > 0 && !showCreate && (
        <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: T.navySoft, border: `1px solid ${T.mint}44`, borderRadius: 14, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 12px 40px rgba(0,0,0,0.5)', zIndex: 50 }}>
          <span style={{ fontFamily: FM, fontSize: 11, color: T.cream }}>{selected.length} seleccionada(s) — el orden es el del carrusel</span>
          <button onClick={() => setShowCreate(true)} style={{ all: 'unset', cursor: 'pointer', padding: '9px 16px', borderRadius: 9, background: T.mint, color: T.navy, fontFamily: FD, fontWeight: 700, fontSize: 13 }}>
            → Crear publicación
          </button>
          <button onClick={() => setSelected([])} style={{ all: 'unset', cursor: 'pointer', fontFamily: FM, fontSize: 11, color: INK_SOFT }}>Cancelar</button>
        </div>
      )}

      {/* Modal crear publicación */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(10,21,41,0.9)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowCreate(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 520, background: T.navySoft, borderRadius: 18, padding: 26, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontFamily: FD, fontWeight: 800, fontSize: 19 }}>Nueva publicación desde tus diseños</div>
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
              {selected.map(id => {
                const a = assets.find(x => x.id === id)
                // eslint-disable-next-line @next/next/no-img-element
                return a ? <img key={id} src={a.url} alt="" style={{ width: 64, height: 80, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}/> : null
              })}
            </div>
            <input
              value={title} onChange={e => setTitle(e.target.value)} placeholder="Título interno (ej: Promo agosto)"
              style={{ padding: '11px 13px', borderRadius: 9, border: `1px solid ${LINE}`, background: T.navyDeep, color: T.cream, fontFamily: FD, fontSize: 13, outline: 'none' }}
            />
            <textarea
              value={caption} onChange={e => setCaption(e.target.value)} placeholder="Caption de Instagram (o generalo con IA)" rows={5}
              style={{ padding: '11px 13px', borderRadius: 9, border: `1px solid ${LINE}`, background: T.navyDeep, color: T.cream, fontFamily: FD, fontSize: 13, outline: 'none', resize: 'vertical' }}
            />
            <button
              disabled={aiBusy || !title.trim()}
              onClick={async () => {
                setAiBusy(true)
                const res = await aiCaptionFromText(title)
                if (res.caption) setCaption(res.caption)
                setAiBusy(false)
              }}
              style={{ all: 'unset', cursor: 'pointer', fontFamily: FM, fontSize: 11, color: T.mint, opacity: aiBusy || !title.trim() ? 0.5 : 1 }}
            >
              {aiBusy ? '✨ Generando caption...' : '✨ Generar caption con IA (usa el título como tema)'}
            </button>
            <div style={{ display: 'flex', gap: 10 }}>
              <button disabled={creating || !title.trim()} onClick={handleCreate} style={{ all: 'unset', flex: 1, cursor: 'pointer', padding: '12px 0', borderRadius: 10, background: T.mint, color: T.navy, fontFamily: FD, fontWeight: 700, fontSize: 14, textAlign: 'center', opacity: creating || !title.trim() ? 0.6 : 1 }}>
                {creating ? 'Creando...' : 'Crear como borrador'}
              </button>
              <button onClick={() => setShowCreate(false)} style={{ all: 'unset', cursor: 'pointer', padding: '12px 16px', borderRadius: 10, background: 'rgba(245,242,235,0.07)', color: INK_SOFT, fontFamily: FD, fontSize: 13 }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
