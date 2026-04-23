/**
 * EthicFlow — Submissions Routes
 * GET    /api/submissions           — list (role-filtered)       (all authenticated)
 * GET    /api/submissions/:id       — single + versions + comments (all authenticated)
 * POST   /api/submissions           — create new submission       (RESEARCHER)
 * PUT    /api/submissions/:id       — update draft                (RESEARCHER, SECRETARY, ADMIN)
 * POST   /api/submissions/:id/continue — clone approved submission (RESEARCHER)
 * POST   /api/submissions/:id/approval-letter — generate approval letter PDF (CHAIRMAN, ADMIN, SECRETARY)
 */

import { Router } from 'express'
import { z } from 'zod'
import { validate, validateQuery } from '../middleware/validate.js'
import { authenticate } from '../middleware/auth.js'
import { authorize } from '../middleware/role.js'
import { auditLog, recordAuditEntry } from '../middleware/audit.js'
import * as controller from '../controllers/submissions.controller.js'

import * as statusController from '../controllers/submissions.status.controller.js'
import { generateApprovalLetter } from '../services/pdf.service.js'
import { resolvePath } from '../services/storage.service.js'
import { AppError } from '../utils/errors.js'
import { getRequestRole } from '../utils/roles.js'
import prisma from '../config/database.js'
import fs from 'fs'

const router = Router()

// ─────────────────────────────────────────────
// ZOD SCHEMAS
// ─────────────────────────────────────────────

/** Strip HTML tags from a string to prevent stored XSS. */
const stripHtml = (s) => s.replace(/<[^>]*>/g, '').trim()

const createSchema = z.object({
  title:        z.string().min(2, 'Title must be at least 2 characters').max(500, 'Title too long').transform(stripHtml),
  formConfigId: z.string().min(1, 'Invalid form ID'),
  dataJson:     z.record(z.unknown()).default({}),
  track:        z.enum(['FULL', 'EXPEDITED', 'EXEMPT']).optional(),
})

const updateSchema = z.object({
  title:      z.string().min(2).max(500).transform(stripHtml).optional(),
  dataJson:   z.record(z.unknown()).optional(),
  changeNote: z.string().max(1000).optional(),
})

const statusCodeSchema = z.string().trim().regex(/^[A-Z_]{2,40}$/)

const listQuerySchema = z.object({
  status:   statusCodeSchema.optional(),
  statuses: z.string().optional(),
  search:   z.string().max(200).optional(),
  page:     z.string().regex(/^\d+$/).optional(),
  limit:    z.string().regex(/^\d+$/).optional(),
})

const transitionSchema = z.object({
  status: statusCodeSchema,
  note:   z.string().max(2000).optional(),
})

const assignSchema = z.object({
  reviewerId: z.string().uuid(),
})

const reviewSchema = z.object({
  score:          z.number().int().min(1).max(5),
  recommendation: z.enum(['APPROVED', 'REJECTED', 'REVISION_REQUIRED']),
  comments:       z.string().min(10).max(5000).transform(stripHtml),
})

const decisionSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED', 'REVISION_REQUIRED']),
  note:     z.string().max(2000).transform(stripHtml).optional(),
})

const commentSchema = z.object({
  content:    z.string().min(1).max(5000).transform(stripHtml),
  fieldKey:   z.string().max(100).optional(),
  isInternal: z.boolean().optional(),
})

const withdrawSchema = z.object({
  note: z.string().max(2000).transform(stripHtml).optional(),
})

const voteSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED', 'REVISION_REQUIRED', 'ABSTAIN']),
  note: z.string().max(2000).transform(stripHtml).optional(),
})

// ─────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────

router.get(
  '/dashboard/secretary',
  authenticate,
  authorize('SECRETARY', 'ADMIN'),
  controller.secretaryDashboard
)

router.get(
  '/',
  authenticate,
  validateQuery(listQuerySchema),
  controller.list
)

router.get(
  '/:id',
  authenticate,
  controller.getById
)

router.post(
  '/',
  authenticate,
  authorize('RESEARCHER'),
  validate(createSchema),
  auditLog('submission.create', 'Submission'),
  controller.create
)

