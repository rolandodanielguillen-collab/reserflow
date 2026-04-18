'use client'

import { useState, useEffect, useContext, createContext, useMemo } from 'react'
import type { CSSProperties, ReactNode } from 'react'

// ── Easing functions ──────────────────────────────────────────────────────
const Easing = {
  linear: (t: number) => t,

  easeInQuad:    (t: number) => t * t,
  easeOutQuad:   (t: number) => t * (2 - t),
  easeInOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),

  easeInCubic:    (t: number) => t * t * t,
  easeOutCubic:   (t: number) => { const s = t - 1; return s * s * s + 1 },
  easeInOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),

  easeInQuart:    (t: number) => t * t * t * t,
  easeOutQuart:   (t: number) => { const s = t - 1; return 1 - s * s * s * s },
  easeInOutQuart: (t: number) => { if (t < 0.5) return 8 * t * t * t * t; const s = t - 1; return 1 - 8 * s * s * s * s },

  easeInExpo:  (t: number) => (t === 0 ? 0 : Math.pow(2, 10 * (t - 1))),
  easeOutExpo: (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  easeInOutExpo: (t: number) => {
    if (t === 0) return 0
    if (t === 1) return 1
    if (t < 0.5) return 0.5 * Math.pow(2, 20 * t - 10)
    return 1 - 0.5 * Math.pow(2, -20 * t + 10)
  },

  easeInSine:    (t: number) => 1 - Math.cos((t * Math.PI) / 2),
  easeOutSine:   (t: number) => Math.sin((t * Math.PI) / 2),
  easeInOutSine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,

  easeOutBack: (t: number) => {
    const c1 = 1.70158, c3 = c1 + 1
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
  },
  easeInBack: (t: number) => {
    const c1 = 1.70158, c3 = c1 + 1
    return c3 * t * t * t - c1 * t * t
  },
  easeInOutBack: (t: number) => {
    const c1 = 1.70158, c2 = c1 * 1.525
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2
  },

  easeOutElastic: (t: number) => {
    const c4 = (2 * Math.PI) / 3
    if (t === 0) return 0
    if (t === 1) return 1
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1
  },
}

// ── Clamp ─────────────────────────────────────────────────────────────────
function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

// ── Interpolate ───────────────────────────────────────────────────────────
type EaseFn = (t: number) => number

function interpolate(input: number[], output: number[], ease: EaseFn | EaseFn[] = Easing.linear) {
  return (t: number): number => {
    if (t <= input[0]) return output[0]
    if (t >= input[input.length - 1]) return output[output.length - 1]
    for (let i = 0; i < input.length - 1; i++) {
      if (t >= input[i] && t <= input[i + 1]) {
        const span = input[i + 1] - input[i]
        const local = span === 0 ? 0 : (t - input[i]) / span
        const easeFn = Array.isArray(ease) ? (ease[i] ?? Easing.linear) : ease
        const eased = easeFn(local)
        return output[i] + (output[i + 1] - output[i]) * eased
      }
    }
    return output[output.length - 1]
  }
}

// ── Timeline Context ──────────────────────────────────────────────────────
interface TimelineCtx {
  time: number
  duration: number
  playing: boolean
}

export const TimelineContext = createContext<TimelineCtx>({ time: 0, duration: 10, playing: false })

function useTime() {
  return useContext(TimelineContext).time
}

// ── Sprite Context ────────────────────────────────────────────────────────
interface SpriteCtx {
  localTime: number
  progress: number
  duration: number
  visible: boolean
}

const SpriteContext = createContext<SpriteCtx>({ localTime: 0, progress: 0, duration: 0, visible: false })

interface SpriteProps {
  start?: number
  end?: number
  children: ReactNode | ((ctx: SpriteCtx) => ReactNode)
  keepMounted?: boolean
}

