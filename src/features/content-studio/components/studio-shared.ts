import type { ContentPiece } from '../types'

// ── Design tokens ─────────────────────────────────────────────────────────
export const T = {
  navy:     '#0F1E3D',
  navyDeep: '#0A1529',
  navySoft: '#1A2D52',
  mint:     '#17B095',
  cream:    '#F5F2EB',
  amber:    '#F4A94A',
  gray:     '#9B9B9B',
}
export const FD = `'Archivo', 'Helvetica Neue', Helvetica, Arial, sans-serif`
export const FM = `'JetBrains Mono', ui-monospace, SFMono-Regular, monospace`

export const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
export const DAYS_ES   = ['LU','MA','MI','JU','VI','SÁ','DO']

export const ARG_TZ = 'America/Argentina/Buenos_Aires'

// Convierte un ISO UTC a "YYYY-MM-DDTHH:mm" en hora Argentina (no depende del TZ del browser)
export function utcISOToLocalInput(utcIso: string): string {
  const d = new Date(utcIso)
  // sv-SE locale devuelve "YYYY-MM-DD HH:MM:SS"
  const s = d.toLocaleString('sv-SE', { timeZone: ARG_TZ })
  return s.slice(0, 16).replace(' ', 'T')
}

// Convierte el valor de un input datetime-local (que el usuario ve como hora Argentina)
// a un Date UTC correcto, independientemente del TZ del browser
export function argInputToDate(localInput: string): Date {
  return new Date(`${localInput}:00-03:00`)
}

// ── Status system ─────────────────────────────────────────────────────────
export type UIStatus = 'borrador' | 'pendiente' | 'aprobado' | 'programado' | 'publicando' | 'publicado' | 'fallido'

export function dbToUI(s: string): UIStatus {
  if (s === 'published')  return 'publicado'
  if (s === 'publishing') return 'publicando'
  if (s === 'approved')   return 'aprobado'
  if (s === 'scheduled')  return 'programado'
  if (s === 'review')     return 'pendiente'
  if (s === 'failed')     return 'fallido'
  return 'borrador'
}

export function uiToDB(s: UIStatus): string {
  if (s === 'publicado')   return 'published'
  if (s === 'aprobado')    return 'approved'
  if (s === 'programado')  return 'scheduled'
  if (s === 'pendiente')   return 'review'
  return 'draft'
}

export const STATUS_META: Record<UIStatus, { color: string; label: string }> = {
  borrador:  { color: T.gray,      label: 'Borrador'   },
  pendiente: { color: T.amber,     label: 'Pendiente'  },
  aprobado:  { color: T.mint,      label: 'Aprobado'   },
  programado:{ color: '#6B9FFF',   label: 'Programado' },
  publicando:{ color: '#9B6BFF',   label: 'Publicando' },
  publicado: { color: T.navy,      label: 'Publicado'  },
  fallido:   { color: '#E05252',   label: 'Fallido'    },
}

// Piece augmented with DB data
export type RichPiece = ContentPiece & {
  dbId: string
  dbStatus: string
  scheduledAt?: string | null
  caption?: string | null
  isTemplate: boolean
  darkMode: boolean
  imageUrls?: string[] // carruseles desde biblioteca/flyers: las imágenes SON los slides
}
