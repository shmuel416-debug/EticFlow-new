/**
 * EthicFlow — submission status controller regression tests.
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

const checklistServiceMock = {
  getOrCreateReview: jest.fn(),
}

jest.unstable_mockModule('../src/config/database.js', () => ({
  default: prismaMock,
}))
jest.unstable_mockModule('../src/services/status.service.js', () => statusServiceMock)
jest.unstable_mockModule('../src/services/notification.service.js', () => notificationServiceMock)
jest.unstable_mockModule('../src/services/sla.service.js', () => slaServiceMock)
jest.unstable_mockModule('../src/services/coi.service.js', () => coiServiceMock)
jest.unstable_mockModule('../src/services/reviewerChecklist.service.js', () => checklistServiceMock)

const { transitionStatus, withdrawSubmission } = await import('../src/controllers/submissions.status.controller.js')

/**
 * Builds a minimal Express controller context.
 * @param {object} options
 * @returns {{ req: object, res: object, next: Function }}
 */
function makeContext(options = {}) {
  const req = {
    params: { id: 'sub-1' },
    body: options.body ?? {},
    user: options.user ?? { id: 'user-1', roles: ['RESEARCHER'], activeRole: 'RESEARCHER' },
  }
  const res = {
    json: jest.fn(),
    status: jest.fn().mockReturnThis(),
    locals: {},
  }
  const next = jest.fn()
  return { req, res, next }
}

describe('submissions.status controller', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    prismaMock.submission.findFirst.mockResolvedValue({
      id: 'sub-1',
      status: 'IN_REVIEW',
      authorId: 'author-1',
      reviewerId: 'reviewer-1',
      author: { id: 'author-1' },
      reviewer: { id: 'reviewer-1' },
    })
    prismaMock.submission.update.mockResolvedValue({ id: 'sub-1', status: 'IN_TRIAGE' })
    prismaMock.$transaction.mockResolvedValue([])
    statusServiceMock.getAllowedTransitions.mockResolvedValue({ next: ['IN_TRIAGE'], transitions: [] })
    notificationServiceMock.notifyStatusChange.mockResolvedValue(undefined)
    slaServiceMock.setDueDates.mockResolvedValue(undefined)
  })

  test('blocks generic status endpoint from recording final decisions', async () => {
    const { req, res, next } = makeContext({
      body: { status: 'APPROVED' },
      user: { id: 'chair-1', roles: ['RESEARCHER', 'CHAIRMAN'], activeRole: 'CHAIRMAN' },
    })

    await transitionStatus(req, res, next)

    expect(statusServiceMock.getAllowedTransitions).not.toHaveBeenCalled()
    expect(prismaMock.submission.update).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0][0].code).toBe('MANAGED_TRANSITION_ENDPOINT_REQUIRED')
    expect(res.json).not.toHaveBeenCalled()
  })

  test('withdraw honors transition matrix for owner requests', async () => {
    prismaMock.submission.findFirst.mockResolvedValue({
      id: 'sub-2',
      status: 'ASSIGNED',
      authorId: 'author-1',
      reviewerId: 'reviewer-1',
      author: { id: 'author-1' },
      reviewer: { id: 'reviewer-1' },
    })
    statusServiceMock.getAllowedTransitions.mockResolvedValue({ next: [], transitions: [] })

    const { req, res, next } = makeContext({
      body: { note: 'stop' },
      user: { id: 'author-1', roles: ['RESEARCHER'], activeRole: 'RESEARCHER' },
    })

    await withdrawSubmission(req, res, next)

    expect(statusServiceMock.getAllowedTransitions).toHaveBeenCalledWith('ASSIGNED', 'RESEARCHER', expect.any(Object))
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0][0].code).toBe('INVALID_TRANSITION')
    expect(res.json).not.toHaveBeenCalled()
  })
})