function Sprite({ start = 0, end = Infinity, children, keepMounted = false }: SpriteProps) {
  const { time } = useContext(TimelineContext)
  const visible = time >= start && time <= end

  if (!visible && !keepMounted) return null

  const dur = end - start
  const localTime = Math.max(0, time - start)
  const progress = dur > 0 && isFinite(dur) ? clamp(localTime / dur, 0, 1) : 0

  const value: SpriteCtx = { localTime, progress, duration: dur, visible }

  return (
    <SpriteContext.Provider value={value}>
      {typeof children === 'function' ? children(value) : children}
    </SpriteContext.Provider>
  )
}

// ── MiniStage ─────────────────────────────────────────────────────────────
function MiniStage({ duration = 10, children }: { duration?: number; children: ReactNode }) {
  const [time, setTime] = useState(0)

  useEffect(() => {
    let raf: number
    let last: number | null = null
    const step = (ts: number) => {
      if (last == null) last = ts
      const dt = (ts - last) / 1000
      last = ts
      setTime(t => (t + dt) % duration)
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [duration])

  const ctx = useMemo(() => ({ time, duration, playing: true }), [time, duration])

  return (
    <TimelineContext.Provider value={ctx}>
      {children}
    </TimelineContext.Provider>
  )
}

// ── Design tokens ─────────────────────────────────────────────────────────
const T = {
  navy:     '#0F1E3D',
  navyDeep: '#0A1529',
  navySoft: '#1A2D52',
  mint:     '#17B095',
  mintSoft: '#1FCBA9',
  cream:    '#F5F2EB',
  whatsapp: '#25D366',
}

const FD = `'Archivo', 'Helvetica Neue', Helvetica, Arial, sans-serif`
const FM = `'JetBrains Mono', ui-monospace, SFMono-Regular, monospace`

// ── Theme helper ──────────────────────────────────────────────────────────
const LIGHT = {
  bg:      T.cream,
  panel:   '#fff',
  ink:     T.navy,
  inkSoft: 'rgba(15,30,61,0.62)',
  inkMute: 'rgba(15,30,61,0.38)',
  accent:  T.mint,
  line:    'rgba(15,30,61,0.12)',
}
const DARK = {
  bg:      T.navy,
  panel:   T.navySoft,
  ink:     T.cream,
  inkSoft: 'rgba(245,242,235,0.70)',
  inkMute: 'rgba(245,242,235,0.42)',
  accent:  T.mint,
  line:    'rgba(245,242,235,0.14)',
}

type Theme = typeof LIGHT

function getTheme(dark: boolean): Theme {
  return dark ? DARK : LIGHT
}

// ── Logo component ────────────────────────────────────────────────────────
function Logo({ dark = false, size = 40 }: { dark?: boolean; size?: number }) {
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

// ── BigPlus component ─────────────────────────────────────────────────────
function BigPlus({ size = 520, color, opacity = 1, style = {} }: { size?: number; color: string; opacity?: number; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ opacity, ...style }}>
      <rect x="38" y="0" width="24" height="100" fill={color}/>
      <rect x="0" y="38" width="100" height="24" fill={color}/>
    </svg>
  )
}

// ── Scene 1: Chat Demo ────────────────────────────────────────────────────
function ChatDemoScene({ dark, cta, sport, hook }: { dark: boolean; cta: string; sport: string; hook: string }) {
  const t = useTime()
  const theme = getTheme(dark)
  const chatBg  = dark ? '#0b141a' : '#ECE5DD'
  const incoming = dark ? '#202C33' : '#FFFFFF'
  const outgoing = dark ? '#005C4B' : '#DCF8C6'
  const textCol  = dark ? '#E9EDEF' : '#111B21'

  const msgs = [
    { t: 1.2, who: 'you', text: hook },
    { t: 3.0, who: 'bot', text: '¡Listo!\nCancha reservada ✅' },
  ]

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: theme.bg, overflow: 'hidden' }}>
      {/* Eyebrow */}
      <Sprite start={0.2} end={10} keepMounted>
        <div style={{
          position: 'absolute', left: 64, top: 64,
          fontFamily: FM,
          fontSize: 22,
          letterSpacing: '0.18em',
          color: theme.accent,
          textTransform: 'uppercase',
          fontWeight: 600,
        }}>
          30 SEGUNDOS · {sport.toUpperCase()}
        </div>
      </Sprite>

      {/* Chat window */}
      <div style={{
        position: 'absolute',
        left: 96, right: 96, top: 160, bottom: 340,
        background: chatBg,
        borderRadius: 44,
        overflow: 'hidden',
        border: `1px solid ${theme.line}`,
        boxShadow: '0 30px 80px rgba(0,0,0,0.3)',
      }}>
        {/* Header */}
        <div style={{
          background: dark ? '#1F2C34' : '#F0F2F5',
          padding: '24px 28px',
          display: 'flex', alignItems: 'center', gap: 18,
        }}>
          <div style={{
            width: 60, height: 60, borderRadius: 30,
            background: T.navy,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg viewBox="0 0 100 100" width={32} height={32}>
              <rect x="38" y="8" width="24" height="84" fill={T.mint}/>
              <rect x="8" y="38" width="84" height="24" fill={T.mint}/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: FD, fontWeight: 700, fontSize: 28, color: textCol, letterSpacing: '-0.02em' }}>
              Reser+
            </div>
            <div style={{ fontSize: 20, color: dark ? 'rgba(233,237,239,0.55)' : 'rgba(17,27,33,0.55)' }}>
              {t > 1.8 && t < 2.8 ? 'escribiendo...' : 'en línea'}
            </div>
          </div>
        </div>

        {/* Messages area */}
        <div style={{ padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {msgs.map((m, i) => {
            if (t < m.t) return null
            const age = t - m.t
            const entry = Math.min(1, age / 0.35)
            const eased = Easing.easeOutCubic(entry)
            return (
              <div key={i} style={{
                alignSelf: m.who === 'you' ? 'flex-end' : 'flex-start',
                maxWidth: '80%',
                opacity: eased,
                transform: `translateY(${(1 - eased) * 14}px) scale(${0.95 + 0.05 * eased})`,
                background: m.who === 'you' ? outgoing : incoming,
                color: textCol,
                padding: '18px 22px',
                borderRadius: 18,
                borderTopRightRadius: m.who === 'you' ? 4 : 18,
                borderTopLeftRadius: m.who === 'you' ? 18 : 4,
                fontFamily: FD,
                fontSize: 28,
                lineHeight: 1.3,
                whiteSpace: 'pre-line',
                boxShadow: '0 1px 1px rgba(0,0,0,0.1)',
              }}>
                {m.text}
              </div>
            )
          })}

          {/* Typing indicator */}
          {t > 1.8 && t < 2.8 && (
            <div style={{
              alignSelf: 'flex-start',
              background: incoming,
              padding: '20px 24px',
              borderRadius: 18,
              borderTopLeftRadius: 4,
              display: 'flex', gap: 8,
            }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 10, height: 10, borderRadius: 5,
                  background: dark ? 'rgba(233,237,239,0.5)' : 'rgba(0,0,0,0.4)',
                  opacity: 0.3 + 0.7 * Math.abs(Math.sin((t * 5) + i * 0.6)),
                }}/>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CTA overlay */}
      <Sprite start={6.2} end={10}>
        {({ progress }) => {
          const e = Easing.easeOutBack(Math.min(1, progress * 2))
          return (
            <div style={{
              position: 'absolute',
              left: 64, right: 64, bottom: 96,
              opacity: e,
              transform: `scale(${0.92 + 0.08 * e})`,
            }}>
              <div style={{
                background: theme.accent,
                color: T.navy,
                padding: '36px 44px',
                borderRadius: 32,
                fontFamily: FD,
                fontWeight: 900,
                fontSize: 64,
                lineHeight: 0.95,
                letterSpacing: '-0.04em',
                textAlign: 'center',
              }}>
                Reservar por WhatsApp.<br/>Eso es todo.
              </div>
              <div style={{
                marginTop: 18,
                fontFamily: FM,
                fontSize: 20,
                letterSpacing: '0.12em',
                color: theme.inkSoft,
                textTransform: 'uppercase',
                textAlign: 'center',
              }}>
                {cta || 'Conocé más en el link'} →
              </div>
            </div>
          )
        }}
      </Sprite>
    </div>
  )
}

