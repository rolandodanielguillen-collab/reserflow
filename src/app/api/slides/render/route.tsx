import { ImageResponse } from 'next/og'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    return renderImage(data)
  } catch (err) {
    return NextResponse.json({ error: 'Render error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams
  const data = {
    type: (p.get('type') ?? 'content') as 'cover' | 'content' | 'cta',
    headline: p.get('headline') ?? '',
    body: p.get('body') ?? '',
    emoji: p.get('emoji') ?? '⚡',
    index: parseInt(p.get('index') ?? '0'),
    total: parseInt(p.get('total') ?? '1'),
    brandName: p.get('brand') ?? 'RESER+',
    primaryColor: p.get('primary') ?? '#1E40AF',
    accentColor: p.get('accent') ?? '#10B981',
    secondaryColor: p.get('secondary') ?? '#F59E0B',
    coverImgUrl: p.get('coverImg') ?? '',
  }
  return renderImage(data)
}

function renderImage(data: any) {
  // Mapeo de campos del carrusel (big -> headline, sub -> body, kind -> type)
  const headline = data.headline || data.big || ''
  const body = data.body || data.sub || ''
  const type = (data.type || data.kind || 'content') as 'cover' | 'content' | 'cta'
  const emoji = data.emoji || '⚡'
  const index = typeof data.index === 'number' ? data.index : 0
  const total = typeof data.total === 'number' ? data.total : 1
  const brandName = data.brandName || data.brand || 'RESER+'
  const primaryColor = data.primaryColor || data.primary || '#1E40AF'
  const accentColor = data.accentColor || data.accent || '#10B981'
  const secondaryColor = data.secondaryColor || data.secondary || '#F59E0B'
  const coverImgUrl = data.coverImgUrl || data.coverImg || ''

  const NAVY = '#0B1A2C'
  const NAVY2 = '#112340'
  const TEAL = accentColor
  const WHITE = '#FFFFFF'

  try {
    if (type === 'cover') {
      return new ImageResponse(
        (
          <div
            style={{
              width: 1080,
              height: 1080,
              display: 'flex',
              flexDirection: 'column',
              background: NAVY,
              position: 'relative',
              overflow: 'hidden',
              fontFamily: 'sans-serif',
            }}
          >
            {/* Background cover image if available */}
            {coverImgUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverImgUrl}
                  alt=""
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    opacity: 0.35,
                    display: 'flex',
                  }}
                />
              </>
            ) : null}

            {/* Dark overlay gradient */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: `linear-gradient(160deg, ${NAVY}ee 0%, ${NAVY}99 50%, ${NAVY}dd 100%)`,
                display: 'flex',
              }}
            />

            {/* Left accent bar */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: 10,
                background: TEAL,
                display: 'flex',
              }}
            />

            {/* Top right decorative circle */}
            <div
              style={{
                position: 'absolute',
                top: -120,
                right: -120,
                width: 500,
                height: 500,
                borderRadius: '50%',
                background: `${TEAL}18`,
                display: 'flex',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: -60,
                right: -60,
                width: 300,
                height: 300,
                borderRadius: '50%',
                background: `${TEAL}12`,
                display: 'flex',
              }}
            />

            {/* Content */}
            <div
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '72px 80px 72px 96px',
                height: '100%',
              }}
            >
              {/* Top row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {/* Brand */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 12,
                      background: TEAL,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: WHITE,
                      fontWeight: 900,
                      fontSize: 22,
                    }}
                  >
                    {brandName.slice(0, 2).toUpperCase()}
                  </div>
                  <span style={{ color: WHITE, fontWeight: 800, fontSize: 36, letterSpacing: '0.05em' }}>
                    {brandName.toUpperCase()}
                  </span>
                </div>
                {/* Counter */}
                <span
                  style={{
                    color: 'rgba(255,255,255,0.4)',
                    fontSize: 26,
                    fontWeight: 500,
                  }}
                >
                  {index + 1} / {total}
                </span>
              </div>

              {/* Center — headline + emoji */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {/* Big emoji */}
                <div style={{ fontSize: 120, marginBottom: 32, display: 'flex' }}>{emoji}</div>

                {/* Headline */}
                <div
                  style={{
                    color: WHITE,
                    fontSize: 96,
                    fontWeight: 900,
                    lineHeight: 1.05,
                    letterSpacing: '-0.025em',
                    maxWidth: 880,
                  }}
                >
                  {headline}
                </div>

                {/* Body */}
                {body && (
                  <div
                    style={{
                      color: 'rgba(255,255,255,0.65)',
                      fontSize: 40,
                      fontWeight: 400,
                      lineHeight: 1.5,
                      marginTop: 28,
                      maxWidth: 800,
                    }}
                  >
                    {body}
                  </div>
                )}
              </div>

              {/* Bottom — teal bar + tagline */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div
                  style={{
                    width: '100%',
                    height: 3,
                    background: `linear-gradient(90deg, ${TEAL} 0%, transparent 100%)`,
                    display: 'flex',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: TEAL, fontSize: 30, fontWeight: 600, letterSpacing: '0.1em' }}>
                    Rápido · Fácil · Directo
                  </span>
                  <span
                    style={{
                      color: 'rgba(255,255,255,0.3)',
                      fontSize: 22,
                      background: 'rgba(255,255,255,0.08)',
                      padding: '8px 20px',
                      borderRadius: 100,
                      display: 'flex',
                    }}
                  >
                    PORTADA
                  </span>
                </div>
              </div>
            </div>
          </div>
        ),
        { width: 1080, height: 1080 }
      )
    }

    if (type === 'cta') {
      return new ImageResponse(
        (
          <div
            style={{
              width: 1080,
              height: 1080,
              display: 'flex',
              flexDirection: 'column',
              background: `linear-gradient(145deg, ${TEAL} 0%, #059669 60%, #047857 100%)`,
              position: 'relative',
              overflow: 'hidden',
              fontFamily: 'sans-serif',
            }}
          >
            {/* Decorative circles */}
            <div
              style={{
                position: 'absolute',
                top: -100,
                right: -100,
                width: 500,
                height: 500,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)',
                display: 'flex',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: -80,
                left: -80,
                width: 360,
                height: 360,
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.12)',
                display: 'flex',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: 100,
                right: 60,
                width: 200,
                height: 200,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.08)',
                display: 'flex',
              }}
            />

            {/* Content */}
            <div
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '72px 80px',
                height: '100%',
              }}
            >
              {/* Top: brand */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 12,
                      background: 'rgba(255,255,255,0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: WHITE,
                      fontWeight: 900,
                      fontSize: 22,
                    }}
                  >
                    {brandName.slice(0, 2).toUpperCase()}
                  </div>
                  <span style={{ color: WHITE, fontWeight: 800, fontSize: 36, letterSpacing: '0.05em' }}>
                    {brandName.toUpperCase()}
                  </span>
                </div>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 26 }}>{index + 1} / {total}</span>
              </div>

              {/* Center */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                <div style={{ fontSize: 80, display: 'flex' }}>{emoji}</div>
                <div
                  style={{
                    color: WHITE,
                    fontSize: 88,
                    fontWeight: 900,
                    lineHeight: 1.05,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {headline}
                </div>
                {body && (
                  <div
                    style={{
                      color: 'rgba(255,255,255,0.85)',
                      fontSize: 40,
                      fontWeight: 400,
                      lineHeight: 1.5,
                      maxWidth: 820,
                    }}
                  >
                    {body}
                  </div>
                )}
              </div>

              {/* CTA button-like */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 20,
                }}
              >
                <div
                  style={{
                    background: WHITE,
                    color: '#047857',
                    fontWeight: 800,
                    fontSize: 32,
                    padding: '20px 48px',
                    borderRadius: 100,
                    display: 'flex',
                    letterSpacing: '0.02em',
                  }}
                >
                  Reservá ahora →
                </div>
                <span
                  style={{
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: 28,
                    fontStyle: 'italic',
                  }}
                >
                  Tu cancha, tu tiempo
                </span>
              </div>
            </div>
          </div>
        ),
        { width: 1080, height: 1080 }
      )
    }

    // CONTENT slide
    const isEven = index % 2 === 0
    return new ImageResponse(
      (
        <div
          style={{
            width: 1080,
            height: 1080,
            display: 'flex',
            flexDirection: 'column',
            background: isEven ? NAVY : NAVY2,
            position: 'relative',
            overflow: 'hidden',
            fontFamily: 'sans-serif',
          }}
        >
          {/* Top accent bar */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 8,
              background: `linear-gradient(90deg, ${TEAL} 0%, ${primaryColor} 100%)`,
              display: 'flex',
            }}
          />

          {/* Bottom-right decorative circle */}
          <div
            style={{
              position: 'absolute',
              bottom: -100,
              right: -100,
              width: 400,
              height: 400,
              borderRadius: '50%',
              background: `${TEAL}10`,
              display: 'flex',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 200,
              right: -60,
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: `${primaryColor}0D`,
              display: 'flex',
            }}
          />

          {/* Content */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '80px 80px 72px 80px',
              height: '100%',
            }}
          >
            {/* Top row: badge + emoji */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  background: `${TEAL}22`,
                  border: `2px solid ${TEAL}44`,
                  borderRadius: 100,
                  padding: '10px 24px',
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: TEAL,
                    display: 'flex',
                  }}
                />
                <span style={{ color: TEAL, fontSize: 24, fontWeight: 700, letterSpacing: '0.08em' }}>
                  {index + 1} / {total}
                </span>
              </div>
              <span style={{ fontSize: 80 }}>{emoji}</span>
            </div>

            {/* Center: headline + body */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              {/* Headline */}
              <div
                style={{
                  color: WHITE,
                  fontSize: 80,
                  fontWeight: 900,
                  lineHeight: 1.08,
                  letterSpacing: '-0.02em',
                  maxWidth: 920,
                }}
              >
                {headline}
              </div>

              {/* Divider */}
              <div
                style={{
                  width: 80,
                  height: 4,
                  borderRadius: 2,
                  background: TEAL,
                  display: 'flex',
                }}
              />

              {/* Body */}
              {body && (
                <div
                  style={{
                    color: 'rgba(255,255,255,0.68)',
                    fontSize: 42,
                    fontWeight: 400,
                    lineHeight: 1.55,
                    maxWidth: 880,
                  }}
                >
                  {body}
                </div>
              )}
            </div>

            {/* Footer: brand */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: TEAL,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: WHITE,
                    fontWeight: 900,
                    fontSize: 18,
                  }}
                >
                  {brandName.slice(0, 2).toUpperCase()}
                </div>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 28, fontWeight: 600, letterSpacing: '0.06em' }}>
                  {brandName.toUpperCase()}
                </span>
              </div>
              <span
                style={{
                  color: 'rgba(255,255,255,0.2)',
                  fontSize: 22,
                  background: 'rgba(255,255,255,0.05)',
                  padding: '8px 20px',
                  borderRadius: 100,
                  display: 'flex',
                }}
              >
                CONTENIDO
              </span>
            </div>
          </div>
        </div>
      ),
      { width: 1080, height: 1080 }
    )
  } catch {
    return NextResponse.json({ error: 'Render error' }, { status: 500 })
  }
}
