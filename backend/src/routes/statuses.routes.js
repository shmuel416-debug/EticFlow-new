/**
 * EthicFlow — Status Management Routes
 * Public config endpoints + admin status management endpoints.
 */

import { Router } from 'express'
import { z } from 'zod'
import { validate, validateQuery } from '../middleware/validate.js'
import { authenticate } from '../middleware/auth.js'
import { authorize } from '../middleware/role.js'
import { auditLog } from '../middleware/audit.js'
import * as controller from '../controllers/statuses.controller.js'

const statusCodeSchema = z.string().trim().regex(/^[A-Z_]{2,40}$/)
const roleSchema = z.enum(['RESEARCHER', 'SECRETARY', 'REVIEWER', 'CHAIRMAN', 'ADMIN'])
const actionSchema = z.enum(['VIEW', 'EDIT', 'COMMENT', 'UPLOAD_DOC', 'DELETE_DOC', 'VIEW_INTERNAL', 'TRANSITION', 'ASSIGN', 'SUBMIT_REVIEW', 'RECORD_DECISION'])
const hexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/)

const statusSchema = z.object({
  code: statusCodeSchema,
  labelHe: z.string().min(1).max(100),
  labelEn: z.string().min(1).max(100),
  descriptionHe: z.string().trim().max(500).nullable().optional(),
  descriptionEn: z.string().trim().max(500).nullable().optional(),
  color: hexColorSchema.default('#64748b'),
  orderIndex: z.number().int().min(0).max(9999).default(0),
  isInitial: z.boolean().default(false),
  isTerminal: z.boolean().default(false),
  slaPhase: z.enum(['TRIAGE', 'REVIEW', 'APPROVAL', 'COMPLETED']).nullable().optional(),
  notificationType: z.enum([
    'SUBMISSION_RECEIVED',
    'SUBMISSION_ASSIGNED',
    'REVIEW_REQUESTED',
    'REVISION_REQUIRED',
    'APPROVED',
    'REJECTED',
    'MEETING_SCHEDULED',
    'MEETING_REMINDER',
    'SLA_WARNING',
    'SLA_BREACH',
    'PROTOCOL_SIGNATURE_REQUESTED',
    'SYSTEM',
  ]).nullable().optional(),
})

const reorderSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      orderIndex: z.number().int().min(0).max(9999),
    })
  ).min(1),
})

const transitionsSchema = z.object({
  transitions: z.array(
    z.object({
      toCode: statusCodeSchema,
      allowedRoles: z.array(roleSchema).min(1),
      requireReviewerAssigned: z.boolean().default(false),
    })
  ),
})

const permissionsSchema = z.object({
  permissions: z.array(
    z.object({
      role: roleSchema,
      action: actionSchema,
      allowed: z.boolean(),
    })
  ).min(1),
})

const actionQuerySchema = z.object({
  status: statusCodeSchema,
})

const configQuerySchema = z.object({
  submissionId: z.string().uuid().optional(),
  status: statusCodeSchema.optional(),
})

const userRouter = Router()
const adminRouter = Router()

userRouter.get(
  '/config',
  authenticate,
  validateQuery(configQuerySchema),
  controller.getStatusConfig
)

userRouter.get(
  '/actions/allowed',
  authenticate,
  validateQuery(actionQuerySchema),
  controller.getAllowedActions
)

adminRouter.get(
  '/',
  authenticate,
  authorize('ADMIN'),
  controller.listAdminStatuses
)

adminRouter.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  validate(statusSchema),
  auditLog('status_config.created', 'SubmissionStatus'),
  controller.createStatus
)

adminRouter.put(
  '/reorder',
  authenticate,
  authorize('ADMIN'),
  validate(reorderSchema),
  auditLog('status_config.reordered', 'SubmissionStatus'),
  controller.reorderStatuses
)

adminRouter.put(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  validate(statusSchema),
  auditLog('status_config.updated', 'SubmissionStatus'),
  controller.updateStatus
)

adminRouter.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  auditLog('status_config.deleted', 'SubmissionStatus'),
  controller.removeStatus
)

adminRouter.get(
  '/:id/transitions',
  authenticate,
  authorize('ADMIN'),
  controller.getStatusTransitions
)

adminRouter.put(
  '/:id/transitions',
  authenticate,
  authorize('ADMIN'),
  validate(transitionsSchema),
  auditLog('status_config.transitions_updated', 'SubmissionStatus'),
  controller.updateStatusTransitions
)

adminRouter.get(
  '/:id/permissions',
  authenticate,
  authorize('ADMIN'),
  controller.getStatusPermissions
)

adminRouter.put(
  '/:id/permissions',
  authenticate,
  authorize('ADMIN'),
  validate(permissionsSchema),
  auditLog('status_config.permissions_updated', 'SubmissionStatus'),
  controller.updateStatusPermissions
)

export { userRouter as statusesRouter, adminRouter as adminStatusesRouter }
