/**
 * EthicFlow — Submissions Controller
 * Manages research submission lifecycle:
 *   list, getById, create, update, continue (clone).
 *
 * Role-based visibility:
 *   RESEARCHER  → own submissions only
 *   REVIEWER    → submissions assigned to them
 *   SECRETARY / CHAIRMAN / ADMIN → all submissions
 */

import prisma from '../config/database.js'
import { AppError } from '../utils/errors.js'
import { getRequestRole, hasAnyRole } from '../utils/roles.js'

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/**
 * Builds a Prisma `where` clause based on the requester's role.
 * @param {{ id: string, roles: string[] }} user
 * @param {string} activeRole
 * @param {object} [extra={}] - Additional where conditions to merge
 * @returns {object} Prisma where clause
 */
function roleFilter(user, activeRole, extra = {}) {
  const base = { isActive: true }
  if (activeRole === 'RESEARCHER') base.authorId  = user.id
  if (activeRole === 'REVIEWER')   base.reviewerId = user.id
  // Merge: if extra has OR (search), wrap everything in AND to avoid conflict
  if (extra.OR) {
    const { OR, ...rest } = extra
    return { AND: [{ ...base, ...rest }, { OR }] }
  }
  return { ...base, ...extra }
}

/**
 * Generates the next applicationId in the format ETH-{YEAR}-{SEQ}.
 * Sequence is zero-padded to 3 digits and increments from the highest existing ID this year.
 * Note: not race-safe for high-concurrency — a DB sequence should be used in production.
 * @returns {Promise<string>} e.g. "ETH-2026-004"
 */
async function generateApplicationId() {
  const year   = new Date().getFullYear()
  const prefix = `ETH-${year}-`

  const last = await prisma.submission.findFirst({
    where:   { applicationId: { startsWith: prefix } },
    orderBy: { applicationId: 'desc' },
    select:  { applicationId: true },
  })

  if (!last) return `${prefix}001`
  const seq = parseInt(last.applicationId.split('-')[2], 10) + 1
  return `${prefix}${String(seq).padStart(3, '0')}`
}

/**
 * Builds a paginated response object.
 * @param {Array}  data
 * @param {number} total
 * @param {number} page
 * @param {number} limit
 * @returns {{ data: Array, pagination: object }}
 */
function paginate(data, total, page, limit) {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  }
}

// ─────────────────────────────────────────────
// CONTROLLERS
// ─────────────────────────────────────────────

