/**
 * Ethic-Net — Submission Status Controller
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
import { getRequestRole } from '../utils/roles.js'
import { hasConflict } from '../services/coi.service.js'
import { getOrCreateReview } from '../services/reviewerChecklist.service.js'
import { ensureCurrentRound, closeCurrentRound, openNextRound } from '../services/review-round.service.js'
import { generateApprovalLetter, generateRejectionLetter } from '../services/pdf.service.js'

const COMMITTEE_DECISION_SETTINGS_KEYS = ['decision_model', 'committee_quorum_min_votes', 'enforce_meeting_voting']

/**
 * Loads decision-model settings used for committee votes.
 * @returns {Promise<{ decisionModel: string, quorum: number }>}
 */
async function getCommitteeDecisionSettings() {
  const decisionSettings = await prisma.institutionSetting.findMany({
    where: {
      key: { in: COMMITTEE_DECISION_SETTINGS_KEYS },
      isActive: true,
    },
  })
  const settingMap = Object.fromEntries(decisionSettings.map((item) => [item.key, item.value]))
  const decisionModel = settingMap.decision_model || 'IRB_FULL'
  const parsedQuorum = parseInt(settingMap.committee_quorum_min_votes || '3', 10)
  const quorum = Number.isFinite(parsedQuorum) && parsedQuorum > 0 ? parsedQuorum : 3
  return { decisionModel, quorum }
}

/**
 * Returns true when committee votes must be cast during an active meeting agenda item.
 * @returns {Promise<boolean>}
 */
async function isMeetingVotingEnforced() {
  const setting = await prisma.institutionSetting.findUnique({
    where: { key: 'enforce_meeting_voting' },
    select: { value: true, isActive: true },
  })
  return setting?.isActive !== false && setting?.value === 'true'
}

/**
 * Resolves the active meeting agenda item for a submission, if any.
 * @param {string} submissionId
 * @returns {Promise<object|null>}
 */
async function findActiveAgendaItem(submissionId) {
  return prisma.meetingAgendaItem.findFirst({
    where: {
      submissionId,
      isActive: true,
      meeting: { status: { in: ['SCHEDULED', 'IN_PROGRESS'] }, isActive: true },
    },
    select: { id: true, meetingId: true },
  })
}

/**
 * Calculates vote counters for a submission.
 * @param {Array<{ decision: string }>} votes
 * @returns {{
 *   total: number,
 *   approved: number,
 *   rejected: number,
 *   revisionRequired: number,
 *   abstain: number,
 *   nonAbstain: number
 * }}
 */
function summarizeVotes(votes) {
  return votes.reduce((acc, vote) => {
    acc.total += 1
    if (vote.decision === 'APPROVED') acc.approved += 1
    if (vote.decision === 'REJECTED') acc.rejected += 1
    if (vote.decision === 'REVISION_REQUIRED') acc.revisionRequired += 1
    if (vote.decision === 'ABSTAIN') acc.abstain += 1
    if (vote.decision !== 'ABSTAIN') acc.nonAbstain += 1
    return acc
  }, {
    total: 0,
    approved: 0,
    rejected: 0,
    revisionRequired: 0,
    abstain: 0,
    nonAbstain: 0,
  })
}

/**
 * Resolves whether committee voting must be enforced for this decision.
 * @param {{ decision: string, requiresCommittee?: boolean }} payload
 * @param {string} decisionModel
 * @returns {boolean}
 */
function resolveRequiresCommitteeVote(payload, decisionModel) {
  if (payload.decision === 'REVISION_REQUIRED') return false
  if (typeof payload.requiresCommittee === 'boolean') return payload.requiresCommittee
  return decisionModel === 'IRB_FULL'
}

/**
 * Throws AppError when transition is not allowed for current role/context.
 * @param {{ status: string }} submission
 * @param {string} nextStatus
 * @param {string} activeRole
 * @returns {Promise<void>}
 */
async function assertTransitionAllowed(submission, nextStatus, activeRole) {
  const allowed = await getAllowedTransitions(submission.status, activeRole, submission)
  if (!allowed.next.includes(nextStatus)) {
    throw new AppError(`Cannot move from ${submission.status} to ${nextStatus}`, 'INVALID_TRANSITION', 400)
  }
}

/**
 * Fetches a submission or throws 404.
 * @param {string} id
 * @returns {Promise<object>}
 */
