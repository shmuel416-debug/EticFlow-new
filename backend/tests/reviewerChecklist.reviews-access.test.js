/**
 * Ethic-Net — reviewer checklist peer review access tests.
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
 * Creates a request context for the submission reviews endpoint.
 * @param {object} [overrides={}] - Request overrides.
 * @returns {{ req: object, res: object, next: jest.Mock }}
 */
function makeContext(overrides = {}) {
  const req = {
    params: { id: 'sub-1' },
    user: { id: 'rev-1', roles: ['REVIEWER'], activeRole: 'REVIEWER' },
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
    rolesMock.hasAnyRole.mockReturnValue(false)
    coiServiceMock.hasConflict.mockResolvedValue({ conflict: false, reasons: [] })
    submissionsControllerMock.roleFilter.mockResolvedValue({
      isActive: true,
      id: 'sub-1',
      OR: [{ reviewerId: 'rev-1' }, { secondaryReviewerId: 'rev-1' }],
    })
    prismaMock.submission.findFirst.mockResolvedValue({ id: 'sub-1' })
    serviceMock.listSubmissionReviewsForStaff.mockResolvedValue({ fields: [], reviews: [] })
  })

  test('blocks a reviewer when the submission is not visible to them', async () => {
    prismaMock.submission.findFirst.mockResolvedValue(null)
    const { req, res, next } = makeContext()

    await listSubmissionReviews(req, res, next)

    expect(submissionsControllerMock.roleFilter).toHaveBeenCalledWith(req.user, 'REVIEWER', { id: 'sub-1' })
    expect(prismaMock.submission.findFirst).toHaveBeenCalledWith({
      where: expect.objectContaining({ id: 'sub-1' }),
      select: { id: true },
    })
    expect(serviceMock.listSubmissionReviewsForStaff).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0][0].code).toBe('FORBIDDEN')
    expect(res.json).not.toHaveBeenCalled()
  })

  test('returns submitted reviews when reviewer visibility permits access', async () => {
    const { req, res, next } = makeContext()

    await listSubmissionReviews(req, res, next)

    expect(serviceMock.listSubmissionReviewsForStaff).toHaveBeenCalledWith('sub-1', { submittedOnly: true })
    expect(res.json).toHaveBeenCalledWith({ data: { fields: [], reviews: [] } })
    expect(next).not.toHaveBeenCalled()
  })

  test('blocks a conflicted reviewer before loading reviews', async () => {
    coiServiceMock.hasConflict.mockResolvedValue({
      conflict: true,
      reasons: [{ code: 'SUBMISSION_DECLARATION', message: 'Declared conflict' }],
    })
    const { res, next } = makeContext()

    await listSubmissionReviews(makeContext().req, res, next)

    expect(prismaMock.submission.findFirst).not.toHaveBeenCalled()
    expect(serviceMock.listSubmissionReviewsForStaff).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0][0].code).toBe('COI_BLOCKED')
  })

  test('lets staff read all reviews without reviewer visibility checks', async () => {
    rolesMock.getRequestRole.mockReturnValue('SECRETARY')
    rolesMock.hasAnyRole.mockReturnValue(true)
    const { req, res, next } = makeContext({
      user: { id: 'sec-1', roles: ['SECRETARY'], activeRole: 'SECRETARY' },
    })

    await listSubmissionReviews(req, res, next)

    expect(coiServiceMock.hasConflict).not.toHaveBeenCalled()
    expect(submissionsControllerMock.roleFilter).not.toHaveBeenCalled()
    expect(prismaMock.submission.findFirst).not.toHaveBeenCalled()
    expect(serviceMock.listSubmissionReviewsForStaff).toHaveBeenCalledWith('sub-1', { submittedOnly: false })
    expect(res.json).toHaveBeenCalledWith({ data: { fields: [], reviews: [] } })
    expect(next).not.toHaveBeenCalled()
  })
})
