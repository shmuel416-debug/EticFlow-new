/**
 * Ethic-Net — submission review access-control tests
 */

import { jest } from '@jest/globals'

const prismaMock = {
  submission: {
    findFirst: jest.fn(),
  },
}

const rolesMock = {
  getRequestRole: jest.fn(),
  hasAnyRole: jest.fn(),
}

const serviceMock = {
  listSubmissionReviewsForStaff: jest.fn(),
}

const coiServiceMock = {
  hasConflict: jest.fn(),
}

const submissionsControllerMock = {
  roleFilter: jest.fn(),
}

jest.unstable_mockModule('../src/config/database.js', () => ({
  default: prismaMock,
}))
jest.unstable_mockModule('../src/utils/roles.js', () => rolesMock)
jest.unstable_mockModule('../src/services/reviewerChecklist.service.js', () => serviceMock)
jest.unstable_mockModule('../src/services/coi.service.js', () => coiServiceMock)
jest.unstable_mockModule('../src/controllers/submissions.controller.js', () => submissionsControllerMock)

const { listSubmissionReviews } = await import('../src/controllers/reviewerChecklist.controller.js')

/**
 * Builds a reviewer request context.
 * @returns {{ req: object, res: object, next: jest.Mock }}
 */
function makeReviewerContext() {
  return {
    req: {
      params: { id: 'ETH-2026-001' },
      user: { id: 'rev-1', roles: ['REVIEWER'], activeRole: 'REVIEWER' },
    },
    res: { json: jest.fn() },
    next: jest.fn(),
  }
}

describe('submission review list access control', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    rolesMock.getRequestRole.mockReturnValue('REVIEWER')
    rolesMock.hasAnyRole.mockReturnValue(false)
    submissionsControllerMock.roleFilter.mockResolvedValue({
      AND: [
        { isActive: true, OR: [{ reviewerId: 'rev-1' }, { secondaryReviewerId: 'rev-1' }] },
        { OR: [{ id: 'ETH-2026-001' }, { applicationId: 'ETH-2026-001' }] },
      ],
    })
    prismaMock.submission.findFirst.mockResolvedValue({ id: 'sub-1' })
    coiServiceMock.hasConflict.mockResolvedValue({ conflict: false, reasons: [] })
    serviceMock.listSubmissionReviewsForStaff.mockResolvedValue({ fields: [], reviews: [] })
  })

  test('blocks reviewer review access when submission is not visible', async () => {
    prismaMock.submission.findFirst.mockResolvedValue(null)
    const { req, res, next } = makeReviewerContext()

    await listSubmissionReviews(req, res, next)

    expect(serviceMock.listSubmissionReviewsForStaff).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0][0]).toMatchObject({ code: 'NOT_FOUND', statusCode: 404 })
    expect(res.json).not.toHaveBeenCalled()
  })

  test('passes canonical submission id to review service after visibility check', async () => {
    const { req, res, next } = makeReviewerContext()

    await listSubmissionReviews(req, res, next)

    expect(submissionsControllerMock.roleFilter).toHaveBeenCalledWith(req.user, 'REVIEWER', {
      OR: [{ id: 'ETH-2026-001' }, { applicationId: 'ETH-2026-001' }],
    })
    expect(coiServiceMock.hasConflict).toHaveBeenCalledWith('rev-1', 'sub-1')
    expect(serviceMock.listSubmissionReviewsForStaff).toHaveBeenCalledWith('sub-1', {
      submittedOnly: true,
    })
    expect(res.json).toHaveBeenCalledWith({ data: { fields: [], reviews: [] } })
    expect(next).not.toHaveBeenCalled()
  })
})
