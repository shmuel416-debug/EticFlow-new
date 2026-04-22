/**
 * EthicFlow — Personal Calendar Controller
 * Handles per-user OAuth connection and sync preferences for Google/Outlook.
 */

import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import prisma from '../config/database.js'
import authConfig from '../config/auth.js'
import { AppError } from '../utils/errors.js'
import {
  getUserCalendarStatus,
  upsertUserCalendarConnection,
  disconnectUserCalendar,
} from '../services/calendar/user-calendar.service.js'
import * as googleUserProvider from '../services/calendar/user-google.provider.js'
import * as microsoftUserProvider from '../services/calendar/user-microsoft.provider.js'

const PROVIDERS = {
  google: { enumValue: 'GOOGLE', module: googleUserProvider },
  microsoft: { enumValue: 'MICROSOFT', module: microsoftUserProvider },
}

/**
 * Resolves a safe frontend URL for callback redirects.
 * @returns {string}
 */
function getFrontendUrl() {
  return (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')
}

/**
 * Builds signed short-lived state payload for OAuth callbacks.
 * @param {string} userId
 * @param {'google'|'microsoft'} provider
 * @returns {string}
 */
function issueStateToken(userId, provider) {
  return jwt.sign(
    {
      typ: 'calendar-connect',
      uid: userId,
      provider,
      nonce: crypto.randomBytes(8).toString('hex'),
    },
    authConfig.jwt.secret,
    { expiresIn: '5m' }
  )
}

/**
 * Parses and verifies OAuth callback state token.
 * @param {string} token
 * @returns {{ uid: string, provider: 'google'|'microsoft' }}
 */
function verifyStateToken(token) {
  const decoded = jwt.verify(token, authConfig.jwt.secret)
  if (!decoded || decoded.typ !== 'calendar-connect' || !decoded.uid || !decoded.provider) {
    throw new Error('Invalid calendar state token')
  }
  return { uid: decoded.uid, provider: decoded.provider }
}

/**
 * Writes an audit row for personal calendar actions.
 * @param {string} userId
 * @param {string} action
 * @param {object} meta
 * @returns {Promise<void>}
 */
async function logCalendarAudit(userId, action, meta = {}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType: 'UserCalendarConnection',
        entityId: userId,
        metaJson: meta,
      },
    })
  } catch (err) {
    console.warn('[Calendar/Audit] failed:', err.message)
  }
}

/**
 * GET /api/calendar/status
 * Returns personal calendar connection + sync status for current user.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function status(req, res, next) {
  try {
    const data = await getUserCalendarStatus(req.user.id)
    res.json({ data })
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/calendar/preferences
 * Updates personal sync preference for current user.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function updatePreferences(req, res, next) {
  try {
    const { syncEnabled } = req.body
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { calendarProvider: true },
    })
    if (!user) {
      throw AppError.notFound('User')
    }
    if (syncEnabled && user.calendarProvider === 'NONE') {
      throw new AppError('Connect a personal calendar before enabling sync', 'CALENDAR_NOT_CONNECTED', 400)
    }
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { calendarSyncEnabled: Boolean(syncEnabled) },
      select: {
        calendarProvider: true,
        calendarSyncEnabled: true,
        calendarEmail: true,
        calendarTokenExpiry: true,
      },
    })
    await logCalendarAudit(req.user.id, 'calendar.preferences.updated', {
      syncEnabled: updated.calendarSyncEnabled,
    })
    res.json({
      data: {
        provider: updated.calendarProvider,
        syncEnabled: updated.calendarSyncEnabled,
        email: updated.calendarEmail,
        tokenExpiry: updated.calendarTokenExpiry ? updated.calendarTokenExpiry.toISOString() : null,
      },
    })
  } catch (err) {
    next(err)
  }
}

/**
 * DELETE /api/calendar/disconnect
 * Disconnects personal calendar and disables sync.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function disconnect(req, res, next) {
  try {
    await disconnectUserCalendar(req.user.id)
    await logCalendarAudit(req.user.id, 'calendar.disconnected')
    res.locals.entityId = req.user.id
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/calendar/connect/:provider
 * Redirects authenticated user to provider OAuth consent.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function connect(req, res, next) {
  try {
    const providerKey = String(req.params.provider || '').toLowerCase()
    const provider = PROVIDERS[providerKey]
    if (!provider) {
      throw new AppError('Unsupported provider', 'INVALID_PROVIDER', 400)
    }
    const state = issueStateToken(req.user.id, providerKey)
    const url = provider.module.getAuthUrl(state)
    await logCalendarAudit(req.user.id, 'calendar.connect.started', { provider: providerKey })
    res.redirect(url)
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/calendar/callback/:provider
 * Completes OAuth connection and persists encrypted user tokens.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function callback(req, res, _next) {
  const frontendUrl = getFrontendUrl()
  try {
    const providerKey = String(req.params.provider || '').toLowerCase()
    const provider = PROVIDERS[providerKey]
    if (!provider) {
      return res.redirect(`${frontendUrl}/settings?calendar=error&reason=invalid_provider`)
    }

    const { code, state, error } = req.query
    if (error) {
      return res.redirect(`${frontendUrl}/settings?calendar=cancelled&provider=${providerKey}`)
    }
    if (!code || !state) {
      return res.redirect(`${frontendUrl}/settings?calendar=error&reason=missing_params`)
    }

    const statePayload = verifyStateToken(String(state))
    if (statePayload.provider !== providerKey) {
      return res.redirect(`${frontendUrl}/settings?calendar=error&reason=state_provider_mismatch`)
    }

    const exchanged = await provider.module.exchangeCode(String(code))
    await upsertUserCalendarConnection({
      userId: statePayload.uid,
      provider: provider.enumValue,
      email: exchanged.email,
      accessToken: exchanged.accessToken,
      refreshToken: exchanged.refreshToken,
      expiryDate: exchanged.expiryDate,
    })
    await logCalendarAudit(statePayload.uid, 'calendar.connected', {
      provider: providerKey,
      email: exchanged.email,
    })
    res.redirect(`${frontendUrl}/settings?calendar=connected&provider=${providerKey}`)
  } catch (err) {
    console.error('[Calendar/Callback] failed:', err.message)
    res.redirect(`${frontendUrl}/settings?calendar=error&reason=callback_failed`)
  }
}
