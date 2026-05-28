/**
 * EthicFlow — approval PDF template content tests.
 * Verifies custom approval-letter text is preserved before rendering.
 */

import fs from 'fs/promises'
import { jest } from '@jest/globals'

let capturedHtml = ''

const longIntro = `${'Intro paragraph. '.repeat(70)}INTRO-SENTINEL-MUST-STAY`
const longLegalFooter = `${'Legal commitment. '.repeat(25)}LEGAL-SENTINEL-MUST-STAY`
const customTemplate = {
  docTitle: 'Approval letter',
  subject: 'Research approval',
  intro: longIntro,
  conditionsTitle: 'Approval conditions',
  conditions: [
    'Condition one',
    'Condition two',
    'Condition three',
    'Condition four',
    'CONDITION-FIVE-MUST-STAY',
    'CONDITION-SIX-MUST-STAY',
  ],
  signatureLabel: 'Committee chair',
  legalFooter: longLegalFooter,
}

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
  document: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
}

jest.unstable_mockModule('../src/config/database.js', () => ({
  default: prismaMock,
}))

jest.unstable_mockModule('../src/services/pdf/renderer.js', () => ({
  renderHtmlToPdf: jest.fn(async (html, outputPath) => {
    capturedHtml = html
    await fs.writeFile(outputPath, 'rendered-pdf')
  }),
}))

const { generateApprovalLetter } = await import('../src/services/pdf.service.js')
const { baseCss } = await import('../src/services/pdf/layout.js')

/**
 * Resolves mocked institution setting values by key.
 * @param {string} key
 * @returns {{ value: string } | null}
 */
function settingValueForKey(key) {
  const values = {
    approval_template_en: JSON.stringify(customTemplate),
    approval_chairman_signature: '',
    approval_chairman_name_en: '',
    primary_color: '#1e3a5f',
  }
  return Object.prototype.hasOwnProperty.call(values, key) ? { value: values[key] } : null
}

describe('approval letter template preservation', () => {
  beforeEach(() => {
    capturedHtml = ''
    jest.clearAllMocks()
    prismaMock.submission.findUnique.mockResolvedValue({
      id: 'submission-long-template',
      applicationId: 'ETH-2026-9999',
      title: 'Long consent study',
      status: 'APPROVED',
      track: 'FULL',
      updatedAt: new Date('2026-05-01T10:00:00Z'),
      author: { fullName: 'Dr. Ada Cohen', email: 'ada@example.com' },
      formConfig: { name: 'Research application' },
      slaTracking: null,
    })
    prismaMock.institutionSetting.findUnique.mockImplementation(({ where }) => {
      return Promise.resolve(settingValueForKey(where.key))
    })
    prismaMock.user.findFirst.mockResolvedValue(null)
    prismaMock.document.findFirst.mockResolvedValue(null)
    prismaMock.document.create.mockResolvedValue({ id: 'doc-1' })
  })

  afterEach(async () => {
    await fs.rm('uploads/generated/approval/submission-long-template', {
      recursive: true,
      force: true,
    })
  })

  test('does not truncate custom intro, conditions, or legal footer', async () => {
    await generateApprovalLetter('submission-long-template', 'en')

    expect(capturedHtml).toContain('INTRO-SENTINEL-MUST-STAY')
    expect(capturedHtml).toContain('CONDITION-FIVE-MUST-STAY')
    expect(capturedHtml).toContain('CONDITION-SIX-MUST-STAY')
    expect(capturedHtml).toContain('LEGAL-SENTINEL-MUST-STAY')
  })

  test('allows approval pages to flow instead of clipping overflow', () => {
    const css = baseCss('#1e3a5f')

    expect(css).not.toContain('max-height: 296mm')
    expect(css).not.toContain('overflow: hidden')
  })
})
