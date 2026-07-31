// Chequeo mínimo del cifrado de secretos: node scripts/check-crypto.mjs
import assert from 'node:assert'
import crypto from 'node:crypto'

process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex')
const { encryptSecret, decryptSecret, isEncrypted } = await import('../src/lib/crypto.ts').catch(async () => {
  // tsx no disponible → replicar la lógica no sirve; compilar al vuelo con ts-node tampoco.
  // Fallback: transpilar con el propio Next no aplica. Usamos import directo vía tsx si existe.
  throw new Error('Ejecutar con: npx tsx scripts/check-crypto.mjs')
})

const secret = 'EAABsbCS-token-de-prueba-1234567890'
const enc = encryptSecret(secret)
assert.notStrictEqual(enc, secret, 'debe cifrar')
assert.ok(isEncrypted(enc), 'formato enc:v1:')
assert.strictEqual(decryptSecret(enc), secret, 'roundtrip')
assert.strictEqual(decryptSecret('token-plano-legacy'), 'token-plano-legacy', 'legacy pasa tal cual')
assert.strictEqual(encryptSecret(enc), enc, 'no doble-cifra')
assert.strictEqual(decryptSecret(null), null, 'null tolerante')
console.log('check-crypto OK')
