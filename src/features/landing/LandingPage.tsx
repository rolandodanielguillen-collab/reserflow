'use client'

import { useState, useEffect, useCallback } from 'react'
import { I18N, type Lang, type LandingDict } from './i18n'

const THEME_KEY = 'reserplus.theme'
const LANG_KEY  = 'reserplus.lang'
const SUPPORTED: Lang[] = ['es', 'en', 'pt']

function detectTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  const s = localStorage.getItem(THEME_KEY)
  if (s === 'dark' || s === 'light') return s
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}
function detectLang(): Lang {
  if (typeof window === 'undefined') return 'es'
  const s = localStorage.getItem(LANG_KEY) as Lang | null
  if (s && SUPPORTED.includes(s)) return s
  const nav = (navigator.language || 'es').slice(0, 2).toLowerCase() as Lang
  return SUPPORTED.includes(nav) ? nav : 'es'
}

// ── Feature icons ──────────────────────────────────────────────────────────
const FEAT_ICONS = [
  <svg key="0" viewBox="0 0 24 24" fill="none"><rect x="10" y="3" width="4" height="18" rx="1" fill="currentColor"/><rect x="3" y="10" width="18" height="4" rx="1" fill="currentColor"/></svg>,
  <svg key="1" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  <svg key="2" viewBox="0 0 24 24" fill="none"><path d="M9 11V6a3 3 0 016 0v5m-3 10l-5-5 2-2 3 2V7a1 1 0 112 0v7l4 2-2 5H9z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>,
  <svg key="3" viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M3 10h18M7 15h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  <svg key="4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" stroke="currentColor" strokeWidth="2"/></svg>,
  <svg key="5" viewBox="0 0 24 24" fill="none"><path d="M6 16V11a6 6 0 1112 0v5l1.5 2h-15L6 16zm4 3a2 2 0 004 0" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>,
]

// ── Logo component ─────────────────────────────────────────────────────────
function LogoSVG() {
  return (
    <svg className="lp-logo-plus" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="10" y="2" width="4" height="20" rx="1"/>
      <rect x="2" y="10" width="20" height="4" rx="1"/>
    </svg>
  )
}

// ── WhatsApp Flow Phone ────────────────────────────────────────────────────
function FlowPhone({ flow, step }: { flow: LandingDict['steps']['flow']; step: number }) {
  const screens = [
    { title: flow.s1_title, head: flow.s1_head, items: flow.s1_items, selected: 0, cta: flow.s1_cta, progress: 33, disabled: false },
    { title: flow.s2_title, head: flow.s2_head, items: flow.s2_items, selected: 0, cta: flow.s2_cta, progress: 66, disabled: false },
    { title: flow.s3_title, head: flow.s3_head, items: flow.s3_items, selected: -1, cta: flow.s3_cta, progress: 100, disabled: true },
  ]
  const s = screens[step]
  return (
    <div className="lp-flow-phone">
      <div className="lp-flow-screen">
        <div className="lp-flow-status"><span>9:41</span><span>●●●● 4G</span></div>
        <div className="lp-flow-topbar">
          <span className="lp-flow-avatar">
            <svg viewBox="0 0 24 24" width="14" height="14">
              <rect x="10" y="3" width="4" height="18" rx="1"/>
              <rect x="3" y="10" width="18" height="4" rx="1"/>
            </svg>
          </span>
          <span className="lp-flow-topbar-name">{flow.bot}</span>
        </div>
        <div className="lp-flow-sheet">
          <div className="lp-flow-grab"/>
          <div className="lp-flow-head">
            <span className="lp-flow-back">{flow.back}</span>
            <span className="lp-flow-title-txt">{s.title}</span>
            <span style={{ width: 28 }}/>
          </div>
          <div className="lp-flow-progress"><span style={{ width: `${s.progress}%` }}/></div>
          <div className="lp-flow-headline">{s.head}</div>
          <div className="lp-flow-list">
            {s.items.map((item, idx) => (
              <div key={idx} className={`lp-flow-item${idx === s.selected ? ' selected' : ''}`}>
                <span>{item}</span>
                {idx === s.selected && <span className="lp-flow-check">✓</span>}
              </div>
            ))}
          </div>
          <div className="lp-flow-footer"/>
          <div className={`lp-flow-cta${s.disabled ? ' disabled' : ''}`}>{s.cta}</div>
          <div className="lp-flow-admin">{flow.admin}</div>
        </div>
      </div>
    </div>
  )
}

