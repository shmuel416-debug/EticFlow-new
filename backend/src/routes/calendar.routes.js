/**
 * EthicFlow — Personal Calendar Routes
 *
 * GET    /api/calendar/status              — current user calendar connection status
 * PATCH  /api/calendar/preferences         — toggle personal sync preference
 * DELETE /api/calendar/disconnect          — disconnect personal calendar
 * GET    /api/calendar/connect/:provider   — begin OAuth (google|microsoft)
 * GET    /api/calendar/callback/:provider  — OAuth callback
 */

import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import * as controller from '../controllers/calendar.controller.js'

const router = Router()

const preferencesSchema = z.object({
  syncEnabled: z.boolean(),
})

router.get('/status', authenticate, controller.status)

router.patch(
  '/preferences',
  authenticate,
  validate(preferencesSchema),
  controller.updatePreferences
)

router.delete('/disconnect', authenticate, controller.disconnect)

router.get('/connect/:provider', authenticate, controller.connect)
router.get('/callback/:provider', controller.callback)

export default router
