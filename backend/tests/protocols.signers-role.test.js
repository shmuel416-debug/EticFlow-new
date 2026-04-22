/**
 * EthicFlow — Protocol signer role guard tests
 * Ensures request-signatures enforces committee roles at backend level.
 */

import { jest } from '@jest/globals'

const prismaMock = {
  protocol: {
    findUnique: jest.fn(),
  },
  user: {
    findMany: jest.fn(),
  },
  protocolSignature: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
}

const sendEmailMock = jest.fn()
const recordAuditEntryMock = jest.fn()

jest.unstable_mockModule('../src/config/database.js', () => ({
  default: prismaMock,
}))

jest.unstable_mockModule('../src/services/email/email.service.js', () => ({
  sendEmail: sendEmailMock,
}))

jest.unstable_mockModule('../src/services/pdf.service.js', () => ({
  generateProtocolPdf: jest.fn(),
}))

jest.unstable_mockModule('../src/middleware/audit.js', () => ({
  recordAuditEntry: recordAuditEntryMock,
}))

const { requestSignatures } = await import('../src/controllers/protocols.controller.js')
const { AppError } = await import('../src/utils/errors.js')

/**
 * Builds minimal req/res/next context for protocol controller tests.
 * @param {object} options
 * @returns {{ req: object, res: object, next: Function }}
 */
function makeContext(options = {}) {
  const req = {
    params: options.params ?? { id: 'p-1' },
    body: options.body ?? {},
    user: options.user ?? { id: 'admin-1' },
    headers: options.headers ?? { 'user-agent': 'jest' },
    socket: { remoteAddress: '127.0.0.1' },
  }
  const res = {
    locals: {},
    json: jest.fn(),
  }
  const next = jest.fn()
  return { req, res, next }
}

describe('protocols.controller requestSignatures role guards', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    sendEmailMock.mockResolvedValue(undefined)
  })

  test('rejects RESEARCHER signer and blocks signature creation', async () => {
    prismaMock.protocol.findUnique.mockResolvedValue({
      id: 'p-1',
      title: 'Protocol A',
      status: 'PENDING_SIGNATURES',
      isActive: true,
      meeting: { title: 'Meeting A' },
    })
    prismaMock.user.findMany.mockResolvedValue([])

    const { req, res, next } = makeContext({
      body: { signerIds: ['u-researcher'] },
    })

    await requestSignatures(req, res, next)

    expect(prismaMock.protocolSignature.create).not.toHaveBeenCalled()
    expect(recordAuditEntryMock).toHaveBeenCalledTimes(1)
    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0][0]).toBeInstanceOf(AppError)
    expect(next.mock.calls[0][0].code).toBe('ROLE_NOT_ALLOWED')
    expect(next.mock.calls[0][0].statusCode).toBe(400)
    expect(res.json).not.toHaveBeenCalled()
  })

  test('creates signatures for committee signers only', async () => {
    prismaMock.protocol.findUnique.mockResolvedValue({
      id: 'p-2',
      title: 'Protocol B',
      status: 'PENDING_SIGNATURES',
      isActive: true,
      meeting: { title: 'Meeting B' },
    })
    prismaMock.user.findMany.mockResolvedValue([
      { id: 'u-reviewer', email: 'rev@test.com', fullName: 'Reviewer User', role: 'REVIEWER' },
    ])
    prismaMock.protocolSignature.findMany.mockResolvedValue([])
    prismaMock.protocolSignature.create.mockResolvedValue({ id: 'sig-1' })

    const { req, res, next } = makeContext({
      params: { id: 'p-2' },
      body: { signerIds: ['u-reviewer'] },
    })

    await requestSignatures(req, res, next)

    expect(prismaMock.protocolSignature.create).toHaveBeenCalledTimes(1)
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    expect(recordAuditEntryMock).not.toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith({ data: { created: 1, total: 1 } })
    expect(next).not.toHaveBeenCalled()
  })
})
