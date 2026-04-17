import { GeneratorSection } from '@/features/generation/components/GeneratorSection'
import { ContentCalendar } from '@/features/scheduler/components'
import { signout } from '@/actions/auth'
import { getLastCarousel } from '@/features/generation/services/get-last-carousel'
import { getBrandSettings } from '@/features/settings/services/brand-settings'
import Link from 'next/link'

export default async function DashboardPage() {
  const [lastCarousel, brandResult] = await Promise.all([
    getLastCarousel(),
    getBrandSettings(),
  ])

  const brand = brandResult.data

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: brand?.primary_color ?? '#1E40AF' }}>
              <span className="text-white text-sm font-bold">
                {(brand?.brand_name ?? 'RF').slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-base font-semibold text-gray-900">{brand?.brand_name ?? 'ReserFlow'}</h1>
              <p className="text-xs text-gray-400">Marketing Auto-Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/ajustes" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
              Ajustes
            </Link>
            <form action={signout}>
              <button type="submit" className="text-sm text-gray-500 hover:text-red-600 transition-colors">
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-10">
        <section>
          <GeneratorSection
            initialCarousel={lastCarousel}
            brand={{
              primaryColor: brand?.primary_color ?? '#1E40AF',
              secondaryColor: brand?.secondary_color ?? '#F59E0B',
              accentColor: brand?.accent_color ?? '#10B981',
              brandName: brand?.brand_name ?? 'RESER+',
              logoUrl: brand?.logo_url ?? '',
            }}
          />
        </section>

        <div className="border-t border-gray-200" />

        <section>
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Calendario de contenido</h2>
            <p className="text-sm text-gray-500 mt-1">
              Programa tus carruseles y visualiza el mes completo de publicaciones.
            </p>
          </div>
          <ContentCalendar />
        </section>
      </main>
    </div>
  )
}
