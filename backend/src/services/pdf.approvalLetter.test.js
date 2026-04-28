import { buildHeHtml, buildEnHtml } from './pdf.service.js'
import { getDefaultApprovalTemplate } from '../constants/approvalTemplate.js'

describe('approval letter HTML (design A)', () => {
  const submission = {
    applicationId: 'ETH-2026-022',
    title:           'Sample title',
    track:           'FULL',
    updatedAt:       new Date('2026-04-21T12:00:00Z'),
    author:          { fullName: 'Dr. Sample', email: 'researcher@test.com' },
  }

  const templateContextHe = {
    applicationId:   'ETH-2026-022',
    researchTitle:   'Sample title',
    trackLabel:      'מסלול מלא',
    issueDate:       '27.04.2026',
    approvedDate:    '21.04.2026',
    validUntil:      '21.04.2027',
    researcherName:  'Dr. Sample',
    researcherEmail: 'researcher@test.com',
    institutionName: 'המוסד האקדמי',
  }

  const templateContextEn = {
    ...templateContextHe,
    trackLabel:      'Full Review',
    institutionName: 'Academic Institution',
  }

  it('Hebrew HTML includes design A structure', () => {
    const html = buildHeHtml(
      submission,
      getDefaultApprovalTemplate('he'),
      templateContextHe,
      '',
      '#1e3a5f'
    )
    expect(html).toContain('class="brand-row"')
    expect(html).toContain('class="details-table"')
    expect(html).toContain('id="ef-doc-root"')
    expect(html).toContain('כותרת המחקר:')
    expect(html).toContain('תוקף האישור עד:')
    expect(html).toContain('sig-fields')
    expect(html).toMatch(/<p class="body-text">/)
    expect(html).toContain('חוקר/ת:')
    expect(html).toContain('<br>')
    expect(html).toContain('class="ltr-val"')
    const sigImg = html.indexOf('class="sig-img"')
    if (sigImg !== -1) {
      expect(html.indexOf('box-label">חתימה')).toBeLessThan(sigImg)
    }
  })

  it('English HTML includes design A structure', () => {
    const html = buildEnHtml(
      submission,
      getDefaultApprovalTemplate('en'),
      templateContextEn,
      '',
      '#1e3a5f'
    )
    expect(html).toContain('class="brand-row"')
    expect(html).toContain('class="details-table"')
    expect(html).toContain('Research Title:')
    expect(html).toContain('sig-fields')
  })
})
