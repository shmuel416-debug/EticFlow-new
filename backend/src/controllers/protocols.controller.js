/**
 * EthicFlow — Protocols Controller
 * Manages meeting protocol lifecycle: create, edit, finalize, request signatures, sign/decline.
 *
 * Endpoints:
 *   GET    /api/protocols                  — list protocols (paginated, filterable)
 *   POST   /api/protocols                  — create protocol for a meeting
 *   GET    /api/protocols/:id              — get protocol + signatures
 *   PUT    /api/protocols/:id              — update content (DRAFT only)
 *   POST   /api/protocols/:id/finalize     — DRAFT → PENDING_SIGNATURES
 *   POST   /api/protocols/:id/request-signatures — send email tokens to signers
 *   POST   /api/protocol/sign/:token       — sign or decline (public, token-based)
 *   GET    /api/protocols/:id/pdf          — generate + stream protocol PDF
 */

import crypto  from 'crypto'
import prisma  from '../config/database.js'
import { AppError } from '../utils/errors.js'
import { sendEmail } from '../services/email/email.service.js'
import { generateProtocolPdf } from '../services/pdf.service.js'
import { recordAuditEntry } from '../middleware/audit.js'
import { COMMITTEE_ROLES } from '../constants/roles.js'
import { getPrimaryRole } from '../utils/roles.js'
import { hasConflict } from '../services/coi.service.js'

/** Token validity window in hours. */
const TOKEN_TTL_HOURS = 72

/**
 * Hashes a raw token with SHA-256 for safe DB storage.
 * Matches the pattern used in auth.controller.js for reset tokens.
 * @param {string} rawToken
 * @returns {string} hex-encoded SHA-256 hash
 */
function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex')
}

/**
 * Records an audit row for blocked signer role validation.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {string} protocolId
 * @param {object} meta
 * @returns {Promise<void>}
 */
async function recordBlockedRoleAudit(req, res, protocolId, meta) {
  const prevMeta = res.locals.auditMeta
  const prevEntityId = res.locals.entityId

  res.locals.entityId = protocolId
  res.locals.auditMeta = { ...(prevMeta ?? {}), ...(meta ?? {}) }

  try {
    await recordAuditEntry(req, res, 'security.role_violation_blocked', 'Protocol')
  } catch (err) {
    console.error('[Protocols] Failed to write blocked-role audit log:', err.message)
  } finally {
    res.locals.auditMeta = prevMeta
    res.locals.entityId = prevEntityId
  }
}

// ─────────────────────────────────────────────
// LIST
// ─────────────────────────────────────────────

