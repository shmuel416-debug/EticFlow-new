/**
 * EthicFlow — submissions COI candidates tests
 */

import { jest } from '@jest/globals'

const prismaMock = {
  submission: {
    findMany: jest.fn(),
  },
}

const rolesMock = {
  getRequestRole: jest.fn(),
  hasAnyRole: jest.fn(),
}

jest.unstable_mockModule('../src/config/database.js', () => ({
  default: prismaMock,
}))

jest.unstable_mockModule('../src/utils/roles.js', () => rolesMock)

const { listCoiCandidates } = await import('../src/controllers/submissions.controller.js')

function makeContext(query = {}, role = 'SECRETARY') {
  rolesMock.getRequestRole.mockReturnValue(role)
  const req = { query, user: { id: 'user-1', roles: [role] } }
  const res = { json: jest.fn() }
  const next = jest.fn()
  return { req, res, next }
}

describe('submissions.controller listCoiCandidates', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    prismaMock.submission.findMany.mockResolvedValue([
      { id: 'sub-1', applicationId: 'ETH-2026-001', title: 'Study A' },
      { id: 'sub-2', applicationId: 'ETH-2026-002', title: 'Study B' },
    ])
  })

  test('returns lightweight options with bounded limit and search', async () => {
    const { req, res, next } = makeContext({ search: 'ETH-2026', limit: '999' }, 'SECRETARY')
    await listCoiCandidates(req, res, next)

    expect(prismaMock.submission.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.any(Object),
      select: { id: true, applicationId: true, title: true },
      take: 100,
    }))
    expect(res.json).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ id: 'sub-1', applicationId: 'ETH-2026-001' }),
      ]),
    })
    expect(next).not.toHaveBeenCalled()
  })
})
