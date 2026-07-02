/**
 * Ethic-Net — reviewer checklist review visibility tests.
 * Ensures peer review listings reuse the submission visibility gate.
 */

import { jest } from '@jest/globals'

const prismaMock = {
  submission: {
    findFirst: jest.fn(),
  },
}

const serviceMock = {
  listSubmissionReviewsForStaff: jest.fn(),
}

const rolesMock = {
  getRequestRole: jest.fn(),
  hasAnyRole: jest.fn(),
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
jest.unstable_mockModule('../src/services/reviewerChecklist.service.js', () => serviceMock)
jest.unstable_mockModule('../src/utils/roles.js', () => rolesMock)
jest.unstable_mockModule('../src/services/coi.service.js', () => coiServiceMock)
jest.unstable_mockModule('../src/controllers/submissions.controller.js', () => submissionsControllerMock)

const { listSubmissionReviews } = await import('../src/controllers/reviewerChecklist.controller.js')

/**
 * Builds request/response test objects for reviewer review listing.
 * @returns {{ req: object, res: object, next: jest.Mock }}
 */
function makeContext() {
  const req = {
    params: { id: 'sub-private' },
    user: { id: 'rev-1', roles: ['REVIEWER'], activeRole: 'REVIEWER' },
  }
  const res = { json: jest.fn() }
  const next = jest.fn()
  return { req, res, next }
}

describe('reviewerChecklist.controller listSubmissionReviews visibility', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    rolesMock.getRequestRole.mockReturnValue('REVIEWER')
    rolesMock.hasAnyRole.mockReturnValue(false)
    submissionsControllerMock.roleFilter.mockResolvedValue({ id: 'sub-private', isActive: true })
    prismaMock.submission.findFirst.mockResolvedValue(null)
    coiServiceMock.hasConflict.mockResolvedValue({ conflict: false, reasons: [] })
    serviceMock.listSubmissionReviewsForStaff.mockResolvedValue({ fields: [], reviews: [] })
  })

  test('blocks reviewer from listing reviews for an invisible submission', async () => {
    const { req, res, next } = makeContext()

    await listSubmissionReviews(req, res, next)

    expect(submissionsControllerMock.roleFilter).toHaveBeenCalledWith(
      req.user,
      'REVIEWER',
      { id: 'sub-private' }
    )
    expect(prismaMock.submission.findFirst).toHaveBeenCalledWith({
      where: { id: 'sub-private', isActive: true },
      select: { id: true },
    })
    expect(coiServiceMock.hasConflict).not.toHaveBeenCalled()
    expect(serviceMock.listSubmissionReviewsForStaff).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0][0].code).toBe('SUBMISSION_NOT_FOUND')
    expect(res.json).not.toHaveBeenCalled()
  })

  test('allows reviewer to list submitted reviews for a visible submission', async () => {
    prismaMock.submission.findFirst.mockResolvedValue({ id: 'sub-private' })
    const { req, res, next } = makeContext()

    await listSubmissionReviews(req, res, next)

    expect(coiServiceMock.hasConflict).toHaveBeenCalledWith('rev-1', 'sub-private')
    expect(serviceMock.listSubmissionReviewsForStaff).toHaveBeenCalledWith('sub-private', {
      submittedOnly: true,
    })
    expect(res.json).toHaveBeenCalledWith({ data: { fields: [], reviews: [] } })
    expect(next).not.toHaveBeenCalled()
  })
})
