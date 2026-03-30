/**
 * EthicFlow — Auth Routes
 * POST /api/auth/register — create account
 * POST /api/auth/login    — authenticate + get JWT
 * GET  /api/auth/me       — get current user (protected)
 */

import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../middleware/validate.js'
import { authenticate } from '../middleware/auth.js'
import { auditLog } from '../middleware/audit.js'
import { loginLimiter } from '../middleware/rateLimit.js'
import * as controller from '../controllers/auth.controller.js'

const router = Router()

const registerSchema = z.object({
  email:      z.string().email(),
  password:   z.string().min(8, 'Password must be at least 8 characters'),
  fullName:   z.string().min(2, 'Full name must be at least 2 characters'),
  department: z.string().optional(),
  phone:      z.string().optional(),
})

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
})

router.post(
  '/register',
  validate(registerSchema),
  controller.register,
  auditLog('auth.register', 'User')
)

router.post(
  '/login',
  loginLimiter,
  validate(loginSchema),
  controller.login,
  auditLog('auth.login', 'User')
)

router.get('/me', authenticate, controller.me)

export default router
