/**
 * Ethic-Net - Microsoft SSO redirect safety tests.
 * Verifies production SSO handoff codes are only sent to the configured frontend origin.
 */

import { jest } from '@jest/globals'

const ORIGINAL_ENV = {
  NODE_ENV: process.env.NODE_ENV,
  FRONTEND_URL: process.env.FRONTEND_URL,
  JWT_SECRET: process.env.JWT_SECRET,
}

process.env.NODE_ENV = 'production'
process.env.FRONTEND_URL = 'https://portal.jct.ac.il'
process.env.JWT_SECRET = 'test_jwt_secret_that_is_long_enough'

const prismaMock = {
  authExchangeCode: {
    create: jest.fn(),
  },
  user: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
}

const microsoftAuthMock = {
  exchangeCode: jest.fn(),
  getAuthUrl: jest.fn(),
}

jest.unstable_mockModule('../src/config/database.js', () => ({
  default: prismaMock,
}))

jest.unstable_mockModule('../src/services/auth/microsoft.provider.js', () => microsoftAuthMock)

jest.unstable_mockModule('../src/services/auth/google.provider.js', () => ({
  exchangeCode: jest.fn(),
  getAuthUrl: jest.fn(),
}))

jest.unstable_mockModule('../src/services/email/email.service.js', () => ({
  sendEmail: jest.fn(),
}))

jest.unstable_mockModule('../src/services/observability.service.js', () => ({
  emitAlert: jest.fn(),
}))

const { microsoftRedirect, microsoftCallback } = await import('../src/controllers/auth.controller.js')

/**
 * Builds a minimal Express-like request for Microsoft SSO controller tests.
 * @param {{ query?: object, cookies?: object, headers?: object }} options
 * @returns {object}
 */
function makeRequest({ query = {}, cookies = {}, headers = {} } = {}) {
  const normalizedHeaders = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value])
  )

  return {
    cookies,
    protocol: 'https',
    query,
    requestId: 'req-test',
    get: jest.fn((name) => normalizedHeaders[String(name).toLowerCase()] || null),
  }
}

/**
 * Builds a minimal Express-like response for redirect controller tests.
 * @returns {object}
 */
function makeResponse() {
  return {
    clearCookie: jest.fn(),
    cookie: jest.fn(),
    locals: {},
    redirect: jest.fn(),
  }
}

/**
 * Restores environment values changed for production SSO tests.
 * @returns {void}
 */
function restoreEnv() {
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    if (typeof value === 'undefined') {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
}

describe('auth.controller Microsoft SSO redirect safety', () => {
  afterAll(() => {
    restoreEnv()
  })

  beforeEach(() => {
    jest.clearAllMocks()
    microsoftAuthMock.getAuthUrl.mockResolvedValue('https://login.microsoftonline.com/common/oauth2/v2.0/authorize')
    microsoftAuthMock.exchangeCode.mockResolvedValue({
      email: 'researcher@jct.ac.il',
      externalId: 'ms-account-1',
      fullName: 'Researcher One',
    })
    prismaMock.authExchangeCode.create.mockResolvedValue({ id: 'exchange-1' })
    prismaMock.user.findFirst.mockResolvedValue({
      id: 'user-1',
      authProvider: 'MICROSOFT',
      email: 'researcher@jct.ac.il',
      externalId: 'ms-account-1',
      fullName: 'Researcher One',
      isActive: true,
      passwordHash: null,
      roles: ['RESEARCHER'],
    })
    prismaMock.user.findUnique.mockResolvedValue(null)
  })

  test('does not redirect SSO exchange codes to same-root public suffix domains', async () => {
    const headers = {
      host: 'api.jct.ac.il',
      'x-forwarded-proto': 'https',
    }
    const redirectReq = makeRequest({
      headers,
      query: { frontend_origin: 'https://evil.ac.il' },
    })
    const redirectRes = makeResponse()

    await microsoftRedirect(redirectReq, redirectRes, jest.fn())
    const signedState = microsoftAuthMock.getAuthUrl.mock.calls[0][0]

    const callbackReq = makeRequest({
      headers,
      query: { code: 'microsoft-code', state: signedState },
    })
    const callbackRes = makeResponse()

    await microsoftCallback(callbackReq, callbackRes, jest.fn())

    const target = callbackRes.redirect.mock.calls[0][0]
    expect(target).toMatch(/^https:\/\/portal\.jct\.ac\.il\/sso-callback\?code=[a-f0-9]{64}$/)
    expect(target).not.toContain('evil.ac.il')
  })
})
