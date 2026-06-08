/**
 * Ethic-Net — Auth exchange-code controller tests
 * Verifies one-time code exchange success and failure paths.
 */

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

const microsoftProviderMock = {
  getAuthUrl: jest.fn(),
  exchangeCode: jest.fn(),
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
  getAuthUrl: microsoftProviderMock.getAuthUrl,
  exchangeCode: microsoftProviderMock.exchangeCode,
}))

const { exchangeCode, microsoftRedirect, microsoftCallback } = await import('../src/controllers/auth.controller.js')
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
 * Restores environment variables after a test mutates them.
 * @param {string[]} keys
 * @returns {() => void}
 */
function captureEnv(keys) {
  const backup = Object.fromEntries(keys.map((key) => [key, process.env[key]]))
  return () => {
    keys.forEach((key) => {
      if (backup[key] === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = backup[key]
      }
    })
  }
}

/**
 * Builds a minimal request object for Microsoft SSO tests.
 * @param {object} options
 * @returns {object}
 */
function makeMicrosoftReq(options = {}) {
  const headers = options.headers || {}
  return {
    query: options.query || {},
    cookies: options.cookies || {},
    protocol: options.protocol || 'http',
    requestId: 'req-1',
    get: (name) => headers[name.toLowerCase()] || headers[name],
  }
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

describe('auth.controller Microsoft SSO redirect safety', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('uses configured production callback URL instead of proxied http headers', async () => {
    const restore = captureEnv(['NODE_ENV', 'FRONTEND_URL', 'MICROSOFT_AUTH_REDIRECT_URI', 'MICROSOFT_REDIRECT_URI'])
    process.env.NODE_ENV = 'production'
    process.env.FRONTEND_URL = 'https://ethics.jct.ac.il'
    delete process.env.MICROSOFT_AUTH_REDIRECT_URI
    delete process.env.MICROSOFT_REDIRECT_URI
    microsoftProviderMock.getAuthUrl.mockResolvedValue('https://login.microsoftonline.test/auth')

    const req = makeMicrosoftReq({
      query: { frontend_origin: 'https://ethics.jct.ac.il' },
      headers: {
        'x-forwarded-proto': 'http',
        'x-forwarded-host': 'api.internal',
        host: 'api.internal',
      },
    })
    const res = { cookie: jest.fn(), redirect: jest.fn() }

    await microsoftRedirect(req, res, jest.fn())

    expect(microsoftProviderMock.getAuthUrl.mock.calls[0][1]).toBe('https://ethics.jct.ac.il/api/auth/microsoft/callback')
    expect(res.redirect).toHaveBeenCalledWith('https://login.microsoftonline.test/auth')
    restore()
  })

  test('rejects sibling-domain frontend origins during production callback', async () => {
    const restore = captureEnv(['NODE_ENV', 'FRONTEND_URL', 'MICROSOFT_AUTH_REDIRECT_URI', 'MICROSOFT_REDIRECT_URI'])
    process.env.NODE_ENV = 'production'
    process.env.FRONTEND_URL = 'https://ethics.jct.ac.il'
    delete process.env.MICROSOFT_AUTH_REDIRECT_URI
    delete process.env.MICROSOFT_REDIRECT_URI
    microsoftProviderMock.getAuthUrl.mockResolvedValue('https://login.microsoftonline.test/auth')
    microsoftProviderMock.exchangeCode.mockResolvedValue({
      externalId: 'ms-1',
      email: 'user@acad.jct.ac.il',
      fullName: 'SSO User',
    })
    prismaMock.user.findFirst.mockResolvedValue({
      id: 'u-ms-1',
      email: 'user@jct.ac.il',
      fullName: 'SSO User',
      externalId: 'ms-1',
      authProvider: 'MICROSOFT',
      roles: ['RESEARCHER'],
      isActive: true,
    })
    prismaMock.authExchangeCode.create.mockResolvedValue({ id: 'code-1' })

    const redirectReq = makeMicrosoftReq({
      query: { frontend_origin: 'https://evil.jct.ac.il' },
      headers: { host: 'api.jct.ac.il' },
    })
    await microsoftRedirect(redirectReq, { cookie: jest.fn(), redirect: jest.fn() }, jest.fn())
    const signedState = microsoftProviderMock.getAuthUrl.mock.calls[0][0]

    const callbackReq = makeMicrosoftReq({
      query: { code: 'ms-code', state: signedState },
      headers: { host: 'api.jct.ac.il' },
    })
    const callbackRes = { locals: {}, clearCookie: jest.fn(), redirect: jest.fn() }

    await microsoftCallback(callbackReq, callbackRes, jest.fn())

    expect(callbackRes.redirect.mock.calls[0][0]).toMatch(/^https:\/\/ethics\.jct\.ac\.il\/sso-callback\?code=/)
    expect(callbackRes.redirect.mock.calls[0][0]).not.toContain('evil.jct.ac.il')
    restore()
  })
})
