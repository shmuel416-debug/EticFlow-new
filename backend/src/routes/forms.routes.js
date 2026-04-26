/**
 * EthicFlow — Forms Routes
 * GET    /api/forms            — list all forms          (SECRETARY, ADMIN)
 * GET    /api/forms/active     — get active form         (all authenticated)
 * GET    /api/forms/available  — list published+active   (all authenticated, metadata)
 * GET    /api/forms/available/:id — published+active by id (all authenticated, full)
 * GET    /api/forms/:id        — get single form         (SECRETARY, ADMIN)
 * POST   /api/forms            — create draft form       (SECRETARY, ADMIN)
 * PUT    /api/forms/:id        — update draft schema     (SECRETARY, ADMIN)
 * POST   /api/forms/:id/publish — publish form           (SECRETARY, ADMIN)
 * POST   /api/forms/:id/archive  — archive form           (SECRETARY, ADMIN)
 * POST   /api/forms/:id/restore  — restore archived form  (SECRETARY, ADMIN)
 */

import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../middleware/validate.js'
import { authenticate } from '../middleware/auth.js'
import { authorize } from '../middleware/role.js'
import { auditLog } from '../middleware/audit.js'
import * as controller from '../controllers/forms.controller.js'

const router = Router()

// ─────────────────────────────────────────────
// ZOD SCHEMAS
// ─────────────────────────────────────────────

/** Strip HTML tags from a string to prevent stored XSS. */
const stripHtml = (s) => s.replace(/<[^>]*>/g, '').trim()

const createSchema = z.object({
  name:       z.string().min(2, 'Form name must be at least 2 characters').transform(stripHtml),
  nameEn:     z.string().min(2, 'English name must be at least 2 characters').transform(stripHtml),
  schemaJson: z.record(z.unknown()).default({}),
})

const updateSchema = z.object({
  name:       z.string().min(2).transform(stripHtml).optional(),
  nameEn:     z.string().min(2).transform(stripHtml).optional(),
  schemaJson: z.record(z.unknown()).optional(),
})

// ─────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────

// NOTE: /active must be declared before /:id to avoid route conflict

router.get(
  '/',
  authenticate,
  authorize('SECRETARY', 'ADMIN'),
  controller.list
)

router.get(
  '/active',
  authenticate,
  controller.getActive
)

router.get(
  '/available',
  authenticate,
  controller.listAvailable
)

router.get(
  '/available/:id',
  authenticate,
  controller.getAvailableById
)

router.get(
  '/:id',
  authenticate,
  authorize('SECRETARY', 'ADMIN'),
  controller.getById
)

router.post(
  '/',
  authenticate,
  authorize('SECRETARY', 'ADMIN'),
  validate(createSchema),
  auditLog('form.create', 'FormConfig'),
  controller.create
)

router.put(
  '/:id',
  authenticate,
  authorize('SECRETARY', 'ADMIN'),
  validate(updateSchema),
  auditLog('form.update', 'FormConfig'),
  controller.update
)

router.post(
  '/:id/publish',
  authenticate,
  authorize('SECRETARY', 'ADMIN'),
  auditLog('form.publish', 'FormConfig'),
  controller.publish
)

router.post(
  '/:id/archive',
  authenticate,
  authorize('SECRETARY', 'ADMIN'),
  auditLog('form.archive', 'FormConfig'),
  controller.archive
)

router.post(
  '/:id/restore',
  authenticate,
  authorize('SECRETARY', 'ADMIN'),
  auditLog('form.restore', 'FormConfig'),
  controller.restore
)

export default router