// ── NAV ────────────────────────────────────────────────────────────────────
function NavBar({ d, lang, theme, onToggleTheme, onSwitchLang }: {
  d: LandingDict; lang: Lang; theme: string
  onToggleTheme: () => void; onSwitchLang: (l: Lang) => void
}) {
  return (
    <header className="lp-nav">
      <div className="lp-wrap lp-nav-inner">
        <a href="#" className="lp-logo" aria-label="Reser+">
          <span>Reser</span><LogoSVG />
        </a>
        <nav className="lp-nav-links" aria-label="Primary">
          <a href="#how">{d.nav.how}</a>
          <a href="#features">{d.nav.features}</a>
          <a href="#sports">{d.nav.sports}</a>
          <a href="#videos">{d.nav.videos}</a>
          <a href="#contact">{d.nav.contact}</a>
        </nav>
        <div className="lp-nav-right">
          <div className="lp-lang" role="tablist" aria-label="Language">
            {SUPPORTED.map(l => (
              <button key={l} aria-selected={lang === l ? 'true' : 'false'} onClick={() => onSwitchLang(l)}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <button className="lp-theme-toggle" onClick={onToggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                <path d="M12 3v1m0 16v1m8-9h1M3 12H2m15.5-6.5.7-.7M5.8 18.2l-.7.7M18.2 18.2l.7.7M5.8 5.8l-.7-.7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
          <a href="#cta" className="lp-btn lp-btn-primary">{d.nav.cta}</a>
        </div>
      </div>
    </header>
  )
}

// ── HERO ───────────────────────────────────────────────────────────────────
function HeroSection({ d }: { d: LandingDict }) {
  return (
    <section className="lp-hero">
      <div className="lp-texture" aria-hidden="true"/>
      <div className="lp-wrap lp-hero-inner">
        <div className="lp-hero-left">
          <p className="lp-eyebrow">{d.hero.eyebrow}</p>
          <h1 className="lp-xl lp-hero-title">
            <span>{d.hero.title_a}</span><br/>
            <strong>{d.hero.title_b}</strong><br/>
            <span>{d.hero.title_c}</span>
          </h1>
          <p className="lp-lead">{d.hero.lead}</p>
          <div className="lp-hero-ctas">
            <a href="#cta" className="lp-btn lp-btn-primary">
              <span>{d.hero.primary}</span>
              <span className="lp-btn-arrow">→</span>
            </a>
            <a href="#how" className="lp-btn lp-btn-ghost">{d.hero.secondary}</a>
          </div>
          <div className="lp-hero-meta">
            <div><strong>{d.hero.meta1_n}</strong><span>{d.hero.meta1_l}</span></div>
            <div><strong>{d.hero.meta2_n}</strong><span>{d.hero.meta2_l}</span></div>
            <div><strong>{d.hero.meta3_n}</strong><span>{d.hero.meta3_l}</span></div>
          </div>
        </div>

        <div className="lp-hero-right">
          <div className="lp-hero-plus" aria-hidden="true">
            <svg viewBox="0 0 200 200">
              <rect x="80" y="10" width="40" height="180" rx="4"/>
              <rect x="10" y="80" width="180" height="40" rx="4"/>
            </svg>
          </div>
          <div className="lp-phone">
            <div className="lp-phone-screen">
              <div className="lp-phone-status">
                <span>9:41</span><span>●●●● 4G</span>
              </div>
              <div className="lp-phone-header">
                <span className="lp-phone-avatar">
                  <svg viewBox="0 0 24 24" width="16" height="16">
                    <rect x="10" y="3" width="4" height="18" rx="1"/>
                    <rect x="3" y="10" width="18" height="4" rx="1"/>
                  </svg>
                </span>
                <div>
                  <div className="lp-phone-name">{d.chat.contact}</div>
                  <div className="lp-phone-status-txt">{d.chat.online}</div>
                </div>
              </div>
              <div className="lp-phone-body">
                <div className="lp-msg in d1">{d.chat.in1}</div>
                <div className="lp-msg out d2">{d.chat.out1}</div>
                <div className="lp-msg in d3">{d.chat.in2}</div>
                <div className="lp-msg out d4">{d.chat.out2}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── BEFORE / AFTER ─────────────────────────────────────────────────────────
function CompareSection({ d }: { d: LandingDict }) {
  return (
    <section className="lp-section">
      <div className="lp-wrap">
        <div className="lp-section-head">
          <div>
            <p className="lp-eyebrow">{d.compare.before_eb} / {d.compare.after_eb}</p>
            <h2 className="lp-lg" dangerouslySetInnerHTML={{ __html: d.compare.title.replace(/\n/g,'<br/>') }}/>
          </div>
          <p className="lp-lead">{d.compare.lead}</p>
        </div>
        <div className="lp-compare">
          <div className="lp-ccard before">
            <p className="lp-eyebrow">{d.compare.before_eb}</p>
            <h3 className="lp-md" style={{ marginTop: 10 }}>{d.compare.before_t}</h3>
            <ul className="lp-clist">
              {d.compare.before.map((t, i) => (
                <li key={i}><span className="lp-dot">×</span>{t}</li>
              ))}
            </ul>
          </div>
          <div className="lp-ccard after">
            <p className="lp-eyebrow">{d.compare.after_eb}</p>
            <h3 className="lp-md" style={{ marginTop: 10 }}>{d.compare.after_t}</h3>
            <ul className="lp-clist">
              {d.compare.after.map((t, i) => (
                <li key={i}><span className="lp-dot">+</span>{t}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── HOW IT WORKS ───────────────────────────────────────────────────────────
function HowItWorksSection({ d, activeStep, onStepChange }: {
  d: LandingDict; activeStep: number; onStepChange: (i: number) => void
}) {
  const steps = [
    { title: d.steps.step1_t, body: d.steps.step1_p },
    { title: d.steps.step2_t, body: d.steps.step2_p },
    { title: d.steps.step3_t, body: d.steps.step3_p },
  ]
  return (
    <section id="how" className="lp-section lp-section-alt">
      <div className="lp-wrap">
        <div className="lp-section-head">
          <div>
            <p className="lp-eyebrow">{d.steps.eyebrow}</p>
            <h2 className="lp-lg" dangerouslySetInnerHTML={{ __html: d.steps.title.replace(/\n/g,'<br/>') }}/>
          </div>
          <p className="lp-lead">{d.steps.lead}</p>
        </div>
        <div className="lp-steps">
          <div className="lp-steps-nav" role="tablist">
            {d.steps.nav.map((label, i) => (
              <button key={i} aria-selected={activeStep === i ? 'true' : 'false'}
                onClick={() => onStepChange(i)}>
                <span className="lp-step-num">{String(i + 1).padStart(2, '0')}</span>
                <span className="lp-step-title">{label}</span>
              </button>
            ))}
          </div>
          <div className="lp-steps-stage">
            {steps.map((s, i) => (
              <div key={i} className="lp-step-panel" data-active={activeStep === i ? 'true' : 'false'}>
                <div className="lp-step-copy">
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </div>
                <FlowPhone flow={d.steps.flow} step={i} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ── FEATURES ───────────────────────────────────────────────────────────────
function FeaturesSection({ d }: { d: LandingDict }) {
  return (
    <section id="features" className="lp-section">
      <div className="lp-wrap">
        <div className="lp-section-head">
          <div>
            <p className="lp-eyebrow">{d.features.eyebrow}</p>
            <h2 className="lp-lg" dangerouslySetInnerHTML={{ __html: d.features.title.replace(/\n/g,'<br/>') }}/>
          </div>
          <p className="lp-lead">{d.features.lead}</p>
        </div>
        <div className="lp-features">
          {d.features.f.map(([title, body], i) => (
            <article key={i} className="lp-feature">
              <span className="lp-feat-icon">{FEAT_ICONS[i]}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── SPORTS ─────────────────────────────────────────────────────────────────
function SportsSection({ d }: { d: LandingDict }) {
  return (
    <section id="sports" className="lp-section lp-section-alt">
      <div className="lp-wrap">
        <div className="lp-section-head">
          <div>
            <p className="lp-eyebrow">{d.sports.eyebrow}</p>
            <h2 className="lp-lg" dangerouslySetInnerHTML={{ __html: d.sports.title.replace(/\n/g,'<br/>') }}/>
          </div>
        </div>
        <div className="lp-sports">
          {d.sports.items.map(([name, meta], i) => (
            <div key={i} className="lp-sport">
              <span className="lp-sport-meta">{meta}</span>
              <h3 className="lp-sport-name">{name}</h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── VIDEOS ─────────────────────────────────────────────────────────────────
function VideosSection({ d }: { d: LandingDict }) {
  const placeholders = [
    { bg: 'linear-gradient(135deg, #0F1E3D, #17B095)', color: '#F5F2EB', label: 'Reservar Pádel' },
    { bg: 'linear-gradient(135deg, #17B095, #0E8F78)', color: '#0F1E3D', label: 'Fútbol 5\nen 3 toques' },
    { bg: 'linear-gradient(135deg, #0A1529, #1A2D52)', color: '#17B095', label: 'Quincho\nsin planilla' },
  ]
  return (
    <section id="videos" className="lp-section">
      <div className="lp-wrap">
        <div className="lp-section-head">
          <div>
            <p className="lp-eyebrow">{d.videos.eyebrow}</p>
            <h2 className="lp-lg" dangerouslySetInnerHTML={{ __html: d.videos.title.replace(/\n/g,'<br/>') }}/>
          </div>
          <p className="lp-lead">{d.videos.lead}</p>
        </div>
        <div className="lp-videos">
          {placeholders.map((p, i) => (
            <div key={i} className="lp-video-card"
              style={{ background: p.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: p.color }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--lp-font-mono)', fontSize: 11, letterSpacing: '.14em', opacity: .7 }}>VIDEO · 10s</div>
                <div style={{ fontFamily: 'var(--lp-font-display)', fontWeight: 800, fontSize: 32, letterSpacing: '-.03em', marginTop: 8, whiteSpace: 'pre-line' }}>{p.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── STATS ──────────────────────────────────────────────────────────────────
function StatsSection({ d }: { d: LandingDict }) {
  return (
    <section className="lp-section" style={{ paddingBottom: 100 }}>
      <div className="lp-wrap">
        <div className="lp-stats">
          {d.stats.items.map(([n, label, sub], i) => (
            <div key={i}>
              <div className="lp-stat-n">{n}</div>
              <div className="lp-stat-label">{label}</div>
              <div className="lp-stat-sub">{sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── TESTIMONIAL ────────────────────────────────────────────────────────────
function TestimonialSection({ d }: { d: LandingDict }) {
  return (
    <section className="lp-section" style={{ paddingTop: 40, paddingBottom: 100 }}>
      <div className="lp-wrap">
        <div className="lp-testimonial">
          <p className="lp-testimonial-q">{d.testimonial.quote}</p>
          <p className="lp-testimonial-attr">{d.testimonial.attrib}</p>
        </div>
      </div>
    </section>
  )
}

// ── CTA BAND ───────────────────────────────────────────────────────────────
function CTASection({ d }: { d: LandingDict }) {
  return (
    <section id="cta" className="lp-section" style={{ paddingTop: 0, paddingBottom: 100 }}>
      <div className="lp-wrap">
        <div className="lp-cta-band">
          <p className="lp-eyebrow" style={{ color: 'rgba(15,30,61,0.55)' }}>{d.cta.eyebrow}</p>
          <h2 className="lp-xl" style={{ marginTop: 12 }}
            dangerouslySetInnerHTML={{ __html: d.cta.title.replace(/\n/g,'<br/>') }}/>
          <p>{d.cta.lead}</p>
          <a href="#" className="lp-btn">
            <span>{d.cta.primary}</span>
            <span className="lp-btn-arrow">→</span>
          </a>
        </div>
      </div>
    </section>
  )
}

// ── FOOTER ─────────────────────────────────────────────────────────────────
function FooterSection({ d }: { d: LandingDict }) {
  const cols = [
    { title: d.footer.col1, items: d.footer.col1_items },
    { title: d.footer.col2, items: d.footer.col2_items },
    { title: d.footer.col3, items: d.footer.col3_items },
  ]
  return (
    <footer className="lp-footer" id="contact">
      <div className="lp-wrap">
        <div className="lp-footer-grid">
          <div className="lp-footer-brand">
            <a href="#" className="lp-logo"><span>Reser</span><LogoSVG/></a>
            <p>{d.footer.tagline}</p>
          </div>
          {cols.map((col, i) => (
            <div key={i} className="lp-footer-col">
              <h4>{col.title}</h4>
              <ul>
                {col.items.map((item, j) => (
                  <li key={j}><a href="#">{item}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="lp-footer-bot">
          <span>{d.footer.copy}</span>
          <span>{d.footer.madein}</span>
        </div>
      </div>
    </footer>
  )
}

// ── ROOT COMPONENT ─────────────────────────────────────────────────────────
export function LandingPage() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [lang, setLang]   = useState<Lang>('es')
  const [activeStep, setActiveStep] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setTheme(detectTheme())
    setLang(detectLang())
    setMounted(true)
  }, [])

  // Autoplay steps
  useEffect(() => {
    const t = setInterval(() => setActiveStep(p => (p + 1) % 3), 4200)
    return () => clearInterval(t)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark'
      localStorage.setItem(THEME_KEY, next)
      return next
    })
  }, [])

  const switchLang = useCallback((l: Lang) => {
    setLang(l)
    localStorage.setItem(LANG_KEY, l)
  }, [])

  const handleStepChange = useCallback((i: number) => {
    setActiveStep(i)
  }, [])

  if (!mounted) {
    return <div className="landing-page" style={{ minHeight: '100vh' }}/>
  }

  const d = I18N[lang]

  return (
    <div className="landing-page" data-theme={theme} lang={lang}>
      <NavBar d={d} lang={lang} theme={theme} onToggleTheme={toggleTheme} onSwitchLang={switchLang} />
      <HeroSection d={d} />
      <CompareSection d={d} />
      <HowItWorksSection d={d} activeStep={activeStep} onStepChange={handleStepChange} />
      <FeaturesSection d={d} />
      <SportsSection d={d} />
      <VideosSection d={d} />
      <StatsSection d={d} />
      <TestimonialSection d={d} />
      <CTASection d={d} />
      <FooterSection d={d} />
    </div>
  )
}
