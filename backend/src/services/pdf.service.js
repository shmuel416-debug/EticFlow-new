/**
 * EthicFlow — PDF Service
 * Generates approval letter PDFs for approved research submissions.
 * Uses pdfkit to build the document and stores it via storage.service.
 *
 * Generated files are saved under: generated/approval/{submissionId}/approval-letter.pdf
 * DB record is created in the documents table with source=GENERATED.
 */

import PDFDocument from 'pdfkit'
import path        from 'path'
import fs          from 'fs/promises'
import { createWriteStream } from 'fs'
import prisma              from '../config/database.js'

/** Relative output dir within UPLOAD_DIR. */
const GENERATED_DIR = path.resolve('uploads', 'generated', 'approval')

// ─────────────────────────────────────────────
// HELPERS
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
 * Writes a PDFKit document to a file path.
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
// MAIN FUNCTION
// ─────────────────────────────────────────────

/**
 * Generates an approval letter PDF for an approved submission.
 * Creates / overwrites the file and upserts the Document DB record.
 *
 * @param {string} submissionId - UUID of the submission (must be APPROVED)
 * @returns {Promise<{ docId: string, storagePath: string }>}
 */
export async function generateApprovalLetter(submissionId) {
  // ── Fetch submission with relations ──────────────
  const submission = await prisma.submission.findUnique({
    where:   { id: submissionId },
    include: {
      author:    { select: { name: true, email: true } },
      formConfig: { select: { name: true } },
      slaTracking: true,
    },
  })

  if (!submission) throw new Error('Submission not found')
  if (submission.status !== 'APPROVED') throw new Error('Submission is not approved')

  // ── Prepare output path ──────────────────────────
  const dir      = path.join(GENERATED_DIR, submissionId)
  await fs.mkdir(dir, { recursive: true })
  const filename    = 'approval-letter.pdf'
  const absPath     = path.join(dir, filename)
  const storagePath = path.join('generated', 'approval', submissionId, filename)

  // ── Build PDF ────────────────────────────────────
  const doc = new PDFDocument({
    size:    'A4',
    margins: { top: 60, bottom: 60, left: 72, right: 72 },
  })

  // Page: 595 × 842 pts, usable width = 595 - 144 = 451

  // ── Header band ──────────────────────────────────
  doc.rect(0, 0, 595, 120).fill('#1e3a5f')

  doc.fontSize(22).fillColor('#ffffff')
     .text('EthicFlow', 72, 30, { align: 'center' })

  doc.fontSize(12).fillColor('#93c5fd')
     .text('מערכת ניהול ועדת אתיקה', 72, 58, { align: 'center' })

  doc.fontSize(10).fillColor('#cbd5e1')
     .text('ETHICS COMMITTEE MANAGEMENT SYSTEM', 72, 78, { align: 'center' })

  // ── Title ─────────────────────────────────────────
  doc.moveDown(4)
  doc.fontSize(18).fillColor('#1e3a5f')
     .text('אישור ועדת אתיקה', { align: 'center' })

  doc.fontSize(13).fillColor('#64748b')
     .text('Ethics Committee Approval', { align: 'center' })

  // ── Decorative line ───────────────────────────────
  doc.moveDown(0.8)
  doc.moveTo(72, doc.y).lineTo(523, doc.y).lineWidth(1.5).strokeColor('#1e3a5f').stroke()
  doc.moveDown(0.8)

  // ── Salutation ────────────────────────────────────
  const approvedDate = fmtDate(submission.updatedAt)
  const today        = fmtDate(new Date())

  doc.fontSize(11).fillColor('#1e293b')
     .text(`תאריך הנפקה: ${today}`, { align: 'right' })
  doc.moveDown(0.5)

  doc.fontSize(12).fillColor('#1e293b')
     .text(`לכבוד,`, { align: 'right' })
  doc.text(submission.author.name, { align: 'right' })
  doc.text(submission.author.email, { align: 'right' })
  doc.moveDown(1)

  // ── Body ──────────────────────────────────────────
  doc.fontSize(12).fillColor('#1e293b')
     .text('הנדון: אישור ועדת אתיקה למחקר', { align: 'right' })
  doc.moveDown(0.8)

  doc.fontSize(11).fillColor('#374151')
     .text(
       'ועדת האתיקה בדקה את בקשתך ושמחה לאשר את ביצוע המחקר המפורט להלן, ' +
       'בכפוף לתנאים הנקובים בהחלטה.',
       { align: 'right', lineGap: 4 }
     )
  doc.moveDown(1)

  // ── Details box ───────────────────────────────────
  const boxY = doc.y
  doc.rect(72, boxY, 451, 130).lineWidth(1).strokeColor('#e2e8f0').fillAndStroke('#f8fafc', '#e2e8f0')

  doc.fontSize(11).fillColor('#1e3a5f')
  const rowH = 22
  const labelX = 72 + 16
  const valueX = 72 + 160
  const rows = [
    ['מספר בקשה:',     submission.applicationId],
    ['כותרת המחקר:',   submission.title.length > 50 ? submission.title.slice(0, 50) + '…' : submission.title],
    ['סוג מסלול:',     trackLabel(submission.track)],
    ['תאריך אישור:',   approvedDate],
    ['תוקף האישור:',   validUntil(submission.updatedAt)],
  ]

  rows.forEach(([label, value], i) => {
    const y = boxY + 12 + i * rowH
    doc.fillColor('#64748b').text(label, labelX, y, { width: 120, align: 'right' })
    doc.fillColor('#1e293b').text(value, valueX, y, { width: 250, align: 'right' })
  })

  doc.y = boxY + 130 + 16

  // ── Conditions ────────────────────────────────────
  doc.moveDown(0.5)
  doc.fontSize(12).fillColor('#1e3a5f').text('תנאי האישור:', { align: 'right' })
  doc.moveDown(0.3)
  const conditions = [
    'המחקר יתנהל בהתאם לפרוטוקול שהוגש ואושר.',
    'כל שינוי מהותי בפרוטוקול יוגש לאישור ועדה מחדש.',
    'יש לקבל הסכמה מדעת של כל משתתף לפני תחילת המחקר.',
    'הממצאים יועברו לוועדה בתום המחקר.',
  ]
  conditions.forEach(c => {
    doc.fontSize(11).fillColor('#374151')
       .text(`• ${c}`, { align: 'right', lineGap: 3 })
  })

  doc.moveDown(1.5)

  // ── Signature area ────────────────────────────────
  doc.moveTo(72, doc.y).lineTo(523, doc.y).lineWidth(0.5).strokeColor('#cbd5e1').stroke()
  doc.moveDown(0.8)

  doc.fontSize(11).fillColor('#64748b')
     .text('____________________________________________', 300, doc.y, { width: 220, align: 'center' })
  doc.moveDown(0.3)
  doc.text('יו"ר ועדת האתיקה', 300, doc.y, { width: 220, align: 'center' })
  doc.text('Chairperson, Ethics Committee', 300, doc.y, { width: 220, align: 'center' })

  // ── Footer ────────────────────────────────────────
  const pageHeight = doc.page.height
  doc.fontSize(8).fillColor('#94a3b8')
     .text(
       `מסמך זה הופק אוטומטית על ידי מערכת EthicFlow • ${today} • מס' אסמכתה: ${submission.applicationId}`,
       72, pageHeight - 50, { align: 'center', width: 451 }
     )

  // ── Write to disk ─────────────────────────────────
  await streamToFile(doc, absPath)

  // ── Upsert Document record ────────────────────────
  const stat     = await fs.stat(absPath)
  const existing = await prisma.document.findFirst({
    where: { submissionId, storagePath },
  })

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
// FORMATTING HELPERS
// ─────────────────────────────────────────────

/**
 * Returns a human-readable Hebrew track label.
 * @param {string} track
 * @returns {string}
 */
function trackLabel(track) {
  const map = { FULL: 'מסלול מלא', EXPEDITED: 'מסלול מקוצר', EXEMPT: 'פטור' }
  return map[track] ?? track
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
