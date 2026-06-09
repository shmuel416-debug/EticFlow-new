/**
 * Ethic-Net — assignedToMe filter tests for secondary reviewers
 */

import { jest } from '@jest/globals'

const prismaMock = {
  submission: {
    findMany: jest.fn(),
    count: jest.fn(),
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

jest.unstable_mockModule('../src/config/database.js', () => ({
  default: prismaMock,
}))
jest.unstable_mockModule('../src/utils/roles.js', () => rolesMock)
jest.unstable_mockModule('../src/services/coi.service.js', () => coiServiceMock)

const { list } = await import('../src/controllers/submissions.controller.js')

/**
 * Creates a reviewer request with assignedToMe query flag.
 * @param {object} [overrides={}]
 * @returns {{ req: object, res: object, next: jest.Mock }}
 */
function makeAssignedContext(overrides = {}) {
  rolesMock.getRequestRole.mockReturnValue('REVIEWER')
  rolesMock.hasAnyRole.mockReturnValue(true)
  const req = {
    query: { assignedToMe: 'true' },
    params: {},
    user: { id: 'rev-secondary', roles: ['RESEARCHER', 'REVIEWER'] },
    ...overrides,
  }
  const res = { json: jest.fn() }
  const next = jest.fn()
  return { req, res, next }
}

describe('submissions.controller assignedToMe filter', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    prismaMock.submission.findMany.mockResolvedValue([])
    prismaMock.submission.count.mockResolvedValue(0)
    prismaMock.institutionSetting.findUnique.mockResolvedValue({ value: 'false' })
    coiServiceMock.buildReviewerConflictExclusion.mockResolvedValue({
      blockAll: false,
      submissionIds: [],
      userIds: [],
      departments: [],
    })
  })

  test('includes primary and secondary reviewer assignment in assignedToMe filter', async () => {
    const { req, res, next } = makeAssignedContext()
    await list(req, res, next)

    const where = prismaMock.submission.findMany.mock.calls[0][0].where
    expect(where.OR).toEqual([
      { reviewerId: 'rev-secondary' },
      { secondaryReviewerId: 'rev-secondary' },
    ])
    expect(where.reviewerId).toBeUndefined()
    expect(res.json).toHaveBeenCalled()
    expect(next).not.toHaveBeenCalled()
  })

  test('applies assignedToMe filter for chairman active role', async () => {
    rolesMock.getRequestRole.mockReturnValue('CHAIRMAN')
    const { req, next } = makeAssignedContext({
      user: { id: 'chair-1', roles: ['RESEARCHER', 'CHAIRMAN'] },
    })
    await list(req, { json: jest.fn() }, next)

    const where = prismaMock.submission.findMany.mock.calls[0][0].where
    expect(where.OR).toEqual([
      { reviewerId: 'chair-1' },
      { secondaryReviewerId: 'chair-1' },
    ])
  })
})
