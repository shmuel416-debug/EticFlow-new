/**
 * EthicFlow — Auth Controller
 * Handles registration, login, and current-user retrieval.
 * Never returns passwordHash in any response.
 */

import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import prisma from '../config/database.js'
import authConfig from '../config/auth.js'
import { AppError } from '../utils/errors.js'

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
    const validPassword = user
      ? await bcrypt.compare(password, user.passwordHash ?? '')
      : false

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
