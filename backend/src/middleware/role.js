/**
 * EthicFlow — RBAC Role Authorization Middleware
 * Works after authenticate middleware (which sets req.user).
 *
 * Usage:
 *   router.get('/', authenticate, authorize('ADMIN', 'SECRETARY'), controller.list)
 *   router.put('/:id', authenticate, authorizeOwnerOrRoles('ADMIN'), controller.update)
 *
 * Roles: RESEARCHER < REVIEWER < SECRETARY < CHAIRMAN < ADMIN
 * Always use explicit role lists — no automatic hierarchy enforcement.
 */

import { AppError } from '../utils/errors.js'

/**
 * Middleware factory — allows access only to users with one of the specified roles.
 * Must run after authenticate() which sets req.user.
 * @param {...string} roles - Allowed role values (e.g. 'ADMIN', 'SECRETARY')
 * @returns {import('express').RequestHandler}
 */
export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(AppError.unauthorized())
    if (!roles.includes(req.user.role)) return next(AppError.forbidden())
    next()
  }
}

/**
 * Middleware factory — allows access if the user owns the resource OR has one of the given roles.
 * Ownership is determined by req.user.id === req.params.id.
 * Must run after authenticate() which sets req.user.
 * @param {...string} roles - Roles that bypass ownership check (e.g. 'ADMIN')
 * @returns {import('express').RequestHandler}
 */
export function authorizeOwnerOrRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(AppError.unauthorized())
    const isOwner    = req.user.id === req.params.id
    const hasRole    = roles.includes(req.user.role)
    if (!isOwner && !hasRole) return next(AppError.forbidden())
    next()
  }
}
