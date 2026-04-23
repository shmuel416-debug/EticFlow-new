/**
 * EthicFlow — Privacy Controller
 * Handles consent capture and data subject requests (access/erasure).
 */

import prisma from '../config/database.js'

/**
 * POST /api/privacy/consent
 * Records user consent for privacy policy/legal basis.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function recordConsent(req, res, next) {
  try {
    const consent = await prisma.privacyConsent.create({
      data: {
        userId: req.user.id,
        consentType: req.body.consentType,
        policyVersion: req.body.policyVersion,
        accepted: req.body.accepted === true,
        ipAddress: req.ip || null,
        userAgent: req.get('user-agent') || null,
      },
    })
    res.status(201).json({ data: consent })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/privacy/request
 * Creates a data subject request (ACCESS/ERASURE).
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function createDsrRequest(req, res, next) {
  try {
    const request = await prisma.dataSubjectRequest.create({
      data: {
        userId: req.user.id,
        type: req.body.type,
        details: req.body.details ?? null,
      },
    })
    res.status(201).json({ data: request })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/privacy/request
 * Lists data subject requests for current user.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function listDsrRequests(req, res, next) {
  try {
    const data = await prisma.dataSubjectRequest.findMany({
      where: { userId: req.user.id },
      orderBy: { requestedAt: 'desc' },
    })
    res.json({ data })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/privacy/export
 * Returns an in-app data export payload for the authenticated user.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function exportMyData(req, res, next) {
  try {
    const [user, submissions, comments, documents, consents, dsrRequests] = await Promise.all([
      prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          department: true,
          phone: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.submission.findMany({
        where: { authorId: req.user.id, isActive: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.comment.findMany({
        where: { authorId: req.user.id, isActive: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.document.findMany({
        where: { uploadedById: req.user.id, isActive: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.privacyConsent.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.dataSubjectRequest.findMany({
        where: { userId: req.user.id },
        orderBy: { requestedAt: 'desc' },
      }),
    ])

    res.json({
      data: {
        exportedAt: new Date().toISOString(),
        user,
        submissions,
        comments,
        documents,
        consents,
        dsrRequests,
      },
    })
  } catch (err) {
    next(err)
  }
}
