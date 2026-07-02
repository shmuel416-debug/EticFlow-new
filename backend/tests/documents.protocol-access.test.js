/**
 * Ethic-Net — generic document protocol access tests.
 * Ensures protocol PDFs cannot bypass protocol route authorization.
 */

import { jest } from '@jest/globals'

const streamMock = {
  on: jest.fn().mockReturnThis(),
  pipe: jest.fn(),
}

const fsMock = {
  existsSync: jest.fn(),
  createReadStream: jest.fn(() => streamMock),
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

const rolesMock = {
  getRequestRole: jest.fn(),
  hasAnyRole: jest.fn(),
}

jest.unstable_mockModule('fs', () => ({
  default: fsMock,
}))
jest.unstable_mockModule('../src/config/database.js', () => ({
  default: prismaMock,
}))
jest.unstable_mockModule('../src/services/storage.service.js', () => storageServiceMock)
jest.unstable_mockModule('../src/utils/roles.js', () => rolesMock)
jest.unstable_mockModule('../src/controllers/submissions.controller.js', () => ({
  roleFilter: jest.fn(),
}))

const { preview } = await import('../src/controllers/documents.controller.js')

/**
 * Builds request/response test objects for document preview.
 * @param {object} [user]
 * @returns {{ req: object, res: object, next: jest.Mock }}
 */
function makeContext(user = { id: 'researcher-1', roles: ['RESEARCHER'], activeRole: 'RESEARCHER' }) {
  const req = {
    params: { id: 'doc-protocol' },
    user,
  }
  const res = { setHeader: jest.fn() }
  const next = jest.fn()
  return { req, res, next }
}

/**
 * Builds an active protocol document fixture.
 * @returns {object}
 */
function makeProtocolDocument() {
  return {
    id: 'doc-protocol',
    isActive: true,
    mimeType: 'application/pdf',
    originalName: 'protocol.pdf',
    sizeBytes: 128,
    storagePath: 'generated/protocols/protocol.pdf',
    submissionId: null,
    submission: null,
    protocolId: 'protocol-1',
    protocol: { id: 'protocol-1', isActive: true },
  }
}

describe('documents.controller protocol document access', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    streamMock.on.mockReturnThis()
    fsMock.existsSync.mockReturnValue(true)
    prismaMock.document.findUnique.mockResolvedValue(makeProtocolDocument())
  })

  test('blocks researcher from previewing protocol document through generic route', async () => {
    rolesMock.getRequestRole.mockReturnValue('RESEARCHER')
    rolesMock.hasAnyRole.mockReturnValue(false)
    const { req, res, next } = makeContext()

    await preview(req, res, next)

    expect(prismaMock.document.findUnique).toHaveBeenCalledWith({
      where: { id: 'doc-protocol' },
      include: { submission: true, protocol: true },
    })
    expect(fsMock.existsSync).not.toHaveBeenCalled()
    expect(fsMock.createReadStream).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0][0].code).toBe('FORBIDDEN')
    expect(res.setHeader).not.toHaveBeenCalled()
  })

  test('allows secretary to preview an active protocol document', async () => {
    rolesMock.getRequestRole.mockReturnValue('SECRETARY')
    rolesMock.hasAnyRole.mockReturnValue(true)
    const { req, res, next } = makeContext({
      id: 'secretary-1',
      roles: ['SECRETARY'],
      activeRole: 'SECRETARY',
    })

    await preview(req, res, next)

    expect(storageServiceMock.resolvePath).toHaveBeenCalledWith('generated/protocols/protocol.pdf')
    expect(fsMock.createReadStream).toHaveBeenCalledWith('/tmp/protocol.pdf')
    expect(streamMock.pipe).toHaveBeenCalledWith(res)
    expect(next).not.toHaveBeenCalled()
  })
})
