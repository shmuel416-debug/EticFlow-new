/**
 * Ethic-Net — reviewer peer visibility filter tests
 */

import { jest } from '@jest/globals'

const prismaMock = {
  submission: {
    findMany: jest.fn(),
    count: jest.fn(),
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

const { list, getById, previousRound } = await import('../src/controllers/submissions.controller.js')

/**
 * Creates a standard reviewer request context.
 * @param {object} [overrides={}]
 * @returns {{ req: object, res: object, next: jest.Mock }}
 */
function makeReviewerContext(overrides = {}) {
  rolesMock.getRequestRole.mockReturnValue('REVIEWER')
  rolesMock.hasAnyRole.mockReturnValue(true)
  const req = {
    query: {},
    params: {},
    user: { id: 'rev-1', roles: ['RESEARCHER', 'REVIEWER'] },
    ...overrides,
  }
  const res = { json: jest.fn() }
  const next = jest.fn()
  return { req, res, next }
}

describe('submissions.controller reviewer visibility', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    prismaMock.submission.findMany.mockResolvedValue([])
    prismaMock.submission.count.mockResolvedValue(0)
    prismaMock.submission.findFirst.mockResolvedValue(null)
    prismaMock.institutionSetting.findUnique.mockResolvedValue({ value: 'false' })
    statusServiceMock.getNonTerminalCodes.mockResolvedValue([
      'SUBMITTED', 'IN_TRIAGE', 'ASSIGNED', 'ASSIGNED_SECONDARY', 'IN_REVIEW', 'PENDING_REVISION', 'REVISION_DRAFT',
    ])
    coiServiceMock.buildReviewerConflictExclusion.mockResolvedValue({
      blockAll: false,
      submissionIds: [],
      userIds: ['rev-1'],
      departments: [],
    })
    reviewRoundServiceMock.getPreviousRound.mockResolvedValue({ id: 'round-1' })
  })

  test('returns empty general list when peer visibility is disabled', async () => {
    const { req, res, next } = makeReviewerContext()
    await list(req, res, next)

    expect(prismaMock.submission.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: { in: [] },
        isActive: true,
      }),
    }))
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: [] }))
    expect(next).not.toHaveBeenCalled()
    expect(coiServiceMock.buildReviewerConflictExclusion).not.toHaveBeenCalled()
  })

  test('lists peer-visible submissions only (excludes own assignments) when enabled', async () => {
    prismaMock.institutionSetting.findUnique.mockResolvedValue({ value: 'true' })
    coiServiceMock.buildReviewerConflictExclusion.mockResolvedValue({
      blockAll: false,
      submissionIds: ['sub-locked'],
      userIds: ['rev-1', 'author-2'],
      departments: ['medicine'],
    })

    const { req, next } = makeReviewerContext()
    await list(req, { json: jest.fn() }, next)

    const where = prismaMock.submission.findMany.mock.calls[0][0].where
    expect(where.OR).toHaveLength(1)
    expect(where.OR[0]).toEqual(expect.objectContaining({
      status: { in: expect.arrayContaining(['SUBMITTED', 'APPROVED']) },
      authorId: { notIn: ['rev-1', 'author-2'] },
      id: { notIn: ['sub-locked'] },
    }))
    expect(where.OR[0].status.in).not.toContain('DRAFT')
    expect(where.OR[0].NOT).toEqual([
      { author: { is: { department: { equals: 'medicine', mode: 'insensitive' } } } },
    ])
    expect(next).not.toHaveBeenCalled()
  })

  test('returns empty general list when global COI blocks peer visibility', async () => {
    prismaMock.institutionSetting.findUnique.mockResolvedValue({ value: 'true' })
    coiServiceMock.buildReviewerConflictExclusion.mockResolvedValue({
      blockAll: true,
      submissionIds: [],
      userIds: ['rev-1'],
      departments: [],
    })

    const { req, next } = makeReviewerContext()
    await list(req, { json: jest.fn() }, next)

    const where = prismaMock.submission.findMany.mock.calls[0][0].where
    expect(where.id).toEqual({ in: [] })
    expect(next).not.toHaveBeenCalled()
  })

  test('applies COI exclusion to direct getById access for reviewer', async () => {
    prismaMock.institutionSetting.findUnique.mockResolvedValue({ value: 'true' })
    coiServiceMock.buildReviewerConflictExclusion.mockResolvedValue({
      blockAll: false,
      submissionIds: ['sub-locked'],
      userIds: ['rev-1'],
      departments: [],
    })

    const { req, res, next } = makeReviewerContext({ params: { id: 'sub-locked' } })
    await getById(req, res, next)

    const where = prismaMock.submission.findFirst.mock.calls[0][0].where
    expect(where.AND[0].OR[2].id).toEqual({ notIn: ['sub-locked'] })
    expect(where.AND[1].OR).toEqual([{ id: 'sub-locked' }, { applicationId: 'sub-locked' }])
    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0][0].code).toBe('NOT_FOUND')
    expect(res.json).not.toHaveBeenCalled()
  })

  test('blocks previous-round data when reviewer cannot see submission', async () => {
    const { req, res, next } = makeReviewerContext({ params: { id: 'sub-hidden' } })

    await previousRound(req, res, next)

    expect(prismaMock.submission.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: 'sub-hidden',
        isActive: true,
      }),
      select: { id: true },
    }))
    expect(reviewRoundServiceMock.getPreviousRound).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0][0].code).toBe('NOT_FOUND')
    expect(res.json).not.toHaveBeenCalled()
  })
})
