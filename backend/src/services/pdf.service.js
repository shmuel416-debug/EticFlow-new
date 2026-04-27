/**
 * EthicFlow — PDF Service
 * Generates approval letter PDFs (Hebrew + English) via Puppeteer (HTML→PDF)
 * and protocol PDFs via PDFKit.
 *
 * Generated files:
 *   Approval letters : uploads/generated/approval/{submissionId}/approval-letter-{lang}.pdf
 *   Protocols        : uploads/generated/protocols/{protocolId}/protocol.pdf
 */

import puppeteer    from 'puppeteer'
import PDFDocument  from 'pdfkit'
import path         from 'path'
import os           from 'os'
import fs           from 'fs/promises'
import { createWriteStream, existsSync, readFileSync } from 'fs'
import { fileURLToPath }     from 'url'
import prisma                from '../config/database.js'
import {
  APPROVAL_SIGNATURE_KEY,
  getDefaultApprovalTemplate,
  normalizeApprovalTemplate,
  validateApprovalTemplatePayload,
} from '../constants/approvalTemplate.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** Path to Unicode fonts bundled with this service. */
const FONTS_DIR = path.join(__dirname, 'fonts')

/**
 * Loads a font file as a base64 string for HTML @font-face embedding.
 * @param {string} fontPath
 * @returns {string}
 */
function loadFontFileBase64(fontPath) {
  try {
    if (!existsSync(fontPath)) return ''
    return readFileSync(fontPath).toString('base64')
  } catch {
    return ''
  }
}

const ARIAL_REGULAR_B64 = loadFontFileBase64(path.join(FONTS_DIR, 'Arial.ttf'))
const ARIAL_BOLD_B64    = loadFontFileBase64(path.join(FONTS_DIR, 'Arial-Bold.ttf'))

/**
 * Generates @font-face CSS declarations embedding the bundled Arial fonts.
 * @returns {string}
 */
function fontFaceCss() {
  if (!ARIAL_REGULAR_B64) return ''
  return `
@font-face {
  font-family: 'Arial';
  font-weight: 400;
  src: url('data:font/truetype;base64,${ARIAL_REGULAR_B64}') format('truetype');
}
${ARIAL_BOLD_B64 ? `@font-face {
  font-family: 'Arial';
  font-weight: 700;
  src: url('data:font/truetype;base64,${ARIAL_BOLD_B64}') format('truetype');
}` : ''}
`
}

/** Output directories for generated PDFs. */
const GENERATED_DIR          = path.resolve('uploads', 'generated', 'approval')
const PROTOCOL_GENERATED_DIR = path.resolve('uploads', 'generated', 'protocols')
const BRAND_PRIMARY          = '#1e3a5f'
const BRAND_ACCENT           = '#93c5fd'
const INSTITUTION_NAME_HE    = process.env.INSTITUTION_NAME_HE || 'המוסד האקדמי'
const INSTITUTION_NAME_EN    = process.env.INSTITUTION_NAME_EN || 'Academic Institution'
const PDF_LOGO_PATH          = process.env.PDF_LOGO_PATH ? path.resolve(process.env.PDF_LOGO_PATH) : null
const INSTITUTION_LOGO_PATH  = process.env.INSTITUTION_LOGO ? path.resolve(process.env.INSTITUTION_LOGO) : null
const PDF_LOGO_HTML_SRC      = resolvePdfLogoHtmlSrc()
const INSTITUTION_LOGO_HTML_SRC = resolveImagePathToDataUri(INSTITUTION_LOGO_PATH)
const PDF_LOGO_IMAGE_PATH    = PDF_LOGO_PATH && /\.(png|jpe?g|webp)$/i.test(PDF_LOGO_PATH) && existsSync(PDF_LOGO_PATH)
  ? PDF_LOGO_PATH
  : null
const INSTITUTION_LOGO_IMAGE_PATH = INSTITUTION_LOGO_PATH && /\.(png|jpe?g|webp)$/i.test(INSTITUTION_LOGO_PATH) && existsSync(INSTITUTION_LOGO_PATH)
  ? INSTITUTION_LOGO_PATH
  : null

/**
 * Converts the configured logo path to a data URI for HTML templates.
 * @returns {string}
 */
function resolvePdfLogoHtmlSrc() {
  return resolveImagePathToDataUri(PDF_LOGO_PATH)
}

/**
 * Converts an image path to a data URI for HTML templates.
 * @param {string|null} imagePath
 * @returns {string}
 */
function resolveImagePathToDataUri(imagePath) {
  if (!imagePath || !existsSync(imagePath)) return ''
  const ext = path.extname(imagePath).toLowerCase()
  const mimeMap = {
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg':  'image/svg+xml',
    '.webp': 'image/webp',
  }
  const mime = mimeMap[ext]
  if (!mime) return ''
  try {
    const file = readFileSync(imagePath)
    return `data:${mime};base64,${file.toString('base64')}`
  } catch {
    return ''
  }
}

// ─────────────────────────────────────────────
// SHARED HELPERS
// ─────────────────────────────────────────────

/**
 * Formats a date as dd/MM/yyyy (Israeli locale).
 * @param {Date|string} date
 * @returns {string}
 */
