/**
 * Ethic-Net — recordDecision chairman-final approval tests
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

const reviewRoundServiceMock = {
  ensureCurrentRound: jest.fn(),
  closeCurrentRound: jest.fn(),
  openNextRound: jest.fn(),
}

const pdfServiceMock = {
  generateApprovalLetter: jest.fn(),
  generateRejectionLetter: jest.fn(),
}

jest.unstable_mockModule('../src/config/database.js', () => ({
  default: prismaMock,
}))
jest.unstable_mockModule('../src/services/status.service.js', () => statusServiceMock)
jest.unstable_mockModule('../src/services/notification.service.js', () => notificationServiceMock)
jest.unstable_mockModule('../src/services/sla.service.js', () => slaServiceMock)
jest.unstable_mockModule('../src/services/review-round.service.js', () => reviewRoundServiceMock)
jest.unstable_mockModule('../src/services/pdf.service.js', () => pdfServiceMock)

const { recordDecision } = await import('../src/controllers/submissions.status.controller.js')

/**
 * Builds default request/response test objects.
 * @returns {{ req: any, res: any, next: any }}
 */
function makeContext(body = {}) {
  const req = {
    params: { id: 'sub-1' },
    body: {
      decision: 'APPROVED',
      requiresCommittee: true,
      ...body,
    },
    user: { id: 'chair-1', roles: ['CHAIRMAN'], activeRole: 'CHAIRMAN' },
  }
  const res = { json: jest.fn() }
  const next = jest.fn()
  return { req, res, next }
}

describe('submissions.status recordDecision chairman-final', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    statusServiceMock.can.mockResolvedValue(true)
    statusServiceMock.getAllowedTransitions.mockResolvedValue({ next: ['APPROVED'] })
    prismaMock.submission.findFirst
      .mockResolvedValueOnce({
        id: 'sub-1',
        status: 'IN_REVIEW',
        track: 'FULL',
        applicationId: 'ETH-2026-001',
      })
      .mockResolvedValueOnce({
        id: 'sub-1',
        status: 'APPROVED',
        approvalRoute: 'EXPEDITED',
      })
    prismaMock.$transaction.mockImplementation(async (ops) => {
      if (typeof ops === 'function') return ops(prismaMock)
      await Promise.all(ops)
    })
    reviewRoundServiceMock.closeCurrentRound.mockResolvedValue(undefined)
    pdfServiceMock.generateApprovalLetter.mockResolvedValue(undefined)
    notificationServiceMock.notifyStatusChange.mockResolvedValue(undefined)
    slaServiceMock.setDueDates.mockResolvedValue(undefined)
  })

  test('approves without committee quorum even when requiresCommittee is true', async () => {
    const { req, res, next } = makeContext({ requiresCommittee: true })
    await recordDecision(req, res, next)

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1)
    expect(prismaMock.submission.update).toHaveBeenCalledWith({
      where: { id: 'sub-1' },
      data: { status: 'APPROVED', approvalRoute: 'EXPEDITED' },
    })
    expect(next).not.toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith({
      submission: expect.objectContaining({ status: 'APPROVED', approvalRoute: 'EXPEDITED' }),
    })
  })
})
