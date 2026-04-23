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

const { listReviewers } = await import('../src/controllers/users.controller.js')

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
    ])
    coiServiceMock.mapReviewerConflicts.mockImplementation(async (rows) =>
      rows.map((row) => ({ ...row, hasConflict: false, conflictReasons: [] }))
    )
  })

  test('includes multi-role reviewer in default list', async () => {
    const { req, res, next } = makeContext()
    await listReviewers(req, res, next)
    expect(res.json).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          id: 'u-1',
          roles: expect.arrayContaining(['RESEARCHER', 'REVIEWER']),
        }),
      ],
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