// ── Scene 2: Plus Bloom ───────────────────────────────────────────────────
function PlusBloomScene({ dark, cta, phrase }: { dark: boolean; cta: string; phrase: string }) {
  const t = useTime()
  const theme = getTheme(dark)

  const plusScale = interpolate([0, 1.2, 8.0, 10], [0, 1, 1, 1.15], Easing.easeOutBack)(t)
  const plusRot   = interpolate([0, 1.2], [-20, 0], Easing.easeOutCubic)(t)

  const phraseOpacity = interpolate([2.2, 3.0], [0, 1], Easing.easeOutCubic)(t)
  const phraseY       = interpolate([2.2, 3.0], [30, 0], Easing.easeOutCubic)(t)

  const ctaOpacity = interpolate([6.5, 7.2], [0, 1], Easing.easeOutCubic)(t)
  const ctaY       = interpolate([6.5, 7.2], [20, 0], Easing.easeOutCubic)(t)

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: theme.bg, overflow: 'hidden' }}>
      {/* Logo */}
      <div style={{ position: 'absolute', left: 64, top: 64 }}>
        <Logo dark={dark} size={40}/>
      </div>

      {/* Big plus */}
      <div style={{
        position: 'absolute',
        left: '50%', top: '40%',
        transform: `translate(-50%, -50%) scale(${plusScale}) rotate(${plusRot}deg)`,
      }}>
        <BigPlus size={520} color={theme.accent}/>
      </div>

      {/* Phrase */}
      <div style={{
        position: 'absolute',
        left: 64, right: 64, bottom: 320,
        opacity: phraseOpacity,
        transform: `translateY(${phraseY}px)`,
        fontFamily: FD,
        fontWeight: 900,
        fontSize: 96,
        lineHeight: 0.96,
        letterSpacing: '-0.04em',
        color: theme.ink,
        textAlign: 'center',
      }}>
        {phrase}
      </div>

      {/* CTA */}
      <div style={{
        position: 'absolute',
        left: 64, right: 64, bottom: 120,
        opacity: ctaOpacity,
        transform: `translateY(${ctaY}px)`,
        display: 'flex', justifyContent: 'center',
      }}>
        <div style={{
          background: theme.accent,
          color: T.navy,
          padding: '24px 40px',
          borderRadius: 100,
          fontFamily: FD,
          fontWeight: 800,
          fontSize: 34,
          letterSpacing: '-0.02em',
          display: 'flex', alignItems: 'center', gap: 18,
        }}>
          {cta || 'Conocé más en el link'}
          <span style={{ fontSize: 30 }}>→</span>
        </div>
      </div>
    </div>
  )
}

