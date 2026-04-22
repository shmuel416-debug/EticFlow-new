/**
 * EthicFlow — Secret Encryption Utilities
 * Encrypts/decrypts sensitive per-user tokens before database persistence.
 */

import crypto from 'crypto'

const ALGO = 'aes-256-gcm'

/**
 * Derives a 32-byte encryption key from env configuration.
 * @returns {Buffer}
 */
function getEncryptionKey() {
  const source = process.env.CALENDAR_TOKEN_ENCRYPTION_KEY || process.env.JWT_SECRET || ''
  if (!source) {
    throw new Error('Missing CALENDAR_TOKEN_ENCRYPTION_KEY (or JWT_SECRET fallback) for token encryption')
  }
  return crypto.createHash('sha256').update(source).digest()
}

/**
 * Encrypts plain text.
 * @param {string} value
 * @returns {string}
 */
export function encryptSecret(value) {
  const text = String(value ?? '')
  if (!text) return ''
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGO, key, iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`
}

/**
 * Decrypts encrypted secret text.
 * Supports plaintext fallback for legacy records.
 * @param {string|null|undefined} value
 * @returns {string}
 */
export function decryptSecret(value) {
  const text = String(value ?? '')
  if (!text) return ''
  const parts = text.split(':')
  if (parts.length !== 3) return text
  const [ivB64, tagB64, dataB64] = parts
  const key = getEncryptionKey()
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ])
  return decrypted.toString('utf8')
}
