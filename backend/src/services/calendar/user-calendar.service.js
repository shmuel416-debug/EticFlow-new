/**
 * EthicFlow — User Calendar Sync Service
 * Orchestrates per-user personal calendar sync for meeting lifecycle events.
 */

import prisma from '../../config/database.js'
import { encryptSecret, decryptSecret } from '../../utils/secrets.js'
import * as googleUserProvider from './user-google.provider.js'
import * as microsoftUserProvider from './user-microsoft.provider.js'

const MAX_RETRIES = 5

const userProviders = {
  GOOGLE: googleUserProvider,
  MICROSOFT: microsoftUserProvider,
}

/**
 * Returns provider module by CalendarProvider enum value.
 * @param {'GOOGLE'|'MICROSOFT'|'NONE'} provider
 * @returns {object|null}
 */
function getUserProvider(provider) {
  return userProviders[provider] || null
}

/**
 * Calculates exponential backoff delay in milliseconds.
 * @param {number} retryCount
 * @returns {number}
 */
function getRetryDelayMs(retryCount) {
  const sec = Math.min(300, 2 ** Math.max(0, retryCount) * 15)
  return sec * 1000
}

/**
 * Builds personal event payload from meeting data.
 * @param {{ title: string, scheduledAt: Date, location?: string|null, agendaNote?: string|null }} meeting
 * @returns {{ title: string, description: string, startTime: Date, endTime: Date, location?: string }}
 */
function buildUserEvent(meeting) {
  const start = new Date(meeting.scheduledAt)
  const end = new Date(start.getTime() + 60 * 60 * 1000)
  return {
    title: `Ethics Committee — ${meeting.title}`,
    description: meeting.agendaNote || 'Ethics committee meeting.',
    startTime: start,
    endTime: end,
    ...(meeting.location ? { location: meeting.location } : {}),
  }
}

/**
 * Reads and decrypts user calendar connection details.
 * @param {string} userId
 * @returns {Promise<null|{ userId: string, provider: 'GOOGLE'|'MICROSOFT', accessToken: string, refreshToken: string|null, expiryDate: Date|null }>}
 */
async function getUserConnection(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      calendarProvider: true,
      calendarSyncEnabled: true,
      calendarAccessToken: true,
      calendarRefreshToken: true,
      calendarTokenExpiry: true,
    },
  })
  if (!user || !user.calendarSyncEnabled || user.calendarProvider === 'NONE') {
    return null
  }
  const accessToken = decryptSecret(user.calendarAccessToken)
  const refreshToken = decryptSecret(user.calendarRefreshToken)
  if (!accessToken) return null
  return {
    userId: user.id,
    provider: user.calendarProvider,
    accessToken,
    refreshToken: refreshToken || null,
    expiryDate: user.calendarTokenExpiry || null,
  }
}

/**
 * Persists updated encrypted token state to a user record.
 * @param {string} userId
 * @param {{ accessToken: string, refreshToken?: string|null, expiryDate?: Date|null }} tokens
 * @returns {Promise<void>}
 */
async function persistConnectionTokens(userId, tokens) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      calendarAccessToken: tokens.accessToken ? encryptSecret(tokens.accessToken) : null,
      ...(tokens.refreshToken !== undefined
        ? { calendarRefreshToken: tokens.refreshToken ? encryptSecret(tokens.refreshToken) : null }
        : {}),
      ...(tokens.expiryDate !== undefined
        ? { calendarTokenExpiry: tokens.expiryDate || null }
        : {}),
    },
  })
}

/**
 * Refreshes access token when near expiry.
 * @param {{ userId: string, provider: 'GOOGLE'|'MICROSOFT', accessToken: string, refreshToken: string|null, expiryDate: Date|null }} connection
 * @returns {Promise<{ accessToken: string, refreshToken: string|null, expiryDate: Date|null }>}
 */
