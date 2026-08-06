// Self-check de la lógica de historias automáticas (fechas y slots).
// Uso: node scripts/check-story-schedule.mjs  (desde la raíz del repo)
import { readFileSync } from 'fs'
import { transformSync } from 'esbuild'
import assert from 'assert'

const src = readFileSync('src/features/scheduler/services/story-schedule.ts', 'utf8')
const js = transformSync(src, { loader: 'ts', format: 'cjs' }).code

// Stub de los imports (prisma, telegram): parseEventDate es pura
const fakeRequire = () => new Proxy({}, { get: () => () => {} })
const mod = { exports: {} }
new Function('require', 'module', 'exports', js)(fakeRequire, mod, mod.exports)
const { parseEventDate } = mod.exports

// Formato del editor
assert.strictEqual(parseEventDate('2026-08-14').toISOString(), '2026-08-14T00:00:00.000Z')
// Formato IA dd/mm (asume año actual) y dd/mm/yyyy
assert.strictEqual(parseEventDate('14/8/2026').toISOString(), '2026-08-14T00:00:00.000Z')
assert.strictEqual(parseEventDate('14/08/26').toISOString(), '2026-08-14T00:00:00.000Z')
// Basura → null
assert.strictEqual(parseEventDate('viernes'), null)
assert.strictEqual(parseEventDate(''), null)
assert.strictEqual(parseEventDate(null), null)

// Slots: torneo viernes 14/8 → historias lunes 10/8 y miércoles 12/8 a las 10:00 PY (13:00 UTC)
const eventDate = parseEventDate('2026-08-14')
const slots = [4, 2].map(d => new Date(eventDate.getTime() - d * 86_400_000 + 13 * 3_600_000))
assert.strictEqual(slots[0].toISOString(), '2026-08-10T13:00:00.000Z')
assert.strictEqual(slots[1].toISOString(), '2026-08-12T13:00:00.000Z')
const dias = slots.map(s => s.toLocaleString('es-PY', { weekday: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'America/Asuncion' }))
assert.ok(dias[0].includes('lunes') && dias[0].includes('10:00'), dias[0])
assert.ok(dias[1].includes('miércoles') && dias[1].includes('10:00'), dias[1])

// firstImageUrl: el slide 1 publicado suele ser el VIDEO de intro — debe saltarlo
const { firstImageUrl } = mod.exports
assert.strictEqual(
  firstImageUrl(null, '["https://x.com/intro.mp4","https://x.com/slide1.png","https://x.com/slide2.png"]'),
  'https://x.com/slide1.png')
assert.strictEqual(firstImageUrl('https://x.com/cover.png', null), 'https://x.com/cover.png')
assert.strictEqual(firstImageUrl(null, '["https://x.com/solo-video.mp4"]'), undefined)

console.log('OK — parseEventDate, firstImageUrl y slots de historias correctos')
console.log('  torneo vie 14/8 →', dias.join(' · '))
