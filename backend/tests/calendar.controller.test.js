/**
 * EthicFlow — Personal calendar controller tests
 * Covers connect/callback/preferences/disconnect core flows.
 */

import { jest } from '@jest/globals'

const prismaMock = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
}

const userCalendarServiceMock = {
  getUserCalendarStatus: jest.fn(),
  upsertUserCalendarConnection: jest.fn(),
  disconnectUserCalendar: jest.fn(),
}

const googleProviderMock = {
  getAuthUrl: jest.fn(),
  exchangeCode: jest.fn(),
}

const microsoftProviderMock = {
  getAuthUrl: jest.fn(),
  exchangeCode: jest.fn(),
}

const jwtMock = {
  sign: jest.fn(() => 'signed-state-token'),
  verify: jest.fn(),
}

jest.unstable_mockModule('../src/config/database.js', () => ({
  default: prismaMock,
}))

jest.unstable_mockModule('../src/config/auth.js', () => ({
  default: {
    jwt: { secret: 'test-secret', expiresIn: '8h' },
  },
}))

jest.unstable_mockModule('jsonwebtoken', () => ({
  default: jwtMock,
}))

jest.unstable_mockModule('../src/services/calendar/user-calendar.service.js', () => userCalendarServiceMock)
jest.unstable_mockModule('../src/services/calendar/user-google.provider.js', () => googleProviderMock)
jest.unstable_mockModule('../src/services/calendar/user-microsoft.provider.js', () => microsoftProviderMock)

const controller = await import('../src/controllers/calendar.controller.js')
const { AppError } = await import('../src/utils/errors.js')

/**
 * Creates a minimal request/response context for controller tests.
 * @returns {{ req: any, res: any, next: Function }}
 */
function makeContext() {
  const req = {
    user: { id: 'user-1', role: 'SECRETARY' },
    body: {},
    params: {},
    query: {},
  }
  const res = {
    locals: {},
    json: jest.fn(),
    redirect: jest.fn(),
  }
  const next = jest.fn()
  return { req, res, next }
}

describe('calendar.controller', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.FRONTEND_URL = 'http://localhost:5173'
  })

  test('status returns user calendar status payload', async () => {
    userCalendarServiceMock.getUserCalendarStatus.mockResolvedValue({
      connected: true,
      provider: 'GOOGLE',
      syncEnabled: true,
      email: 'demo@example.com',
      tokenExpiry: null,
      stats: { pending: 0, failed: 0, synced: 2 },
      lastSyncAt: null,
    })

    const { req, res, next } = makeContext()
    await controller.status(req, res, next)

    expect(userCalendarServiceMock.getUserCalendarStatus).toHaveBeenCalledWith('user-1')
    expect(res.json).toHaveBeenCalledWith({
      data: expect.objectContaining({ connected: true, provider: 'GOOGLE' }),
    })
    expect(next).not.toHaveBeenCalled()
  })

  test('connect redirects authenticated user to provider OAuth URL', async () => {
    googleProviderMock.getAuthUrl.mockReturnValue('https://accounts.google.com/o/oauth2/v2/auth')
    const { req, res, next } = makeContext()
    req.params.provider = 'google'

    await controller.connect(req, res, next)

    expect(jwtMock.sign).toHaveBeenCalledTimes(1)
    expect(googleProviderMock.getAuthUrl).toHaveBeenCalledWith('signed-state-token')
    expect(res.redirect).toHaveBeenCalledWith('https://accounts.google.com/o/oauth2/v2/auth')
    expect(next).not.toHaveBeenCalled()
  })

  test('callback exchanges code and stores calendar connection', async () => {
    jwtMock.verify.mockReturnValue({
      typ: 'calendar-connect',
      uid: 'user-1',
      provider: 'google',
    })
    googleProviderMock.exchangeCode.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiryDate: new Date('2026-04-22T12:00:00Z'),
      email: 'user@example.com',
    })

    const { req, res } = makeContext()
    req.params.provider = 'google'
    req.query = { code: 'abc', state: 'signed-state-token' }

    await controller.callback(req, res, jest.fn())

    expect(googleProviderMock.exchangeCode).toHaveBeenCalledWith('abc')
    expect(userCalendarServiceMock.upsertUserCalendarConnection).toHaveBeenCalledWith({
      userId: 'user-1',
      provider: 'GOOGLE',
      email: 'user@example.com',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiryDate: new Date('2026-04-22T12:00:00Z'),
    })
    expect(res.redirect).toHaveBeenCalledWith('http://localhost:5173/settings?calendar=connected&provider=google')
  })

  test('updatePreferences rejects enabling sync without connected provider', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ calendarProvider: 'NONE' })
    const { req, res, next } = makeContext()
    req.body = { syncEnabled: true }

    await controller.updatePreferences(req, res, next)

    expect(res.json).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0][0]).toBeInstanceOf(AppError)
    expect(next.mock.calls[0][0].code).toBe('CALENDAR_NOT_CONNECTED')
  })

  test('disconnect clears user calendar connection', async () => {
    const { req, res, next } = makeContext()
    await controller.disconnect(req, res, next)

    expect(userCalendarServiceMock.disconnectUserCalendar).toHaveBeenCalledWith('user-1')
    expect(res.json).toHaveBeenCalledWith({ success: true })
    expect(next).not.toHaveBeenCalled()
  })
})
