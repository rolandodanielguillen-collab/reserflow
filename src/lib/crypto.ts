import crypto from 'crypto'

// AES-256-GCM para secretos en DB (tokens Meta, API keys).
// Formato: enc:v1:<iv b64>:<authTag b64>:<ciphertext b64>
const PREFIX = 'enc:v1:'

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY
  if (!raw) throw new Error('ENCRYPTION_KEY no configurada en el entorno')
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, 'hex')
  const b64 = Buffer.from(raw, 'base64')
  if (b64.length === 32) return b64
  // passphrase arbitraria → derivar clave estable
  return crypto.createHash('sha256').update(raw).digest()
}

export function encryptSecret(plain: string): string {
  if (!plain) return plain
  if (plain.startsWith(PREFIX)) return plain // ya cifrado, no doble-cifrar
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv)
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return PREFIX + [iv, tag, ct].map(b => b.toString('base64')).join(':')
}

/**
 * Lectura tolerante: valores legacy en texto plano se devuelven tal cual
 * (se re-encriptan en el próximo guardado). Nunca rompe por datos viejos.
 */
export function decryptSecret(stored: string | null | undefined): string | null {
  if (!stored) return null
  if (!stored.startsWith(PREFIX)) return stored
  const parts = stored.slice(PREFIX.length).split(':')
  if (parts.length !== 3) throw new Error('Secreto cifrado con formato inválido')
  const [ivB64, tagB64, ctB64] = parts
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivB64!, 'base64'))
  decipher.setAuthTag(Buffer.from(tagB64!, 'base64'))
  return Buffer.concat([decipher.update(Buffer.from(ctB64!, 'base64')), decipher.final()]).toString('utf8')
}

export function isEncrypted(value: string | null | undefined): boolean {
  return !!value && value.startsWith(PREFIX)
}
