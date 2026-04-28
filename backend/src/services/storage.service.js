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
 * Saves arbitrary content by relative storage path.
 * @param {string} storagePath
 * @param {Buffer} buffer
 * @returns {Promise<string>}
 */
async function saveByPathLocal(storagePath, buffer) {
  const fullPath = path.join(UPLOAD_DIR, storagePath)
  await fs.mkdir(path.dirname(fullPath), { recursive: true })
  await fs.writeFile(fullPath, buffer)
  return storagePath
}

/**
 * Reads arbitrary content by relative storage path.
 * @param {string} storagePath
 * @returns {Promise<Buffer>}
 */
async function retrieveByPathLocal(storagePath) {
  const fullPath = path.join(UPLOAD_DIR, storagePath)
  return fs.readFile(fullPath)
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
 * Fails fast when a non-local provider is configured but not implemented.
 * @returns {'local'}
 */
function getActiveProvider() {
  const provider = getStorageProvider()
  if (provider === 'local') return 'local'

  throw new Error(
    `[Storage] Provider "${provider}" is not implemented. Configure STORAGE_PROVIDER=local or implement "${provider}" provider.`
  )
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
  throw new Error(`[Storage] Unsupported provider "${provider}"`)
}

/**
 * Saves arbitrary content by relative storage path in active provider.
 * @param {string} storagePath
 * @param {Buffer} buffer
 * @returns {Promise<string>}
 */
export async function save(storagePath, buffer) {
  const provider = getActiveProvider()
  if (provider === 'local') return saveByPathLocal(storagePath, buffer)
  throw new Error(`[Storage] Unsupported provider "${provider}"`)
}

/**
 * Retrieves arbitrary content by relative storage path in active provider.
 * @param {string} storagePath
 * @returns {Promise<Buffer>}
 */
export async function retrieve(storagePath) {
  const provider = getActiveProvider()
  if (provider === 'local') return retrieveByPathLocal(storagePath)
  throw new Error(`[Storage] Unsupported provider "${provider}"`)
}

/**
 * Deletes a file in the active storage provider.
 * @param {string} storagePath
 * @returns {Promise<void>}
 */
export async function deleteFile(storagePath) {
  const provider = getActiveProvider()
  if (provider === 'local') return deleteFileLocal(storagePath)
  throw new Error(`[Storage] Unsupported provider "${provider}"`)
}

/**
 * Returns a local filesystem path for streaming downloads.
 * @param {string} storagePath
 * @returns {string}
 */
export function resolvePath(storagePath) {
  const provider = getActiveProvider()
  if (provider === 'local') return resolvePathLocal(storagePath)
  throw new Error(`[Storage] Unsupported provider "${provider}"`)
}

/**
 * Compatibility object for legacy storage service consumers.
 */
export const storage = {
  save,
  retrieve,
  resolvePath,
  saveFile,
  deleteFile,
}
