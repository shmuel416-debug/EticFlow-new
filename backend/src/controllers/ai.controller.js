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

    const submission = await prisma.submission.findUnique({
      where:   { id: subId },
      include: {
        versions: { orderBy: { versionNum: 'desc' }, take: 1 },
      },
    })

    if (!submission || !submission.isActive) {
      throw new AppError('Submission not found', 'NOT_FOUND', 404)
    }

    // Access control: researchers see only own, reviewers see assigned
    const { role, id: userId } = req.user
    if (role === 'RESEARCHER' && submission.authorId !== userId) {
      throw new AppError('Forbidden', 'FORBIDDEN', 403)
    }
    if (role === 'REVIEWER' && submission.reviewerId !== userId) {
      throw new AppError('Forbidden', 'FORBIDDEN', 403)
    }

    const latestData = submission.versions[0]?.dataJson ?? {}

    // Run analysis (provider-agnostic)
    const resultJson = await analyzeSubmission({
      title:    submission.title,
      track:    submission.track,
      dataJson: latestData,
    })

    // Persist result
    const analysis = await prisma.aIAnalysis.create({
      data: {
        submissionId: subId,
        requestedBy:  userId,
        provider:     process.env.AI_PROVIDER ?? 'mock',
        prompt:       `analyze:${submission.applicationId}`,
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

    const { role, id: userId } = req.user
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
