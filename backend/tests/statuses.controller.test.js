/**
 * EthicFlow — statuses.controller unit tests
 */

import { jest } from '@jest/globals'

const prismaMock = {
  submission: {
    findFirst: jest.fn(),
  },
}

const statusServiceMock = {
  getAllowedTransitions: jest.fn(),
  invalidateStatusCache: jest.fn(),
  listStatuses: jest.fn(),
  can: jest.fn(),
}

const rolesMock = {
  getRequestRole: jest.fn(),
}

jest.unstable_mockModule('../src/config/database.js', () => ({
  default: prismaMock,
}))

jest.unstable_mockModule('../src/services/status.service.js', () => statusServiceMock)
jest.unstable_mockModule('../src/utils/roles.js', () => rolesMock)

const { getStatusConfig } = await import('../src/controllers/statuses.controller.js')

/**
 * Creates a minimal Express-like context for controller tests.
 * @param {object} query
 * @param {object} user
 * @returns {{ req: object, res: object, next: Function }}
 */
function makeContext(query, user) {
  const req = { query, user }
  const res = { json: jest.fn() }
  const next = jest.fn()
  return { req, res, next }
}

describe('statuses.controller getStatusConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    statusServiceMock.listStatuses.mockResolvedValue([{ code: 'IN_TRIAGE' }])
    statusServiceMock.getAllowedTransitions.mockResolvedValue({
      transitions: [{ fromCode: 'IN_TRIAGE', toCode: 'ASSIGNED' }],
    })
  })

  test('scopes researcher submission config lookups to owned submissions', async () => {
    rolesMock.getRequestRole.mockReturnValue('RESEARCHER')
    prismaMock.submission.findFirst.mockResolvedValue(null)
    const user = { id: 'researcher-1', roles: ['RESEARCHER'] }
    const { req, res, next } = makeContext({ submissionId: 'sub-private', status: 'IN_TRIAGE' }, user)

    await getStatusConfig(req, res, next)

    expect(prismaMock.submission.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'sub-private', isActive: true, authorId: 'researcher-1' },
    }))
    expect(statusServiceMock.getAllowedTransitions).not.toHaveBeenCalled()
    expect(res.json).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: 'NOT_FOUND' }))
  })

  test('scopes reviewer submission config lookups to assigned submissions', async () => {
    rolesMock.getRequestRole.mockReturnValue('REVIEWER')
    const submission = {
      id: 'sub-assigned',
      status: 'IN_TRIAGE',
      reviewerId: 'reviewer-1',
      authorId: 'researcher-1',
    }
    prismaMock.submission.findFirst.mockResolvedValue(submission)
    const user = { id: 'reviewer-1', roles: ['REVIEWER'] }
    const { req, res, next } = makeContext({ submissionId: 'sub-assigned', status: 'IN_TRIAGE' }, user)

    await getStatusConfig(req, res, next)

    expect(prismaMock.submission.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'sub-assigned', isActive: true, reviewerId: 'reviewer-1' },
    }))
    expect(statusServiceMock.getAllowedTransitions).toHaveBeenCalledWith('IN_TRIAGE', 'REVIEWER', submission)
    expect(res.json).toHaveBeenCalledWith({
      data: {
        statuses: [{ code: 'IN_TRIAGE' }],
        transitionsByFromCode: { IN_TRIAGE: [{ fromCode: 'IN_TRIAGE', toCode: 'ASSIGNED' }] },
      },
    })
    expect(next).not.toHaveBeenCalled()
  })

  test('allows staff submission config lookups without owner filters', async () => {
    rolesMock.getRequestRole.mockReturnValue('SECRETARY')
    prismaMock.submission.findFirst.mockResolvedValue({
      id: 'sub-visible',
      status: 'IN_TRIAGE',
      reviewerId: null,
      authorId: 'researcher-1',
    })
    const user = { id: 'secretary-1', roles: ['SECRETARY'] }
    const { req, res, next } = makeContext({ submissionId: 'sub-visible', status: 'IN_TRIAGE' }, user)

    await getStatusConfig(req, res, next)

    expect(prismaMock.submission.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'sub-visible', isActive: true },
    }))
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: expect.any(Object) }))
    expect(next).not.toHaveBeenCalled()
  })
})
