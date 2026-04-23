/**
 * EthicFlow — Meetings attendee role guard tests
 * Validates server-side role enforcement for attendee creation and invite endpoints.
 */

import { jest } from '@jest/globals'

const prismaMock = {
  user: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  meeting: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  meetingAttendee: {
    upsert: jest.fn(),
  },
}

const calendarServiceMock = {
  createEvent: jest.fn(),
  updateEvent: jest.fn(),
  deleteEvent: jest.fn(),
}

const recordAuditEntryMock = jest.fn()

jest.unstable_mockModule('../src/config/database.js', () => ({
  default: prismaMock,
}))

jest.unstable_mockModule('../src/services/calendar/calendar.service.js', () => calendarServiceMock)

jest.unstable_mockModule('../src/middleware/audit.js', () => ({
  recordAuditEntry: recordAuditEntryMock,
}))

const { create, addAttendee } = await import('../src/controllers/meetings.controller.js')
const { AppError } = await import('../src/utils/errors.js')

/**
 * Builds Express-like controller test context.
 * @param {object} options
 * @returns {{ req: object, res: object, next: Function }}
 */
function makeContext(options = {}) {
  const req = {
    params: options.params ?? {},
    body: options.body ?? {},
    user: options.user ?? { id: 'admin-1' },
    headers: options.headers ?? { 'user-agent': 'jest' },
    socket: { remoteAddress: '127.0.0.1' },
  }
  const res = {
    locals: {},
    statusCode: 200,
    status: jest.fn((code) => {
      res.statusCode = code
      return res
    }),
    json: jest.fn(),
  }
  const next = jest.fn()
  return { req, res, next }
}

describe('meetings.controller attendee role guards', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('create rejects attendeeIds containing RESEARCHER role', async () => {
    prismaMock.user.findMany.mockResolvedValue([
      { id: 'u-researcher', fullName: 'Research User', email: 'r@test.com', roles: ['RESEARCHER'], isActive: true },
    ])

    const { req, res, next } = makeContext({
      body: {
        title: 'Weekly Ethics Committee',
        scheduledAt: new Date().toISOString(),
        attendeeIds: ['u-researcher'],
      },
    })

    await create(req, res, next)

    expect(prismaMock.meeting.create).not.toHaveBeenCalled()
    expect(recordAuditEntryMock).toHaveBeenCalledTimes(1)
    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0][0]).toBeInstanceOf(AppError)
    expect(next.mock.calls[0][0].code).toBe('ROLE_NOT_ALLOWED')
    expect(next.mock.calls[0][0].statusCode).toBe(400)
  })

  test('addAttendee rejects inactive user', async () => {
    prismaMock.meeting.findUnique.mockResolvedValue({ id: 'm-1', isActive: true })
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u-secretary',
      fullName: 'Inactive Secretary',
      roles: ['RESEARCHER', 'SECRETARY'],
      email: 'sec@test.com',
      isActive: false,
    })

    const { req, res, next } = makeContext({
      params: { id: 'm-1' },
      body: { userId: 'u-secretary' },
    })

    await addAttendee(req, res, next)

    expect(prismaMock.meetingAttendee.upsert).not.toHaveBeenCalled()
    expect(recordAuditEntryMock).toHaveBeenCalledTimes(1)
    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0][0]).toBeInstanceOf(AppError)
    expect(next.mock.calls[0][0].code).toBe('USER_INACTIVE')
  })

  test('addAttendee rejects non-committee role', async () => {
    prismaMock.meeting.findUnique.mockResolvedValue({ id: 'm-1', isActive: true })
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u-researcher',
      fullName: 'Research User',
      roles: ['RESEARCHER'],
      email: 'r@test.com',
      isActive: true,
    })

    const { req, res, next } = makeContext({
      params: { id: 'm-1' },
      body: { userId: 'u-researcher' },
    })

    await addAttendee(req, res, next)

    expect(prismaMock.meetingAttendee.upsert).not.toHaveBeenCalled()
    expect(recordAuditEntryMock).toHaveBeenCalledTimes(1)
    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0][0]).toBeInstanceOf(AppError)
    expect(next.mock.calls[0][0].code).toBe('ROLE_NOT_ALLOWED')
  })

  test('addAttendee allows committee role', async () => {
    prismaMock.meeting.findUnique.mockResolvedValue({ id: 'm-2', isActive: true })
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u-reviewer',
      fullName: 'Reviewer User',
      roles: ['RESEARCHER', 'REVIEWER'],
      email: 'rev@test.com',
      isActive: true,
    })
    prismaMock.meetingAttendee.upsert.mockResolvedValue({
      meetingId: 'm-2',
      userId: 'u-reviewer',
      user: {
        id: 'u-reviewer',
        fullName: 'Reviewer User',
        roles: ['RESEARCHER', 'REVIEWER'],
        email: 'rev@test.com',
      },
    })

    const { req, res, next } = makeContext({
      params: { id: 'm-2' },
      body: { userId: 'u-reviewer' },
    })

    await addAttendee(req, res, next)

    expect(prismaMock.meetingAttendee.upsert).toHaveBeenCalledTimes(1)
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: 'u-reviewer' }),
    })
    expect(recordAuditEntryMock).not.toHaveBeenCalled()
    expect(next).not.toHaveBeenCalled()
  })
})