// ── Scene 3: Typing Reveal ────────────────────────────────────────────────
function TypingRevealScene({ dark, cta, text, text2 }: { dark: boolean; cta: string; text: string; text2: string }) {
  const t = useTime()
  const theme = getTheme(dark)

  const typeProgress = interpolate([0.4, 2.8], [0, text.length], Easing.linear)(t)
  const typedText    = text.slice(0, Math.floor(typeProgress))

  const type2Progress = interpolate([4.2, 6.0], [0, text2.length], Easing.linear)(t)
  const typedText2    = text2.slice(0, Math.floor(type2Progress))

  const caretOn = Math.floor(t * 2) % 2 === 0

  const ctaOpacity = interpolate([7.2, 8.0], [0, 1], Easing.easeOutCubic)(t)

  const bgPlusRot = t * 15

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: theme.bg, overflow: 'hidden' }}>
      {/* Background plus */}
      <div style={{
        position: 'absolute',
        right: -140, top: -140,
        opacity: 0.10,
        transform: `rotate(${bgPlusRot}deg)`,
      }}>
        <BigPlus size={680} color={theme.accent}/>
      </div>

      {/* Logo */}
      <div style={{ position: 'absolute', left: 64, top: 64 }}>
        <Logo dark={dark} size={40}/>
      </div>

      {/* Cursor block */}
      <div style={{ position: 'absolute', left: 64, right: 64, top: 240 }}>
        <div style={{
          fontFamily: FM,
          fontSize: 22,
          letterSpacing: '0.14em',
          color: theme.inkMute,
          textTransform: 'uppercase',
          marginBottom: 30,
        }}>
          $ reser+
        </div>
        <div style={{
          fontFamily: FD,
          fontWeight: 900,
          fontSize: 168,
          lineHeight: 1.0,
          letterSpacing: '-0.05em',
          color: theme.ink,
          minHeight: 180,
        }}>
          {t < 4.0 ? typedText : text}
          {t < 3.0 && caretOn && <span style={{ color: theme.accent }}>|</span>}
        </div>
        <div style={{
          fontFamily: FD,
          fontWeight: 900,
          fontSize: 168,
          lineHeight: 1.0,
          letterSpacing: '-0.05em',
          color: theme.accent,
          minHeight: 180,
        }}>
          {t >= 4.2 ? typedText2 : ''}
          {t >= 4.2 && t < 6.5 && caretOn && <span>|</span>}
        </div>
      </div>

      {/* CTA */}
      <div style={{
        position: 'absolute',
        left: 64, right: 64, bottom: 120,
        opacity: ctaOpacity,
        fontFamily: FM,
        fontSize: 24,
        letterSpacing: '0.14em',
        color: theme.inkSoft,
        textTransform: 'uppercase',
      }}>
        → {cta || 'Conocé más en el link'}
      </div>
    </div>
  )
}

