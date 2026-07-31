'use client'

import { useEffect, useState } from 'react'
import { T, FD, FM, ARG_TZ } from '@/features/content-studio/components/studio-shared'
import {
  listCampaigns, createCampaign, deleteCampaign, duplicateCampaign,
  getCampaignPieces, listUnassignedPieces, assignPiecesToCampaign, removePieceFromCampaign,
  type CampaignRow, type CampaignPiece,
} from './campaign-actions'
import { createAdIntent } from '@/features/ads/ad-actions'

const INK_SOFT = 'rgba(245,242,235,0.55)'
const LINE = 'rgba(245,242,235,0.09)'
const CARD: React.CSSProperties = { background: T.navySoft, border: `1px solid ${LINE}`, borderRadius: 16, padding: '18px 20px' }

function fmt(n: number | null): string {
  if (n === null) return '—'
  return n.toLocaleString('es-AR')
}

export function CampaignsView() {
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [objective, setObjective] = useState('')
  const [budget, setBudget] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [pieces, setPieces] = useState<CampaignPiece[]>([])
  const [showAssign, setShowAssign] = useState(false)
  const [unassigned, setUnassigned] = useState<Array<{ id: string; title: string; status: string }>>([])
  const [pickIds, setPickIds] = useState<string[]>([])
  const [msg, setMsg] = useState<string | null>(null)

  async function refresh() {
    setLoading(true)
    setCampaigns(await listCampaigns())
    setLoading(false)
  }
  useEffect(() => { refresh() }, [])

  async function openCampaign(id: string) {
    setOpenId(id)
    setPieces(await getCampaignPieces(id))
  }

  return (
    <div style={{ minHeight: '100vh', background: T.navyDeep, color: T.cream, fontFamily: FD, padding: '28px 36px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
        <div>
          <div style={{ fontFamily: FM, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: T.mint, fontWeight: 700, marginBottom: 4 }}>Campañas</div>
          <h1 style={{ fontFamily: FD, fontWeight: 900, fontSize: 26, letterSpacing: '-0.03em', margin: 0 }}>Campañas de marketing</h1>
        </div>
        <div style={{ flex: 1 }}/>
        <button onClick={() => setShowCreate(true)} style={{ all: 'unset', cursor: 'pointer', padding: '10px 18px', borderRadius: 10, background: T.mint, color: T.navy, fontFamily: FD, fontWeight: 700, fontSize: 13 }}>
          + Nueva campaña
        </button>
      </div>

      {msg && <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 10, background: `${T.mint}14`, border: `1px solid ${T.mint}33`, fontFamily: FM, fontSize: 11, color: T.mint }}>{msg}</div>}

      {loading ? (
        <div style={{ fontFamily: FM, fontSize: 12, color: INK_SOFT, padding: '40px 0', textAlign: 'center' }}>Cargando...</div>
      ) : campaigns.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '70px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 42 }}>📣</div>
          <div style={{ fontFamily: FD, fontWeight: 700, fontSize: 18 }}>Sin campañas todavía</div>
          <div style={{ fontFamily: FM, fontSize: 11, color: INK_SOFT, maxWidth: 420, lineHeight: 1.7 }}>
            Una campaña agrupa piezas del Studio con un objetivo y fechas, y suma sus métricas de Instagram.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {campaigns.map(c => (
            <div key={c.id} style={CARD}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <button onClick={() => openId === c.id ? setOpenId(null) : openCampaign(c.id)} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 13, color: T.mint }}>{openId === c.id ? '▾' : '▸'}</span>
                  <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 17 }}>{c.name}</span>
                </button>
                {c.objective && <span style={{ fontFamily: FM, fontSize: 10, color: INK_SOFT }}>{c.objective}</span>}
                <div style={{ flex: 1 }}/>
                <span style={{ fontFamily: FM, fontSize: 10, color: INK_SOFT }}>{c.pieces} piezas · {c.published} publicadas</span>
                <span style={{ fontFamily: FM, fontSize: 10, color: T.mint }}>👁 {fmt(c.reach)} · ❤ {fmt(c.likes)}</span>
                <button onClick={async () => { await duplicateCampaign(c.id); refresh(); setMsg('✓ Campaña duplicada (piezas en borrador)') }} style={{ all: 'unset', cursor: 'pointer', fontFamily: FM, fontSize: 10, color: INK_SOFT }}>⧉ duplicar</button>
                <button onClick={async () => { if (confirm(`¿Borrar campaña "${c.name}"? Las piezas no se borran.`)) { await deleteCampaign(c.id); if (openId === c.id) setOpenId(null); refresh() } }} style={{ all: 'unset', cursor: 'pointer', fontFamily: FM, fontSize: 10, color: '#E05252' }}>🗑</button>
              </div>

              {openId === c.id && (
                <div style={{ marginTop: 14, borderTop: `1px solid ${LINE}`, paddingTop: 12 }}>
                  {pieces.length === 0 ? (
                    <div style={{ fontFamily: FM, fontSize: 11, color: INK_SOFT }}>Sin piezas asignadas.</div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ fontFamily: FM, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: INK_SOFT, textAlign: 'left' }}>
                          <th style={{ padding: '6px 8px' }}>Pieza</th>
                          <th style={{ padding: '6px 8px' }}>Estado</th>
                          <th style={{ padding: '6px 8px' }}>Fecha</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right' }}>Alcance</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right' }}>Likes</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right' }}>Coment.</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right' }}>Guardados</th>
                          <th style={{ padding: '6px 8px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {pieces.map(p => (
                          <tr key={p.id} style={{ borderTop: `1px solid ${LINE}` }}>
                            <td style={{ padding: '7px 8px', fontWeight: 600 }}>
                              {p.permalink ? <a href={p.permalink} target="_blank" rel="noopener noreferrer" style={{ color: T.cream, textDecoration: 'none' }}>{p.title} ↗</a> : p.title}
                            </td>
                            <td style={{ padding: '7px 8px', fontFamily: FM, fontSize: 10, color: p.status === 'published' ? T.mint : INK_SOFT }}>{p.status}</td>
                            <td style={{ padding: '7px 8px', fontFamily: FM, fontSize: 10, color: INK_SOFT }}>
                              {p.scheduledAt ? new Date(p.scheduledAt).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: ARG_TZ }) : '—'}
                            </td>
                            <td style={{ padding: '7px 8px', textAlign: 'right', fontFamily: FM }}>{fmt(p.reach)}</td>
                            <td style={{ padding: '7px 8px', textAlign: 'right', fontFamily: FM }}>{fmt(p.likes)}</td>
                            <td style={{ padding: '7px 8px', textAlign: 'right', fontFamily: FM }}>{fmt(p.comments)}</td>
                            <td style={{ padding: '7px 8px', textAlign: 'right', fontFamily: FM }}>{fmt(p.saved)}</td>
                            <td style={{ padding: '7px 8px', textAlign: 'right' }}>
                              {p.status === 'published' && (
                                <button
                                  onClick={async () => {
                                    const res = await createAdIntent({ carouselId: p.id, campaignId: c.id })
                                    setMsg(res.error ? `⚠ ${res.error}` : '📣 Intención de boost guardada — se ejecuta cuando conectes Meta Ads')
                                  }}
                                  style={{ all: 'unset', cursor: 'pointer', fontFamily: FM, fontSize: 9, color: T.amber }}
                                >🚀 promocionar</button>
                              )}
                              <button onClick={async () => { await removePieceFromCampaign(p.id); openCampaign(c.id); refresh() }} style={{ all: 'unset', cursor: 'pointer', fontFamily: FM, fontSize: 9, color: INK_SOFT, marginLeft: 10 }}>✕</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  <button
                    onClick={async () => { setUnassigned(await listUnassignedPieces()); setPickIds([]); setShowAssign(true) }}
                    style={{ all: 'unset', cursor: 'pointer', marginTop: 10, fontFamily: FM, fontSize: 11, color: T.mint }}
                  >+ Agregar piezas del Studio</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal crear */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(10,21,41,0.9)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowCreate(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 460, background: T.navySoft, borderRadius: 18, padding: 26, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontFamily: FD, fontWeight: 800, fontSize: 19 }}>Nueva campaña</div>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre (ej: Lanzamiento agosto)" style={{ padding: '11px 13px', borderRadius: 9, border: `1px solid ${LINE}`, background: T.navyDeep, color: T.cream, fontFamily: FD, fontSize: 13, outline: 'none' }}/>
            <input value={objective} onChange={e => setObjective(e.target.value)} placeholder="Objetivo (opcional)" style={{ padding: '11px 13px', borderRadius: 9, border: `1px solid ${LINE}`, background: T.navyDeep, color: T.cream, fontFamily: FD, fontSize: 13, outline: 'none' }}/>
            <input value={budget} onChange={e => setBudget(e.target.value)} placeholder="Presupuesto (opcional, para Meta Ads)" type="number" style={{ padding: '11px 13px', borderRadius: 9, border: `1px solid ${LINE}`, background: T.navyDeep, color: T.cream, fontFamily: FD, fontSize: 13, outline: 'none' }}/>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                disabled={!name.trim()}
                onClick={async () => {
                  const res = await createCampaign({ name, objective, budget: budget ? Number(budget) : undefined })
                  if (!res.error) { setShowCreate(false); setName(''); setObjective(''); setBudget(''); refresh() }
                }}
                style={{ all: 'unset', flex: 1, cursor: 'pointer', padding: '12px 0', borderRadius: 10, background: T.mint, color: T.navy, fontFamily: FD, fontWeight: 700, fontSize: 14, textAlign: 'center', opacity: name.trim() ? 1 : 0.5 }}
              >Crear</button>
              <button onClick={() => setShowCreate(false)} style={{ all: 'unset', cursor: 'pointer', padding: '12px 16px', borderRadius: 10, background: 'rgba(245,242,235,0.07)', color: INK_SOFT, fontFamily: FD, fontSize: 13 }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal asignar piezas */}
      {showAssign && openId && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(10,21,41,0.9)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowAssign(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 520, maxHeight: '75vh', overflow: 'auto', background: T.navySoft, borderRadius: 18, padding: 26, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontFamily: FD, fontWeight: 800, fontSize: 18 }}>Agregar piezas a la campaña</div>
            {unassigned.length === 0 ? (
              <div style={{ fontFamily: FM, fontSize: 11, color: INK_SOFT }}>No hay piezas sin campaña.</div>
            ) : unassigned.map(p => (
              <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: pickIds.includes(p.id) ? `${T.mint}14` : 'transparent', cursor: 'pointer' }}>
                <input type="checkbox" checked={pickIds.includes(p.id)} onChange={() => setPickIds(prev => prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id])}/>
                <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{p.title}</span>
                <span style={{ fontFamily: FM, fontSize: 9, color: INK_SOFT }}>{p.status}</span>
              </label>
            ))}
            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              <button
                disabled={pickIds.length === 0}
                onClick={async () => { await assignPiecesToCampaign(openId, pickIds); setShowAssign(false); openCampaign(openId); refresh() }}
                style={{ all: 'unset', flex: 1, cursor: 'pointer', padding: '12px 0', borderRadius: 10, background: T.mint, color: T.navy, fontFamily: FD, fontWeight: 700, fontSize: 14, textAlign: 'center', opacity: pickIds.length ? 1 : 0.5 }}
              >Agregar {pickIds.length || ''}</button>
              <button onClick={() => setShowAssign(false)} style={{ all: 'unset', cursor: 'pointer', padding: '12px 16px', borderRadius: 10, background: 'rgba(245,242,235,0.07)', color: INK_SOFT, fontFamily: FD, fontSize: 13 }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
