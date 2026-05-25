/**
 * EthicFlow — transitionStatus controller tests
 * Verifies generic status transitions cannot bypass committee decision rules.
 */

import { jest } from '@jest/globals'

const prismaMock = {
  submission: {
    findFirst: jest.fn(),
    update: jest.fn(),
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

const reviewerChecklistServiceMock = {
  getOrCreateReview: jest.fn(),
}

jest.unstable_mockModule('../src/config/database.js', () => ({
  default: prismaMock,
}))
jest.unstable_mockModule('../src/services/status.service.js', () => statusServiceMock)
jest.unstable_mockModule('../src/services/notification.service.js', () => notificationServiceMock)
jest.unstable_mockModule('../src/services/sla.service.js', () => slaServiceMock)
jest.unstable_mockModule('../src/services/coi.service.js', () => coiServiceMock)
jest.unstable_mockModule('../src/services/reviewerChecklist.service.js', () => reviewerChecklistServiceMock)

const { transitionStatus } = await import('../src/controllers/submissions.status.controller.js')

/**
 * Builds default request/response test objects.
 * @param {string} status
 * @returns {{ req: any, res: any, next: any }}
 */
function makeContext(status) {
  const req = {
    params: { id: 'sub-1' },
    body: { status },
    user: { id: 'chair-1', roles: ['RESEARCHER', 'CHAIRMAN'], activeRole: 'CHAIRMAN' },
  }
  const res = { json: jest.fn() }
  const next = jest.fn()
  return { req, res, next }
}

describe('submissions.status transitionStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    prismaMock.submission.findFirst.mockResolvedValue({
      id: 'sub-1',
      status: 'IN_REVIEW',
      authorId: 'author-1',
      reviewerId: 'rev-1',
      author: { id: 'author-1' },
      reviewer: { id: 'rev-1' },
    })
    prismaMock.submission.update.mockResolvedValue({ id: 'sub-1', status: 'WITHDRAWN' })
    statusServiceMock.getAllowedTransitions.mockResolvedValue({
      next: ['WITHDRAWN'],
      transitions: [{ fromCode: 'IN_REVIEW', toCode: 'WITHDRAWN', allowedRoles: ['CHAIRMAN'] }],
    })
    notificationServiceMock.notifyStatusChange.mockResolvedValue(undefined)
    slaServiceMock.setDueDates.mockResolvedValue(undefined)
  })

  test.each(['APPROVED', 'REJECTED', 'PENDING_REVISION'])(
    'blocks %s through generic status endpoint',
    async (status) => {
      const { req, res, next } = makeContext(status)
      await transitionStatus(req, res, next)

      expect(statusServiceMock.getAllowedTransitions).not.toHaveBeenCalled()
      expect(prismaMock.submission.update).not.toHaveBeenCalled()
      expect(res.json).not.toHaveBeenCalled()
      expect(next).toHaveBeenCalledTimes(1)
      expect(next.mock.calls[0][0].code).toBe('DECISION_ENDPOINT_REQUIRED')
    }
  )

  test('allows non-decision statuses through generic status endpoint', async () => {
    const { req, res, next } = makeContext('WITHDRAWN')
    await transitionStatus(req, res, next)

    expect(statusServiceMock.getAllowedTransitions).toHaveBeenCalledTimes(1)
    expect(prismaMock.submission.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'WITHDRAWN' }),
    }))
    expect(res.json).toHaveBeenCalledWith({ submission: expect.objectContaining({ status: 'WITHDRAWN' }) })
    expect(next).not.toHaveBeenCalled()
  })
})