async function ensureFreshAccessToken(connection) {
  const expiresAt = connection.expiryDate?.getTime() ?? 0
  const isFresh = expiresAt === 0 || expiresAt - Date.now() > 120000
  if (isFresh) {
    return connection
  }

  if (!connection.refreshToken) {
    throw new Error('Missing refresh token for personal calendar connection')
  }

  const provider = getUserProvider(connection.provider)
  if (!provider || typeof provider.refreshAccessToken !== 'function') {
    throw new Error(`Provider "${connection.provider}" does not support refresh`)
  }

  const refreshed = await provider.refreshAccessToken(connection.refreshToken)
  const nextConnection = {
    ...connection,
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken || connection.refreshToken,
    expiryDate: refreshed.expiryDate || connection.expiryDate,
  }
  await persistConnectionTokens(connection.userId, nextConnection)
  return nextConnection
}

/**
 * Returns attendees who are eligible for personal sync.
 * @param {string} meetingId
 * @param {string[]|undefined} targetUserIds
 * @returns {Promise<Array<{ id: string, calendarProvider: 'GOOGLE'|'MICROSOFT'|'NONE' }>>}
 */
async function getEligibleUsers(meetingId, targetUserIds) {
  const attendees = await prisma.meetingAttendee.findMany({
    where: {
      meetingId,
      isActive: true,
      ...(targetUserIds?.length ? { userId: { in: targetUserIds } } : {}),
    },
    include: {
      user: {
        select: {
          id: true,
          isActive: true,
          calendarProvider: true,
          calendarSyncEnabled: true,
          calendarAccessToken: true,
        },
      },
    },
  })
  return attendees
    .map((row) => row.user)
    .filter((u) =>
      u &&
      u.isActive &&
      u.calendarSyncEnabled &&
      u.calendarProvider !== 'NONE' &&
      !!u.calendarAccessToken
    )
}

/**
 * Processes a single sync record for a meeting operation.
 * @param {{ id: string, meetingId: string, userId: string, provider: 'GOOGLE'|'MICROSOFT'|'NONE', externalEventId: string|null, retryCount: number }} record
 * @param {'create'|'update'|'cancel'} operation
 * @returns {Promise<void>}
 */
async function processOneSyncRecord(record, operation) {
  const meeting = await prisma.meeting.findUnique({
    where: { id: record.meetingId },
    select: {
      id: true,
      title: true,
      scheduledAt: true,
      location: true,
      agendaNote: true,
      isActive: true,
      status: true,
    },
  })

  if (!meeting) {
    await prisma.meetingCalendarSync.update({
      where: { id: record.id },
      data: {
        status: 'FAILED',
        lastError: 'Meeting not found',
        lastAttemptAt: new Date(),
        retryCount: record.retryCount + 1,
        nextRetryAt: new Date(Date.now() + getRetryDelayMs(record.retryCount + 1)),
      },
    })
    return
  }

  const provider = getUserProvider(record.provider)
  if (!provider) {
    await prisma.meetingCalendarSync.update({
      where: { id: record.id },
      data: {
        status: 'FAILED',
        lastError: `Unsupported provider: ${record.provider}`,
        lastAttemptAt: new Date(),
        retryCount: record.retryCount + 1,
      },
    })
    return
  }

  try {
    const rawConnection = await getUserConnection(record.userId)
    if (!rawConnection || rawConnection.provider !== record.provider) {
      throw new Error('User personal calendar is disconnected')
    }
    const connection = await ensureFreshAccessToken(rawConnection)
    const eventData = buildUserEvent(meeting)

    if (operation === 'cancel' || meeting.status === 'CANCELLED' || !meeting.isActive) {
      if (record.externalEventId) {
        await provider.deleteEvent(connection, record.externalEventId)
      }
      await prisma.meetingCalendarSync.update({
        where: { id: record.id },
        data: {
          status: 'CANCELLED',
          isActive: false,
          lastError: null,
          lastAttemptAt: new Date(),
          lastSyncAt: new Date(),
          nextRetryAt: null,
        },
      })
      return
    }

    let externalEventId = record.externalEventId
    if (!externalEventId) {
      externalEventId = await provider.createEvent(connection, eventData)
    } else {
      await provider.updateEvent(connection, externalEventId, eventData)
    }

    await prisma.meetingCalendarSync.update({
      where: { id: record.id },
      data: {
        externalEventId: externalEventId || null,
        status: 'SYNCED',
        lastError: null,
        lastAttemptAt: new Date(),
        lastSyncAt: new Date(),
        nextRetryAt: null,
      },
    })
  } catch (err) {
    const nextRetry = record.retryCount + 1
    await prisma.meetingCalendarSync.update({
      where: { id: record.id },
      data: {
        status: nextRetry >= MAX_RETRIES ? 'FAILED' : 'PENDING',
        lastError: err?.message || 'User calendar sync failed',
        retryCount: nextRetry,
        lastAttemptAt: new Date(),
        nextRetryAt: nextRetry >= MAX_RETRIES
          ? null
          : new Date(Date.now() + getRetryDelayMs(nextRetry)),
      },
    })
  }
}

