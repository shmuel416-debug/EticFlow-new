/**
 * Ethic-Net — submission export PDF HTML template.
 */

import { escapeHtml, pageShell } from '../layout.js'

/**
 * Formats a field answer for PDF display.
 * @param {unknown} value
 * @param {'he'|'en'} lang
 * @returns {string}
 */
function formatAnswerValue(value, lang) {
  if (value === undefined || value === null || value === '') {
    return '—'
  }
  if (Array.isArray(value)) return escapeHtml(value.join(', '))
  if (typeof value === 'boolean') {
    return lang === 'he' ? (value ? 'כן' : 'לא') : (value ? 'Yes' : 'No')
  }
  return escapeHtml(String(value)).replace(/\n/g, '<br>')
}

/**
 * Resolves localized field label.
 * @param {Record<string, unknown>} field
 * @param {'he'|'en'} lang
 * @returns {string}
 */
function fieldLabel(field, lang) {
  if (lang === 'en') {
    return String(field.labelEn || field.label || field.labelHe || field.id || field.key || '')
  }
  return String(field.labelHe || field.label || field.labelEn || field.id || field.key || '')
}

/**
 * Builds answer rows from schema + data snapshot.
 * @param {unknown} schemaJson
 * @param {Record<string, unknown>} dataJson
 * @param {'he'|'en'} lang
 * @returns {string}
 */
function renderAnswerRows(schemaJson, dataJson, lang) {
  const fields = Array.isArray(schemaJson?.fields)
    ? schemaJson.fields.filter(Boolean)
    : Array.isArray(schemaJson?.sections)
      ? schemaJson.sections.flatMap((section) =>
          Array.isArray(section?.fields) ? section.fields.filter(Boolean) : []
        )
      : []

  if (!fields.length) {
    return `<p class="body-text">${lang === 'he' ? 'אין נתוני טופס.' : 'No form data available.'}</p>`
  }

  return fields
    .map((field) => {
      const keyById = field.id
      const keyByLegacy = field.key
      const value = keyById && Object.prototype.hasOwnProperty.call(dataJson, keyById)
        ? dataJson[keyById]
        : keyByLegacy && Object.prototype.hasOwnProperty.call(dataJson, keyByLegacy)
          ? dataJson[keyByLegacy]
          : undefined
      return `<tr>
  <td class="lbl">${escapeHtml(fieldLabel(field, lang))}</td>
  <td class="val">${formatAnswerValue(value, lang)}</td>
</tr>`
    })
    .join('')
}

/**
 * Builds submission export HTML body.
 * @param {object} submission
 * @param {Record<string, unknown>} dataJson
 * @param {'he'|'en'} lang
 * @returns {string}
 */
function buildSubmissionExportBody(submission, dataJson, lang) {
  const isHe = lang === 'he'
  const dir = isHe ? 'rtl' : 'ltr'
  const authorName = isHe
    ? (submission.author?.fullNameHe || submission.author?.fullName || '')
    : (submission.author?.fullName || submission.author?.fullNameHe || '')
  const submittedAt = submission.submittedAt
    ? new Date(submission.submittedAt).toLocaleDateString(isHe ? 'he-IL' : 'en-GB')
    : (isHe ? 'לא הוגש' : 'Not submitted')
  const versionNum = submission.latestVersionNum ?? submission.versions?.[0]?.versionNum ?? 1
  const institutionName = isHe
    ? (process.env.INSTITUTION_NAME_HE || 'EticFlow')
    : (process.env.INSTITUTION_NAME_EN || process.env.INSTITUTION_NAME_HE || 'EticFlow')

  const labels = isHe
    ? {
        docTitle: 'עותק בקשה להגשה',
        applicationId: 'מספר בקשה',
        title: 'כותרת',
        status: 'סטטוס',
        track: 'מסלול',
        author: 'חוקר/ת',
        submittedAt: 'תאריך הגשה',
        version: 'גרסה',
        answers: 'תשובות הטופס',
        footer: 'מסמך זה נוצר אוטומטית ממערכת EticFlow',
      }
    : {
        docTitle: 'Submission Copy',
        applicationId: 'Application ID',
        title: 'Title',
        status: 'Status',
        track: 'Track',
        author: 'Researcher',
        submittedAt: 'Submitted on',
        version: 'Version',
        answers: 'Form Answers',
        footer: 'This document was generated automatically by EticFlow',
      }

  return `<div class="page" dir="${dir}">
  <div class="header">
    <div class="brand-row">
      <div class="brand-name">${escapeHtml(institutionName)}</div>
    </div>
    <div class="header-sub">${escapeHtml(labels.docTitle)}</div>
  </div>
  <div class="content">
    <div class="doc-title"><h2>${escapeHtml(labels.docTitle)}</h2></div>
    <div class="issue-date">${escapeHtml(submittedAt)}</div>
    <hr />
    <div class="details-box">
      <table class="details-table">
        <tr><td class="lbl">${escapeHtml(labels.applicationId)}</td><td class="val ltr-val">${escapeHtml(submission.applicationId)}</td></tr>
        <tr><td class="lbl">${escapeHtml(labels.title)}</td><td class="val">${escapeHtml(submission.title)}</td></tr>
        <tr><td class="lbl">${escapeHtml(labels.status)}</td><td class="val">${escapeHtml(submission.status)}</td></tr>
        <tr><td class="lbl">${escapeHtml(labels.track)}</td><td class="val">${escapeHtml(submission.track)}</td></tr>
        <tr><td class="lbl">${escapeHtml(labels.author)}</td><td class="val">${escapeHtml(authorName)}</td></tr>
        <tr><td class="lbl">${escapeHtml(labels.submittedAt)}</td><td class="val">${escapeHtml(submittedAt)}</td></tr>
        <tr><td class="lbl">${escapeHtml(labels.version)}</td><td class="val">${escapeHtml(String(versionNum))}</td></tr>
      </table>
    </div>
    <h3 class="conditions-title">${escapeHtml(labels.answers)}</h3>
    <div class="details-box">
      <table class="details-table">
        ${renderAnswerRows(submission.formConfig?.schemaJson, dataJson, lang)}
      </table>
    </div>
    <div class="footer">
      <div class="footer-legal">${escapeHtml(labels.footer)}</div>
    </div>
  </div>
</div>`
}

/**
 * Builds complete HTML for submission export PDF.
 * @param {object} submission
 * @param {Record<string, unknown>} dataJson
 * @param {'he'|'en'} lang
 * @param {string} brandPrimary
 * @returns {string}
 */
export function buildSubmissionExportHtml(submission, dataJson, lang = 'he', brandPrimary = '#1e3a5f') {
  const safeLang = lang === 'en' ? 'en' : 'he'
  const bodyHtml = buildSubmissionExportBody(submission, dataJson, safeLang)
  return pageShell({
    dir: safeLang === 'he' ? 'rtl' : 'ltr',
    lang: safeLang === 'he' ? 'he' : 'en',
    bodyHtml,
    brandPrimary,
  })
}
