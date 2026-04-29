/**
 * EthicFlow — users controller multi-role tests
 */

import { jest } from '@jest/globals'

const prismaMock = {
  user: {
    findMany: jest.fn(),
  },
}

const coiServiceMock = {
  mapReviewerConflicts: jest.fn(),
}

jest.unstable_mockModule('../src/config/database.js', () => ({
  default: prismaMock,
}))
jest.unstable_mockModule('../src/services/coi.service.js', () => coiServiceMock)

const { listReviewers, listResearchers, listDepartments } = await import('../src/controllers/users.controller.js')

function makeContext(query = {}) {
  const req = { query, user: { id: 'sec-1' } }
  const res = { json: jest.fn() }
  const next = jest.fn()
  return { req, res, next }
}

describe('users.controller listReviewers multi-role', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    prismaMock.user.findMany.mockResolvedValue([
      {
        id: 'u-1',
        fullName: 'Dual Role Reviewer',
        email: 'dual@test.com',
        department: 'Bio',
        roles: ['RESEARCHER', 'REVIEWER'],
      },
      {
        id: 'u-2',
        fullName: 'Chair Reviewer',
        email: 'chair@test.com',
        department: 'Ethics',
        roles: ['RESEARCHER', 'CHAIRMAN'],
      },
    ])
    coiServiceMock.mapReviewerConflicts.mockImplementation(async (rows) =>
      rows.map((row) => ({ ...row, hasConflict: false, conflictReasons: [] }))
    )
  })

  test('includes multi-role reviewer in default list', async () => {
    const { req, res, next } = makeContext()
    await listReviewers(req, res, next)
    expect(prismaMock.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        isActive: true,
        roles: { hasSome: ['REVIEWER', 'CHAIRMAN'] },
      }),
    }))
    expect(res.json).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          id: 'u-1',
          roles: expect.arrayContaining(['RESEARCHER', 'REVIEWER']),
        }),
        expect.objectContaining({
          id: 'u-2',
          roles: expect.arrayContaining(['RESEARCHER', 'CHAIRMAN']),
        }),
      ]),
    })
    expect(next).not.toHaveBeenCalled()
  })

  test('annotates reviewers when submissionId is provided', async () => {
    const { req, res, next } = makeContext({ submissionId: 'sub-1' })
    await listReviewers(req, res, next)
    expect(coiServiceMock.mapReviewerConflicts).toHaveBeenCalledWith(expect.any(Array), 'sub-1')
    expect(next).not.toHaveBeenCalled()
  })
})

describe('users.controller listResearchers', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    prismaMock.user.findMany.mockResolvedValue([
      {
        id: 'u-r1',
        fullName: 'Researcher One',
        email: 'r1@test.com',
        department: 'Biology',
      },
    ])
  })

  test('returns non-committee active researchers with bounded limit', async () => {
    const { req, res, next } = makeContext({ search: 'research', limit: '200' })
    await listResearchers(req, res, next)
    expect(prismaMock.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        isActive: true,
        NOT: { roles: { hasSome: ['SECRETARY', 'REVIEWER', 'CHAIRMAN', 'ADMIN'] } },
        OR: expect.any(Array),
      }),
      take: 100,
    }))
    expect(res.json).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          id: 'u-r1',
          fullName: 'Researcher One',
        }),
      ]),
    })
    expect(next).not.toHaveBeenCalled()
  })
})

describe('users.controller listDepartments', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    prismaMock.user.findMany.mockResolvedValue([
      { department: 'Computer Science' },
      { department: 'Psychology' },
    ])
  })

  test('returns filtered distinct departments with bounded limit', async () => {
    const { req, res, next } = makeContext({ search: 'comp', limit: '999' })
    await listDepartments(req, res, next)
    expect(prismaMock.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        isActive: true,
        NOT: { roles: { hasSome: ['SECRETARY', 'REVIEWER', 'CHAIRMAN', 'ADMIN'] } },
        department: expect.objectContaining({ contains: 'comp', mode: 'insensitive' }),
      }),
      distinct: ['department'],
      take: 100,
    }))
    expect(res.json).toHaveBeenCalledWith({ data: ['Computer Science', 'Psychology'] })
    expect(next).not.toHaveBeenCalled()
  })
})
