/**
 * EthicFlow — Auth Routes
 * POST /api/auth/register        — create account
 * POST /api/auth/login           — authenticate + get JWT
 * GET  /api/auth/me              — get current user (protected)
 * POST /api/auth/forgot-password — send reset email
 * POST /api/auth/reset-password  — apply new password via token
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

const forgotSchema = z.object({
  email: z.string().email(),
})

const resetSchema = z.object({
  token:    z.string().min(1),
  password: z.string().min(8, 'Password must be at least 8 characters'),
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

router.post(
  '/forgot-password',
  validate(forgotSchema),
  controller.forgotPassword
)

router.post(
  '/reset-password',
  validate(resetSchema),
  controller.resetPassword,
  auditLog('auth.reset-password', 'User')
)

export default router
