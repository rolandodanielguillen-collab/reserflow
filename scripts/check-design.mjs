// Chequeo mínimo del motor de diseño: npx tsx scripts/check-design.mjs
import assert from 'node:assert'

const { contrastRatio, ensureReadableText, pickTextColor } = await import('../src/features/design/contrast.ts')
const { getPaletteByColor, DEFAULT_PALETTE, PALETTES } = await import('../src/features/design/palettes.ts')

// Contraste
assert.ok(contrastRatio('#000000', '#ffffff') > 20, 'negro/blanco ~21')
assert.strictEqual(pickTextColor('#0f1923'), '#ffffff', 'fondo oscuro → texto blanco')
assert.strictEqual(pickTextColor('#fef08a'), '#111827', 'fondo claro → texto oscuro')
assert.strictEqual(ensureReadableText('#0f1923', '#ffffff'), '#ffffff', 'texto legible se respeta')
assert.strictEqual(ensureReadableText('#fef08a', '#ffffff'), '#111827', 'texto ilegible se corrige')

// Todas las paletas curadas cumplen AA
for (const p of PALETTES) {
  assert.ok(contrastRatio(p.background, p.text) >= 4.5, `paleta ${p.id} cumple AA`)
}

// Matching de color
assert.strictEqual(getPaletteByColor('#39ff14').id, 'neon_green', 'verde matchea neon_green')
assert.strictEqual(getPaletteByColor('#888888').id, DEFAULT_PALETTE.id, 'gris acromático → default')

console.log('check-design OK')
