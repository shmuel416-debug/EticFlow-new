/**
 * EthicFlow — Documents Controller
 * Handles file upload, listing, download, and deletion for submission documents.
 *
 * Endpoints:
 *   POST   /api/documents/submissions/:subId        — upload file(s)
 *   GET    /api/documents/submissions/:subId        — list documents for submission
 *   GET    /api/documents/:id/download              — stream file to client
 *   DELETE /api/documents/:id                       — soft-delete document
 */

import prisma   from '../config/database.js'
import { AppError } from '../utils/errors.js'
import { validateFile, saveFile, deleteFile, resolvePath } from '../services/storage.service.js'
import path     from 'path'
import fs       from 'fs'

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/**
 * Returns true when the user may access the submission.
 * @param {{ id: string, role: string }} user
 * @param {object} submission - Prisma submission record
 * @returns {boolean}
 */
function canAccess(user, submission) {
  if (['SECRETARY', 'CHAIRMAN', 'ADMIN'].includes(user.role)) return true
  if (user.role === 'RESEARCHER')  return submission.authorId   === user.id
  if (user.role === 'REVIEWER')    return submission.reviewerId === user.id
  return false
}

/**
 * Returns true when the user may upload/delete documents for the submission.
 * Researchers may only modify their own, and only while not yet final.
 * @param {{ id: string, role: string }} user
 * @param {object} submission
 * @returns {boolean}
 */
function canWrite(user, submission) {
  if (['SECRETARY', 'ADMIN'].includes(user.role)) return true
  if (user.role === 'RESEARCHER') {
    const editableStatuses = ['DRAFT', 'SUBMITTED', 'PENDING_REVISION']
    return submission.authorId === user.id && editableStatuses.includes(submission.status)
  }
  return false
}

/**
 * Sanitizes an uploaded filename: strips path traversal, keeps extension.
 * @param {string} originalName
 * @returns {string}
 */
function sanitizeName(originalName) {
  const base = path.basename(originalName)
  return base.replace(/[^a-zA-Z0-9א-תёА-я._\- ]/g, '_').slice(0, 200)
}

// ─────────────────────────────────────────────
// UPLOAD
// ─────────────────────────────────────────────

/**
 * Uploads one or more files to a submission.
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {Function} next
 */
export async function upload(req, res, next) {
  try {
    const { subId } = req.params
    const files     = req.files   // multer array field "files"

    if (!files || files.length === 0) {
      throw new AppError('No files provided', 400, 'NO_FILES')
    }

    const submission = await prisma.submission.findUnique({ where: { id: subId } })
    if (!submission || !submission.isActive) {
      throw new AppError('Submission not found', 404, 'NOT_FOUND')
    }
    if (!canWrite(req.user, submission)) {
      throw new AppError('Forbidden', 403, 'FORBIDDEN')
    }

    const saved = []

    for (const file of files) {
      // Validate MIME + magic bytes + size
      const validation = validateFile(file)
      if (!validation.valid) {
        throw new AppError(`Invalid file "${file.originalname}": ${validation.reason}`, 400, validation.reason)
      }

      const filename    = sanitizeName(file.originalname)
      const storagePath = await saveFile(subId, filename, file.buffer)

      const doc = await prisma.document.create({
        data: {
          filename,
          originalName: file.originalname.slice(0, 500),
          mimeType:     file.mimetype,
          sizeBytes:    file.size,
          storagePath,
          source:       'UPLOADED',
          submissionId: subId,
          uploadedById: req.user.id,
        },
      })

      saved.push(doc)
    }

    res.status(201).json({ data: saved })
  } catch (err) {
    next(err)
  }
}

// ─────────────────────────────────────────────
// LIST
// ─────────────────────────────────────────────

/**
 * Lists all active documents for a submission.
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {Function} next
 */
export async function list(req, res, next) {
  try {
    const { subId } = req.params

    const submission = await prisma.submission.findUnique({ where: { id: subId } })
    if (!submission || !submission.isActive) {
      throw new AppError('Submission not found', 404, 'NOT_FOUND')
    }
    if (!canAccess(req.user, submission)) {
      throw new AppError('Forbidden', 403, 'FORBIDDEN')
    }

    const docs = await prisma.document.findMany({
      where:   { submissionId: subId, isActive: true },
      orderBy: { createdAt: 'asc' },
      include: {
        uploadedBy: { select: { id: true, name: true, email: true } },
      },
    })

    res.json({ data: docs })
  } catch (err) {
    next(err)
  }
}

// ─────────────────────────────────────────────
// DOWNLOAD
// ─────────────────────────────────────────────

/**
 * Streams a file to the client for download.
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {Function} next
 */
export async function download(req, res, next) {
  try {
    const { id } = req.params

    const doc = await prisma.document.findUnique({
      where:   { id },
      include: { submission: true },
    })

    if (!doc || !doc.isActive) {
      throw new AppError('Document not found', 404, 'NOT_FOUND')
    }
    if (doc.submission && !canAccess(req.user, doc.submission)) {
      throw new AppError('Forbidden', 403, 'FORBIDDEN')
    }

    const absPath = resolvePath(doc.storagePath)
    if (!fs.existsSync(absPath)) {
      throw new AppError('File not found on storage', 404, 'FILE_MISSING')
    }

    res.setHeader('Content-Type',        doc.mimeType)
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.originalName)}"`)
    res.setHeader('Content-Length',      doc.sizeBytes)

    const stream = fs.createReadStream(absPath)
    stream.pipe(res)
  } catch (err) {
    next(err)
  }
}

// ─────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────

/**
 * Soft-deletes a document record and removes the file from storage.
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {Function} next
 */
export async function remove(req, res, next) {
  try {
    const { id } = req.params

    const doc = await prisma.document.findUnique({
      where:   { id },
      include: { submission: true },
    })

    if (!doc || !doc.isActive) {
      throw new AppError('Document not found', 404, 'NOT_FOUND')
    }
    if (doc.submission && !canWrite(req.user, doc.submission)) {
      throw new AppError('Forbidden', 403, 'FORBIDDEN')
    }

    // Soft-delete in DB
    await prisma.document.update({
      where: { id },
      data:  { isActive: false },
    })

    // Remove physical file (fire-and-forget, already ignores missing)
    await deleteFile(doc.storagePath)

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}