// ── Scene 4: Before/After Wipe ────────────────────────────────────────────
function BeforeAfterScene({ dark, cta, b = 'El caos', a = 'Reser+' }: { dark: boolean; cta: string; b?: string; a?: string }) {
  const t = useTime()
  const theme = getTheme(dark)

  const wipe     = interpolate([3.5, 5.0], [0, 100], Easing.easeInOutCubic)(t)
  const beforeOp = interpolate([0.3, 1.0, 3.5, 4.0], [0, 1, 1, 0], Easing.easeOutCubic)(t)
  const afterOp  = interpolate([4.5, 5.2], [0, 1], Easing.easeOutCubic)(t)
  const ctaOp    = interpolate([7.5, 8.2], [0, 1], Easing.easeOutCubic)(t)

  const chaoticItems = ['📞', '📋', '❓', '⚠️', '🔄']

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* BEFORE panel */}
      <div style={{
        position: 'absolute', inset: 0,
        background: dark ? T.navyDeep : '#EFE8D8',
        opacity: beforeOp,
      }}>
        <div style={{
          position: 'absolute', left: 64, top: 120,
          fontFamily: FM,
          fontSize: 22,
          letterSpacing: '0.18em',
          color: 'rgba(200,60,60,0.9)',
          textTransform: 'uppercase',
          fontWeight: 600,
        }}>
          ANTES
        </div>
        <div style={{
          position: 'absolute',
          left: 64, right: 64, top: '40%',
          transform: 'translateY(-50%)',
          fontFamily: FD,
          fontWeight: 900,
          fontSize: 200,
          lineHeight: 0.9,
          letterSpacing: '-0.05em',
          color: theme.ink,
          textDecoration: 'line-through',
          textDecorationColor: 'rgba(200,60,60,0.8)',
          textDecorationThickness: '10px',
          textAlign: 'center',
        }}>
          {b}
        </div>
        {/* Chaotic floating elements */}
        {chaoticItems.map((ch, i) => {
          const x = 150 + (i * 170) + Math.sin(t * 2 + i) * 20
          const y = 900 + Math.cos(t * 1.5 + i) * 20
          const rot = Math.sin(t * 1.2 + i) * 15
          return (
            <div key={i} style={{
              position: 'absolute',
              left: x, top: y,
              fontSize: 64,
              opacity: 0.5,
              transform: `rotate(${rot}deg)`,
            }}>
              {ch}
            </div>
          )
        })}
      </div>

      {/* AFTER panel */}
      <div style={{
        position: 'absolute', inset: 0,
        background: theme.accent,
        clipPath: `inset(0 ${100 - wipe}% 0 0)`,
        opacity: afterOp || 1,
      }}>
        <div style={{
          position: 'absolute', left: 64, top: 120,
          fontFamily: FM,
          fontSize: 22,
          letterSpacing: '0.18em',
          color: T.navy,
          textTransform: 'uppercase',
          fontWeight: 700,
          opacity: afterOp,
        }}>
          CON RESER+
        </div>
        <div style={{
          position: 'absolute',
          left: 64, right: 64, top: '40%',
          transform: 'translateY(-50%)',
          fontFamily: FD,
          fontWeight: 900,
          fontSize: 240,
          lineHeight: 0.9,
          letterSpacing: '-0.05em',
          color: T.navy,
          textAlign: 'center',
          opacity: afterOp,
        }}>
          {a}
        </div>
        <div style={{
          position: 'absolute',
          left: 0, right: 0, bottom: 120,
          textAlign: 'center',
          fontFamily: FD,
          fontWeight: 700,
          fontSize: 48,
          color: T.navy,
          opacity: ctaOp,
          letterSpacing: '-0.02em',
        }}>
          {cta || 'Conocé más en el link'} →
        </div>
      </div>
    </div>
  )
}

