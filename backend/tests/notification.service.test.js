/**
 * Ethic-Net — notification service tests
 * Verifies status-change notifications route to the expected recipients.
 */

import { jest } from '@jest/globals'

const prismaMock = {
  notification: {
    create: jest.fn(),
  },
  user: {
    findMany: jest.fn(),
  },
}

const emailServiceMock = {
  sendEmail: jest.fn(),
}

const statusServiceMock = {
  getNotificationType: jest.fn(),
}

jest.unstable_mockModule('../src/config/database.js', () => ({
  default: prismaMock,
}))
jest.unstable_mockModule('../src/services/email/email.service.js', () => emailServiceMock)
jest.unstable_mockModule('../src/services/status.service.js', () => statusServiceMock)

const { notifyStatusChange } = await import('../src/services/notification.service.js')

describe('notification.service notifyStatusChange', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    prismaMock.notification.create.mockResolvedValue({})
    emailServiceMock.sendEmail.mockResolvedValue(undefined)
  })

  test('notifies active secretary and admin users when a submission is received', async () => {
    statusServiceMock.getNotificationType.mockResolvedValue('SUBMISSION_RECEIVED')
    prismaMock.user.findMany.mockResolvedValue([
      { id: 'secretary-1', email: 'secretary@test.com' },
      { id: 'admin-1', email: 'admin@test.com' },
    ])

    await notifyStatusChange({
      id: 'sub-1',
      applicationId: 'ETH-2026-001',
      title: 'Clinical study',
    }, 'SUBMITTED')

    expect(prismaMock.user.findMany).toHaveBeenCalledWith({
      where:  { isActive: true, roles: { hasSome: ['SECRETARY', 'ADMIN'] } },
      select: { id: true, email: true },
    })
    expect(prismaMock.notification.create).toHaveBeenCalledTimes(2)
    expect(prismaMock.notification.create).toHaveBeenCalledWith({
      data: {
        userId: 'secretary-1',
        type: 'SUBMISSION_RECEIVED',
        titleKey: 'notifications.types.SUBMISSION_RECEIVED',
        bodyKey: 'notifications.types.SUBMISSION_RECEIVED',
        metaJson: { applicationId: 'ETH-2026-001', title: 'Clinical study' },
      },
    })
    expect(emailServiceMock.sendEmail).toHaveBeenCalledTimes(2)
  })
})
