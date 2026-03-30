/**
 * EthicFlow — Rate Limiting Middleware
 * Two limiters: general API and strict login limiter.
 * Values loaded from environment variables (see .env.example).
 *
 * Usage:
 *   import { apiLimiter, loginLimiter } from './middleware/rateLimit.js'
 *   app.use('/api', apiLimiter)              // global
 *   router.post('/login', loginLimiter, ...) // auth only
 */

import rateLimit from 'express-rate-limit'

/**
 * Builds the standard rate-limit exceeded response.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
function rateLimitHandler(req, res) {
  const retryAfter = Math.ceil(
    (res.getHeader('Retry-After') ?? 60)
  )
  res.status(429).json({
    error:      'Too many requests',
    code:       'RATE_LIMITED',
    retryAfter,
  })
}

/**
 * General API rate limiter — applied to all /api/* routes.
 * Default: 100 requests per minute per IP.
 */
export const apiLimiter = rateLimit({
  windowMs:        parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '60000', 10),
  max:             parseInt(process.env.RATE_LIMIT_MAX ?? '100', 10),
  standardHeaders: true,
  legacyHeaders:   false,
  handler:         rateLimitHandler,
})

/**
 * Strict login rate limiter — applied only to POST /api/auth/login.
 * Default: 5 attempts per 15 minutes per IP.
 * skipSuccessfulRequests: only failed attempts count toward the limit.
 */
export const loginLimiter = rateLimit({
  windowMs:               parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS ?? '900000', 10),
  max:                    parseInt(process.env.LOGIN_RATE_LIMIT_MAX ?? '5', 10),
  standardHeaders:        true,
  legacyHeaders:          false,
  skipSuccessfulRequests: true,
  handler:                rateLimitHandler,
})
