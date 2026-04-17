'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import type { SlideOutput } from '@/features/generation/types'
import type { BrandConfig } from '@/features/generation/components/GeneratorSection'
import { regenerateSlide } from '@/features/generation/services/regenerate-slide'
import { generateCoverImage } from '@/features/generation/services/generate-cover-image'
import { uploadCoverImage } from '@/features/generation/services/upload-cover-image'

interface RemotionSlidePlayerProps {
  slides: SlideOutput[]
  brand: BrandConfig
  carouselId: string
  coverImageUrl?: string
  topic?: string
}

// Visual type determines what renders in the image area of each slide
type VisualType = 'photo' | 'whatsapp-chat' | 'app-comparison' | 'clock-24h' | 'frustration' | 'cta-gradient'

function getVisualType(slide: SlideOutput): VisualType {
  const v = slide.visual_suggestion.toLowerCase()
  if (/whatsapp-chat/.test(v)) return 'whatsapp-chat'
  if (/app-comparison/.test(v)) return 'app-comparison'
  if (/24\/7|3:00 am|reloj digital|siempre disponible|nunca duerme/.test(v)) return 'clock-24h'
  if (/frustrad|llamadas perdidas|sin respuesta|reloj en pared/.test(v)) return 'frustration'
  if (slide.type === 'cta') return 'cta-gradient'
  return 'photo'
}

const NAVY = '#0B1A2C'

