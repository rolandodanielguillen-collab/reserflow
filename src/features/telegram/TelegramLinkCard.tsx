'use client'

import { useState } from 'react'
import { generateTelegramLinkCode, unlinkTelegram } from './link-actions'

export function TelegramLinkCard({ linked: initialLinked, botUsername }: { linked: boolean; botUsername?: string }) {
  const [linked, setLinked] = useState(initialLinked)
  const [code, setCode] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const bot = botUsername ? `@${botUsername}` : 'tu bot'

  return (
    <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-gray-900">Telegram</h2>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${linked ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
          {linked ? 'Vinculado' : 'Sin vincular'}
        </span>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Mandale la foto de un flyer al bot y arma la publicación. Las aprobaciones te llegan con botones. Reemplaza el circuito de WhatsApp (gratis).
      </p>

      {linked ? (
        <button
          disabled={busy}
          onClick={async () => { setBusy(true); await unlinkTelegram(); setLinked(false); setCode(null); setBusy(false) }}
          className="text-xs text-red-500 hover:text-red-600 underline"
        >
          Desvincular chat
        </button>
      ) : code ? (
        <div className="bg-gray-50 rounded-lg p-4 text-sm">
          <p className="text-gray-700 mb-2">Abrí {bot} en Telegram y mandale:</p>
          <code className="block bg-gray-900 text-emerald-400 rounded px-3 py-2 font-mono text-sm select-all">/start {code}</code>
          <p className="text-xs text-gray-400 mt-2">El código es de un solo uso.</p>
        </div>
      ) : (
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            const res = await generateTelegramLinkCode()
            if (res.code) setCode(res.code)
            setBusy(false)
          }}
          className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50"
        >
          {busy ? 'Generando...' : 'Generar código de vinculación'}
        </button>
      )}
    </div>
  )
}
