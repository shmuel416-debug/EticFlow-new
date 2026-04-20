/**
 * EthicFlow — PDF Service
 * Generates bilingual (Hebrew + English) approval letter and protocol PDFs.
 * Uses pdfkit with Arial font (Unicode — supports Hebrew + Latin characters).
 *
 * Generated files are saved under:
 *   Approval letters : uploads/generated/approval/{submissionId}/approval-letter.pdf
 *   Protocols        : uploads/generated/protocols/{protocolId}/protocol.pdf
 */

import PDFDocument from 'pdfkit'
import path        from 'path'
import fs          from 'fs/promises'
import { createWriteStream } from 'fs'
import { fileURLToPath }     from 'url'
import prisma                from '../config/database.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** Path to Unicode fonts bundled with this service. */
const FONTS_DIR = path.join(__dirname, 'fonts')

/** Output directories for generated PDFs. */
const GENERATED_DIR          = path.resolve('uploads', 'generated', 'approval')
const PROTOCOL_GENERATED_DIR = path.resolve('uploads', 'generated', 'protocols')

// ─────────────────────────────────────────────
// FONT + DOCUMENT HELPERS
// ─────────────────────────────────────────────

/**
 * Creates a new PDFDocument with Arial (Unicode) font registered.
 * Arial supports both Hebrew and Latin characters.
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

// ─────────────────────────────────────────────
// FORMATTING HELPERS
// ─────────────────────────────────────────────

/**
 * Formats a Date as dd/MM/yyyy (Israeli locale) / MM/dd/yyyy for English side.
 * We use one format for the bilingual doc: dd/MM/yyyy.
 * @param {Date|string} date
 * @returns {string}
 */
