/**
 * EthicFlow — Settings Routes
 *
 * GET /api/settings       — list institution settings (ADMIN + SECRETARY [template keys only])
 * PUT /api/settings/:key  — update a setting value (ADMIN + SECRETARY [template keys only])
 */

import { Router } from 'express'
import { z }      from 'zod'
import { validate } from '../middleware/validate.js'
import { authenticate } from '../middleware/auth.js'
import { authorize }    from '../middleware/role.js'
import { auditLog }     from '../middleware/audit.js'
import * as controller  from '../controllers/settings.controller.js'

const router = Router()

// ─────────────────────────────────────────────
// ZOD SCHEMAS
// ─────────────────────────────────────────────

const updateSchema = z.object({
  value: z.unknown(),
})
const previewSchema = z.object({
  submissionId: z.string().uuid(),
  lang: z.enum(['he', 'en']).optional(),
  template: z.unknown(),
})

// ─────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────

router.get(
  '/',
  authenticate,
  authorize('ADMIN', 'SECRETARY'),
  controller.list
)

router.post(
  '/approval-template/preview',
  authenticate,
  authorize('ADMIN', 'SECRETARY'),
  validate(previewSchema),
  auditLog('settings.template_previewed', 'Submission'),
  controller.previewApprovalTemplate
)

router.put(
  '/:key',
  authenticate,
  authorize('ADMIN', 'SECRETARY'),
  validate(updateSchema),
  auditLog('settings.updated', 'InstitutionSetting'),
  controller.update
)

export default router