export function RemotionSlidePlayer({
  slides: initialSlides,
  brand,
  carouselId,
  coverImageUrl: initialCoverImageUrl = '',
  topic = '',
}: RemotionSlidePlayerProps) {
  const [slides, setSlides] = useState<SlideOutput[]>(initialSlides)
  const [current, setCurrent] = useState(0)
  const [visible, setVisible] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [slideImages, setSlideImages] = useState<Record<number, string>>(() => {
    const init: Record<number, string> = {}
    if (initialCoverImageUrl) init[0] = initialCoverImageUrl
    return init
  })
  const [imgState, setImgState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [genAllState, setGenAllState] = useState<'idle' | 'loading'>('idle')
  const [genAllProgress, setGenAllProgress] = useState(0)
  const [imgError, setImgError] = useState('')
  const [regenState, setRegenState] = useState<'idle' | 'loading'>('idle')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const slide = slides[current]
  const visualType = slide ? getVisualType(slide) : 'photo'
  const isPhotoSlide = visualType === 'photo'
  const currentImage = slideImages[current] ?? ''
  const handle = brand.brandName.toLowerCase().replace(/\s+/g, '_')

  function goTo(i: number) {
    setVisible(false)
    setTimeout(() => { setCurrent(i); setVisible(true) }, 160)
  }

  useEffect(() => {
    if (!isPlaying) return
    const t = setInterval(() => {
      setCurrent(prev => {
        if (prev + 1 >= slides.length) { setIsPlaying(false); return 0 }
        setVisible(false)
        setTimeout(() => setVisible(true), 160)
        return prev + 1
      })
    }, 3200)
    return () => clearInterval(t)
  }, [isPlaying, slides.length])

  async function handleGenImage() {
    if (!slide) return
    setImgState('loading')
    setImgError('')
    const res = await generateCoverImage(carouselId, slide.visual_suggestion, topic, current === 0)
    if ('error' in res) { setImgError(res.error); setImgState('error') }
    else { setSlideImages(prev => ({ ...prev, [current]: res.url })); setImgState('idle') }
  }

  async function handleGenAll() {
    setGenAllState('loading')
    setGenAllProgress(0)
    let done = 0
    for (let i = 0; i < slides.length; i++) {
      const s = slides[i]!
      if (getVisualType(s) === 'photo') {
        const res = await generateCoverImage(carouselId, s.visual_suggestion, topic, i === 0)
        if ('url' in res) setSlideImages(prev => ({ ...prev, [i]: res.url }))
      }
      done++
      setGenAllProgress(done)
    }
    setGenAllState('idle')
  }

  async function handleUploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImgState('loading')
    setImgError('')
    const fd = new FormData()
    fd.append('file', file)
    const res = await uploadCoverImage(carouselId, fd)
    if ('error' in res) { setImgError(res.error); setImgState('error') }
    else { setSlideImages(prev => ({ ...prev, [current]: res.url })); setImgState('idle') }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleRegen() {
    setRegenState('loading')
    const res = await regenerateSlide(carouselId, current, { topic, tone: 'motivador', totalSlides: slides.length })
    if (!('error' in res)) {
      setSlides(prev => { const u = [...prev]; u[current] = res.slide; return u })
      setVisible(false); setTimeout(() => setVisible(true), 160)
    }
    setRegenState('idle')
  }

  if (!slide) return null

  const busy = imgState === 'loading' || genAllState === 'loading'
  const photoSlideCount = slides.filter(s => getVisualType(s) === 'photo').length

  return (
    <div className="space-y-4">

      {/* ── Phone mockup ── */}
      <div className="relative mx-auto" style={{ width: 300 }}>
        <div
          className="relative overflow-hidden"
          style={{
            borderRadius: 44,
            background: '#111',
            border: '7px solid #1c1c1e',
            boxShadow: '0 40px 80px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.06)',
            height: 560,
          }}
        >
          {/* IG Header */}
          <div className="bg-white border-b border-gray-100 px-4 flex items-center justify-between" style={{ height: 52 }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full p-[2px] flex-shrink-0"
                style={{ background: 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)' }}>
                <div className="w-full h-full bg-white rounded-full p-[1.5px] overflow-hidden">
                  {brand.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={brand.logoUrl} alt={brand.brandName} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <div className="w-full h-full rounded-full flex items-center justify-center text-[9px] font-black text-white"
                      style={{ background: brand.primaryColor }}>
                      {brand.brandName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
              <span className="text-xs font-bold text-gray-900 truncate">{handle}</span>
            </div>
            <div className="flex gap-1 items-center">
              {slides.map((_, i) => (
                <button key={i} onClick={() => goTo(i)}
                  className="rounded-full transition-all duration-300"
                  style={{ width: i === current ? 16 : 5, height: 5, background: i === current ? brand.accentColor : '#E5E7EB' }} />
              ))}
            </div>
          </div>

          {/* Slide area */}
          <div className="flex flex-col transition-all duration-200"
            style={{ height: 456, opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(8px)' }}>

            {/* Visual area — top 58% */}
            <div className="relative overflow-hidden flex-shrink-0" style={{ height: 264 }}>

              {/* Render by visual type */}
              {visualType === 'photo' && (
                <PhotoBackground image={currentImage} navy={NAVY} />
              )}
              {visualType === 'whatsapp-chat' && (
                <WhatsAppBackground accentColor={brand.accentColor} navy={NAVY} />
              )}
              {visualType === 'app-comparison' && (
                <AppComparisonBackground accentColor={brand.accentColor} navy={NAVY} />
              )}
              {visualType === 'clock-24h' && (
                <Clock24hBackground accentColor={brand.accentColor} navy={NAVY} />
              )}
              {visualType === 'frustration' && (
                <FrustrationBackground accentColor={brand.accentColor} />
              )}
              {visualType === 'cta-gradient' && (
                <CtaBackground primaryColor={brand.primaryColor} accentColor={brand.accentColor} />
              )}

              {/* Brand badge — siempre visible */}
              <div className="absolute top-3 left-3 z-10">
                {brand.logoUrl ? (
                  <div className="rounded-lg overflow-hidden bg-white shadow-sm" style={{ width: 48, height: 48, padding: 3 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={brand.logoUrl} alt={brand.brandName} className="w-full h-full object-contain rounded-md" />
                  </div>
                ) : (
                  <div className="rounded-lg px-2 py-1 bg-white shadow-sm">
                    <span className="font-black text-[11px]" style={{ color: brand.primaryColor }}>
                      {brand.brandName}
                    </span>
                  </div>
                )}
              </div>

              {/* Emoji */}
              <span className="absolute top-3 right-3 z-10" style={{ fontSize: 24, lineHeight: 1 }}>
                {slide.emoji}
              </span>

              {/* Nav arrows */}
              <button onClick={() => goTo(Math.max(0, current - 1))} disabled={current === 0}
                className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center z-10 transition-opacity disabled:opacity-0"
                style={{ background: 'rgba(0,0,0,0.4)' }}>
                <span className="text-white font-bold" style={{ fontSize: 16, lineHeight: 1 }}>‹</span>
              </button>
              <button onClick={() => goTo(Math.min(slides.length - 1, current + 1))} disabled={current === slides.length - 1}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center z-10 transition-opacity disabled:opacity-0"
                style={{ background: 'rgba(0,0,0,0.4)' }}>
                <span className="text-white font-bold" style={{ fontSize: 16, lineHeight: 1 }}>›</span>
              </button>
            </div>

            {/* Text area — bottom 42% */}
            <div className="flex-1 bg-white px-4 flex flex-col justify-between"
              style={{ paddingTop: 12, paddingBottom: 12 }}>
              <div className="space-y-1.5">
                <h3 className="font-black text-gray-900 leading-tight"
                  style={{ fontSize: 15, letterSpacing: '-0.02em' }}>
                  {slide.headline}
                </h3>
                {slide.body && (
                  <p className="text-gray-500 leading-snug" style={{ fontSize: 11 }}>
                    {slide.body}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1.5 pt-1">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: brand.accentColor }} />
                <span className="font-bold uppercase tracking-wider"
                  style={{ fontSize: 9, color: brand.accentColor, letterSpacing: '0.1em' }}>
                  Reservá por WhatsApp →
                </span>
              </div>
            </div>
          </div>

          {/* IG Footer */}
          <div className="bg-white border-t border-gray-100 px-4 flex items-center justify-between" style={{ height: 52 }}>
            <div className="flex gap-3 text-gray-800 text-lg">
              <span>♡</span><span style={{ fontSize: 15 }}>💬</span><span style={{ fontSize: 15 }}>↗</span>
            </div>
            <button onClick={() => setIsPlaying(p => !p)}
              className="text-[10px] font-bold px-3 py-1 rounded-full"
              style={{ background: `${brand.primaryColor}18`, color: brand.primaryColor }}>
              {isPlaying ? '⏸ Pausa' : '▶ Auto'}
            </button>
            <span className="text-lg">🔖</span>
          </div>
        </div>

        {/* Glow */}
        <div className="absolute -inset-8 -z-10 rounded-[64px] opacity-25"
          style={{ background: `radial-gradient(ellipse at center, ${brand.accentColor}, transparent 70%)`, filter: 'blur(28px)' }} />
      </div>

      {/* ── Actions ── */}
      <div className="mx-auto space-y-2" style={{ maxWidth: 300 }}>

        {/* Generate all — solo slides foto */}
        <button onClick={handleGenAll} disabled={busy}
          className="w-full py-2.5 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-2 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ background: `linear-gradient(135deg, ${brand.primaryColor}, ${brand.accentColor})` }}>
          {genAllState === 'loading'
            ? <><Spinner color="white" /> Generando {genAllProgress}/{slides.length}...</>
            : `✦ Generar imágenes IA (${photoSlideCount} slides)`}
        </button>

        {/* Per-slide actions — solo si es foto */}
        <div className="flex gap-1.5">
          <button onClick={handleRegen} disabled={regenState === 'loading'}
            className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors">
            {regenState === 'loading' ? <><Spinner /> Regen...</> : '↺ Regen copy'}
          </button>

          {isPhotoSlide && (
            <>
              <button onClick={handleGenImage} disabled={busy}
                className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl border text-xs font-medium transition-colors disabled:opacity-50"
                style={{ borderColor: brand.accentColor, color: brand.accentColor, background: `${brand.accentColor}10` }}>
                {imgState === 'loading' ? <><Spinner color={brand.accentColor} /> IA...</> : currentImage ? '✦ Nueva IA' : '✦ Generar IA'}
              </button>
              <button onClick={() => fileInputRef.current?.click()} disabled={busy}
                className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl border text-xs font-medium transition-colors disabled:opacity-50"
                style={{ borderColor: brand.primaryColor, color: brand.primaryColor, background: `${brand.primaryColor}10` }}>
                {imgState === 'loading' ? <><Spinner color={brand.primaryColor} /> Sub...</> : currentImage ? '↑ Cambiar' : '↑ Subir'}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUploadPhoto} />
            </>
          )}

          {!isPhotoSlide && (
            <div className="flex-1 flex items-center justify-center py-2 rounded-xl border border-dashed border-gray-200 text-xs text-gray-400">
              Gráfico automático
            </div>
          )}
        </div>

        {imgError && <p className="text-xs text-red-600 text-center">{imgError}</p>}

        {/* Visual type indicator */}
        <div className="rounded-xl bg-gray-50 border border-gray-100 p-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{ background: isPhotoSlide ? `${brand.accentColor}20` : `${brand.primaryColor}15`, color: isPhotoSlide ? brand.accentColor : brand.primaryColor }}>
              {isPhotoSlide ? '📷 Foto IA' : '🎨 Gráfico'}
            </span>
          </div>
          <p className="text-gray-500 leading-relaxed" style={{ fontSize: 10 }}>
            {slide.visual_suggestion}
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Visual Backgrounds ─────────────────────────────────────────────────────────

function PhotoBackground({ image, navy }: { image: string; navy: string }) {
  return (
    <>
      <div className="absolute inset-0" style={{ background: navy }} />
      {image && <Image src={image} alt="" fill className="object-cover" style={{ opacity: 0.82 }} unoptimized priority />}
      <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, rgba(0,0,0,0.1) 0%, ${navy}bb 100%)` }} />
    </>
  )
}

function WhatsAppBackground({ accentColor, navy }: { accentColor: string; navy: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center px-4 pb-2"
      style={{ background: `linear-gradient(160deg, ${navy} 0%, #0d2137 100%)` }}>
      <div className="w-full rounded-xl overflow-hidden shadow-xl">
        <div className="flex items-center gap-2 px-3 py-2" style={{ background: '#075E54' }}>
          <div className="w-5 h-5 rounded-full flex items-center justify-center font-black text-white"
            style={{ background: accentColor, fontSize: 8 }}>R+</div>
          <div>
            <p className="text-white font-semibold leading-none" style={{ fontSize: 9 }}>Reser+</p>
            <p className="text-white/60" style={{ fontSize: 7 }}>en línea</p>
          </div>
        </div>
        <div className="px-3 py-2 space-y-2" style={{ background: '#ECE5DD' }}>
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-tl-none px-2.5 py-1.5 shadow-sm" style={{ background: 'white', maxWidth: '80%' }}>
              <p className="text-gray-800 leading-tight" style={{ fontSize: 9 }}>Hola! Quiero pádel mañana 19hs 🎾</p>
              <p className="text-gray-400 text-right" style={{ fontSize: 7 }}>9:41</p>
            </div>
          </div>
          <div className="flex justify-end">
            <div className="rounded-2xl rounded-tr-none px-2.5 py-1.5 shadow-sm" style={{ background: '#DCF8C6', maxWidth: '85%' }}>
              <p className="text-gray-800 font-medium leading-tight" style={{ fontSize: 9 }}>✅ ¡Reservado! Cancha 2 — mañana 19:00 hs</p>
              <p className="text-gray-400 text-right" style={{ fontSize: 7 }}>9:41 ✓✓</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function AppComparisonBackground({ accentColor, navy }: { accentColor: string; navy: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center px-5"
      style={{ background: `linear-gradient(160deg, ${navy} 0%, #0d2137 100%)` }}>
      <div className="flex gap-4 w-full">
        {/* NO */}
        <div className="flex-1 rounded-2xl p-4 flex flex-col items-center gap-2"
          style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)' }}>
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.08)', fontSize: 24 }}>📲</div>
            <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center font-black text-white text-xs"
              style={{ background: '#EF4444' }}>✕</div>
          </div>
          <p className="text-red-400 font-bold text-center leading-tight" style={{ fontSize: 9 }}>App nueva<br/>a descargar</p>
        </div>
        {/* VS */}
        <div className="flex items-center">
          <span className="text-white/30 font-black text-sm">VS</span>
        </div>
        {/* SÍ */}
        <div className="flex-1 rounded-2xl p-4 flex flex-col items-center gap-2"
          style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}44` }}>
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.08)', fontSize: 24 }}>💬</div>
            <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center font-black text-white text-xs"
              style={{ background: accentColor }}>✓</div>
          </div>
          <p className="font-bold text-center leading-tight" style={{ fontSize: 9, color: accentColor }}>WhatsApp<br/>ya lo tenés</p>
        </div>
      </div>
    </div>
  )
}

function Clock24hBackground({ accentColor, navy }: { accentColor: string; navy: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3"
      style={{ background: `linear-gradient(160deg, ${navy} 0%, #071422 100%)` }}>
      {/* Big 24/7 */}
      <div className="font-black text-white leading-none" style={{ fontSize: 72, letterSpacing: '-4px' }}>
        24<span style={{ color: accentColor }}>/</span>7
      </div>
      {/* Icon row */}
      <div className="flex gap-3">
        {(['⚡', '✅', '🔄'] as const).map((icon, i) => (
          <div key={i} className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}40`, fontSize: 16 }}>
            {icon}
          </div>
        ))}
      </div>
      <p className="font-bold tracking-widest" style={{ color: accentColor, fontSize: 8, letterSpacing: '0.2em' }}>
        SIEMPRE DISPONIBLE
      </p>
      {/* Decorative rings */}
      <div className="absolute top-4 right-4 rounded-full"
        style={{ width: 48, height: 48, border: `1px solid ${accentColor}20`, background: `${accentColor}08` }} />
      <div className="absolute bottom-6 left-4 rounded-full"
        style={{ width: 32, height: 32, border: `1px solid ${accentColor}15`, background: `${accentColor}05` }} />
    </div>
  )
}

function FrustrationBackground({ accentColor }: { accentColor: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3"
      style={{ background: 'linear-gradient(160deg, #1a0505, #2d1010)' }}>
      <div style={{ fontSize: 48 }}>😤</div>
      <div className="flex gap-2">
        {[0.3, 0.5, 0.8].map((op, i) => (
          <div key={i} className="relative flex items-center justify-center">
            <div className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: `rgba(239,68,68,${op * 0.15})`, border: `1px solid rgba(239,68,68,${op * 0.4})` }}>
              <span style={{ fontSize: 16 }}>📵</span>
            </div>
          </div>
        ))}
      </div>
      <p className="font-bold tracking-widest" style={{ color: '#f87171', fontSize: 8, letterSpacing: '0.2em' }}>
        SIN RESPUESTA
      </p>
      <div className="absolute top-4 right-5 rounded-full flex items-center justify-center"
        style={{ width: 36, height: 36, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 16 }}>
        🕐
      </div>
      {/* Keep accentColor in scope */}
      <div className="hidden" style={{ color: accentColor }} />
    </div>
  )
}

function CtaBackground({ primaryColor, accentColor }: { primaryColor: string; accentColor: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2"
      style={{ background: `linear-gradient(145deg, ${primaryColor}, ${accentColor})` }}>
      <div style={{ fontSize: 52 }}>🚀</div>
      <div className="flex gap-2">
        {(['⚡', '💬', '✅'] as const).map((icon, i) => (
          <div key={i} className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.15)', fontSize: 14 }}>
            {icon}
          </div>
        ))}
      </div>
      {/* Decorative */}
      <div className="absolute top-4 right-4 w-14 h-14 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }} />
      <div className="absolute bottom-6 left-4 w-8 h-8 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }} />
      <div className="absolute top-4 left-4 w-5 h-5 rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }} />
    </div>
  )
}

// ── Spinner ────────────────────────────────────────────────────────────────────

function Spinner({ color = 'currentColor' }: { color?: string }) {
  return (
    <svg className="animate-spin h-3 w-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" style={{ color }}>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