function fmtDate(date) {
  const d = new Date(date)
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/**
 * Formats a date in long English form (e.g. "01 April 2025").
 * @param {Date|string} date
 * @returns {string}
 */
function fmtDateEn(date) {
  return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
}

/**
 * Returns human-readable track labels in both languages.
 * @param {string} track
 * @returns {{ he: string, en: string }}
 */
function trackLabel(track) {
  const map = {
    FULL:      { he: 'מסלול מלא',    en: 'Full Review' },
    EXPEDITED: { he: 'מסלול מקוצר', en: 'Expedited Review' },
    EXEMPT:    { he: 'פטור',         en: 'Exempt' },
  }
  return map[track] ?? { he: track, en: track }
}

/**
 * Returns the approval expiry date string (1 year after approvedAt).
 * @param {Date|string} approvedAt
 * @param {'he'|'en'} lang
 * @returns {string}
 */
function validUntil(approvedAt, lang = 'he') {
  const d = new Date(approvedAt)
  d.setFullYear(d.getFullYear() + 1)
  return lang === 'he' ? fmtDate(d) : fmtDateEn(d)
}

/**
 * Escapes HTML special characters to prevent injection in PDF templates.
 * @param {string|null|undefined} str
 * @returns {string}
 */
function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Reads and normalizes approval template from settings store.
 * @param {'he'|'en'} lang
 * @returns {Promise<ReturnType<typeof getDefaultApprovalTemplate>>}
 */
async function getStoredApprovalTemplate(lang) {
  const key = lang === 'en' ? 'approval_template_en' : 'approval_template_he'
  const setting = await prisma.institutionSetting.findUnique({
    where: { key },
    select: { value: true },
  })
  if (!setting?.value) return getDefaultApprovalTemplate(lang)
  try {
    const parsed = JSON.parse(setting.value)
    return normalizeApprovalTemplate(parsed, lang)
  } catch {
    return getDefaultApprovalTemplate(lang)
  }
}

/**
 * Reads chairman signature image from settings as data URL.
 * @returns {Promise<string>}
 */
async function getStoredChairmanSignature() {
  const setting = await prisma.institutionSetting.findUnique({
    where: { key: APPROVAL_SIGNATURE_KEY },
    select: { value: true },
  })
  return String(setting?.value ?? '')
}

/**
 * Converts data URL image to Buffer for PDFKit image rendering.
 * Supports PNG/JPEG.
 * @param {string} dataUrl
 * @returns {Buffer|null}
 */
function imageBufferFromDataUrl(dataUrl) {
  if (!/^data:image\/(png|jpe?g);base64,/i.test(dataUrl)) return null
  const base64 = dataUrl.substring(dataUrl.indexOf(',') + 1)
  try {
    return Buffer.from(base64, 'base64')
  } catch {
    return null
  }
}

/**
 * Loads a submission required for approval-letter generation.
 * @param {string} submissionId
 * @returns {Promise<object>}
 */
async function getApprovalSubmission(submissionId) {
  const submission = await prisma.submission.findUnique({
    where:   { id: submissionId },
    include: {
      author:      { select: { fullName: true, email: true } },
      formConfig:  { select: { name: true } },
      slaTracking: true,
    },
  })
  if (!submission) throw new Error('Submission not found')
  if (submission.status !== 'APPROVED') throw new Error('Submission is not approved')
  return submission
}

/**
 * Builds placeholder context from submission for template interpolation.
 * @param {'he'|'en'} safeLang
 * @param {object} submission
 * @returns {Record<string, string>}
 */
function buildApprovalTemplateContext(safeLang, submission) {
  const track = trackLabel(submission.track)
  return {
    applicationId: String(submission.applicationId ?? ''),
    researchTitle: String(submission.title ?? ''),
    trackLabel: safeLang === 'he' ? String(track.he) : String(track.en),
    issueDate: safeLang === 'he' ? fmtDate(new Date()) : fmtDateEn(new Date()),
    approvedDate: safeLang === 'he' ? fmtDate(submission.updatedAt) : fmtDateEn(submission.updatedAt),
    validUntil: validUntil(submission.updatedAt, safeLang),
    researcherName: String(submission.author?.fullName ?? ''),
    researcherEmail: String(submission.author?.email ?? ''),
    institutionName: safeLang === 'he' ? INSTITUTION_NAME_HE : INSTITUTION_NAME_EN,
  }
}

/**
 * Replaces supported template placeholders with submission-specific values.
 * @param {string} text
 * @param {Record<string, string>} context
 * @returns {string}
 */
function applyTemplateTokens(text, context) {
  return String(text ?? '').replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_match, tokenName) => context[tokenName] ?? '')
}

// ─────────────────────────────────────────────
// HTML TEMPLATES
// ─────────────────────────────────────────────

/**
 * Returns institution primary color from settings, or the default brand hex.
 * @returns {Promise<string>}
 */
