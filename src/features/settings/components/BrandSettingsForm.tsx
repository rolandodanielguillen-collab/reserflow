'use client'

import { useState } from 'react'
import Image from 'next/image'
import { saveBrandSettings, type BrandSettingsValues } from '../services/brand-settings'
import { uploadLogoAndAnalyze } from '../services/analyze-logo'

interface BrandSettingsFormProps {
  initial: Partial<BrandSettingsValues & { logo_url?: string }> | null
}

export function BrandSettingsForm({ initial }: BrandSettingsFormProps) {
  const [values, setValues] = useState<BrandSettingsValues>({
    brand_name: initial?.brand_name ?? 'RESER+',
    brand_tagline: initial?.brand_tagline ?? '',
    primary_color: initial?.primary_color ?? '#1E40AF',
    secondary_color: initial?.secondary_color ?? '#F59E0B',
    accent_color: initial?.accent_color ?? '#10B981',
    brand_voice: initial?.brand_voice ?? 'Profesional, cercano, motivador',
    target_audience: initial?.target_audience ?? 'Deportistas y administradores de canchas',
    ycloud_api_key: initial?.ycloud_api_key ?? '',
    whatsapp_phone: initial?.whatsapp_phone ?? '',
    meta_access_token: initial?.meta_access_token ?? '',
    instagram_account_id: initial?.instagram_account_id ?? '',
    product_description: initial?.product_description ?? '',
  })
  const [logoUrl, setLogoUrl] = useState<string>(initial?.logo_url ?? '')
  const [analyzeState, setAnalyzeState] = useState<'idle' | 'uploading' | 'analyzing' | 'done' | 'error'>('idle')
  const [analyzeError, setAnalyzeError] = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveError, setSaveError] = useState('')

  function set<K extends keyof BrandSettingsValues>(key: K, value: BrandSettingsValues[K]) {
    setValues(v => ({ ...v, [key]: value }))
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setAnalyzeState('uploading')
    setAnalyzeError('')

    // Convertir a base64 en el cliente
    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    setAnalyzeState('analyzing')
    const result = await uploadLogoAndAnalyze(base64, file.type, file.name)

    if ('error' in result) {
      setAnalyzeError(result.error)
      setAnalyzeState('error')
      return
    }

    // Auto-aplicar colores y logo extraídos
    setValues(v => ({
      ...v,
      primary_color: result.data.primary_color,
      secondary_color: result.data.secondary_color,
      accent_color: result.data.accent_color,
      ...(result.data.brand_name ? { brand_name: result.data.brand_name } : {}),
    }))
    setLogoUrl(result.data.logo_url)
    setAnalyzeState('done')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaveStatus('saving')
    setSaveError('')
    const result = await saveBrandSettings({ ...values, logo_url: logoUrl } as BrandSettingsValues)
    if (result.error) {
      setSaveError(result.error)
      setSaveStatus('error')
    } else {
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2500)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">

      {/* Logo + Extracción de colores IA */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Logo de marca</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Sube tu logo y la IA extrae automáticamente los colores de tu marca.
          </p>
        </div>

        {/* Input real — display:none + htmlFor es el único patrón que abre el picker en todos los browsers */}
        <input
          id="logo-file-input"
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
          onChange={handleLogoUpload}
          disabled={analyzeState === 'uploading' || analyzeState === 'analyzing'}
          style={{ display: 'none' }}
        />

        <div className="flex items-start gap-6">
          {/* Preview logo */}
          <label
            htmlFor="logo-file-input"
            className={`flex-shrink-0 w-24 h-24 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer ${(analyzeState === 'uploading' || analyzeState === 'analyzing') ? 'pointer-events-none opacity-60' : ''}`}
          >
            {logoUrl ? (
              <Image src={logoUrl} alt="Logo" width={96} height={96} className="object-contain p-1" unoptimized />
            ) : (
              <div className="text-center p-2">
                <svg className="w-8 h-8 text-gray-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-[10px] text-gray-400 mt-1">Clic para subir</p>
              </div>
            )}
          </label>

          <div className="flex-1 space-y-3">
            <label
              htmlFor="logo-file-input"
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer ${(analyzeState === 'uploading' || analyzeState === 'analyzing') ? 'opacity-50 pointer-events-none' : ''}`}
            >
              {analyzeState === 'uploading' ? 'Subiendo...' :
               analyzeState === 'analyzing' ? '✦ Analizando colores...' :
               'Subir logo o imagen de marca'}
            </label>

            {analyzeState === 'analyzing' && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                GPT-4 Vision analizando tu marca...
              </div>
            )}

            {analyzeState === 'done' && (
              <div className="flex items-center gap-2 text-sm text-emerald-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Colores extraídos y aplicados automáticamente
              </div>
            )}

            {analyzeState === 'error' && (
              <p className="text-sm text-red-600">{analyzeError}</p>
            )}

            <p className="text-xs text-gray-400">PNG, JPG, WEBP o SVG · máx. 5 MB</p>
          </div>

          {/* Preview de colores extraídos */}
          <div className="flex flex-col gap-2 flex-shrink-0">
            {[
              { label: 'Primario', key: 'primary_color' as const },
              { label: 'Secundario', key: 'secondary_color' as const },
              { label: 'Acento', key: 'accent_color' as const },
            ].map(({ label, key }) => (
              <div key={key} className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-md border border-gray-200 shadow-sm"
                  style={{ backgroundColor: values[key] as string }}
                />
                <span className="text-xs text-gray-500">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Identidad de marca */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Identidad de marca</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nombre de marca *">
            <input type="text" value={values.brand_name} onChange={e => set('brand_name', e.target.value)} required className={INPUT} />
          </Field>
          <Field label="Tagline">
            <input type="text" value={values.brand_tagline ?? ''} onChange={e => set('brand_tagline', e.target.value)} placeholder="Tu slogan" className={INPUT} />
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {([
            { label: 'Color primario', key: 'primary_color' as const },
            { label: 'Color secundario', key: 'secondary_color' as const },
            { label: 'Color acento', key: 'accent_color' as const },
          ]).map(({ label, key }) => (
            <Field key={key} label={label}>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={values[key] as string}
                  onChange={e => set(key, e.target.value)}
                  className="h-9 w-12 rounded border border-gray-300 p-0.5 cursor-pointer"
                />
                <input
                  type="text"
                  value={values[key] as string}
                  onChange={e => set(key, e.target.value)}
                  className={INPUT}
                />
              </div>
            </Field>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Voz de marca">
            <input type="text" value={values.brand_voice ?? ''} onChange={e => set('brand_voice', e.target.value)} placeholder="Profesional, cercano, motivador" className={INPUT} />
          </Field>
          <Field label="Audiencia objetivo">
            <input type="text" value={values.target_audience ?? ''} onChange={e => set('target_audience', e.target.value)} placeholder="Deportistas y admins de canchas" className={INPUT} />
          </Field>
        </div>

        <Field label="Descripción del producto">
          <textarea
            value={values.product_description ?? ''}
            onChange={e => set('product_description', e.target.value)}
            rows={4}
            placeholder="Ej: Plataforma de reservas de canchas deportivas y amenities vía WhatsApp. Sin instalar apps. Rápida, fácil, directa. El usuario envía un mensaje y en segundos tiene su reserva confirmada."
            className={INPUT + ' resize-none'}
          />
          <p className="text-xs text-gray-400 mt-1">
            La IA usa este contexto para generar copy más específico y relevante. Describe qué hace el producto, cómo funciona y qué lo diferencia.
          </p>
        </Field>
      </section>

      {/* Instagram */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Instagram · Meta Graph API</h2>
          <p className="text-xs text-gray-400 mt-0.5">Necesario para publicar carruseles automáticamente.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Instagram Account ID">
            <input type="text" value={values.instagram_account_id ?? ''} onChange={e => set('instagram_account_id', e.target.value)} placeholder="17841400000000000" className={INPUT} />
          </Field>
          <Field label="Meta Access Token">
            <input type="password" value={values.meta_access_token ?? ''} onChange={e => set('meta_access_token', e.target.value)} placeholder="EAABsbCS..." className={INPUT} />
          </Field>
        </div>
      </section>

      {/* WhatsApp */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">WhatsApp · YCloud</h2>
          <p className="text-xs text-gray-400 mt-0.5">Para notificaciones cuando un carrusel está listo.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="YCloud API Key">
            <input type="password" value={values.ycloud_api_key ?? ''} onChange={e => set('ycloud_api_key', e.target.value)} placeholder="sk_live_..." className={INPUT} />
          </Field>
          <Field label="Número WhatsApp">
            <input type="text" value={values.whatsapp_phone ?? ''} onChange={e => set('whatsapp_phone', e.target.value)} placeholder="+5491100000000" className={INPUT} />
          </Field>
        </div>
      </section>

      {/* Footer sticky */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 -mx-6 px-6 py-4 flex items-center justify-between rounded-b-xl">
        <div>
          {saveStatus === 'error' && <p className="text-sm text-red-600">{saveError}</p>}
          {saveStatus === 'saved' && (
            <p className="text-sm text-emerald-600 flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Ajustes guardados
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={saveStatus === 'saving'}
          className="px-6 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm border"
          style={{
            backgroundColor: values.primary_color,
            color: isLightColor(values.primary_color) ? '#111827' : '#ffffff',
            borderColor: isLightColor(values.primary_color) ? '#D1D5DB' : values.primary_color,
          }}
        >
          {saveStatus === 'saving' ? 'Guardando...' : 'Guardar ajustes'}
        </button>
      </div>
    </form>
  )
}

const INPUT = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'

function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  // Luminancia relativa
  return (r * 299 + g * 587 + b * 114) / 1000 > 128
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  )
}
