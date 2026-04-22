/**
 * EthicFlow — Status Management Controller
 * Provides admin CRUD for submission statuses, transitions, and permissions.
 */

import prisma from '../config/database.js'
import { AppError } from '../utils/errors.js'
import {
  can,
  getAllowedTransitions,
  invalidateStatusCache,
  listStatuses,
} from '../services/status.service.js'

const SYSTEM_CODES = new Set(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'])

/**
 * Returns one active status by ID or throws 404.
 * @param {string} statusId
 * @returns {Promise<any>}
 */
async function findStatusOrFail(statusId) {
  const status = await prisma.submissionStatus.findFirst({
    where: { id: statusId, isActive: true },
  })
  if (!status) throw AppError.notFound('SubmissionStatus')
  return status
}

/**
 * Validates that exactly one status remains marked as initial.
 * @param {string} statusId
 * @param {boolean} nextIsInitial
 * @returns {Promise<void>}
 */
async function assertInitialInvariant(statusId, nextIsInitial) {
  const initialCount = await prisma.submissionStatus.count({
    where: { isActive: true, isInitial: true, ...(nextIsInitial ? {} : { NOT: { id: statusId } }) },
  })
  if (!nextIsInitial && initialCount === 0) {
    throw new AppError('At least one initial status is required', 'VALIDATION_ERROR', 400)
  }
}

/**
 * GET /api/statuses/config
 * Returns active statuses and role-aware transitions.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function getStatusConfig(req, res, next) {
  try {
    const statuses = await listStatuses()
    const transitionsByFromCode = {}

    for (const status of statuses) {
      const allowed = await getAllowedTransitions(status.code, req.user.role, null)
      transitionsByFromCode[status.code] = allowed.transitions
    }

    res.json({
      data: {
        statuses,
        transitionsByFromCode,
      },
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/admin/statuses
 * Returns statuses with transitions and permissions.
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function listAdminStatuses(_req, res, next) {
  try {
    const statuses = await prisma.submissionStatus.findMany({
      where: { isActive: true },
      orderBy: [{ orderIndex: 'asc' }, { code: 'asc' }],
      include: {
        transitionsFrom: {
          where: { isActive: true },
          include: { toStatus: { select: { id: true, code: true, labelHe: true, labelEn: true } } },
          orderBy: { createdAt: 'asc' },
        },
        permissions: {
          where: { isActive: true },
          orderBy: [{ role: 'asc' }, { action: 'asc' }],
        },
      },
    })

    res.json({ data: statuses })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/admin/statuses
 * Creates a new configurable status.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function createStatus(req, res, next) {
  try {
    const code = req.body.code.trim().toUpperCase()
    const exists = await prisma.submissionStatus.findFirst({ where: { code, isActive: true } })
    if (exists) throw new AppError('Status code already exists', 'VALIDATION_ERROR', 400)

    if (req.body.isInitial === true) {
      await prisma.submissionStatus.updateMany({
        where: { isActive: true, isInitial: true },
        data: { isInitial: false },
      })
    }

    const status = await prisma.submissionStatus.create({
      data: {
        code,
        labelHe: req.body.labelHe,
        labelEn: req.body.labelEn,
        color: req.body.color,
        orderIndex: req.body.orderIndex,
        isInitial: Boolean(req.body.isInitial),
        isTerminal: Boolean(req.body.isTerminal),
        slaPhase: req.body.slaPhase ?? null,
        notificationType: req.body.notificationType ?? null,
        isSystem: false,
      },
    })

    invalidateStatusCache()
    res.locals.entityId = status.id
    res.status(201).json({ data: status })
  } catch (err) {
    next(err)
  }
}

/**
 * PUT /api/admin/statuses/:id
 * Updates an existing status.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function updateStatus(req, res, next) {
  try {
    const existing = await findStatusOrFail(req.params.id)
    const nextCode = req.body.code.trim().toUpperCase()
    const isSystem = existing.isSystem || SYSTEM_CODES.has(existing.code)

    if (isSystem && nextCode !== existing.code) {
      throw new AppError('System status code cannot be changed', 'VALIDATION_ERROR', 400)
    }

    if (!isSystem && nextCode !== existing.code) {
      const duplicate = await prisma.submissionStatus.findFirst({
        where: { code: nextCode, isActive: true, NOT: { id: existing.id } },
      })
      if (duplicate) throw new AppError('Status code already exists', 'VALIDATION_ERROR', 400)
    }

    if (req.body.isInitial === true) {
      await prisma.submissionStatus.updateMany({
        where: { isActive: true, isInitial: true, NOT: { id: existing.id } },
        data: { isInitial: false },
      })
    }

    await assertInitialInvariant(existing.id, Boolean(req.body.isInitial))

    const updated = await prisma.submissionStatus.update({
      where: { id: existing.id },
      data: {
        code: isSystem ? existing.code : nextCode,
        labelHe: req.body.labelHe,
        labelEn: req.body.labelEn,
        color: req.body.color,
        orderIndex: req.body.orderIndex,
        isInitial: Boolean(req.body.isInitial),
        isTerminal: Boolean(req.body.isTerminal),
        slaPhase: req.body.slaPhase ?? null,
        notificationType: req.body.notificationType ?? null,
      },
    })

    invalidateStatusCache()
    res.locals.entityId = updated.id
    res.json({ data: updated })
  } catch (err) {
    next(err)
  }
}

/**
 * DELETE /api/admin/statuses/:id
 * Soft-deletes a status when not in use.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function removeStatus(req, res, next) {
  try {
    const existing = await findStatusOrFail(req.params.id)
    const isSystem = existing.isSystem || SYSTEM_CODES.has(existing.code)
    if (isSystem) throw new AppError('System status cannot be deleted', 'VALIDATION_ERROR', 400)

    const inUseCount = await prisma.submission.count({
      where: { isActive: true, status: existing.code },
    })
    if (inUseCount > 0) {
      throw new AppError('Status is in use by active submissions', 'VALIDATION_ERROR', 400)
    }

    await prisma.$transaction([
      prisma.statusTransition.updateMany({
        where: {
          OR: [{ fromStatusId: existing.id }, { toStatusId: existing.id }],
        },
        data: { isActive: false },
      }),
      prisma.statusPermission.updateMany({
        where: { statusId: existing.id },
        data: { isActive: false },
      }),
      prisma.submissionStatus.update({
        where: { id: existing.id },
        data: { isActive: false },
      }),
    ])

    invalidateStatusCache()
    res.locals.entityId = existing.id
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

/**
 * PUT /api/admin/statuses/reorder
 * Updates status display ordering.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function reorderStatuses(req, res, next) {
  try {
    const updates = req.body.items || []
    await prisma.$transaction(
      updates.map((item) =>
        prisma.submissionStatus.update({
          where: { id: item.id },
          data: { orderIndex: item.orderIndex },
        })
      )
    )
    invalidateStatusCache()
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/admin/statuses/:id/transitions
 * Returns transitions from the selected status.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function getStatusTransitions(req, res, next) {
  try {
    const status = await findStatusOrFail(req.params.id)
    const transitions = await prisma.statusTransition.findMany({
      where: { fromStatusId: status.id, isActive: true },
      include: {
        toStatus: { select: { id: true, code: true, labelHe: true, labelEn: true } },
      },
      orderBy: { createdAt: 'asc' },
    })
    res.json({ data: transitions })
  } catch (err) {
    next(err)
  }
}

/**
 * PUT /api/admin/statuses/:id/transitions
 * Replaces transitions from one status.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function updateStatusTransitions(req, res, next) {
  try {
    const fromStatus = await findStatusOrFail(req.params.id)
    const transitions = req.body.transitions || []
    const allStatuses = await prisma.submissionStatus.findMany({
      where: { isActive: true },
      select: { id: true, code: true },
    })
    const idByCode = Object.fromEntries(allStatuses.map((status) => [status.code, status.id]))

    const nextToIds = []
    for (const transition of transitions) {
      const toStatusId = idByCode[transition.toCode]
      if (!toStatusId) {
        throw new AppError(`Unknown target status: ${transition.toCode}`, 'VALIDATION_ERROR', 400)
      }
      nextToIds.push(toStatusId)
      await prisma.statusTransition.upsert({
        where: { fromStatusId_toStatusId: { fromStatusId: fromStatus.id, toStatusId } },
        update: {
          allowedRoles: transition.allowedRoles,
          requireReviewerAssigned: Boolean(transition.requireReviewerAssigned),
          isActive: true,
        },
        create: {
          fromStatusId: fromStatus.id,
          toStatusId,
          allowedRoles: transition.allowedRoles,
          requireReviewerAssigned: Boolean(transition.requireReviewerAssigned),
        },
      })
    }

    await prisma.statusTransition.updateMany({
      where: {
        fromStatusId: fromStatus.id,
        ...(nextToIds.length > 0 ? { toStatusId: { notIn: nextToIds } } : {}),
      },
      data: { isActive: false },
    })

    invalidateStatusCache()
    res.locals.entityId = fromStatus.id
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/admin/statuses/:id/permissions
 * Returns per-role action permissions for one status.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function getStatusPermissions(req, res, next) {
  try {
    const status = await findStatusOrFail(req.params.id)
    const permissions = await prisma.statusPermission.findMany({
      where: { statusId: status.id, isActive: true },
      orderBy: [{ role: 'asc' }, { action: 'asc' }],
    })
    res.json({ data: permissions })
  } catch (err) {
    next(err)
  }
}

/**
 * PUT /api/admin/statuses/:id/permissions
 * Replaces per-role action permissions for one status.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function updateStatusPermissions(req, res, next) {
  try {
    const status = await findStatusOrFail(req.params.id)
    const permissions = req.body.permissions || []

    for (const permission of permissions) {
      await prisma.statusPermission.upsert({
        where: {
          statusId_role_action: {
            statusId: status.id,
            role: permission.role,
            action: permission.action,
          },
        },
        update: {
          allowed: Boolean(permission.allowed),
          isActive: true,
        },
        create: {
          statusId: status.id,
          role: permission.role,
          action: permission.action,
          allowed: Boolean(permission.allowed),
        },
      })
    }

    invalidateStatusCache()
    res.locals.entityId = status.id
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/statuses/actions/allowed
 * Returns action permissions for submission status and current role.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function getAllowedActions(req, res, next) {
  try {
    const statusCode = String(req.query.status || '').trim().toUpperCase()
    const actions = ['VIEW', 'EDIT', 'COMMENT', 'UPLOAD_DOC', 'DELETE_DOC', 'VIEW_INTERNAL', 'TRANSITION', 'ASSIGN', 'SUBMIT_REVIEW', 'RECORD_DECISION']
    const result = {}
    for (const action of actions) {
      result[action] = await can(action, statusCode, req.user.role)
    }
    res.json({ data: result })
  } catch (err) {
    next(err)
  }
}