async function getInstitutionPrimaryColorHex() {
  const row = await prisma.institutionSetting.findUnique({
    where:  { key: 'primary_color' },
    select: { value: true },
  })
  const v = String(row?.value ?? '').trim()
  if (/^#[0-9A-Fa-f]{6}$/.test(v)) return v
  return BRAND_PRIMARY
}

/**
 * Builds the Hebrew (RTL) approval letter HTML.
 * Uses embedded Arial fonts so Puppeteer renders correctly without network access.
 * @param {object} submission
 * @param {ReturnType<typeof getDefaultApprovalTemplate>} template
 * @param {Record<string, string>} templateContext
 * @param {string} [signatureDataUrl='']
 * @param {string} [brandPrimary='#1e3a5f'] - institution primary / header color
 * @returns {string}
 */
function buildHeHtml(submission, template, templateContext, signatureDataUrl = '', brandPrimary = BRAND_PRIMARY) {
  const today        = fmtDate(new Date())
  const approvedDate = fmtDate(submission.updatedAt)
  const expiryDate   = validUntil(submission.updatedAt, 'he')
  const track        = trackLabel(submission.track)
  const titleDisplay = submission.title.length > 80 ? submission.title.slice(0, 80) + '…' : submission.title
  const docTitle     = escapeHtml(applyTemplateTokens(template.docTitle, templateContext))
  const subject      = escapeHtml(applyTemplateTokens(template.subject, templateContext))
  const intro        = escapeHtml(applyTemplateTokens(template.intro, templateContext))
  const conditionsTitle = escapeHtml(applyTemplateTokens(template.conditionsTitle, templateContext))
  const signatureLabel = escapeHtml(applyTemplateTokens(template.signatureLabel, templateContext))
  const legalFooter  = escapeHtml(applyTemplateTokens(template.legalFooter, templateContext))
  const conditionLines = template.conditions
    .map((line) => escapeHtml(applyTemplateTokens(line, templateContext)))
    .filter(Boolean)
  const institution  = escapeHtml(INSTITUTION_NAME_HE)

  /** Bidi-isolated LTR span (dates, IDs, emails) — matches design A `.ltr-val`. */
  const ltr = (str) => `<span class="ltr-val">${str}</span>`

  return `<!DOCTYPE html>
<html dir="rtl" lang="he-IL">
<head>
<meta charset="utf-8">
<style>
${fontFaceCss()}
* { margin: 0; padding: 0; box-sizing: border-box; }
@page { size: A4; margin: 0; }
body {
  font-family: 'Arial', 'Arial Hebrew', sans-serif;
  direction: rtl;
  font-size: 13pt;
  line-height: 1.8;
  color: #1e293b;
  background: white;
}
#ef-doc-root { direction: rtl; unicode-bidi: isolate; width: 100%; min-height: 100%; }
.page { width: 210mm; min-height: 297mm; direction: rtl; }
.header {
  background: ${brandPrimary};
  color: white;
  padding: 24px 36px 18px;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
  direction: rtl;
}
/* inline-block layout avoids Chromium flex mis-ordering of Hebrew glyphs in print. */
.brand-row { direction: rtl; text-align: right; }
.logo-badge {
  display: inline-block;
  vertical-align: middle;
  width: 44px; height: 44px; line-height: 44px;
  border-radius: 10px;
  background: white;
  color: ${brandPrimary};
  text-align: center;
  font-weight: 900; font-size: 14pt;
  margin-left: 14px;
}
.brand-text { display: inline-block; vertical-align: middle; }
.brand-name { font-size: 20pt; font-weight: bold; letter-spacing: 0.5px; text-align: right; }
.header-sub { font-size: 9.5pt; color: rgba(255,255,255,0.82); margin-top: 6px; text-align: right; }
.header-date { font-size: 9pt; color: #cbd5e1; margin-top: 8px; text-align: left; }
.content {
  padding: 30px 40px;
  direction: rtl;
  text-align: right;
}
.doc-title { text-align: center; margin-bottom: 4px; direction: rtl; }
.doc-title h2 { font-size: 17pt; font-weight: bold; color: ${brandPrimary}; }
.issue-date { text-align: center; color: #64748b; font-size: 10pt; margin-bottom: 20px; direction: rtl; }
.ltr-val { direction: ltr; display: inline-block; unicode-bidi: isolate; }
hr { border: none; border-top: 1.5px solid ${brandPrimary}; margin: 14px 0; }
hr.light { border-color: #e2e8f0; border-width: 1px; }
.addressee { margin-bottom: 14px; font-size: 11pt; direction: rtl; text-align: right; }
.to-label { font-weight: bold; color: ${brandPrimary}; }
.email { color: #64748b; font-size: 9.5pt; margin-top: 2px; direction: rtl; text-align: right; }
.subject { font-weight: bold; color: ${brandPrimary}; font-size: 12pt; margin-bottom: 8px; text-align: right; }
.body-text { font-size: 11.5pt; color: #374151; line-height: 1.85; margin-bottom: 14px; text-align: right; }
.details-box {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #f8fafc;
  padding: 4px 16px;
  margin: 16px 0;
  direction: rtl;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
/* <table> with explicit column widths — reliable in Chromium print for RTL. */
.details-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11pt;
  direction: rtl;
}
.details-table tr + tr td { border-top: 1px solid #e2e8f0; }
.details-table td { padding: 9px 4px; vertical-align: baseline; }
.details-table .lbl {
  color: #475569;
  font-weight: bold;
  white-space: nowrap;
  width: 38%;
  font-size: 10pt;
  text-align: right;
}
.details-table .val {
  color: #0f172a;
  font-weight: bold;
  padding-right: 14px;
  text-align: right;
  word-break: break-word;
}
.conditions-title { font-weight: bold; color: ${brandPrimary}; font-size: 12pt; margin-bottom: 8px; text-align: right; }
.conditions-list {
  list-style: none;
  padding: 0;
  margin: 0 0 14px 0;
  direction: rtl;
  text-align: right;
}
/* PDF-safe bullets: flex ::before is unreliable in headless Chrome print. */
.conditions-list li {
  font-size: 11pt;
  color: #374151;
  padding: 4px 1.1em 4px 0;
  position: relative;
  text-align: right;
  direction: rtl;
}
.conditions-list li::before {
  content: '•';
  color: ${brandPrimary};
  font-weight: bold;
  position: absolute;
  right: 0;
  top: 0.35em;
}
.signature-section { text-align: center; margin-top: 32px; direction: rtl; }
.sig-line { border-top: 1px solid #94a3b8; width: 260px; margin: 0 auto 8px; }
.sig-label { color: ${brandPrimary}; font-weight: bold; font-size: 11pt; }
/* sig-fields: use table layout — grid can mis-render in some Chromium print versions. */
.sig-fields {
  margin-top: 14px;
  width: 100%;
  border-collapse: separate;
  border-spacing: 16px 0;
  direction: rtl;
}
.sig-fields td {
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 10px 12px;
  min-height: 60px;
  vertical-align: top;
  text-align: right;
  width: 50%;
}
.sig-img {
  max-height: 52px;
  max-width: 100%;
  object-fit: contain;
  display: block;
  margin: 4px 0 8px;
}
.box-label { color: #64748b; font-size: 9pt; margin-bottom: 12px; }
.box-line { border-top: 1px solid #94a3b8; margin-top: 8px; }
.footer {
  margin-top: 28px;
  padding-top: 10px;
  border-top: 1px solid #e2e8f0;
  text-align: center;
  font-size: 8pt;
  color: #94a3b8;
  line-height: 1.6;
  direction: rtl;
}
.footer-legal { margin-bottom: 6px; }
h1, h2, h3, strong, .to-label { font-weight: bold; }
</style>
</head>
<body>
<div id="ef-doc-root" dir="rtl" lang="he-IL">
<div class="page">
  <div class="header">
    <div class="brand-row">
      <span class="logo-badge">א</span>
      <span class="brand-text">
        <div class="brand-name">מערכת ועדת אתיקה</div>
        <div class="header-sub">מערכת ניהול ועדת אתיקה &mdash; ${institution}</div>
      </span>
    </div>
    <div class="header-date">הופק: ${ltr(escapeHtml(today))}</div>
  </div>
  <div class="content">
    <div class="doc-title"><h2>${docTitle}</h2></div>
    <div class="issue-date">תאריך הנפקה: ${ltr(escapeHtml(today))}</div>
    <hr>
    <div class="addressee">
      <div class="to-label">לכבוד,</div>
      <div>${escapeHtml(submission.author.fullName)}</div>
      <div class="email">${ltr(escapeHtml(submission.author.email))}</div>
    </div>
    <div class="subject">${subject}</div>
    <p class="body-text">${intro}</p>
    <div class="details-box">
      <table class="details-table">
        <tr><td class="lbl">מספר בקשה:</td><td class="val">${ltr(escapeHtml(submission.applicationId))}</td></tr>
        <tr><td class="lbl">כותרת המחקר:</td><td class="val">${escapeHtml(titleDisplay)}</td></tr>
        <tr><td class="lbl">סוג מסלול:</td><td class="val">${escapeHtml(track.he)}</td></tr>
        <tr><td class="lbl">תאריך אישור:</td><td class="val">${ltr(escapeHtml(approvedDate))}</td></tr>
        <tr><td class="lbl">תוקף האישור עד:</td><td class="val">${ltr(escapeHtml(expiryDate))}</td></tr>
      </table>
    </div>
    <hr class="light">
    <div class="conditions-title">${conditionsTitle}</div>
    <ul class="conditions-list">
      ${conditionLines.map((line) => `<li>${line}</li>`).join('')}
    </ul>
    <p style="font-size:11pt;color:#374151;margin-bottom:6px;direction:rtl;text-align:right;">
      חוקר/ת: ${escapeHtml(submission.author.fullName)}<br>
      (<span class="ltr-val">${escapeHtml(submission.author.email)}</span>)
    </p>
    <div class="signature-section">
      <div class="sig-line"></div>
      <div class="sig-label">${signatureLabel}</div>
      <table class="sig-fields">
        <tr>
          <td>
            <div class="box-label">חתימה</div>
            ${signatureDataUrl ? `<img src="${signatureDataUrl}" alt="" class="sig-img">` : ''}
            <div class="box-line"></div>
          </td>
          <td><div class="box-label">תאריך חתימה</div><div class="box-line"></div></td>
        </tr>
      </table>
    </div>
    <div class="footer">
      ${legalFooter ? `<div class="footer-legal">${legalFooter}</div>` : ''}
      מסמך זה הופק אוטומטית על ידי מערכת ועדת אתיקה &bull; ${institution} &bull; ${ltr(escapeHtml(today))} &bull; מס׳ בקשה: ${ltr(escapeHtml(submission.applicationId))}
    </div>
  </div>
</div>
</div>
</body>
</html>`
}

/**
 * Builds the English (LTR) approval letter HTML.
 * @param {object} submission
 * @param {ReturnType<typeof getDefaultApprovalTemplate>} template
 * @param {Record<string, string>} templateContext
 * @param {string} [signatureDataUrl='']
 * @param {string} [brandPrimary='#1e3a5f']
 * @returns {string}
 */
function buildEnHtml(submission, template, templateContext, signatureDataUrl = '', brandPrimary = BRAND_PRIMARY) {
  const today        = fmtDateEn(new Date())
  const approvedDate = fmtDateEn(submission.updatedAt)
  const expiryDate   = validUntil(submission.updatedAt, 'en')
  const track        = trackLabel(submission.track)
  const titleDisplay = submission.title.length > 80 ? submission.title.slice(0, 80) + '…' : submission.title
  const docTitle     = escapeHtml(applyTemplateTokens(template.docTitle, templateContext))
  const subject      = escapeHtml(applyTemplateTokens(template.subject, templateContext))
  const intro        = escapeHtml(applyTemplateTokens(template.intro, templateContext))
  const conditionsTitle = escapeHtml(applyTemplateTokens(template.conditionsTitle, templateContext))
  const signatureLabel = escapeHtml(applyTemplateTokens(template.signatureLabel, templateContext))
  const legalFooter  = escapeHtml(applyTemplateTokens(template.legalFooter, templateContext))
  const conditionLines = template.conditions
    .map((line) => escapeHtml(applyTemplateTokens(line, templateContext)))
    .filter(Boolean)
  const institution  = escapeHtml(INSTITUTION_NAME_EN)
  const ltrEn        = (safe) => `<span class="ltr-val">${safe}</span>`

  return `<!DOCTYPE html>
<html dir="ltr" lang="en">
<head>
<meta charset="utf-8">
<style>
${fontFaceCss()}
* { margin: 0; padding: 0; box-sizing: border-box; }
@page { size: A4; margin: 0; }
body {
  font-family: 'Arial', sans-serif;
  direction: ltr;
  font-size: 13pt;
  line-height: 1.8;
  color: #1e293b;
  background: white;
}
.page { width: 210mm; min-height: 297mm; }
.header {
  background: ${brandPrimary};
  color: white;
  padding: 24px 36px 18px;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.brand-row {
  display: flex;
  align-items: center;
  gap: 14px;
  direction: ltr;
}
.brand-name { font-size: 20pt; font-weight: bold; letter-spacing: 0.5px; }
.header-sub { font-size: 9.5pt; color: rgba(255,255,255,0.82); margin-top: 6px; }
.header-date { font-size: 9pt; color: #cbd5e1; margin-top: 8px; text-align: right; }
.content { padding: 30px 40px; }
.doc-title { text-align: center; margin-bottom: 4px; }
.doc-title h2 { font-size: 17pt; font-weight: bold; color: ${brandPrimary}; }
.issue-date { text-align: center; color: #64748b; font-size: 10pt; margin-bottom: 20px; }
.ltr-val { direction: ltr; display: inline-block; unicode-bidi: isolate; }
hr { border: none; border-top: 1.5px solid ${brandPrimary}; margin: 14px 0; }
hr.light { border-color: #e2e8f0; border-width: 1px; }
.addressee { margin-bottom: 14px; font-size: 11pt; }
.to-label { font-weight: bold; color: ${brandPrimary}; }
.email { color: #64748b; font-size: 9.5pt; margin-top: 2px; }
.subject { font-weight: bold; color: ${brandPrimary}; font-size: 12pt; margin-bottom: 8px; }
.body-text { font-size: 11.5pt; color: #374151; line-height: 1.85; margin-bottom: 14px; }
.details-box {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #f8fafc;
  padding: 4px 16px;
  margin: 16px 0;
}
.details-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11pt;
  direction: ltr;
}
.details-table tr + tr td { border-top: 1px solid #e2e8f0; }
.details-table td { padding: 9px 4px; vertical-align: baseline; }
.details-table .lbl { color: #475569; font-weight: bold; white-space: nowrap; width: 1%; font-size: 10pt; }
.details-table .val { color: #0f172a; font-weight: bold; padding-left: 14px; }
.conditions-title { font-weight: bold; color: ${brandPrimary}; font-size: 12pt; margin-bottom: 8px; }
.conditions-list { list-style: none; padding: 0; margin-bottom: 14px; }
.conditions-list li {
  font-size: 11pt; color: #374151; padding: 4px 0;
  display: flex; align-items: baseline; gap: 8px; direction: ltr;
}
.conditions-list li::before { content: '•'; color: ${brandPrimary}; font-weight: bold; flex-shrink: 0; }
.signature-section { text-align: center; margin-top: 32px; }
.sig-line { border-top: 1px solid #94a3b8; width: 260px; margin: 0 auto 8px; }
.sig-label { color: ${brandPrimary}; font-weight: bold; font-size: 11pt; }
.sig-fields {
  margin-top: 14px;
  width: 100%;
  border-collapse: separate;
  border-spacing: 16px 0;
  direction: ltr;
}
.sig-fields td {
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 10px 12px;
  min-height: 60px;
  vertical-align: top;
  text-align: left;
  width: 50%;
}
.sig-img { max-height: 52px; max-width: 100%; object-fit: contain; display: block; margin: 4px 0 8px; }
.box-label { color: #64748b; font-size: 9pt; margin-bottom: 12px; }
.box-line { border-top: 1px solid #94a3b8; margin-top: 8px; }
.footer { margin-top: 28px; padding-top: 10px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 8pt; color: #94a3b8; line-height: 1.6; }
.footer-legal { margin-bottom: 6px; }
h1, h2, h3, strong, .to-label { font-weight: bold; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="brand-row">
      <div>
        <div class="brand-name">EthicFlow</div>
        <div class="header-sub">Ethics Committee Management System &mdash; ${institution}</div>
      </div>
    </div>
    <div class="header-date">Generated: ${escapeHtml(today)}</div>
  </div>
  <div class="content">
    <div class="doc-title"><h2>${docTitle}</h2></div>
    <div class="issue-date">Issue date: ${escapeHtml(today)}</div>
    <hr>
    <div class="addressee">
      <div class="to-label">Dear,</div>
      <div>${escapeHtml(submission.author.fullName)}</div>
      <div class="email">${escapeHtml(submission.author.email)}</div>
    </div>
    <div class="subject">${subject}</div>
    <p class="body-text">${intro}</p>
    <div class="details-box">
      <table class="details-table">
        <tr><td class="lbl">Application No.:</td><td class="val">${escapeHtml(submission.applicationId)}</td></tr>
        <tr><td class="lbl">Research Title:</td><td class="val">${escapeHtml(titleDisplay)}</td></tr>
        <tr><td class="lbl">Review Track:</td><td class="val">${escapeHtml(track.en)}</td></tr>
        <tr><td class="lbl">Approval Date:</td><td class="val">${escapeHtml(approvedDate)}</td></tr>
        <tr><td class="lbl">Valid Until:</td><td class="val">${escapeHtml(expiryDate)}</td></tr>
      </table>
    </div>
    <hr class="light">
    <div class="conditions-title">${conditionsTitle}</div>
    <ul class="conditions-list">
      ${conditionLines.map((line) => `<li>${line}</li>`).join('')}
    </ul>
    <p style="font-size:11pt;color:#374151;margin-bottom:6px;">
      Researcher: ${escapeHtml(submission.author.fullName)}<br>
      (${ltrEn(escapeHtml(submission.author.email))})
    </p>
    <div class="signature-section">
      <div class="sig-line"></div>
      <div class="sig-label">${signatureLabel}</div>
      <table class="sig-fields">
        <tr>
          <td>
            <div class="box-label">Signature</div>
            ${signatureDataUrl ? `<img src="${signatureDataUrl}" alt="" class="sig-img">` : ''}
            <div class="box-line"></div>
          </td>
          <td><div class="box-label">Date signed</div><div class="box-line"></div></td>
        </tr>
      </table>
    </div>
    <div class="footer">
      ${legalFooter ? `<div class="footer-legal">${legalFooter}</div>` : ''}
      This document was generated automatically by EthicFlow &bull; ${institution} &bull; ${escapeHtml(today)} &bull; Ref: ${escapeHtml(submission.applicationId)}
    </div>
  </div>
</div>
</body>
</html>`
}

// ─────────────────────────────────────────────
// PUPPETEER RENDERER
// ─────────────────────────────────────────────

/**
 * Renders an HTML string to a PDF file using Puppeteer (headless Chrome).
 * Handles sandbox flags required for Docker/container environments.
 * @param {string} html       - Full HTML document string
 * @param {string} outputPath - Absolute path to write the PDF
 * @returns {Promise<void>}
 */
async function renderHtmlToPdf(html, outputPath) {
  const isLinux = process.platform === 'linux'
  const executablePath =
    process.env.PUPPETEER_EXECUTABLE_PATH?.trim() || puppeteer.executablePath()
  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      // --disable-gpu breaks Hebrew RTL glyph shaping on Windows/Mac; only needed on headless Linux
      ...(isLinux ? ['--disable-gpu'] : []),
    ],
  })
  try {
    const page = await browser.newPage()
    // A4-ish viewport stabilizes RTL/grid layout in print (Chromium quirk).
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 })
    await page.setContent(html, { waitUntil: 'load', timeout: 60000 })
    await page
      .evaluate(async () => {
        try {
          await document.fonts.ready
        } catch {
          /* ignore */
        }
      })
      .catch(() => {})
    await page.emulateMediaType('print')
    await page.pdf({
      path:               outputPath,
      format:             'A4',
      printBackground:    true,
      preferCSSPageSize:  false,
      margin:             { top: '0', right: '0', bottom: '0', left: '0' },
    })
  } finally {
    await browser.close()
  }
}

