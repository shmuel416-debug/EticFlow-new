/**
 * Ethic-Net — reviewer checklist peer-review access tests.
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
jest.unstable_mockModule('../src/services/coi.service.js', () => coiServiceMock)
jest.unstable_mockModule('../src/controllers/submissions.controller.js', () => submissionsControllerMock)

const { listSubmissionReviews } = await import('../src/controllers/reviewerChecklist.controller.js')

/**
 * Builds a request context for listing submission reviews.
 * @param {object} [userOverrides={}] - User fields to override
 * @returns {{ req: object, res: object, next: jest.Mock }}
 */
function makeContext(userOverrides = {}) {
  const req = {
    params: { id: 'sub-1' },
    user: {
      id: 'rev-1',
      roles: ['RESEARCHER', 'REVIEWER'],
      activeRole: 'REVIEWER',
      ...userOverrides,
    },
  }
  const res = { json: jest.fn() }
  const next = jest.fn()
  return { req, res, next }
}

describe('reviewerChecklist.controller listSubmissionReviews access', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    coiServiceMock.hasConflict.mockResolvedValue({ conflict: false, reasons: [] })
    submissionsControllerMock.roleFilter.mockResolvedValue({ id: 'sub-1', isActive: true })
    prismaMock.submission.findFirst.mockResolvedValue({ id: 'sub-1' })
    serviceMock.listSubmissionReviewsForStaff.mockResolvedValue({ fields: [], reviews: [] })
  })

  test('blocks reviewers when submission is not visible to them', async () => {
    prismaMock.submission.findFirst.mockResolvedValue(null)
    const { req, res, next } = makeContext()
    await listSubmissionReviews(req, res, next)

    expect(submissionsControllerMock.roleFilter).toHaveBeenCalledWith(req.user, 'REVIEWER', { id: 'sub-1' })
    expect(serviceMock.listSubmissionReviewsForStaff).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0][0].code).toBe('FORBIDDEN')
    expect(res.json).not.toHaveBeenCalled()
  })

  test('limits active reviewer role to submitted visible reviews', async () => {
    const { req, res, next } = makeContext({ roles: ['SECRETARY', 'REVIEWER'] })
    await listSubmissionReviews(req, res, next)

    expect(serviceMock.listSubmissionReviewsForStaff).toHaveBeenCalledWith('sub-1', { submittedOnly: true })
    expect(res.json).toHaveBeenCalledWith({ data: { fields: [], reviews: [] } })
    expect(next).not.toHaveBeenCalled()
  })

  test('lets staff active roles read all review states', async () => {
    const { req, res, next } = makeContext({ activeRole: 'SECRETARY', roles: ['SECRETARY', 'REVIEWER'] })
    await listSubmissionReviews(req, res, next)

    expect(coiServiceMock.hasConflict).not.toHaveBeenCalled()
    expect(submissionsControllerMock.roleFilter).not.toHaveBeenCalled()
    expect(serviceMock.listSubmissionReviewsForStaff).toHaveBeenCalledWith('sub-1', { submittedOnly: false })
    expect(next).not.toHaveBeenCalled()
  })
})
