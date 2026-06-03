/**
 * Ethic-Net — Auth exchange-code controller tests
 * Verifies one-time code exchange success and failure paths.
 */

import crypto from 'crypto'
import { jest } from '@jest/globals'

const prismaMock = {
  authExchangeCode: {
    create: jest.fn(),
    findUnique: jest.fn(),
    updateMany: jest.fn(),
  },
  user: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
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
 * Creates a signed Microsoft SSO state matching the controller format.
 * @param {string} frontendOrigin
 * @returns {string}
 */
function makeSignedMicrosoftState(frontendOrigin) {
  const payload = {
    provider: 'microsoft',
    issuedAt: Date.now(),
    nonce: 'test-nonce',
    frontendOrigin,
  }
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  const signature = crypto
    .createHmac('sha256', process.env.JWT_SECRET ?? 'dev_secret_change_in_production')
    .update(encodedPayload)
    .digest('base64url')
  return `${encodedPayload}.${signature}`
}

/**
 * Builds Express-like req/res mocks for Microsoft callback tests.
 * @param {string} frontendOrigin
 * @returns {{ req: object, res: object, next: Function }}
 */
function makeMicrosoftCallbackContext(frontendOrigin) {
  const state = makeSignedMicrosoftState(frontendOrigin)
  const headers = {
    'x-forwarded-proto': 'https',
    'x-forwarded-host': 'api.jct.ac.il',
    host: 'api.jct.ac.il',
  }
  const req = {
    query: { code: 'oauth-code', state },
    cookies: {},
    get: jest.fn((name) => headers[String(name).toLowerCase()]),
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

describe('auth.controller microsoftCallback redirects', () => {
  const originalNodeEnv = process.env.NODE_ENV
  const originalFrontendUrl = process.env.FRONTEND_URL

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NODE_ENV = 'production'
    process.env.FRONTEND_URL = 'https://ethics.jct.ac.il'
    microsoftAuth.exchangeCode.mockResolvedValue({
      externalId: 'ms-user-1',
      email: 'researcher@jct.ac.il',
      fullName: 'Researcher User',
    })
    prismaMock.user.findFirst.mockResolvedValue({
      id: 'u-ms-1',
      email: 'researcher@jct.ac.il',
      fullName: 'Researcher User',
      roles: ['RESEARCHER'],
      authProvider: 'MICROSOFT',
      externalId: 'ms-user-1',
      isActive: true,
    })
    prismaMock.authExchangeCode.create.mockResolvedValue({})
  })

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv
    process.env.FRONTEND_URL = originalFrontendUrl
  })

  test('does not redirect Microsoft SSO exchange code to same-public-suffix attacker origin', async () => {
    const { req, res, next } = makeMicrosoftCallbackContext('https://evil.ac.il')

    await microsoftCallback(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.redirect).toHaveBeenCalledTimes(1)
    expect(res.redirect.mock.calls[0][0]).toMatch(/^https:\/\/ethics\.jct\.ac\.il\/sso-callback\?code=/)
    expect(res.redirect.mock.calls[0][0]).not.toContain('evil.ac.il')
  })

  test('allows exact configured production frontend origin for Microsoft SSO callback', async () => {
    const { req, res, next } = makeMicrosoftCallbackContext('https://ethics.jct.ac.il')

    await microsoftCallback(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.redirect).toHaveBeenCalledTimes(1)
    expect(res.redirect.mock.calls[0][0]).toMatch(/^https:\/\/ethics\.jct\.ac\.il\/sso-callback\?code=/)
  })
})