function fmtDate(date) {
  const d = new Date(date)
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/**
 * Returns a human-readable track label in both languages.
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
 * Returns the approval expiry date (1 year from approval).
 * @param {Date|string} approvedAt
 * @returns {string}
 */
function validUntil(approvedAt) {
  const d = new Date(approvedAt)
  d.setFullYear(d.getFullYear() + 1)
  return fmtDate(d)
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

/**
 * Renders a bilingual label+value row inside the details box.
 * Hebrew label (right) + English label (left) on one line, value below.
 * @param {PDFDocument} doc
 * @param {string}      labelHe
 * @param {string}      labelEn
 * @param {string}      value
 * @param {number}      y
 */
function biRow(doc, labelHe, labelEn, value, y) {
  doc.font('Arial-Bold').fontSize(9).fillColor('#64748b')
     .text(labelHe, 72 + 16, y, { width: 200, align: 'right' })
  doc.font('Arial').fontSize(9).fillColor('#64748b')
     .text(labelEn, 72 + 230, y, { width: 200, align: 'left' })
  doc.font('Arial').fontSize(10).fillColor('#1e293b')
     .text(value, 72 + 16, y + 13, { width: 414, align: 'center' })
}

// ─────────────────────────────────────────────
// APPROVAL LETTER
// ─────────────────────────────────────────────

/**
 * Generates a bilingual (Hebrew + English) approval letter PDF for an approved submission.
 * Creates / overwrites the file and upserts the Document DB record.
 *
 * @param {string} submissionId - UUID of the submission (must be APPROVED)
 * @returns {Promise<{ docId: string, storagePath: string }>}
 */
export async function generateApprovalLetter(submissionId) {
  // ── Fetch submission ──────────────────────────────
  const submission = await prisma.submission.findUnique({
    where:   { id: submissionId },
    include: {
      author:     { select: { fullName: true, email: true } },
      formConfig: { select: { name: true } },
      slaTracking: true,
    },
  })

  if (!submission) throw new Error('Submission not found')
  if (submission.status !== 'APPROVED') throw new Error('Submission is not approved')

  // ── Prepare output path ──────────────────────────
  const dir         = path.join(GENERATED_DIR, submissionId)
  await fs.mkdir(dir, { recursive: true })
  const filename    = 'approval-letter.pdf'
  const absPath     = path.join(dir, filename)
  const storagePath = path.join('generated', 'approval', submissionId, filename)

  const doc          = createDoc()
  const approvedDate = fmtDate(submission.updatedAt)
  const today        = fmtDate(new Date())
  const track        = trackLabel(submission.track)
  const titleShort   = submission.title.length > 60
    ? submission.title.slice(0, 60) + '…'
    : submission.title

  // ── Header band ──────────────────────────────────
  doc.rect(0, 0, 595, 110).fill('#1e3a5f')

  doc.font('Arial-Bold').fontSize(22).fillColor('#ffffff')
     .text('EthicFlow', 72, 22, { align: 'center', width: 451 })

  doc.font('Arial').fontSize(11).fillColor('#93c5fd')
     .text('מערכת ניהול ועדת אתיקה  |  Ethics Committee Management System',
           72, 52, { align: 'center', width: 451 })

  doc.font('Arial').fontSize(9).fillColor('#cbd5e1')
     .text('אישור ועדת אתיקה  •  Ethics Committee Approval Letter',
           72, 74, { align: 'center', width: 451 })

  // ── Bilingual title ───────────────────────────────
  doc.moveDown(4)
  doc.font('Arial-Bold').fontSize(18).fillColor('#1e3a5f')
     .text('אישור ועדת אתיקה', { align: 'center' })
  doc.font('Arial').fontSize(13).fillColor('#64748b')
     .text('Ethics Committee Approval', { align: 'center' })

  doc.moveDown(0.8)
  hRule(doc)

  // ── Issue date (bilingual) ────────────────────────
  doc.font('Arial').fontSize(10).fillColor('#374151')
     .text(`תאריך הנפקה: ${today}  |  Issue Date: ${today}`,
           { align: 'center' })
  doc.moveDown(1)

  // ── Addressee ─────────────────────────────────────
  doc.font('Arial-Bold').fontSize(11).fillColor('#1e3a5f')
     .text('לכבוד,', { align: 'right' })
  doc.font('Arial').fontSize(11).fillColor('#1e293b')
     .text(submission.author.fullName, { align: 'right' })
     .text(submission.author.email,    { align: 'right' })
  doc.moveDown(0.4)
  doc.font('Arial').fontSize(10).fillColor('#64748b')
     .text(`Dear ${submission.author.fullName},`, { align: 'left' })
  doc.moveDown(1)

  // ── Hebrew body paragraph ─────────────────────────
  doc.font('Arial-Bold').fontSize(11).fillColor('#1e3a5f')
     .text('הנדון: אישור ועדת אתיקה למחקר', { align: 'right' })
  doc.font('Arial').fontSize(10.5).fillColor('#374151')
     .text(
       'ועדת האתיקה בדקה את בקשתך ושמחה לאשר את ביצוע המחקר המפורט להלן, ' +
       'בכפוף לתנאים הנקובים בהחלטה.',
       { align: 'right', lineGap: 3 }
     )
  doc.moveDown(0.6)

  // ── English body paragraph ────────────────────────
  doc.font('Arial-Bold').fontSize(11).fillColor('#1e3a5f')
     .text('Re: Ethics Committee Research Approval', { align: 'left' })
  doc.font('Arial').fontSize(10.5).fillColor('#374151')
     .text(
       'The Ethics Committee has reviewed your application and is pleased to approve ' +
       'the conduct of the research described below, subject to the conditions stated.',
       { align: 'left', lineGap: 3 }
     )
  doc.moveDown(1)

  // ── Details box ───────────────────────────────────
  const boxY = doc.y
  const ROW  = 30
  doc.rect(72, boxY, 451, ROW * 5 + 20)
     .lineWidth(1).strokeColor('#e2e8f0').fillAndStroke('#f8fafc', '#e2e8f0')

  biRow(doc, 'מספר בקשה:', 'Application No.:',  submission.applicationId,                           boxY + 8)
  biRow(doc, 'כותרת המחקר:', 'Research Title:',  titleShort,                                        boxY + 8 + ROW)
  biRow(doc, 'סוג מסלול:', 'Review Track:',     `${track.he} / ${track.en}`,                        boxY + 8 + ROW * 2)
  biRow(doc, 'תאריך אישור:', 'Approval Date:',   approvedDate,                                       boxY + 8 + ROW * 3)
  biRow(doc, 'תוקף האישור:', 'Valid Until:',     validUntil(submission.updatedAt),                   boxY + 8 + ROW * 4)

  doc.y = boxY + ROW * 5 + 24
  doc.moveDown(1)

  // ── Conditions — Hebrew ───────────────────────────
  hRule(doc, '#e2e8f0', 1)
  doc.font('Arial-Bold').fontSize(11).fillColor('#1e3a5f')
     .text('תנאי האישור:', { align: 'right' })
  doc.moveDown(0.3)

  const conditions = [
    {
      he: 'המחקר יתנהל בהתאם לפרוטוקול שהוגש ואושר.',
      en: 'The research shall be conducted in accordance with the approved protocol.',
    },
    {
      he: 'כל שינוי מהותי בפרוטוקול יוגש לאישור ועדה מחדש.',
      en: 'Any substantive protocol amendments require re-submission for committee approval.',
    },
    {
      he: 'יש לקבל הסכמה מדעת של כל משתתף לפני תחילת המחקר.',
      en: 'Informed consent must be obtained from each participant prior to commencement.',
    },
    {
      he: 'הממצאים יועברו לוועדה בתום המחקר.',
      en: 'Research findings shall be submitted to the committee upon completion.',
    },
  ]

  for (const c of conditions) {
    doc.font('Arial').fontSize(10).fillColor('#374151')
       .text(`• ${c.he}`, { align: 'right', lineGap: 2 })
    doc.font('Arial').fontSize(10).fillColor('#64748b')
       .text(`  ${c.en}`, { align: 'left', lineGap: 4 })
  }

  doc.moveDown(1.5)

  // ── Signature ─────────────────────────────────────
  hRule(doc, '#cbd5e1', 0.5)
  doc.font('Arial').fontSize(10).fillColor('#64748b')
     .text('____________________________________________',
           { align: 'center' })
  doc.moveDown(0.3)
  doc.font('Arial-Bold').fontSize(10).fillColor('#1e293b')
     .text('יו"ר ועדת האתיקה  /  Chairperson, Ethics Committee',
           { align: 'center' })

  // ── Footer ────────────────────────────────────────
  const pageH = doc.page.height
  doc.font('Arial').fontSize(8).fillColor('#94a3b8')
     .text(
       `מסמך זה הופק אוטומטית על ידי מערכת EthicFlow  •  Auto-generated by EthicFlow  •  ${today}  •  Ref: ${submission.applicationId}`,
       72, pageH - 48, { align: 'center', width: 451 }
     )

  // ── Persist ───────────────────────────────────────
  await streamToFile(doc, absPath)

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
        filename:     filename,
        originalName: `approval-letter-${submission.applicationId}.pdf`,
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
// PROTOCOL PDF
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
      const name   = sig.user?.fullName ?? sig.userId
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
        filename:     filename,
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
