/**
 * EthicFlow — JWT Authentication Middleware
 * Verifies Bearer token and attaches req.user = { id, email, roles, activeRole }.
 * Full RBAC middleware (role.js) is added in S1.3.2.
 */

import jwt from 'jsonwebtoken'
import authConfig from '../config/auth.js'
import { AppError } from '../utils/errors.js'

const ROLE_PRIORITY = ['ADMIN', 'CHAIRMAN', 'SECRETARY', 'REVIEWER', 'RESEARCHER']

/**
 * Normalizes roles from JWT payload to a unique role array.
 * @param {unknown} payloadRoles
 * @param {unknown} payloadRole
 * @returns {string[]}
 */
function normalizeRoles(payloadRoles, payloadRole) {
  const rawRoles = Array.isArray(payloadRoles)
    ? payloadRoles
    : (typeof payloadRole === 'string' ? [payloadRole] : [])
  const deduped = [...new Set(rawRoles.filter((role) => typeof role === 'string' && ROLE_PRIORITY.includes(role)))]
  if (!deduped.includes('RESEARCHER')) deduped.push('RESEARCHER')
  return deduped
}

/**
 * Resolves request active role from header, with safe fallback.
 * @param {string[]|undefined} roles
 * @param {unknown} requestedRole
 * @returns {string}
 */
function resolveActiveRole(roles, requestedRole) {
  const fallback = ROLE_PRIORITY.find((role) => roles?.includes(role)) ?? 'RESEARCHER'
  if (typeof requestedRole !== 'string') return fallback
  return roles?.includes(requestedRole) ? requestedRole : fallback
}

/**
 * Extracts and verifies the JWT from the Authorization header.
 * On success: sets req.user = { id, email, roles, activeRole } and calls next().
 * On failure: passes 401 AppError to next().
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization
  const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  const cookieToken = req.cookies?.[authConfig.cookies.accessTokenName]
  const token = headerToken || cookieToken
  if (!token) {
    return next(AppError.unauthorized())
  }

  try {
    let payload = null
    for (const secret of authConfig.jwt.verifySecrets) {
      try {
        payload = jwt.verify(token, secret)
        break
      } catch {
        // Try next configured secret for key rotation support.
      }
    }
    if (!payload) return next(AppError.unauthorized())
    const roles = normalizeRoles(payload.roles, payload.role)
    const activeRole = resolveActiveRole(roles, req.get('x-active-role'))
    req.user = {
      id:              payload.id,
      email:           payload.email,
      roles,
      activeRole,
      role:            activeRole,
      impersonatedBy:  payload.impersonatedBy ?? null,
    }
    next()
  } catch {
    next(AppError.unauthorized())
  }
}
