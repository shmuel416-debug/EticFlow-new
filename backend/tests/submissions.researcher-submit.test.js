/**
 * Ethic-Net — researcher submission controller tests
 * Verifies primary submit path initializes downstream workflow side effects.
 */

import { jest } from '@jest/globals'

const prismaMock = {
  submission: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
}

const notificationServiceMock = {
  notifyStatusChange: jest.fn(),
}

const slaServiceMock = {
  setDueDates: jest.fn(),
}

jest.unstable_mockModule('../src/config/database.js', () => ({
  default: prismaMock,
}))
jest.unstable_mockModule('../src/services/notification.service.js', () => notificationServiceMock)
jest.unstable_mockModule('../src/services/sla.service.js', () => slaServiceMock)

const { researcherSubmit } = await import('../src/controllers/submissions.controller.js')

/**
 * Builds default Express-like request objects.
 * @returns {{ req: object, res: object, next: Function }}
 */
function makeContext() {
  const req = {
    params: { id: 'sub-1' },
    user: { id: 'author-1', roles: ['RESEARCHER'] },
  }
  const res = {
    locals: {},
    json: jest.fn(),
  }
  const next = jest.fn()
  return { req, res, next }
}

describe('submissions.controller researcherSubmit', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    slaServiceMock.setDueDates.mockResolvedValue(undefined)
    notificationServiceMock.notifyStatusChange.mockResolvedValue(undefined)
  })

  test('initializes SLA due dates and submission-received notifications', async () => {
    const updated = {
      id: 'sub-1',
      status: 'SUBMITTED',
      applicationId: 'ETH-2026-001',
      authorId: 'author-1',
      title: 'Clinical study',
    }
    prismaMock.submission.findFirst.mockResolvedValue({
      id: 'sub-1',
      status: 'DRAFT',
      authorId: 'author-1',
      isActive: true,
    })
    prismaMock.submission.update.mockResolvedValue(updated)

    const { req, res, next } = makeContext()
    await researcherSubmit(req, res, next)

    expect(prismaMock.submission.update).toHaveBeenCalledWith({
      where: { id: 'sub-1' },
      data:  { status: 'SUBMITTED', submittedAt: expect.any(Date) },
    })
    expect(slaServiceMock.setDueDates).toHaveBeenCalledWith('sub-1', 'SUBMITTED')
    expect(notificationServiceMock.notifyStatusChange).toHaveBeenCalledWith(updated, 'SUBMITTED')
    expect(res.locals.entityId).toBe('sub-1')
    expect(res.json).toHaveBeenCalledWith({ submission: updated })
    expect(next).not.toHaveBeenCalled()
  })
})