/**
 * Fallback renderer for approval letters when Puppeteer is unavailable.
 * Uses PDFKit directly. Layout and section order match design A / HTML renderer.
 * @param {object} submission
 * @param {'he'|'en'} lang
 * @param {string} outputPath
 * @param {ReturnType<typeof getDefaultApprovalTemplate>} template
 * @param {Record<string, string>} templateContext
 * @param {string} [signatureDataUrl='']
 * @param {string} [brandPrimary='#1e3a5f']
 * @returns {Promise<void>}
 */
async function renderApprovalFallbackPdf(
  submission,
  lang,
  outputPath,
  template,
  templateContext,
  signatureDataUrl = '',
  brandPrimary = BRAND_PRIMARY,
) {
  const safeLang     = lang === 'en' ? 'en' : 'he'
  const doc          = new PDFDocument({ size: 'A4', margins: { top: 56, bottom: 56, left: 56, right: 56 } })
  const track        = trackLabel(submission.track)
  const todayHe      = fmtDate(new Date())
  const todayEn      = fmtDateEn(new Date())
  const approvedHe   = fmtDate(submission.updatedAt)
  const approvedEn   = fmtDateEn(submission.updatedAt)
  const validHe      = validUntil(submission.updatedAt, 'he')
  const validEn      = validUntil(submission.updatedAt, 'en')
  const institution  = safeLang === 'he' ? INSTITUTION_NAME_HE : INSTITUTION_NAME_EN
  const docTitle     = applyTemplateTokens(template.docTitle, templateContext)
  const subject      = applyTemplateTokens(template.subject, templateContext)
  const intro        = applyTemplateTokens(template.intro, templateContext)
  const conditionsTitle = applyTemplateTokens(template.conditionsTitle, templateContext)
  const legalFooter  = applyTemplateTokens(template.legalFooter, templateContext)
  const signatureLabel = applyTemplateTokens(template.signatureLabel, templateContext)
  const conditionLines = template.conditions
    .map((line) => applyTemplateTokens(line, templateContext))
    .filter(Boolean)

  let hasArial = false
  try {
    const arialRegular = path.join(FONTS_DIR, 'Arial.ttf')
    const arialBold    = path.join(FONTS_DIR, 'Arial-Bold.ttf')
    doc.registerFont('Arial', arialRegular)
    doc.registerFont('Arial-Bold', arialBold)
    hasArial = true
  } catch {
    // Continue with built-in fonts if custom fonts are unavailable.
  }

  const baseFont   = safeLang === 'he' && hasArial ? 'Arial' : 'Helvetica'
  const boldFont   = safeLang === 'he' && hasArial ? 'Arial-Bold' : 'Helvetica-Bold'
  const textAlign  = safeLang === 'he' ? 'right' : 'left'
  const leftX      = doc.page.margins.left
  const rightX     = doc.page.width - doc.page.margins.right
  const contentW   = rightX - leftX
  const pageW      = doc.page.width

  // ── Header band (design A) ─────────────────────────────────
  doc.save()
  doc.rect(0, 0, pageW, 104).fill(brandPrimary)
  doc.restore()

  if (safeLang === 'he') {
    doc.font(boldFont).fontSize(20).fillColor('#ffffff').text('מערכת ועדת אתיקה', leftX, 26, {
      width: contentW,
      align: 'right',
    })
    doc.font(baseFont).fontSize(9.5).fillColor('#e2e8f0').text(
      `מערכת ניהול ועדת אתיקה — ${institution}`,
      leftX,
      52,
      { width: contentW, align: 'right' }
    )
    doc.font(baseFont).fontSize(9).fillColor('#cbd5e1').text(`הופק: ${todayHe}`, leftX, 78, {
      width: contentW,
      align: 'left',
    })
  } else {
    const textInset = leftX
    doc.font(boldFont).fontSize(20).fillColor('#ffffff').text('EthicFlow', textInset, 26, {
      width: contentW,
      align: 'left',
    })
    doc.font(baseFont).fontSize(9.5).fillColor('#e2e8f0').text(
      `Ethics Committee Management System — ${institution}`,
      textInset,
      52,
      { width: contentW, align: 'left' }
    )
    doc.font(baseFont).fontSize(9).fillColor('#cbd5e1').text(`Generated: ${todayEn}`, leftX, 78, {
      width: contentW,
      align: 'right',
    })
  }

  // ── Body (same order as HTML: title → issue date → addressee → subject → intro → details → conditions → researcher → signature → footer)
  doc.y = 118
  doc.font(boldFont).fontSize(17).fillColor(brandPrimary).text(docTitle, {
    width: contentW,
    align: 'center',
  })
  doc.moveDown(0.35)
  doc.font(baseFont).fontSize(10).fillColor('#64748b').text(
    safeLang === 'he' ? `תאריך הנפקה: ${todayHe}` : `Issue date: ${todayEn}`,
    { width: contentW, align: 'center' }
  )
  doc.moveDown(0.5)
  const hrY = doc.y
  doc.moveTo(leftX, hrY).lineTo(rightX, hrY).lineWidth(1.5).strokeColor(brandPrimary).stroke()
  doc.moveDown(0.65)

  doc.font(boldFont).fontSize(11).fillColor(brandPrimary).text(safeLang === 'he' ? 'לכבוד,' : 'Dear,', {
    width: contentW,
    align: textAlign,
  })
  doc.font(baseFont).fontSize(11).fillColor('#1e293b').text(submission.author.fullName ?? '', {
    width: contentW,
    align: textAlign,
  })
  doc.font(baseFont).fontSize(9.5).fillColor('#64748b').text(submission.author.email ?? '', {
    width: contentW,
    align: textAlign,
  })
  doc.moveDown(0.55)

  doc.font(boldFont).fontSize(12).fillColor(brandPrimary).text(subject, { width: contentW, align: textAlign })
  doc.moveDown(0.35)
  doc.font(baseFont).fontSize(11.5).fillColor('#374151').text(intro, {
    width: contentW,
    align: textAlign,
    lineGap: 2,
  })
  doc.moveDown(0.65)

  const rowsHe = [
    ['מספר בקשה:', `${submission.applicationId}`],
    ['כותרת המחקר:', submission.title ?? ''],
    ['סוג מסלול:', track.he],
    ['תאריך אישור:', approvedHe],
    ['תוקף האישור עד:', validHe],
  ]
  const rowsEn = [
    ['Application No.:', `${submission.applicationId}`],
    ['Research Title:', submission.title ?? ''],
    ['Review Track:', track.en],
    ['Approval Date:', approvedEn],
    ['Valid Until:', validEn],
  ]
  const rowPairs    = safeLang === 'he' ? rowsHe : rowsEn
  const detailLines = rowPairs.map(([lbl, val]) => `${lbl} ${val}`)
  const detailsTop  = doc.y
  const detailsH    = detailLines.length * 16 + 20
  doc.roundedRect(leftX, detailsTop, contentW, detailsH, 8).fillAndStroke('#f8fafc', '#cbd5e1')
  doc.font(boldFont).fontSize(10).fillColor('#0f172a')
  doc.text(detailLines.join('\n'), leftX + 10, detailsTop + 8, {
    width:   contentW - 20,
    align:   textAlign,
    lineGap: 3,
  })
  doc.y = detailsTop + detailsH + 14
  const hr2Y = doc.y
  doc.moveTo(leftX, hr2Y).lineTo(rightX, hr2Y).lineWidth(1).strokeColor('#e2e8f0').stroke()
  doc.moveDown(0.6)

  doc.font(boldFont).fontSize(12).fillColor(brandPrimary).text(conditionsTitle, {
    width: contentW,
    align: textAlign,
  })
  doc.moveDown(0.25)
  doc.font(baseFont).fontSize(11).fillColor('#374151')
  for (const line of conditionLines) {
    doc.text(safeLang === 'he' ? `• ${line}` : `• ${line}`, { width: contentW, align: textAlign })
  }
  doc.moveDown(0.5)
  doc.text(
    safeLang === 'he'
      ? `חוקר/ת: ${submission.author.fullName}\n(${submission.author.email})`
      : `Researcher: ${submission.author.fullName}\n(${submission.author.email})`,
    { width: contentW, align: textAlign }
  )
  doc.moveDown(0.9)

  const signatureBuffer = imageBufferFromDataUrl(signatureDataUrl)

  const sigLineY = doc.y + 6
  const sigHalf  = 130
  doc.moveTo(leftX + (contentW / 2 - sigHalf), sigLineY).lineTo(leftX + (contentW / 2 + sigHalf), sigLineY).lineWidth(1).strokeColor('#94a3b8').stroke()
  doc.y = sigLineY + 12
  doc.font(boldFont).fontSize(11).fillColor(brandPrimary).text(signatureLabel, {
    width: contentW,
    align: 'center',
  })
  doc.moveDown(0.55)

  const boxGap = 16
  const boxW   = (contentW - boxGap) / 2
  const boxH   = signatureBuffer ? 68 : 56
  const boxY   = doc.y
  doc.roundedRect(leftX, boxY, boxW, boxH, 6).stroke('#cbd5e1')
  doc.roundedRect(leftX + boxW + boxGap, boxY, boxW, boxH, 6).stroke('#cbd5e1')
  doc.font(baseFont).fontSize(9).fillColor('#64748b')
  if (safeLang === 'he') {
    doc.text('תאריך חתימה', leftX + 10, boxY + 8, { width: boxW - 20, align: 'right' })
    doc.text('חתימה', leftX + boxW + boxGap + 10, boxY + 8, { width: boxW - 20, align: 'right' })
  } else {
    doc.text('Signature', leftX + 10, boxY + 8)
    doc.text('Date signed', leftX + boxW + boxGap + 10, boxY + 8)
  }
  if (signatureBuffer) {
    try {
      const imgBoxX = safeLang === 'he' ? leftX + boxW + boxGap + 8 : leftX + 8
      doc.image(signatureBuffer, imgBoxX, boxY + 20, { fit: [boxW - 16, 36], align: 'center', valign: 'center' })
    } catch {
      // Resilient when signature image decode/render fails.
    }
  }
  const innerLineY = boxY + boxH - 12
  doc.moveTo(leftX + 10, innerLineY).lineTo(leftX + boxW - 10, innerLineY).strokeColor('#94a3b8').stroke()
  doc.moveTo(leftX + boxW + boxGap + 10, innerLineY).lineTo(rightX - 10, innerLineY).strokeColor('#94a3b8').stroke()

  doc.y = boxY + boxH + 22
  doc.font(baseFont).fontSize(8).fillColor('#94a3b8')
  if (legalFooter) {
    doc.text(legalFooter, { width: contentW, align: 'center', lineGap: 2 })
    doc.moveDown(0.25)
  }
  doc.text(
    safeLang === 'he'
      ? `מסמך זה הופק אוטומטית על ידי מערכת ועדת אתיקה • ${institution} • ${todayHe} • מס׳ בקשה: ${submission.applicationId}`
      : `This document was generated automatically by EthicFlow • ${institution} • ${todayEn} • Ref: ${submission.applicationId}`,
    { width: contentW, align: 'center', lineGap: 2 }
  )

  await streamToFile(doc, outputPath)
}