async function findOrFail(id) {
  const sub = await prisma.submission.findFirst({
    where:   { id, isActive: true },
    include: {
      author:            { select: { id: true, email: true, fullName: true } },
      reviewer:          { select: { id: true, email: true, fullName: true } },
      secondaryReviewer: { select: { id: true, email: true, fullName: true } },
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
    const activeRole = getRequestRole(req)
    const sub       = await findOrFail(req.params.id)
    const newStatus = req.body.status

    await assertTransitionAllowed(sub, newStatus, activeRole)

    // Resubmitting from a revision state opens a fresh review round so the
    // previous cycle's reviewers/reviews are preserved and new ones are chosen.
    const opensNewRound = ['REVISION_DRAFT', 'PENDING_REVISION'].includes(sub.status) && newStatus === 'SUBMITTED'

    const updated = await prisma.$transaction(async (tx) => {
      if (opensNewRound) await openNextRound(sub.id, tx)
      return tx.submission.update({
        where: { id: sub.id },
        data:  { status: newStatus, ...(newStatus === 'SUBMITTED' ? { submittedAt: new Date() } : {}) },
        include: { author: { select: { id: true, email: true } }, reviewer: { select: { id: true, email: true } } },
      })
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
    const activeRole = getRequestRole(req)
    const sub = await findOrFail(req.params.id)
    const allowedAssign = await can('ASSIGN', sub.status, activeRole)
    if (!allowedAssign) return next(AppError.forbidden())

    const reviewer = await prisma.user.findFirst({
      where: { id: req.body.reviewerId, roles: { hasSome: ['REVIEWER', 'CHAIRMAN'] }, isActive: true },
    })
    if (!reviewer) return next(AppError.notFound('Reviewer'))

    const conflictCheck = await hasConflict(reviewer.id, sub)
    if (conflictCheck.conflict) {
      return next(new AppError('Conflict of interest', 'COI_BLOCKED', 400, { reasons: conflictCheck.reasons }))
    }

    if (sub.status !== 'ASSIGNED') {
      await assertTransitionAllowed({ ...sub, reviewerId: reviewer.id }, 'ASSIGNED', activeRole)
    }

    const updated = await prisma.submission.update({
      where: { id: sub.id },
      data:  { reviewerId: reviewer.id, status: 'ASSIGNED' },
      include: {
        author:   { select: { id: true, email: true } },
        reviewer: { select: { id: true, email: true } },
      },
    })

    // Record the primary reviewer on the active round (round history per cycle).
    const round = await ensureCurrentRound(updated.id)
    await prisma.reviewRound.update({ where: { id: round.id }, data: { primaryReviewerId: reviewer.id } })

    // Checklist creation is best-effort: assignment must not be blocked
    // when no active checklist template exists for the submission track.
    getOrCreateReview(updated.id, reviewer.id).catch(() => {})

    setDueDates(sub.id, 'ASSIGNED').catch(() => {})
    notifyStatusChange(updated, 'ASSIGNED').catch(() => {})
    res.json({ submission: updated })
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/submissions/:id/assign-secondary
 * Assigns a secondary reviewer (in addition to the primary) and, on the first
 * secondary assignment, moves status ASSIGNED → ASSIGNED_SECONDARY. Re-assigning
 * a secondary reviewer keeps the current status.
 * @param {import('express').Request} req - body: { reviewerId }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function assignSecondaryReviewer(req, res, next) {
  try {
    const activeRole = getRequestRole(req)
    const sub = await findOrFail(req.params.id)
    const allowedAssign = await can('ASSIGN', sub.status, activeRole)
    if (!allowedAssign) return next(AppError.forbidden())

    if (!sub.reviewerId) {
      return next(new AppError('A primary reviewer must be assigned first', 'PRIMARY_REVIEWER_REQUIRED', 400))
    }
    if (req.body.reviewerId === sub.reviewerId) {
      return next(new AppError('Secondary reviewer must differ from the primary reviewer', 'DUPLICATE_REVIEWER', 400))
    }

    const reviewer = await prisma.user.findFirst({
      where: { id: req.body.reviewerId, roles: { hasSome: ['REVIEWER', 'CHAIRMAN'] }, isActive: true },
    })
    if (!reviewer) return next(AppError.notFound('Reviewer'))

    const conflictCheck = await hasConflict(reviewer.id, sub)
    if (conflictCheck.conflict) {
      return next(new AppError('Conflict of interest', 'COI_BLOCKED', 400, { reasons: conflictCheck.reasons }))
    }

    // First secondary assignment advances ASSIGNED → ASSIGNED_SECONDARY.
    // Re-assigning while already in ASSIGNED_SECONDARY keeps the status.
    const shouldTransition = sub.status === 'ASSIGNED'
    if (shouldTransition) {
      await assertTransitionAllowed(sub, 'ASSIGNED_SECONDARY', activeRole)
    }

    const updated = await prisma.submission.update({
      where: { id: sub.id },
      data:  {
        secondaryReviewerId: reviewer.id,
        ...(shouldTransition ? { status: 'ASSIGNED_SECONDARY' } : {}),
      },
      include: {
        author:            { select: { id: true, email: true } },
        reviewer:          { select: { id: true, email: true } },
        secondaryReviewer: { select: { id: true, email: true } },
      },
    })

    // Record the secondary reviewer on the active round (round history per cycle).
    const round = await ensureCurrentRound(updated.id)
    await prisma.reviewRound.update({ where: { id: round.id }, data: { secondaryReviewerId: reviewer.id } })

    // Checklist creation is best-effort: assignment must not be blocked
    // when no active checklist template exists for the submission track.
    getOrCreateReview(updated.id, reviewer.id).catch(() => {})

    setDueDates(sub.id, 'ASSIGNED_SECONDARY').catch(() => {})
    notifyStatusChange(updated, 'ASSIGNED_SECONDARY').catch(() => {})
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
    const activeRole = getRequestRole(req)
    const sub = await findOrFail(req.params.id)
    const isAssignedReviewer = sub.reviewerId === req.user.id || sub.secondaryReviewerId === req.user.id
    const allowedSubmitReview = await can('SUBMIT_REVIEW', sub.status, activeRole)
    const assignedChairman = activeRole === 'CHAIRMAN' && isAssignedReviewer
    if (!allowedSubmitReview && !assignedChairman) return next(AppError.forbidden())

    if (!['ASSIGNED', 'ASSIGNED_SECONDARY'].includes(sub.status)) {
      return next(new AppError('Submission must be in a reviewer-assigned state to submit a review', 'INVALID_TRANSITION', 400))
    }
    if (!isAssignedReviewer) return next(AppError.forbidden())

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
 * POST /api/submissions/:id/votes
 * Records or updates one committee member vote for a submission.
 * @param {import('express').Request} req - body: { decision, note? }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function recordVote(req, res, next) {
  try {
    const sub = await findOrFail(req.params.id)
    if (!['IN_REVIEW', 'PENDING_REVISION'].includes(sub.status)) {
      return next(new AppError('Voting is allowed only during review phases', 'INVALID_TRANSITION', 400))
    }

    let meetingId = null
    if (await isMeetingVotingEnforced()) {
      const agendaItem = await findActiveAgendaItem(sub.id)
      if (!agendaItem) {
        return next(new AppError('Submission is not on an active meeting agenda', 'NOT_ON_AGENDA', 400))
      }
      const attendee = await prisma.meetingAttendee.findFirst({
        where: {
          meetingId: agendaItem.meetingId,
          userId: req.user.id,
          isActive: true,
        },
      })
      if (!attendee) {
        return next(new AppError('Only invited meeting participants may vote', 'NOT_MEETING_ATTENDEE', 403))
      }
      meetingId = agendaItem.meetingId
    }

    const vote = await prisma.submissionVote.upsert({
      where: {
        submissionId_voterId: {
          submissionId: sub.id,
          voterId: req.user.id,
        },
      },
      create: {
        submissionId: sub.id,
        voterId: req.user.id,
        meetingId,
        decision: req.body.decision,
        note: req.body.note ?? null,
      },
      update: {
        meetingId,
        decision: req.body.decision,
        note: req.body.note ?? null,
      },
    })

    res.locals.entityId = vote.id
    res.status(201).json({ vote })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/submissions/:id/votes
 * Returns committee vote list and tally for decision screens.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function getVotes(req, res, next) {
  try {
    const sub = await findOrFail(req.params.id)
    const { decisionModel, quorum } = await getCommitteeDecisionSettings()
    const votes = await prisma.submissionVote.findMany({
      where: { submissionId: sub.id },
      orderBy: { updatedAt: 'desc' },
      include: {
        voter: {
          select: { id: true, fullName: true, roles: true },
        },
      },
    })
    const tally = summarizeVotes(votes)
    res.json({
      data: {
        votes,
        summary: {
          ...tally,
          quorum,
          quorumMet: tally.total >= quorum,
          decisionModel,
          requiresCommitteeByDefault: decisionModel === 'IRB_FULL',
        },
      },
    })
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/submissions/:id/decision
 * Chairman records final decision — maps decision to SubStatus.
 * @param {import('express').Request} req - body: { decision, requiresCommittee?, note? }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function recordDecision(req, res, next) {
  try {
    const activeRole = getRequestRole(req)
    const sub = await findOrFail(req.params.id)
    const allowedDecision = await can('RECORD_DECISION', sub.status, activeRole)
    if (!allowedDecision) return next(AppError.forbidden())

    const STATUS_MAP = { APPROVED: 'APPROVED', REJECTED: 'REJECTED', REVISION_REQUIRED: 'PENDING_REVISION' }
    const newStatus  = STATUS_MAP[req.body.decision]
    if (!newStatus) return next(new AppError('Invalid decision value', 'VALIDATION_ERROR', 400))
    await assertTransitionAllowed(sub, newStatus, activeRole)

    const ops = [prisma.submission.update({
      where: { id: sub.id },
      data: {
        status: newStatus,
        ...(newStatus === 'APPROVED' ? { approvalRoute: 'EXPEDITED' } : {}),
      },
    })]

    if (req.body.note) {
      ops.push(prisma.comment.create({
        data: { submissionId: sub.id, authorId: req.user.id, content: req.body.note, isInternal: false },
      }))
    }

    await prisma.$transaction(ops)

    // Close the active review round, recording the decision that ended it.
    // Preserves reviewers/reviews of this cycle for history and version diff.
    await closeCurrentRound(sub.id, req.body.decision).catch(() => {})

    const updated = await findOrFail(sub.id)
    if (newStatus === 'APPROVED') {
      generateApprovalLetter(sub.id, 'he').catch(() => {})
    }
    if (newStatus === 'REJECTED') {
      generateRejectionLetter(sub.id, 'he').catch(() => {})
    }
    setDueDates(sub.id, newStatus).catch(() => {})
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
    const activeRole = getRequestRole(req)
    const sub = await findOrFail(req.params.id)
    if (activeRole === 'REVIEWER' && sub.reviewerId !== req.user.id) {
      return next(AppError.forbidden())
    }

    const isInternal = activeRole !== 'RESEARCHER' && (req.body.isInternal === true)

    const comment = await prisma.comment.create({
      data: {
        submissionId: sub.id,
        authorId:     req.user.id,
        content:      req.body.content,
        fieldKey:     req.body.fieldKey ?? null,
        isInternal,
      },
      include: { author: { select: { id: true, fullName: true, roles: true } } },
    })

    res.status(201).json({ comment })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/submissions/:id/withdraw
 * Withdraws an active submission and optionally records a reason comment.
 * @param {import('express').Request} req - body: { note? }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function withdrawSubmission(req, res, next) {
  try {
    const sub = await findOrFail(req.params.id)
    const isOwner = sub.authorId === req.user.id
    const isPrivileged = ['SECRETARY', 'ADMIN'].includes(req.user.role)
    if (!isOwner && !isPrivileged) return next(AppError.forbidden())

    const blockedStatuses = ['APPROVED', 'REJECTED', 'WITHDRAWN', 'CONTINUED']
    if (blockedStatuses.includes(sub.status)) {
      return next(new AppError('Submission cannot be withdrawn in its current status', 'INVALID_TRANSITION', 400))
    }

    const txOps = [
      prisma.submission.update({
        where: { id: sub.id },
        data: { status: 'WITHDRAWN', reviewerId: null },
      }),
    ]

    const note = (req.body.note || '').trim()
    if (note) {
      txOps.push(
        prisma.comment.create({
          data: {
            submissionId: sub.id,
            authorId: req.user.id,
            content: note,
            isInternal: false,
          },
        })
      )
    }

    await prisma.$transaction(txOps)
    await setDueDates(sub.id, 'WITHDRAWN').catch(() => {})
    const updated = await findOrFail(sub.id)
    res.json({ submission: updated })
  } catch (err) {
    next(err)
  }
}
