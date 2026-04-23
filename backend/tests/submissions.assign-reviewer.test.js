/**
 * EthicFlow — assignReviewer controller tests
 */

import { jest } from '@jest/globals'

const prismaMock = {
  submission: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  user: {
    findFirst: jest.fn(),
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

const { assignReviewer } = await import('../src/controllers/submissions.status.controller.js')

function makeContext() {
  const req = {
    params: { id: 'sub-1' },
    body: { reviewerId: 'rev-1' },
    user: { id: 'sec-1', roles: ['RESEARCHER', 'SECRETARY'], activeRole: 'SECRETARY' },
  }
  const res = {
    json: jest.fn(),
  }
  const next = jest.fn()
  return { req, res, next }
}

describe('submissions.status assignReviewer', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    statusServiceMock.can.mockResolvedValue(true)
    prismaMock.submission.findFirst.mockResolvedValue({
      id: 'sub-1',
      status: 'IN_TRIAGE',
      authorId: 'author-1',
      reviewerId: null,
      author: { id: 'author-1' },
      reviewer: null,
    })
    prismaMock.user.findFirst.mockResolvedValue({
      id: 'rev-1',
      roles: ['RESEARCHER', 'REVIEWER'],
      isActive: true,
    })
    prismaMock.submission.update.mockResolvedValue({ id: 'sub-1', reviewerId: 'rev-1', status: 'ASSIGNED' })
    coiServiceMock.hasConflict.mockResolvedValue({ conflict: false, reasons: [] })
    notificationServiceMock.notifyStatusChange.mockResolvedValue(undefined)
    slaServiceMock.setDueDates.mockResolvedValue(undefined)
  })

  test('blocks when COI exists', async () => {
    coiServiceMock.hasConflict.mockResolvedValue({
      conflict: true,
      reasons: [{ code: 'SELF_REVIEW_BLOCKED', message: 'self' }],
    })
    const { req, res, next } = makeContext()
    await assignReviewer(req, res, next)
    expect(prismaMock.submission.update).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0][0].code).toBe('COI_BLOCKED')
  })

  test('assigns reviewer when no COI', async () => {
    const { req, res, next } = makeContext()
    await assignReviewer(req, res, next)
    expect(prismaMock.submission.update).toHaveBeenCalledTimes(1)
    expect(res.json).toHaveBeenCalledWith({ submission: expect.any(Object) })
    expect(next).not.toHaveBeenCalled()
  })
})
