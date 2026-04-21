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

// ─────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────

router.get(
  '/',
  authenticate,
  authorize('ADMIN', 'SECRETARY'),
  controller.list
)

router.put(
  '/:key',
  authenticate,
  authorize('ADMIN', 'SECRETARY'),
  validate(updateSchema),
  controller.update,
  auditLog('settings.updated', 'InstitutionSetting')
)

export default router
