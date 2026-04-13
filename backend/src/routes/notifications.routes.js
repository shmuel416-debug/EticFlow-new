/**
 * EthicFlow — Notifications Routes
 * GET    /api/notifications              — list user notifications (paginated)
 * PATCH  /api/notifications/read-all    — mark all as read
 * PATCH  /api/notifications/:id/read    — mark single as read
 */

import { Router } from 'express'
import { z } from 'zod'
import { validateQuery } from '../middleware/validate.js'
import { authenticate } from '../middleware/auth.js'
import * as controller from '../controllers/notifications.controller.js'

const router = Router()

const listQuerySchema = z.object({
  page:       z.string().regex(/^\d+$/).optional(),
  limit:      z.string().regex(/^\d+$/).optional(),
  unreadOnly: z.enum(['true', 'false']).optional(),
})

router.get(
  '/',
  authenticate,
  validateQuery(listQuerySchema),
  controller.list
)

router.patch(
  '/read-all',
  authenticate,
  controller.markAllRead
)

router.patch(
  '/:id/read',
  authenticate,
  controller.markRead
)

export default router
