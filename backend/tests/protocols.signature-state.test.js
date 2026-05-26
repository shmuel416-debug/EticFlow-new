/**
 * EthicFlow — protocol signature state regression tests.
 */

import { jest } from '@jest/globals'

const prismaMock = {
  protocol: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  user: {
    findMany: jest.fn(),
  },
  protocolSignature: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
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
jest.unstable_mockModule('../src/services/storage.service.js', () => ({
  resolvePath: jest.fn(),
}))
jest.unstable_mockModule('../src/middleware/audit.js', () => ({
  recordAuditEntry: recordAuditEntryMock,
}))
jest.unstable_mockModule('../src/services/coi.service.js', () => ({
  hasConflict: jest.fn(),
}))

const { requestSignatures, signByToken } = await import('../src/controllers/protocols.controller.js')

/**
 * Builds a minimal Express controller context.
 * @param {object} options
 * @returns {{ req: object, res: object, next: Function }}
 */
function makeContext(options = {}) {
  const req = {
    params: options.params ?? { id: 'p-1', token: 'raw-token' },
    body: options.body ?? {},
    user: options.user ?? { id: 'admin-1' },
    headers: options.headers ?? { 'user-agent': 'jest' },
    socket: { remoteAddress: '127.0.0.1' },
  }
  const res = {
    locals: {},
    json: jest.fn(),
    status: jest.fn().mockReturnThis(),
  }
  const next = jest.fn()
  return { req, res, next }
}

describe('protocol signature state transitions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    sendEmailMock.mockResolvedValue(undefined)
  })

  test('does not mark protocol signed while any active signature is declined', async () => {
    prismaMock.protocolSignature.findUnique.mockResolvedValue({
      id: 'sig-pending',
      protocolId: 'p-1',
      status: 'PENDING',
      isActive: true,
      tokenExpiry: new Date(Date.now() + 60_000),
      protocol: { id: 'p-1', title: 'Protocol A' },
      user: { id: 'u-1', fullName: 'Reviewer User' },
    })
    prismaMock.protocolSignature.update.mockResolvedValue({ id: 'sig-pending', status: 'SIGNED' })
    prismaMock.protocolSignature.count.mockResolvedValue(1)

    const { req, res, next } = makeContext({ body: { action: 'sign' } })
    await signByToken(req, res, next)

    expect(prismaMock.protocolSignature.count).toHaveBeenCalledWith({
      where: { protocolId: 'p-1', status: { not: 'SIGNED' }, isActive: true },
    })
    expect(prismaMock.protocol.update).not.toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'SIGNED', protocolId: 'p-1' }),
    })
    expect(next).not.toHaveBeenCalled()
  })

  test('marks protocol signed only after every active signature is signed', async () => {
    prismaMock.protocolSignature.findUnique.mockResolvedValue({
      id: 'sig-last',
      protocolId: 'p-2',
      status: 'PENDING',
      isActive: true,
      tokenExpiry: new Date(Date.now() + 60_000),
      protocol: { id: 'p-2', title: 'Protocol B' },
      user: { id: 'u-2', fullName: 'Chair User' },
    })
    prismaMock.protocolSignature.update.mockResolvedValue({ id: 'sig-last', status: 'SIGNED' })
    prismaMock.protocolSignature.count.mockResolvedValue(0)

    const { req, next } = makeContext({ body: { action: 'sign' } })
    await signByToken(req, { locals: {}, json: jest.fn() }, next)

    expect(prismaMock.protocol.update).toHaveBeenCalledWith({
      where: { id: 'p-2' },
      data: { status: 'SIGNED' },
    })
    expect(next).not.toHaveBeenCalled()
  })

  test('reissues pending signature token for a declined signer', async () => {
    prismaMock.protocol.findUnique.mockResolvedValue({
      id: 'p-3',
      title: 'Protocol C',
      status: 'PENDING_SIGNATURES',
      isActive: true,
      meeting: { title: 'Meeting C' },
    })
    prismaMock.user.findMany.mockResolvedValue([
      { id: 'u-reviewer', email: 'rev@test.com', fullName: 'Reviewer User', roles: ['RESEARCHER', 'REVIEWER'] },
    ])
    prismaMock.protocolSignature.findMany.mockResolvedValue([
      { id: 'sig-declined', userId: 'u-reviewer', status: 'DECLINED' },
    ])
    prismaMock.protocolSignature.update.mockResolvedValue({ id: 'sig-declined' })

    const { req, res, next } = makeContext({
      params: { id: 'p-3' },
      body: { signerIds: ['u-reviewer'] },
    })

    await requestSignatures(req, res, next)

    expect(prismaMock.protocolSignature.create).not.toHaveBeenCalled()
    expect(prismaMock.protocolSignature.update).toHaveBeenCalledWith({
      where: { id: 'sig-declined' },
      data: expect.objectContaining({ status: 'PENDING', signedAt: null, ipAddress: null, isActive: true }),
    })
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    expect(res.json).toHaveBeenCalledWith({ data: { created: 1, total: 1 } })
    expect(next).not.toHaveBeenCalled()
  })
})
