/**
 * Ethic-Net — rejection letter HTML templates.
 */

import { escapeHtml, pageShell } from '../layout.js'

/**
 * Builds Hebrew rejection letter page section.
 * @param {object} submission
 * @param {object} template
 * @param {Record<string, string>} ctx
 * @param {string} signatureDataUrl
 * @returns {string}
 */
function buildHeSection(submission, template, ctx, signatureDataUrl) {
  const ltr = (value) => `<span class="ltr-val">${escapeHtml(value)}</span>`
  const signatureCredit = ctx.chairmanName
    ? `${escapeHtml(ctx.chairmanName)} · ${escapeHtml(template.signatureLabel)}`
    : escapeHtml(template.signatureLabel)

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
        <tr><td class="lbl">תאריך החלטה:</td><td class="val">${ltr(ctx.rejectedDate)}</td></tr>
      </table>
    </div>
    <hr class="light">
    <div class="conditions-title">${escapeHtml(template.reasonTitle)}</div>
    <p class="body-text">${escapeHtml(ctx.rejectionReason)}</p>
    <p class="body-text">חוקר/ת: ${escapeHtml(ctx.researcherName)}<br>(<span class="ltr-val">${escapeHtml(ctx.researcherEmail)}</span>)</p>
    <div class="signature-section">
      <table class="sig-fields">
        <tr>
          <td class="sig-signature-cell">
            <div class="box-label">חתימה</div>
            ${signatureDataUrl ? `<img src="${signatureDataUrl}" alt="" class="sig-img">` : ''}
            <div class="sig-credit">${signatureCredit}</div>
          </td>
          <td>
            <div class="box-label">תאריך חתימה</div>
            <div class="box-value">${escapeHtml(ctx.rejectedDate)}</div>
            <div class="box-line"></div>
          </td>
        </tr>
      </table>
    </div>
    <div class="footer approval-footer">
      ${template.legalFooter ? `<div class="footer-legal">${escapeHtml(template.legalFooter)}</div>` : ''}
      <span class="system-note">מסמך זה הופק אוטומטית על ידי Ethic-Net • ${escapeHtml(ctx.institutionName)} • ${escapeHtml(ctx.issueDate)} • מס׳ בקשה: ${escapeHtml(ctx.applicationId)}</span>
    </div>
  </div>
</div>`
}

/**
 * Builds English rejection letter page section.
 * @param {object} submission
 * @param {object} template
 * @param {Record<string, string>} ctx
 * @param {string} signatureDataUrl
 * @returns {string}
 */
function buildEnSection(submission, template, ctx, signatureDataUrl) {
  const signatureCredit = ctx.chairmanName
    ? `${escapeHtml(ctx.chairmanName)} · ${escapeHtml(template.signatureLabel)}`
    : escapeHtml(template.signatureLabel)

  return `<div class="page">
  <div class="header">
    <div class="brand-row">
      <div>
        <div class="brand-name">Ethic-Net</div>
        <div class="header-sub">Ethics Committee Management — ${escapeHtml(ctx.institutionName)}</div>
      </div>
      <div class="header-date">Issued: ${escapeHtml(ctx.issueDate)}</div>
    </div>
  </div>
  <div class="content">
    <div class="doc-title"><h2>${escapeHtml(template.docTitle)}</h2></div>
    <div class="issue-date">Issue date: ${escapeHtml(ctx.issueDate)}</div>
    <div class="addressee">
      <div class="to-label">To,</div>
      <div>${escapeHtml(submission.author.fullName)}</div>
      <div class="email">${escapeHtml(submission.author.email)}</div>
    </div>
    <div class="subject">${escapeHtml(template.subject)}</div>
    <p class="body-text">${escapeHtml(template.intro)}</p>
    <div class="details-box">
      <table class="details-table">
        <tr><td class="lbl">Application ID:</td><td class="val">${escapeHtml(ctx.applicationId)}</td></tr>
        <tr><td class="lbl">Research title:</td><td class="val">${escapeHtml(ctx.researchTitle)}</td></tr>
        <tr><td class="lbl">Track:</td><td class="val">${escapeHtml(ctx.trackLabel)}</td></tr>
        <tr><td class="lbl">Decision date:</td><td class="val">${escapeHtml(ctx.rejectedDate)}</td></tr>
      </table>
    </div>
    <hr class="light">
    <div class="conditions-title">${escapeHtml(template.reasonTitle)}</div>
    <p class="body-text">${escapeHtml(ctx.rejectionReason)}</p>
    <p class="body-text">Researcher: ${escapeHtml(ctx.researcherName)}<br>(${escapeHtml(ctx.researcherEmail)})</p>
    <div class="signature-section">
      <table class="sig-fields">
        <tr>
          <td class="sig-signature-cell">
            <div class="box-label">Signature</div>
            ${signatureDataUrl ? `<img src="${signatureDataUrl}" alt="" class="sig-img">` : ''}
            <div class="sig-credit">${signatureCredit}</div>
          </td>
          <td>
            <div class="box-label">Date signed</div>
            <div class="box-value">${escapeHtml(ctx.rejectedDate)}</div>
            <div class="box-line"></div>
          </td>
        </tr>
      </table>
    </div>
    <div class="footer approval-footer">
      ${template.legalFooter ? `<div class="footer-legal">${escapeHtml(template.legalFooter)}</div>` : ''}
      <span class="system-note">This document was generated automatically by Ethic-Net • ${escapeHtml(ctx.institutionName)} • ${escapeHtml(ctx.issueDate)} • Ref: ${escapeHtml(ctx.applicationId)}</span>
    </div>
  </div>
</div>`
}

/**
 * Builds Hebrew rejection letter HTML.
 * @param {object} submission
 * @param {object} template
 * @param {Record<string, string>} ctx
 * @param {string} [signatureDataUrl]
 * @param {string} [brandPrimary]
 * @returns {string}
 */
export function buildHeRejectionHtml(submission, template, ctx, signatureDataUrl = '', brandPrimary = '#1e3a5f') {
  return pageShell({
    dir: 'rtl',
    lang: 'he-IL',
    bodyHtml: buildHeSection(submission, template, ctx, signatureDataUrl),
    brandPrimary,
    onLetterhead: true,
  })
}

/**
 * Builds English rejection letter HTML.
 * @param {object} submission
 * @param {object} template
 * @param {Record<string, string>} ctx
 * @param {string} [signatureDataUrl]
 * @param {string} [brandPrimary]
 * @returns {string}
 */
export function buildEnRejectionHtml(submission, template, ctx, signatureDataUrl = '', brandPrimary = '#1e3a5f') {
  return pageShell({
    dir: 'ltr',
    lang: 'en',
    bodyHtml: buildEnSection(submission, template, ctx, signatureDataUrl),
    brandPrimary,
    onLetterhead: true,
  })
}

