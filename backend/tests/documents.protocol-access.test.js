/**
 * Ethic-Net — generated protocol document access tests.
 */

import { jest } from '@jest/globals'

const readStreamMock = {
  on: jest.fn().mockReturnThis(),
  pipe: jest.fn(),
}

const fsMock = {
  existsSync: jest.fn(),
  createReadStream: jest.fn(() => readStreamMock),
}

const prismaMock = {
  document: {
    findUnique: jest.fn(),
  },
  submission: {
    findFirst: jest.fn(),
  },
}

const storageServiceMock = {
  validateFile: jest.fn(),
  saveFile: jest.fn(),
  deleteFile: jest.fn(),
  resolvePath: jest.fn(() => '/tmp/protocol.pdf'),
}

const statusServiceMock = {
  can: jest.fn(),
}

jest.unstable_mockModule('fs', () => ({
  default: fsMock,
  existsSync: fsMock.existsSync,
  createReadStream: fsMock.createReadStream,
}))
jest.unstable_mockModule('../src/config/database.js', () => ({
  default: prismaMock,
}))
jest.unstable_mockModule('../src/services/storage.service.js', () => storageServiceMock)
jest.unstable_mockModule('../src/services/status.service.js', () => statusServiceMock)
jest.unstable_mockModule('../src/controllers/submissions.controller.js', () => ({
  roleFilter: jest.fn(),
}))

const { preview } = await import('../src/controllers/documents.controller.js')

/**
 * Builds request/response test objects.
 * @param {object} user
 * @returns {{ req: object, res: object, next: jest.Mock }}
 */
function makeContext(user) {
  const req = {
    params: { id: 'doc-1' },
    user,
  }
  const res = {
    setHeader: jest.fn(),
  }
  const next = jest.fn()
  return { req, res, next }
}

/**
 * Returns a generated document linked only to a protocol.
 * @param {object} [overrides]
 * @returns {object}
 */
function makeProtocolDocument(overrides = {}) {
  return {
    id: 'doc-1',
    isActive: true,
    filename: 'protocol-he.pdf',
    originalName: 'protocol-he.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 128,
    storagePath: 'generated/protocols/protocol-1/protocol-he.pdf',
    submission: null,
    protocol: { id: 'protocol-1', isActive: true },
    ...overrides,
  }
}

describe('documents controller protocol document access', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    readStreamMock.on.mockReturnValue(readStreamMock)
    fsMock.existsSync.mockReturnValue(true)
    prismaMock.document.findUnique.mockResolvedValue(makeProtocolDocument())
  })

  test('blocks researchers from previewing generated protocol documents by document id', async () => {
    const { req, res, next } = makeContext({
      id: 'researcher-1',
      roles: ['RESEARCHER'],
      activeRole: 'RESEARCHER',
    })

    await preview(req, res, next)

    expect(storageServiceMock.resolvePath).not.toHaveBeenCalled()
    expect(fsMock.createReadStream).not.toHaveBeenCalled()
    expect(res.setHeader).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0][0].code).toBe('FORBIDDEN')
  })

  test('allows committee staff to preview generated protocol documents', async () => {
    const { req, res, next } = makeContext({
      id: 'secretary-1',
      roles: ['SECRETARY'],
      activeRole: 'SECRETARY',
    })

    await preview(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(storageServiceMock.resolvePath).toHaveBeenCalledWith('generated/protocols/protocol-1/protocol-he.pdf')
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf')
    expect(fsMock.createReadStream).toHaveBeenCalledWith('/tmp/protocol.pdf')
    expect(readStreamMock.pipe).toHaveBeenCalledWith(res)
  })

  test('blocks documents that are not scoped to a submission or protocol', async () => {
    prismaMock.document.findUnique.mockResolvedValue(makeProtocolDocument({ protocol: null }))
    const { req, next } = makeContext({
      id: 'admin-1',
      roles: ['ADMIN'],
      activeRole: 'ADMIN',
    })

    await preview(req, { setHeader: jest.fn() }, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0][0].code).toBe('FORBIDDEN')
  })
})
