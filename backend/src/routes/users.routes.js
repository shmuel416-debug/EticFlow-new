/**
 * EthicFlow — Users Routes
 * GET /api/users/reviewers — list active reviewers (SECRETARY, CHAIRMAN, ADMIN)
 */

import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { authorize } from '../middleware/role.js'
import * as controller from '../controllers/users.controller.js'

const router = Router()

router.get(
  '/reviewers',
  authenticate,
  authorize('SECRETARY', 'CHAIRMAN', 'ADMIN'),
  controller.listReviewers
)

export default router
