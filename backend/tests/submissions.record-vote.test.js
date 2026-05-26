/**
 * EthicFlow - recordVote controller authorization tests.
 */

import { jest } from '@jest/globals'

const prismaMock = {
  submission: {
    findFirst: jest.fn(),
  },
  submissionVote: {
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

const { recordVote } = await import('../src/controllers/submissions.status.controller.js')

/**
 * Creates mock Express objects for recordVote tests.
 * @returns {{ req: object, res: object, next: jest.Mock }}
 */
function makeContext() {
  const req = {
    params: { id: 'sub-1' },
    body: { decision: 'APPROVED', note: 'Looks good' },
    user: { id: 'rev-1', roles: ['REVIEWER'], activeRole: 'REVIEWER' },
  }
  const res = {
    locals: {},
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  }
  const next = jest.fn()
  return { req, res, next }
}

describe('submissions.status recordVote', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    prismaMock.submission.findFirst.mockResolvedValue({
      id: 'sub-1',
      status: 'IN_REVIEW',
      reviewerId: 'assigned-reviewer',
      author: { id: 'author-1' },
      reviewer: { id: 'assigned-reviewer' },
    })
    prismaMock.submissionVote.upsert.mockResolvedValue({ id: 'vote-1' })
  })

  test('blocks unassigned reviewers from voting on inaccessible submissions', async () => {
    const { req, res, next } = makeContext()
    await recordVote(req, res, next)

    expect(prismaMock.submissionVote.upsert).not.toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0][0].code).toBe('FORBIDDEN')
  })

  test('allows the assigned reviewer to record a vote', async () => {
    prismaMock.submission.findFirst.mockResolvedValue({
      id: 'sub-1',
      status: 'IN_REVIEW',
      reviewerId: 'rev-1',
      author: { id: 'author-1' },
      reviewer: { id: 'rev-1' },
    })
    const { req, res, next } = makeContext()
    await recordVote(req, res, next)

    expect(prismaMock.submissionVote.upsert).toHaveBeenCalledTimes(1)
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith({ vote: { id: 'vote-1' } })
    expect(next).not.toHaveBeenCalled()
  })
})
