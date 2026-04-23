/**
 * EthicFlow — Meetings Controller
 * Handles committee meeting lifecycle: create, list, agenda, attendance.
 * Integrates with the pluggable Calendar Service for optional Outlook sync.
 *
 * Endpoints:
 *   GET    /api/meetings                          — list meetings
 *   POST   /api/meetings                          — create meeting
 *   GET    /api/meetings/:id                      — get meeting with agenda + attendees
 *   PUT    /api/meetings/:id                      — update meeting details
 *   DELETE /api/meetings/:id                      — cancel meeting (soft-delete)
 *   POST   /api/meetings/:id/agenda               — add submission to agenda
 *   DELETE /api/meetings/:id/agenda/:itemId       — remove agenda item
 *   PATCH  /api/meetings/:id/attendance           — record attendance
 */

import prisma from '../config/database.js'
import { AppError } from '../utils/errors.js'
import * as calendarService from '../services/calendar/calendar.service.js'
import {
  enqueueMeetingUserSync,
  cancelMeetingUserSyncForAttendee,
  getUserSyncMapForMeetings,
} from '../services/calendar/user-calendar.service.js'

/**
 * Enqueues personal sync rows without breaking main meeting flow.
 * @param {{ meetingId: string, operation: 'create'|'update'|'cancel', targetUserIds?: string[] }} payload
 * @returns {Promise<void>}
 */
async function enqueueUserSyncSafe(payload) {
  try {
    await enqueueMeetingUserSync(payload)
  } catch (err) {
    console.warn('[Meetings] User calendar sync enqueue failed (non-fatal):', err.message)
  }
}
import { recordAuditEntry } from '../middleware/audit.js'
import { COMMITTEE_ROLES } from '../constants/roles.js'
import { getPrimaryRole, isCommitteeMember } from '../utils/roles.js'
import { hasConflict } from '../services/coi.service.js'

// ─────────────────────────────────────────────
// CALENDAR SYNC HELPERS (non-fatal wrappers)
// ─────────────────────────────────────────────

/**
 * Syncs a newly created meeting to the external calendar provider.
 * On failure, logs a warning and returns null (never throws).
 * @param {{ id: string, title: string }} meeting - Saved meeting record
 * @param {Date|string} scheduledAt - Meeting start time
 * @param {string|undefined} location - Optional location string
 * @param {Array<{email: string, fullName: string}>} attendeeUsers - Users to invite
 * @returns {Promise<string|null>} External calendar event ID, or null
 */
async function syncCreateToCalendar(meeting, scheduledAt, location, attendeeUsers) {
  try {
    const startTime = new Date(scheduledAt)
    const endTime   = new Date(startTime.getTime() + 60 * 60 * 1000) // default 1h
    return await calendarService.createEvent({
      title:       meeting.title,
      description: `ישיבת ועדת אתיקה — ${meeting.title}`,
      startTime,
      endTime,
      location,
      attendees:   attendeeUsers.map(u => ({ email: u.email, name: u.fullName })),
    })
  } catch (err) {
    console.warn('[Meetings] Calendar create failed (non-fatal):', err.message)
    return null
  }
}

/**
 * Syncs an updated meeting to the external calendar provider.
 * On failure, logs a warning and continues (never throws).
 * @param {string} externalId - External calendar event ID
 * @param {{ title: string, scheduledAt?: Date|string, location?: string }} updates - Changed fields
 * @param {{ title: string, scheduledAt: Date, location?: string }} existing - Current meeting record
 * @returns {Promise<void>}
 */
async function syncUpdateToCalendar(externalId, updates, existing) {
  try {
    const startTime = updates.scheduledAt ? new Date(updates.scheduledAt) : existing.scheduledAt
    const endTime   = new Date(startTime.getTime() + 60 * 60 * 1000)
    const title     = updates.title ?? existing.title
    await calendarService.updateEvent(externalId, {
      title,
      description: `ישיבת ועדת אתיקה — ${title}`,
      startTime,
      endTime,
      location:    updates.location ?? existing.location,
    })
  } catch (err) {
    console.warn('[Meetings] Calendar update failed (non-fatal):', err.message)
  }
}

