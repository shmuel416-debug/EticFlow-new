/**
 * EthicFlow — Documents Routes
 * POST   /api/documents/submissions/:subId        — upload file(s)    (RESEARCHER, SECRETARY, ADMIN)
 * GET    /api/documents/submissions/:subId        — list documents     (all authenticated)
 * GET    /api/documents/:id/download              — download file      (all authenticated)
 * DELETE /api/documents/:id                       — soft-delete        (RESEARCHER, SECRETARY, ADMIN)
 */

import { Router }   from 'express'
import multer       from 'multer'
import { authenticate } from '../middleware/auth.js'
import { authorize }    from '../middleware/role.js'
import { auditLog }     from '../middleware/audit.js'
import * as controller  from '../controllers/documents.controller.js'

const router = Router()

/** Multer: memory storage, max 20 MB per file, max 10 files per request. */
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 20 * 1024 * 1024, files: 10 },
})

// ─────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────

router.post(
  '/submissions/:subId',
  authenticate,
  authorize('RESEARCHER', 'SECRETARY', 'ADMIN'),
  upload.array('files', 10),
  controller.upload,
  auditLog('document.upload', 'Document')
)

router.get(
  '/submissions/:subId',
  authenticate,
  controller.list
)

router.get(
  '/:id/download',
  authenticate,
  controller.download
)

router.delete(
  '/:id',
  authenticate,
  authorize('RESEARCHER', 'SECRETARY', 'ADMIN'),
  controller.remove,
  auditLog('document.delete', 'Document')
)

export default router
