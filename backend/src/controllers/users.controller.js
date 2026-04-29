/**
 * EthicFlow — Users Controller
 * Handles user management (Admin) and reviewer listing (Secretary).
 *
 * Endpoints:
 *   GET  /api/users/reviewers          — list reviewers (SECRETARY, CHAIRMAN, ADMIN)
 *   GET  /api/users/researchers        — list researcher candidates for COI (committee)
 *   GET  /api/admin/users              — list all users (ADMIN)
 *   POST /api/admin/users              — create user (ADMIN)
 *   PUT  /api/admin/users/:id          — update user (ADMIN)
 *   PATCH /api/admin/users/:id/deactivate — soft-delete (ADMIN)
 *   POST /api/admin/impersonate/:userId — issue impersonation JWT (ADMIN)
 */

import bcrypt from 'bcryptjs'
import jwt    from 'jsonwebtoken'
import prisma      from '../config/database.js'
import authConfig  from '../config/auth.js'
import { AppError } from '../utils/errors.js'
import { COMMITTEE_ROLES } from '../constants/roles.js'
import { getPrimaryRole, hasRole } from '../utils/roles.js'
import { mapReviewerConflicts } from '../services/coi.service.js'

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/**
 * Strips sensitive fields from a user record before returning to client.
 * @param {object} user - Prisma user object
 * @returns {object} Safe user object
 */
function safeUser(user) {
  const { passwordHash, resetToken, resetTokenExpiry, ...safe } = user
  return safe
}

/**
 * Ensures a role array always includes RESEARCHER and has unique values.
 * @param {string[]|undefined} roles
 * @returns {string[]}
 */
function normalizeRoles(roles) {
  const deduped = [...new Set((roles ?? []).filter(Boolean))]
  if (!deduped.includes('RESEARCHER')) deduped.push('RESEARCHER')
  return deduped
}

// ─────────────────────────────────────────────
// REVIEWER LIST (Secretary dropdown)
// ─────────────────────────────────────────────

