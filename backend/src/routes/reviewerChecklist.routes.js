/**
 * reviewerChecklist.routes.js
 * Admin router: /api/reviewer-checklist — template/section/item management.
 * Reviewer routes are added directly to the submissions router (see index.js).
 */

import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { authorize } from '../middleware/role.js'
import * as ctrl from '../controllers/reviewerChecklist.controller.js'

const router = Router()

const ADMIN_ONLY = authorize('ADMIN')
const READ_ROLES = authorize('ADMIN', 'SECRETARY')

// ─── Templates ────────────────────────────────────────────────────────────────
router.get('/templates', authenticate, READ_ROLES, ctrl.listTemplates)
router.get('/templates/:id', authenticate, READ_ROLES, ctrl.getTemplate)
router.post('/templates', authenticate, ADMIN_ONLY, ctrl.createTemplate)
router.put('/templates/:id', authenticate, ADMIN_ONLY, ctrl.updateTemplate)
router.post('/templates/:id/publish', authenticate, ADMIN_ONLY, ctrl.publishTemplate)
router.post('/templates/:id/clone', authenticate, ADMIN_ONLY, ctrl.cloneTemplate)

// ─── Sections ─────────────────────────────────────────────────────────────────
router.post('/templates/:id/sections', authenticate, ADMIN_ONLY, ctrl.createSection)
router.put('/sections/:sectionId', authenticate, ADMIN_ONLY, ctrl.updateSection)
router.delete('/sections/:sectionId', authenticate, ADMIN_ONLY, ctrl.deleteSection)

// ─── Items ────────────────────────────────────────────────────────────────────
router.patch('/items/reorder', authenticate, ADMIN_ONLY, ctrl.reorderItems)
router.post('/sections/:sectionId/items', authenticate, ADMIN_ONLY, ctrl.createItem)
router.put('/items/:itemId', authenticate, ADMIN_ONLY, ctrl.updateItem)
router.delete('/items/:itemId', authenticate, ADMIN_ONLY, ctrl.deactivateItem)

export default router
