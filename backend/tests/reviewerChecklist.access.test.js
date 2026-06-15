/**
 * Ethic-Net — reviewer checklist review visibility tests.
 */

import { jest } from '@jest/globals'

const prismaMock = {
  submission: {
    findFirst: jest.fn(),
  },
}

const rolesMock = {
  getRequestRole: jest.fn(),
}

const coiServiceMock = {
  hasConflict: jest.fn(),
}

const submissionsControllerMock = {
  roleFilter: jest.fn(),
}

const reviewerChecklistServiceMock = {
  listSubmissionReviewsForStaff: jest.fn(),
}

jest.unstable_mockModule('../src/config/database.js', () => ({
  default: prismaMock,
}))
jest.unstable_mockModule('../src/utils/roles.js', () => rolesMock)
jest.unstable_mockModule('../src/services/coi.service.js', () => coiServiceMock)
jest.unstable_mockModule('../src/controllers/submissions.controller.js', () => submissionsControllerMock)
jest.unstable_mockModule('../src/services/reviewerChecklist.service.js', () => reviewerChecklistServiceMock)

const { listSubmissionReviews } = await import('../src/controllers/reviewerChecklist.controller.js')

/**
 * Builds a request context for checklist review visibility tests.
 * @param {object} [overrides={}]
 * @returns {{ req: object, res: object, next: jest.Mock }}
 */
function makeContext(overrides = {}) {
  const req = {
    params: { id: 'sub-1' },
    user: { id: 'rev-1', roles: ['RESEARCHER', 'REVIEWER'], activeRole: 'REVIEWER' },
    ...overrides,
  }
  const res = { json: jest.fn() }
  const next = jest.fn()
  return { req, res, next }
}

describe('reviewerChecklist.controller listSubmissionReviews access', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    rolesMock.getRequestRole.mockReturnValue('REVIEWER')
    submissionsControllerMock.roleFilter.mockResolvedValue({
      id: 'sub-1',
      isActive: true,
      OR: [{ reviewerId: 'rev-1' }, { secondaryReviewerId: 'rev-1' }],
    })
    prismaMock.submission.findFirst.mockResolvedValue({ id: 'sub-1' })
    coiServiceMock.hasConflict.mockResolvedValue({ conflict: false, reasons: [] })
    reviewerChecklistServiceMock.listSubmissionReviewsForStaff.mockResolvedValue({
      fields: [],
      reviews: [],
    })
  })

  test('blocks reviewer review listing when submission is not visible', async () => {
    prismaMock.submission.findFirst.mockResolvedValue(null)
    const { req, res, next } = makeContext()

    await listSubmissionReviews(req, res, next)

    expect(submissionsControllerMock.roleFilter).toHaveBeenCalledWith(req.user, 'REVIEWER', { id: 'sub-1' })
    expect(reviewerChecklistServiceMock.listSubmissionReviewsForStaff).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0][0].code).toBe('NOT_FOUND')
    expect(res.json).not.toHaveBeenCalled()
  })

  test('returns submitted-only reviews for visible reviewer submissions', async () => {
    const { req, res, next } = makeContext()

    await listSubmissionReviews(req, res, next)

    expect(reviewerChecklistServiceMock.listSubmissionReviewsForStaff).toHaveBeenCalledWith('sub-1', {
      submittedOnly: true,
    })
    expect(res.json).toHaveBeenCalledWith({ data: { fields: [], reviews: [] } })
    expect(next).not.toHaveBeenCalled()
  })
})
