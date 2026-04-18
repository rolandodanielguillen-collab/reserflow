export type FlowItem = { text: string; selected?: boolean }

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
}

export type PieceStatus = 'borrador' | 'pendiente' | 'aprobado' | 'publicado'
