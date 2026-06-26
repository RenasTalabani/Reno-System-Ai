import crypto from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32  // 256 bits
const IV_LENGTH = 12   // 96 bits (GCM recommended)
const TAG_LENGTH = 16

export interface EncryptedPayload {
  ciphertext: Buffer
  iv: Buffer
  authTag: Buffer
  keyId: string
}

export function generateEncryptionKey(): { keyId: string; key: Buffer } {
  const keyId = crypto.randomUUID()
  const key = crypto.randomBytes(KEY_LENGTH)
  return { keyId, key }
}

export function deriveKeyFromEnv(): Buffer {
  const secret = process.env['BACKUP_ENCRYPTION_SECRET'] ?? 'reno-backup-key-dev-only-change-in-prod'
  return crypto.scryptSync(secret, 'reno-backup-salt-v1', KEY_LENGTH)
}

export function encrypt(data: Buffer): EncryptedPayload {
  const key = deriveKeyFromEnv()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH })
  const ciphertext = Buffer.concat([cipher.update(data), cipher.final()])
  const authTag = cipher.getAuthTag()
  return { ciphertext, iv, authTag, keyId: 'env-derived-v1' }
}

export function decrypt(payload: EncryptedPayload): Buffer {
  const key = deriveKeyFromEnv()
  const decipher = crypto.createDecipheriv(ALGORITHM, key, payload.iv, { authTagLength: TAG_LENGTH })
  decipher.setAuthTag(payload.authTag)
  return Buffer.concat([decipher.update(payload.ciphertext), decipher.final()])
}

export function sha256Hash(data: Buffer): string {
  return crypto.createHash('sha256').update(data).digest('hex')
}

export function verifyIntegrity(data: Buffer, expectedHash: string): boolean {
  const actual = sha256Hash(data)
  return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expectedHash, 'hex'))
}

export function serializeEncryptedPayload(payload: EncryptedPayload): string {
  return JSON.stringify({
    keyId: payload.keyId,
    iv: payload.iv.toString('base64'),
    authTag: payload.authTag.toString('base64'),
    ciphertext: payload.ciphertext.toString('base64'),
  })
}

export function deserializeEncryptedPayload(raw: string): EncryptedPayload {
  const obj = JSON.parse(raw) as { keyId: string; iv: string; authTag: string; ciphertext: string }
  return {
    keyId: obj.keyId,
    iv: Buffer.from(obj.iv, 'base64'),
    authTag: Buffer.from(obj.authTag, 'base64'),
    ciphertext: Buffer.from(obj.ciphertext, 'base64'),
  }
}
