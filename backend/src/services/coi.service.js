/**
 * EthicFlow — Conflict of Interest Service
 * Central COI resolution logic for reviewer assignment and agenda recusals.
 */

import prisma from '../config/database.js'

/**
 * Builds a normalized reason entry.
 * @param {string} code
 * @param {string} message
 * @returns {{ code: string, message: string }}
 */
function reason(code, message) {
  return { code, message }
}

/**
 * Loads an active submission with author context.
 * @param {string} submissionId
 * @returns {Promise<object|null>}
 */
async function loadSubmission(submissionId) {
  if (!submissionId) return null
  return prisma.submission.findFirst({
    where: { id: submissionId, isActive: true },
    include: {
      author: { select: { id: true, fullName: true, department: true } },
    },
  })
}

/**
 * Returns active declarations by declarer.
 * @param {string} reviewerId
 * @returns {Promise<object[]>}
 */
async function listActiveDeclarations(reviewerId) {
  return prisma.conflictDeclaration.findMany({
    where: { declarerId: reviewerId, isActive: true },
    orderBy: { declaredAt: 'desc' },
  })
}

/**
 * Evaluates whether a reviewer conflicts with a submission.
 * @param {string} reviewerId
 * @param {string|object} submissionInput
 * @returns {Promise<{ conflict: boolean, reasons: Array<{ code: string, message: string }> }>}
 */
export async function hasConflict(reviewerId, submissionInput) {
  const submission = typeof submissionInput === 'string'
    ? await loadSubmission(submissionInput)
    : submissionInput

  if (!submission) {
    return { conflict: false, reasons: [] }
  }

  const reasons = []
  if (reviewerId === submission.authorId) {
    reasons.push(reason('SELF_REVIEW_BLOCKED', 'Reviewer cannot review their own submission'))
  }

  const declarations = await listActiveDeclarations(reviewerId)
  for (const declaration of declarations) {
    if (declaration.scope === 'GLOBAL') {
      reasons.push(reason('GLOBAL_DECLARATION', declaration.reason))
      continue
    }
    if (declaration.scope === 'SUBMISSION' && declaration.targetSubmissionId === submission.id) {
      reasons.push(reason('SUBMISSION_DECLARATION', declaration.reason))
      continue
    }
    if (declaration.scope === 'USER' && declaration.targetUserId === submission.authorId) {
      reasons.push(reason('USER_DECLARATION', declaration.reason))
      continue
    }
    if (
      declaration.scope === 'DEPARTMENT'
      && declaration.targetDepartment
      && submission.author?.department
      && declaration.targetDepartment.toLowerCase() === submission.author.department.toLowerCase()
    ) {
      reasons.push(reason('DEPARTMENT_DECLARATION', declaration.reason))
    }
  }

  return { conflict: reasons.length > 0, reasons }
}

/**
 * Maps reviewers to conflict metadata for one submission.
 * @param {Array<{ id: string }>} reviewers
 * @param {string} submissionId
 * @returns {Promise<Array<{ id: string, hasConflict: boolean, conflictReasons: Array<{ code: string, message: string }> }>>}
 */
export async function mapReviewerConflicts(reviewers, submissionId) {
  const submission = await loadSubmission(submissionId)
  if (!submission) return reviewers.map((reviewer) => ({ ...reviewer, hasConflict: false, conflictReasons: [] }))

  const result = []
  for (const reviewer of reviewers) {
    const check = await hasConflict(reviewer.id, submission)
    result.push({
      ...reviewer,
      hasConflict: check.conflict,
      conflictReasons: check.reasons,
    })
  }
  return result
}