// ─────────────────────────────────────────────
// APPROVAL LETTER
// ─────────────────────────────────────────────

/**
 * Generates a single-language approval letter PDF for an approved submission.
 * Uses Puppeteer (HTML→PDF) for proper Hebrew RTL and English LTR rendering.
 * Creates / overwrites the file and upserts the Document DB record.
 *
 * @param {string}      submissionId - UUID of the submission (must be APPROVED)
 * @param {'he'|'en'}   lang         - Language of the letter (default: 'he')
 * @returns {Promise<{ docId: string, storagePath: string }>}
 */
export async function generateApprovalLetter(submissionId, lang = 'he') {
  const safeLang = lang === 'en' ? 'en' : 'he'
  const submission = await getApprovalSubmission(submissionId)

  const filename    = `approval-letter-${safeLang}.pdf`
  const dir         = path.join(GENERATED_DIR, submissionId)
  await fs.mkdir(dir, { recursive: true })
  const absPath     = path.join(dir, filename)
  const storagePath = path.join('generated', 'approval', submissionId, filename)

  const template = await getStoredApprovalTemplate(safeLang)
  const signatureDataUrl = await getStoredChairmanSignature()
  const brandPrimary = await getInstitutionPrimaryColorHex()
  const templateContext = buildApprovalTemplateContext(safeLang, submission)
  const html = safeLang === 'he'
    ? buildHeHtml(submission, template, templateContext, signatureDataUrl, brandPrimary)
    : buildEnHtml(submission, template, templateContext, signatureDataUrl, brandPrimary)
  try {
    await renderHtmlToPdf(html, absPath)
  } catch (err) {
    console.warn(
      `[PDF] Puppeteer render failed for approval letter (${safeLang}), using fallback renderer: ${err?.message ?? err}`
    )
    await renderApprovalFallbackPdf(submission, safeLang, absPath, template, templateContext, signatureDataUrl, brandPrimary)
  }

  const stat     = await fs.stat(absPath)
  const existing = await prisma.document.findFirst({ where: { submissionId, storagePath } })

  let dbDoc
  if (existing) {
    dbDoc = await prisma.document.update({
      where: { id: existing.id },
      data:  { sizeBytes: stat.size, isActive: true },
    })
  } else {
    dbDoc = await prisma.document.create({
      data: {
        filename,
        originalName: `approval-letter-${safeLang}-${submission.applicationId}.pdf`,
        mimeType:     'application/pdf',
        sizeBytes:    stat.size,
        storagePath,
        source:       'GENERATED',
        submissionId,
        uploadedById: null,
      },
    })
  }

  return { docId: dbDoc.id, storagePath }
}

