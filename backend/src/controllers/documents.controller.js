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
import { can as canByStatusPermission } from '../services/status.service.js'
import { getRequestRole } from '../utils/roles.js'
import path     from 'path'
import fs       from 'fs'

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/**
 * Returns true when the user may access the submission.
 * @param {{ id: string, activeRole?: string }} user
 * @param {object} submission - Prisma submission record
 * @returns {boolean}
 */
function canAccess(user, submission) {
  const activeRole = user.activeRole ?? 'RESEARCHER'
  if (['SECRETARY', 'CHAIRMAN', 'ADMIN'].includes(activeRole)) return true
  if (activeRole === 'RESEARCHER')  return submission.authorId   === user.id
  if (activeRole === 'REVIEWER')    return submission.reviewerId === user.id
  return false
}

/**
 * Returns true when the user may upload/delete documents for the submission.
 * Researchers may only modify their own, and only while not yet final.
 * @param {{ id: string, activeRole?: string }} user
 * @param {object} submission
 * @returns {boolean}
 */
async function canWrite(user, submission) {
  const activeRole = user.activeRole ?? 'RESEARCHER'
  if (['SECRETARY', 'ADMIN'].includes(activeRole)) return true
  if (activeRole === 'RESEARCHER') {
    const allowed = await canByStatusPermission('UPLOAD_DOC', submission.status, activeRole)
    return submission.authorId === user.id && allowed
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
    req.user.activeRole = getRequestRole(req)
    const { subId } = req.params
    const files     = req.files   // multer array field "files"

    if (!files || files.length === 0) {
      throw new AppError('No files provided', 'NO_FILES', 400)
    }

    const submission = await prisma.submission.findUnique({ where: { id: subId } })
    if (!submission || !submission.isActive) {
      throw new AppError('Submission not found', 'NOT_FOUND', 404)
    }
    if (!(await canWrite(req.user, submission))) {
      throw new AppError('Forbidden', 'FORBIDDEN', 403)
    }

    const saved = []

    for (const file of files) {
      // Validate MIME + magic bytes + size
      const validation = validateFile(file)
      if (!validation.valid) {
        throw new AppError(`Invalid file "${file.originalname}": ${validation.reason}`, validation.reason, 400)
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
    req.user.activeRole = getRequestRole(req)
    const { subId } = req.params

    const submission = await prisma.submission.findUnique({ where: { id: subId } })
    if (!submission || !submission.isActive) {
      throw new AppError('Submission not found', 'NOT_FOUND', 404)
    }
    if (!canAccess(req.user, submission)) {
      throw new AppError('Forbidden', 'FORBIDDEN', 403)
    }

    const docs = await prisma.document.findMany({
      where:   { submissionId: subId, isActive: true },
      orderBy: { createdAt: 'asc' },
      include: {
        uploadedBy: { select: { id: true, fullName: true, email: true } },
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
    req.user.activeRole = getRequestRole(req)
    const { id } = req.params

    const doc = await prisma.document.findUnique({
      where:   { id },
      include: { submission: true },
    })

    if (!doc || !doc.isActive) {
      throw new AppError('Document not found', 'NOT_FOUND', 404)
    }
    if (doc.submission && !canAccess(req.user, doc.submission)) {
      throw new AppError('Forbidden', 'FORBIDDEN', 403)
    }

    const absPath = resolvePath(doc.storagePath)
    if (!fs.existsSync(absPath)) {
      throw new AppError('File not found on storage', 'FILE_MISSING', 404)
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
    req.user.activeRole = getRequestRole(req)
    const { id } = req.params

    const doc = await prisma.document.findUnique({
      where:   { id },
      include: { submission: true },
    })

    if (!doc || !doc.isActive) {
      throw new AppError('Document not found', 'NOT_FOUND', 404)
    }
    if (doc.submission && !(await canWrite(req.user, doc.submission))) {
      throw new AppError('Forbidden', 'FORBIDDEN', 403)
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
