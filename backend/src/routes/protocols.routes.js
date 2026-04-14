/**
 * EthicFlow — Protocols Routes
 *
 * GET    /api/protocols                          — list protocols (SECRETARY, CHAIRMAN, ADMIN)
 * POST   /api/protocols                          — create protocol (SECRETARY, ADMIN)
 * GET    /api/protocols/:id                      — protocol detail (SECRETARY, CHAIRMAN, ADMIN)
 * PUT    /api/protocols/:id                      — update protocol (SECRETARY, ADMIN)
 * POST   /api/protocols/:id/finalize             — finalize protocol (SECRETARY, ADMIN)
 * POST   /api/protocols/:id/request-signatures   — request signatures (SECRETARY, ADMIN)
 * GET    /api/protocols/:id/pdf                  — generate PDF (SECRETARY, CHAIRMAN, ADMIN)
 *
 * PUBLIC (no auth):
 * GET    /api/protocol/sign/:token               — get sign-page info
 * POST   /api/protocol/sign/:token               — sign or decline
 */

import { Router } from 'express'
import { z }      from 'zod'
import { validate, validateQuery } from '../middleware/validate.js'
import { authenticate } from '../middleware/auth.js'
import { authorize }    from '../middleware/role.js'
import { auditLog }     from '../middleware/audit.js'
import * as controller  from '../controllers/protocols.controller.js'

const router = Router()

// ─────────────────────────────────────────────
// ZOD SCHEMAS
// ─────────────────────────────────────────────

const listQuerySchema = z.object({
  status:    z.enum(['DRAFT', 'PENDING_SIGNATURES', 'SIGNED', 'ARCHIVED']).optional(),
  meetingId: z.string().uuid().optional(),
  page:      z.string().regex(/^\d+$/).optional(),
  limit:     z.string().regex(/^\d+$/).optional(),
})

const createSchema = z.object({
  meetingId:   z.string().uuid(),
  title:       z.string().min(2).max(500).optional(),
  contentJson: z.record(z.unknown()).optional(),
})

const updateSchema = z.object({
  title:       z.string().min(2).max(500).optional(),
  contentJson: z.record(z.unknown()).optional(),
})

const requestSignaturesSchema = z.object({
  signerIds: z.array(z.string().uuid()).min(1),
})

const signActionSchema = z.object({
  action: z.enum(['sign', 'decline']),
})

// ─────────────────────────────────────────────
// AUTHENTICATED ROUTES
// ─────────────────────────────────────────────

router.get(
  '/',
  authenticate,
  authorize('SECRETARY', 'CHAIRMAN', 'ADMIN'),
  validateQuery(listQuerySchema),
  controller.list
)

router.post(
  '/',
  authenticate,
  authorize('SECRETARY', 'ADMIN'),
  validate(createSchema),
  controller.create,
  auditLog('protocol.created', 'Protocol')
)

router.get(
  '/:id',
  authenticate,
  authorize('SECRETARY', 'CHAIRMAN', 'ADMIN'),
  controller.getById
)

router.put(
  '/:id',
  authenticate,
  authorize('SECRETARY', 'ADMIN'),
  validate(updateSchema),
  controller.update,
  auditLog('protocol.updated', 'Protocol')
)

router.post(
  '/:id/finalize',
  authenticate,
  authorize('SECRETARY', 'ADMIN'),
  controller.finalize,
  auditLog('protocol.finalized', 'Protocol')
)

router.post(
  '/:id/request-signatures',
  authenticate,
  authorize('SECRETARY', 'ADMIN'),
  validate(requestSignaturesSchema),
  controller.requestSignatures,
  auditLog('protocol.signatures_requested', 'Protocol')
)

router.get(
  '/:id/pdf',
  authenticate,
  authorize('SECRETARY', 'CHAIRMAN', 'ADMIN'),
  controller.getPdf
)

// ─────────────────────────────────────────────
// PUBLIC ROUTES (token-based, no auth)
// ─────────────────────────────────────────────

/**
 * These routes are mounted separately in index.js under /api/protocol (singular)
 * to distinguish them from the authenticated /api/protocols (plural) prefix.
 */
export const publicSignRouter = Router()

publicSignRouter.get(
  '/sign/:token',
  controller.getSignInfo
)

publicSignRouter.post(
  '/sign/:token',
  validate(signActionSchema),
  controller.signByToken,
  auditLog('protocol.signed', 'Protocol')
)

export default router
