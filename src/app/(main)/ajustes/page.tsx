import { getBrandSettings } from '@/features/settings/services/brand-settings'
import { BrandSettingsForm } from '@/features/settings/components/BrandSettingsForm'
import Link from 'next/link'

export default async function AjustesPage() {
  const { data } = await getBrandSettings()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 transition-colors">
              ← Volver
            </Link>
            <div className="w-px h-5 bg-gray-200" />
            <div>
              <h1 className="text-base font-semibold text-gray-900">Ajustes de marca</h1>
              <p className="text-xs text-gray-400">Configura tu brand kit e integraciones</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <BrandSettingsForm initial={data} />
      </main>
    </div>
  )
}
