/**
 * EthicFlow — Auth Controller
 * Handles registration, login, Microsoft SSO, and current-user retrieval.
 * Never returns passwordHash in any response.
 */

import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import prisma from '../config/database.js'
import authConfig from '../config/auth.js'
import { AppError } from '../utils/errors.js'
import { sendEmail } from '../services/email/email.service.js'
import * as microsoftAuth from '../services/auth/microsoft.provider.js'
import * as googleAuth    from '../services/auth/google.provider.js'

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

/**
 * Pre-computed bcrypt hash (12 rounds) used for constant-time comparison
 * when the user does not exist. Prevents timing-based email enumeration.
 * Value: bcrypt('EthicFlowDummy2026!', 12)
 */
const DUMMY_BCRYPT_HASH = '$2b$12$Z8nII1EDprDhFMZYH2.BVOhjlIjGBtStf/OgyisITv/gZJaXF6Y8y'
const DEFAULT_AUTH_EXCHANGE_TTL_MS = 90 * 1000

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/**
 * Signs a JWT token for a user.
 * @param {{ id: string, email: string, role: string }} user
 * @returns {string} Signed JWT
 */
function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    authConfig.jwt.secret,
    { expiresIn: authConfig.jwt.expiresIn }
  )
}

/**
 * Hashes a raw token with SHA-256 for safe DB storage.
 * @param {string} rawToken
 * @returns {string} Hex digest
 */
function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex')
}

/**
 * Issues a short-lived one-time auth exchange code for SSO handoff.
 * Stores only the SHA-256 hash in DB to avoid exposing bearer material.
 * @param {string} userId
 * @returns {Promise<string>} Raw one-time code for redirect URL
 */
async function issueAuthExchangeCode(userId) {
  const rawCode = crypto.randomBytes(32).toString('hex')
  const codeHash = hashToken(rawCode)
  const parsedTtl = parseInt(process.env.AUTH_EXCHANGE_TTL_MS ?? String(DEFAULT_AUTH_EXCHANGE_TTL_MS), 10)
  const ttlMs = Number.isFinite(parsedTtl) ? Math.max(30_000, parsedTtl) : DEFAULT_AUTH_EXCHANGE_TTL_MS

  await prisma.authExchangeCode.create({
    data: {
      codeHash,
      userId,
      expiresAt: new Date(Date.now() + ttlMs),
    },
  })

  return rawCode
}

/**
 * Strips sensitive fields from a user record.
 * @param {object} user - Prisma User record
 * @returns {{ id, email, fullName, role, department, phone, createdAt }}
 */
function safeUser(user) {
  const { passwordHash, resetToken, resetTokenExpiry, externalId, ...safe } = user
  return safe
}

/**
 * Resolves frontend base URL for auth redirects.
 * Production: FRONTEND_URL is mandatory (strict allowlist target).
 * Development: FRONTEND_URL env → Origin header → localhost fallback.
 * @param {import('express').Request} req
 * @returns {string}
 */
function resolveFrontendUrl(req) {
  const fromEnv = process.env.FRONTEND_URL?.trim()
  const normalizedEnv = fromEnv ? fromEnv.replace(/\/$/, '') : null
  const isProd = process.env.NODE_ENV === 'production'

  if (isProd) {
    if (!normalizedEnv) {
      throw new Error('FRONTEND_URL must be configured in production')
    }
    return normalizedEnv
  }

  if (normalizedEnv) return normalizedEnv

  const origin = req.get('origin')
  if (origin) return origin.replace(/\/$/, '')

  return 'http://localhost:5173'
}

/**
 * Returns a safe frontend fallback URL for catch blocks.
 * Never trusts request-origin in failure paths.
 * @returns {string}
 */
function safeFrontendFallbackUrl() {
  return process.env.FRONTEND_URL?.trim()?.replace(/\/$/, '') || 'http://localhost:5173'
}

