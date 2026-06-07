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
    create: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
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

const {
  exchangeCode,
  microsoftCallback,
  microsoftRedirect,
} = await import('../src/controllers/auth.controller.js')
const { AppError } = await import('../src/utils/errors.js')

const ORIGINAL_ENV = { ...process.env }

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
 * Builds minimal Express-like req/res/next mocks for Microsoft SSO tests.
 * @param {object} options
 * @returns {{ req: object, res: object, next: Function }}
 */
function makeMicrosoftContext(options = {}) {
  const headers = options.headers || {}
  const req = {
    query: options.query || {},
    cookies: options.cookies || {},
    protocol: options.protocol || 'https',
    get: jest.fn((name) => headers[String(name).toLowerCase()]),
  }
  const res = {
    locals: {},
    cookie: jest.fn(),
    clearCookie: jest.fn(),
    redirect: jest.fn(),
  }
  const next = jest.fn()
  return { req, res, next }
}

/**
 * Starts a Microsoft SSO flow and returns the signed state sent to Microsoft.
 * @param {string} frontendOrigin
 * @returns {Promise<string>}
 */
async function issueMicrosoftState(frontendOrigin) {
  microsoftProviderMock.getAuthUrl.mockResolvedValueOnce('https://login.microsoftonline.com/auth')
  const { req, res, next } = makeMicrosoftContext({
    query: { frontend_origin: frontendOrigin },
    headers: { host: 'api.ethics.jct.ac.il' },
  })

  await microsoftRedirect(req, res, next)

  expect(next).not.toHaveBeenCalled()
  expect(res.redirect).toHaveBeenCalledWith('https://login.microsoftonline.com/auth')
  return microsoftProviderMock.getAuthUrl.mock.calls.at(-1)[0]
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

describe('auth.controller Microsoft SSO hardening', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env = {
      ...ORIGINAL_ENV,
      NODE_ENV: 'production',
      FRONTEND_URL: 'https://ethics.jct.ac.il',
      MICROSOFT_AUTH_REDIRECT_URI: 'https://api.ethics.jct.ac.il/api/auth/microsoft/callback',
    }
  })

  afterAll(() => {
    process.env = ORIGINAL_ENV
  })

  test('falls back to configured frontend for same-root but untrusted callback origin', async () => {
    const state = await issueMicrosoftState('https://evil.jct.ac.il')
    microsoftProviderMock.exchangeCode.mockResolvedValueOnce({
      externalId: 'ms-user-1',
      email: 'researcher@jct.ac.il',
      fullName: 'Microsoft User',
    })
    prismaMock.user.findFirst.mockResolvedValueOnce(null)
    prismaMock.user.create.mockResolvedValueOnce({
      id: 'u-ms-1',
      email: 'researcher@jct.ac.il',
      fullName: 'Microsoft User',
      authProvider: 'MICROSOFT',
      roles: ['RESEARCHER'],
      isActive: true,
    })
    prismaMock.authExchangeCode.create.mockResolvedValueOnce({})

    const { req, res, next } = makeMicrosoftContext({
      query: { code: 'microsoft-code', state },
      cookies: { ms_oauth_state: state },
      headers: { host: 'api.ethics.jct.ac.il' },
    })

    await microsoftCallback(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(microsoftProviderMock.exchangeCode).toHaveBeenCalledWith(
      'microsoft-code',
      state,
      'https://api.ethics.jct.ac.il/api/auth/microsoft/callback'
    )
    expect(res.redirect.mock.calls[0][0]).toMatch(/^https:\/\/ethics\.jct\.ac\.il\/sso-callback\?code=/)
    expect(res.redirect.mock.calls[0][0]).not.toContain('evil.jct.ac.il')
  })

  test('rejects Microsoft login when normalized email belongs to Google account', async () => {
    const state = await issueMicrosoftState('https://ethics.jct.ac.il')
    microsoftProviderMock.exchangeCode.mockResolvedValueOnce({
      externalId: 'ms-user-2',
      email: 'victim@acad.jct.ac.il',
      fullName: 'Victim User',
    })
    prismaMock.user.findFirst.mockResolvedValueOnce({
      id: 'google-user-1',
      email: 'victim@jct.ac.il',
      fullName: 'Victim User',
      externalId: 'google-user',
      authProvider: 'GOOGLE',
      isActive: true,
    })

    const { req, res, next } = makeMicrosoftContext({
      query: { code: 'microsoft-code', state },
      cookies: { ms_oauth_state: state },
      headers: { host: 'api.ethics.jct.ac.il' },
    })

    await microsoftCallback(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(prismaMock.user.update).not.toHaveBeenCalled()
    expect(prismaMock.authExchangeCode.create).not.toHaveBeenCalled()
    expect(res.redirect).toHaveBeenCalledWith('https://ethics.jct.ac.il/login?error=sso_email_conflict')
  })
})
