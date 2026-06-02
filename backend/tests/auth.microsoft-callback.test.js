/**
 * Ethic-Net — Microsoft callback controller regression tests
 * Verifies safe SSO redirect selection and Microsoft account binding.
 */

import crypto from 'crypto'
import { jest } from '@jest/globals'

process.env.NODE_ENV = 'production'
process.env.FRONTEND_URL = 'https://ethics.jct.ac.il'
process.env.JWT_SECRET_CURRENT = 'test_secret_for_microsoft_callback_cases'

const prismaMock = {
  authExchangeCode: {
    create: jest.fn(),
  },
  user: {
    create: jest.fn(),
    findMany: jest.fn(),
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

const { microsoftCallback } = await import('../src/controllers/auth.controller.js')

/**
 * Creates a signed Microsoft SSO state token for callback tests.
 * @param {string} frontendOrigin - Requested frontend origin to embed
 * @returns {string} Signed SSO state
 */
function createState(frontendOrigin) {
  const payload = {
    provider: 'microsoft',
    issuedAt: Date.now(),
    nonce: 'test-nonce',
    frontendOrigin,
  }
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  const signature = crypto
    .createHmac('sha256', process.env.JWT_SECRET_CURRENT)
    .update(encodedPayload)
    .digest('base64url')
  return `${encodedPayload}.${signature}`
}

/**
 * Builds an Express-like request/response pair for Microsoft callback tests.
 * @param {string} frontendOrigin - Requested frontend origin in state
 * @returns {{ req: object, res: object, next: Function }}
 */
function makeContext(frontendOrigin = 'https://ethics.jct.ac.il') {
  const req = {
    query: { code: 'oauth-code', state: createState(frontendOrigin) },
    cookies: {},
    protocol: 'https',
    get: jest.fn((header) => {
      const headers = {
        host: 'api.jct.ac.il',
        'x-forwarded-proto': 'https',
      }
      return headers[String(header).toLowerCase()]
    }),
  }
  const res = {
    clearCookie: jest.fn(),
    locals: {},
    redirect: jest.fn(),
  }
  const next = jest.fn()
  return { req, res, next }
}

describe('auth.controller microsoftCallback', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    prismaMock.authExchangeCode.create.mockResolvedValue({})
    microsoftAuthMock.exchangeCode.mockResolvedValue({
      externalId: 'ms-1',
      email: 'user@acad.jct.ac.il',
      fullName: 'Microsoft User',
    })
  })

  test('rejects attacker frontend origins in production SSO redirects', async () => {
    prismaMock.user.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
    prismaMock.user.create.mockResolvedValue({
      id: 'u-1',
      email: 'user@jct.ac.il',
      authProvider: 'MICROSOFT',
      fullName: 'Microsoft User',
      roles: ['RESEARCHER'],
      isActive: true,
    })

    const { req, res, next } = makeContext('https://attacker.ac.il')
    await microsoftCallback(req, res, next)

    expect(res.redirect).toHaveBeenCalledWith(expect.stringMatching(/^https:\/\/ethics\.jct\.ac\.il\/sso-callback\?code=/))
    expect(res.redirect.mock.calls[0][0]).not.toContain('attacker.ac.il')
    expect(next).not.toHaveBeenCalled()
  })

  test('fails closed instead of linking Microsoft SSO to a non-Microsoft account', async () => {
    prismaMock.user.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: 'g-1', email: 'user@jct.ac.il', authProvider: 'GOOGLE', isActive: true },
      ])

    const { req, res } = makeContext()
    await microsoftCallback(req, res, jest.fn())

    expect(res.redirect).toHaveBeenCalledWith('https://ethics.jct.ac.il/login?error=sso_email_conflict')
    expect(prismaMock.user.update).not.toHaveBeenCalled()
    expect(prismaMock.authExchangeCode.create).not.toHaveBeenCalled()
  })

  test('fails closed when raw and normalized Microsoft emails match different rows', async () => {
    prismaMock.user.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: 'u-raw', email: 'user@acad.jct.ac.il', authProvider: 'MICROSOFT' },
        { id: 'u-normal', email: 'user@jct.ac.il', authProvider: 'MICROSOFT' },
      ])

    const { req, res } = makeContext()
    await microsoftCallback(req, res, jest.fn())

    expect(res.redirect).toHaveBeenCalledWith('https://ethics.jct.ac.il/login?error=sso_email_conflict')
    expect(prismaMock.user.update).not.toHaveBeenCalled()
    expect(prismaMock.authExchangeCode.create).not.toHaveBeenCalled()
  })

  test('migrates a single legacy Microsoft acad email to the normalized jct email', async () => {
    prismaMock.user.findMany.mockResolvedValueOnce([
      {
        id: 'u-legacy',
        email: 'user@acad.jct.ac.il',
        externalId: 'ms-1',
        authProvider: 'MICROSOFT',
        fullName: 'Old Name',
        roles: ['RESEARCHER'],
        isActive: true,
      },
    ])
    prismaMock.user.findUnique.mockResolvedValue(null)
    prismaMock.user.update.mockResolvedValue({
      id: 'u-legacy',
      email: 'user@jct.ac.il',
      externalId: 'ms-1',
      authProvider: 'MICROSOFT',
      fullName: 'Microsoft User',
      roles: ['RESEARCHER'],
      isActive: true,
    })

    const { req, res, next } = makeContext()
    await microsoftCallback(req, res, next)

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'u-legacy' },
      data: { fullName: 'Microsoft User', externalId: 'ms-1', email: 'user@jct.ac.il' },
    })
    expect(res.redirect).toHaveBeenCalledWith(expect.stringMatching(/^https:\/\/ethics\.jct\.ac\.il\/sso-callback\?code=/))
    expect(next).not.toHaveBeenCalled()
  })
})
