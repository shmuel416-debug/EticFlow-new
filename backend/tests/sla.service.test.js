/**
 * EthicFlow — SLA service regression tests.
 * Covers due-date initialization and nightly escalation user lookup.
 */

import { jest } from '@jest/globals'

const prismaMock = {
  institutionSetting: {
    findMany: jest.fn(),
  },
  sLATracking: {
    findMany: jest.fn(),
    update: jest.fn(),
  },
  user: {
    findMany: jest.fn(),
  },
}

const notificationServiceMock = {
  notifyUser: jest.fn(),
}

const statusServiceMock = {
  getNonTerminalCodes: jest.fn(),
  getSlaPhase: jest.fn(),
}

jest.unstable_mockModule('../src/config/database.js', () => ({
  default: prismaMock,
}))
jest.unstable_mockModule('../src/services/notification.service.js', () => notificationServiceMock)
jest.unstable_mockModule('../src/services/status.service.js', () => statusServiceMock)

const { runSlaCheck, setDueDates } = await import('../src/services/sla.service.js')

describe('sla.service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    prismaMock.institutionSetting.findMany.mockResolvedValue([])
    prismaMock.sLATracking.findMany.mockResolvedValue([])
    prismaMock.sLATracking.update.mockResolvedValue({})
    prismaMock.user.findMany.mockResolvedValue([])
    statusServiceMock.getNonTerminalCodes.mockResolvedValue(['SUBMITTED'])
    statusServiceMock.getSlaPhase.mockResolvedValue(null)
  })

  test('runSlaCheck queries escalation users by roles array', async () => {
    await runSlaCheck()

    expect(prismaMock.user.findMany).toHaveBeenCalledWith({
      where: {
        isActive: true,
        roles: { hasSome: ['SECRETARY', 'CHAIRMAN', 'ADMIN'] },
      },
      select: { id: true },
    })
  })

  test('setDueDates initializes triage due date when a submission is submitted', async () => {
    await setDueDates('sub-1', 'SUBMITTED')

    expect(prismaMock.sLATracking.update).toHaveBeenCalledWith({
      where: { submissionId: 'sub-1' },
      data: { triageDue: expect.any(Date) },
    })
  })
})