/**
 * GET /api/protocols
 * Returns paginated protocol list, optionally filtered by status or meetingId.
 * @param {import('express').Request}  req - query: { status?, meetingId?, page, limit }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function list(req, res, next) {
  try {
    const { status, meetingId, page = '1', limit = '20' } = req.query
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const take = parseInt(limit)

    const where = { isActive: true }
    if (status)    where.status    = status
    if (meetingId) where.meetingId = meetingId

    const [protocols, total] = await Promise.all([
      prisma.protocol.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          meeting:    { select: { id: true, title: true, scheduledAt: true } },
          signatures: {
            where: { isActive: true },
            include: { user: { select: { id: true, fullName: true, roles: true } } },
          },
        },
      }),
      prisma.protocol.count({ where }),
    ])

    res.json({
      data:       protocols,
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
 * POST /api/protocols
 * Creates a new DRAFT protocol linked to a meeting.
 * Auto-populates title and a basic content scaffold from meeting agenda.
 * @param {import('express').Request}  req - body: { meetingId, title?, contentJson? }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function create(req, res, next) {
  try {
    const { meetingId, title, contentJson } = req.body

    const meeting = await prisma.meeting.findUnique({
      where:   { id: meetingId },
      include: {
        agendaItems: {
          where:   { isActive: true },
          orderBy: { orderIndex: 'asc' },
          include: { submission: { select: { applicationId: true, title: true } } },
        },
      },
    })
    if (!meeting || !meeting.isActive) {
      throw new AppError('Meeting not found', 'NOT_FOUND', 404)
    }

    // Check no active protocol exists for this meeting
    const existing = await prisma.protocol.findFirst({
      where: { meetingId, isActive: true },
    })
    if (existing) {
      throw new AppError('A protocol already exists for this meeting', 'CONFLICT', 409)
    }

    const defaultTitle   = title ?? `פרוטוקול — ${meeting.title}`
    const defaultContent = contentJson ?? buildDefaultContent(meeting)

    const protocol = await prisma.protocol.create({
      data: {
        meetingId,
        title:       defaultTitle,
        contentJson: defaultContent,
        status:      'DRAFT',
      },
      include: {
        meeting:    { select: { id: true, title: true, scheduledAt: true } },
        signatures: true,
      },
    })

    res.locals.entityId = protocol.id
    res.status(201).json({ data: protocol })
  } catch (err) {
    next(err)
  }
}

// ─────────────────────────────────────────────
// GET BY ID
// ─────────────────────────────────────────────

/**
 * GET /api/protocols/:id
 * Returns a protocol with its meeting and signature details.
 * @param {import('express').Request}  req - params: { id }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function getById(req, res, next) {
  try {
    const { id } = req.params

    const protocol = await prisma.protocol.findUnique({
      where:   { id },
      include: {
        meeting: {
          select: { id: true, title: true, scheduledAt: true, location: true },
        },
        signatures: {
          where:   { isActive: true },
          include: { user: { select: { id: true, fullName: true, roles: true, email: true } } },
        },
        documents: {
          where:   { isActive: true },
          select:  { id: true, filename: true, storagePath: true, source: true, createdAt: true },
        },
      },
    })

    if (!protocol || !protocol.isActive) {
      throw new AppError('Protocol not found', 'NOT_FOUND', 404)
    }

    res.json({ data: protocol })
  } catch (err) {
    next(err)
  }
}

// ─────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────

/**
 * PUT /api/protocols/:id
 * Updates a protocol's title or content. Only allowed while status=DRAFT.
 * @param {import('express').Request}  req - params: { id }, body: { title?, contentJson? }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function update(req, res, next) {
  try {
    const { id } = req.params
    const { title, contentJson } = req.body

    const protocol = await prisma.protocol.findUnique({ where: { id } })
    if (!protocol || !protocol.isActive) {
      throw new AppError('Protocol not found', 'NOT_FOUND', 404)
    }
    if (protocol.status !== 'DRAFT') {
      throw new AppError('Only DRAFT protocols can be edited', 'PROTOCOL_NOT_DRAFT', 400)
    }

    const updated = await prisma.protocol.update({
      where: { id },
      data:  {
        ...(title       !== undefined && { title }),
        ...(contentJson !== undefined && { contentJson }),
      },
    })

    res.locals.entityId = id
    res.json({ data: updated })
  } catch (err) {
    next(err)
  }
}

// ─────────────────────────────────────────────
// FINALIZE (DRAFT → PENDING_SIGNATURES)
// ─────────────────────────────────────────────

/**
 * POST /api/protocols/:id/finalize
 * Locks the protocol for editing and marks it as PENDING_SIGNATURES.
 * @param {import('express').Request}  req - params: { id }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function finalize(req, res, next) {
  try {
    const { id } = req.params

    const protocol = await prisma.protocol.findUnique({ where: { id } })
    if (!protocol || !protocol.isActive) {
      throw new AppError('Protocol not found', 'NOT_FOUND', 404)
    }
    if (protocol.status !== 'DRAFT') {
      throw new AppError('Only DRAFT protocols can be finalized', 'PROTOCOL_NOT_DRAFT', 400)
    }

    const updated = await prisma.protocol.update({
      where: { id },
      data:  { status: 'PENDING_SIGNATURES', finalizedAt: new Date() },
    })

    res.locals.entityId = id
    res.json({ data: updated })
  } catch (err) {
    next(err)
  }
}

// ─────────────────────────────────────────────
// REQUEST SIGNATURES
// ─────────────────────────────────────────────

/**
 * POST /api/protocols/:id/request-signatures
 * Creates ProtocolSignature records with email tokens and sends signing links.
 * Idempotent: skips users who already have a PENDING/SIGNED record.
 * @param {import('express').Request}  req - params: { id }, body: { signerIds: string[] }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function requestSignatures(req, res, next) {
  try {
    const { id }        = req.params
    const { signerIds } = req.body

    const protocol = await prisma.protocol.findUnique({
      where:   { id },
      include: { meeting: { select: { title: true } } },
    })
    if (!protocol || !protocol.isActive) {
      throw new AppError('Protocol not found', 'NOT_FOUND', 404)
    }
    if (protocol.status === 'DRAFT') {
      throw new AppError('Protocol must be finalized before requesting signatures', 'PROTOCOL_DRAFT', 400)
    }
    if (protocol.status === 'SIGNED') {
      throw new AppError('Protocol is already fully signed', 'PROTOCOL_SIGNED', 400)
    }

    const signers = await prisma.user.findMany({
      where: {
        id: { in: signerIds },
        isActive: true,
        roles: { hasSome: COMMITTEE_ROLES },
      },
      select: { id: true, email: true, fullName: true, roles: true },
    })
    if (signers.length !== signerIds.length) {
      const allowedSignerIds = new Set(signers.map((signer) => signer.id))
      const blockedSignerIds = signerIds.filter((signerId) => !allowedSignerIds.has(signerId))
      await recordBlockedRoleAudit(req, res, id, {
        endpoint: '/api/protocols/:id/request-signatures',
        requestedSignerIds: signerIds,
        blockedSignerIds,
        resolvedRoles: signers.map((signer) => ({ id: signer.id, role: getPrimaryRole(signer) })),
      })
      throw new AppError(
        'One or more users are not eligible to sign (must be committee members, active)',
        'ROLE_NOT_ALLOWED',
        400
      )
    }

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173'

    // Fetch all existing signature records in one query — avoids N+1
    const existingSigs = await prisma.protocolSignature.findMany({
      where:  { protocolId: id, userId: { in: signers.map(s => s.id) } },
      select: { userId: true },
    })
    const alreadySigned = new Set(existingSigs.map(s => s.userId))

    const created = []

    for (const signer of signers) {
      if (alreadySigned.has(signer.id)) continue

      const rawToken    = crypto.randomBytes(32).toString('hex')
      const tokenExpiry = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000)

      const sig = await prisma.protocolSignature.create({
        data: { protocolId: id, userId: signer.id, token: hashToken(rawToken), tokenExpiry, status: 'PENDING' },
      })

      const signUrl = `${frontendUrl}/protocol/sign/${rawToken}`
      await sendEmail({
        to:      signer.email,
        subject: `בקשה לחתימה על פרוטוקול: ${protocol.title}`,
        html: `
          <div dir="rtl" style="font-family:sans-serif">
            <h2>בקשה לחתימה על פרוטוקול ועדת אתיקה</h2>
            <p>שלום ${signer.fullName},</p>
            <p>הינך מוזמן לחתום על פרוטוקול פגישת ועדת האתיקה: <strong>${protocol.title}</strong></p>
            <p>הקישור בתוקף ל-${TOKEN_TTL_HOURS} שעות.</p>
            <a href="${signUrl}" style="background:#1e3a5f;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;display:inline-block;margin:16px 0">
              לצפייה וחתימה על הפרוטוקול
            </a>
            <p style="color:#64748b;font-size:12px">אם לא ביקשת זאת, ניתן להתעלם ממייל זה.</p>
          </div>
        `,
      }).catch(err => console.error('[Protocol] Email failed for', signer.email, err.message))

      created.push(sig.id)
    }

    res.locals.entityId = id
    res.json({ data: { created: created.length, total: signers.length } })
  } catch (err) {
    next(err)
  }
}

// ─────────────────────────────────────────────
// SIGN / DECLINE (public — token-based)
// ─────────────────────────────────────────────

/**
 * POST /api/protocol/sign/:token
 * Public endpoint — no authentication required.
 * Validates the token, records IP, and updates signature status to SIGNED or DECLINED.
 * If all required signatures are collected, transitions protocol to SIGNED.
 * @param {import('express').Request}  req - params: { token }, body: { action: 'sign'|'decline' }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function signByToken(req, res, next) {
  try {
    const { token: rawToken } = req.params
    const { action } = req.body   // 'sign' | 'decline'

    if (!['sign', 'decline'].includes(action)) {
      throw new AppError('Action must be "sign" or "decline"', 'INVALID_ACTION', 400)
    }

    const sig = await prisma.protocolSignature.findUnique({
      where:   { token: hashToken(rawToken) },
      include: { protocol: true, user: { select: { id: true, fullName: true } } },
    })

    if (!sig || !sig.isActive) {
      throw new AppError('Signature link not found', 'NOT_FOUND', 404)
    }
    if (sig.status !== 'PENDING') {
      throw new AppError('This link has already been used', 'ALREADY_SIGNED', 400)
    }
    if (sig.tokenExpiry && new Date() > sig.tokenExpiry) {
      throw new AppError('This signature link has expired', 'TOKEN_EXPIRED', 400)
    }

    const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
                   ?? req.socket.remoteAddress

    const newStatus = action === 'sign' ? 'SIGNED' : 'DECLINED'
    await prisma.protocolSignature.update({
      where: { id: sig.id },
      data:  {
        status:    newStatus,
        signedAt:  new Date(),
        ipAddress,
        token:     null,   // Invalidate token after use
      },
    })

    // Check if all required signatures are now SIGNED (none remain PENDING)
    const pendingCount = await prisma.protocolSignature.count({
      where: { protocolId: sig.protocolId, status: 'PENDING', isActive: true },
    })
    if (pendingCount === 0 && newStatus === 'SIGNED') {
      await prisma.protocol.update({
        where: { id: sig.protocolId },
        data:  { status: 'SIGNED' },
      })
    }

    res.locals.entityId = sig.protocolId
    res.json({
      data: {
        action:       newStatus,
        protocolId:   sig.protocolId,
        signerName:   sig.user.fullName,
        protocolTitle: sig.protocol.title,
      },
    })
  } catch (err) {
    next(err)
  }
}

// ─────────────────────────────────────────────
// GET PROTOCOL INFO BY TOKEN (public — for sign page preview)
// ─────────────────────────────────────────────

/**
 * GET /api/protocol/sign/:token
 * Public endpoint — returns protocol title and signer name for the sign page UI.
 * Does NOT expose full content or other signatures.
 * @param {import('express').Request}  req - params: { token }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function getSignInfo(req, res, next) {
  try {
    const { token: rawToken } = req.params

    const sig = await prisma.protocolSignature.findUnique({
      where:   { token: hashToken(rawToken) },
      include: {
        protocol: { select: { id: true, title: true, status: true, finalizedAt: true } },
        user:     { select: { id: true, fullName: true } },
      },
    })

    if (!sig || !sig.isActive) {
      throw new AppError('Signature link not found', 'NOT_FOUND', 404)
    }

    const expired = sig.tokenExpiry && new Date() > sig.tokenExpiry

    res.json({
      data: {
        protocolId:    sig.protocol.id,
        protocolTitle: sig.protocol.title,
        protocolStatus: sig.protocol.status,
        finalizedAt:   sig.protocol.finalizedAt,
        signerName:    sig.user.fullName,
        signatureStatus: sig.status,
        expired,
      },
    })
  } catch (err) {
    next(err)
  }
}

// ─────────────────────────────────────────────
// GENERATE PDF
// ─────────────────────────────────────────────

/**
 * GET /api/protocols/:id/pdf
 * Generates a protocol PDF and streams it to the client.
 * @param {import('express').Request}  req - params: { id }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function getPdf(req, res, next) {
  try {
    const { id } = req.params
    const lang = req.query.lang === 'en' ? 'en' : 'he'

    const protocol = await prisma.protocol.findUnique({
      where:   { id },
      include: {
        meeting: {
          select: {
            title: true,
            scheduledAt: true,
            attendees: {
              where: { isActive: true },
              include: { user: { select: { id: true, fullName: true } } },
            },
            agendaItems: {
              where: { isActive: true },
              include: {
                submission: {
                  select: {
                    id: true,
                    applicationId: true,
                    title: true,
                    authorId: true,
                    author: { select: { id: true, fullName: true, department: true } },
                  },
                },
              },
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
        signatures: {
          where:   { isActive: true },
          include: { user: { select: { fullName: true } } },
        },
      },
    })
    if (!protocol || !protocol.isActive) {
      throw new AppError('Protocol not found', 'NOT_FOUND', 404)
    }

    const recusalLines = []
    for (const item of protocol.meeting?.agendaItems || []) {
      const names = []
      for (const attendee of protocol.meeting?.attendees || []) {
        const conflict = await hasConflict(attendee.userId, item.submission)
        if (conflict.conflict) {
          names.push(attendee.user?.fullName || attendee.userId)
        }
      }
      if (names.length > 0) {
        recusalLines.push(`${item.submission?.applicationId || item.submission?.id}: ${names.join(', ')}`)
      }
    }

    const recusalHeading = lang === 'en'
      ? 'Members Recused Due To Conflict Of Interest'
      : 'חברים שנעדרו מהדיון בשל ניגוד עניינים'
    const recusalContent = recusalLines.length > 0
      ? recusalLines.join('\n')
      : (lang === 'en' ? 'No recusals were recorded.' : 'לא נרשמו היעדרויות עקב ניגוד עניינים.')

    const baseSections = Array.isArray(protocol.contentJson?.sections) ? protocol.contentJson.sections : []
    const contentJson = {
      ...protocol.contentJson,
      sections: [
        ...baseSections.filter((section) => section?.heading !== recusalHeading),
        { heading: recusalHeading, content: recusalContent },
      ],
    }

    const { storagePath } = await generateProtocolPdf({ ...protocol, contentJson }, lang)

    res.locals.entityId = id
    res.download(storagePath, `protocol-${lang}-${id}.pdf`)
  } catch (err) {
    next(err)
  }
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/**
 * Builds a default JSON content scaffold from meeting agenda.
 * @param {object} meeting - Meeting with agendaItems included
 * @returns {object} Draft content JSON
 */
function buildDefaultContent(meeting) {
  const agendaLines = meeting.agendaItems.map(
    (item, i) => `${i + 1}. ${item.submission?.applicationId ?? ''} — ${item.submission?.title ?? ''}`
  )

  return {
    sections: [
      {
        heading: 'פתיחה',
        content: `הפגישה נפתחה ב-${new Date(meeting.scheduledAt).toLocaleString('he-IL')}`,
      },
      {
        heading: 'סדר יום',
        content: agendaLines.join('\n') || 'לא הוגדרו פריטים',
      },
      {
        heading: 'דיון והחלטות',
        content: '',
      },
      {
        heading: 'סיום',
        content: '',
      },
    ],
  }
}
