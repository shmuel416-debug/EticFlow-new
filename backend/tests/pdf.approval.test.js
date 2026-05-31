/**
 * Ethic-Net — approval PDF rendering tests.
 */

import path from 'path'
import os from 'os'
import fs from 'fs/promises'
import { jest } from '@jest/globals'
import { getDefaultApprovalTemplate } from '../src/constants/approvalTemplate.js'
import { renderHtmlToPdf } from '../src/services/pdf/renderer.js'
import { buildHeHtml, buildEnHtml, buildBilingualHtml } from '../src/services/pdf/templates/approvalLetter.js'

let PDFParseClass = null

/**
 * Lazily resolves PDF parser class from ESM package.
 * @returns {Promise<any>}
 */
async function getPDFParseClass() {
  if (PDFParseClass) return PDFParseClass
  const mod = await import('pdf-parse')
  PDFParseClass = mod.PDFParse
  return PDFParseClass
}

/**
 * Builds deterministic approval context for tests.
 * @param {'he'|'en'} lang
 * @returns {Record<string, string>}
 */
function testContext(lang) {
  if (lang === 'en') {
    return {
      applicationId: 'ETH-2026-1001',
      researchTitle: 'Clinical AI Evaluation',
      trackLabel: 'Full Review',
      issueDate: '20 April 2026',
      approvedDate: '19 April 2026',
      validUntil: '19 April 2027',
      researcherName: 'Dr. Noam Levi',
      researcherEmail: 'noam@example.com',
      institutionName: 'Lev Academic Center',
    }
  }
  return {
    applicationId: 'ETH-2026-1001',
    researchTitle: 'בדיקת בינה מלאכותית קלינית',
    trackLabel: 'מסלול מלא',
    issueDate: '20/04/2026',
    approvedDate: '19/04/2026',
    validUntil: '19/04/2027',
    researcherName: 'ד"ר נועם לוי',
    researcherEmail: 'noam@example.com',
    institutionName: 'המרכז האקדמי לב',
  }
}

const submission = {
  applicationId: 'ETH-2026-1001',
  title: 'Clinical AI Evaluation',
  updatedAt: new Date('2026-04-19T12:00:00Z'),
  author: { fullName: 'Dr. Noam Levi', email: 'noam@example.com' },
}

/**
 * Renders HTML to PDF and parses textual content.
 * @param {string} html
 * @returns {Promise<{ text: string, size: number }>}
 */
async function renderAndParse(html) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ef-approval-test-'))
  const outputPath = path.join(tmpDir, 'approval.pdf')
  try {
    await renderHtmlToPdf(html, outputPath)
    const buffer = await fs.readFile(outputPath)
    const PDFParse = await getPDFParseClass()
    const parser = new PDFParse({ data: buffer })
    const parsed = await parser.getText()
    await parser.destroy().catch(() => {})
    return { text: parsed.text, size: buffer.length }
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {})
  }
}

describe('approval PDFs', () => {
  jest.setTimeout(90000)

  it('renders Hebrew PDF with expected text', async () => {
    const html = buildHeHtml(submission, getDefaultApprovalTemplate('he'), testContext('he'), '', '#1e3a5f')
    const { text, size } = await renderAndParse(html)
    expect(size).toBeGreaterThan(5000)
    expect(text).toContain('ETH-2026-1001')
    expect(text).toContain('ד"ר')
    expect(text).toContain('מסלול')
  })

  it('renders English PDF with expected text', async () => {
    const html = buildEnHtml(submission, getDefaultApprovalTemplate('en'), testContext('en'), '', '#1e3a5f')
    const { text, size } = await renderAndParse(html)
    expect(size).toBeGreaterThan(5000)
    expect(text).toContain('Application No')
    expect(text).toContain('Clinical AI Evaluation')
    expect(text).toContain('Full Review')
  })

  it('renders bilingual PDF with both languages', async () => {
    const html = buildBilingualHtml(
      submission,
      getDefaultApprovalTemplate('he'),
      getDefaultApprovalTemplate('en'),
      testContext('he'),
      testContext('en'),
      '',
      '#1e3a5f'
    )
    const { text, size } = await renderAndParse(html)
    expect(size).toBeGreaterThan(6000)
    expect(text).toContain('Application No')
    expect(text).toContain('ETH-2026-1001')
  })
})
