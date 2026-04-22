/**
 * EthicFlow — Submission Status Controller
 * Handles all status-transition actions for submissions:
 *   transitionStatus, assignReviewer, submitReview, recordDecision, addComment.
 *
 * Transition matrix and role/action permissions are loaded from status.service.
 */

import prisma from '../config/database.js'
import { AppError } from '../utils/errors.js'
import { notifyStatusChange } from '../services/notification.service.js'
import { setDueDates } from '../services/sla.service.js'
import { can, getAllowedTransitions } from '../services/status.service.js'

/**
 * Fetches a submission or throws 404.
 * @param {string} id
 * @returns {Promise<object>}
 */
async function findOrFail(id) {
  const sub = await prisma.submission.findFirst({
    where:   { id, isActive: true },
    include: {
      author:   { select: { id: true, email: true, fullName: true } },
      reviewer: { select: { id: true, email: true, fullName: true } },
    },
  })
  if (!sub) throw AppError.notFound('Submission')
  return sub
}

/**
 * PATCH /api/submissions/:id/status
 * Advances submission through the workflow. Validates allowed transitions.
 * @param {import('express').Request} req - body: { status, note? }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function transitionStatus(req, res, next) {
  try {
    const sub       = await findOrFail(req.params.id)
    const newStatus = req.body.status

    const transition = await getAllowedTransitions(sub.status, req.user.role, sub)
    if (!transition.next.includes(newStatus)) {
      return next(new AppError(`Cannot move from ${sub.status} to ${newStatus}`, 'INVALID_TRANSITION', 400))
    }

    const updated = await prisma.submission.update({
      where: { id: sub.id },
      data:  { status: newStatus, ...(newStatus === 'SUBMITTED' ? { submittedAt: new Date() } : {}) },
      include: { author: { select: { id: true, email: true } }, reviewer: { select: { id: true, email: true } } },
    })

    setDueDates(sub.id, newStatus).catch(() => {})
    notifyStatusChange(updated, newStatus).catch(() => {})
    res.json({ submission: updated })
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/submissions/:id/assign
 * Assigns a reviewer and moves status to ASSIGNED.
 * @param {import('express').Request} req - body: { reviewerId }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function assignReviewer(req, res, next) {
  try {
    const sub = await findOrFail(req.params.id)
    const allowedAssign = await can('ASSIGN', sub.status, req.user.role)
    if (!allowedAssign) return next(AppError.forbidden())

    if (!['IN_TRIAGE','ASSIGNED'].includes(sub.status)) {
      return next(new AppError('Submission must be IN_TRIAGE or ASSIGNED to assign a reviewer', 'INVALID_TRANSITION', 400))
    }

    const reviewer = await prisma.user.findFirst({
      where: { id: req.body.reviewerId, role: 'REVIEWER', isActive: true },
    })
    if (!reviewer) return next(AppError.notFound('Reviewer'))

    const updated = await prisma.submission.update({
      where: { id: sub.id },
      data:  { reviewerId: reviewer.id, status: 'ASSIGNED' },
      include: {
        author:   { select: { id: true, email: true } },
        reviewer: { select: { id: true, email: true } },
      },
    })

    setDueDates(sub.id, 'ASSIGNED').catch(() => {})
    notifyStatusChange(updated, 'ASSIGNED').catch(() => {})
    res.json({ submission: updated })
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/submissions/:id/review
 * Reviewer submits their review — adds comment and moves to IN_REVIEW.
 * @param {import('express').Request} req - body: { score, recommendation, comments }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function submitReview(req, res, next) {
  try {
    const sub = await findOrFail(req.params.id)
    const allowedSubmitReview = await can('SUBMIT_REVIEW', sub.status, req.user.role)
    if (!allowedSubmitReview) return next(AppError.forbidden())

    if (sub.status !== 'ASSIGNED') {
      return next(new AppError('Submission must be ASSIGNED to submit a review', 'INVALID_TRANSITION', 400))
    }
    if (sub.reviewerId !== req.user.id) return next(AppError.forbidden())

    const { score, recommendation, comments } = req.body
    const commentBody = `[Score: ${score}/5 | ${recommendation}]\n${comments}`

    await prisma.$transaction([
      prisma.comment.create({
        data: {
          submissionId: sub.id,
          authorId:     req.user.id,
          content:      commentBody,
          isInternal:   false,
        },
      }),
      prisma.submission.update({
        where: { id: sub.id },
        data:  { status: 'IN_REVIEW' },
      }),
    ])

    const updated = await findOrFail(sub.id)
    setDueDates(sub.id, 'IN_REVIEW').catch(() => {})
    notifyStatusChange(updated, 'IN_REVIEW').catch(() => {})
    res.json({ submission: updated })
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/submissions/:id/decision
 * Chairman records final decision — maps decision to SubStatus.
 * @param {import('express').Request} req - body: { decision, note? }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function recordDecision(req, res, next) {
  try {
    const sub = await findOrFail(req.params.id)
    const allowedDecision = await can('RECORD_DECISION', sub.status, req.user.role)
    if (!allowedDecision) return next(AppError.forbidden())

    if (sub.status !== 'IN_REVIEW') {
      return next(new AppError('Submission must be IN_REVIEW for a decision', 'INVALID_TRANSITION', 400))
    }

    const STATUS_MAP = { APPROVED: 'APPROVED', REJECTED: 'REJECTED', REVISION_REQUIRED: 'PENDING_REVISION' }
    const newStatus  = STATUS_MAP[req.body.decision]
    if (!newStatus) return next(new AppError('Invalid decision value', 'VALIDATION_ERROR', 400))

    const ops = [prisma.submission.update({ where: { id: sub.id }, data: { status: newStatus } })]

    if (req.body.note) {
      ops.push(prisma.comment.create({
        data: { submissionId: sub.id, authorId: req.user.id, content: req.body.note, isInternal: false },
      }))
    }

    await prisma.$transaction(ops)

    const updated = await findOrFail(sub.id)
    notifyStatusChange(updated, newStatus).catch(() => {})
    res.json({ submission: updated })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/submissions/:id/comments
 * Adds a comment to a submission. Internal comments hidden from RESEARCHER.
 * @param {import('express').Request} req - body: { content, fieldKey?, isInternal? }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function addComment(req, res, next) {
  try {
    const sub = await findOrFail(req.params.id)

    const isInternal = req.user.role !== 'RESEARCHER' && (req.body.isInternal === true)

    const comment = await prisma.comment.create({
      data: {
        submissionId: sub.id,
        authorId:     req.user.id,
        content:      req.body.content,
        fieldKey:     req.body.fieldKey ?? null,
        isInternal,
      },
      include: { author: { select: { id: true, fullName: true, role: true } } },
    })

    res.status(201).json({ comment })
  } catch (err) {
    next(err)
  }
}
