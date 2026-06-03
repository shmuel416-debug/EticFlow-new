/**
 * Ethic-Net — approval letter HTML templates.
 */

import { escapeHtml, pageShell } from '../layout.js'

/**
 * Builds the Hebrew approval letter page section.
 * @param {object} submission
 * @param {object} template
 * @param {Record<string, string>} ctx
 * @param {string} signatureDataUrl
 * @param {string} brandPrimary
 * @returns {string}
 */
function buildHeSection(submission, template, ctx, signatureDataUrl, brandPrimary) {
  const ltr = (value) => `<span class="ltr-val">${escapeHtml(value)}</span>`
  const conditionLines = template.conditions.map((line) => `<li>${escapeHtml(line)}</li>`).join('')
  return `<div class="page">
  <div class="header">
    <div class="brand-row">
      <div>
        <div class="brand-name">מערכת ועדת אתיקה</div>
        <div class="header-sub">מערכת ניהול ועדת אתיקה — ${escapeHtml(ctx.institutionName)}</div>
      </div>
      <div class="header-date">הופק: ${ltr(ctx.issueDate)}</div>
    </div>
  </div>
  <div class="content">
    <div class="doc-title"><h2>${escapeHtml(template.docTitle)}</h2></div>
    <div class="issue-date">תאריך הנפקה: ${ltr(ctx.issueDate)}</div>
    <div class="addressee">
      <div class="to-label">לכבוד,</div>
      <div>${escapeHtml(submission.author.fullName)}</div>
      <div class="email">${ltr(submission.author.email)}</div>
    </div>
    <div class="subject">${escapeHtml(template.subject)}</div>
    <p class="body-text">${escapeHtml(template.intro)}</p>
    <div class="details-box">
      <table class="details-table">
        <tr><td class="lbl">מספר בקשה:</td><td class="val">${ltr(ctx.applicationId)}</td></tr>
        <tr><td class="lbl">כותרת המחקר:</td><td class="val">${escapeHtml(ctx.researchTitle)}</td></tr>
        <tr><td class="lbl">סוג מסלול:</td><td class="val">${escapeHtml(ctx.trackLabel)}</td></tr>
        <tr><td class="lbl">תאריך אישור:</td><td class="val">${ltr(ctx.approvedDate)}</td></tr>
        <tr><td class="lbl">תוקף האישור עד:</td><td class="val">${ltr(ctx.validUntil)}</td></tr>
      </table>
    </div>
    <hr class="light">
    <div class="conditions-title">${escapeHtml(template.conditionsTitle)}</div>
    <ul class="conditions-list">${conditionLines}</ul>
    <p class="body-text">חוקר/ת: ${escapeHtml(ctx.researcherName)}<br>(<span class="ltr-val">${escapeHtml(ctx.researcherEmail)}</span>)</p>
    <div class="signature-section">
      <div class="sig-line"></div>
      ${ctx.chairmanName ? `<div class="sig-name">${escapeHtml(ctx.chairmanName)}</div>` : ''}
      <div class="sig-label">${escapeHtml(template.signatureLabel)}</div>
      <table class="sig-fields">
        <tr>
          <td>
            <div class="box-label">חתימה</div>
            ${signatureDataUrl ? `<img src="${signatureDataUrl}" alt="" class="sig-img">` : ''}
            <div class="box-line"></div>
          </td>
          <td>
            <div class="box-label">תאריך חתימה</div>
            <div class="box-value">${ltr(ctx.approvedDate)}</div>
            <div class="box-line"></div>
          </td>
        </tr>
      </table>
    </div>
    <div class="footer approval-footer">
      ${template.legalFooter ? `<div class="footer-legal">${escapeHtml(template.legalFooter)}</div>` : ''}
      מסמך זה הופק אוטומטית על ידי מערכת ועדת אתיקה • ${escapeHtml(ctx.institutionName)} • ${ltr(ctx.issueDate)} • מס׳ בקשה: ${ltr(ctx.applicationId)}
    </div>
  </div>
</div>`
}

/**
 * Builds the English approval letter page section.
 * @param {object} submission
 * @param {object} template
 * @param {Record<string, string>} ctx
 * @param {string} signatureDataUrl
 * @returns {string}
 */
