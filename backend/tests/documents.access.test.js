/**
 * EthicFlow — document access controller tests.
 * Verifies generated/orphan document authorization cannot bypass ownership checks.
 */

import { jest } from '@jest/globals'

const prismaMock = {
  document: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
}

const storageMock = {
  validateFile: jest.fn(),
  saveFile: jest.fn(),
  deleteFile: jest.fn(),
  resolvePath: jest.fn(),
}

jest.unstable_mockModule('../src/config/database.js', () => ({
  default: prismaMock,
}))

jest.unstable_mockModule('../src/services/storage.service.js', () => storageMock)

jest.unstable_mockModule('../src/services/status.service.js', () => ({
  can: jest.fn(),
}))

const { download, remove } = await import('../src/controllers/documents.controller.js')
const { AppError } = await import('../src/utils/errors.js')

/**
 * Builds Express-like request/response mocks for document controller tests.
 * @param {object} user - Authenticated user payload.
 * @returns {{ req: object, res: object, next: Function }}
 */
function makeContext(user) {
  const req = {
    params: { id: 'doc-1' },
    user,
  }
  const res = {
    setHeader: jest.fn(),
    json: jest.fn(),
  }
  const next = jest.fn()
  return { req, res, next }
}

describe('documents.controller access checks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('denies download of active orphan documents', async () => {
    prismaMock.document.findUnique.mockResolvedValue({
      id: 'doc-1',
      isActive: true,
      submission: null,
      protocol: null,
    })

    const { req, res, next } = makeContext({ id: 'u-1', roles: ['RESEARCHER'] })
    await download(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0][0]).toBeInstanceOf(AppError)
    expect(next.mock.calls[0][0].code).toBe('FORBIDDEN')
    expect(storageMock.resolvePath).not.toHaveBeenCalled()
    expect(res.setHeader).not.toHaveBeenCalled()
  })

  test('denies protocol PDF download to non-committee users', async () => {
    prismaMock.document.findUnique.mockResolvedValue({
      id: 'doc-1',
      isActive: true,
      submission: null,
      protocol: { id: 'protocol-1', isActive: true },
    })

    const { req, res, next } = makeContext({ id: 'u-1', roles: ['RESEARCHER'] })
    await download(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0][0]).toBeInstanceOf(AppError)
    expect(next.mock.calls[0][0].statusCode).toBe(403)
    expect(storageMock.resolvePath).not.toHaveBeenCalled()
  })

  test('denies deletion of active orphan documents', async () => {
    prismaMock.document.findUnique.mockResolvedValue({
      id: 'doc-1',
      isActive: true,
      submission: null,
      protocol: null,
    })

    const { req, res, next } = makeContext({ id: 'u-1', roles: ['SECRETARY'] })
    await remove(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0][0]).toBeInstanceOf(AppError)
    expect(next.mock.calls[0][0].code).toBe('FORBIDDEN')
    expect(prismaMock.document.update).not.toHaveBeenCalled()
    expect(storageMock.deleteFile).not.toHaveBeenCalled()
  })
})
