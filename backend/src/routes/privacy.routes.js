/**
 * EthicFlow — Privacy Routes
 * Consent capture + data subject rights endpoints.
 */

import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { auditLog } from '../middleware/audit.js'
import * as controller from '../controllers/privacy.controller.js'

const router = Router()

const consentSchema = z.object({
  consentType: z.string().min(2).max(100),
  policyVersion: z.string().min(1).max(50),
  accepted: z.boolean(),
})

const dsrSchema = z.object({
  type: z.enum(['ACCESS', 'ERASURE']),
  details: z.string().max(2000).optional(),
})

router.post(
  '/consent',
  authenticate,
  validate(consentSchema),
  auditLog('privacy.consent_recorded', 'PrivacyConsent'),
  controller.recordConsent
)

router.post(
  '/request',
  authenticate,
  validate(dsrSchema),
  auditLog('privacy.request_created', 'DataSubjectRequest'),
  controller.createDsrRequest
)

router.get(
  '/request',
  authenticate,
  controller.listDsrRequests
)

router.get(
  '/export',
  authenticate,
  auditLog('privacy.data_exported', 'User'),
  controller.exportMyData
)

export default router