/**
 * GET /api/submissions
 * Lists submissions filtered by role, with optional status filter and pagination.
 * @param {import('express').Request} req - query: { status?, statuses?, search?, assignedToMe?, page?, limit? }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function list(req, res, next) {
  try {
    const activeRole = getRequestRole(req)
    const page  = Math.max(1, parseInt(req.query.page  ?? '1',  10))
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit ?? '20', 10)))
    const skip  = (page - 1) * limit

    const extra = {}
    if (req.query.statuses) {
      // Comma-separated list of statuses e.g. ?statuses=IN_REVIEW,APPROVED
      const list = req.query.statuses.split(',').map(s => s.trim()).filter(Boolean)
      if (list.length === 1) extra.status = list[0]
      else if (list.length > 1) extra.status = { in: list }
    } else if (req.query.status) {
      extra.status = req.query.status
    }
    if (req.query.search) {
      extra.OR = [
        { title:         { contains: req.query.search, mode: 'insensitive' } },
        { applicationId: { contains: req.query.search, mode: 'insensitive' } },
      ]
    }
    if (req.query.assignedToMe === 'true' && hasAnyRole(req.user, 'REVIEWER', 'CHAIRMAN')) {
      extra.reviewerId = req.user.id
    }
    const where = roleFilter(req.user, activeRole, extra)

    const [submissions, total] = await Promise.all([
      prisma.submission.findMany({
        where,
        skip,
        take:    limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author:      { select: { id: true, fullName: true, email: true } },
          reviewer:    { select: { id: true, fullName: true, email: true } },
          formConfig:  { select: { id: true, name: true, nameEn: true, version: true } },
          slaTracking: { select: { triageDue: true, reviewDue: true, revisionDue: true, isBreached: true } },
          checklistReviews: {
            where: { status: 'SUBMITTED' },
            orderBy: { submittedAt: 'desc' },
            take: 1,
            select: { recommendation: true },
          },
        },
      }),
      prisma.submission.count({ where }),
    ])
    const data = submissions.map((row) => {
      const recommendation = row.checklistReviews?.[0]?.recommendation ?? null
      const { checklistReviews, ...rest } = row
      return { ...rest, reviewerRecommendation: recommendation }
    })

    res.json(paginate(data, total, page, limit))
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/submissions/coi-candidates
 * Returns lightweight submission options for COI SUBMISSION-scope selection.
 * @param {import('express').Request} req - query: { search?, limit? }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function listCoiCandidates(req, res, next) {
  try {
    const activeRole = getRequestRole(req)
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''
    const limitRaw = Number.parseInt(String(req.query.limit ?? '20'), 10)
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 20
    const extra = {
      status: { not: 'WITHDRAWN' },
    }
    if (search) {
      extra.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { applicationId: { contains: search, mode: 'insensitive' } },
      ]
    }
    const where = roleFilter(req.user, activeRole, extra)
    const data = await prisma.submission.findMany({
      where,
      select: { id: true, applicationId: true, title: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
    res.json({ data })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/submissions/:id
 * Returns a single submission with its version history and active comments.
 * Internal comments are hidden from RESEARCHER role.
 * @param {import('express').Request} req - params: { id }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function getById(req, res, next) {
  try {
    const activeRole = getRequestRole(req)
    const where = roleFilter(req.user, activeRole, { id: req.params.id })

    const submission = await prisma.submission.findFirst({
      where,
      include: {
        author:     { select: { id: true, fullName: true, email: true } },
        reviewer:   { select: { id: true, fullName: true, email: true } },
        formConfig: { select: { id: true, name: true, nameEn: true, version: true, schemaJson: true } },
        versions:   { orderBy: { versionNum: 'asc' } },
        comments: {
          where: {
            isActive:   true,
            ...(activeRole === 'RESEARCHER' ? { isInternal: false } : {}),
          },
          orderBy: { createdAt: 'asc' },
          include: { author: { select: { id: true, fullName: true, roles: true } } },
        },
        slaTracking: true,
      },
    })

    if (!submission) return next(AppError.notFound('Submission'))
    res.json({ submission })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/submissions
 * Creates a new submission for the authenticated researcher.
 * Generates applicationId (ETH-{YEAR}-{SEQ}), saves version 1, creates SLA record.
 * @param {import('express').Request} req - body: { title, formConfigId, dataJson, track? }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function create(req, res, next) {
  try {
    const { title, formConfigId, dataJson, track } = req.body

    // Verify the form exists and is published
    const form = await prisma.formConfig.findUnique({ where: { id: formConfigId } })
    if (!form)            return next(AppError.notFound('Form'))
    if (!form.isPublished) return next(new AppError('Form is not published', 'FORM_NOT_PUBLISHED', 400))
    if (!form.isActive)    return next(new AppError('Form is archived', 'FORM_ARCHIVED', 400))

    const applicationId = await generateApplicationId()

    const submission = await prisma.$transaction(async (tx) => {
      const sub = await tx.submission.create({
        data: {
          applicationId,
          title,
          formConfigId,
          authorId: req.user.id,
          track:    track ?? 'FULL',
          status:   'DRAFT',
        },
      })

      await tx.submissionVersion.create({
        data: {
          submissionId: sub.id,
          versionNum:   1,
          dataJson,
          changedBy:    req.user.id,
          changeNote:   'Initial draft',
        },
      })

      await tx.sLATracking.create({
        data: { submissionId: sub.id },
      })

      return sub
    })

    res.locals.entityId = submission.id
    res.status(201).json({ submission })
  } catch (err) {
    next(err)
  }
}

/**
 * PUT /api/submissions/:id
 * Updates a draft submission's data. Only the owner (RESEARCHER) or SECRETARY/ADMIN may update.
 * Creates a new SubmissionVersion snapshot on each update.
 * Blocked if submission is submitted or beyond.
 * @param {import('express').Request} req - params: { id }, body: { title?, dataJson?, changeNote? }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function update(req, res, next) {
  try {
    const activeRole = getRequestRole(req)
    const existing = await prisma.submission.findFirst({
      where:   { id: req.params.id, isActive: true },
      include: { versions: { orderBy: { versionNum: 'desc' }, take: 1 } },
    })
    if (!existing) return next(AppError.notFound('Submission'))

    // Only owner or privileged roles can edit
    const isOwner = existing.authorId === req.user.id
    const canEdit = hasAnyRole(req.user, 'SECRETARY', 'ADMIN')
    if (!isOwner && !canEdit) return next(AppError.forbidden())

    // Only DRAFT submissions can be edited by researcher
    if (activeRole === 'RESEARCHER' && existing.status !== 'DRAFT') {
      return next(new AppError('Only draft submissions can be edited', 'SUBMISSION_NOT_DRAFT', 400))
    }

    const { title, dataJson, changeNote } = req.body
    const nextVersion = (existing.versions[0]?.versionNum ?? 0) + 1

    const submission = await prisma.$transaction(async (tx) => {
      const data = {}
      if (title    !== undefined) data.title = title

      const sub = Object.keys(data).length
        ? await tx.submission.update({ where: { id: req.params.id }, data })
        : existing

      if (dataJson !== undefined) {
        await tx.submissionVersion.create({
          data: {
            submissionId: sub.id,
            versionNum:   nextVersion,
            dataJson,
            changedBy:    req.user.id,
            changeNote:   changeNote ?? null,
          },
        })
      }

      return sub
    })

    res.locals.entityId = submission.id
    res.json({ submission })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/submissions/:id/continue
 * Creates a continuation submission cloned from an approved original.
 * Sets parentId to original, status = DRAFT, copies latest form data as version 1.
 * @param {import('express').Request} req - params: { id }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function continueSubmission(req, res, next) {
  try {
    const original = await prisma.submission.findFirst({
      where:   { id: req.params.id, authorId: req.user.id, isActive: true },
      include: { versions: { orderBy: { versionNum: 'desc' }, take: 1 } },
    })
    if (!original) return next(AppError.notFound('Submission'))

    if (original.status !== 'APPROVED') {
      return next(new AppError('Only approved submissions can be continued', 'SUBMISSION_NOT_APPROVED', 400))
    }

    const applicationId = await generateApplicationId()
    const sourceData    = original.versions[0]?.dataJson ?? {}

    const submission = await prisma.$transaction(async (tx) => {
      const sub = await tx.submission.create({
        data: {
          applicationId,
          title:        `Continuation — ${original.title}`,
          formConfigId: original.formConfigId,
          authorId:     req.user.id,
          parentId:     original.id,
          track:        original.track,
          status:       'DRAFT',
        },
      })

      await tx.submissionVersion.create({
        data: {
          submissionId: sub.id,
          versionNum:   1,
          dataJson:     sourceData,
          changedBy:    req.user.id,
          changeNote:   `Continued from ${original.applicationId}`,
        },
      })

      await tx.sLATracking.create({
        data: { submissionId: sub.id },
      })

      return sub
    })

    res.locals.entityId = submission.id
    res.status(201).json({ submission })
  } catch (err) {
    next(err)
  }
}

// ─────────────────────────────────────────────
// RESEARCHER SUBMIT
// ─────────────────────────────────────────────

/**
 * POST /api/submissions/:id/submit
 * Transitions a RESEARCHER's own DRAFT submission to SUBMITTED status.
 * Only the submission owner (RESEARCHER) may call this endpoint.
 * @param {import('express').Request}  req - params: { id }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function researcherSubmit(req, res, next) {
  try {
    const sub = await prisma.submission.findFirst({
      where: { id: req.params.id, authorId: req.user.id, isActive: true },
    })
    if (!sub) return next(AppError.notFound('Submission'))
    if (sub.status !== 'DRAFT') {
      return next(new AppError('Only draft submissions can be submitted', 'INVALID_STATUS', 400))
    }

    const updated = await prisma.submission.update({
      where: { id: sub.id },
      data:  { status: 'SUBMITTED', submittedAt: new Date() },
    })

    res.locals.entityId = updated.id
    res.json({ submission: updated })
  } catch (err) {
    next(err)
  }
}

// ─────────────────────────────────────────────
// SECRETARY DASHBOARD
// ─────────────────────────────────────────────

/**
 * GET /api/submissions/dashboard/secretary
 * Returns aggregate stats for the Secretary dashboard.
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function secretaryDashboard(req, res, next) {
  try {
    const [total, inTriage, inReview, pendingRevision, slaBreach, recentSubmissions] =
      await Promise.all([
        prisma.submission.count({ where: { isActive: true, status: { notIn: ['REJECTED', 'WITHDRAWN', 'APPROVED'] } } }),
        prisma.submission.count({ where: { isActive: true, status: 'IN_TRIAGE' } }),
        prisma.submission.count({ where: { isActive: true, status: 'IN_REVIEW' } }),
        prisma.submission.count({ where: { isActive: true, status: 'PENDING_REVISION' } }),
        prisma.sLATracking.count({ where: { submission: { isActive: true }, isBreached: true } }),
        prisma.submission.findMany({
          where:   { isActive: true },
          orderBy: { updatedAt: 'desc' },
          take:    10,
          select:  {
            id:            true,
            applicationId: true,
            title:         true,
            status:        true,
            track:         true,
            updatedAt:     true,
            slaTracking:   { select: { triageDue: true, reviewDue: true, revisionDue: true, isBreached: true } },
            author:        { select: { fullName: true } },
          },
        }),
      ])

    res.json({ data: { total, inTriage, inReview, pendingRevision, slaBreach, recentSubmissions } })
  } catch (err) {
    next(err)
  }
}
