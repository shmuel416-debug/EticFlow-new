/**
 * Ethic-Net — submission vote access regression tests
 */

import { jest } from '@jest/globals'

const prismaMock = {
  submission: {
    findFirst: jest.fn(),
  },
  institutionSetting: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  meetingAgendaItem: {
    findFirst: jest.fn(),
  },
  meetingAttendee: {
    findFirst: jest.fn(),
  },
  submissionVote: {
    findMany: jest.fn(),
    upsert: jest.fn(),
  },
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
jest.unstable_mockModule('../src/services/review-round.service.js', () => ({
  ensureCurrentRound: jest.fn(),
  closeCurrentRound: jest.fn(),
  openNextRound: jest.fn(),
}))
jest.unstable_mockModule('../src/services/reviewerChecklist.service.js', () => ({
  getOrCreateReview: jest.fn(),
}))
jest.unstable_mockModule('../src/services/pdf.service.js', () => ({
  generateApprovalLetter: jest.fn(),
  generateRejectionLetter: jest.fn(),
}))

const { getVotes, recordVote } = await import('../src/controllers/submissions.status.controller.js')

/**
 * Builds a reviewer request/response test context.
 * @param {object} [overrides={}]
 * @returns {{ req: object, res: object, next: jest.Mock }}
 */
function makeReviewerContext(overrides = {}) {
  const req = {
    params: { id: 'sub-1' },
    body: { decision: 'APPROVED' },
    user: { id: 'rev-1', roles: ['REVIEWER'], activeRole: 'REVIEWER' },
    ...overrides,
  }
  const res = {
    json: jest.fn(),
    status: jest.fn().mockReturnThis(),
  }
  const next = jest.fn()
  return { req, res, next }
}

/**
 * Creates an in-review submission record for vote tests.
 * @param {object} [overrides={}]
 * @returns {object}
 */
function makeSubmission(overrides = {}) {
  return {
    id: 'sub-1',
    status: 'IN_REVIEW',
    authorId: 'author-1',
    reviewerId: 'rev-2',
    secondaryReviewerId: null,
    author: { id: 'author-1', email: 'author@example.com', fullName: 'Author' },
    reviewer: { id: 'rev-2', email: 'rev2@example.com', fullName: 'Reviewer 2' },
    secondaryReviewer: null,
    ...overrides,
  }
}

describe('submissions.status vote access', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    prismaMock.submission.findFirst.mockResolvedValue(makeSubmission())
    prismaMock.institutionSetting.findUnique.mockResolvedValue({ value: 'false', isActive: true })
    prismaMock.institutionSetting.findMany.mockResolvedValue([])
    prismaMock.submissionVote.findMany.mockResolvedValue([])
    prismaMock.submissionVote.upsert.mockResolvedValue({ id: 'vote-1', submissionId: 'sub-1', voterId: 'rev-1' })
    coiServiceMock.hasConflict.mockResolvedValue({ conflict: false, reasons: [] })
  })

  test('blocks unassigned reviewer from recording a vote when peer visibility is disabled', async () => {
    const { req, res, next } = makeReviewerContext()

    await recordVote(req, res, next)

    expect(prismaMock.submissionVote.upsert).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0][0].code).toBe('NOT_FOUND')
    expect(res.status).not.toHaveBeenCalled()
  })

  test('blocks unassigned reviewer from reading votes when peer visibility is disabled', async () => {
    const { req, res, next } = makeReviewerContext()

    await getVotes(req, res, next)

    expect(prismaMock.submissionVote.findMany).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0][0].code).toBe('NOT_FOUND')
    expect(res.json).not.toHaveBeenCalled()
  })

  test('allows assigned reviewer to record a vote outside meeting enforcement', async () => {
    prismaMock.submission.findFirst.mockResolvedValue(makeSubmission({ reviewerId: 'rev-1' }))
    const { req, res, next } = makeReviewerContext()

    await recordVote(req, res, next)

    expect(prismaMock.submissionVote.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({
        submissionId: 'sub-1',
        voterId: 'rev-1',
        meetingId: null,
      }),
    }))
    expect(res.status).toHaveBeenCalledWith(201)
    expect(next).not.toHaveBeenCalled()
  })
})
