/**
 * EthicFlow — approval template fitting regression tests.
 */

import { jest } from '@jest/globals'

jest.unstable_mockModule('../src/config/database.js', () => ({
  default: {},
}))
jest.unstable_mockModule('../src/services/pdf/renderer.js', () => ({
  renderHtmlToPdf: jest.fn(),
}))

const { fitApprovalTemplateToSinglePage } = await import('../src/services/pdf.service.js')

describe('approval template fitting', () => {
  test('preserves all allowed approval conditions', () => {
    const template = {
      docTitle: 'Approval',
      subject: 'Subject',
      intro: 'Intro',
      conditionsTitle: 'Conditions',
      conditions: Array.from({ length: 8 }, (_item, index) => `Condition ${index + 1}`),
      signatureLabel: 'Chair',
      legalFooter: 'Footer',
    }

    const fitted = fitApprovalTemplateToSinglePage(template)

    expect(fitted.conditions).toHaveLength(8)
    expect(fitted.conditions).toContain('Condition 8')
  })
})
