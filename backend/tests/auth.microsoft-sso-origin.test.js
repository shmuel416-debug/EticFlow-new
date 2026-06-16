/**
 * Ethic-Net — Microsoft SSO origin validation tests
 * Verifies production SSO handoff codes are redirected only to trusted frontend origins.
 */

import { jest } from '@jest/globals'

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
  getAuthUrl: jest.fn(),
  exchangeCode: jest.fn(),
}

jest.unstable_mockModule('../src/config/database.js', () => ({
  default: prismaMock,
}))

jest.unstable_mockModule('../src/services/email/email.service.js', () => ({
  sendEmail: jest.fn(),
}))

jest.unstable_mockModule('../src/services/auth/google.provider.js', () => ({
  getAuthUrl: jest.fn(),
  exchangeCode: jest.fn(),
}))

jest.unstable_mockModule('../src/services/auth/microsoft.provider.js', () => microsoftAuthMock)

const originalEnv = { ...process.env }
process.env.NODE_ENV = 'production'
process.env.FRONTEND_URL = 'https://app-ethics-net-web.azurewebsites.net'
process.env.JWT_SECRET = 'test-jwt-secret-with-at-least-32-characters'

const { microsoftCallback, microsoftRedirect } = await import('../src/controllers/auth.controller.js')

/**
 * Restores process environment after a test run.
 * @returns {void}
 */
function restoreEnv() {
  process.env = { ...originalEnv }
}

/**
 * Builds an Express-like request with headers and query values.
 * @param {object} query
 * @returns {object}
 */
function makeReq(query = {}) {
  const headers = {
    host: 'app-ethics-net-api.azurewebsites.net',
    'x-forwarded-proto': 'https',
  }
  return {
    cookies: {},
    protocol: 'https',
    query,
    requestId: 'req-test',
    get: jest.fn((name) => headers[String(name).toLowerCase()]),
  }
}

/**
 * Builds an Express-like response for redirect assertions.
 * @returns {object}
 */
function makeRes() {
  return {
    clearCookie: jest.fn(),
    cookie: jest.fn(),
    locals: {},
    redirect: jest.fn(),
  }
}

describe('auth.controller Microsoft SSO frontend origin validation', () => {
  let capturedState

  beforeEach(() => {
    jest.clearAllMocks()
    capturedState = null
    process.env.NODE_ENV = 'production'
    process.env.FRONTEND_URL = 'https://app-ethics-net-web.azurewebsites.net'
    process.env.JWT_SECRET = 'test-jwt-secret-with-at-least-32-characters'
    delete process.env.SSO_ALLOWED_FRONTEND_ORIGINS

    microsoftAuthMock.getAuthUrl.mockImplementation((state) => {
      capturedState = state
      return 'https://login.microsoftonline.com/test'
    })
    microsoftAuthMock.exchangeCode.mockResolvedValue({
      email: 'researcher@jct.ac.il',
      externalId: 'ms-user-1',
      fullName: 'Researcher One',
    })
    prismaMock.user.findFirst.mockResolvedValue({
      id: 'user-1',
      email: 'researcher@jct.ac.il',
      externalId: 'ms-user-1',
      fullName: 'Researcher One',
      authProvider: 'MICROSOFT',
      isActive: true,
      roles: ['RESEARCHER'],
    })
    prismaMock.authExchangeCode.create.mockResolvedValue({ id: 'exchange-1' })
  })

  afterAll(() => {
    restoreEnv()
  })

  test('falls back instead of redirecting code to untrusted shared Azure host', async () => {
    const redirectReq = makeReq({
      frontend_origin: 'https://attacker.azurewebsites.net',
    })
    await microsoftRedirect(redirectReq, makeRes(), jest.fn())

    const callbackReq = makeReq({
      code: 'oauth-code',
      state: capturedState,
    })
    const callbackRes = makeRes()
    await microsoftCallback(callbackReq, callbackRes, jest.fn())

    expect(callbackRes.redirect).toHaveBeenCalledTimes(1)
    expect(callbackRes.redirect.mock.calls[0][0]).toMatch(
      /^https:\/\/app-ethics-net-web\.azurewebsites\.net\/sso-callback\?code=/
    )
    expect(callbackRes.redirect.mock.calls[0][0]).not.toContain('attacker.azurewebsites.net')
  })

  test('allows explicitly configured additional frontend origin', async () => {
    process.env.SSO_ALLOWED_FRONTEND_ORIGINS = 'https://preview.ethics.jct.ac.il'
    const redirectReq = makeReq({
      frontend_origin: 'https://preview.ethics.jct.ac.il',
    })
    await microsoftRedirect(redirectReq, makeRes(), jest.fn())

    const callbackReq = makeReq({
      code: 'oauth-code',
      state: capturedState,
    })
    const callbackRes = makeRes()
    await microsoftCallback(callbackReq, callbackRes, jest.fn())

    expect(callbackRes.redirect).toHaveBeenCalledTimes(1)
    expect(callbackRes.redirect.mock.calls[0][0]).toMatch(
      /^https:\/\/preview\.ethics\.jct\.ac\.il\/sso-callback\?code=/
    )
  })
})
