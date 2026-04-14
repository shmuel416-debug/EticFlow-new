/**
 * EthicFlow — JWT Authentication Middleware
 * Verifies Bearer token and attaches req.user = { id, email, role }.
 * Full RBAC middleware (role.js) is added in S1.3.2.
 */

import jwt from 'jsonwebtoken'
import authConfig from '../config/auth.js'
import { AppError } from '../utils/errors.js'

/**
 * Extracts and verifies the JWT from the Authorization header.
 * On success: sets req.user = { id, email, role } and calls next().
 * On failure: passes 401 AppError to next().
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return next(AppError.unauthorized())
  }

  const token = authHeader.slice(7)
  try {
    const payload = jwt.verify(token, authConfig.jwt.secret)
    req.user = {
      id:              payload.id,
      email:           payload.email,
      role:            payload.role,
      impersonatedBy:  payload.impersonatedBy ?? null,
    }
    next()
  } catch {
    next(AppError.unauthorized())
  }
}