/**
 * Removes a meeting from the external calendar provider.
 * On failure, logs a warning and continues (never throws).
 * @param {string} externalId - External calendar event ID
 * @returns {Promise<void>}
 */
async function syncDeleteToCalendar(externalId) {
  try {
    await calendarService.deleteEvent(externalId)
  } catch (err) {
    console.warn('[Meetings] Calendar delete failed (non-fatal):', err.message)
  }
}

/**
 * Records an audit row for blocked role-based operations without disrupting request flow.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {{ entityId?: string, meta?: object }} options
 * @returns {Promise<void>}
 */
async function recordBlockedRoleAudit(req, res, options = {}) {
  const prevMeta = res.locals.auditMeta
  const prevEntityId = res.locals.entityId

  if (options.entityId) res.locals.entityId = options.entityId
  res.locals.auditMeta = { ...(prevMeta ?? {}), ...(options.meta ?? {}) }

  try {
    await recordAuditEntry(req, res, 'security.role_violation_blocked', 'Meeting')
  } catch (err) {
    console.error('[Meetings] Failed to write blocked-role audit log:', err.message)
  } finally {
    res.locals.auditMeta = prevMeta
    res.locals.entityId = prevEntityId
  }
}

// ─────────────────────────────────────────────
// LIST
// ─────────────────────────────────────────────