/**
 * Generates an approval-letter preview PDF from a provided template without persisting Document records.
 * @param {string} submissionId
 * @param {'he'|'en'} lang
 * @param {unknown} templateInput
 * @returns {Promise<{ buffer: Buffer, filename: string, renderer: 'puppeteer' | 'pdfkit' }>}
 */
export async function generateApprovalLetterPreview(submissionId, lang = 'he', templateInput) {
  const safeLang = lang === 'en' ? 'en' : 'he'
  const submission = await getApprovalSubmission(submissionId)
  const template = validateApprovalTemplatePayload(templateInput, safeLang)
  const signatureDataUrl = await getStoredChairmanSignature()
  const brandPrimary = await getInstitutionPrimaryColorHex()
  const templateContext = buildApprovalTemplateContext(safeLang, submission)
  const html = safeLang === 'he'
    ? buildHeHtml(submission, template, templateContext, signatureDataUrl, brandPrimary)
    : buildEnHtml(submission, template, templateContext, signatureDataUrl, brandPrimary)

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ef-approval-preview-'))
  const filename = `approval-template-preview-${safeLang}.pdf`
  const outputPath = path.join(tmpDir, filename)
  let renderer = 'puppeteer'
  try {
    try {
      await renderHtmlToPdf(html, outputPath)
    } catch (err) {
      renderer = 'pdfkit'
      console.warn(`[PDF] Preview Puppeteer render failed (${safeLang}), using fallback: ${err?.message ?? err}`)
      await renderApprovalFallbackPdf(submission, safeLang, outputPath, template, templateContext, signatureDataUrl, brandPrimary)
    }
    const buffer = await fs.readFile(outputPath)
    return { buffer, filename, renderer }
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {})
  }
}

