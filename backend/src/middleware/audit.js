/**
 * EthicFlow — Audit Log Middleware
 * Factory that returns an Express middleware recording sensitive actions.
 * Fire-and-forget: never blocks or fails the request.
 * Saves to AuditLog table: userId, action, entityType, entityId, IP, userAgent.
 */

import prisma from '../config/database.js'

/**
 * Extracts the client IP address from the request.
 * @param {import('express').Request} req
 * @returns {string|null}
 */
function getIpAddress(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ??
    req.socket?.remoteAddress ??
    null
  )
}

/**
 * Creates an Express middleware that logs an action to the audit table.
 * Place AFTER the controller in the route definition.
 * @param {string} action      - Action identifier, e.g. 'submission.approved'
 * @param {string} entityType  - Entity type, e.g. 'Submission'
 * @returns {import('express').RequestHandler}
 */
export function auditLog(action, entityType) {
  return (req, res, next) => {
    const entityId = req.params?.id ?? res.locals?.entityId ?? null
    const userId   = req.user?.id ?? null

    // Fire-and-forget — do not await
    prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        ipAddress: getIpAddress(req),
        userAgent: req.headers['user-agent'] ?? null,
        metaJson:  res.locals?.auditMeta ?? null,
      },
    }).catch((err) => {
      console.error('[Audit] Failed to write audit log:', err.message)
    })

    next()
  }
}
