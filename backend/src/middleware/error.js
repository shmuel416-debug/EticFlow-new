/**
 * EthicFlow — Global Error Handler Middleware
 * Must be registered LAST in Express (after all routes).
 * Normalizes all errors into { error, code, details? } format.
 * Hides internal details in production.
 */

import { AppError } from '../utils/errors.js'

const IS_DEV = process.env.NODE_ENV !== 'production'

/**
 * Maps Prisma error codes to AppError instances.
 * @param {Error} err - Prisma error object
 * @returns {AppError}
 */
function handlePrismaError(err) {
  if (err.code === 'P2002') {
    const field = err.meta?.target?.[0] ?? 'record'
    return AppError.conflict(field)
  }
  if (err.code === 'P2025') {
    return AppError.notFound()
  }
  return new AppError('Database error', 'DB_ERROR', 500)
}

/**
 * Express global error handler (4-argument signature required by Express).
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} _next
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  if (IS_DEV) console.error('[Error]', err)

  // JSON parse error from Express body-parser
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON body', code: 'INVALID_JSON' })
  }

  // Prisma errors
  if (err.code?.startsWith?.('P')) {
    const appErr = handlePrismaError(err)
    return res.status(appErr.statusCode).json({
      error:   appErr.message,
      code:    appErr.code,
    })
  }

  // Known AppError
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error:   err.message,
      code:    err.code,
      ...(err.details && { details: err.details }),
    })
  }

  // Unknown error — hide details in production
  res.status(500).json({
    error:   IS_DEV ? err.message : 'Internal server error',
    code:    'INTERNAL_ERROR',
    ...(IS_DEV && err.stack && { stack: err.stack }),
  })
}
