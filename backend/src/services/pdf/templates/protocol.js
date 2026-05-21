/**
 * EthicFlow — protocol PDF HTML templates.
 */

import { escapeHtml, pageShell } from '../layout.js'

const PROTOCOL_PAGINATION_CSS = `
.protocol-page {
  max-height: none;
  display: block;
  page-break-inside: auto;
  break-inside: auto;
  overflow: visible;
}
.protocol-page .content {
  display: block;
  min-height: auto;
}
.protocol-page section,
.protocol-page .details-box,
.protocol-page .footer {
  break-inside: avoid;
  page-break-inside: avoid;
}
.protocol-page .footer {
  margin-top: 24px;
}
`

/**
 * Builds the protocol section rows.
 * @param {{ heading?: string, content?: string }[]} sections
 * @param {'he'|'en'} lang
 * @returns {string}
 */
function renderSections(sections, lang) {
  const hasHebrew = (text) => /[\u0590-\u05FF]/.test(String(text ?? ''))
  const headingMap = {
    'פתיחה': 'Opening',
    'סדר יום': 'Agenda',
    'דיון והחלטות': 'Discussion and Decisions',
    'סיום': 'Closing',
    'חברים שנעדרו מהדיון בשל ניגוד עניינים': 'Members Recused Due To Conflict Of Interest',
  }

  if (lang === 'en') {
    return sections
      .map((section) => {
        const sourceHeading = String(section?.heading ?? '').trim()
        const sourceContent = String(section?.content ?? '').trim()
        const heading = escapeHtml(section?.headingEn ?? headingMap[sourceHeading] ?? 'Section')
        const content = String(section?.contentEn ?? '').trim()
        const finalContent = content
          ? escapeHtml(content).replace(/\n/g, '<br>')
          : hasHebrew(sourceContent)
            ? 'See the Hebrew page for the full committee discussion details.'
            : escapeHtml(sourceContent).replace(/\n/g, '<br>')
        return `<section style="margin-bottom:16px;">
  <h3 style="font-size:13pt; color:#1e3a5f; margin-bottom:6px;">${heading}</h3>
  <p class="body-text">${finalContent}</p>
</section>`
      })
      .join('')
  }

  return sections
    .map((section) => {
      const heading = escapeHtml(section?.heading ?? '')
      const content = escapeHtml(section?.content ?? '').replace(/\n/g, '<br>')
      return `<section style="margin-bottom:16px;">
  <h3 style="font-size:13pt; color:#1e3a5f; margin-bottom:6px;">${heading}</h3>
  <p class="body-text">${content}</p>
</section>`
    })
    .join('')
}

/**
 * Builds signatures list for protocol output.
 * @param {object[]} signatures
 * @param {'he'|'en'} lang
 * @returns {string}
 */
function renderSignatures(signatures, lang) {
  if (!Array.isArray(signatures) || signatures.length === 0) return ''
  const title = lang === 'he' ? 'חתימות' : 'Signatures'
  const rows = signatures
    .map((sig) => {
      const name = escapeHtml(sig?.user?.fullName ?? sig?.userId ?? '')
      let status = ''
      if (sig?.status === 'SIGNED') status = lang === 'he' ? 'חתם' : 'Signed'
      else if (sig?.status === 'DECLINED') status = lang === 'he' ? 'סירב לחתום' : 'Declined'
      else status = lang === 'he' ? 'ממתין לחתימה' : 'Pending signature'
      return `<tr><td class="lbl">${name}</td><td class="val">${escapeHtml(status)}</td></tr>`
    })
    .join('')

  return `<hr class="light">
<div class="conditions-title">${title}</div>
<div class="details-box">
  <table class="details-table">${rows}</table>
</div>`
}

/**
 * Builds one language protocol section.
 * @param {object} protocol
 * @param {{ issueDate: string, meetingDate: string, statusLabel: string, titleLabel: string, meetingLabel: string, statusFieldLabel: string, footer: string, institutionName: string }} labels
 * @param {'he'|'en'} lang
 * @returns {string}
 */
function buildProtocolSection(protocol, labels, lang) {
  const isHebrew = lang === 'he'
  const title = isHebrew ? (protocol.title ?? labels.titleLabel) : labels.titleLabel
  return `<div class="page protocol-page">
  <div class="header">
    <div class="brand-row">
      <div>
        <div class="brand-name">${isHebrew ? 'מערכת ועדת אתיקה' : 'EthicFlow'}</div>
        <div class="header-sub">${escapeHtml(labels.institutionName)}</div>
      </div>
      <div class="header-date">${escapeHtml(labels.issueDate)}</div>
    </div>
  </div>
  <div class="content">
    <div class="doc-title"><h2>${escapeHtml(title)}</h2></div>
    <div class="issue-date">${escapeHtml(labels.meetingLabel)}: ${escapeHtml(labels.meetingDate)}</div>
    <hr>
    <div class="details-box">
      <table class="details-table">
        <tr><td class="lbl">${escapeHtml(labels.statusFieldLabel)}</td><td class="val">${escapeHtml(labels.statusLabel)}</td></tr>
      </table>
    </div>
    ${renderSections(Array.isArray(protocol.contentJson?.sections) ? protocol.contentJson.sections : [], lang)}
    ${renderSignatures(protocol.signatures, lang)}
    <div class="footer">${escapeHtml(labels.footer)}</div>
  </div>
</div>`
}

/**
 * Builds protocol HTML for one language.
 * @param {object} protocol
 * @param {'he'|'en'} lang
 * @param {object} context
 * @returns {string}
 */
export function buildProtocolHtml(protocol, lang, context) {
  const safeLang = lang === 'en' ? 'en' : 'he'
  const bodyHtml = buildProtocolSection(protocol, context[safeLang], safeLang)
  return pageShell({
    dir: safeLang === 'he' ? 'rtl' : 'ltr',
    lang: safeLang === 'he' ? 'he-IL' : 'en',
    bodyHtml,
    brandPrimary: context.brandPrimary,
    extraCss: PROTOCOL_PAGINATION_CSS,
  })
}

/**
 * Builds bilingual protocol HTML (Hebrew then English).
 * @param {object} protocol
 * @param {object} context
 * @returns {string}
 */
export function buildBilingualProtocolHtml(protocol, context) {
  const bodyHtml = `${buildProtocolSection(protocol, context.he, 'he')}
<div style="page-break-before: always;"></div>
${buildProtocolSection(protocol, context.en, 'en')}`
  return pageShell({
    dir: 'rtl',
    lang: 'he',
    bodyHtml,
    brandPrimary: context.brandPrimary,
    extraCss: PROTOCOL_PAGINATION_CSS,
  })
}
