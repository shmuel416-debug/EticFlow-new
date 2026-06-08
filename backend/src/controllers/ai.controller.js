/**
 * Ethic-Net — AI Controller
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
const EMPTY_FIELD_PLACEHOLDER = '—'

/**
 * Returns a safe response language for AI analysis.
 * Defaults to Hebrew when the client does not provide a valid value.
 * @param {unknown} requestedLanguage
 * @returns {'he' | 'en'}
 */
function resolveResponseLanguage(requestedLanguage) {
  return RESPONSE_LANGUAGES.includes(requestedLanguage) ? requestedLanguage : 'he'
}

/**
 * Returns true when a value is meaningfully filled.
 * @param {unknown} value
 * @returns {boolean}
 */
function hasMeaningfulValue(value) {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') return Object.keys(value).length > 0
  return true
}

/**
 * Flattens schema fields from both modern and legacy schema shapes.
 * @param {Record<string, any>} schemaJson
 * @returns {Array<{ id: string, label: string, labelEn: string }>}
 */
function extractSchemaFields(schemaJson = {}) {
  const sections = Array.isArray(schemaJson.sections) ? schemaJson.sections : []
  const legacyFields = Array.isArray(schemaJson.fields) ? schemaJson.fields : []
  const sectionFields = sections.flatMap((section) =>
    Array.isArray(section.fields) ? section.fields : []
  )
  const allFields = [...legacyFields, ...sectionFields]
  return allFields
    .filter((field) => typeof field?.id === 'string' && field.id.trim().length > 0)
    .map((field) => ({
      id: field.id,
      label: String(field.label ?? field.labelHe ?? field.id),
      labelEn: String(field.labelEn ?? field.label ?? field.id),
    }))
}

/**
 * Validates and normalizes requested field IDs.
 * @param {unknown} rawFields
 * @returns {string[] | null}
 */
function normalizeRequestedFieldIds(rawFields) {
  if (!Array.isArray(rawFields)) return null
  const cleaned = rawFields
    .filter((fieldId) => typeof fieldId === 'string')
    .map((fieldId) => fieldId.trim())
    .filter(Boolean)
  return [...new Set(cleaned)]
}

/**
 * Returns form data filtered to selected field IDs.
 * @param {Record<string, any>} sourceData
 * @param {string[] | null} selectedFieldIds
 * @returns {Record<string, any>}
 */
function filterSubmissionData(sourceData, selectedFieldIds) {
  if (!selectedFieldIds || selectedFieldIds.length === 0) return sourceData
  return selectedFieldIds.reduce((accumulator, fieldId) => {
    if (Object.prototype.hasOwnProperty.call(sourceData, fieldId)) {
      accumulator[fieldId] = sourceData[fieldId]
    }
    return accumulator
  }, {})
}

/**
 * Enforces submission access by role.
 * @param {import('@prisma/client').Submission} submission
 * @param {import('express').Request} req
 * @returns {void}
 */
function assertSubmissionAccess(submission, req) {
  const role = getRequestRole(req)
  const { id: userId } = req.user
  if (role === 'RESEARCHER' && submission.authorId !== userId) {
    throw new AppError('Forbidden', 'FORBIDDEN', 403)
  }
  if (role === 'REVIEWER' && submission.reviewerId !== userId) {
    throw new AppError('Forbidden', 'FORBIDDEN', 403)
  }
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
    const selectedFieldIds = normalizeRequestedFieldIds(req.body?.fields)

    const submission = await prisma.submission.findUnique({
      where:   { id: subId },
      include: {
        versions: { orderBy: { versionNum: 'desc' }, take: 1 },
        documents: {
          where: { isActive: true },
          select: { id: true, originalName: true, mimeType: true, sizeBytes: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        },
        formConfig: {
          select: { schemaJson: true },
        },
      },
    })

    if (!submission || !submission.isActive) {
      throw new AppError('Submission not found', 'NOT_FOUND', 404)
    }

    assertSubmissionAccess(submission, req)

    const latestData = submission.versions[0]?.dataJson ?? {}
    const filteredData = filterSubmissionData(latestData, selectedFieldIds)
    const documentContext = submission.documents.map((doc) => ({
      id: doc.id,
      name: doc.originalName,
      mimeType: doc.mimeType,
      sizeBytes: doc.sizeBytes,
      uploadedAt: doc.createdAt,
    }))

    // Run analysis (provider-agnostic)
    const { resultJson, provider } = await analyzeSubmission({
      title:    submission.title,
      track:    submission.track,
      dataJson: filteredData,
      fieldsMeta: extractSchemaFields(submission.formConfig?.schemaJson),
      documents: documentContext,
      responseLanguage,
    })

    // Persist result
    const analysis = await prisma.aIAnalysis.create({
      data: {
        submissionId: subId,
        requestedBy:  req.user.id,
        provider,
        prompt:       `analyze:${submission.applicationId}:answers(${Object.keys(filteredData).length})+documents(${documentContext.length}):lang(${responseLanguage})`,
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

    assertSubmissionAccess(submission, req)

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

/**
 * Returns selectable form fields for AI analysis.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {Function} next
 */
export async function getAnalysisFields(req, res, next) {
  try {
    const { subId } = req.params
    const submission = await prisma.submission.findUnique({
      where: { id: subId },
      include: {
        versions: { orderBy: { versionNum: 'desc' }, take: 1 },
        formConfig: { select: { schemaJson: true } },
      },
    })

    if (!submission || !submission.isActive) {
      throw new AppError('Submission not found', 'NOT_FOUND', 404)
    }

    assertSubmissionAccess(submission, req)
    const latestData = submission.versions[0]?.dataJson ?? {}
    const fields = extractSchemaFields(submission.formConfig?.schemaJson).map((field) => ({
      id: field.id,
      label: field.label || EMPTY_FIELD_PLACEHOLDER,
      labelEn: field.labelEn || field.label || EMPTY_FIELD_PLACEHOLDER,
      answered: hasMeaningfulValue(latestData[field.id]),
    }))
    res.json({ data: fields })
  } catch (err) {
    next(err)
  }
}
