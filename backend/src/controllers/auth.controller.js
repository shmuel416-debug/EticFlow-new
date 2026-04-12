/**
 * EthicFlow — Auth Controller
 * Handles registration, login, and current-user retrieval.
 * Never returns passwordHash in any response.
 */

import bcrypt from 'bcrypt'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import prisma from '../config/database.js'
import authConfig from '../config/auth.js'
import { AppError } from '../utils/errors.js'
import { sendEmail } from '../services/email/email.service.js'

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

/**
 * Pre-computed bcrypt hash (12 rounds) used for constant-time comparison
 * when the user does not exist. Prevents timing-based email enumeration.
 * Value: bcrypt('EthicFlowDummy2026!', 12)
 */
const DUMMY_BCRYPT_HASH = '$2b$12$Z8nII1EDprDhFMZYH2.BVOhjlIjGBtStf/OgyisITv/gZJaXF6Y8y'

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
 * Strips sensitive fields from a user record.
 * @param {object} user - Prisma User record
 * @returns {{ id, email, fullName, role, department, phone, createdAt }}
 */
function safeUser(user) {
  const { passwordHash, resetToken, resetTokenExpiry, externalId, ...safe } = user
  return safe
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

    res.json({ message: 'Password reset successful' })
  } catch (err) {
    next(err)
  }
}
