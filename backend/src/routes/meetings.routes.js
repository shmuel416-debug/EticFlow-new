/**
 * EthicFlow — Meetings Routes
 *
 * GET    /api/meetings                          — list meetings (SECRETARY, CHAIRMAN, ADMIN)
 * POST   /api/meetings                          — create meeting (SECRETARY, ADMIN)
 * GET    /api/meetings/:id                      — meeting detail (SECRETARY, CHAIRMAN, ADMIN)
 * PUT    /api/meetings/:id                      — update meeting (SECRETARY, ADMIN)
 * DELETE /api/meetings/:id                      — cancel meeting (SECRETARY, ADMIN)
 * POST   /api/meetings/:id/agenda               — add agenda item (SECRETARY, ADMIN)
 * DELETE /api/meetings/:id/agenda/:itemId       — remove agenda item (SECRETARY, ADMIN)
 * PATCH  /api/meetings/:id/attendance           — record attendance (SECRETARY, ADMIN)
 * POST   /api/meetings/:id/attendees            — invite user to meeting (SECRETARY, ADMIN)
 * DELETE /api/meetings/:id/attendees/:userId    — remove user from meeting (SECRETARY, ADMIN)
 */

import { Router } from 'express'
import { z }      from 'zod'
import { validate, validateQuery } from '../middleware/validate.js'
import { authenticate } from '../middleware/auth.js'
import { authorize }    from '../middleware/role.js'
import { auditLog }     from '../middleware/audit.js'
import * as controller  from '../controllers/meetings.controller.js'

const router = Router()

// ─────────────────────────────────────────────
// ZOD SCHEMAS
// ─────────────────────────────────────────────

const listQuerySchema = z.object({
  filter: z.enum(['upcoming', 'past', 'all']).optional(),
  page:   z.string().regex(/^\d+$/).optional(),
  limit:  z.string().regex(/^\d+$/).optional(),
})

/** Validates URL allows only http/https — blocks javascript: and other protocol XSS */
const safeUrl = z.string().url().refine(
  (u) => /^https?:\/\//i.test(u),
  { message: 'Meeting link must use http or https protocol' }
)

const createSchema = z.object({
  title:       z.string().min(2).max(300),
  scheduledAt: z.string().datetime(),
  location:    z.string().max(300).optional(),
  meetingLink: safeUrl.optional(),
  attendeeIds: z.array(z.string().uuid()).optional(),
})

const updateSchema = z.object({
  title:       z.string().min(2).max(300).optional(),
  scheduledAt: z.string().datetime().optional(),
  location:    z.string().max(300).optional(),
  meetingLink: safeUrl.optional().nullable(),
  agendaNote:  z.string().max(5000).optional(),
})

const agendaItemSchema = z.object({
  submissionId: z.string().uuid(),
  duration:     z.number().int().min(1).max(480).optional(),
})

const attendanceSchema = z.object({
  attended: z.array(z.object({
    userId:   z.string().uuid(),
    attended: z.boolean(),
  })).min(1),
})

const addAttendeeSchema = z.object({
  userId: z.string().uuid(),
})

// ─────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────

router.get(
  '/',
  authenticate,
  authorize('SECRETARY', 'CHAIRMAN', 'ADMIN'),
  validateQuery(listQuerySchema),
  controller.list
)

router.post(
  '/',
  authenticate,
  authorize('SECRETARY', 'ADMIN'),
  validate(createSchema),
  controller.create,
  auditLog('meeting.created', 'Meeting')
)

router.get(
  '/:id',
  authenticate,
  authorize('SECRETARY', 'CHAIRMAN', 'ADMIN'),
  controller.getById
)

router.put(
  '/:id',
  authenticate,
  authorize('SECRETARY', 'ADMIN'),
  validate(updateSchema),
  controller.update,
  auditLog('meeting.updated', 'Meeting')
)

router.delete(
  '/:id',
  authenticate,
  authorize('SECRETARY', 'ADMIN'),
  controller.cancel,
  auditLog('meeting.cancelled', 'Meeting')
)

router.post(
  '/:id/agenda',
  authenticate,
  authorize('SECRETARY', 'ADMIN'),
  validate(agendaItemSchema),
  controller.addAgendaItem,
  auditLog('meeting.agenda_item_added', 'Meeting')
)

router.delete(
  '/:id/agenda/:itemId',
  authenticate,
  authorize('SECRETARY', 'ADMIN'),
  controller.removeAgendaItem,
  auditLog('meeting.agenda_item_removed', 'Meeting')
)

router.patch(
  '/:id/attendance',
  authenticate,
  authorize('SECRETARY', 'ADMIN'),
  validate(attendanceSchema),
  controller.recordAttendance,
  auditLog('meeting.attendance_recorded', 'Meeting')
)

router.post(
  '/:id/attendees',
  authenticate,
  authorize('SECRETARY', 'ADMIN'),
  validate(addAttendeeSchema),
  controller.addAttendee,
  auditLog('meeting.attendee_added', 'Meeting')
)

router.delete(
  '/:id/attendees/:userId',
  authenticate,
  authorize('SECRETARY', 'ADMIN'),
  controller.removeAttendee,
  auditLog('meeting.attendee_removed', 'Meeting')
)

export default router