/**
 * Upserts per-user sync rows and marks them as pending.
 * @param {string} meetingId
 * @param {'create'|'update'|'cancel'} operation
 * @param {string[]|undefined} targetUserIds
 * @returns {Promise<void>}
 */
async function enqueueRows(meetingId, operation, targetUserIds) {
  const users = await getEligibleUsers(meetingId, targetUserIds)
  if (users.length === 0) return

  await Promise.all(
    users.map((user) =>
      prisma.meetingCalendarSync.upsert({
        where: { meetingId_userId: { meetingId, userId: user.id } },
        create: {
          meetingId,
          userId: user.id,
          provider: user.calendarProvider,
          status: operation === 'cancel' ? 'PENDING' : 'PENDING',
          retryCount: 0,
          nextRetryAt: null,
          isActive: true,
        },
        update: {
          provider: user.calendarProvider,
          status: 'PENDING',
          isActive: true,
          nextRetryAt: null,
        },
      })
    )
  )
}

/**
 * Enqueues sync operations and immediately attempts execution.
 * @param {{ meetingId: string, operation: 'create'|'update'|'cancel', targetUserIds?: string[] }} params
 * @returns {Promise<void>}
 */
export async function enqueueMeetingUserSync(params) {
  const { meetingId, operation, targetUserIds } = params
  await enqueueRows(meetingId, operation, targetUserIds)
  void processMeetingUserSync({ meetingId, operation, targetUserIds }).catch((err) => {
    console.warn('[Calendar/UserSync] async processing failed:', err.message)
  })
}

/**
 * Processes pending sync records for a specific meeting.
 * @param {{ meetingId: string, operation: 'create'|'update'|'cancel', targetUserIds?: string[] }} params
 * @returns {Promise<void>}
 */
export async function processMeetingUserSync(params) {
  const { meetingId, operation, targetUserIds } = params
  const where = {
    meetingId,
    status: 'PENDING',
    ...(targetUserIds?.length ? { userId: { in: targetUserIds } } : {}),
  }
  const rows = await prisma.meetingCalendarSync.findMany({
    where,
    orderBy: { createdAt: 'asc' },
  })
  for (const row of rows) {
    // sequential processing keeps provider rate usage predictable
    // and avoids concurrent updates on the same record.
    // eslint-disable-next-line no-await-in-loop
    await processOneSyncRecord(row, operation)
  }
}

/**
 * Retries pending personal sync records due for retry.
 * @param {number} limit
 * @returns {Promise<number>}
 */
export async function retryPendingUserCalendarSync(limit = 50) {
  const now = new Date()
  const rows = await prisma.meetingCalendarSync.findMany({
    where: {
      status: 'PENDING',
      isActive: true,
      OR: [
        { nextRetryAt: null },
        { nextRetryAt: { lte: now } },
      ],
      retryCount: { lt: MAX_RETRIES },
    },
    orderBy: { updatedAt: 'asc' },
    take: limit,
  })
  for (const row of rows) {
    // eslint-disable-next-line no-await-in-loop
    await processOneSyncRecord(row, 'update')
  }
  return rows.length
}

/**
 * Cancels personal sync for one user after attendee removal.
 * @param {string} meetingId
 * @param {string} userId
 * @returns {Promise<void>}
 */
