/**
 * Ethic-Net — document read authorization tests.
 */

import { jest } from '@jest/globals'

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
  resolvePath: jest.fn(),
}

const submissionsControllerMock = {
  roleFilter: jest.fn(),
}

jest.unstable_mockModule('../src/config/database.js', () => ({
  default: prismaMock,
}))
jest.unstable_mockModule('../src/services/storage.service.js', () => storageServiceMock)
jest.unstable_mockModule('../src/controllers/submissions.controller.js', () => submissionsControllerMock)

const { preview } = await import('../src/controllers/documents.controller.js')

/**
 * Builds a preview request context.
 * @param {object} [userOverrides={}] - User fields to override
 * @returns {{ req: object, res: object, next: jest.Mock }}
 */
function makeContext(userOverrides = {}) {
  const req = {
    params: { id: 'doc-1' },
    user: {
      id: 'researcher-1',
      roles: ['RESEARCHER'],
      activeRole: 'RESEARCHER',
      ...userOverrides,
    },
  }
  const res = { setHeader: jest.fn() }
  const next = jest.fn()
  return { req, res, next }
}

describe('documents.controller preview access', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    prismaMock.document.findUnique.mockResolvedValue({
      id: 'doc-1',
      isActive: true,
      submission: null,
      protocolId: 'protocol-1',
      storagePath: 'generated/protocols/protocol-1.pdf',
      mimeType: 'application/pdf',
      originalName: 'protocol.pdf',
      sizeBytes: 1234,
    })
  })

  test('blocks researchers from protocol-scoped generated documents by document id', async () => {
    const { req, res, next } = makeContext()
    await preview(req, res, next)

    expect(storageServiceMock.resolvePath).not.toHaveBeenCalled()
    expect(res.setHeader).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0][0].code).toBe('FORBIDDEN')
  })

  test('blocks reviewers from orphan generated documents by document id', async () => {
    prismaMock.document.findUnique.mockResolvedValue({
      id: 'doc-1',
      isActive: true,
      submission: null,
      protocolId: null,
      storagePath: 'generated/report.pdf',
      mimeType: 'application/pdf',
      originalName: 'report.pdf',
      sizeBytes: 1234,
    })
    const { req, res, next } = makeContext({ id: 'rev-1', roles: ['REVIEWER'], activeRole: 'REVIEWER' })
    await preview(req, res, next)

    expect(storageServiceMock.resolvePath).not.toHaveBeenCalled()
    expect(res.setHeader).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0][0].code).toBe('FORBIDDEN')
  })
})
