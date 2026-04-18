'use client'

import type { CSSProperties } from 'react'
import type { DesignSlide } from '../types'

// ── Design tokens ─────────────────────────────────────────────────────────
const T = {
  navy:      '#0F1E3D',
  navyDeep:  '#0A1529',
  navySoft:  '#1A2D52',
  mint:      '#17B095',
  mintSoft:  '#1FCBA9',
  cream:     '#F5F2EB',
  paper:     '#FBF9F4',
  whatsapp:  '#25D366',
}
const FD = `'Archivo', 'Helvetica Neue', Helvetica, Arial, sans-serif`
const FM = `'JetBrains Mono', ui-monospace, SFMono-Regular, monospace`

const DARK = {
  bg:       T.navy,      panel:   T.navySoft,
  ink:      T.cream,     inkSoft: 'rgba(245,242,235,0.70)',
  inkMute:  'rgba(245,242,235,0.42)',
  accent:   T.mint,      line:    'rgba(245,242,235,0.14)',
  lineSoft: 'rgba(245,242,235,0.06)',
}
const LIGHT = {
  bg:       T.cream,     panel:   '#ffffff',
  ink:      T.navy,      inkSoft: 'rgba(15,30,61,0.62)',
  inkMute:  'rgba(15,30,61,0.38)',
  accent:   T.mint,      line:    'rgba(15,30,61,0.12)',
  lineSoft: 'rgba(15,30,61,0.06)',
}

const SLIDE_W = 1080
const SLIDE_H = 1350

// ── Primitives ────────────────────────────────────────────────────────────

function GridTexture({ th }: { th: typeof DARK }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.035,
      backgroundImage: `linear-gradient(to right,${th.ink} 1px,transparent 1px),linear-gradient(to bottom,${th.ink} 1px,transparent 1px)`,
      backgroundSize: '60px 60px',
    }}/>
  )
}

function BigPlus({ size = 600, color, opacity = 1, style }: { size?: number; color: string; opacity?: number; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ opacity, ...style }}>
      <rect x="38" y="0" width="24" height="100" fill={color}/>
      <rect x="0" y="38" width="100" height="24" fill={color}/>
    </svg>
  )
}

function ReserLogo({ dark = false, size = 56 }: { dark?: boolean; size?: number }) {
  const color = dark ? T.cream : T.navy
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.12, fontFamily: FD, fontWeight: 900, fontSize: size, letterSpacing: '-0.04em', color, lineHeight: 1 }}>
      <span>RESER</span>
      <svg viewBox="0 0 100 100" width={size * 0.85} height={size * 0.85} style={{ position: 'relative', top: size * 0.02 }}>
        <rect x="38" y="8" width="24" height="84" fill={T.mint}/>
        <rect x="8" y="38" width="84" height="24" fill={T.mint}/>
      </svg>
    </div>
  )
}

