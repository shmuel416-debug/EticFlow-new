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
import { auditLog } from '../middleware/audit.js'
import * as controller from '../controllers/submissions.controller.js'
import * as statusController from '../controllers/submissions.status.controller.js'
import { generateApprovalLetter } from '../services/pdf.service.js'
import { resolvePath } from '../services/storage.service.js'
import { AppError } from '../utils/errors.js'
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

const VALID_STATUSES = ['DRAFT','SUBMITTED','IN_TRIAGE','ASSIGNED','IN_REVIEW','PENDING_REVISION','APPROVED','REJECTED','WITHDRAWN','CONTINUED']

const listQuerySchema = z.object({
  status:   z.enum(VALID_STATUSES).optional(),
  statuses: z.string().optional(),
  search:   z.string().max(200).optional(),
  page:     z.string().regex(/^\d+$/).optional(),
  limit:    z.string().regex(/^\d+$/).optional(),
})

const transitionSchema = z.object({
  status: z.enum(VALID_STATUSES),
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

// ─────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────

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
  controller.create,
  auditLog('submission.create', 'Submission')
)

router.put(
  '/:id',
  authenticate,
  authorize('RESEARCHER', 'SECRETARY', 'ADMIN'),
  validate(updateSchema),
  controller.update,
  auditLog('submission.update', 'Submission')
)

router.post(
  '/:id/continue',
  authenticate,
  authorize('RESEARCHER'),
  controller.continueSubmission,
  auditLog('submission.continue', 'Submission')
)

router.patch(
  '/:id/status',
  authenticate,
  authorize('SECRETARY', 'CHAIRMAN', 'ADMIN'),
  validate(transitionSchema),
  statusController.transitionStatus,
  auditLog('submission.status_changed', 'Submission')
)

router.patch(
  '/:id/assign',
  authenticate,
  authorize('SECRETARY', 'ADMIN'),
  validate(assignSchema),
  statusController.assignReviewer,
  auditLog('submission.reviewer_assigned', 'Submission')
)

router.patch(
  '/:id/review',
  authenticate,
  authorize('REVIEWER'),
  validate(reviewSchema),
  statusController.submitReview,
  auditLog('submission.review_submitted', 'Submission')
)

router.patch(
  '/:id/decision',
  authenticate,
  authorize('CHAIRMAN', 'ADMIN'),
  validate(decisionSchema),
  statusController.recordDecision,
  auditLog('submission.decision_recorded', 'Submission')
)

router.post(
  '/:id/comments',
  authenticate,
  authorize('SECRETARY', 'REVIEWER', 'CHAIRMAN', 'ADMIN'),
  validate(commentSchema),
  statusController.addComment,
  auditLog('submission.comment_added', 'Submission')
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
      const { role } = req.user

      // RESEARCHER may only download their own approved letter
      if (role === 'REVIEWER') {
        throw new AppError('Forbidden', 403, 'FORBIDDEN')
      }

      const { docId, storagePath } = await generateApprovalLetter(id)

      const absPath = resolvePath(storagePath)
      if (!fs.existsSync(absPath)) {
        throw new AppError('Generated file not found', 500, 'PDF_MISSING')
      }

      const stat = fs.statSync(absPath)
      res.setHeader('Content-Type',        'application/pdf')
      res.setHeader('Content-Disposition', 'attachment; filename="approval-letter.pdf"')
      res.setHeader('Content-Length',      stat.size)
      res.setHeader('X-Document-Id',       docId)

      fs.createReadStream(absPath).pipe(res)
    } catch (err) {
      next(err)
    }
  },
  auditLog('submission.approval_letter_generated', 'Submission')
)

export default router
