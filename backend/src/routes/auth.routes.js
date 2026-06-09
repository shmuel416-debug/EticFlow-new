/**
 * Ethic-Net — Auth Routes
 * POST /api/auth/login                 — authenticate + get JWT
 * GET  /api/auth/me                    — get current user (protected)
 * POST /api/auth/change-password       — rotate password for authenticated user
 * POST /api/auth/exchange-code         — exchange one-time SSO code for JWT
 * GET  /api/auth/microsoft             — redirect to Microsoft login (SSO)
 * GET  /api/auth/microsoft/callback    — handle Microsoft OAuth2 callback
 */

import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../middleware/validate.js'
import { authenticate } from '../middleware/auth.js'
import { auditLog } from '../middleware/audit.js'
import { loginLimiter } from '../middleware/rateLimit.js'
import * as controller from '../controllers/auth.controller.js'

const router = Router()

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword:     z.string().min(8, 'Password must be at least 8 characters'),
})

const exchangeCodeSchema = z.object({
  code: z.string().regex(/^[a-f0-9]{64}$/i, 'Invalid exchange code format'),
})

const refreshSchema = z.object({
  refreshToken: z.string().min(1).optional(),
})

router.post(
  '/login',
  loginLimiter,
  validate(loginSchema),
  auditLog('auth.login', 'User'),
  controller.login
)

router.get('/me', authenticate, controller.me)

router.post(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  auditLog('auth.change-password', 'User'),
  controller.changePassword
)

router.post(
  '/exchange-code',
  validate(exchangeCodeSchema),
  auditLog('auth.sso.exchange', 'User'),
  controller.exchangeCode
)

router.post(
  '/refresh',
  validate(refreshSchema),
  controller.refreshSession
)

router.post(
  '/sync-session',
  authenticate,
  auditLog('auth.sync-session', 'User'),
  controller.syncSession
)

router.post(
  '/logout',
  validate(refreshSchema),
  controller.logoutSession
)

// Microsoft SSO — no body validation needed (query params handled in controller)
router.get('/microsoft',          controller.microsoftRedirect)
router.get('/microsoft/callback', auditLog('auth.sso.microsoft', 'User'), controller.microsoftCallback)

export default router
