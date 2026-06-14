/**
 * Ethic-Net — submission export PDF template branding tests
 */

import { buildSubmissionExportHtml } from '../src/services/pdf/templates/submissionExport.js'

const baseSubmission = {
  applicationId: 'ETH-2026-001',
  title: 'Test Study',
  status: 'SUBMITTED',
  track: 'FULL',
  submittedAt: new Date('2026-06-01'),
  latestVersionNum: 1,
  author: { fullNameHe: 'חוקר', fullName: 'Researcher' },
  formConfig: { schemaJson: { fields: [{ id: 'q1', labelHe: 'שאלה', label: 'Question' }] } },
}

describe('submissionExport PDF branding', () => {
  test('Hebrew HTML uses Ethic-Net and not EticFlow', () => {
    const html = buildSubmissionExportHtml(baseSubmission, { q1: 'answer' }, 'he')
    expect(html).toContain('Ethic-Net')
    expect(html).not.toContain('EticFlow')
  })

  test('English HTML uses Ethic-Net and not EticFlow', () => {
    const html = buildSubmissionExportHtml(baseSubmission, { q1: 'answer' }, 'en')
    expect(html).toContain('Ethic-Net')
    expect(html).not.toContain('EticFlow')
  })
})
