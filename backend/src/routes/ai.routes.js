/**
 * EthicFlow — AI Routes
 * POST /api/ai/analyze/:subId  — run AI analysis on a submission
 * GET  /api/ai/analyze/:subId  — fetch latest saved analysis
 *
 * Advisory only — never blocks or auto-decides.
 */

import { Router }    from 'express'
import { authenticate } from '../middleware/auth.js'
import { auditLog }     from '../middleware/audit.js'
import { aiAnalysisLimiter } from '../middleware/rateLimit.js'
import * as controller  from '../controllers/ai.controller.js'

const router = Router()

router.post(
  '/analyze/:subId',
  authenticate,
  aiAnalysisLimiter,
  auditLog('ai.analysis_requested', 'AIAnalysis'),
  controller.runAnalysis
)

router.get(
  '/analyze/:subId',
  authenticate,
  controller.getLatest
)

export default router
