/**
 * EthicFlow — Auth exchange-code controller tests
 * Verifies one-time code exchange success and failure paths.
 */

import { jest } from '@jest/globals'

const prismaMock = {
  user: {
    findFirst: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
  authExchangeCode: {
    create: jest.fn(),
    findUnique: jest.fn(),
    updateMany: jest.fn(),
  },
}

jest.unstable_mockModule('../src/config/database.js', () => ({
  default: prismaMock,
}))

jest.unstable_mockModule('jsonwebtoken', () => ({
  default: {
    sign: jest.fn(() => 'signed.jwt.token'),
    verify: jest.fn(),
  },
}))

jest.unstable_mockModule('../src/services/email/email.service.js', () => ({
  sendEmail: jest.fn(),
}))

jest.unstable_mockModule('../src/services/auth/google.provider.js', () => ({
  getAuthUrl: jest.fn(),
  exchangeCode: jest.fn(),
}))

jest.unstable_mockModule('../src/services/auth/microsoft.provider.js', () => ({
  getAuthUrl: jest.fn(),
  exchangeCode: jest.fn(),
}))

const microsoftAuth = await import('../src/services/auth/microsoft.provider.js')
const { exchangeCode, microsoftCallback } = await import('../src/controllers/auth.controller.js')
const { AppError } = await import('../src/utils/errors.js')

/**
 * Builds minimal Express-like req/res/next mocks for controller tests.
 * @param {string} code
 * @returns {{ req: object, res: object, next: Function }}
 */
function makeContext(code = 'a'.repeat(64)) {
  const req = { body: { code } }
  const res = {
    locals: {},
    json: jest.fn(),
  }
  const next = jest.fn()
  return { req, res, next }
}

/**
 * Builds minimal Express-like req/res mocks for OAuth callback tests.
 * @returns {{ req: object, res: object, next: Function }}
 */
function makeCallbackContext() {
  const req = {
    query: { code: 'oauth-code', state: 'state-1' },
    cookies: { ms_oauth_state: 'state-1' },
    get: jest.fn(() => null),
    requestId: 'req-1',
  }
  const res = {
    locals: {},
    clearCookie: jest.fn(),
    redirect: jest.fn(),
  }
  const next = jest.fn()
  return { req, res, next }
}

describe('auth.controller exchangeCode', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('exchanges valid code once and returns JWT + safe user', async () => {
    const nowPlus = new Date(Date.now() + 60_000)
    prismaMock.authExchangeCode.findUnique.mockResolvedValue({
      id: 'ex-1',
      isActive: true,
      usedAt: null,
      expiresAt: nowPlus,
      user: {
        id: 'u-1',
        email: 'researcher@test.com',
        role: 'RESEARCHER',
        fullName: 'Test User',
        isActive: true,
        passwordHash: 'secret',
        resetToken: 'reset',
        resetTokenExpiry: new Date(),
      },
    })
    prismaMock.authExchangeCode.updateMany.mockResolvedValue({ count: 1 })

    const { req, res, next } = makeContext()
    await exchangeCode(req, res, next)

    expect(prismaMock.authExchangeCode.findUnique).toHaveBeenCalledTimes(1)
    expect(prismaMock.authExchangeCode.updateMany).toHaveBeenCalledTimes(1)
    expect(res.locals.entityId).toBe('u-1')
    expect(res.json).toHaveBeenCalledWith({
      user: expect.objectContaining({
        id: 'u-1',
        email: 'researcher@test.com',
      }),
      token: 'signed.jwt.token',
    })
    expect(res.json.mock.calls[0][0].user.passwordHash).toBeUndefined()
    expect(next).not.toHaveBeenCalled()
  })

  test('rejects when code is expired', async () => {
    prismaMock.authExchangeCode.findUnique.mockResolvedValue({
      id: 'ex-2',
      isActive: true,
      usedAt: null,
      expiresAt: new Date(Date.now() - 10_000),
      user: { id: 'u-2', isActive: true },
    })

    const { req, res, next } = makeContext()
    await exchangeCode(req, res, next)

    expect(res.json).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0][0]).toBeInstanceOf(AppError)
    expect(next.mock.calls[0][0].code).toBe('INVALID_EXCHANGE_CODE')
    expect(next.mock.calls[0][0].statusCode).toBe(401)
  })

  test('rejects replay when consume update affects zero rows', async () => {
    prismaMock.authExchangeCode.findUnique.mockResolvedValue({
      id: 'ex-3',
      isActive: true,
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      user: { id: 'u-3', isActive: true },
    })
    prismaMock.authExchangeCode.updateMany.mockResolvedValue({ count: 0 })

    const { req, res, next } = makeContext()
    await exchangeCode(req, res, next)

    expect(res.json).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0][0]).toBeInstanceOf(AppError)
    expect(next.mock.calls[0][0].code).toBe('INVALID_EXCHANGE_CODE')
    expect(next.mock.calls[0][0].statusCode).toBe(401)
  })
})

describe('auth.controller microsoftCallback', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('rejects email collision with a Google SSO account', async () => {
    microsoftAuth.exchangeCode.mockResolvedValue({
      externalId: 'microsoft-object-id',
      email: 'shared@example.edu',
      fullName: 'Microsoft User',
    })
    prismaMock.user.findFirst.mockResolvedValue({
      id: 'google-user-id',
      email: 'shared@example.edu',
      fullName: 'Google User',
      authProvider: 'GOOGLE',
      externalId: 'google-object-id',
      roles: ['RESEARCHER'],
      isActive: true,
    })

    const { req, res, next } = makeCallbackContext()
    await microsoftCallback(req, res, next)

    expect(res.redirect).toHaveBeenCalledWith('http://localhost:5173/login?error=sso_email_conflict')
    expect(prismaMock.authExchangeCode.create).not.toHaveBeenCalled()
    expect(prismaMock.user.update).not.toHaveBeenCalled()
    expect(next).not.toHaveBeenCalled()
  })
})
