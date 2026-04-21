/**
 * EthicFlow — Reports Routes
 *
 * GET /api/reports/stats                — aggregated statistics (SECRETARY, CHAIRMAN, ADMIN)
 * GET /api/reports/export/submissions   — XLSX export (SECRETARY, CHAIRMAN, ADMIN)
 * GET /api/audit-logs                   — paginated audit log (ADMIN only) — registered in index.js
 */

import { Router }       from 'express'
import { z }            from 'zod'
import { validateQuery } from '../middleware/validate.js'
import { authenticate } from '../middleware/auth.js'
import { authorize }    from '../middleware/role.js'
import * as controller  from '../controllers/reports.controller.js'

const router = Router()

// ─────────────────────────────────────────────
// ZOD SCHEMAS
// ─────────────────────────────────────────────

const exportQuerySchema = z.object({
  status: z.string().optional(),
  track:  z.string().optional(),
  from:   z.string().datetime().optional(),
  to:     z.string().datetime().optional(),
  lang:   z.enum(['he', 'en']).optional(),
})

const auditQuerySchema = z.object({
  action:     z.string().optional(),
  entityType: z.string().optional(),
  userId:     z.string().uuid().optional(),
  from:       z.string().datetime().optional(),
  to:         z.string().datetime().optional(),
  page:       z.string().regex(/^\d+$/).optional(),
  limit:      z.string().regex(/^\d+$/).refine(v => !v || parseInt(v) <= 100, { message: 'limit must be ≤ 100' }).optional(),
})

// ─────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────

router.get(
  '/stats',
  authenticate,
  authorize('SECRETARY', 'CHAIRMAN', 'ADMIN'),
  controller.getStats
)

router.get(
  '/export/submissions',
  authenticate,
  authorize('SECRETARY', 'CHAIRMAN', 'ADMIN'),
  validateQuery(exportQuerySchema),
  controller.exportSubmissions
)

// Audit log is on /api/audit-logs — exported separately for index.js
export const auditLogsRouter = Router()
auditLogsRouter.get(
  '/',
  authenticate,
  authorize('ADMIN'),
  validateQuery(auditQuerySchema),
  controller.getAuditLogs
)

export default router
