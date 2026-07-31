'use client'

// Plantillas de flyer de evento — port de padelpost-ai (Slide1/2/3 Remotion).
// Renderizan 1080x1350 con paleta propia (no siguen el dark/light del Studio).
// Funcionan igual en preview de browser y en Remotion Still (mismo componente).

import React from 'react'
import { Img, getRemotionEnvironment } from 'remotion'
import { loadFont as loadBebasNeue, fontFamily as bebasNeue } from '@remotion/google-fonts/BebasNeue'
import { loadFont as loadMontserrat, fontFamily as montserrat } from '@remotion/google-fonts/Montserrat'
import type { EventFlyerData, PaletteTokens } from '../types'

// En render de Remotion usa <Img> (espera la carga con delayRender);
// en el browser usa <img> normal. Sin esto, el still sale sin la foto.
function EvImg({ src, style }: { src: string; style: React.CSSProperties }) {
  if (getRemotionEnvironment().isRendering) return <Img src={src} style={style}/>
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" style={style}/>
}

loadBebasNeue('normal', { weights: ['400'], subsets: ['latin'] })
loadMontserrat('normal', { weights: ['300', '400', '600', '700', '800'], subsets: ['latin'] })

const MONTHS_ES = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGOS','SEPT','OCT','NOV','DIC']

function formatDateRange(startDate?: string, endDate?: string): string {
  if (!startDate) return ''
  const end = endDate || startDate
  const [, sm, sd] = startDate.split('-')
  const [, em, ed] = end.split('-')
  if (!sm || !sd || !em || !ed) return ''
  const d1 = String(parseInt(sd)).padStart(2, '0')
  const d2 = String(parseInt(ed)).padStart(2, '0')
  const m1 = MONTHS_ES[parseInt(sm) - 1]
  const m2 = MONTHS_ES[parseInt(em) - 1]
  if (startDate === end) return `${d1} DE ${m2}.`
  if (sm === em) return `DEL ${d1} AL ${d2} DE ${m2}.`
  return `DEL ${d1} ${m1} AL ${d2} DE ${m2}.`
}

const NOISE = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E")`

type SlideBaseProps = { data: EventFlyerData; palette: PaletteTokens }

function Frame({ bw, bc }: { bw: number; bc: string }) {
  return <div style={{ position: 'absolute', inset: 20, border: `${bw}px solid ${bc}`, borderRadius: 18, pointerEvents: 'none' }}/>
}

function Header({ data, txt, num }: { data: EventFlyerData; txt: string; num: string }) {
  const yr = data.year || String(new Date().getFullYear())
  return (
    <div style={{ position: 'absolute', top: 36, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 52px' }}>
      <span style={{ color: txt, fontSize: 20, fontFamily: montserrat, fontWeight: 400, opacity: 0.85 }}>({data.clientNumber || num}) {data.headerBrand || 'padel sys'}</span>
      <span style={{ color: txt, fontSize: 20, fontFamily: montserrat, fontWeight: 400, opacity: 0.85 }}>{yr}</span>
    </div>
  )
}

function Footer({ data, txt, bottom }: { data: EventFlyerData; txt: string; bottom?: number }) {
  return (
    <div style={{ position: 'absolute', bottom: bottom ?? 22, left: 52, right: 52, display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ color: txt, fontSize: 13, fontFamily: montserrat, fontWeight: 300, letterSpacing: 3, opacity: 0.55 }}>{data.footerLeft || 'SISTEMA DE GESTIÓN'}</span>
      <span style={{ color: txt, fontSize: 13, fontFamily: montserrat, fontWeight: 300, letterSpacing: 3, opacity: 0.55 }}>{data.footerRight || 'WWW.PADELSYS.COM'}</span>
    </div>
  )
}

function BrandLogo({ url, color, size }: { url?: string; color: string; size: number }) {
  if (!url) return null
  return (
    <>
      {/* Fuerza delayRender hasta que el logo esté cacheado (la CSS mask no espera sola) */}
      {getRemotionEnvironment().isRendering && (
        <Img src={url} style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }}/>
      )}
      <div style={{
        width: size, height: size * 1.19,
        WebkitMaskImage: `url(${url})`, maskImage: `url(${url})`,
        WebkitMaskSize: 'contain', maskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center', maskPosition: 'center',
        backgroundColor: color,
      }}/>
    </>
  )
}