function BrandFoot({ th, idx, total, cta, dark }: { th: typeof DARK; idx: number; total: number; cta?: string; dark: boolean }) {
  return (
    <div style={{ position: 'absolute', left: 64, right: 64, bottom: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <ReserLogo dark={dark} size={32}/>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontFamily: FM, fontSize: 14, letterSpacing: '0.08em', color: th.inkSoft, textTransform: 'uppercase' }}>
        {cta && <span style={{ color: th.accent, fontWeight: 600 }}>{cta}</span>}
        {total > 1 && <span>{String(idx + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}</span>}
      </div>
    </div>
  )
}

function Frame({ dark, idx, total, footCta, showFoot = true, children }: {
  dark: boolean; idx: number; total: number; footCta?: string; showFoot?: boolean; children: React.ReactNode
}) {
  const th = dark ? DARK : LIGHT
  return (
    <div style={{ width: SLIDE_W, height: SLIDE_H, background: th.bg, position: 'relative', overflow: 'hidden', fontFamily: FD, color: th.ink }}>
      <GridTexture th={th}/>
      {children}
      {showFoot && <BrandFoot th={th} idx={idx} total={total} cta={footCta} dark={dark}/>}
    </div>
  )
}

// ── Slide renderers ───────────────────────────────────────────────────────

function CoverSlide({ s, dark, idx, total, cta }: { s: Extract<DesignSlide, { kind: 'cover' }>; dark: boolean; idx: number; total: number; cta?: string }) {
  const th = dark ? DARK : LIGHT
  return (
    <Frame dark={dark} idx={idx} total={total} footCta={cta}>
      <BigPlus size={820} color={th.accent} opacity={dark ? 0.10 : 0.08} style={{ position: 'absolute', right: -280, top: -240 }}/>
      <div style={{ position: 'absolute', left: 64, top: 64 }}>
        <div style={{ fontFamily: FM, fontSize: 18, letterSpacing: '0.18em', color: th.accent, textTransform: 'uppercase', fontWeight: 600 }}>
          {s.eyebrow || 'RESER+'}
        </div>
      </div>
      <div style={{ position: 'absolute', left: 64, right: 64, bottom: 180 }}>
        <h1 style={{ fontFamily: FD, fontWeight: 900, fontSize: 132, lineHeight: 0.94, letterSpacing: '-0.045em', margin: 0, whiteSpace: 'pre-line', color: th.ink }}>
          {s.big}
        </h1>
        {s.foot && (
          <div style={{ marginTop: 40, fontFamily: FM, fontSize: 22, color: th.inkSoft, textTransform: 'lowercase' }}>
            {s.foot}
          </div>
        )}
      </div>
    </Frame>
  )
}

function StatSlide({ s, dark, idx, total, cta }: { s: Extract<DesignSlide, { kind: 'stat' }>; dark: boolean; idx: number; total: number; cta?: string }) {
  const th = dark ? DARK : LIGHT
  return (
    <Frame dark={dark} idx={idx} total={total} footCta={cta}>
      <div style={{ position: 'absolute', inset: 64, bottom: 180, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ fontFamily: FD, fontWeight: 900, fontSize: 320, lineHeight: 0.9, letterSpacing: '-0.06em', color: th.accent }}>
          {s.top}
        </div>
        <div style={{ marginTop: 24, fontFamily: FD, fontWeight: 800, fontSize: 92, lineHeight: 0.98, letterSpacing: '-0.04em', color: th.ink, whiteSpace: 'pre-line' }}>
          {s.big}
        </div>
        {s.bottom && (
          <div style={{ marginTop: 40, fontSize: 30, maxWidth: 800, lineHeight: 1.25, color: th.inkSoft, fontWeight: 500 }}>
            {s.bottom}
          </div>
        )}
      </div>
    </Frame>
  )
}

function StepsSlide({ s, dark, idx, total, cta }: { s: Extract<DesignSlide, { kind: 'steps' }>; dark: boolean; idx: number; total: number; cta?: string }) {
  const th = dark ? DARK : LIGHT
  return (
    <Frame dark={dark} idx={idx} total={total} footCta={cta}>
      <div style={{ position: 'absolute', left: 64, right: 64, top: 80 }}>
        <h2 style={{ fontFamily: FD, fontWeight: 900, fontSize: 88, lineHeight: 0.98, letterSpacing: '-0.04em', margin: 0, color: th.ink }}>{s.title}</h2>
      </div>
      <div style={{ position: 'absolute', left: 64, right: 64, top: 400, display: 'flex', flexDirection: 'column', gap: 28 }}>
        {s.items.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 32, padding: '28px 32px', background: th.panel, borderRadius: 20, border: `1px solid ${th.line}` }}>
            <div style={{ width: 76, height: 76, background: th.accent, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FD, fontWeight: 900, fontSize: 44, color: T.navy, flexShrink: 0, letterSpacing: '-0.04em' }}>{i + 1}</div>
            <div style={{ fontFamily: FD, fontSize: 40, fontWeight: 600, lineHeight: 1.1, letterSpacing: '-0.02em', color: th.ink, paddingTop: 12 }}>{item}</div>
          </div>
        ))}
      </div>
    </Frame>
  )
}

