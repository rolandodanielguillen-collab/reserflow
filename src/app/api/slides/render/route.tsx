import { ImageResponse } from 'next/og'
import { NextRequest, NextResponse } from 'next/server'

const W = 1080, H = 1350

const T = {
  navy: '#0F1E3D',
  navySoft: '#1A2D52',
  mint: '#17B095',
  cream: '#F5F2EB',
  whatsapp: '#25D366',
}

const DARK = {
  bg: T.navy, panel: T.navySoft,
  ink: T.cream, inkSoft: 'rgba(245,242,235,0.70)',
  inkMute: 'rgba(245,242,235,0.42)', line: 'rgba(245,242,235,0.14)',
}
const LIGHT = {
  bg: T.cream, panel: '#ffffff',
  ink: T.navy, inkSoft: 'rgba(15,30,61,0.62)',
  inkMute: 'rgba(15,30,61,0.38)', line: 'rgba(15,30,61,0.12)',
}

type Th = typeof DARK
const FD = 'sans-serif'
const FM = 'monospace'

function Foot({ th, idx, total }: { th: Th; idx: number; total: number }) {
  return (
    <div style={{ position: 'absolute', left: 64, right: 64, bottom: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: FD, fontWeight: 900, fontSize: 32, letterSpacing: '-0.04em', color: th.ink }}>
        <span>RESER</span>
        <div style={{ position: 'relative', width: 28, height: 28, display: 'flex' }}>
          <div style={{ position: 'absolute', left: '38%', top: '8%', width: '24%', height: '84%', background: T.mint, display: 'flex' }}/>
          <div style={{ position: 'absolute', top: '38%', left: '8%', height: '24%', width: '84%', background: T.mint, display: 'flex' }}/>
        </div>
      </div>
      {total > 1 && (
        <div style={{ fontFamily: FM, fontSize: 14, letterSpacing: '0.08em', color: th.inkSoft, textTransform: 'uppercase', display: 'flex' }}>
          {String(idx + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </div>
      )}
    </div>
  )
}

function Frame({ th, idx, total, showFoot, children }: { th: Th; idx: number; total: number; showFoot?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ width: W, height: H, background: th.bg, position: 'relative', overflow: 'hidden', fontFamily: FD, color: th.ink, display: 'flex', flexDirection: 'column' }}>
      {children}
      {showFoot !== false && <Foot th={th} idx={idx} total={total}/>}
    </div>
  )
}

