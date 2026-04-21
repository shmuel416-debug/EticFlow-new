/**
 * EthicFlow — Storage service tests
 * Covers magic-byte validation and path resolution behavior.
 */

import path from 'path'
import { validateFile, resolvePath } from '../src/services/storage.service.js'

/**
 * Creates a minimal multer-like file object for tests.
 * @param {{ mimetype: string, size: number, bytes: number[] }} options
 * @returns {{ mimetype: string, size: number, buffer: Buffer }}
 */
function makeFile({ mimetype, size, bytes }) {
  return {
    mimetype,
    size,
    buffer: Buffer.from(bytes),
  }
}

describe('storage service', () => {
  test('accepts valid PDF signature and size', () => {
    const file = makeFile({
      mimetype: 'application/pdf',
      size: 1024,
      bytes: [0x25, 0x50, 0x44, 0x46, 0x2D], // %PDF-
    })

    expect(validateFile(file)).toEqual({ valid: true })
  })

  test('rejects unsupported mimetype', () => {
    const file = makeFile({
      mimetype: 'text/plain',
      size: 12,
      bytes: [0x74, 0x65, 0x73, 0x74],
    })

    expect(validateFile(file)).toEqual({ valid: false, reason: 'FILE_TYPE_NOT_ALLOWED' })
  })

  test('rejects oversized file', () => {
    const file = makeFile({
      mimetype: 'application/pdf',
      size: 21 * 1024 * 1024,
      bytes: [0x25, 0x50, 0x44, 0x46],
    })

    expect(validateFile(file)).toEqual({ valid: false, reason: 'FILE_TOO_LARGE' })
  })

  test('resolves storage path under uploads root', () => {
    const resolved = resolvePath(path.join('submissions', 'abc', 'doc.pdf'))
    expect(resolved).toContain(path.join('uploads', 'submissions', 'abc', 'doc.pdf'))
  })
})
