/**
 * EthicFlow — System Templates Compatibility Routes
 * Backward-compatible admin endpoints under /api/admin/system-templates.
 * Keeps older frontend bundles working while canonical routes remain
 * under /api/system-templates/admin/*.
 */

import { Router } from 'express'
import multer from 'multer'
import * as controller from '../controllers/systemTemplates.controller.js'
import { authenticate } from '../middleware/auth.js'
import { authorize } from '../middleware/role.js'
import { auditLog } from '../middleware/audit.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })

router.get(
  '/',
  authenticate,
  authorize('ADMIN'),
  controller.listAll
)

router.get(
  '/:key/versions',
  authenticate,
  authorize('ADMIN'),
  controller.listVersions
)

router.post(
  '/:key/upload',
  authenticate,
  authorize('ADMIN'),
  upload.single('file'),
  auditLog('SYSTEM_TEMPLATE_UPLOAD', 'SystemTemplate'),
  controller.upload
)

router.post(
  '/:key/rollback',
  authenticate,
  authorize('ADMIN'),
  auditLog('SYSTEM_TEMPLATE_ROLLBACK', 'SystemTemplate'),
  controller.rollback
)

router.post(
  '/:key/archive',
  authenticate,
  authorize('ADMIN'),
  auditLog('SYSTEM_TEMPLATE_ARCHIVE', 'SystemTemplate'),
  controller.archive
)

export default router