function ChatSlide({ s, dark, idx, total, cta }: { s: Extract<DesignSlide, { kind: 'chat' }>; dark: boolean; idx: number; total: number; cta?: string }) {
  const th = dark ? DARK : LIGHT
  const chatBg = dark ? '#0b141a' : '#ECE5DD'
  const incoming = dark ? '#202C33' : '#FFFFFF'
  const outgoing = dark ? '#005C4B' : '#DCF8C6'
  const textC = dark ? '#E9EDEF' : '#111B21'
  return (
    <Frame dark={dark} idx={idx} total={total} footCta={cta}>
      <div style={{ position: 'absolute', left: 120, right: 120, top: 100, bottom: 220, background: chatBg, borderRadius: 44, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: dark ? '0 30px 80px rgba(0,0,0,0.5)' : '0 30px 80px rgba(15,30,61,0.18)', border: `1px solid ${th.line}` }}>
        <div style={{ background: dark ? '#1F2C34' : '#F0F2F5', padding: '22px 28px', display: 'flex', alignItems: 'center', gap: 18, borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)'}` }}>
          <div style={{ width: 56, height: 56, borderRadius: 28, background: T.navy, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 100 100" width={30} height={30}><rect x="38" y="8" width="24" height="84" fill={T.mint}/><rect x="8" y="38" width="84" height="24" fill={T.mint}/></svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: FD, fontWeight: 700, fontSize: 26, color: dark ? '#E9EDEF' : '#111B21', letterSpacing: '-0.02em' }}>Reser+</div>
            <div style={{ fontSize: 18, color: dark ? 'rgba(233,237,239,0.55)' : 'rgba(17,27,33,0.55)' }}>en línea</div>
          </div>
          <div style={{ color: T.whatsapp, fontSize: 32 }}>●</div>
        </div>
        <div style={{ flex: 1, padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: 18, overflow: 'hidden' }}>
          {s.msgs.map((m, i) => (
            <div key={i} style={{ alignSelf: m.who === 'you' ? 'flex-end' : 'flex-start', maxWidth: '82%', background: m.who === 'you' ? outgoing : incoming, color: textC, padding: '16px 20px', borderRadius: 16, borderTopRightRadius: m.who === 'you' ? 4 : 16, borderTopLeftRadius: m.who === 'you' ? 16 : 4, fontFamily: FD, fontSize: 26, lineHeight: 1.3, letterSpacing: '-0.01em', whiteSpace: 'pre-line', boxShadow: '0 1px 1px rgba(0,0,0,0.08)' }}>
              {m.text}
            </div>
          ))}
        </div>
        <div style={{ padding: '16px 20px', background: dark ? '#1F2C34' : '#F0F2F5', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, background: dark ? '#2A3942' : '#FFFFFF', borderRadius: 26, padding: '14px 20px', fontSize: 20, color: dark ? 'rgba(233,237,239,0.35)' : 'rgba(17,27,33,0.35)' }}>Mensaje</div>
          <div style={{ width: 52, height: 52, borderRadius: 26, background: T.whatsapp }}/>
        </div>
      </div>
    </Frame>
  )
}

function BeforeAfterSlide({ s, dark, idx, total, cta }: { s: Extract<DesignSlide, { kind: 'beforeAfter' }>; dark: boolean; idx: number; total: number; cta?: string }) {
  const th = dark ? DARK : LIGHT
  return (
    <Frame dark={dark} idx={idx} total={total} footCta={cta}>
      <div style={{ position: 'absolute', left: 64, right: 64, top: 80, bottom: 180, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
        <div style={{ background: th.panel, border: `1px solid ${th.line}`, borderRadius: 24, padding: 36, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontFamily: FM, fontSize: 16, letterSpacing: '0.16em', color: th.inkMute, textTransform: 'uppercase', marginBottom: 20 }}>{s.before.title}</div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20, justifyContent: 'center' }}>
            {s.before.items.map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 30, fontFamily: FD, fontWeight: 500, letterSpacing: '-0.01em', color: th.inkSoft, textDecoration: 'line-through', textDecorationColor: 'rgba(200,60,60,0.6)' }}>
                <span style={{ width: 32, height: 32, borderRadius: 16, background: 'rgba(200,60,60,0.15)', color: '#C83C3C', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, flexShrink: 0, textDecoration: 'none' }}>×</span>
                {t}
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: th.accent, borderRadius: 24, padding: 36, display: 'flex', flexDirection: 'column', color: T.navy }}>
          <div style={{ fontFamily: FM, fontSize: 16, letterSpacing: '0.16em', color: 'rgba(15,30,61,0.6)', textTransform: 'uppercase', marginBottom: 20 }}>{s.after.title}</div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20, justifyContent: 'center' }}>
            {s.after.items.map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 30, fontFamily: FD, fontWeight: 700, letterSpacing: '-0.01em', color: T.navy }}>
                <span style={{ width: 32, height: 32, borderRadius: 16, background: T.navy, color: th.accent, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, flexShrink: 0 }}>✓</span>
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Frame>
  )
}

