/**
 * EthicFlow — AI Controller
 * Handles AI analysis requests for submissions.
 *
 * Endpoints:
 *   POST /api/ai/analyze/:subId  — run analysis, persist result, return advisory JSON
 *   GET  /api/ai/analyze/:subId  — fetch latest saved analysis for a submission
 */

import prisma              from '../config/database.js'
import { analyzeSubmission } from '../services/ai/ai.service.js'
import { AppError }        from '../utils/errors.js'
import { getRequestRole } from '../utils/roles.js'

/** Allowed response language values for AI narrative fields. */
const RESPONSE_LANGUAGES = ['he', 'en']

/**
 * Returns a safe response language for AI analysis.
 * Defaults to Hebrew when the client does not provide a valid value.
 * @param {unknown} requestedLanguage
 * @returns {'he' | 'en'}
 */
function resolveResponseLanguage(requestedLanguage) {
  return RESPONSE_LANGUAGES.includes(requestedLanguage) ? requestedLanguage : 'he'
}

// ─────────────────────────────────────────────
// RUN ANALYSIS
// ─────────────────────────────────────────────

/**
 * Runs AI analysis on a submission and persists the result.
 * Any authenticated user with access to the submission may trigger analysis.
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {Function} next
 */
export async function runAnalysis(req, res, next) {
  try {
    const { subId } = req.params
    const responseLanguage = resolveResponseLanguage(req.body?.responseLanguage)

    const submission = await prisma.submission.findUnique({
      where:   { id: subId },
      include: {
        versions: { orderBy: { versionNum: 'desc' }, take: 1 },
        documents: {
          where: { isActive: true },
          select: { id: true, originalName: true, mimeType: true, sizeBytes: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!submission || !submission.isActive) {
      throw new AppError('Submission not found', 'NOT_FOUND', 404)
    }

    // Access control: researchers see only own, reviewers see assigned
    const role = getRequestRole(req)
    const { id: userId } = req.user
    if (role === 'RESEARCHER' && submission.authorId !== userId) {
      throw new AppError('Forbidden', 'FORBIDDEN', 403)
    }
    if (role === 'REVIEWER' && submission.reviewerId !== userId) {
      throw new AppError('Forbidden', 'FORBIDDEN', 403)
    }

    const latestData = submission.versions[0]?.dataJson ?? {}
    const documentContext = submission.documents.map((doc) => ({
      id: doc.id,
      name: doc.originalName,
      mimeType: doc.mimeType,
      sizeBytes: doc.sizeBytes,
      uploadedAt: doc.createdAt,
    }))

    // Run analysis (provider-agnostic)
    const resultJson = await analyzeSubmission({
      title:    submission.title,
      track:    submission.track,
      dataJson: latestData,
      documents: documentContext,
      responseLanguage,
    })

    // Persist result
    const analysis = await prisma.aIAnalysis.create({
      data: {
        submissionId: subId,
        requestedBy:  userId,
        provider:     process.env.AI_PROVIDER ?? 'mock',
        prompt:       `analyze:${submission.applicationId}:answers+documents(${documentContext.length}):lang(${responseLanguage})`,
        resultJson,
      },
    })

    res.json({ data: { id: analysis.id, createdAt: analysis.createdAt, result: resultJson } })
  } catch (err) {
    next(err)
  }
}

// ─────────────────────────────────────────────
// GET LATEST ANALYSIS
// ─────────────────────────────────────────────

/**
 * Returns the most recent AI analysis for a submission.
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {Function} next
 */
export async function getLatest(req, res, next) {
  try {
    const { subId } = req.params

    const submission = await prisma.submission.findUnique({ where: { id: subId } })
    if (!submission || !submission.isActive) {
      throw new AppError('Submission not found', 'NOT_FOUND', 404)
    }

    const role = getRequestRole(req)
    const { id: userId } = req.user
    if (role === 'RESEARCHER' && submission.authorId !== userId) {
      throw new AppError('Forbidden', 'FORBIDDEN', 403)
    }
    if (role === 'REVIEWER' && submission.reviewerId !== userId) {
      throw new AppError('Forbidden', 'FORBIDDEN', 403)
    }

    const analysis = await prisma.aIAnalysis.findFirst({
      where:   { submissionId: subId, isActive: true },
      orderBy: { createdAt: 'desc' },
    })

    if (!analysis) {
      return res.json({ data: null })
    }

    res.json({ data: { id: analysis.id, createdAt: analysis.createdAt, result: analysis.resultJson } })
  } catch (err) {
    next(err)
  }
}
