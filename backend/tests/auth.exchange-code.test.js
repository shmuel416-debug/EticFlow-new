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

const {
  exchangeCode,
  microsoftRedirect,
  microsoftCallback,
} = await import('../src/controllers/auth.controller.js')
const { AppError } = await import('../src/utils/errors.js')
const microsoftAuth = await import('../src/services/auth/microsoft.provider.js')

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
 * Builds an Express-like request for Microsoft SSO controller tests.
 * @param {{ query?: object, cookies?: object, frontendOrigin?: string, host?: string }} options
 * @returns {object}
 */
function makeMicrosoftRequest({ query = {}, cookies = {}, frontendOrigin = null, host = 'api.ethics.jct.ac.il' } = {}) {
  return {
    query,
    cookies,
    protocol: 'https',
    get: jest.fn((name) => {
      const header = String(name).toLowerCase()
      if (header === 'host') return host
      if (header === 'origin' || header === 'referer') return frontendOrigin
      return undefined
    }),
  }
}

/**
 * Builds an Express-like response for Microsoft SSO controller tests.
 * @returns {object}
 */
function makeMicrosoftResponse() {
  return {
    locals: {},
    cookie: jest.fn(),
    clearCookie: jest.fn(),
    redirect: jest.fn(),
  }
}

/**
 * Starts a Microsoft redirect and returns the signed state sent to Microsoft.
 * @param {string} frontendOrigin
 * @returns {Promise<string>}
 */
async function createMicrosoftState(frontendOrigin) {
  let capturedState = null
  microsoftAuth.getAuthUrl.mockImplementation((state) => {
    capturedState = state
    return 'https://login.microsoft.test/auth'
  })

  const req = makeMicrosoftRequest({ query: { frontend_origin: frontendOrigin } })
  const res = makeMicrosoftResponse()
  await microsoftRedirect(req, res, jest.fn())
  expect(capturedState).toEqual(expect.any(String))
  return capturedState
}

describe('auth.controller exchangeCode', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...ORIGINAL_ENV }
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

  test('keeps Microsoft SSO exchange code on configured frontend origin in production', async () => {
    process.env.NODE_ENV = 'production'
    process.env.FRONTEND_URL = 'https://ethics.jct.ac.il'

    const state = await createMicrosoftState('https://attacker.ac.il')
    microsoftAuth.exchangeCode.mockResolvedValue({
      externalId: 'ms-1',
      email: 'researcher@acad.jct.ac.il',
      fullName: 'Researcher One',
    })
    prismaMock.user.findFirst.mockResolvedValue(null)
    prismaMock.user.create.mockResolvedValue({
      id: 'u-4',
      email: 'researcher@jct.ac.il',
      fullName: 'Researcher One',
      roles: ['RESEARCHER'],
      isActive: true,
      authProvider: 'MICROSOFT',
    })
    prismaMock.authExchangeCode.create.mockResolvedValue({})

    const req = makeMicrosoftRequest({ query: { code: 'oauth-code', state } })
    const res = makeMicrosoftResponse()
    await microsoftCallback(req, res, jest.fn())

    const redirectTarget = res.redirect.mock.calls[0][0]
    expect(redirectTarget).toMatch(/^https:\/\/ethics\.jct\.ac\.il\/sso-callback\?code=/)
    expect(redirectTarget).not.toContain('attacker.ac.il')
  })

  test('rejects Microsoft SSO when normalized email belongs to Google account', async () => {
    process.env.NODE_ENV = 'production'
    process.env.FRONTEND_URL = 'https://ethics.jct.ac.il'

    const state = await createMicrosoftState('https://ethics.jct.ac.il')
    microsoftAuth.exchangeCode.mockResolvedValue({
      externalId: 'ms-2',
      email: 'researcher@acad.jct.ac.il',
      fullName: 'Researcher One',
    })
    prismaMock.user.findFirst.mockResolvedValue({
      id: 'g-1',
      email: 'researcher@jct.ac.il',
      fullName: 'Google User',
      externalId: 'google-1',
      authProvider: 'GOOGLE',
      roles: ['RESEARCHER'],
      isActive: true,
    })

    const req = makeMicrosoftRequest({ query: { code: 'oauth-code', state } })
    const res = makeMicrosoftResponse()
    await microsoftCallback(req, res, jest.fn())

    expect(res.redirect).toHaveBeenCalledWith('https://ethics.jct.ac.il/login?error=sso_email_conflict')
    expect(prismaMock.user.update).not.toHaveBeenCalled()
    expect(prismaMock.user.create).not.toHaveBeenCalled()
    expect(prismaMock.authExchangeCode.create).not.toHaveBeenCalled()
  })
})
