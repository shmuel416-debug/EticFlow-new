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
 * @param {object} submission
 * @returns {string}
 */
function buildHeHtml(submission) {
  const today       = fmtDate(new Date())
  const approvedDate = fmtDate(submission.updatedAt)
  const expiryDate  = validUntil(submission.updatedAt, 'he')
  const track       = trackLabel(submission.track)
  const titleDisplay = submission.title.length > 80 ? submission.title.slice(0, 80) + '…' : submission.title

  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="utf-8">
<style>
${BASE_CSS}
body { font-family: Arial, 'Noto Sans Hebrew', sans-serif; direction: rtl; }
.conditions-list li { padding-right: 18px; }
.conditions-list li::before { content: '•'; position: absolute; right: 0; color: #1e3a5f; font-weight: bold; }
.details-row { flex-direction: row-reverse; }
.details-row .label { text-align: left; }
.details-row .value { text-align: right; }
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
    <div class="date-row">תאריך הנפקה: ${today}</div>
    <hr class="strong">
    <div class="addressee">
      <div class="to-label">לכבוד,</div>
      <div>${escapeHtml(submission.author.fullName)}</div>
      <div class="email">${escapeHtml(submission.author.email)}</div>
    </div>
    <div class="subject">הנדון: אישור ועדת אתיקה למחקר</div>
    <div class="body-text">
      ועדת האתיקה בדקה את בקשתך ושמחה לאשר את ביצוע המחקר המפורט להלן,
      בכפוף לתנאים הנקובים בהחלטה.
    </div>
    <div class="details-box">
      <div class="details-row">
        <span class="value">${escapeHtml(submission.applicationId)}</span>
        <span class="label">:מספר בקשה</span>
      </div>
      <div class="details-row">
        <span class="value">${escapeHtml(titleDisplay)}</span>
        <span class="label">:כותרת המחקר</span>
      </div>
      <div class="details-row">
        <span class="value">${escapeHtml(track.he)}</span>
        <span class="label">:סוג מסלול</span>
      </div>
      <div class="details-row">
        <span class="value">${approvedDate}</span>
        <span class="label">:תאריך אישור</span>
      </div>
      <div class="details-row">
        <span class="value">${expiryDate}</span>
        <span class="label">:תוקף האישור עד</span>
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
      מסמך זה הופק אוטומטית על ידי מערכת EthicFlow &bull; ${today} &bull; מס' בקשה: ${escapeHtml(submission.applicationId)}
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
    headless: true,
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
  await renderHtmlToPdf(html, absPath)

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
 * Generates a bilingual (Hebrew + English) protocol PDF.
 * Writes to uploads/generated/protocols/{protocolId}/protocol.pdf
 * and upserts the Document DB record.
 *
 * @param {object} protocol - Protocol with meeting and signatures included
 * @returns {Promise<{ docId: string, storagePath: string }>}
 */
export async function generateProtocolPdf(protocol) {
  const dir         = path.join(PROTOCOL_GENERATED_DIR, protocol.id)
  await fs.mkdir(dir, { recursive: true })
  const filename    = 'protocol.pdf'
  const absPath     = path.join(dir, filename)
  const storagePath = path.join('generated', 'protocols', protocol.id, filename)
  const today       = fmtDate(new Date())

  const doc = createDoc()

  // ── Header band ──────────────────────────────────
  doc.rect(0, 0, 595, 100).fill('#1e3a5f')
  doc.font('Arial-Bold').fontSize(20).fillColor('#ffffff')
     .text('EthicFlow', 72, 20, { align: 'center', width: 451 })
  doc.font('Arial').fontSize(11).fillColor('#93c5fd')
     .text('פרוטוקול ועדת אתיקה  |  Ethics Committee Protocol',
           72, 50, { align: 'center', width: 451 })
  doc.font('Arial').fontSize(9).fillColor('#cbd5e1')
     .text(`הופק: ${today}  •  Generated: ${today}`,
           72, 72, { align: 'center', width: 451 })

  // ── Protocol title ────────────────────────────────
  doc.moveDown(3)
  doc.font('Arial-Bold').fontSize(16).fillColor('#1e3a5f')
     .text(protocol.title, { align: 'center' })

  if (protocol.meeting?.scheduledAt) {
    const mtgDate = fmtDate(protocol.meeting.scheduledAt)
    doc.font('Arial').fontSize(11).fillColor('#64748b')
       .text(`תאריך ישיבה: ${mtgDate}  |  Meeting Date: ${mtgDate}`, { align: 'center' })
  }

  doc.moveDown(0.5)
  hRule(doc)

  // ── Status row ────────────────────────────────────
  const statusMap = {
    DRAFT:              { he: 'טיוטה',          en: 'Draft' },
    PENDING_SIGNATURES: { he: 'ממתין לחתימות', en: 'Pending Signatures' },
    SIGNED:             { he: 'חתום',            en: 'Signed' },
    ARCHIVED:           { he: 'בארכיון',         en: 'Archived' },
  }
  const statusLabel = statusMap[protocol.status] ?? { he: protocol.status, en: protocol.status }
  doc.font('Arial').fontSize(10).fillColor('#64748b')
     .text(`סטטוס: ${statusLabel.he}  |  Status: ${statusLabel.en}`, { align: 'center' })
  doc.moveDown(1)

  // ── Content sections ──────────────────────────────
  const sections = Array.isArray(protocol.contentJson?.sections)
    ? protocol.contentJson.sections
    : [{ heading: 'תוכן / Content', content: JSON.stringify(protocol.contentJson ?? '') }]

  for (const section of sections) {
    doc.font('Arial-Bold').fontSize(13).fillColor('#1e3a5f')
       .text(section.heading ?? '', { align: 'right' })
    doc.moveDown(0.2)
    doc.font('Arial').fontSize(11).fillColor('#1e293b')
       .text(section.content ?? '', { align: 'right', lineGap: 4 })
    doc.moveDown(1)
  }

  // ── Signatures ────────────────────────────────────
  if (protocol.signatures?.length > 0) {
    doc.addPage()
    doc.font('Arial-Bold').fontSize(14).fillColor('#1e3a5f')
       .text('חתימות  /  Signatures', { align: 'center' })
    doc.moveDown(0.5)
    hRule(doc)

    for (const sig of protocol.signatures) {
      const name     = sig.user?.fullName ?? sig.userId
      const heStatus = sig.status === 'SIGNED'   ? `חתם ב-${fmtDate(sig.signedAt)}`
                     : sig.status === 'DECLINED' ? 'סירב לחתום'
                     : 'ממתין לחתימה'
      const enStatus = sig.status === 'SIGNED'   ? `Signed on ${fmtDate(sig.signedAt)}`
                     : sig.status === 'DECLINED' ? 'Declined'
                     : 'Pending signature'
      doc.font('Arial-Bold').fontSize(11).fillColor('#1e293b')
         .text(name, { align: 'right' })
      doc.font('Arial').fontSize(10).fillColor('#64748b')
         .text(`${heStatus}  |  ${enStatus}`, { align: 'right', lineGap: 6 })
    }
  }

  // ── Footer ────────────────────────────────────────
  const pageH = doc.page.height
  doc.font('Arial').fontSize(8).fillColor('#94a3b8')
     .text(
       `מסמך זה הופק על ידי מערכת EthicFlow  •  Generated by EthicFlow  •  ${today}`,
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
        originalName: `protocol-${protocol.id}.pdf`,
        mimeType:     'application/pdf',
        sizeBytes:    stat.size,
        storagePath,
        source:       'GENERATED',
        uploadedById: null,
      },
    })
  }

  return { docId: dbDoc.id, storagePath: absPath }
}