// ─────────────────────────────────────────────
// PDFKit HELPERS (used by protocol PDF only)
// ─────────────────────────────────────────────

/**
 * Creates a new PDFDocument with Arial (Unicode) font registered.
 * @param {object} [options] - PDFKit options
 * @returns {PDFDocument}
 */
function createDoc(options = {}) {
  const doc = new PDFDocument({
    size:    'A4',
    margins: { top: 60, bottom: 60, left: 72, right: 72 },
    ...options,
  })
  doc.registerFont('Arial',      path.join(FONTS_DIR, 'Arial.ttf'))
  doc.registerFont('Arial-Bold', path.join(FONTS_DIR, 'Arial-Bold.ttf'))
  doc.font('Arial')
  return doc
}

/**
 * Writes a PDFKit document to a file path and finalises it.
 * @param {PDFDocument} doc
 * @param {string}      filePath
 * @returns {Promise<void>}
 */
function streamToFile(doc, filePath) {
  return new Promise((resolve, reject) => {
    const stream = createWriteStream(filePath)
    doc.pipe(stream)
    stream.on('finish', resolve)
    stream.on('error', reject)
    doc.end()
  })
}

/**
 * Draws a horizontal rule at the current Y position.
 * @param {PDFDocument} doc
 * @param {string}      [color='#1e3a5f']
 * @param {number}      [width=1.5]
 */
function hRule(doc, color = '#1e3a5f', width = 1.5) {
  doc.moveTo(72, doc.y).lineTo(523, doc.y).lineWidth(width).strokeColor(color).stroke()
  doc.moveDown(0.6)
}