function QuoteSlide({ s, dark, idx, total, cta }: { s: Extract<DesignSlide, { kind: 'quote' }>; dark: boolean; idx: number; total: number; cta?: string }) {
  const th = dark ? DARK : LIGHT
  return (
    <Frame dark={dark} idx={idx} total={total} footCta={cta}>
      <div style={{ position: 'absolute', left: 80, right: 80, top: 140, bottom: 220, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ fontFamily: FD, fontWeight: 900, fontSize: 260, color: th.accent, lineHeight: 0.6, marginBottom: 20, letterSpacing: '-0.05em' }}>"</div>
        <div style={{ fontFamily: FD, fontWeight: 600, fontSize: 72, lineHeight: 1.08, letterSpacing: '-0.035em', color: th.ink, whiteSpace: 'pre-line' }}>
          {s.text}
        </div>
        {s.attrib && (
          <div style={{ marginTop: 40, fontFamily: FM, fontSize: 22, letterSpacing: '0.1em', color: th.inkMute, textTransform: 'uppercase' }}>
            — {s.attrib}
          </div>
        )}
      </div>
    </Frame>
  )
}

function IconListSlide({ s, dark, idx, total, cta }: { s: Extract<DesignSlide, { kind: 'iconList' }>; dark: boolean; idx: number; total: number; cta?: string }) {
  const th = dark ? DARK : LIGHT
  return (
    <Frame dark={dark} idx={idx} total={total} footCta={cta}>
      <div style={{ position: 'absolute', left: 64, right: 64, top: 80 }}>
        <h2 style={{ fontFamily: FD, fontWeight: 900, fontSize: 72, lineHeight: 1.02, letterSpacing: '-0.035em', margin: 0, color: th.ink, maxWidth: 820 }}>{s.title}</h2>
      </div>
      <div style={{ position: 'absolute', left: 64, right: 64, top: 360, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {s.items.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 28, padding: '28px 32px', background: th.panel, borderRadius: 18, border: `1px solid ${th.line}`, fontSize: 40, fontFamily: FD, fontWeight: 600, letterSpacing: '-0.02em', color: th.ink }}>
            <div style={{ width: 14, height: 14, borderRadius: 7, background: th.accent, flexShrink: 0 }}/>
            {item}
          </div>
        ))}
      </div>
    </Frame>
  )
}