// ── Slide 1: Hook principal — imagen jugador + datos del torneo ───────────
export function EventSlide1({ data, palette }: SlideBaseProps) {
  const { background: bg, primary: neon, accent: acc, text: txt } = palette
  const bw = data.borderWidth || 2
  const dateStr = formatDateRange(data.startDate, data.endDate)

  return (
    <div style={{ position: 'relative', width: 1080, height: 1350, overflow: 'hidden', backgroundColor: bg }}>
      <div style={{ position: 'absolute', top: -100, right: -100, width: 600, height: 600, borderRadius: '50%', background: neon, opacity: 0.1, filter: 'blur(140px)' }}/>

      {data.playerImageUrl && (
        <EvImg src={data.playerImageUrl} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 680, objectFit: 'cover', objectPosition: 'center top' }}/>
      )}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 800, background: `linear-gradient(to bottom, transparent 50%, ${bg} 85%)` }}/>

      <Frame bw={bw} bc={neon}/>

      {/* Header con teléfono al centro (variante slide 1) */}
      <div style={{ position: 'absolute', top: 36, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 52px' }}>
        <span style={{ color: txt, fontSize: 20, fontFamily: montserrat, fontWeight: 400, opacity: 0.85 }}>({data.clientNumber || '01'}) {data.headerBrand || 'padel sys'}</span>
        <span style={{ color: txt, fontSize: 20, fontFamily: montserrat, fontWeight: 700 }}>{data.phone || ''}</span>
        <span style={{ color: txt, fontSize: 20, fontFamily: montserrat, fontWeight: 400, opacity: 0.85 }}>{data.year || new Date().getFullYear()}</span>
      </div>

      <div style={{ position: 'absolute', top: 420, left: 52 }}>
        <BrandLogo url={data.logoUrl} color={neon} size={104}/>
      </div>

      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 52px 36px 52px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ color: neon, fontFamily: bebasNeue, fontSize: 100, lineHeight: 1, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 24 }}>{data.clubName}</div>
        <div style={{ color: txt, fontFamily: montserrat, fontSize: 36, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, lineHeight: 1.1, marginTop: 24 }}>{data.tournamentName}</div>
        <div style={{ height: 12 }}/>
        <div style={{ color: txt, fontFamily: montserrat, fontSize: 30, fontWeight: 700, textTransform: 'uppercase' }}>{dateStr}</div>
        {data.categoriesSummary && (
          <div style={{ color: acc, fontFamily: montserrat, fontSize: 21, fontWeight: 300, letterSpacing: 2, textTransform: 'uppercase' }}>CATEGORIAS:&nbsp; {data.categoriesSummary}</div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill={neon} xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
          <span style={{ color: txt, fontSize: 52, fontFamily: bebasNeue, letterSpacing: 3, textTransform: 'uppercase' }}>{data.city}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTop: `${bw}px solid ${neon}` }}>
          <span style={{ color: txt, fontSize: 14, fontFamily: montserrat, fontWeight: 300, letterSpacing: 3, opacity: 0.85 }}>{data.footerLeft || 'SISTEMA DE GESTIÓN'}</span>
          <span style={{ color: txt, fontSize: 14, fontFamily: montserrat, fontWeight: 300, letterSpacing: 3, opacity: 0.85 }}>{data.footerRight || 'WWW.PADELSYS.COM'}</span>
        </div>
      </div>
    </div>
  )
}

