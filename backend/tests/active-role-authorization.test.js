/**
 * EthicFlow — active-role authorization regression tests.
 */

import { jest } from '@jest/globals'

const prismaMock = {
  submission: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  submissionVersion: {
    create: jest.fn(),
  },
  document: {
    findMany: jest.fn(),
  },
  sLATracking: {
    create: jest.fn(),
  },
  $transaction: jest.fn(),
}

const rolesMock = {
  getRequestRole: jest.fn(),
  hasAnyRole: jest.fn(),
}

const storageMock = {
  validateFile: jest.fn(),
  saveFile: jest.fn(),
  deleteFile: jest.fn(),
  resolvePath: jest.fn(),
}

const statusServiceMock = {
  can: jest.fn(),
}

jest.unstable_mockModule('../src/config/database.js', () => ({
  default: prismaMock,
}))
jest.unstable_mockModule('../src/utils/roles.js', () => rolesMock)
jest.unstable_mockModule('../src/services/storage.service.js', () => storageMock)
jest.unstable_mockModule('../src/services/status.service.js', () => statusServiceMock)

const submissionsController = await import('../src/controllers/submissions.controller.js')
const documentsController = await import('../src/controllers/documents.controller.js')

/**
 * Builds an Express-like context for controller tests.
 * @param {object} reqOverrides
 * @returns {{ req: object, res: object, next: jest.Mock }}
 */
function makeContext(reqOverrides = {}) {
  const req = {
    params: {},
    body: {},
    query: {},
    user: { id: 'staff-1', roles: ['RESEARCHER', 'SECRETARY'] },
    ...reqOverrides,
  }
  const res = { json: jest.fn(), status: jest.fn().mockReturnThis() }
  const next = jest.fn()
  return { req, res, next }
}

describe('active-role authorization', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    rolesMock.hasAnyRole.mockReturnValue(true)
    prismaMock.$transaction.mockImplementation(async (callback) => callback(prismaMock))
  })

  test('blocks document listing for non-owner when active role is RESEARCHER', async () => {
    rolesMock.getRequestRole.mockReturnValue('RESEARCHER')
    prismaMock.submission.findUnique.mockResolvedValue({
      id: 'sub-1',
      authorId: 'owner-1',
      reviewerId: null,
      isActive: true,
      status: 'DRAFT',
    })
    const { req, res, next } = makeContext({ params: { subId: 'sub-1' } })

    await documentsController.list(req, res, next)

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: 'FORBIDDEN' }))
    expect(prismaMock.document.findMany).not.toHaveBeenCalled()
    expect(res.json).not.toHaveBeenCalled()
  })

  test('blocks draft update for non-owner when active role is RESEARCHER', async () => {
    rolesMock.getRequestRole.mockReturnValue('RESEARCHER')
    prismaMock.submission.findFirst.mockResolvedValue({
      id: 'sub-1',
      authorId: 'owner-1',
      status: 'DRAFT',
      versions: [{ versionNum: 1 }],
    })
    const { req, res, next } = makeContext({
      params: { id: 'sub-1' },
      body: { title: 'Changed title' },
    })

    await submissionsController.update(req, res, next)

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: 'FORBIDDEN' }))
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
    expect(res.json).not.toHaveBeenCalled()
  })
})