// ─────────────────────────────────────────────
// CONTROLLERS
// ─────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Creates a new user account (defaults to RESEARCHER role).
 * @param {import('express').Request} req - body: { email, password, fullName, department?, phone? }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function register(req, res, next) {
  try {
    const { email, password, fullName, department, phone } = req.body

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return next(AppError.conflict('email'))

    const passwordHash = await bcrypt.hash(password, authConfig.bcryptRounds)

    const user = await prisma.user.create({
      data: { email, passwordHash, fullName, department, phone, role: 'RESEARCHER' },
    })

    res.locals.entityId = user.id
    res.status(201).json({ user: safeUser(user), token: signToken(user) })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/auth/login
 * Authenticates a user and returns a JWT.
 * Uses identical error message for missing user + wrong password (no user enumeration).
 * @param {import('express').Request} req - body: { email, password }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function login(req, res, next) {
  try {
    const { email, password } = req.body

    const user = await prisma.user.findUnique({ where: { email } })

    // Always run bcrypt — prevents timing-based email enumeration (constant-time)
    const validPassword = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_BCRYPT_HASH)

    if (!user || !validPassword || !user.isActive) {
      return next(new AppError('Invalid email or password', 'INVALID_CREDENTIALS', 401))
    }

    res.locals.entityId = user.id
    res.json({ user: safeUser(user), token: signToken(user) })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/auth/exchange-code
 * Exchanges a short-lived one-time SSO code for a JWT.
 * @param {import('express').Request} req - body: { code }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function exchangeCode(req, res, next) {
  try {
    const { code } = req.body
    const codeHash = hashToken(code)
    const now = new Date()

    const record = await prisma.authExchangeCode.findUnique({
      where: { codeHash },
      include: { user: true },
    })

    if (!record || !record.isActive || record.usedAt || record.expiresAt <= now) {
      return next(new AppError('Invalid or expired exchange code', 'INVALID_EXCHANGE_CODE', 401))
    }

    const consumeResult = await prisma.authExchangeCode.updateMany({
      where: {
        id:       record.id,
        isActive: true,
        usedAt:   null,
        expiresAt: { gt: now },
      },
      data: { usedAt: now },
    })

    if (consumeResult.count !== 1) {
      return next(new AppError('Invalid or expired exchange code', 'INVALID_EXCHANGE_CODE', 401))
    }

    if (!record.user || !record.user.isActive) {
      return next(new AppError('Invalid exchange code user', 'INVALID_EXCHANGE_CODE', 401))
    }

    res.locals.entityId = record.user.id
    res.json({ user: safeUser(record.user), token: signToken(record.user) })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/auth/me
 * Returns the authenticated user's profile.
 * Requires authenticate middleware to run first (sets req.user).
 * @param {import('express').Request} req - req.user: { id, email, role }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function me(req, res, next) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } })
    if (!user || !user.isActive) return next(AppError.notFound('User'))
    res.json({ user: safeUser(user) })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/auth/forgot-password
 * Generates a reset token and emails the link. Always returns 200 (no user enumeration).
 * @param {import('express').Request} req - body: { email }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body
    const user = await prisma.user.findUnique({ where: { email } })

    if (user && user.isActive) {
      const rawToken   = crypto.randomBytes(32).toString('hex')
      const tokenHash  = hashToken(rawToken)
      const expiry     = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

      await prisma.user.update({
        where: { id: user.id },
        data:  { resetToken: tokenHash, resetTokenExpiry: expiry },
      })

      const resetUrl = `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/reset-password?token=${rawToken}`
      await sendEmail({
        to:      email,
        subject: 'איפוס סיסמה — EthicFlow',
        html:    `<p>לחץ על הקישור לאיפוס הסיסמה (תוקף שעה אחת):</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
      })
    }

    // Always 200 — never reveal if email exists
    res.json({ message: 'If that email exists, a reset link has been sent.' })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/auth/reset-password
 * Validates the reset token and updates the password.
 * @param {import('express').Request} req - body: { token, password }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body
    const tokenHash = hashToken(token)

    const user = await prisma.user.findFirst({
      where: {
        resetToken:       tokenHash,
        resetTokenExpiry: { gt: new Date() },
        isActive:         true,
      },
    })

    if (!user) {
      return next(new AppError('Invalid or expired reset token', 'INVALID_TOKEN', 400))
    }

    const passwordHash = await bcrypt.hash(password, authConfig.bcryptRounds)
    await prisma.user.update({
      where: { id: user.id },
      data:  { passwordHash, resetToken: null, resetTokenExpiry: null },
    })

    res.locals.entityId = user.id
    res.json({ message: 'Password reset successful' })
  } catch (err) {
    next(err)
  }
}

// ─────────────────────────────────────────────
// MICROSOFT SSO HELPERS
// ─────────────────────────────────────────────

/**
 * Finds an existing user by Microsoft externalId or email, or creates a new one.
 * Returns null if there is an email conflict with a LOCAL account.
 * @param {{ externalId: string, email: string, fullName: string }} profile - Microsoft profile
 * @returns {Promise<{ user: object|null, conflict: boolean }>}
 */
async function findOrCreateMicrosoftUser({ externalId, email, fullName }) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ externalId }, { email }] },
  })

  if (existing) {
    if (existing.authProvider === 'LOCAL') return { user: null, conflict: true }
    // Update display name if it changed
    const user = existing.fullName !== fullName
      ? await prisma.user.update({ where: { id: existing.id }, data: { fullName, externalId } })
      : existing
    return { user, conflict: false }
  }

  // First-time SSO — create as RESEARCHER
  const user = await prisma.user.create({
    data: { email, fullName, externalId, authProvider: 'MICROSOFT', role: 'RESEARCHER', isActive: true, passwordHash: null },
  })
  return { user, conflict: false }
}

// ─────────────────────────────────────────────
// MICROSOFT SSO
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// GOOGLE SSO HELPERS
// ─────────────────────────────────────────────

/**
 * Finds an existing user by Google externalId or email, or creates a new one.
 * Returns null if there is an email conflict with a LOCAL or MICROSOFT account.
 * @param {{ externalId: string, email: string, fullName: string }} profile - Google profile
 * @returns {Promise<{ user: object|null, conflict: boolean }>}
 */
async function findOrCreateGoogleUser({ externalId, email, fullName }) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ externalId }, { email }] },
  })

  if (existing) {
    if (existing.authProvider !== 'GOOGLE') return { user: null, conflict: true }
    const user = existing.fullName !== fullName
      ? await prisma.user.update({ where: { id: existing.id }, data: { fullName, externalId } })
      : existing
    return { user, conflict: false }
  }

  const user = await prisma.user.create({
    data: { email, fullName, externalId, authProvider: 'GOOGLE', role: 'RESEARCHER', isActive: true, passwordHash: null },
  })
  return { user, conflict: false }
}

// ─────────────────────────────────────────────
// GOOGLE SSO
// ─────────────────────────────────────────────

/**
 * GET /api/auth/google
 * Generates a Google OAuth2 login URL and redirects the user.
 * Stores a CSRF-prevention state token in a short-lived httpOnly cookie.
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function googleRedirect(req, res, next) {
  try {
    const state   = crypto.randomBytes(16).toString('hex')
    const authUrl = googleAuth.getAuthUrl(state)

    res.cookie('g_oauth_state', state, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   60 * 1000,
    })

    res.redirect(authUrl)
  } catch (err) {
    console.error('[Auth/Google] redirect error:', err.message)
    const frontendUrl = safeFrontendFallbackUrl()
    res.redirect(`${frontendUrl}/login?error=sso_failed`)
  }
}

/**
 * GET /api/auth/google/callback
 * Handles the Google OAuth2 callback, exchanges the code for a profile,
 * creates or retrieves the user, then redirects to frontend with a JWT.
 * @param {import('express').Request}  req - query: { code, state, error? }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function googleCallback(req, res, next) {
  const frontendUrl = resolveFrontendUrl(req)

  try {
    const { code, state, error } = req.query

    if (error) {
      return res.redirect(`${frontendUrl}/login?error=sso_cancelled`)
    }

    const savedState = req.cookies?.g_oauth_state
    res.clearCookie('g_oauth_state')

    if (!savedState || savedState !== state) {
      return res.redirect(`${frontendUrl}/login?error=sso_state_mismatch`)
    }

    const profile = await googleAuth.exchangeCode(code)
    if (!profile.email) {
      return res.redirect(`${frontendUrl}/login?error=sso_no_email`)
    }

    const { user, conflict } = await findOrCreateGoogleUser(profile)
    if (conflict) return res.redirect(`${frontendUrl}/login?error=sso_email_conflict`)
    if (!user || !user.isActive) return res.redirect(`${frontendUrl}/login?error=account_inactive`)

    res.locals.entityId = user.id
    const exchangeCode = await issueAuthExchangeCode(user.id)
    res.redirect(`${frontendUrl}/sso-callback?code=${exchangeCode}`)
  } catch (err) {
    console.error('[Auth/Google] callback error:', err.message)
    const fallbackUrl = safeFrontendFallbackUrl()
    res.redirect(`${fallbackUrl}/login?error=sso_failed`)
  }
}

/**
 * GET /api/auth/microsoft
 * Generates a Microsoft OAuth2 login URL and redirects the user.
 * Stores a CSRF-prevention state token in a short-lived signed cookie.
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function microsoftRedirect(req, res, next) {
  try {
    const state   = crypto.randomBytes(16).toString('hex')
    const authUrl = await microsoftAuth.getAuthUrl(state)

    // Store state in signed httpOnly cookie (1 min TTL)
    res.cookie('ms_oauth_state', state, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   60 * 1000,
    })

    res.redirect(authUrl)
  } catch (err) {
    console.error('[Auth/Microsoft] redirect error:', err.message)
    const frontendUrl = safeFrontendFallbackUrl()
    res.redirect(`${frontendUrl}/login?error=sso_failed`)
  }
}

/**
 * GET /api/auth/microsoft/callback
 * Handles the Microsoft OAuth2 callback, exchanges the code for a profile,
 * and creates or retrieves the user, then redirects to frontend with a JWT.
 * @param {import('express').Request}  req - query: { code, state, error? }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function microsoftCallback(req, res, next) {
  const frontendUrl = resolveFrontendUrl(req)

  try {
    const { code, state, error } = req.query

    // Microsoft returned an error (e.g. user cancelled)
    if (error) {
      return res.redirect(`${frontendUrl}/login?error=sso_cancelled`)
    }

    // Validate CSRF state
    const savedState = req.cookies?.ms_oauth_state
    res.clearCookie('ms_oauth_state')

    if (!savedState || savedState !== state) {
      return res.redirect(`${frontendUrl}/login?error=sso_state_mismatch`)
    }

    // Exchange code for profile
    const profile = await microsoftAuth.exchangeCode(code, state)
    if (!profile.email) {
      return res.redirect(`${frontendUrl}/login?error=sso_no_email`)
    }

    // Find or create user
    const { user, conflict } = await findOrCreateMicrosoftUser(profile)
    if (conflict) return res.redirect(`${frontendUrl}/login?error=sso_email_conflict`)
    if (!user || !user.isActive) return res.redirect(`${frontendUrl}/login?error=account_inactive`)

    res.locals.entityId = user.id
    const exchangeCode = await issueAuthExchangeCode(user.id)

    // Redirect with one-time code only (never include JWT in URL)
    res.redirect(`${frontendUrl}/sso-callback?code=${exchangeCode}`)
  } catch (err) {
    console.error('[Auth/Microsoft] callback error:', err.message)
    const fallbackUrl = safeFrontendFallbackUrl()
    res.redirect(`${fallbackUrl}/login?error=sso_failed`)
  }
}
