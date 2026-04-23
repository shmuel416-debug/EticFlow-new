/**
 * EthicFlow — Request Context Middleware
 * Adds per-request correlation ID for logs and tracing.
 */

import crypto from 'crypto'

/**
 * Assigns and exposes a request correlation ID.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {void}
 */
export function attachRequestContext(req, res, next) {
  const incoming = req.get('x-request-id')
  const requestId = incoming || crypto.randomUUID()
  req.requestId = requestId
  res.setHeader('x-request-id', requestId)
  next()
}
