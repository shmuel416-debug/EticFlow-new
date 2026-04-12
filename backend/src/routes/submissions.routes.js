/**
 * EthicFlow — Submissions Routes
 * GET    /api/submissions           — list (role-filtered)       (all authenticated)
 * GET    /api/submissions/:id       — single + versions + comments (all authenticated)
 * POST   /api/submissions           — create new submission       (RESEARCHER)
 * PUT    /api/submissions/:id       — update draft                (RESEARCHER, SECRETARY, ADMIN)
 * POST   /api/submissions/:id/continue — clone approved submission (RESEARCHER)
 */

import { Router } from 'express'
import { z } from 'zod'
import { validate, validateQuery } from '../middleware/validate.js'
import { authenticate } from '../middleware/auth.js'
import { authorize } from '../middleware/role.js'
import { auditLog } from '../middleware/audit.js'
import * as controller from '../controllers/submissions.controller.js'

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

const listQuerySchema = z.object({
  status: z.enum([
    'DRAFT', 'SUBMITTED', 'IN_TRIAGE', 'ASSIGNED',
    'IN_REVIEW', 'PENDING_REVISION', 'APPROVED', 'REJECTED', 'WITHDRAWN', 'CONTINUED',
  ]).optional(),
  page:  z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
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

export default router
