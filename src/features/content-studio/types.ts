export type FlowItem = { text: string; selected?: boolean }

// ── Flyers de evento (port de padelpost-ai) ───────────────────────────────
export type PaletteTokens = {
  background: string
  primary: string
  accent: string
  text: string
}

export type EventFlyerData = {
  clubName?: string
  tournamentName?: string
  startDate?: string // YYYY-MM-DD
  endDate?: string
  categoriesSummary?: string
  city?: string
  phone?: string
  year?: string
  playerImageUrl?: string
  logoUrl?: string
  clientNumber?: string
  headerBrand?: string
  footerLeft?: string
  footerRight?: string
  borderWidth?: number
  categoriesMen?: string
  categoriesWomen?: string
  prizesMen?: string
  prizesWomen?: string
  price?: string
  conditions?: string
  prizesLabel?: string
  footerText?: string
  igHandle?: string
}

export type DesignSlide =
  | { kind: 'cover'; eyebrow?: string; big: string; foot?: string }
  | { kind: 'stat'; top: string; big: string; bottom?: string }
  | { kind: 'steps'; title: string; items: string[] }
  | { kind: 'chat'; msgs: Array<{ who: 'you' | 'bot'; text: string }> }
  | { kind: 'beforeAfter'; before: { title: string; items: string[] }; after: { title: string; items: string[] } }
  | { kind: 'quote'; text: string; attrib?: string }
  | { kind: 'iconList'; title: string; items: string[] }
  | { kind: 'checklist'; title: string; items: string[] }
  | { kind: 'crossList'; items: string[] }
  | { kind: 'bigNumber'; number: string; label: string; sub?: string }
  | { kind: 'plusGrid'; items: Array<{ t: string; d: string }> }
  | { kind: 'imageBlock'; label: string; caption: string }
  | { kind: 'cta'; big: string; cta: string }
  | { kind: 'list'; title?: string | null; items: string[] }
  | { kind: 'event'; slide: 1 | 2 | 3; data: EventFlyerData; palette: PaletteTokens }
  | {
      kind: 'flowScreen'
      eyebrow?: string
      big: string
      sub?: string
      flowTitle?: string
      progress?: number
      flowHeadline?: string
      flowItems?: FlowItem[]
      flowCta?: string
      flowDisabled?: boolean
    }

export interface ContentPiece {
  id: number
  day: number
  type: 'carousel' | 'video'
  variant: string
  angle: string
  audience: 'B2C' | 'B2B' | 'edificios' | 'all'
  sport: string
  hook: string
  slides?: DesignSlide[]
  script?: string
  dbId?: string
  dbStatus?: string
  scheduledAt?: string | null
  caption?: string | null
}

export type PieceStatus = 'borrador' | 'pendiente' | 'aprobado' | 'publicado'
