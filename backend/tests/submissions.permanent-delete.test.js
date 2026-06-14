/**
 * Ethic-Net — permanent submission delete tests
 */

import { jest } from '@jest/globals'

const prismaMock = {
  submission: {
    findFirst: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
  },
  document: {
    findMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  reviewerChecklistReview: { deleteMany: jest.fn() },
  submissionVote: { deleteMany: jest.fn() },
  meetingAgendaItem: { deleteMany: jest.fn() },
  conflictDeclaration: { deleteMany: jest.fn() },
  aIAnalysis: { deleteMany: jest.fn() },
  sLATracking: { deleteMany: jest.fn() },
  comment: { deleteMany: jest.fn() },
  reviewRound: { deleteMany: jest.fn() },
  submissionVersion: { deleteMany: jest.fn() },
  $transaction: jest.fn(),
}

const storageServiceMock = {
  deleteFile: jest.fn(),
}

jest.unstable_mockModule('../src/config/database.js', () => ({
  default: prismaMock,
}))
jest.unstable_mockModule('../src/services/storage.service.js', () => storageServiceMock)

const { permanentlyDeleteSubmission } = await import('../src/controllers/submissions.controller.js')

/**
 * Builds default request/response test objects.
 * @returns {{ req: any, res: any, next: any }}
 */
function makeContext() {
  const req = {
    params: { id: 'sub-1' },
    user: { id: 'admin-1', roles: ['ADMIN'], activeRole: 'ADMIN' },
  }
  const res = {
    json: jest.fn(),
    locals: {},
  }
  const next = jest.fn()
  return { req, res, next }
}

describe('submissions permanentlyDeleteSubmission', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    prismaMock.submission.findFirst.mockResolvedValue({
      id: 'sub-1',
      applicationId: 'ETH-2026-001',
      title: 'Test submission',
      status: 'APPROVED',
    })
    prismaMock.$transaction.mockImplementation(async (fn) => fn({
      submission: prismaMock.submission,
      document: prismaMock.document,
      reviewerChecklistReview: prismaMock.reviewerChecklistReview,
      submissionVote: prismaMock.submissionVote,
      meetingAgendaItem: prismaMock.meetingAgendaItem,
      conflictDeclaration: prismaMock.conflictDeclaration,
      aIAnalysis: prismaMock.aIAnalysis,
      sLATracking: prismaMock.sLATracking,
      comment: prismaMock.comment,
      reviewRound: prismaMock.reviewRound,
      submissionVersion: prismaMock.submissionVersion,
    }))
    prismaMock.document.findMany.mockResolvedValue([
      { storagePath: 'submissions/sub-1/file.pdf' },
    ])
    storageServiceMock.deleteFile.mockResolvedValue(undefined)
  })

  test('deletes submission and related records in transaction', async () => {
    const { req, res, next } = makeContext()
    await permanentlyDeleteSubmission(req, res, next)

    expect(prismaMock.reviewerChecklistReview.deleteMany).toHaveBeenCalledWith({ where: { submissionId: 'sub-1' } })
    expect(prismaMock.submission.delete).toHaveBeenCalledWith({ where: { id: 'sub-1' } })
    expect(storageServiceMock.deleteFile).toHaveBeenCalledWith('submissions/sub-1/file.pdf')
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      deleted: expect.objectContaining({ id: 'sub-1', applicationId: 'ETH-2026-001' }),
    })
    expect(next).not.toHaveBeenCalled()
  })

  test('returns 404 when submission is missing', async () => {
    prismaMock.submission.findFirst.mockResolvedValue(null)
    const { req, res, next } = makeContext()
    await permanentlyDeleteSubmission(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0][0].code).toBe('NOT_FOUND')
    expect(res.json).not.toHaveBeenCalled()
  })
})
