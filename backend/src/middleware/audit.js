/**
 * EthicFlow — Audit Log Middleware
 * Patches res.json (and auth SSO res.redirect) so a successful response records
 * an audit row. Must be registered *before* the route handler, otherwise Express
 * never runs post-handlers when the handler only calls res.json without next().
 */

import prisma from '../config/database.js'

/**
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
 * Persists a single audit row. Exported for non-JSON success paths (e.g. PDF stream on finish).
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {string} action
 * @param {string} entityType
 * @returns {Promise<void>}
 */
export function recordAuditEntry(req, res, action, entityType) {
  const entityId = req.params?.id ?? req.params?.subId ?? res.locals?.entityId ?? null
  return prisma.auditLog.create({
    data: {
      userId: req.user?.id ?? null,
      action,
      entityType,
      entityId,
      ipAddress: getIpAddress(req),
      userAgent: req.headers['user-agent'] ?? null,
      metaJson:  res.locals?.auditMeta ?? null,
    },
  })
}

/**
 * Creates an Express middleware that records an audit on successful res.json, or
 * (for SSO) on a successful redirect to the sso-callback with an exchange code.
 * @param {string} action      e.g. 'submission.submitted'
 * @param {string} entityType  e.g. 'Submission' (Prisma / domain label)
 * @returns {import('express').RequestHandler}
 */
export function auditLog(action, entityType) {
  return (req, res, next) => {
    const origJson = res.json.bind(res)
    res.json = (body) => {
      if (res.statusCode < 400) {
        recordAuditEntry(req, res, action, entityType).catch((err) => {
          console.error('[Audit] Failed to write audit log:', err.message)
        })
      }
      return origJson(body)
    }

    const origRedirect = res.redirect.bind(res)
    res.redirect = (url) => {
      const s = String(url)
      if (s.includes('/sso-callback') && s.includes('code=')) {
        recordAuditEntry(req, res, action, entityType).catch((err) => {
          console.error('[Audit] Failed to write audit log:', err.message)
        })
      }
      return origRedirect.call(res, url)
    }

    next()
  }
}
