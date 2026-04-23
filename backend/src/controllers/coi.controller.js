/**
 * EthicFlow — Conflict of Interest Controller
 * CRUD and checking endpoints for user COI declarations.
 */

import prisma from '../config/database.js'
import { AppError } from '../utils/errors.js'
import { hasConflict } from '../services/coi.service.js'

/**
 * GET /api/coi
 * Lists the authenticated user's active COI declarations.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function listMine(req, res, next) {
  try {
    const data = await prisma.conflictDeclaration.findMany({
      where: { declarerId: req.user.id, isActive: true },
      orderBy: { declaredAt: 'desc' },
    })
    res.json({ data })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/coi
 * Creates a COI declaration for the authenticated user.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function create(req, res, next) {
  try {
    const { scope, targetSubmissionId, targetUserId, targetDepartment, reason } = req.body
    if (!reason?.trim()) throw new AppError('Reason is required', 'VALIDATION_ERROR', 400)

    if (scope === 'SUBMISSION' && !targetSubmissionId) {
      throw new AppError('targetSubmissionId is required for SUBMISSION scope', 'VALIDATION_ERROR', 400)
    }
    if (scope === 'USER' && !targetUserId) {
      throw new AppError('targetUserId is required for USER scope', 'VALIDATION_ERROR', 400)
    }
    if (scope === 'DEPARTMENT' && !targetDepartment?.trim()) {
      throw new AppError('targetDepartment is required for DEPARTMENT scope', 'VALIDATION_ERROR', 400)
    }

    const declaration = await prisma.conflictDeclaration.create({
      data: {
        declarerId: req.user.id,
        scope,
        targetSubmissionId: targetSubmissionId || null,
        targetUserId: targetUserId || null,
        targetDepartment: targetDepartment?.trim() || null,
        reason: reason.trim(),
      },
    })

    res.locals.entityId = declaration.id
    res.status(201).json({ data: declaration })
  } catch (err) {
    next(err)
  }
}

/**
 * DELETE /api/coi/:id
 * Soft-deactivates one of the user's declarations.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function remove(req, res, next) {
  try {
    const declaration = await prisma.conflictDeclaration.findUnique({ where: { id: req.params.id } })
    if (!declaration || !declaration.isActive) throw AppError.notFound('ConflictDeclaration')
    if (declaration.declarerId !== req.user.id) return next(AppError.forbidden())

    await prisma.conflictDeclaration.update({
      where: { id: req.params.id },
      data: { isActive: false },
    })
    res.locals.entityId = req.params.id
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/coi/check?reviewerId=...&submissionId=...
 * Returns conflict details for reviewer-assignment UI.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function check(req, res, next) {
  try {
    const reviewerId = String(req.query.reviewerId || '')
    const submissionId = String(req.query.submissionId || '')
    if (!reviewerId || !submissionId) {
      throw new AppError('reviewerId and submissionId are required', 'VALIDATION_ERROR', 400)
    }
    const result = await hasConflict(reviewerId, submissionId)
    res.json({ data: result })
  } catch (err) {
    next(err)
  }
}
