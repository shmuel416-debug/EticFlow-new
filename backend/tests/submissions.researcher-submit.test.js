/**
 * EthicFlow — researcher submission controller regression tests.
 * Ensures primary submission entry starts SLA tracking.
 */

import { jest } from '@jest/globals'

const prismaMock = {
  submission: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
}

const slaServiceMock = {
  setDueDates: jest.fn(),
}

jest.unstable_mockModule('../src/config/database.js', () => ({
  default: prismaMock,
}))
jest.unstable_mockModule('../src/services/sla.service.js', () => slaServiceMock)

const { researcherSubmit } = await import('../src/controllers/submissions.controller.js')

/**
 * Builds request/response/next test doubles for researcher submit.
 * @returns {{ req: object, res: object, next: jest.Mock }}
 */
function makeContext() {
  return {
    req: { params: { id: 'sub-1' }, user: { id: 'author-1' } },
    res: { locals: {}, json: jest.fn() },
    next: jest.fn(),
  }
}

describe('researcherSubmit', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    slaServiceMock.setDueDates.mockResolvedValue(undefined)
  })

  test('sets SUBMITTED status and starts the triage SLA clock', async () => {
    prismaMock.submission.findFirst.mockResolvedValue({
      id: 'sub-1',
      authorId: 'author-1',
      status: 'DRAFT',
      isActive: true,
    })
    prismaMock.submission.update.mockResolvedValue({
      id: 'sub-1',
      status: 'SUBMITTED',
      submittedAt: new Date('2026-05-19T10:00:00Z'),
    })

    const { req, res, next } = makeContext()
    await researcherSubmit(req, res, next)

    expect(prismaMock.submission.update).toHaveBeenCalledWith({
      where: { id: 'sub-1' },
      data: { status: 'SUBMITTED', submittedAt: expect.any(Date) },
    })
    expect(slaServiceMock.setDueDates).toHaveBeenCalledWith('sub-1', 'SUBMITTED')
    expect(res.locals.entityId).toBe('sub-1')
    expect(res.json).toHaveBeenCalledWith({
      submission: expect.objectContaining({ id: 'sub-1', status: 'SUBMITTED' }),
    })
    expect(next).not.toHaveBeenCalled()
  })
})
