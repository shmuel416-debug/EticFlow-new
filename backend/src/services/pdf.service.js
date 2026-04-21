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
import fs           from 'fs/promises'
import { createWriteStream } from 'fs'
import { fileURLToPath }     from 'url'
import prisma                from '../config/database.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** Path to Unicode fonts bundled with this service (used by PDFKit for protocols). */
const FONTS_DIR = path.join(__dirname, 'fonts')

/** Output directories for generated PDFs. */
const GENERATED_DIR          = path.resolve('uploads', 'generated', 'approval')
const PROTOCOL_GENERATED_DIR = path.resolve('uploads', 'generated', 'protocols')

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

// ─────────────────────────────────────────────
// HTML TEMPLATES
// ─────────────────────────────────────────────

/** Shared CSS for both letter variants. */
const BASE_CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }
@page { size: A4; margin: 0; }
body {
  font-size: 11pt;
  line-height: 1.65;
  color: #1e293b;
  background: white;
}
.page { width: 210mm; min-height: 297mm; }
.header {
  background: #1e3a5f;
  color: white;
  padding: 20px 40px;
  text-align: center;
}
.header h1 { font-size: 20pt; font-weight: bold; letter-spacing: 1px; }
.header .subtitle { font-size: 10pt; color: #93c5fd; margin-top: 4px; }
.header .doc-type { font-size: 8pt; color: #cbd5e1; margin-top: 2px; }
.content { padding: 28px 40px; }
.doc-title { text-align: center; margin-bottom: 14px; }
.doc-title h2 { font-size: 16pt; font-weight: bold; color: #1e3a5f; }
.date-row { text-align: center; color: #64748b; font-size: 9.5pt; margin-bottom: 12px; }
hr.strong { border: none; border-top: 1.5px solid #1e3a5f; margin: 12px 0; }
hr.light  { border: none; border-top: 1px solid #e2e8f0; margin: 12px 0; }
.addressee { margin-bottom: 12px; font-size: 11pt; }
.addressee .to-label { font-weight: bold; color: #1e3a5f; }
.addressee .email { color: #64748b; font-size: 9.5pt; margin-top: 2px; }
.subject { font-weight: bold; color: #1e3a5f; font-size: 11pt; margin-bottom: 8px; }
.body-text { font-size: 10.5pt; margin-bottom: 14px; line-height: 1.7; color: #374151; }
.details-box {
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  border-radius: 6px;
  padding: 0 16px;
  margin: 14px 0;
}
.details-row {
  display: flex;
  align-items: baseline;
  padding: 9px 0;
  border-bottom: 1px solid #e2e8f0;
  font-size: 10pt;
  gap: 12px;
}
.details-row:last-child { border-bottom: none; }
.details-row .label { color: #64748b; font-weight: bold; font-size: 8.5pt; white-space: nowrap; }
.details-row .value { color: #1e293b; font-weight: bold; flex: 1; }
.conditions-title { font-weight: bold; color: #1e3a5f; font-size: 11pt; margin-bottom: 8px; }
.conditions-list { list-style: none; padding: 0; }
.conditions-list li {
  padding: 5px 0;
  font-size: 10.5pt;
  color: #374151;
  line-height: 1.5;
  position: relative;
}
.signature-section { text-align: center; margin-top: 36px; }
.sig-line { border-top: 1px solid #94a3b8; width: 280px; margin: 0 auto 8px; }
.sig-label { color: #1e293b; font-weight: bold; font-size: 10pt; }
.footer {
  margin-top: 30px;
  padding-top: 10px;
  border-top: 1px solid #e2e8f0;
  text-align: center;
  font-size: 7.5pt;
  color: #94a3b8;
}
`

/**
 * Builds the Hebrew (RTL) approval letter HTML.
 * Key RTL rules applied:
 *  - `dir="rtl"` on <html> — browser BiDi algorithm handles all text direction
 *  - Heebo font loaded via <link> (Google Fonts); Noto Sans Hebrew as fallback
 *  - Labels written as "מספר בקשה:" (colon at end = LEFT side in RTL display)
 *  - LTR values (IDs, dates) wrapped in <bdi> to isolate from RTL context
 *  - No `flex-direction: row-reverse` — RTL flex already arranges right-to-left
 * @param {object} submission
 * @returns {string}
 */
function buildHeHtml(submission) {
  const today        = fmtDate(new Date())
  const approvedDate = fmtDate(submission.updatedAt)
  const expiryDate   = validUntil(submission.updatedAt, 'he')
  const track        = trackLabel(submission.track)
  const titleDisplay = submission.title.length > 80 ? submission.title.slice(0, 80) + '…' : submission.title

  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="utf-8">
<style>
${BASE_CSS}
body {
  font-family: 'Arial', 'Noto Sans Hebrew', sans-serif;
  direction: rtl;
}
/* Details rows: in RTL flex, first child is on the RIGHT (label), second on LEFT (value) */
.details-row .label { white-space: nowrap; }
.details-row .value { flex: 1; text-align: start; }
/* Bullet is on the right in RTL */
.conditions-list li { padding-right: 20px; }
.conditions-list li::before { content: '•'; position: absolute; right: 0; color: #1e3a5f; font-weight: bold; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <h1>EthicFlow</h1>
    <div class="subtitle">מערכת ניהול ועדת אתיקה</div>
    <div class="doc-type">מכתב אישור ועדת אתיקה</div>
  </div>
  <div class="content">
    <div class="doc-title"><h2>אישור ועדת אתיקה</h2></div>
    <div class="date-row">תאריך הנפקה: <bdi>${today}</bdi></div>
    <hr class="strong">
    <div class="addressee">
      <div class="to-label">לכבוד,</div>
      <div>${escapeHtml(submission.author.fullName)}</div>
      <div class="email"><bdi>${escapeHtml(submission.author.email)}</bdi></div>
    </div>
    <div class="subject">הנדון: אישור ועדת אתיקה למחקר</div>
    <div class="body-text">
      ועדת האתיקה בדקה את בקשתך ושמחה לאשר את ביצוע המחקר המפורט להלן,
      בכפוף לתנאים הנקובים בהחלטה.
    </div>
    <div class="details-box">
      <div class="details-row">
        <span class="label">מספר בקשה:</span>
        <span class="value"><bdi>${escapeHtml(submission.applicationId)}</bdi></span>
      </div>
      <div class="details-row">
        <span class="label">כותרת המחקר:</span>
        <span class="value">${escapeHtml(titleDisplay)}</span>
      </div>
      <div class="details-row">
        <span class="label">סוג מסלול:</span>
        <span class="value">${escapeHtml(track.he)}</span>
      </div>
      <div class="details-row">
        <span class="label">תאריך אישור:</span>
        <span class="value"><bdi>${approvedDate}</bdi></span>
      </div>
      <div class="details-row">
        <span class="label">תוקף האישור עד:</span>
        <span class="value"><bdi>${expiryDate}</bdi></span>
      </div>
    </div>
    <hr class="light">
    <div class="conditions-title">תנאי האישור:</div>
    <ul class="conditions-list">
      <li>המחקר יתנהל בהתאם לפרוטוקול שהוגש ואושר.</li>
      <li>כל שינוי מהותי בפרוטוקול יוגש לאישור ועדה מחדש.</li>
      <li>יש לקבל הסכמה מדעת של כל משתתף לפני תחילת המחקר.</li>
      <li>הממצאים יועברו לוועדה בתום המחקר.</li>
    </ul>
    <div class="signature-section">
      <div class="sig-line"></div>
      <div class="sig-label">יו"ר ועדת האתיקה</div>
    </div>
    <div class="footer">
      מסמך זה הופק אוטומטית על ידי מערכת EthicFlow &bull; <bdi>${today}</bdi> &bull; מס׳ בקשה: <bdi>${escapeHtml(submission.applicationId)}</bdi>
    </div>
  </div>
</div>
</body>
</html>`
}

/**
 * Builds the English (LTR) approval letter HTML.
 * @param {object} submission
 * @returns {string}
 */
function buildEnHtml(submission) {
  const today        = fmtDateEn(new Date())
  const approvedDate = fmtDateEn(submission.updatedAt)
  const expiryDate   = validUntil(submission.updatedAt, 'en')
  const track        = trackLabel(submission.track)
  const titleDisplay = submission.title.length > 80 ? submission.title.slice(0, 80) + '…' : submission.title

  return `<!DOCTYPE html>
<html dir="ltr" lang="en">
<head>
<meta charset="utf-8">
<style>
${BASE_CSS}
body { font-family: Arial, Helvetica, sans-serif; direction: ltr; }
.conditions-list li { padding-left: 18px; }
.conditions-list li::before { content: '•'; position: absolute; left: 0; color: #1e3a5f; font-weight: bold; }
.details-row .label { min-width: 130px; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <h1>EthicFlow</h1>
    <div class="subtitle">Ethics Committee Management System</div>
    <div class="doc-type">Ethics Committee Approval Letter</div>
  </div>
  <div class="content">
    <div class="doc-title"><h2>Ethics Committee Approval</h2></div>
    <div class="date-row">Issue Date: ${today}</div>
    <hr class="strong">
    <div class="addressee">
      <div class="to-label">Dear,</div>
      <div>${escapeHtml(submission.author.fullName)}</div>
      <div class="email">${escapeHtml(submission.author.email)}</div>
    </div>
    <div class="subject">Re: Ethics Committee Research Approval</div>
    <div class="body-text">
      The Ethics Committee has reviewed your application and is pleased to approve
      the conduct of the research described below, subject to the conditions stated in this decision.
    </div>
    <div class="details-box">
      <div class="details-row">
        <span class="label">Application No.:</span>
        <span class="value">${escapeHtml(submission.applicationId)}</span>
      </div>
      <div class="details-row">
        <span class="label">Research Title:</span>
        <span class="value">${escapeHtml(titleDisplay)}</span>
      </div>
      <div class="details-row">
        <span class="label">Review Track:</span>
        <span class="value">${escapeHtml(track.en)}</span>
      </div>
      <div class="details-row">
        <span class="label">Approval Date:</span>
        <span class="value">${approvedDate}</span>
      </div>
      <div class="details-row">
        <span class="label">Valid Until:</span>
        <span class="value">${expiryDate}</span>
      </div>
    </div>
    <hr class="light">
    <div class="conditions-title">Approval Conditions:</div>
    <ul class="conditions-list">
      <li>The research shall be conducted in accordance with the approved protocol.</li>
      <li>Any substantive protocol amendments require re-submission for committee approval.</li>
      <li>Informed consent must be obtained from each participant prior to commencement.</li>
      <li>Research findings shall be submitted to the committee upon completion.</li>
    </ul>
    <div class="signature-section">
      <div class="sig-line"></div>
      <div class="sig-label">Chairperson, Ethics Committee</div>
    </div>
    <div class="footer">
      Auto-generated by EthicFlow &bull; ${today} &bull; Ref: ${escapeHtml(submission.applicationId)}
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
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  })
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle2', timeout: 30000 })
    await page.pdf({
      path:            outputPath,
      format:          'A4',
      printBackground: true,
      margin:          { top: '0', right: '0', bottom: '0', left: '0' },
    })
  } finally {
    await browser.close()
  }
}

/**
 * Fallback renderer for approval letters when Puppeteer is unavailable.
 * Uses PDFKit directly to avoid runtime Chromium dependencies.
 * @param {object} submission
 * @param {'he'|'en'} lang
 * @param {string} outputPath
 * @returns {Promise<void>}
 */
async function renderApprovalFallbackPdf(submission, lang, outputPath) {
  const safeLang  = lang === 'en' ? 'en' : 'he'
  const doc       = new PDFDocument({ size: 'A4', margins: { top: 56, bottom: 56, left: 56, right: 56 } })
  const track     = trackLabel(submission.track)
  const todayHe   = fmtDate(new Date())
  const todayEn   = fmtDateEn(new Date())
  const approvedHe = fmtDate(submission.updatedAt)
  const approvedEn = fmtDateEn(submission.updatedAt)
  const validHe    = validUntil(submission.updatedAt, 'he')
  const validEn    = validUntil(submission.updatedAt, 'en')

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

  const baseFont = safeLang === 'he' && hasArial ? 'Arial' : 'Helvetica'
  const boldFont = safeLang === 'he' && hasArial ? 'Arial-Bold' : 'Helvetica-Bold'

  doc.font(boldFont).fontSize(18).fillColor('#1e3a5f')
  if (safeLang === 'he') {
    doc.text('אישור ועדת אתיקה', { align: 'right' })
    doc.moveDown(0.5)
    doc.font(baseFont).fontSize(10).fillColor('#475569')
    doc.text(`תאריך הנפקה: ${todayHe}`, { align: 'right' })
    doc.moveDown(1)
    doc.font(boldFont).fontSize(12).fillColor('#0f172a')
    doc.text(`מספר בקשה: ${submission.applicationId}`, { align: 'right' })
    doc.text(`כותרת מחקר: ${submission.title}`, { align: 'right' })
    doc.text(`סוג מסלול: ${track.he}`, { align: 'right' })
    doc.text(`תאריך אישור: ${approvedHe}`, { align: 'right' })
    doc.text(`תוקף עד: ${validHe}`, { align: 'right' })
    doc.moveDown(1)
    doc.font(baseFont).fontSize(10).fillColor('#334155')
    doc.text(`חוקר/ת: ${submission.author.fullName} (${submission.author.email})`, { align: 'right' })
    doc.moveDown(1)
    doc.text('מסמך זה הופק אוטומטית על ידי EthicFlow (Fallback PDF Renderer).', { align: 'right' })
  } else {
    doc.text('Ethics Committee Approval Letter', { align: 'left' })
    doc.moveDown(0.5)
    doc.font(baseFont).fontSize(10).fillColor('#475569')
    doc.text(`Issue Date: ${todayEn}`, { align: 'left' })
    doc.moveDown(1)
    doc.font(boldFont).fontSize(12).fillColor('#0f172a')
    doc.text(`Application ID: ${submission.applicationId}`, { align: 'left' })
    doc.text(`Research Title: ${submission.title}`, { align: 'left' })
    doc.text(`Track: ${track.en}`, { align: 'left' })
    doc.text(`Approved At: ${approvedEn}`, { align: 'left' })
    doc.text(`Valid Until: ${validEn}`, { align: 'left' })
    doc.moveDown(1)
    doc.font(baseFont).fontSize(10).fillColor('#334155')
    doc.text(`Researcher: ${submission.author.fullName} (${submission.author.email})`, { align: 'left' })
    doc.moveDown(1)
    doc.text('This document was generated automatically by EthicFlow (Fallback PDF Renderer).', { align: 'left' })
  }

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

  const filename    = `approval-letter-${safeLang}.pdf`
  const dir         = path.join(GENERATED_DIR, submissionId)
  await fs.mkdir(dir, { recursive: true })
  const absPath     = path.join(dir, filename)
  const storagePath = path.join('generated', 'approval', submissionId, filename)

  const html = safeLang === 'he' ? buildHeHtml(submission) : buildEnHtml(submission)
  try {
    await renderHtmlToPdf(html, absPath)
  } catch (err) {
    console.warn(
      `[PDF] Puppeteer render failed for approval letter (${safeLang}), using fallback renderer: ${err?.message ?? err}`
    )
    await renderApprovalFallbackPdf(submission, safeLang, absPath)
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
