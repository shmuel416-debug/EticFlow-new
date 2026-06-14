/**
 * Ethic-Net — submission export PDF access tests
 */

import { jest } from '@jest/globals'

const prismaMock = {
  submission: {
    findFirst: jest.fn(),
  },
}

const pdfServiceMock = {
  generateSubmissionExportPdf: jest.fn(),
}

jest.unstable_mockModule('../src/config/database.js', () => ({
  default: prismaMock,
}))
jest.unstable_mockModule('../src/services/pdf.service.js', () => pdfServiceMock)

const { exportSubmissionPdf } = await import('../src/controllers/submissions.controller.js')

/**
 * Builds request/response test objects.
 * @param {object} [overrides]
 * @returns {{ req: any, res: any, next: any }}
 */
function makeContext(overrides = {}) {
  const req = {
    params: { id: 'sub-1' },
    query: {},
    user: { id: 'researcher-1', roles: ['RESEARCHER'], activeRole: 'RESEARCHER' },
    ...overrides,
  }
  const res = {
    setHeader: jest.fn(),
    sendFile: jest.fn((_path, cb) => cb?.()),
    locals: {},
  }
  const next = jest.fn()
  return { req, res, next }
}

describe('submissions exportSubmissionPdf', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    prismaMock.submission.findFirst.mockResolvedValue({
      id: 'sub-1',
      applicationId: 'ETH-2026-001',
      authorId: 'researcher-1',
      status: 'SUBMITTED',
      submittedAt: new Date(),
    })
    pdfServiceMock.generateSubmissionExportPdf.mockResolvedValue({
      storagePath: 'generated/export/sub-1/submission-export-he.pdf',
      sizeBytes: 1024,
    })
  })

  test('allows researcher to export own submitted request', async () => {
    const { req, res, next } = makeContext()
    await exportSubmissionPdf(req, res, next)

    expect(pdfServiceMock.generateSubmissionExportPdf).toHaveBeenCalledWith('sub-1', 'he')
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf')
    expect(res.sendFile).toHaveBeenCalled()
    expect(next).not.toHaveBeenCalled()
  })

  test('blocks researcher from exporting another users submission', async () => {
    prismaMock.submission.findFirst.mockResolvedValue({
      id: 'sub-1',
      applicationId: 'ETH-2026-001',
      authorId: 'other-user',
      status: 'SUBMITTED',
      submittedAt: new Date(),
    })
    const { req, res, next } = makeContext()
    await exportSubmissionPdf(req, res, next)

    expect(pdfServiceMock.generateSubmissionExportPdf).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0][0].code).toBe('FORBIDDEN')
  })

  test('returns NOT_SUBMITTED for draft submissions', async () => {
    prismaMock.submission.findFirst.mockResolvedValue({
      id: 'sub-1',
      applicationId: 'ETH-2026-001',
      authorId: 'researcher-1',
      status: 'DRAFT',
      submittedAt: null,
    })
    pdfServiceMock.generateSubmissionExportPdf.mockRejectedValue(new Error('Submission has not been submitted yet'))
    const { req, res, next } = makeContext()
    await exportSubmissionPdf(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0][0].code).toBe('NOT_SUBMITTED')
  })
})
