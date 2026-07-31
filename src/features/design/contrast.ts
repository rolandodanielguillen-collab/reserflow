// Contraste WCAG: garantiza texto legible sobre cualquier fondo.

function channel(c: number): number {
  const s = c / 255
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
}

function hexToRgb(hex: string): [number, number, number] {
  let clean = hex.replace('#', '')
  if (clean.length === 3) clean = clean.split('').map(ch => ch + ch).join('')
  if (clean.length !== 6) return [0, 0, 0]
  return [parseInt(clean.slice(0, 2), 16), parseInt(clean.slice(2, 4), 16), parseInt(clean.slice(4, 6), 16)]
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex)
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/** Ratio de contraste WCAG entre dos colores (1 a 21). */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

/** Elige blanco o casi-negro según cuál contraste mejor con el fondo. */
export function pickTextColor(background: string): string {
  return contrastRatio(background, '#ffffff') >= contrastRatio(background, '#111827')
    ? '#ffffff'
    : '#111827'
}

/**
 * Devuelve el color de texto propuesto si cumple AA (4.5:1) sobre el fondo;
 * si no, lo reemplaza por blanco/negro según convenga.
 */
export function ensureReadableText(background: string, proposedText: string): string {
  if (contrastRatio(background, proposedText) >= 4.5) return proposedText
  return pickTextColor(background)
}