// ── Slide 2: Premios & Categorías ─────────────────────────────────────────
export function EventSlide2({ data, palette }: SlideBaseProps) {
  const { background: bg, primary: neon, accent: acc, text: txt } = palette
  const bw = data.borderWidth || 2
  const prizeMenLines = data.prizesMen ? data.prizesMen.split('\n').filter(Boolean) : []
  const prizeWomenLines = data.prizesWomen ? data.prizesWomen.split('\n').filter(Boolean) : []

  return (
    <div style={{ position: 'relative', width: 1080, height: 1350, overflow: 'hidden', backgroundColor: bg, fontFamily: montserrat }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: NOISE, opacity: 0.4 }}/>
      <div style={{ position: 'absolute', top: 180, right: -120, width: 520, height: 520, borderRadius: '50%', background: neon, opacity: 0.12, filter: 'blur(130px)' }}/>
      <div style={{ position: 'absolute', bottom: 80, left: -120, width: 420, height: 420, borderRadius: '50%', background: neon, opacity: 0.10, filter: 'blur(110px)' }}/>
      <Frame bw={bw} bc={neon}/>

      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: '36px 52px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: txt, fontSize: 20, fontFamily: montserrat, fontWeight: 400, opacity: 0.85 }}>({data.clientNumber || '02'}) {data.headerBrand || 'padel sys'}</span>
          <span style={{ color: txt, fontSize: 20, fontFamily: montserrat, fontWeight: 400, opacity: 0.85 }}>{data.year || String(new Date().getFullYear())}</span>
        </div>

        <div style={{ textAlign: 'right', marginTop: 8 }}>
          <div style={{ color: neon, fontSize: 52, fontFamily: bebasNeue, letterSpacing: 3, lineHeight: 1 }}>PREMIOS &amp;</div>
          <div style={{ color: txt, fontSize: 130, fontFamily: bebasNeue, letterSpacing: 2, lineHeight: 0.88 }}>CATEGORIAS</div>
        </div>

        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingTop: 24, paddingBottom: 16 }}>
          {data.categoriesMen && (
            <div>
              <div style={{ color: txt, fontSize: 44, fontFamily: bebasNeue, letterSpacing: 2, marginBottom: 6 }}>CABALLEROS</div>
              <div style={{ color: acc, fontSize: 26, fontFamily: montserrat, fontWeight: 600, letterSpacing: 1 }}>{data.categoriesMen}</div>
            </div>
          )}
          {data.categoriesWomen && (
            <div>
              <div style={{ color: txt, fontSize: 44, fontFamily: bebasNeue, letterSpacing: 2, marginBottom: 6 }}>DAMAS</div>
              <div style={{ color: acc, fontSize: 26, fontFamily: montserrat, fontWeight: 600, letterSpacing: 1 }}>{data.categoriesWomen}</div>
            </div>
          )}
          {(prizeMenLines.length > 0 || prizeWomenLines.length > 0) && (
            <div>
              <div style={{ color: txt, fontSize: 44, fontFamily: bebasNeue, letterSpacing: 2, marginBottom: 18 }}>PREMIOS CAMPEONES</div>
              <div style={{ display: 'flex', gap: 40 }}>
                {prizeMenLines.length > 0 && (
                  <div style={{ flex: 1 }}>
                    <div style={{ color: neon, fontSize: 34, fontFamily: bebasNeue, letterSpacing: 2, marginBottom: 14 }}>CABALLEROS.</div>
                    {prizeMenLines.map((line, i) => (
                      <div key={i} style={{ color: txt, fontSize: 22, fontFamily: montserrat, fontWeight: 400, marginBottom: 8, lineHeight: 1.3 }}>{line}</div>
                    ))}
                  </div>
                )}
                {prizeWomenLines.length > 0 && (
                  <div style={{ flex: 1 }}>
                    <div style={{ color: neon, fontSize: 34, fontFamily: bebasNeue, letterSpacing: 2, marginBottom: 14 }}>DAMAS.</div>
                    {prizeWomenLines.map((line, i) => (
                      <div key={i} style={{ color: txt, fontSize: 22, fontFamily: montserrat, fontWeight: 400, marginBottom: 8, lineHeight: 1.3 }}>{line}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {data.conditions && (
          <div style={{ backgroundColor: neon, borderRadius: 8, padding: '12px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <span style={{ color: bg, fontSize: 15, fontFamily: montserrat, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', opacity: 0.8 }}>{data.prizesLabel || 'PREMIOS SUJETO A'}</span>
            <span style={{ color: bg, fontSize: 24, fontFamily: montserrat, fontWeight: 800, letterSpacing: 1 }}>{data.conditions}</span>
          </div>
        )}

        {data.price && (
          <div style={{ marginTop: 12, backgroundColor: neon, borderRadius: 12, padding: '22px 30px', border: `${bw}px solid ${neon}`, textAlign: 'center' }}>
            <div style={{ color: bg, fontSize: 34, fontFamily: bebasNeue, letterSpacing: 3, marginBottom: data.footerText ? 6 : 0 }}>
              INSCRIPCIONES:&nbsp;<span style={{ color: bg }}>{data.price}</span>
            </div>
            {data.footerText && (
              <div style={{ color: bg, fontSize: 20, fontFamily: montserrat, fontWeight: 500, letterSpacing: 0.5, opacity: 0.85 }}>{data.footerText}</div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
          <span style={{ color: txt, fontSize: 13, fontFamily: montserrat, fontWeight: 300, letterSpacing: 3, opacity: 0.55 }}>{data.footerLeft || 'SISTEMA DE GESTIÓN'}</span>
          <span style={{ color: txt, fontSize: 13, fontFamily: montserrat, fontWeight: 300, letterSpacing: 3, opacity: 0.55 }}>{data.footerRight || 'WWW.PADELSYS.COM'}</span>
        </div>
      </div>
    </div>
  )
}

// ── Slide 3: Cierre de marca — logo + WhatsApp + redes ───────────────────
export function EventSlide3({ data, palette }: SlideBaseProps) {
  const { background: bg, primary: neon, text: txt } = palette
  const bw = data.borderWidth || 2
  const handle = data.igHandle || '@padelsys'

  const socialIcons: Array<{ path: string }> = [
    { path: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z' },
    { path: 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z' },
    { path: 'M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.16 8.16 0 004.77 1.52V6.76a4.85 4.85 0 01-1-.07z' },
  ]

  return (
    <div style={{ position: 'relative', width: 1080, height: 1350, overflow: 'hidden', backgroundColor: bg }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: NOISE, opacity: 0.6 }}/>
      <div style={{ position: 'absolute', top: '10%', left: '-20%', width: 700, height: 500, borderRadius: '50%', transform: 'rotate(-30deg)', background: neon, opacity: 0.15, filter: 'blur(120px)' }}/>
      <div style={{ position: 'absolute', top: '25%', right: '-15%', width: 600, height: 500, borderRadius: '50%', transform: 'rotate(20deg)', background: neon, opacity: 0.10, filter: 'blur(120px)' }}/>
      <div style={{ position: 'absolute', bottom: '10%', left: '-10%', width: 500, height: 400, borderRadius: '50%', transform: 'rotate(20deg)', background: neon, opacity: 0.12, filter: 'blur(100px)' }}/>
      <Frame bw={bw} bc={neon}/>
      <Header data={data} txt={txt} num="03"/>

      <div style={{ position: 'absolute', top: 80, left: '50%', transform: 'translateX(-50%)' }}>
        <BrandLogo url={data.logoUrl} color={txt} size={400}/>
      </div>

      <div style={{ position: 'absolute', top: 510, left: '10%', right: '10%', height: bw, backgroundColor: neon }}/>

      <div style={{ position: 'absolute', top: 540, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ color: neon, fontSize: 22, fontFamily: montserrat, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase' }}>INFO WHATSAPP</div>
        <div style={{ color: txt, fontSize: 80, fontFamily: bebasNeue, letterSpacing: 6, lineHeight: 1 }}>{data.phone || ''}</div>
      </div>

      <div style={{ position: 'absolute', top: 680, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ color: neon, fontSize: 72, fontFamily: bebasNeue, letterSpacing: 3, lineHeight: 1, marginTop: 48, textAlign: 'center' }}>¡INSCRIBITE AHORA!</div>
        <div style={{ color: txt, fontSize: 24, fontFamily: montserrat, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', opacity: 0.7, marginTop: 8, textAlign: 'center' }}>CUPOS LIMITADOS</div>

        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 48, marginTop: 40 }}>
          {socialIcons.map((icon, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 88, height: 88, borderRadius: '50%', backgroundColor: neon, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="44" height="44" viewBox="0 0 24 24"><path fill="white" d={icon.path}/></svg>
              </div>
              <span style={{ color: txt, fontSize: 20, fontFamily: montserrat, fontWeight: 600, opacity: 0.8 }}>{handle}</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 48, height: 2, width: '60%', backgroundColor: neon, opacity: 0.3 }}/>
      </div>

      <Footer data={data} txt={txt}/>
    </div>
  )
}

export function EventSlide({ slide, data, palette }: { slide: 1 | 2 | 3; data: EventFlyerData; palette: PaletteTokens }) {
  if (slide === 1) return <EventSlide1 data={data} palette={palette}/>
  if (slide === 2) return <EventSlide2 data={data} palette={palette}/>
  return <EventSlide3 data={data} palette={palette}/>
}
