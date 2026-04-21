/**
 * EthicFlow — Storage Service (local provider)
 * Handles file save/delete on the local filesystem.
 * Swap to S3/Azure via STORAGE_PROVIDER env in production.
 */

import path from 'path'
import fs   from 'fs/promises'
import { getStorageProvider } from '../config/services.js'

/** Base upload directory relative to project root. */
const UPLOAD_DIR = path.resolve('uploads')

/** Allowed MIME types and their magic bytes (first 4 bytes). */
const ALLOWED = {
  'application/pdf':                           [0x25, 0x50, 0x44, 0x46], // %PDF
  'image/jpeg':                                [0xFF, 0xD8, 0xFF],
  'image/png':                                 [0x89, 0x50, 0x4E, 0x47],
  'application/msword':                        [0xD0, 0xCF, 0x11, 0xE0],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [0x50, 0x4B, 0x03, 0x04],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':       [0x50, 0x4B, 0x03, 0x04],
}

const MAX_BYTES = 20 * 1024 * 1024 // 20 MB
const warnedProviders = new Set()

/**
 * Validates file size and magic bytes.
 * @param {Express.Multer.File} file
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateFile(file) {
  if (file.size > MAX_BYTES) return { valid: false, reason: 'FILE_TOO_LARGE' }

  const magic = ALLOWED[file.mimetype]
  if (!magic) return { valid: false, reason: 'FILE_TYPE_NOT_ALLOWED' }

  const buf = file.buffer
  const ok  = magic.every((byte, i) => buf[i] === byte)
  if (!ok) return { valid: false, reason: 'FILE_TYPE_MISMATCH' }

  return { valid: true }
}

/**
 * Saves a file buffer to disk under uploads/submissions/{subId}/.
 * @param {string} subId     - Submission UUID
 * @param {string} filename  - Sanitized filename
 * @param {Buffer} buffer    - File contents
 * @returns {Promise<string>} Relative storage path
 */
async function saveFileLocal(subId, filename, buffer) {
  const dir = path.join(UPLOAD_DIR, 'submissions', subId)
  await fs.mkdir(dir, { recursive: true })
  const dest = path.join(dir, filename)
  await fs.writeFile(dest, buffer)
  return path.join('submissions', subId, filename)
}

/**
 * Deletes a file by its relative storage path.
 * @param {string} storagePath
 * @returns {Promise<void>}
 */
async function deleteFileLocal(storagePath) {
  const full = path.join(UPLOAD_DIR, storagePath)
  await fs.unlink(full).catch(() => {}) // ignore if already gone
}

/**
 * Returns the absolute path for streaming a file download.
 * @param {string} storagePath
 * @returns {string}
 */
function resolvePathLocal(storagePath) {
  return path.join(UPLOAD_DIR, storagePath)
}

/**
 * Resolves storage provider behavior.
 * Currently local storage is fully implemented; other configured providers
 * gracefully fall back to local until dedicated provider modules are added.
 * @returns {'local'}
 */
function getActiveProvider() {
  const provider = getStorageProvider()
  if (provider === 'local') return 'local'

  if (!warnedProviders.has(provider)) {
    warnedProviders.add(provider)
    console.warn(
      `[Storage] Provider "${provider}" is configured but not implemented yet. Falling back to "local".`
    )
  }
  return 'local'
}

/**
 * Saves a file buffer in the active storage provider.
 * @param {string} subId
 * @param {string} filename
 * @param {Buffer} buffer
 * @returns {Promise<string>}
 */
export async function saveFile(subId, filename, buffer) {
  const provider = getActiveProvider()
  if (provider === 'local') return saveFileLocal(subId, filename, buffer)
  return saveFileLocal(subId, filename, buffer)
}

/**
 * Deletes a file in the active storage provider.
 * @param {string} storagePath
 * @returns {Promise<void>}
 */
export async function deleteFile(storagePath) {
  const provider = getActiveProvider()
  if (provider === 'local') return deleteFileLocal(storagePath)
  return deleteFileLocal(storagePath)
}

/**
 * Returns a local filesystem path for streaming downloads.
 * @param {string} storagePath
 * @returns {string}
 */
export function resolvePath(storagePath) {
  const provider = getActiveProvider()
  if (provider === 'local') return resolvePathLocal(storagePath)
  return resolvePathLocal(storagePath)
}
