/**
 * EthicFlow — protocol PDF document metadata regression tests.
 */

import path from 'path'
import fs from 'fs/promises'
import { jest } from '@jest/globals'

const prismaMock = {
  document: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  institutionSetting: {
    findUnique: jest.fn(),
  },
}

const renderHtmlToPdfMock = jest.fn(async (_html, outputPath) => {
  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.writeFile(outputPath, Buffer.from('%PDF-1.4\nmetadata-test\n'))
})

jest.unstable_mockModule('../src/config/database.js', () => ({
  default: prismaMock,
}))
jest.unstable_mockModule('../src/services/pdf/renderer.js', () => ({
  renderHtmlToPdf: renderHtmlToPdfMock,
}))

const { generateProtocolPdf } = await import('../src/services/pdf.service.js')

/**
 * Builds the minimal protocol shape required for PDF generation.
 * @returns {object}
 */
function protocolFixture() {
  return {
    id: 'protocol-1',
    status: 'SIGNED',
    title: 'Protocol title',
    contentJson: {
      sections: [{ heading: 'Decision', content: 'Approved submission ETH-1.' }],
    },
    meeting: { scheduledAt: new Date('2026-05-01T09:00:00Z') },
    signatures: [],
  }
}

describe('pdf.service protocol metadata', () => {
  afterEach(async () => {
    await fs.rm(path.resolve('uploads', 'generated', 'protocols', 'protocol-1'), {
      recursive: true,
      force: true,
    })
  })

  beforeEach(() => {
    jest.clearAllMocks()
    prismaMock.document.findFirst.mockResolvedValue(null)
    prismaMock.document.create.mockResolvedValue({ id: 'doc-1' })
    prismaMock.institutionSetting.findUnique.mockResolvedValue(null)
  })

  test('links generated protocol PDFs to the protocol document relation', async () => {
    const result = await generateProtocolPdf(protocolFixture(), 'he')

    expect(result).toEqual({
      docId: 'doc-1',
      storagePath: 'generated/protocols/protocol-1/protocol-he.pdf',
    })
    expect(prismaMock.document.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        protocolId: 'protocol-1',
        submissionId: null,
        source: 'GENERATED',
        storagePath: 'generated/protocols/protocol-1/protocol-he.pdf',
      }),
      select: { id: true },
    })
  })
})
