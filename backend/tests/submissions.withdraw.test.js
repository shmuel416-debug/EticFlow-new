/**
 * EthicFlow — withdrawSubmission controller tests.
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

const { withdrawSubmission } = await import('../src/controllers/submissions.status.controller.js')

/**
 * Builds request/response test doubles for withdrawal.
 * @param {{ status?: string, userId?: string, authorId?: string, activeRole?: string }} [overrides]
 * @returns {{ req: any, res: any, next: any, submission: any }}
 */
function makeContext(overrides = {}) {
  const submission = {
    id: 'sub-1',
    status: overrides.status ?? 'ASSIGNED',
    authorId: overrides.authorId ?? 'author-1',
    reviewerId: 'rev-1',
    author: { id: overrides.authorId ?? 'author-1' },
    reviewer: { id: 'rev-1' },
  }
  const req = {
    params: { id: 'sub-1' },
    body: { note: 'Withdraw reason' },
    user: {
      id: overrides.userId ?? 'author-1',
      roles: ['RESEARCHER'],
      activeRole: overrides.activeRole ?? 'RESEARCHER',
      role: overrides.activeRole ?? 'RESEARCHER',
    },
  }
  const res = { json: jest.fn() }
  const next = jest.fn()
  return { req, res, next, submission }
}

describe('submissions.status withdrawSubmission', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    statusServiceMock.getAllowedTransitions.mockResolvedValue({
      next: ['WITHDRAWN'],
      transitions: [{ fromCode: 'SUBMITTED', toCode: 'WITHDRAWN', allowedRoles: ['RESEARCHER'] }],
    })
    prismaMock.submission.update.mockResolvedValue({ id: 'sub-1', status: 'WITHDRAWN' })
    prismaMock.comment.create.mockResolvedValue({ id: 'comment-1' })
    prismaMock.$transaction.mockResolvedValue(undefined)
    slaServiceMock.setDueDates.mockResolvedValue(undefined)
  })

  test('blocks researcher withdrawal when status rules do not allow it', async () => {
    const { req, res, next, submission } = makeContext({ status: 'ASSIGNED' })
    prismaMock.submission.findFirst.mockResolvedValue(submission)
    statusServiceMock.getAllowedTransitions.mockResolvedValue({
      next: [],
      transitions: [],
    })

    await withdrawSubmission(req, res, next)

    expect(statusServiceMock.getAllowedTransitions).toHaveBeenCalledWith('ASSIGNED', 'RESEARCHER', submission)
    expect(prismaMock.submission.update).not.toHaveBeenCalled()
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
    expect(res.json).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0][0].code).toBe('INVALID_TRANSITION')
  })

  test('allows privileged withdrawal when status rules allow it', async () => {
    const { req, res, next, submission } = makeContext({
      status: 'ASSIGNED',
      userId: 'sec-1',
      activeRole: 'SECRETARY',
    })
    req.user.roles = ['RESEARCHER', 'SECRETARY']
    prismaMock.submission.findFirst
      .mockResolvedValueOnce(submission)
      .mockResolvedValueOnce({ ...submission, status: 'WITHDRAWN', reviewerId: null })

    await withdrawSubmission(req, res, next)

    expect(statusServiceMock.getAllowedTransitions).toHaveBeenCalledWith('ASSIGNED', 'SECRETARY', submission)
    expect(prismaMock.submission.update).toHaveBeenCalledWith({
      where: { id: 'sub-1' },
      data: { status: 'WITHDRAWN', reviewerId: null },
    })
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1)
    expect(res.json).toHaveBeenCalledWith({
      submission: expect.objectContaining({ status: 'WITHDRAWN', reviewerId: null }),
    })
    expect(next).not.toHaveBeenCalled()
  })
})
