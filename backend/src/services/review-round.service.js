/**
 * Ethic-Net — Review Round Service
 * Manages the lifecycle of review rounds for a submission.
 *
 * A submission has one active round (Submission.currentRound). A new round opens
 * each time the submission is resubmitted after a requested revision, preserving
 * the reviewers and reviews of previous rounds for history and version comparison.
 */

import prisma from '../config/database.js'

/**
 * Returns the active ReviewRound for a submission, creating it lazily if missing.
 * The round snapshots the submission's currently assigned reviewers.
 * @param {string} submissionId
 * @param {import('@prisma/client').Prisma.TransactionClient} [client] - optional tx client
 * @returns {Promise<object>} The active ReviewRound row
 */
export async function ensureCurrentRound(submissionId, client = prisma) {
  const submission = await client.submission.findUnique({
    where: { id: submissionId },
    select: { id: true, currentRound: true, reviewerId: true, secondaryReviewerId: true },
  })
  if (!submission) throw new Error(`Submission ${submissionId} not found`)

  const existing = await client.reviewRound.findUnique({
    where: { submissionId_roundNum: { submissionId, roundNum: submission.currentRound } },
  })
  if (existing) return existing

  return client.reviewRound.create({
    data: {
      submissionId,
      roundNum: submission.currentRound,
      primaryReviewerId: submission.reviewerId ?? null,
      secondaryReviewerId: submission.secondaryReviewerId ?? null,
    },
  })
}

/**
 * Closes the active round of a submission, recording the decision that ended it.
 * Idempotent: re-closing an already-closed round only refreshes the outcome.
 * @param {string} submissionId
 * @param {string} outcome - APPROVED | REJECTED | REVISION_REQUIRED
 * @param {import('@prisma/client').Prisma.TransactionClient} [client]
 * @returns {Promise<object|null>} The closed round, or null when none exists
 */
export async function closeCurrentRound(submissionId, outcome, client = prisma) {
  const submission = await client.submission.findUnique({
    where: { id: submissionId },
    select: { currentRound: true },
  })
  if (!submission) return null

  const round = await client.reviewRound.findUnique({
    where: { submissionId_roundNum: { submissionId, roundNum: submission.currentRound } },
  })
  if (!round) return null

  return client.reviewRound.update({
    where: { id: round.id },
    data: { outcome, closedAt: round.closedAt ?? new Date() },
  })
}

/**
 * Opens the next review round after a revision resubmission.
 * Increments Submission.currentRound, clears the current reviewer assignment so
 * the secretary re-assigns reviewers, and creates the new round row. The previous
 * round (with its reviewers and reviews) is preserved untouched.
 * @param {string} submissionId
 * @param {import('@prisma/client').Prisma.TransactionClient} [client]
 * @returns {Promise<{ submission: object, round: object }>}
 */
export async function openNextRound(submissionId, client = prisma) {
  const current = await client.submission.findUnique({
    where: { id: submissionId },
    select: { currentRound: true, reviewerId: true, secondaryReviewerId: true },
  })
  if (!current) throw new Error(`Submission ${submissionId} not found`)

  const nextRoundNum = current.currentRound + 1
  const submission = await client.submission.update({
    where: { id: submissionId },
    data: { currentRound: nextRoundNum, reviewerId: null, secondaryReviewerId: null },
  })

  const round = await client.reviewRound.create({
    data: { submissionId, roundNum: nextRoundNum },
  })

  return { submission, round }
}

/**
 * Returns the most recently closed (previous) round for a submission, including
 * the reviewers assigned to it — used to show "who reviewed in the previous round".
 * @param {string} submissionId
 * @returns {Promise<object|null>}
 */
export async function getPreviousRound(submissionId) {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    select: { currentRound: true },
  })
  if (!submission || submission.currentRound <= 1) return null

  return prisma.reviewRound.findFirst({
    where: { submissionId, roundNum: { lt: submission.currentRound } },
    orderBy: { roundNum: 'desc' },
    include: {
      primaryReviewer: { select: { id: true, fullName: true, email: true } },
      secondaryReviewer: { select: { id: true, fullName: true, email: true } },
    },
  })
}