export async function cancelMeetingUserSyncForAttendee(meetingId, userId) {
  const existing = await prisma.meetingCalendarSync.findUnique({
    where: { meetingId_userId: { meetingId, userId } },
  })
  if (!existing) return
  await processOneSyncRecord(existing, 'cancel')
}

/**
 * Returns per-meeting personal sync rows for a user.
 * @param {string} userId
 * @param {string[]} meetingIds
 * @returns {Promise<Map<string, { status: string, lastSyncAt: string|null }>>}
 */
export async function getUserSyncMapForMeetings(userId, meetingIds) {
  const map = new Map()
  if (!meetingIds.length) return map
  const rows = await prisma.meetingCalendarSync.findMany({
    where: { userId, meetingId: { in: meetingIds } },
    select: { meetingId: true, status: true, lastSyncAt: true },
  })
  rows.forEach((row) => {
    map.set(row.meetingId, {
      status: row.status,
      lastSyncAt: row.lastSyncAt ? row.lastSyncAt.toISOString() : null,
    })
  })
  return map
}

/**
 * Upserts user personal calendar connection data.
 * @param {{ userId: string, provider: 'GOOGLE'|'MICROSOFT', email: string, accessToken: string, refreshToken: string|null, expiryDate: Date|null }} params
 * @returns {Promise<void>}
 */
export async function upsertUserCalendarConnection(params) {
  const { userId, provider, email, accessToken, refreshToken, expiryDate } = params
  await prisma.user.update({
    where: { id: userId },
    data: {
      calendarProvider: provider,
      calendarSyncEnabled: true,
      calendarEmail: email || null,
      calendarAccessToken: encryptSecret(accessToken),
      calendarRefreshToken: refreshToken ? encryptSecret(refreshToken) : null,
      calendarTokenExpiry: expiryDate || null,
    },
  })
}

/**
 * Clears user personal calendar connection and deactivates sync rows.
 * @param {string} userId
 * @returns {Promise<void>}
 */
export async function disconnectUserCalendar(userId) {
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        calendarProvider: 'NONE',
        calendarSyncEnabled: false,
        calendarEmail: null,
        calendarAccessToken: null,
        calendarRefreshToken: null,
        calendarTokenExpiry: null,
      },
    }),
    prisma.meetingCalendarSync.updateMany({
      where: { userId, isActive: true },
      data: { status: 'CANCELLED', isActive: false, nextRetryAt: null },
    }),
  ])
}

/**
 * Returns user connection status summary.
 * @param {string} userId
 * @returns {Promise<{ connected: boolean, provider: string, syncEnabled: boolean, email: string|null, tokenExpiry: string|null, stats: { pending: number, failed: number, synced: number }, lastSyncAt: string|null }>}
 */
export async function getUserCalendarStatus(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      calendarProvider: true,
      calendarSyncEnabled: true,
      calendarEmail: true,
      calendarTokenExpiry: true,
    },
  })
  if (!user) {
    return {
      connected: false,
      provider: 'NONE',
      syncEnabled: false,
      email: null,
      tokenExpiry: null,
      stats: { pending: 0, failed: 0, synced: 0 },
      lastSyncAt: null,
    }
  }

  const [pending, failed, synced, latest] = await Promise.all([
    prisma.meetingCalendarSync.count({ where: { userId, status: 'PENDING', isActive: true } }),
    prisma.meetingCalendarSync.count({ where: { userId, status: 'FAILED', isActive: true } }),
    prisma.meetingCalendarSync.count({ where: { userId, status: 'SYNCED', isActive: true } }),
    prisma.meetingCalendarSync.findFirst({
      where: { userId, lastSyncAt: { not: null } },
      orderBy: { lastSyncAt: 'desc' },
      select: { lastSyncAt: true },
    }),
  ])

  return {
    connected: user.calendarProvider !== 'NONE',
    provider: user.calendarProvider,
    syncEnabled: user.calendarSyncEnabled,
    email: user.calendarEmail,
    tokenExpiry: user.calendarTokenExpiry ? user.calendarTokenExpiry.toISOString() : null,
    stats: { pending, failed, synced },
    lastSyncAt: latest?.lastSyncAt ? latest.lastSyncAt.toISOString() : null,
  }
}
