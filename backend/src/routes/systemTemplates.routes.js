/**
 * System Templates Routes
 * Endpoints for downloading and managing system templates
 */

import express from 'express';
import multer from 'multer';
import * as systemTemplatesController from '../controllers/systemTemplates.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/role.js';
import { auditLog } from '../middleware/audit.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

/**
 * PUBLIC ROUTES (authenticated users only)
 */

/**
 * GET /api/system-templates/:key/active
 * Retrieve metadata for an active template
 * Query: ?lang=he
 */
router.get(
  '/:key/active',
  authenticate,
  systemTemplatesController.getActive
);

/**
 * GET /api/system-templates/:key/download
 * Download a template file
 * Query: ?lang=he
 */
router.get(
  '/:key/download',
  authenticate,
  systemTemplatesController.download
);

/**
 * ADMIN ROUTES
 */

/**
 * GET /api/admin/system-templates
 * List all templates (admin view)
 */
router.get(
  '/admin/all',
  authenticate,
  authorize('ADMIN'),
  systemTemplatesController.listAll
);

/**
 * GET /api/admin/system-templates/:key/versions
 * List all versions of a template
 */
router.get(
  '/admin/:key/versions',
  authenticate,
  authorize('ADMIN'),
  systemTemplatesController.listVersions
);

/**
 * POST /api/admin/system-templates/:key/upload
 * Upload a new version
 */
router.post(
  '/admin/:key/upload',
  authenticate,
  authorize('ADMIN'),
  upload.single('file'),
  auditLog('SYSTEM_TEMPLATE_UPLOAD', 'SystemTemplate'),
  systemTemplatesController.upload
);

/**
 * POST /api/admin/system-templates/:key/rollback
 * Restore a previous version
 */
router.post(
  '/admin/:key/rollback',
  authenticate,
  authorize('ADMIN'),
  auditLog('SYSTEM_TEMPLATE_ROLLBACK', 'SystemTemplate'),
  systemTemplatesController.rollback
);

/**
 * POST /api/admin/system-templates/:key/archive
 * Archive a template
 */
router.post(
  '/admin/:key/archive',
  authenticate,
  authorize('ADMIN'),
  auditLog('SYSTEM_TEMPLATE_ARCHIVE', 'SystemTemplate'),
  systemTemplatesController.archive
);

export default router;
