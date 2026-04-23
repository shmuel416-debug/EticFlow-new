/**
 * EthicFlow — submitReview chairman eligibility tests
 */

import { jest } from '@jest/globals'

const prismaMock = {
  submission: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  comment: {
    create: jest.fn(),
  },
  $transaction: jest.fn(),
}

const statusServiceMock = {
  can: jest.fn(),
  getAllowedTransitions: jest.fn(),
}

const notificationServiceMock = {
  notifyStatusChange: jest.fn(),
}

const slaServiceMock = {
  setDueDates: jest.fn(),
}

const coiServiceMock = {
  hasConflict: jest.fn(),
}

jest.unstable_mockModule('../src/config/database.js', () => ({
  default: prismaMock,
}))
jest.unstable_mockModule('../src/services/status.service.js', () => statusServiceMock)
jest.unstable_mockModule('../src/services/notification.service.js', () => notificationServiceMock)
jest.unstable_mockModule('../src/services/sla.service.js', () => slaServiceMock)
jest.unstable_mockModule('../src/services/coi.service.js', () => coiServiceMock)

const { submitReview } = await import('../src/controllers/submissions.status.controller.js')

/**
 * Builds default request/response test objects.
 * @returns {{ req: any, res: any, next: any }}
 */
function makeContext() {
  const req = {
    params: { id: 'sub-1' },
    body: {
      score: 4,
      recommendation: 'APPROVED',
      comments: 'Detailed review comment text.',
    },
    user: { id: 'chair-1', roles: ['RESEARCHER', 'CHAIRMAN'], activeRole: 'CHAIRMAN' },
  }
  const res = { json: jest.fn() }
  const next = jest.fn()
  return { req, res, next }
}

describe('submissions.status submitReview chairman support', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    statusServiceMock.can.mockResolvedValue(false)
    prismaMock.comment.create.mockResolvedValue({ id: 'c-1' })
    prismaMock.submission.update.mockResolvedValue({ id: 'sub-1', status: 'IN_REVIEW' })
    prismaMock.$transaction.mockResolvedValue(undefined)
    notificationServiceMock.notifyStatusChange.mockResolvedValue(undefined)
    slaServiceMock.setDueDates.mockResolvedValue(undefined)
  })

  test('allows assigned chairman to submit review', async () => {
    prismaMock.submission.findFirst
      .mockResolvedValueOnce({
        id: 'sub-1',
        status: 'ASSIGNED',
        authorId: 'author-1',
        reviewerId: 'chair-1',
        author: { id: 'author-1' },
        reviewer: { id: 'chair-1' },
      })
      .mockResolvedValueOnce({
        id: 'sub-1',
        status: 'IN_REVIEW',
        authorId: 'author-1',
        reviewerId: 'chair-1',
        author: { id: 'author-1' },
        reviewer: { id: 'chair-1' },
      })

    const { req, res, next } = makeContext()
    await submitReview(req, res, next)

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1)
    expect(res.json).toHaveBeenCalledWith({ submission: expect.objectContaining({ id: 'sub-1', status: 'IN_REVIEW' }) })
    expect(next).not.toHaveBeenCalled()
  })

  test('blocks chairman when not assigned to submission', async () => {
    prismaMock.submission.findFirst.mockResolvedValue({
      id: 'sub-1',
      status: 'ASSIGNED',
      authorId: 'author-1',
      reviewerId: 'rev-2',
      author: { id: 'author-1' },
      reviewer: { id: 'rev-2' },
    })

    const { req, res, next } = makeContext()
    await submitReview(req, res, next)

    expect(prismaMock.$transaction).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0][0].code).toBe('FORBIDDEN')
  })
})
