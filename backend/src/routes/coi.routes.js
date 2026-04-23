/**
 * EthicFlow — Conflict of Interest Routes
 */

import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth.js'
import { validate, validateQuery } from '../middleware/validate.js'
import { auditLog } from '../middleware/audit.js'
import * as controller from '../controllers/coi.controller.js'

const router = Router()

const createSchema = z.object({
  scope: z.enum(['SUBMISSION', 'USER', 'DEPARTMENT', 'GLOBAL']),
  targetSubmissionId: z.string().uuid().optional(),
  targetUserId: z.string().uuid().optional(),
  targetDepartment: z.string().min(1).max(200).optional(),
  reason: z.string().min(5).max(1000),
})

const checkQuerySchema = z.object({
  reviewerId: z.string().uuid(),
  submissionId: z.string().uuid(),
})

router.get('/', authenticate, controller.listMine)
router.post('/', authenticate, validate(createSchema), auditLog('coi.declared', 'ConflictDeclaration'), controller.create)
router.delete('/:id', authenticate, auditLog('coi.revoked', 'ConflictDeclaration'), controller.remove)
router.get('/check', authenticate, validateQuery(checkQuerySchema), controller.check)

export default router