// ─────────────────────────────────────────────
// PROTOCOL PDF  (unchanged — uses PDFKit)
// ─────────────────────────────────────────────

/**
 * Generates a single-language protocol PDF.
 * Hebrew output is RTL/right-aligned, English output is LTR/left-aligned.
 * Writes to uploads/generated/protocols/{protocolId}/protocol-{lang}.pdf
 * and upserts the Document DB record.
 *
 * @param {object} protocol - Protocol with meeting and signatures included
 * @param {'he'|'en'} lang
 * @returns {Promise<{ docId: string, storagePath: string }>}
 */
export async function generateProtocolPdf(protocol, lang = 'he') {
  const safeLang = lang === 'en' ? 'en' : 'he'
  const dir         = path.join(PROTOCOL_GENERATED_DIR, protocol.id)
  await fs.mkdir(dir, { recursive: true })
  const filename    = `protocol-${safeLang}.pdf`
  const absPath     = path.join(dir, filename)
  const storagePath = path.join('generated', 'protocols', protocol.id, filename)
  const today       = safeLang === 'he' ? fmtDate(new Date()) : fmtDateEn(new Date())
  const textAlign   = safeLang === 'he' ? 'right' : 'left'

  const doc = createDoc()

  // ── Header band ──────────────────────────────────
  doc.rect(0, 0, 595, 100).fill('#1e3a5f')
  doc.font('Arial-Bold').fontSize(20).fillColor('#ffffff')
     .text('EthicFlow', 72, 20, { align: 'center', width: 451 })
  doc.font('Arial').fontSize(11).fillColor('#93c5fd')
     .text(
           safeLang === 'he' ? 'פרוטוקול ועדת אתיקה' : 'Ethics Committee Protocol',
           72, 50, { align: 'center', width: 451 })
  doc.font('Arial').fontSize(9).fillColor('#cbd5e1')
     .text(
           safeLang === 'he' ? `הופק: ${today}` : `Generated: ${today}`,
           72, 72, { align: 'center', width: 451 })

  // ── Protocol title ────────────────────────────────
  doc.moveDown(3)
  doc.font('Arial-Bold').fontSize(16).fillColor('#1e3a5f')
     .text(protocol.title, { align: textAlign })

  if (protocol.meeting?.scheduledAt) {
    const mtgDate = safeLang === 'he'
      ? fmtDate(protocol.meeting.scheduledAt)
      : fmtDateEn(protocol.meeting.scheduledAt)
    doc.font('Arial').fontSize(11).fillColor('#64748b')
       .text(
         safeLang === 'he' ? `תאריך ישיבה: ${mtgDate}` : `Meeting Date: ${mtgDate}`,
         { align: textAlign }
       )
  }

  doc.moveDown(0.5)
  hRule(doc)

  // ── Status row ────────────────────────────────────
  const statusMap = {
    DRAFT:              { he: 'טיוטה',           en: 'Draft' },
    PENDING_SIGNATURES: { he: 'ממתין לחתימות',  en: 'Pending Signatures' },
    SIGNED:             { he: 'חתום',            en: 'Signed' },
    ARCHIVED:           { he: 'בארכיון',         en: 'Archived' },
  }
  const statusLabel = statusMap[protocol.status] ?? { he: protocol.status, en: protocol.status }
  doc.font('Arial').fontSize(10).fillColor('#64748b')
     .text(
       safeLang === 'he' ? `סטטוס: ${statusLabel.he}` : `Status: ${statusLabel.en}`,
       { align: textAlign }
     )
  doc.moveDown(1)

  // ── Content sections ──────────────────────────────
  const sections = Array.isArray(protocol.contentJson?.sections)
    ? protocol.contentJson.sections
    : [{ heading: safeLang === 'he' ? 'תוכן' : 'Content', content: JSON.stringify(protocol.contentJson ?? '') }]

  for (const section of sections) {
    doc.font('Arial-Bold').fontSize(13).fillColor('#1e3a5f')
       .text(section.heading ?? '', { align: textAlign })
    doc.moveDown(0.2)
    doc.font('Arial').fontSize(11).fillColor('#1e293b')
       .text(section.content ?? '', { align: textAlign, lineGap: 4 })
    doc.moveDown(1)
  }

  // ── Signatures ────────────────────────────────────
  if (protocol.signatures?.length > 0) {
    doc.addPage()
    doc.font('Arial-Bold').fontSize(14).fillColor('#1e3a5f')
       .text(safeLang === 'he' ? 'חתימות' : 'Signatures', { align: textAlign })
    doc.moveDown(0.5)
    hRule(doc)

    for (const sig of protocol.signatures) {
      const name     = sig.user?.fullName ?? sig.userId
      const sigDate  = sig.signedAt
        ? (safeLang === 'he' ? fmtDate(sig.signedAt) : fmtDateEn(sig.signedAt))
        : null
      const statusLine = safeLang === 'he'
        ? (sig.status === 'SIGNED'
            ? `חתם ב-${sigDate}`
            : sig.status === 'DECLINED'
              ? 'סירב לחתום'
              : 'ממתין לחתימה')
        : (sig.status === 'SIGNED'
            ? `Signed on ${sigDate}`
            : sig.status === 'DECLINED'
              ? 'Declined'
              : 'Pending signature')
      doc.font('Arial-Bold').fontSize(11).fillColor('#1e293b')
         .text(name, { align: textAlign })
      doc.font('Arial').fontSize(10).fillColor('#64748b')
         .text(statusLine, { align: textAlign, lineGap: 6 })
    }
  }

  // ── Footer ────────────────────────────────────────
  const pageH = doc.page.height
  doc.font('Arial').fontSize(8).fillColor('#94a3b8')
     .text(
      safeLang === 'he'
        ? `מסמך זה הופק על ידי מערכת EthicFlow • ${today}`
        : `Generated by EthicFlow • ${today}`,
       72, pageH - 48, { align: 'center', width: 451 }
     )

  await streamToFile(doc, absPath)

  // ── Upsert Document record ────────────────────────
  const stat     = await fs.stat(absPath)
  const existing = await prisma.document.findFirst({ where: { storagePath } })

  let dbDoc
  if (existing) {
    dbDoc = await prisma.document.update({
      where: { id: existing.id },
      data:  { sizeBytes: stat.size, isActive: true },
    })
  } else {
    dbDoc = await prisma.document.create({
      data: {
        filename,
        originalName: `protocol-${safeLang}-${protocol.id}.pdf`,
        mimeType:     'application/pdf',
        sizeBytes:    stat.size,
        storagePath,
        source:       'GENERATED',
        uploadedById: null,
      },
    })
  }

  return { docId: dbDoc.id, storagePath }
}

/** Exported for tests and optional HTML previews. */
export { buildHeHtml, buildEnHtml }
