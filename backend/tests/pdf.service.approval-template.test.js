/**
 * EthicFlow — PDF service approval template preservation tests.
 */

import path from 'path'
import fs from 'fs/promises'
import { jest } from '@jest/globals'

let capturedHtml = ''

const longTemplate = {
  docTitle: 'Ethics Committee Approval',
  subject: 'Re: Ethics Committee Research Approval',
  intro: 'Full approval intro text that must be preserved in the generated approval letter without silent truncation.',
  conditionsTitle: 'Approval Conditions:',
  conditions: Array.from(
    { length: 8 },
    (_value, index) => `CONDITION-${index + 1}-UNIQUE-TEXT must remain present in the generated PDF document.`
  ),
  signatureLabel: 'Chairperson, Ethics Committee',
  legalFooter: 'Full legal footer text that must remain present in official generated documents.',
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
    update: jest.fn(),
    create: jest.fn(),
  },
}

jest.unstable_mockModule('../src/config/database.js', () => ({
  default: prismaMock,
}))

jest.unstable_mockModule('../src/services/pdf/renderer.js', () => ({
  renderHtmlToPdf: jest.fn(async (html, outputPath) => {
    capturedHtml = html
    await fs.writeFile(outputPath, 'PDFDATA')
  }),
}))

const { generateApprovalLetter } = await import('../src/services/pdf.service.js')

/**
 * Returns a mock institution setting by key.
 * @param {string} key
 * @returns {{ value: string }|null}
 */
function settingForKey(key) {
  if (key === 'approval_template_en') return { value: JSON.stringify(longTemplate) }
  if (key === 'approval_chairman_name_en') return { value: 'Dr. Chair Example' }
  return null
}

describe('pdf.service approval template handling', () => {
  beforeEach(() => {
    capturedHtml = ''
    jest.clearAllMocks()
    prismaMock.submission.findUnique.mockResolvedValue({
      id: 'sub-1',
      status: 'APPROVED',
      applicationId: 'ETH-2026-2001',
      title: 'Safety Study',
      track: 'FULL',
      updatedAt: new Date('2026-05-01T10:00:00Z'),
      author: { fullName: 'Dr. Researcher', email: 'researcher@example.com' },
      formConfig: { name: 'Default Form' },
      slaTracking: null,
    })
    prismaMock.institutionSetting.findUnique.mockImplementation(({ where }) => (
      Promise.resolve(settingForKey(where.key))
    ))
    prismaMock.user.findFirst.mockResolvedValue(null)
    prismaMock.document.findFirst.mockResolvedValue(null)
    prismaMock.document.create.mockResolvedValue({ id: 'doc-1' })
  })

  afterEach(async () => {
    await fs.rm(path.resolve('uploads', 'generated', 'approval', 'sub-1'), { recursive: true, force: true })
  })

  test('keeps every configured condition in approval letters', async () => {
    await generateApprovalLetter('sub-1', 'en')

    expect(capturedHtml).toContain('Full approval intro text')
    expect(capturedHtml).toContain('Full legal footer text')
    expect(capturedHtml).toContain('CONDITION-1-UNIQUE-TEXT')
    expect(capturedHtml).toContain('CONDITION-8-UNIQUE-TEXT')
  })
})