function ChecklistSlide({ s, dark, idx, total, cta }: { s: Extract<DesignSlide, { kind: 'checklist' }>; dark: boolean; idx: number; total: number; cta?: string }) {
  const th = dark ? DARK : LIGHT
  return (
    <Frame dark={dark} idx={idx} total={total} footCta={cta}>
      <div style={{ position: 'absolute', left: 64, right: 64, top: 80 }}>
        <h2 style={{ fontFamily: FD, fontWeight: 900, fontSize: 64, lineHeight: 1.02, letterSpacing: '-0.03em', margin: 0, color: th.ink, maxWidth: 880 }}>{s.title}</h2>
      </div>
      <div style={{ position: 'absolute', left: 64, right: 64, top: 340, display: 'flex', flexDirection: 'column', gap: 24 }}>
        {s.items.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 28, padding: '28px 32px', background: th.panel, borderRadius: 18, border: `1px solid ${th.line}` }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, border: `3px solid ${th.accent}`, background: 'transparent', flexShrink: 0 }}/>
            <div style={{ fontSize: 34, fontFamily: FD, fontWeight: 500, letterSpacing: '-0.015em', color: th.ink, lineHeight: 1.2 }}>{item}</div>
          </div>
        ))}
      </div>
    </Frame>
  )
}

function CrossListSlide({ s, dark, idx, total, cta }: { s: Extract<DesignSlide, { kind: 'crossList' }>; dark: boolean; idx: number; total: number; cta?: string }) {
  const th = dark ? DARK : LIGHT
  return (
    <Frame dark={dark} idx={idx} total={total} footCta={cta}>
      <div style={{ position: 'absolute', left: 64, right: 64, top: 100, bottom: 200, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 18 }}>
        {s.items.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 28, fontFamily: FD, fontWeight: 700, fontSize: 54, letterSpacing: '-0.025em', lineHeight: 1.1, color: th.inkSoft, textDecoration: 'line-through', textDecorationColor: th.accent, textDecorationThickness: '6px' }}>
            {item}
          </div>
        ))}
      </div>
    </Frame>
  )
}

function BigNumberSlide({ s, dark, idx, total, cta }: { s: Extract<DesignSlide, { kind: 'bigNumber' }>; dark: boolean; idx: number; total: number; cta?: string }) {
  const th = dark ? DARK : LIGHT
  return (
    <Frame dark={dark} idx={idx} total={total} footCta={cta}>
      <div style={{ position: 'absolute', inset: 64, bottom: 180, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ fontFamily: FD, fontWeight: 900, fontSize: 480, lineHeight: 0.85, letterSpacing: '-0.07em', color: th.accent }}>
          {s.number}
        </div>
        <div style={{ marginTop: 24, fontFamily: FD, fontWeight: 800, fontSize: 76, lineHeight: 1, letterSpacing: '-0.035em', color: th.ink }}>
          {s.label}
        </div>
        {s.sub && <div style={{ marginTop: 20, fontSize: 30, color: th.inkSoft, fontWeight: 500 }}>{s.sub}</div>}
      </div>
    </Frame>
  )
}

