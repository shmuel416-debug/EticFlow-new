/**
 * Ethic-Net — previous review round access-control tests
 */

import { jest } from '@jest/globals'

const prismaMock = {
  submission: {
    findFirst: jest.fn(),
  },
  institutionSetting: {
    findUnique: jest.fn(),
  },
}

const rolesMock = {
  getRequestRole: jest.fn(),
  hasAnyRole: jest.fn(),
}

const coiServiceMock = {
  buildReviewerConflictExclusion: jest.fn(),
}

const statusServiceMock = {
  getNonTerminalCodes: jest.fn(),
}

const reviewRoundServiceMock = {
  openNextRound: jest.fn(),
  getPreviousRound: jest.fn(),
}

jest.unstable_mockModule('../src/config/database.js', () => ({
  default: prismaMock,
}))
jest.unstable_mockModule('../src/utils/roles.js', () => rolesMock)
jest.unstable_mockModule('../src/services/coi.service.js', () => coiServiceMock)
jest.unstable_mockModule('../src/services/status.service.js', () => statusServiceMock)
jest.unstable_mockModule('../src/services/review-round.service.js', () => reviewRoundServiceMock)

const { previousRound } = await import('../src/controllers/submissions.controller.js')

/**
 * Builds a reviewer request context.
 * @returns {{ req: object, res: object, next: jest.Mock }}
 */
function makeReviewerContext() {
  return {
    req: {
      params: { id: 'sub-locked' },
      user: { id: 'rev-1', roles: ['REVIEWER'], activeRole: 'REVIEWER' },
    },
    res: { json: jest.fn() },
    next: jest.fn(),
  }
}

describe('previous review round access control', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    rolesMock.getRequestRole.mockReturnValue('REVIEWER')
    rolesMock.hasAnyRole.mockReturnValue(false)
    prismaMock.institutionSetting.findUnique.mockResolvedValue({ value: 'false' })
    prismaMock.submission.findFirst.mockResolvedValue({ id: 'sub-1' })
    reviewRoundServiceMock.getPreviousRound.mockResolvedValue({
      id: 'round-1',
      primaryReviewer: { id: 'rev-old', email: 'old@example.com' },
    })
  })

  test('blocks previous-round reviewer history when submission is not visible', async () => {
    prismaMock.submission.findFirst.mockResolvedValue(null)
    const { req, res, next } = makeReviewerContext()

    await previousRound(req, res, next)

    expect(reviewRoundServiceMock.getPreviousRound).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0][0]).toMatchObject({ code: 'NOT_FOUND', statusCode: 404 })
    expect(res.json).not.toHaveBeenCalled()
  })

  test('uses canonical submission id after visibility check', async () => {
    const { req, res, next } = makeReviewerContext()

    await previousRound(req, res, next)

    expect(prismaMock.submission.findFirst).toHaveBeenCalledWith({
      where: {
        AND: [
          {
            isActive: true,
            OR: [{ reviewerId: 'rev-1' }, { secondaryReviewerId: 'rev-1' }],
          },
          { OR: [{ id: 'sub-locked' }, { applicationId: 'sub-locked' }] },
        ],
      },
      select: { id: true },
    })
    expect(reviewRoundServiceMock.getPreviousRound).toHaveBeenCalledWith('sub-1')
    expect(res.json).toHaveBeenCalledWith({
      data: expect.objectContaining({ id: 'round-1' }),
    })
    expect(next).not.toHaveBeenCalled()
  })
})