// ── VideoScene dispatcher ─────────────────────────────────────────────────
export function VideoScene({ scriptId, dark, cta }: { scriptId: string; dark: boolean; cta?: string }) {
  switch (scriptId) {
    case 'chat-demo-padel':    return <ChatDemoScene    dark={dark} cta={cta ?? ''} sport="pádel"    hook="Sábado 10am?"/>
    case 'chat-demo-basquet':  return <ChatDemoScene    dark={dark} cta={cta ?? ''} sport="básquet"  hook="Cancha básquet jueves 20hs?"/>
    case 'plus-bloom':         return <PlusBloomScene   dark={dark} cta={cta ?? ''} phrase="El + que te faltaba."/>
    case 'plus-bloom-2':       return <PlusBloomScene   dark={dark} cta={cta ?? ''} phrase="Reser, pero con un +"/>
    case 'plus-bloom-3':       return <PlusBloomScene   dark={dark} cta={cta ?? ''} phrase="Reser + vos."/>
    case 'typing-reveal':      return <TypingRevealScene dark={dark} cta={cta ?? ''} text="Reservar." text2="Listo."/>
    case 'typing-reveal-2':    return <TypingRevealScene dark={dark} cta={cta ?? ''} text="Lo escribís." text2="Ya está."/>
    case 'before-after-10s':   return <BeforeAfterScene  dark={dark} cta={cta ?? ''}/>
    case 'before-after-10s-2': return <BeforeAfterScene  dark={dark} cta={cta ?? ''} b="Planillas" a="Un chat"/>
    default: return null
  }
}

// ── VideoPreview — main export ────────────────────────────────────────────
const V_W = 1080
const V_H = 1350

export function VideoPreview({ scriptId, dark, width, cta }: {
  scriptId?: string
  dark: boolean
  width: number
  cta?: string
}) {
  const scale  = width / V_W
  const height = V_H * scale

  return (
    <div style={{ width, height, position: 'relative', overflow: 'hidden', background: dark ? T.navy : T.cream, borderRadius: 4 }}>
      <div style={{ width: V_W, height: V_H, transform: `scale(${scale})`, transformOrigin: 'top left', position: 'absolute', top: 0, left: 0, overflow: 'hidden' }}>
        {scriptId ? (
          <MiniStage duration={10}>
            <VideoScene scriptId={scriptId} dark={dark} cta={cta}/>
          </MiniStage>
        ) : (
          <div style={{ width: V_W, height: V_H, display: 'flex', alignItems: 'center', justifyContent: 'center', background: dark ? T.navy : T.cream, flexDirection: 'column', gap: 20 }}>
            <div style={{ fontSize: 80, opacity: 0.3 }}>▶</div>
            <div style={{ fontFamily: FM, fontSize: 24, letterSpacing: '0.16em', color: dark ? 'rgba(245,242,235,0.4)' : 'rgba(15,30,61,0.4)', textTransform: 'uppercase' }}>VIDEO 10s</div>
          </div>
        )}
      </div>
    </div>
  )
}