function PlusGridSlide({ s, dark, idx, total, cta }: { s: Extract<DesignSlide, { kind: 'plusGrid' }>; dark: boolean; idx: number; total: number; cta?: string }) {
  const th = dark ? DARK : LIGHT
  return (
    <Frame dark={dark} idx={idx} total={total} footCta={cta}>
      <div style={{ position: 'absolute', left: 64, right: 64, top: 100, bottom: 200, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 24 }}>
        {s.items.map((item, i) => (
          <div key={i} style={{ background: i % 3 === 0 ? th.accent : th.panel, borderRadius: 24, border: `1px solid ${i % 3 === 0 ? 'transparent' : th.line}`, padding: 36, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', color: i % 3 === 0 ? T.navy : th.ink }}>
            <div style={{ fontFamily: FD, fontWeight: 900, fontSize: 64, letterSpacing: '-0.04em', lineHeight: 0.95 }}>{item.t}</div>
            <div style={{ fontSize: 22, lineHeight: 1.3, fontWeight: 500, opacity: i % 3 === 0 ? 0.82 : 0.72 }}>{item.d}</div>
          </div>
        ))}
      </div>
    </Frame>
  )
}

function ImageBlockSlide({ s, dark, idx, total, cta }: { s: Extract<DesignSlide, { kind: 'imageBlock' }>; dark: boolean; idx: number; total: number; cta?: string }) {
  const th = dark ? DARK : LIGHT
  return (
    <Frame dark={dark} idx={idx} total={total} footCta={cta}>
      <div style={{ position: 'absolute', left: 64, right: 64, top: 80, bottom: 200, display: 'flex', flexDirection: 'column', gap: 32 }}>
        <div style={{
          flex: 1, borderRadius: 24, overflow: 'hidden', position: 'relative',
          background: `repeating-linear-gradient(135deg, ${dark ? 'rgba(255,255,255,0.04)' : 'rgba(15,30,61,0.06)'} 0 16px, ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(15,30,61,0.10)'} 16px 32px)`,
          border: `1px solid ${th.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ fontFamily: FM, fontSize: 22, letterSpacing: '0.16em', color: th.inkMute, textTransform: 'uppercase', padding: '14px 24px', background: th.bg, borderRadius: 999, border: `1px solid ${th.line}` }}>
            ◳ {s.label}
          </div>
        </div>
        <div style={{ fontFamily: FD, fontWeight: 700, fontSize: 56, lineHeight: 1.05, letterSpacing: '-0.03em', color: th.ink }}>
          {s.caption}
        </div>
      </div>
    </Frame>
  )
}

function CtaSlide({ s, dark, idx, total }: { s: Extract<DesignSlide, { kind: 'cta' }>; dark: boolean; idx: number; total: number }) {
  const th = dark ? DARK : LIGHT
  return (
    <Frame dark={dark} idx={idx} total={total} showFoot={false}>
      <BigPlus size={1400} color={th.accent} opacity={dark ? 0.14 : 0.10} style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)' }}/>
      <div style={{ position: 'absolute', left: 64, right: 64, top: 120 }}><ReserLogo dark={dark} size={44}/></div>
      <div style={{ position: 'absolute', left: 64, right: 64, top: '42%', transform: 'translateY(-50%)' }}>
        <h1 style={{ fontFamily: FD, fontWeight: 900, fontSize: 144, lineHeight: 0.93, letterSpacing: '-0.045em', margin: 0, whiteSpace: 'pre-line', color: th.ink }}>
          {s.big}
        </h1>
      </div>
      <div style={{ position: 'absolute', left: 64, right: 64, bottom: 100 }}>
        <div style={{ background: th.accent, color: T.navy, padding: '36px 44px', borderRadius: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: FD, fontWeight: 800, fontSize: 38, letterSpacing: '-0.02em' }}>
          <span>{s.cta}</span>
          <div style={{ width: 72, height: 72, borderRadius: 36, background: T.navy, color: th.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, flexShrink: 0 }}>→</div>
        </div>
      </div>
    </Frame>
  )
}

function ListSlide({ s, dark, idx, total, cta }: { s: Extract<DesignSlide, { kind: 'list' }>; dark: boolean; idx: number; total: number; cta?: string }) {
  const th = dark ? DARK : LIGHT
  return (
    <Frame dark={dark} idx={idx} total={total} footCta={cta}>
      <div style={{ position: 'absolute', left: 64, right: 64, top: 120, bottom: 200, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 32 }}>
        {s.items.map((item, i) => (
          <div key={i} style={{ fontFamily: FD, fontWeight: 700, fontSize: 62, lineHeight: 1.02, letterSpacing: '-0.03em', color: th.ink }}>
            {item}
          </div>
        ))}
      </div>
    </Frame>
  )
}

function FlowScreenSlide({ s, dark, idx, total, cta }: { s: Extract<DesignSlide, { kind: 'flowScreen' }>; dark: boolean; idx: number; total: number; cta?: string }) {
  const th = dark ? DARK : LIGHT
  const phoneW = 620, phoneH = 1120
  return (
    <Frame dark={dark} idx={idx} total={total} footCta={cta}>
      <div style={{ position: 'absolute', left: 64, top: 80, width: 380 }}>
        <div style={{ fontFamily: FM, fontSize: 18, letterSpacing: '0.16em', color: th.accent, textTransform: 'uppercase', fontWeight: 600, marginBottom: 28 }}>{s.eyebrow || 'RESERVÁ POR WHATSAPP'}</div>
        <div style={{ fontFamily: FD, fontWeight: 900, fontSize: 76, lineHeight: 0.96, letterSpacing: '-0.04em', color: th.ink, whiteSpace: 'pre-line' }}>{s.big}</div>
        {s.sub && <div style={{ marginTop: 28, fontSize: 26, lineHeight: 1.3, color: th.inkSoft, maxWidth: 360, fontWeight: 500 }}>{s.sub}</div>}
      </div>
      <div style={{ position: 'absolute', right: 60, top: 60, width: phoneW, height: phoneH, background: '#000', borderRadius: 64, padding: 16, boxShadow: dark ? '0 40px 80px rgba(0,0,0,0.6)' : '0 40px 80px rgba(15,30,61,0.25)' }}>
        <div style={{ width: '100%', height: '100%', background: '#0E0E0E', borderRadius: 52, overflow: 'hidden', position: 'relative', color: '#fff', fontFamily: FD }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '22px 40px 6px', fontSize: 18, fontWeight: 600 }}><span>9:41</span><span style={{ opacity: 0.9 }}>● 83%</span></div>
          <div style={{ padding: '8px 18px 12px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize: 22, opacity: 0.8 }}>‹</span>
            <div style={{ width: 40, height: 40, borderRadius: 20, background: T.navy, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 100 100" width={20} height={20}><rect x="38" y="8" width="24" height="84" fill={T.mint}/><rect x="8" y="38" width="84" height="24" fill={T.mint}/></svg>
            </div>
            <span style={{ fontSize: 18, fontWeight: 600, opacity: 0.8 }}>Reser+</span>
          </div>
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: 88, background: '#1C1C1E', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: '18px 26px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.25)', margin: '0 auto 18px' }}/>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ color: T.whatsapp, fontSize: 18, fontWeight: 500 }}>‹ Atrás</span>
              <span style={{ fontSize: 18, fontWeight: 700 }}>{s.flowTitle || 'Elegí...'}</span>
              <div style={{ width: 32, height: 32, borderRadius: 16, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.whatsapp, fontSize: 16 }}>···</div>
            </div>
            <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, marginBottom: 24 }}>
              <div style={{ width: `${s.progress || 40}%`, height: '100%', background: T.whatsapp, borderRadius: 2 }}/>
            </div>
            <div style={{ fontFamily: FD, fontWeight: 800, fontSize: 40, letterSpacing: '-0.02em', marginBottom: 20 }}>{s.flowHeadline || 'Elegí una opción'}</div>
            <div style={{ background: '#2C2C2E', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {(s.flowItems || []).map((it, i) => (
                <div key={i} style={{ padding: '20px 18px', borderBottom: i < (s.flowItems!.length - 1) ? '1px solid rgba(255,255,255,0.06)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: it.selected ? 'rgba(37,211,102,0.06)' : 'transparent' }}>
                  <span style={{ fontSize: 20, fontWeight: it.selected ? 600 : 500 }}>{it.text}</span>
                  {it.selected && <span style={{ color: T.whatsapp, fontSize: 22 }}>✓</span>}
                </div>
              ))}
            </div>
            <div style={{ flex: 1 }}/>
            <div style={{ background: s.flowDisabled ? 'rgba(255,255,255,0.08)' : T.whatsapp, color: s.flowDisabled ? 'rgba(255,255,255,0.35)' : '#000', padding: '18px 24px', borderRadius: 28, textAlign: 'center', fontWeight: 700, fontSize: 20, marginBottom: 14 }}>
              {s.flowCta || 'Siguiente'}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>Administrado por <span style={{ color: T.whatsapp, fontWeight: 600 }}>Reser+</span></div>
          </div>
        </div>
      </div>
    </Frame>
  )
}

// ── Dispatcher ────────────────────────────────────────────────────────────
function SlideRenderer({ slide, dark, idx, total, cta }: { slide: DesignSlide; dark: boolean; idx: number; total: number; cta?: string }) {
  const p = { dark, idx, total, cta }
  switch (slide.kind) {
    case 'cover':       return <CoverSlide s={slide} {...p}/>
    case 'stat':        return <StatSlide s={slide} {...p}/>
    case 'steps':       return <StepsSlide s={slide} {...p}/>
    case 'chat':        return <ChatSlide s={slide} {...p}/>
    case 'beforeAfter': return <BeforeAfterSlide s={slide} {...p}/>
    case 'quote':       return <QuoteSlide s={slide} {...p}/>
    case 'iconList':    return <IconListSlide s={slide} {...p}/>
    case 'checklist':   return <ChecklistSlide s={slide} {...p}/>
    case 'crossList':   return <CrossListSlide s={slide} {...p}/>
    case 'bigNumber':   return <BigNumberSlide s={slide} {...p}/>
    case 'plusGrid':    return <PlusGridSlide s={slide} {...p}/>
    case 'imageBlock':  return <ImageBlockSlide s={slide} {...p}/>
    case 'cta':         return <CtaSlide s={slide} dark={dark} idx={idx} total={total}/>
    case 'list':        return <ListSlide s={slide} {...p}/>
    case 'flowScreen':  return <FlowScreenSlide s={slide} {...p}/>
    default:            return <QuoteSlide s={{ kind: 'quote', text: '—' }} {...p}/>
  }
}

// ── ScaledSlide props ─────────────────────────────────────────────────────
export interface ScaledSlideProps {
  slide: DesignSlide
  dark: boolean
  index: number
  total: number
  cta?: string
  width: number
}

export function ScaledSlide({ slide, dark, index, total, cta, width }: ScaledSlideProps) {
  const scale = width / SLIDE_W
  const height = SLIDE_H * scale
  return (
    <div style={{ width, height, position: 'relative', flexShrink: 0, overflow: 'hidden' }}>
      <div style={{ width: SLIDE_W, height: SLIDE_H, transform: `scale(${scale})`, transformOrigin: 'top left', position: 'absolute', top: 0, left: 0 }}>
        <SlideRenderer slide={slide} dark={dark} idx={index} total={total} cta={cta}/>
      </div>
    </div>
  )
}

// ── VideoPreview placeholder ──────────────────────────────────────────────
export function VideoPreview({ dark = true, width }: { dark?: boolean; width: number }) {
  const height = Math.round(width * (SLIDE_H / SLIDE_W))
  return (
    <div style={{
      width, height,
      background: dark ? T.navyDeep : T.cream,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 12,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: `linear-gradient(to right,${dark ? T.cream : T.navy} 1px,transparent 1px),linear-gradient(to bottom,${dark ? T.cream : T.navy} 1px,transparent 1px)`, backgroundSize: '30px 30px' }}/>
      <div style={{ width: width * 0.18, height: width * 0.18, borderRadius: '50%', background: T.mint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: width * 0.08, color: T.navy, position: 'relative', zIndex: 1 }}>▶</div>
      <div style={{ fontFamily: FM, fontSize: width * 0.05, letterSpacing: '0.14em', color: dark ? 'rgba(245,242,235,0.55)' : 'rgba(15,30,61,0.55)', textTransform: 'uppercase', position: 'relative', zIndex: 1 }}>
        VIDEO 10s
      </div>
    </div>
  )
}