/**
 * GET /api/meetings
 * Returns all active meetings, optionally filtered by time window.
 * @param {import('express').Request}  req - query: { filter: 'upcoming'|'past'|'all', page, limit }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function list(req, res, next) {
  try {
    const { filter = 'all', page = '1', limit = '20' } = req.query
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const take = parseInt(limit)
    const now  = new Date()

    const where = { isActive: true }
    if (filter === 'upcoming') where.scheduledAt = { gte: now }
    if (filter === 'past')     where.scheduledAt = { lt: now }

    const [meetings, total] = await Promise.all([
      prisma.meeting.findMany({
        where,
        skip,
        take,
        orderBy: { scheduledAt: filter === 'past' ? 'desc' : 'asc' },
        include: {
          _count: { select: { agendaItems: { where: { isActive: true } } } },
          attendees: { where: { isActive: true }, include: { user: { select: { id: true, fullName: true, roles: true } } } },
        },
      }),
      prisma.meeting.count({ where }),
    ])

    const syncMap = await getUserSyncMapForMeetings(req.user?.id, meetings.map((m) => m.id))
    const data = meetings.map((meeting) => ({
      ...meeting,
      userCalendarSync: syncMap.get(meeting.id) || null,
    }))

    res.json({
      data,
      pagination: { total, page: parseInt(page), limit: take, pages: Math.ceil(total / take) },
    })
  } catch (err) {
    next(err)
  }
}

// ─────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────

/**
 * POST /api/meetings
 * Creates a new meeting and optionally adds attendees.
 * @param {import('express').Request}  req - body: { title, scheduledAt, location?, meetingLink?, attendeeIds? }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function create(req, res, next) {
  try {
    const { title, scheduledAt, location, meetingLink, attendeeIds = [] } = req.body

    // Fetch attendee emails for calendar invite
    const attendeeUsers = attendeeIds.length > 0
      ? await prisma.user.findMany({
          where:  { id: { in: attendeeIds } },
          select: { id: true, fullName: true, email: true, roles: true, isActive: true },
        })
      : []

    const invalidAttendees = attendeeUsers.filter(
      (user) => !user.isActive || !isCommitteeMember(user)
    )
    if (attendeeIds.length > 0 && (attendeeUsers.length !== attendeeIds.length || invalidAttendees.length > 0)) {
      await recordBlockedRoleAudit(req, res, {
        meta: {
          endpoint: '/api/meetings',
          requestedUserIds: attendeeIds,
          invalidUsers: invalidAttendees.map((user) => ({
            id: user.id,
            role: getPrimaryRole(user),
            isActive: user.isActive,
          })),
        },
      })
      throw new AppError('One or more users are not committee members', 'ROLE_NOT_ALLOWED', 400)
    }

    const meeting = await prisma.meeting.create({
      data: {
        title,
        scheduledAt: new Date(scheduledAt),
        location,
        meetingLink,
        attendees: attendeeIds.length > 0
          ? { create: attendeeIds.map(userId => ({ userId })) }
          : undefined,
      },
      include: {
        _count: { select: { agendaItems: true } },
        attendees: { include: { user: { select: { id: true, fullName: true, roles: true } } } },
      },
    })

    // Sync to external calendar (non-blocking — failures don't break creation)
    const externalId = await syncCreateToCalendar(meeting, scheduledAt, location, attendeeUsers)
    if (externalId) {
      await prisma.meeting.update({ where: { id: meeting.id }, data: { externalCalendarId: externalId } })
      meeting.externalCalendarId = externalId
    }

    await enqueueUserSyncSafe({
      meetingId: meeting.id,
      operation: 'create',
      targetUserIds: attendeeIds,
    })

    res.locals.entityId = meeting.id
    res.status(201).json({ data: meeting })
  } catch (err) {
    next(err)
  }
}

// ─────────────────────────────────────────────
// GET BY ID
// ─────────────────────────────────────────────

/**
 * GET /api/meetings/:id
 * Returns meeting details with full agenda (submissions) and attendees.
 * @param {import('express').Request}  req - params: { id }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function getById(req, res, next) {
  try {
    const { id } = req.params

    const meeting = await prisma.meeting.findUnique({
      where:   { id },
      include: {
        agendaItems: {
          where:   { isActive: true },
          orderBy: { orderIndex: 'asc' },
          include: {
            submission: {
              select: {
                id: true,
                applicationId: true,
                title: true,
                status: true,
                track: true,
                authorId: true,
                author: { select: { id: true, fullName: true, department: true } },
              },
            },
          },
        },
        attendees: {
          where:   { isActive: true },
          include: { user: { select: { id: true, fullName: true, roles: true, email: true } } },
        },
      },
    })

    if (!meeting || !meeting.isActive) {
      throw new AppError('Meeting not found', 'NOT_FOUND', 404)
    }

    const agendaItems = await Promise.all(
      (meeting.agendaItems || []).map(async (item) => {
        const recusedAttendees = []
        for (const attendee of meeting.attendees || []) {
          const conflict = await hasConflict(attendee.userId, item.submission)
          if (conflict.conflict) {
            recusedAttendees.push({
              userId: attendee.userId,
              reasons: conflict.reasons,
            })
          }
        }
        return {
          ...item,
          recusedAttendees,
        }
      })
    )

    const syncMap = await getUserSyncMapForMeetings(req.user?.id, [meeting.id])
    res.json({
      data: {
        ...meeting,
        agendaItems,
        userCalendarSync: syncMap.get(meeting.id) || null,
      },
    })
  } catch (err) {
    next(err)
  }
}

// ─────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────

/**
 * PUT /api/meetings/:id
 * Updates meeting metadata (title, date, location, etc.).
 * @param {import('express').Request}  req - params: { id }, body: { title?, scheduledAt?, location?, meetingLink?, agendaNote? }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function update(req, res, next) {
  try {
    const { id } = req.params
    const { title, scheduledAt, location, meetingLink, agendaNote } = req.body

    const meeting = await prisma.meeting.findUnique({ where: { id } })
    if (!meeting || !meeting.isActive) {
      throw new AppError('Meeting not found', 'NOT_FOUND', 404)
    }
    if (meeting.status === 'CANCELLED') {
      throw new AppError('Cannot update a cancelled meeting', 'MEETING_CANCELLED', 400)
    }

    const updated = await prisma.meeting.update({
      where: { id },
      data:  {
        ...(title        && { title }),
        ...(scheduledAt  && { scheduledAt: new Date(scheduledAt) }),
        ...(location     !== undefined && { location }),
        ...(meetingLink  !== undefined && { meetingLink }),
        ...(agendaNote   !== undefined && { agendaNote }),
      },
    })

    // Sync update to external calendar (non-blocking)
    if (meeting.externalCalendarId) {
      await syncUpdateToCalendar(meeting.externalCalendarId, { title, scheduledAt, location }, meeting)
    }

    await enqueueUserSyncSafe({
      meetingId: id,
      operation: 'update',
    })

    res.locals.entityId = id
    res.json({ data: updated })
  } catch (err) {
    next(err)
  }
}

// ─────────────────────────────────────────────
// CANCEL (soft-delete)
// ─────────────────────────────────────────────

/**
 * DELETE /api/meetings/:id
 * Cancels a meeting by setting status=CANCELLED and isActive=false.
 * @param {import('express').Request}  req - params: { id }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function cancel(req, res, next) {
  try {
    const { id } = req.params

    const meeting = await prisma.meeting.findUnique({ where: { id } })
    if (!meeting || !meeting.isActive) {
      throw new AppError('Meeting not found', 'NOT_FOUND', 404)
    }

    await prisma.meeting.update({
      where: { id },
      data:  { status: 'CANCELLED', isActive: false },
    })

    // Remove from external calendar (non-blocking)
    if (meeting.externalCalendarId) {
      await syncDeleteToCalendar(meeting.externalCalendarId)
    }

    await enqueueUserSyncSafe({
      meetingId: id,
      operation: 'cancel',
    })

    res.locals.entityId = id
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

// ─────────────────────────────────────────────
// AGENDA — ADD ITEM
// ─────────────────────────────────────────────

/**
 * POST /api/meetings/:id/agenda
 * Adds a submission to the meeting agenda.
 * @param {import('express').Request}  req - params: { id }, body: { submissionId, duration? }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function addAgendaItem(req, res, next) {
  try {
    const { id: meetingId } = req.params
    const { submissionId, duration } = req.body

    const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } })
    if (!meeting || !meeting.isActive) {
      throw new AppError('Meeting not found', 'NOT_FOUND', 404)
    }

    const submission = await prisma.submission.findUnique({ where: { id: submissionId } })
    if (!submission || !submission.isActive) {
      throw new AppError('Submission not found', 'NOT_FOUND', 404)
    }

    // Determine next order index
    const lastItem = await prisma.meetingAgendaItem.findFirst({
      where:   { meetingId, isActive: true },
      orderBy: { orderIndex: 'desc' },
    })
    const orderIndex = (lastItem?.orderIndex ?? 0) + 1

    const item = await prisma.meetingAgendaItem.create({
      data: { meetingId, submissionId, orderIndex, duration },
      include: {
        submission: { select: { id: true, applicationId: true, title: true, status: true } },
      },
    })

    res.locals.entityId = meetingId
    res.status(201).json({ data: item })
  } catch (err) {
    next(err)
  }
}

// ─────────────────────────────────────────────
// AGENDA — REMOVE ITEM
// ─────────────────────────────────────────────

/**
 * DELETE /api/meetings/:id/agenda/:itemId
 * Removes a submission from the meeting agenda (soft-delete).
 * @param {import('express').Request}  req - params: { id, itemId }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function removeAgendaItem(req, res, next) {
  try {
    const { id: meetingId, itemId } = req.params

    const item = await prisma.meetingAgendaItem.findUnique({ where: { id: itemId } })
    if (!item || !item.isActive || item.meetingId !== meetingId) {
      throw new AppError('Agenda item not found', 'NOT_FOUND', 404)
    }

    await prisma.meetingAgendaItem.update({ where: { id: itemId }, data: { isActive: false } })

    res.locals.entityId = meetingId
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

// ─────────────────────────────────────────────
// ATTENDEES — ADD
// ─────────────────────────────────────────────

/**
 * POST /api/meetings/:id/attendees
 * Invites a user to a meeting (creates or reactivates MeetingAttendee record).
 * @param {import('express').Request}  req - params: { id }, body: { userId }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function addAttendee(req, res, next) {
  try {
    const { id: meetingId } = req.params
    const { userId }        = req.body

    const [meeting, user] = await Promise.all([
      prisma.meeting.findUnique({ where: { id: meetingId } }),
      prisma.user.findUnique({ where: { id: userId }, select: { id: true, fullName: true, roles: true, email: true, isActive: true } }),
    ])

    if (!meeting || !meeting.isActive) throw new AppError('Meeting not found', 'NOT_FOUND', 404)
    if (!user)                         throw new AppError('User not found', 'NOT_FOUND', 404)
    if (!user.isActive) {
      await recordBlockedRoleAudit(req, res, {
        entityId: meetingId,
        meta: {
          endpoint: '/api/meetings/:id/attendees',
          targetUserId: userId,
          targetRole: getPrimaryRole(user),
          isActive: false,
        },
      })
      throw new AppError('User is inactive', 'USER_INACTIVE', 400)
    }
    if (!isCommitteeMember(user)) {
      await recordBlockedRoleAudit(req, res, {
        entityId: meetingId,
        meta: {
          endpoint: '/api/meetings/:id/attendees',
          targetUserId: userId,
          targetRole: getPrimaryRole(user),
          isActive: true,
        },
      })
      throw new AppError('Only committee members can be invited to meetings', 'ROLE_NOT_ALLOWED', 400)
    }

    // Upsert: reactivate if previously removed
    const attendee = await prisma.meetingAttendee.upsert({
      where:  { meetingId_userId: { meetingId, userId } },
      create: { meetingId, userId },
      update: { isActive: true },
      include: { user: { select: { id: true, fullName: true, roles: true, email: true } } },
    })

    await enqueueUserSyncSafe({
      meetingId,
      operation: 'create',
      targetUserIds: [userId],
    })

    res.locals.entityId = meetingId
    res.status(201).json({ data: attendee })
  } catch (err) {
    next(err)
  }
}

// ─────────────────────────────────────────────
// ATTENDEES — REMOVE
// ─────────────────────────────────────────────

/**
 * DELETE /api/meetings/:id/attendees/:userId
 * Removes a user from a meeting (soft-delete: isActive=false).
 * @param {import('express').Request}  req - params: { id, userId }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function removeAttendee(req, res, next) {
  try {
    const { id: meetingId, userId } = req.params

    const attendee = await prisma.meetingAttendee.findUnique({
      where: { meetingId_userId: { meetingId, userId } },
    })

    if (!attendee || !attendee.isActive) {
      throw new AppError('Attendee not found', 'NOT_FOUND', 404)
    }

    await prisma.meetingAttendee.update({
      where: { meetingId_userId: { meetingId, userId } },
      data:  { isActive: false },
    })

    try {
      await cancelMeetingUserSyncForAttendee(meetingId, userId)
    } catch (err) {
      console.warn('[Meetings] User calendar sync cancel failed (non-fatal):', err.message)
    }

    res.locals.entityId = meetingId
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

// ─────────────────────────────────────────────
// ATTENDANCE
// ─────────────────────────────────────────────

/**
 * PATCH /api/meetings/:id/attendance
 * Records which users attended the meeting.
 * @param {import('express').Request}  req - params: { id }, body: { attended: [{ userId, attended: boolean }] }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function recordAttendance(req, res, next) {
  try {
    const { id: meetingId } = req.params
    const { attended }      = req.body

    const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } })
    if (!meeting || !meeting.isActive) {
      throw new AppError('Meeting not found', 'NOT_FOUND', 404)
    }

    // Upsert each attendee record
    await Promise.all(
      attended.map(({ userId, attended: didAttend }) =>
        prisma.meetingAttendee.upsert({
          where:  { meetingId_userId: { meetingId, userId } },
          create: { meetingId, userId, attended: didAttend },
          update: { attended: didAttend },
        })
      )
    )

    res.locals.entityId = meetingId
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}
