/**
 * EthicFlow — reviewer checklist submit permission regression tests.
 */

import { jest } from '@jest/globals'

const txMock = {
  auditLog: { create: jest.fn() },
  reviewerChecklistReview: { update: jest.fn() },
  submission: { update: jest.fn() },
}

const prismaMock = {
  $transaction: jest.fn(),
  auditLog: { create: jest.fn() },
  reviewerChecklistItem: {
    findMany: jest.fn(),
  },
  reviewerChecklistResponse: {
    findMany: jest.fn(),
  },
  reviewerChecklistReview: {
    findUnique: jest.fn(),
  },
  submission: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
  },
}

const statusServiceMock = {
  can: jest.fn(),
}

const notificationServiceMock = {
  notifyStatusChange: jest.fn(),
}

const slaServiceMock = {
  setDueDates: jest.fn(),
}

jest.unstable_mockModule('../src/config/database.js', () => ({
  default: prismaMock,
}))
jest.unstable_mockModule('../src/services/status.service.js', () => statusServiceMock)
jest.unstable_mockModule('../src/services/notification.service.js', () => notificationServiceMock)
jest.unstable_mockModule('../src/services/sla.service.js', () => slaServiceMock)

const service = await import('../src/services/reviewerChecklist.service.js')

/**
 * Creates a reviewer checklist review fixture.
 * @param {string} reviewerId
 * @returns {object}
 */
function reviewFixture(reviewerId = 'rev-1') {
  return {
    id: 'review-1',
    reviewerId,
    submissionId: 'sub-1',
    templateId: 'template-1',
    status: 'DRAFT',
  }
}

/**
 * Creates a valid submit payload.
 * @returns {object}
 */
function submitPayload() {
  return { recommendation: 'APPROVED', generalNote: 'Looks complete.' }
}

describe('reviewerChecklist.service submitReview permissions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    prismaMock.reviewerChecklistReview.findUnique.mockResolvedValue(reviewFixture())
    prismaMock.submission.findUnique.mockResolvedValue({ status: 'ASSIGNED', reviewerId: 'rev-1' })
    prismaMock.reviewerChecklistItem.findMany.mockResolvedValue([])
    prismaMock.reviewerChecklistResponse.findMany.mockResolvedValue([])
    prismaMock.submission.findFirst.mockResolvedValue({ id: 'sub-1', status: 'IN_REVIEW' })
    txMock.reviewerChecklistReview.update.mockResolvedValue({ id: 'review-1', status: 'SUBMITTED' })
    txMock.auditLog.create.mockResolvedValue({ id: 'audit-1' })
    txMock.submission.update.mockResolvedValue({ id: 'sub-1', status: 'IN_REVIEW' })
    prismaMock.$transaction.mockImplementation(async (callback) => callback(txMock))
    notificationServiceMock.notifyStatusChange.mockResolvedValue(undefined)
    slaServiceMock.setDueDates.mockResolvedValue(undefined)
  })

  test('blocks checklist submission when SUBMIT_REVIEW is denied for the active role', async () => {
    statusServiceMock.can.mockResolvedValue(false)

    await expect(
      service.submitReview('review-1', 'rev-1', submitPayload(), 'REVIEWER')
    ).rejects.toMatchObject({ code: 'FORBIDDEN', statusCode: 403 })

    expect(statusServiceMock.can).toHaveBeenCalledWith('SUBMIT_REVIEW', 'ASSIGNED', 'REVIEWER')
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  test('keeps assigned-chairman exception aligned with the legacy review endpoint', async () => {
    statusServiceMock.can.mockResolvedValue(false)
    prismaMock.reviewerChecklistReview.findUnique.mockResolvedValue(reviewFixture('chair-1'))
    prismaMock.submission.findUnique.mockResolvedValue({ status: 'ASSIGNED', reviewerId: 'chair-1' })

    const submitted = await service.submitReview('review-1', 'chair-1', submitPayload(), 'CHAIRMAN')

    expect(submitted).toEqual({ id: 'review-1', status: 'SUBMITTED' })
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1)
  })
})
