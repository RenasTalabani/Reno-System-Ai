import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32
const IV_LENGTH = 12
const TAG_LENGTH = 16

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY ?? ''
  if (!raw) {
    throw new Error('ENCRYPTION_KEY environment variable is not set — cannot encrypt API keys')
  }
  // Accept hex-encoded 64-char key or raw 32-char key
  const buf = raw.length === 64 ? Buffer.from(raw, 'hex') : Buffer.from(raw)
  if (buf.length !== KEY_LENGTH) {
    throw new Error(`ENCRYPTION_KEY must be 32 bytes (got ${buf.length})`)
  }
  return buf
}

export function encryptApiKey(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  // Format: iv(12b) + tag(16b) + ciphertext — all hex-encoded
  return Buffer.concat([iv, tag, encrypted]).toString('hex')
}

export function decryptApiKey(ciphertext: string): string {
  const key = getKey()
  const buf = Buffer.from(ciphertext, 'hex')
  const iv = buf.subarray(0, IV_LENGTH)
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
  const encrypted = buf.subarray(IV_LENGTH + TAG_LENGTH)
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  return decipher.update(encrypted) + decipher.final('utf8')
}

export function maskApiKey(key: string): string {
  if (key.length <= 8) return '***'
  return `${key.slice(0, 4)}...${key.slice(-4)}`
}

export function isEncryptionAvailable(): boolean {
  try {
    getKey()
    return true
  } catch {
    return false
  }
}
