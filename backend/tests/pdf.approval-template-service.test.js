/**
 * EthicFlow — approval template PDF service tests.
 */

import fs from 'fs/promises'
import { jest } from '@jest/globals'

const prismaMock = {
  submission: {
    findUnique: jest.fn(),
  },
  institutionSetting: {
    findUnique: jest.fn(),
  },
  user: {
    findFirst: jest.fn(),
  },
}

const rendererMock = {
  renderHtmlToPdf: jest.fn(async (_html, outputPath) => {
    await fs.writeFile(outputPath, Buffer.from('%PDF-1.4\n'))
  }),
}

jest.unstable_mockModule('../src/config/database.js', () => ({
  default: prismaMock,
}))

jest.unstable_mockModule('../src/services/pdf/renderer.js', () => rendererMock)

const { generateApprovalLetterPreview } = await import('../src/services/pdf.service.js')

/**
 * Builds a valid approval template with content near validation limits.
 * @returns {object}
 */
function buildTemplateWithFullLegalText() {
  return {
    docTitle: 'Ethics Approval',
    subject: 'Approval subject',
    intro: `${'Detailed legal approval text. '.repeat(35)}INTRO_SENTINEL_FINAL`,
    conditionsTitle: 'Conditions',
    conditions: Array.from({ length: 8 }, (_value, index) => `Condition ${index + 1} - required obligation`),
    signatureLabel: 'Committee chair',
    legalFooter: `${'Footer legal clause. '.repeat(20)}FOOTER_SENTINEL_FINAL`,
  }
}

describe('approval template PDF service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    prismaMock.submission.findUnique.mockResolvedValue({
      id: 'sub-1',
      applicationId: 'ETH-2026-1001',
      title: 'Full Legal Text Study',
      track: 'FULL',
      status: 'APPROVED',
      updatedAt: new Date('2026-04-20T08:00:00Z'),
      author: { fullName: 'Dr. Noam Levi', email: 'noam@example.com' },
      formConfig: { name: 'Default form' },
      slaTracking: null,
    })
    prismaMock.institutionSetting.findUnique.mockResolvedValue(null)
    prismaMock.user.findFirst.mockResolvedValue(null)
  })

  test('preserves all validated approval template text in preview HTML', async () => {
    const template = buildTemplateWithFullLegalText()

    await generateApprovalLetterPreview('sub-1', 'en', template)

    const renderedHtml = rendererMock.renderHtmlToPdf.mock.calls[0][0]
    expect(renderedHtml).toContain('INTRO_SENTINEL_FINAL')
    expect(renderedHtml).toContain('FOOTER_SENTINEL_FINAL')
    expect(renderedHtml).toContain('Condition 8 - required obligation')
  })
})
