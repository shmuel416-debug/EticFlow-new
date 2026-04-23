/**
 * EthicFlow — Users Routes
 *
 * Public to staff:
 *   GET  /api/users/reviewers          — reviewer list (SECRETARY, CHAIRMAN, ADMIN)
 *
 * Admin management:
 *   GET    /api/admin/users                      — list all users
 *   POST   /api/admin/users                      — create user
 *   PUT    /api/admin/users/:id                  — update user
 *   PATCH  /api/admin/users/:id/deactivate       — soft-delete user
 *   POST   /api/admin/impersonate/:userId        — issue impersonation JWT
 */

import { Router }    from 'express'
import { z }         from 'zod'
import { validate, validateQuery } from '../middleware/validate.js'
import { authenticate } from '../middleware/auth.js'
import { authorize }    from '../middleware/role.js'
import { auditLog }     from '../middleware/audit.js'
import * as controller  from '../controllers/users.controller.js'

const router = Router()

// ─────────────────────────────────────────────
// ZOD SCHEMAS
// ─────────────────────────────────────────────

const VALID_ROLES = ['RESEARCHER', 'SECRETARY', 'REVIEWER', 'CHAIRMAN', 'ADMIN']

const listQuerySchema = z.object({
  search: z.string().max(200).optional(),
  role:   z.string().max(200).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  page:   z.string().regex(/^\d+$/).optional(),
  limit:  z.string().regex(/^\d+$/).optional(),
})

const createSchema = z.object({
  email:      z.string().email(),
  fullName:   z.string().min(2).max(200),
  roles:      z.array(z.enum(VALID_ROLES)).min(1).default(['RESEARCHER']),
  department: z.string().max(200).optional(),
  phone:      z.string().max(50).optional(),
  password:   z.string().min(8).max(100).optional(),
})

const updateSchema = z.object({
  fullName:   z.string().min(2).max(200).optional(),
  roles:      z.array(z.enum(VALID_ROLES)).min(1).optional(),
  department: z.string().max(200).optional(),
  phone:      z.string().max(50).optional(),
})

const impersonateParamSchema = z.object({
  userId: z.string().uuid(),
})

const reviewersQuerySchema = z.object({
  submissionId: z.string().uuid().optional(),
})

// ─────────────────────────────────────────────
// ROUTES — STAFF (reviewer dropdown)
// ─────────────────────────────────────────────

router.get(
  '/reviewers',
  authenticate,
  authorize('SECRETARY', 'CHAIRMAN', 'ADMIN'),
  validateQuery(reviewersQuerySchema),
  controller.listReviewers
)

router.get(
  '/signers',
  authenticate,
  authorize('SECRETARY', 'CHAIRMAN', 'ADMIN'),
  controller.listSigners
)

// ─────────────────────────────────────────────
// ROUTES — ADMIN
// ─────────────────────────────────────────────

router.get(
  '/admin/users',
  authenticate,
  authorize('ADMIN'),
  validateQuery(listQuerySchema),
  controller.listAll
)

router.post(
  '/admin/users',
  authenticate,
  authorize('ADMIN'),
  validate(createSchema),
  auditLog('admin.user_created', 'User'),
  controller.create
)

router.put(
  '/admin/users/:id',
  authenticate,
  authorize('ADMIN'),
  validate(updateSchema),
  auditLog('admin.user_updated', 'User'),
  controller.update
)

router.patch(
  '/admin/users/:id/deactivate',
  authenticate,
  authorize('ADMIN'),
  auditLog('admin.user_deactivated', 'User'),
  controller.deactivate
)

router.post(
  '/admin/impersonate/:userId',
  authenticate,
  authorize('ADMIN'),
  auditLog('admin.impersonation_start', 'User'),
  controller.impersonate
)

export default router
