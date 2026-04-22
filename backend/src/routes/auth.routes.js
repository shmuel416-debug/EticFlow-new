/**
 * EthicFlow — Auth Routes
 * POST /api/auth/register              — create account
 * POST /api/auth/login                 — authenticate + get JWT
 * GET  /api/auth/me                    — get current user (protected)
 * POST /api/auth/forgot-password       — send reset email
 * POST /api/auth/reset-password        — apply new password via token
 * POST /api/auth/exchange-code         — exchange one-time SSO code for JWT
 * GET  /api/auth/microsoft             — redirect to Microsoft login (SSO)
 * GET  /api/auth/microsoft/callback    — handle Microsoft OAuth2 callback
 * GET  /api/auth/google                — redirect to Google login (SSO)
 * GET  /api/auth/google/callback       — handle Google OAuth2 callback
 */

import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../middleware/validate.js'
import { authenticate } from '../middleware/auth.js'
import { auditLog } from '../middleware/audit.js'
import { loginLimiter, forgotPasswordLimiter, registerLimiter } from '../middleware/rateLimit.js'
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

const exchangeCodeSchema = z.object({
  code: z.string().regex(/^[a-f0-9]{64}$/i, 'Invalid exchange code format'),
})

router.post(
  '/register',
  registerLimiter,
  validate(registerSchema),
  auditLog('auth.register', 'User'),
  controller.register
)

router.post(
  '/login',
  loginLimiter,
  validate(loginSchema),
  auditLog('auth.login', 'User'),
  controller.login
)

router.get('/me', authenticate, controller.me)

router.post(
  '/forgot-password',
  forgotPasswordLimiter,
  validate(forgotSchema),
  controller.forgotPassword
)

router.post(
  '/reset-password',
  validate(resetSchema),
  auditLog('auth.reset-password', 'User'),
  controller.resetPassword
)

router.post(
  '/exchange-code',
  validate(exchangeCodeSchema),
  auditLog('auth.sso.exchange', 'User'),
  controller.exchangeCode
)

// Microsoft SSO — no body validation needed (query params handled in controller)
router.get('/microsoft',          controller.microsoftRedirect)
router.get('/microsoft/callback', auditLog('auth.sso.microsoft', 'User'), controller.microsoftCallback)

// Google SSO — no body validation needed (query params handled in controller)
router.get('/google',          controller.googleRedirect)
router.get('/google/callback', auditLog('auth.sso.google', 'User'), controller.googleCallback)

export default router