function buildEnSection(submission, template, ctx, signatureDataUrl) {
  const conditionLines = template.conditions.map((line) => `<li>${escapeHtml(line)}</li>`).join('')
  return `<div class="page">
  <div class="header">
    <div class="brand-row">
      <div>
        <div class="brand-name">Ethic-Net</div>
        <div class="header-sub">Ethics Committee Management System — ${escapeHtml(ctx.institutionName)}</div>
      </div>
      <div class="header-date">Generated: ${escapeHtml(ctx.issueDate)}</div>
    </div>
  </div>
  <div class="content">
    <div class="doc-title"><h2>${escapeHtml(template.docTitle)}</h2></div>
    <div class="issue-date">Issue date: ${escapeHtml(ctx.issueDate)}</div>
    <div class="addressee">
      <div class="to-label">Dear,</div>
      <div>${escapeHtml(submission.author.fullName)}</div>
      <div class="email">${escapeHtml(submission.author.email)}</div>
    </div>
    <div class="subject">${escapeHtml(template.subject)}</div>
    <p class="body-text">${escapeHtml(template.intro)}</p>
    <div class="details-box">
      <table class="details-table">
        <tr><td class="lbl">Application No.:</td><td class="val">${escapeHtml(ctx.applicationId)}</td></tr>
        <tr><td class="lbl">Research Title:</td><td class="val">${escapeHtml(ctx.researchTitle)}</td></tr>
        <tr><td class="lbl">Review Track:</td><td class="val">${escapeHtml(ctx.trackLabel)}</td></tr>
        <tr><td class="lbl">Approval Date:</td><td class="val">${escapeHtml(ctx.approvedDate)}</td></tr>
        <tr><td class="lbl">Valid Until:</td><td class="val">${escapeHtml(ctx.validUntil)}</td></tr>
      </table>
    </div>
    <hr class="light">
    <div class="conditions-title">${escapeHtml(template.conditionsTitle)}</div>
    <ul class="conditions-list">${conditionLines}</ul>
    <p class="body-text">Researcher: ${escapeHtml(ctx.researcherName)}<br>(${escapeHtml(ctx.researcherEmail)})</p>
    <div class="signature-section">
      <div class="sig-line"></div>
      ${ctx.chairmanName ? `<div class="sig-name">${escapeHtml(ctx.chairmanName)}</div>` : ''}
      <div class="sig-label">${escapeHtml(template.signatureLabel)}</div>
      <table class="sig-fields">
        <tr>
          <td>
            <div class="box-label">Signature</div>
            ${signatureDataUrl ? `<img src="${signatureDataUrl}" alt="" class="sig-img">` : ''}
            <div class="box-line"></div>
          </td>
          <td>
            <div class="box-label">Date signed</div>
            <div class="box-value">${escapeHtml(ctx.approvedDate)}</div>
            <div class="box-line"></div>
          </td>
        </tr>
      </table>
    </div>
    <div class="footer approval-footer">
      ${template.legalFooter ? `<div class="footer-legal">${escapeHtml(template.legalFooter)}</div>` : ''}
      This document was generated automatically by Ethic-Net • ${escapeHtml(ctx.institutionName)} • ${escapeHtml(ctx.issueDate)} • Ref: ${escapeHtml(ctx.applicationId)}
    </div>
  </div>
</div>`
}

/**
 * Builds Hebrew approval letter HTML.
 * @param {object} submission
 * @param {object} template
 * @param {Record<string, string>} ctx
 * @param {string} [signatureDataUrl]
 * @param {string} [brandPrimary]
 * @returns {string}
 */
export function buildHeHtml(submission, template, ctx, signatureDataUrl = '', brandPrimary = '#1e3a5f') {
  return pageShell({
    dir: 'rtl',
    lang: 'he-IL',
    bodyHtml: buildHeSection(submission, template, ctx, signatureDataUrl, brandPrimary),
    brandPrimary,
  })
}

/**
 * Builds English approval letter HTML.
 * @param {object} submission
 * @param {object} template
 * @param {Record<string, string>} ctx
 * @param {string} [signatureDataUrl]
 * @param {string} [brandPrimary]
 * @returns {string}
 */
export function buildEnHtml(submission, template, ctx, signatureDataUrl = '', brandPrimary = '#1e3a5f') {
  return pageShell({
    dir: 'ltr',
    lang: 'en',
    bodyHtml: buildEnSection(submission, template, ctx, signatureDataUrl),
    brandPrimary,
  })
}

/**
 * Builds bilingual approval letter HTML with Hebrew first.
 * @param {object} submission
 * @param {object} heTemplate
 * @param {object} enTemplate
 * @param {Record<string, string>} heCtx
 * @param {Record<string, string>} enCtx
 * @param {string} [signatureDataUrl]
 * @param {string} [brandPrimary]
 * @returns {string}
 */
export function buildBilingualHtml(
  submission,
  heTemplate,
  enTemplate,
  heCtx,
  enCtx,
  signatureDataUrl = '',
  brandPrimary = '#1e3a5f'
) {
  const bodyHtml = `${buildHeSection(submission, heTemplate, heCtx, signatureDataUrl, brandPrimary)}
<div style="page-break-before: always;"></div>
${buildEnSection(submission, enTemplate, enCtx, signatureDataUrl)}`

  return pageShell({
    dir: 'rtl',
    lang: 'he',
    bodyHtml,
    brandPrimary,
  })
}