function Plus({ size, opacity, style }: { size: number; opacity: number; style?: Record<string, unknown> }) {
  return (
    <div style={{ width: size, height: size, opacity, position: 'relative', display: 'flex', ...(style as Record<string, string | number>) }}>
      <div style={{ position: 'absolute', left: '38%', top: 0, width: '24%', height: '100%', background: T.mint, display: 'flex' }}/>
      <div style={{ position: 'absolute', top: '38%', left: 0, height: '24%', width: '100%', background: T.mint, display: 'flex' }}/>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderSlide(d: any): React.ReactElement {
  const kind: string = d.kind || d.type || 'content'
  const idx: number = d.index ?? 0
  const total: number = d.total ?? 1
  const dark: boolean = d.dark !== undefined ? d.dark : true
  const th = dark ? DARK : LIGHT

  if (kind === 'cover') {
    return (
      <Frame th={th} idx={idx} total={total}>
        <Plus size={820} opacity={dark ? 0.05 : 0.04} style={{ position: 'absolute', right: -280, top: -240 }}/>
        <div style={{ position: 'absolute', left: 64, top: 64, display: 'flex' }}>
          <div style={{ fontFamily: FM, fontSize: 18, letterSpacing: '0.18em', color: T.mint, textTransform: 'uppercase', fontWeight: 600, display: 'flex' }}>
            {d.eyebrow || 'RESER+'}
          </div>
        </div>
        <div style={{ position: 'absolute', left: 64, right: 64, bottom: 180, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontFamily: FD, fontWeight: 900, fontSize: 124, lineHeight: 0.94, letterSpacing: '-0.045em', whiteSpace: 'pre-line', color: th.ink, display: 'flex', flexDirection: 'column' }}>
            {d.big || d.headline || ''}
          </div>
          {(d.foot || d.body) && (
            <div style={{ marginTop: 40, fontFamily: FM, fontSize: 22, color: th.inkSoft, display: 'flex' }}>
              {d.foot || d.body}
            </div>
          )}
        </div>
      </Frame>
    )
  }

  if (kind === 'cta') {
    return (
      <Frame th={th} idx={idx} total={total} showFoot={false}>
        <Plus size={1400} opacity={dark ? 0.07 : 0.05} style={{ position: 'absolute', left: -160, top: -25 }}/>
        <div style={{ position: 'absolute', left: 64, top: 120, display: 'flex', alignItems: 'center', gap: 10, fontFamily: FD, fontWeight: 900, fontSize: 44, letterSpacing: '-0.04em', color: th.ink }}>
          <span style={{ display: 'flex' }}>RESER</span>
          <div style={{ position: 'relative', width: 38, height: 38, display: 'flex' }}>
            <div style={{ position: 'absolute', left: '38%', top: '8%', width: '24%', height: '84%', background: T.mint, display: 'flex' }}/>
            <div style={{ position: 'absolute', top: '38%', left: '8%', height: '24%', width: '84%', background: T.mint, display: 'flex' }}/>
          </div>
        </div>
        <div style={{ position: 'absolute', left: 64, right: 64, top: 380, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontFamily: FD, fontWeight: 900, fontSize: 132, lineHeight: 0.93, letterSpacing: '-0.045em', whiteSpace: 'pre-line', color: th.ink, display: 'flex', flexDirection: 'column' }}>
            {d.big || d.headline || ''}
          </div>
        </div>
        <div style={{ position: 'absolute', left: 64, right: 64, bottom: 100, display: 'flex' }}>
          <div style={{ background: T.mint, color: T.navy, padding: '36px 44px', borderRadius: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: FD, fontWeight: 800, fontSize: 38, letterSpacing: '-0.02em', width: '100%' }}>
            <span style={{ display: 'flex' }}>{d.cta || d.body || 'Conocé más'}</span>
            <div style={{ width: 72, height: 72, borderRadius: 36, background: T.navy, color: T.mint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>→</div>
          </div>
        </div>
      </Frame>
    )
  }

  if (kind === 'stat') {
    return (
      <Frame th={th} idx={idx} total={total}>
        <div style={{ position: 'absolute', left: 64, right: 64, top: 64, bottom: 180, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontFamily: FD, fontWeight: 900, fontSize: 300, lineHeight: 0.9, letterSpacing: '-0.06em', color: T.mint, display: 'flex' }}>
            {d.top || d.number || ''}
          </div>
          <div style={{ marginTop: 24, fontFamily: FD, fontWeight: 800, fontSize: 88, lineHeight: 0.98, letterSpacing: '-0.04em', color: th.ink, whiteSpace: 'pre-line', display: 'flex', flexDirection: 'column' }}>
            {d.big || d.label || ''}
          </div>
          {(d.bottom || d.sub) && (
            <div style={{ marginTop: 40, fontSize: 30, maxWidth: 800, lineHeight: 1.25, color: th.inkSoft, fontWeight: 500, display: 'flex' }}>
              {d.bottom || d.sub}
            </div>
          )}
        </div>
      </Frame>
    )
  }

  if (kind === 'bigNumber') {
    return (
      <Frame th={th} idx={idx} total={total}>
        <div style={{ position: 'absolute', left: 64, right: 64, top: 64, bottom: 180, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontFamily: FD, fontWeight: 900, fontSize: 420, lineHeight: 0.85, letterSpacing: '-0.07em', color: T.mint, display: 'flex' }}>
            {d.number || ''}
          </div>
          <div style={{ marginTop: 24, fontFamily: FD, fontWeight: 800, fontSize: 76, lineHeight: 1, letterSpacing: '-0.035em', color: th.ink, display: 'flex' }}>
            {d.label || ''}
          </div>
          {d.sub && (
            <div style={{ marginTop: 20, fontSize: 30, color: th.inkSoft, fontWeight: 500, display: 'flex' }}>{d.sub}</div>
          )}
        </div>
      </Frame>
    )
  }

  if (kind === 'quote') {
    return (
      <Frame th={th} idx={idx} total={total}>
        <div style={{ position: 'absolute', left: 80, right: 80, top: 140, bottom: 220, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontFamily: FD, fontWeight: 900, fontSize: 260, color: T.mint, lineHeight: 0.6, marginBottom: 20, letterSpacing: '-0.05em', display: 'flex' }}>&ldquo;</div>
          <div style={{ fontFamily: FD, fontWeight: 600, fontSize: 72, lineHeight: 1.08, letterSpacing: '-0.035em', color: th.ink, whiteSpace: 'pre-line', display: 'flex', flexDirection: 'column' }}>
            {d.text || d.big || ''}
          </div>
          {(d.attrib) && (
            <div style={{ marginTop: 40, fontFamily: FM, fontSize: 22, letterSpacing: '0.1em', color: th.inkMute, textTransform: 'uppercase', display: 'flex' }}>
              — {d.attrib}
            </div>
          )}
        </div>
      </Frame>
    )
  }

  if (kind === 'beforeAfter') {
    const before = d.before || { title: 'Antes', items: [] }
    const after = d.after || { title: 'Después', items: [] }
    return (
      <Frame th={th} idx={idx} total={total}>
        <div style={{ position: 'absolute', left: 64, right: 64, top: 80, bottom: 180, display: 'flex', gap: 28 }}>
          <div style={{ flex: 1, background: th.panel, border: `1px solid ${th.line}`, borderRadius: 24, padding: 36, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontFamily: FM, fontSize: 16, letterSpacing: '0.16em', color: th.inkMute, textTransform: 'uppercase', marginBottom: 20, display: 'flex' }}>{before.title}</div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20, justifyContent: 'center' }}>
              {(before.items || []).map((t: string, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 30, fontFamily: FD, fontWeight: 500, letterSpacing: '-0.01em', color: th.inkSoft, textDecoration: 'line-through' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 16, background: 'rgba(200,60,60,0.15)', color: '#C83C3C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, flexShrink: 0 }}>×</div>
                  <span style={{ display: 'flex' }}>{t}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, background: T.mint, borderRadius: 24, padding: 36, display: 'flex', flexDirection: 'column', color: T.navy }}>
            <div style={{ fontFamily: FM, fontSize: 16, letterSpacing: '0.16em', color: 'rgba(15,30,61,0.6)', textTransform: 'uppercase', marginBottom: 20, display: 'flex' }}>{after.title}</div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20, justifyContent: 'center' }}>
              {(after.items || []).map((t: string, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 30, fontFamily: FD, fontWeight: 700, letterSpacing: '-0.01em', color: T.navy }}>
                  <div style={{ width: 32, height: 32, borderRadius: 16, background: T.navy, color: T.mint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, flexShrink: 0 }}>✓</div>
                  <span style={{ display: 'flex' }}>{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Frame>
    )
  }

  if (kind === 'steps') {
    return (
      <Frame th={th} idx={idx} total={total}>
        <div style={{ position: 'absolute', left: 64, right: 64, top: 80, display: 'flex' }}>
          <div style={{ fontFamily: FD, fontWeight: 900, fontSize: 88, lineHeight: 0.98, letterSpacing: '-0.04em', color: th.ink, display: 'flex' }}>{d.title || ''}</div>
        </div>
        <div style={{ position: 'absolute', left: 64, right: 64, top: 340, display: 'flex', flexDirection: 'column', gap: 28 }}>
          {(d.items || []).map((item: string, i: number) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 32, padding: '28px 32px', background: th.panel, borderRadius: 20, border: `1px solid ${th.line}` }}>
              <div style={{ width: 76, height: 76, background: T.mint, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FD, fontWeight: 900, fontSize: 44, color: T.navy, flexShrink: 0, letterSpacing: '-0.04em' }}>{i + 1}</div>
              <div style={{ fontFamily: FD, fontSize: 40, fontWeight: 600, lineHeight: 1.1, letterSpacing: '-0.02em', color: th.ink, display: 'flex' }}>{item}</div>
            </div>
          ))}
        </div>
      </Frame>
    )
  }

  if (kind === 'checklist') {
    return (
      <Frame th={th} idx={idx} total={total}>
        <div style={{ position: 'absolute', left: 64, right: 64, top: 80, display: 'flex' }}>
          <div style={{ fontFamily: FD, fontWeight: 900, fontSize: 64, lineHeight: 1.02, letterSpacing: '-0.03em', color: th.ink, maxWidth: 880, display: 'flex' }}>{d.title || ''}</div>
        </div>
        <div style={{ position: 'absolute', left: 64, right: 64, top: 340, display: 'flex', flexDirection: 'column', gap: 24 }}>
          {(d.items || []).map((item: string, i: number) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 28, padding: '28px 32px', background: th.panel, borderRadius: 18, border: `1px solid ${th.line}` }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, border: `3px solid ${T.mint}`, display: 'flex', flexShrink: 0 }}/>
              <div style={{ fontSize: 34, fontFamily: FD, fontWeight: 500, letterSpacing: '-0.015em', color: th.ink, lineHeight: 1.2, display: 'flex' }}>{item}</div>
            </div>
          ))}
        </div>
      </Frame>
    )
  }

  if (kind === 'iconList') {
    return (
      <Frame th={th} idx={idx} total={total}>
        <div style={{ position: 'absolute', left: 64, right: 64, top: 80, display: 'flex' }}>
          <div style={{ fontFamily: FD, fontWeight: 900, fontSize: 72, lineHeight: 1.02, letterSpacing: '-0.035em', color: th.ink, maxWidth: 820, display: 'flex' }}>{d.title || ''}</div>
        </div>
        <div style={{ position: 'absolute', left: 64, right: 64, top: 360, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {(d.items || []).map((item: string, i: number) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 28, padding: '28px 32px', background: th.panel, borderRadius: 18, border: `1px solid ${th.line}`, fontSize: 40, fontFamily: FD, fontWeight: 600, letterSpacing: '-0.02em', color: th.ink }}>
              <div style={{ width: 14, height: 14, borderRadius: 7, background: T.mint, display: 'flex', flexShrink: 0 }}/>
              <span style={{ display: 'flex' }}>{item}</span>
            </div>
          ))}
        </div>
      </Frame>
    )
  }

  if (kind === 'crossList') {
    return (
      <Frame th={th} idx={idx} total={total}>
        <div style={{ position: 'absolute', left: 64, right: 64, top: 100, bottom: 200, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 18 }}>
          {(d.items || []).map((item: string, i: number) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 28, fontFamily: FD, fontWeight: 700, fontSize: 54, letterSpacing: '-0.025em', lineHeight: 1.1, color: th.inkSoft, textDecoration: 'line-through' }}>
              <span style={{ display: 'flex' }}>{item}</span>
            </div>
          ))}
        </div>
      </Frame>
    )
  }

  if (kind === 'list') {
    return (
      <Frame th={th} idx={idx} total={total}>
        <div style={{ position: 'absolute', left: 64, right: 64, top: 120, bottom: 200, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 32 }}>
          {(d.items || []).map((item: string, i: number) => (
            <div key={i} style={{ fontFamily: FD, fontWeight: 700, fontSize: 62, lineHeight: 1.02, letterSpacing: '-0.03em', color: th.ink, display: 'flex' }}>
              {item}
            </div>
          ))}
        </div>
      </Frame>
    )
  }

  if (kind === 'plusGrid') {
    const items: Array<{ t: string; d: string }> = d.items || []
    return (
      <Frame th={th} idx={idx} total={total}>
        <div style={{ position: 'absolute', left: 64, right: 64, top: 100, bottom: 200, display: 'flex', flexWrap: 'wrap', gap: 24 }}>
          {items.map((item, i) => (
            <div key={i} style={{
              width: 'calc(50% - 12px)', height: 'calc(50% - 12px)',
              background: i % 3 === 0 ? T.mint : th.panel, borderRadius: 24,
              border: i % 3 === 0 ? 'none' : `1px solid ${th.line}`,
              padding: 36, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              color: i % 3 === 0 ? T.navy : th.ink,
            }}>
              <div style={{ fontFamily: FD, fontWeight: 900, fontSize: 60, letterSpacing: '-0.04em', lineHeight: 0.95, display: 'flex' }}>{item.t}</div>
              <div style={{ fontSize: 22, lineHeight: 1.3, fontWeight: 500, opacity: i % 3 === 0 ? 0.82 : 0.72, display: 'flex' }}>{item.d}</div>
            </div>
          ))}
        </div>
      </Frame>
    )
  }

  if (kind === 'imageBlock') {
    return (
      <Frame th={th} idx={idx} total={total}>
        <div style={{ position: 'absolute', left: 64, right: 64, top: 80, bottom: 200, display: 'flex', flexDirection: 'column', gap: 32 }}>
          <div style={{
            flex: 1, borderRadius: 24, overflow: 'hidden', position: 'relative',
            background: dark ? 'rgba(245,242,235,0.06)' : 'rgba(15,30,61,0.06)',
            border: `1px solid ${th.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ fontFamily: FM, fontSize: 22, letterSpacing: '0.16em', color: th.inkMute, textTransform: 'uppercase', padding: '14px 24px', background: th.bg, borderRadius: 999, border: `1px solid ${th.line}`, display: 'flex' }}>
              ◳ {d.label || ''}
            </div>
          </div>
          <div style={{ fontFamily: FD, fontWeight: 700, fontSize: 56, lineHeight: 1.05, letterSpacing: '-0.03em', color: th.ink, display: 'flex' }}>
            {d.caption || ''}
          </div>
        </div>
      </Frame>
    )
  }

  if (kind === 'chat') {
    const msgs: Array<{ who: string; text: string }> = d.msgs || []
    const chatBg = dark ? '#0b141a' : '#ECE5DD'
    const incoming = dark ? '#202C33' : '#FFFFFF'
    const outgoing = dark ? '#005C4B' : '#DCF8C6'
    const textC = dark ? '#E9EDEF' : '#111B21'
    return (
      <Frame th={th} idx={idx} total={total}>
        <div style={{ position: 'absolute', left: 120, right: 120, top: 100, bottom: 220, background: chatBg, borderRadius: 44, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: dark ? '0 30px 80px rgba(0,0,0,0.5)' : '0 30px 80px rgba(15,30,61,0.18)', border: `1px solid ${th.line}` }}>
          <div style={{ background: dark ? '#1F2C34' : '#F0F2F5', padding: '22px 28px', display: 'flex', alignItems: 'center', gap: 18, borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)'}` }}>
            <div style={{ width: 56, height: 56, borderRadius: 28, background: T.navy, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ position: 'relative', width: 30, height: 30, display: 'flex' }}>
                <div style={{ position: 'absolute', left: '38%', top: '8%', width: '24%', height: '84%', background: T.mint, display: 'flex' }}/>
                <div style={{ position: 'absolute', top: '38%', left: '8%', height: '24%', width: '84%', background: T.mint, display: 'flex' }}/>
              </div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontFamily: FD, fontWeight: 700, fontSize: 26, color: textC, letterSpacing: '-0.02em', display: 'flex' }}>Reser+</div>
              <div style={{ fontSize: 18, color: dark ? 'rgba(233,237,239,0.55)' : 'rgba(17,27,33,0.55)', display: 'flex' }}>en línea</div>
            </div>
          </div>
          <div style={{ flex: 1, padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: 18, overflow: 'hidden' }}>
            {msgs.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.who === 'you' ? 'flex-end' : 'flex-start',
                maxWidth: '82%', background: m.who === 'you' ? outgoing : incoming,
                color: textC, padding: '16px 20px', borderRadius: 16,
                fontFamily: FD, fontSize: 26, lineHeight: 1.3, whiteSpace: 'pre-line',
                boxShadow: '0 1px 1px rgba(0,0,0,0.08)', display: 'flex',
              }}>
                {m.text}
              </div>
            ))}
          </div>
        </div>
      </Frame>
    )
  }

  if (kind === 'flowScreen') {
    return (
      <Frame th={th} idx={idx} total={total}>
        <div style={{ position: 'absolute', left: 64, top: 80, right: 64, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontFamily: FM, fontSize: 18, letterSpacing: '0.16em', color: T.mint, textTransform: 'uppercase', fontWeight: 600, marginBottom: 28, display: 'flex' }}>{d.eyebrow || 'RESERVÁ POR WHATSAPP'}</div>
          <div style={{ fontFamily: FD, fontWeight: 900, fontSize: 76, lineHeight: 0.96, letterSpacing: '-0.04em', color: th.ink, whiteSpace: 'pre-line', display: 'flex', flexDirection: 'column' }}>{d.big || ''}</div>
          {d.sub && <div style={{ marginTop: 28, fontSize: 26, lineHeight: 1.3, color: th.inkSoft, maxWidth: 800, fontWeight: 500, display: 'flex' }}>{d.sub}</div>}
        </div>
        <div style={{ position: 'absolute', left: 160, right: 160, bottom: 200, display: 'flex', flexDirection: 'column', background: '#1C1C1E', borderRadius: 32, padding: '28px 32px', gap: 12 }}>
          <div style={{ fontFamily: FD, fontWeight: 800, fontSize: 32, color: '#fff', letterSpacing: '-0.02em', marginBottom: 12, display: 'flex' }}>{d.flowHeadline || d.flowTitle || ''}</div>
          {(d.flowItems || []).map((it: { text: string; selected?: boolean }, i: number) => (
            <div key={i} style={{ padding: '16px 18px', background: it.selected ? 'rgba(37,211,102,0.1)' : '#2C2C2E', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 24, color: '#fff', fontWeight: it.selected ? 600 : 400, display: 'flex' }}>{it.text}</span>
              {it.selected && <span style={{ color: T.whatsapp, fontSize: 22, display: 'flex' }}>✓</span>}
            </div>
          ))}
          <div style={{ background: T.whatsapp, color: '#000', padding: '16px 24px', borderRadius: 28, textAlign: 'center', fontWeight: 700, fontSize: 22, marginTop: 8, display: 'flex', justifyContent: 'center' }}>
            {d.flowCta || 'Siguiente'}
          </div>
        </div>
      </Frame>
    )
  }

  // Default: generic content slide
  const headline = d.headline || d.big || d.text || ''
  const body = d.body || d.sub || ''
  return (
    <Frame th={th} idx={idx} total={total}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 8, background: `linear-gradient(90deg, ${T.mint} 0%, ${th.panel} 100%)`, display: 'flex' }}/>
      <div style={{ position: 'absolute', left: 80, right: 80, top: 80, bottom: 200, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: `rgba(23,176,149,0.13)`, border: `2px solid rgba(23,176,149,0.27)`, borderRadius: 100, padding: '10px 24px' }}>
            <div style={{ width: 10, height: 10, borderRadius: 5, background: T.mint, display: 'flex' }}/>
            <span style={{ color: T.mint, fontSize: 24, fontWeight: 700, letterSpacing: '0.08em', display: 'flex' }}>{idx + 1} / {total}</span>
          </div>
          {d.emoji && <span style={{ fontSize: 80, display: 'flex' }}>{d.emoji}</span>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          <div style={{ color: th.ink, fontSize: 80, fontWeight: 900, lineHeight: 1.08, letterSpacing: '-0.02em', maxWidth: 920, whiteSpace: 'pre-line', display: 'flex', flexDirection: 'column' }}>{headline}</div>
          <div style={{ width: 80, height: 4, borderRadius: 2, background: T.mint, display: 'flex' }}/>
          {body && <div style={{ color: th.inkSoft, fontSize: 42, fontWeight: 400, lineHeight: 1.55, maxWidth: 880, whiteSpace: 'pre-line', display: 'flex', flexDirection: 'column' }}>{body}</div>}
        </div>
      </div>
    </Frame>
  )
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    return new ImageResponse(renderSlide(data), { width: W, height: H })
  } catch {
    return NextResponse.json({ error: 'Render error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const p = req.nextUrl.searchParams
    const data: Record<string, unknown> = {}
    p.forEach((v, k) => { data[k] = v })
    if (data.index) data.index = parseInt(data.index as string)
    if (data.total) data.total = parseInt(data.total as string)
    if (data.dark !== undefined) data.dark = data.dark === 'true'
    return new ImageResponse(renderSlide(data), { width: W, height: H })
  } catch {
    return NextResponse.json({ error: 'Render error' }, { status: 500 })
  }
}