/**
 * GET /api/users/reviewers
 * Returns active users eligible for reviewer assignment.
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function listReviewers(req, res, next) {
  try {
    const reviewers = await prisma.user.findMany({
      where:   { roles: { hasSome: ['REVIEWER', 'CHAIRMAN'] }, isActive: true },
      select:  { id: true, fullName: true, email: true, department: true, roles: true },
      orderBy: { fullName: 'asc' },
    })
    const submissionId = typeof req.query.submissionId === 'string' ? req.query.submissionId : ''
    const data = submissionId
      ? await mapReviewerConflicts(reviewers, submissionId)
      : reviewers.map((reviewer) => ({ ...reviewer, hasConflict: false, conflictReasons: [] }))
    res.json({ data })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/users/signers
 * Returns active committee members that can be selected as protocol signers.
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function listSigners(req, res, next) {
  try {
    const signers = await prisma.user.findMany({
      where: {
        isActive: true,
        roles: { hasSome: COMMITTEE_ROLES },
      },
      select: { id: true, fullName: true, email: true, roles: true },
      orderBy: { fullName: 'asc' },
    })

    res.json({ data: signers })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/users/researchers
 * Returns active non-committee researchers for COI USER-scope selection.
 * @param {import('express').Request} req - query: { search?, limit? }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function listResearchers(req, res, next) {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''
    const limitRaw = Number.parseInt(String(req.query.limit ?? '20'), 10)
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 20
    const where = {
      isActive: true,
      NOT: { roles: { hasSome: COMMITTEE_ROLES } },
    }
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }
    const data = await prisma.user.findMany({
      where,
      select: { id: true, fullName: true, email: true, department: true },
      orderBy: { fullName: 'asc' },
      take: limit,
    })
    res.json({ data })
  } catch (err) {
    next(err)
  }
}

// ─────────────────────────────────────────────
// ADMIN — LIST ALL USERS
// ─────────────────────────────────────────────

/**
 * GET /api/admin/users
 * Returns all users with optional search and role filter.
 * @param {import('express').Request}  req - query: { search, role, status, page, limit }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function listAll(req, res, next) {
  try {
    const { search, role, status, page = '1', limit = '20' } = req.query

    const skip = (parseInt(page) - 1) * parseInt(limit)
    const take = parseInt(limit)

    const where = {}
    if (search) {
      where.OR = [
        { fullName:   { contains: search, mode: 'insensitive' } },
        { email:      { contains: search, mode: 'insensitive' } },
        { department: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (role) {
      const rolesFilter = String(role).split(',').map((item) => item.trim()).filter(Boolean)
      where.roles = rolesFilter.length > 1 ? { hasSome: rolesFilter } : { has: rolesFilter[0] }
    }
    if (status === 'active')    where.isActive = true
    if (status === 'inactive')  where.isActive = false

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, fullName: true, email: true, roles: true,
          department: true, phone: true, authProvider: true,
          isActive: true, createdAt: true, updatedAt: true,
        },
      }),
      prisma.user.count({ where }),
    ])

    res.json({
      data:       users,
      pagination: { total, page: parseInt(page), limit: take, pages: Math.ceil(total / take) },
    })
  } catch (err) {
    next(err)
  }
}

// ─────────────────────────────────────────────
// ADMIN — CREATE USER
// ─────────────────────────────────────────────

/**
 * POST /api/admin/users
 * Creates a new user. Hashes password if provided (LOCAL auth).
 * @param {import('express').Request}  req - body: { email, fullName, role, department?, phone?, password? }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function create(req, res, next) {
  try {
    const { email, fullName, roles = ['RESEARCHER'], department, phone, password } = req.body
    const normalizedRoles = normalizeRoles(roles)

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      throw new AppError('Email already in use', 'EMAIL_CONFLICT', 409)
    }

    const passwordHash = password
      ? await bcrypt.hash(password, authConfig.bcryptRounds)
      : null

    const user = await prisma.user.create({
      data: { email, fullName, roles: normalizedRoles, department, phone, passwordHash, authProvider: 'LOCAL' },
    })

    res.locals.entityId = user.id
    res.status(201).json({ data: safeUser(user) })
  } catch (err) {
    next(err)
  }
}

// ─────────────────────────────────────────────
// ADMIN — UPDATE USER
// ─────────────────────────────────────────────

/**
 * PUT /api/admin/users/:id
 * Updates user profile fields (not password via this endpoint).
 * @param {import('express').Request}  req - params: { id }, body: { fullName?, role?, department?, phone? }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function update(req, res, next) {
  try {
    const { id } = req.params
    const { fullName, roles, department, phone } = req.body
    const normalizedRoles = roles ? normalizeRoles(roles) : undefined

    const user = await prisma.user.findUnique({ where: { id } })
    if (!user || !user.isActive) {
      throw new AppError('User not found', 'NOT_FOUND', 404)
    }

    const updated = await prisma.user.update({
      where: { id },
      data:  { fullName, roles: normalizedRoles, department, phone },
    })

    res.json({ data: safeUser(updated) })
  } catch (err) {
    next(err)
  }
}

// ─────────────────────────────────────────────
// ADMIN — DEACTIVATE USER
// ─────────────────────────────────────────────

/**
 * PATCH /api/admin/users/:id/deactivate
 * Soft-deletes a user (sets isActive=false). Cannot deactivate self.
 * @param {import('express').Request}  req - params: { id }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function deactivate(req, res, next) {
  try {
    const { id } = req.params

    if (req.user.id === id) {
      throw new AppError('Cannot deactivate your own account', 'SELF_DEACTIVATE', 400)
    }

    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) {
      throw new AppError('User not found', 'NOT_FOUND', 404)
    }

    await prisma.user.update({ where: { id }, data: { isActive: false } })

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

// ─────────────────────────────────────────────
// ADMIN — IMPERSONATE USER
// ─────────────────────────────────────────────

/**
 * POST /api/admin/impersonate/:userId
 * Issues a short-lived JWT for the target user, embedding the admin's ID.
 * Cannot impersonate another ADMIN. Cannot impersonate if already impersonating.
 * @param {import('express').Request}  req - params: { userId }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function impersonate(req, res, next) {
  try {
    // Block nested impersonation
    if (req.user.impersonatedBy) {
      throw new AppError('Already impersonating — stop current session first', 'NESTED_IMPERSONATION', 403)
    }

    const { userId } = req.params

    const target = await prisma.user.findUnique({ where: { id: userId } })
    if (!target || !target.isActive) {
      throw new AppError('User not found', 'NOT_FOUND', 404)
    }
    if (hasRole(target, 'ADMIN')) {
      throw new AppError('Cannot impersonate an Admin user', 'CANNOT_IMPERSONATE_ADMIN', 403)
    }

    const activeRole = getPrimaryRole(target)
    const token = jwt.sign(
      { id: target.id, email: target.email, roles: target.roles, activeRole, impersonatedBy: req.user.id },
      authConfig.jwt.secret,
      { expiresIn: '1h' },
    )

    const safeTarget = {
      id:         target.id,
      email:      target.email,
      fullName:   target.fullName,
      roles:      target.roles,
      activeRole,
      department: target.department,
    }

    res.locals.entityId = target.id
    res.json({ token, user: safeTarget })
  } catch (err) {
    next(err)
  }
}
