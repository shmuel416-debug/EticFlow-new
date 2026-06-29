/**
 * Ethic-Net — SLA service tests
 */

import { jest } from '@jest/globals'

const prismaMock = {
  institutionSetting: {
    findMany: jest.fn(),
  },
  sLATracking: {
    findMany: jest.fn(),
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

const { runSlaCheck } = await import('../src/services/sla.service.js')

describe('sla.service runSlaCheck', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    prismaMock.institutionSetting.findMany.mockResolvedValue([])
    prismaMock.sLATracking.findMany.mockResolvedValue([])
    prismaMock.user.findMany.mockResolvedValue([])
    statusServiceMock.getNonTerminalCodes.mockResolvedValue(['SUBMITTED', 'IN_REVIEW'])
  })

  test('loads escalation users using multi-role array filtering', async () => {
    await runSlaCheck()

    expect(prismaMock.user.findMany).toHaveBeenCalledWith({
      where: {
        isActive: true,
        roles: { hasSome: ['SECRETARY', 'CHAIRMAN', 'ADMIN'] },
      },
      select: { id: true },
    })
  })
})
