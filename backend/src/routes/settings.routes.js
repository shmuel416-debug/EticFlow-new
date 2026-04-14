/**
 * EthicFlow — Settings Routes
 *
 * GET /api/settings       — list all institution settings (ADMIN)
 * PUT /api/settings/:key  — update a setting value (ADMIN)
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
  value: z.string().min(0).max(2000),
})

// ─────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────

router.get(
  '/',
  authenticate,
  authorize('ADMIN'),
  controller.list
)

router.put(
  '/:key',
  authenticate,
  authorize('ADMIN'),
  validate(updateSchema),
  controller.update,
  auditLog('settings.updated', 'InstitutionSetting')
)

export default router