router.put(
  '/:id',
  authenticate,
  authorize('RESEARCHER', 'SECRETARY', 'ADMIN'),
  validate(updateSchema),
  auditLog('submission.update', 'Submission'),
  controller.update
)

router.post(
  '/:id/submit',
  authenticate,
  authorize('RESEARCHER'),
  auditLog('submission.submitted', 'Submission'),
  controller.researcherSubmit
)

router.post(
  '/:id/continue',
  authenticate,
  authorize('RESEARCHER'),
  auditLog('submission.continue', 'Submission'),
  controller.continueSubmission
)

router.patch(
  '/:id/status',
  authenticate,
  authorize('SECRETARY', 'CHAIRMAN', 'ADMIN'),
  validate(transitionSchema),
  auditLog('submission.status_changed', 'Submission'),
  statusController.transitionStatus
)

router.patch(
  '/:id/assign',
  authenticate,
  authorize('SECRETARY', 'ADMIN'),
  validate(assignSchema),
  auditLog('submission.reviewer_assigned', 'Submission'),
  statusController.assignReviewer
)

router.patch(
  '/:id/review',
  authenticate,
  authorize('REVIEWER', 'CHAIRMAN'),
  validate(reviewSchema),
  auditLog('submission.review_submitted', 'Submission'),
  statusController.submitReview
)

router.patch(
  '/:id/decision',
  authenticate,
  authorize('CHAIRMAN', 'ADMIN'),
  validate(decisionSchema),
  auditLog('submission.decision_recorded', 'Submission'),
  statusController.recordDecision
)

router.post(
  '/:id/comments',
  authenticate,
  authorize('SECRETARY', 'REVIEWER', 'CHAIRMAN', 'ADMIN'),
  validate(commentSchema),
  auditLog('submission.comment_added', 'Submission'),
  statusController.addComment
)

router.post(
  '/:id/withdraw',
  authenticate,
  authorize('RESEARCHER', 'SECRETARY', 'ADMIN'),
  validate(withdrawSchema),
  auditLog('submission.withdrawn', 'Submission'),
  statusController.withdrawSubmission
)

router.post(
  '/:id/votes',
  authenticate,
  authorize('REVIEWER', 'SECRETARY', 'CHAIRMAN', 'ADMIN'),
  validate(voteSchema),
  auditLog('submission.vote_recorded', 'SubmissionVote'),
  statusController.recordVote
)

/**
 * POST /api/submissions/:id/approval-letter
 * Generates (or regenerates) the PDF approval letter for an approved submission
 * and streams it to the client as a download.
 * Allowed roles: CHAIRMAN, SECRETARY, ADMIN, RESEARCHER (own submissions only).
 */
router.post(
  '/:id/approval-letter',
  authenticate,
  async (req, res, next) => {
    try {
      const { id }   = req.params
      const role = getRequestRole(req)

      // REVIEWER is never allowed
      if (role === 'REVIEWER') {
        throw new AppError('Forbidden', 'FORBIDDEN', 403)
      }

      // RESEARCHER may only download their own submission's letter
      if (role === 'RESEARCHER') {
        const sub = await prisma.submission.findUnique({ where: { id }, select: { authorId: true } })
        if (!sub || sub.authorId !== req.user.id) {
          throw new AppError('Forbidden', 'FORBIDDEN', 403)
        }
      }

      const lang = req.query.lang === 'en' ? 'en' : 'he'
      const { docId, storagePath } = await generateApprovalLetter(id, lang)

      const absPath = resolvePath(storagePath)
      if (!fs.existsSync(absPath)) {
        throw new AppError('Generated file not found', 'PDF_MISSING', 500)
      }

      const stat     = fs.statSync(absPath)
      const filename = `approval-letter-${lang}.pdf`
      res.setHeader('Content-Type',        'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      res.setHeader('Content-Length',      stat.size)
      res.setHeader('X-Document-Id',       docId)

      res.locals.entityId = id
      res.on('finish', () => {
        if (res.statusCode < 400) {
          recordAuditEntry(req, res, 'submission.approval_letter_generated', 'Submission').catch((err) => {
            console.error('[Audit] Failed to write audit log:', err.message)
          })
        }
      })
      fs.createReadStream(absPath).pipe(res)
    } catch (err) {
      next(err)
    }
  }
)

export default router
