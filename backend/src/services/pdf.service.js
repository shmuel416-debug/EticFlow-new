/**
 * Ethic-Net — PDF Service
 * Generates approval letters and protocol PDFs using a unified HTML->PDF pipeline.
 */

import path from 'path'
import os from 'os'
import fs from 'fs/promises'
import prisma from '../config/database.js'
import { renderHtmlToPdf } from './pdf/renderer.js'
import { buildHeHtml, buildEnHtml, buildBilingualHtml } from './pdf/templates/approvalLetter.js'
import { buildHeRejectionHtml, buildEnRejectionHtml } from './pdf/templates/rejectionLetter.js'
import { buildProtocolHtml, buildBilingualProtocolHtml } from './pdf/templates/protocol.js'
import {
  APPROVAL_SIGNATURE_KEY,
  getDefaultApprovalTemplate,
  normalizeApprovalTemplate,
  validateApprovalTemplatePayload,
} from '../constants/approvalTemplate.js'
import {
  getDefaultRejectionTemplate,
  normalizeRejectionTemplate,
} from '../constants/rejectionTemplate.js'
import { getUserDisplayName } from '../utils/userDisplayName.js'
import { exists as storageExists, stat as storageStat, save as storageSave } from './storage.service.js'

const GENERATED_DIR = path.resolve('uploads', 'generated', 'approval')
const GENERATED_REJECTION_DIR = path.resolve('uploads', 'generated', 'rejection')
const PROTOCOL_GENERATED_DIR = path.resolve('uploads', 'generated', 'protocols')
const BRAND_PRIMARY = '#1e3a5f'
const INSTITUTION_NAME_HE = process.env.INSTITUTION_NAME_HE || 'המוסד האקדמי'
const INSTITUTION_NAME_EN = process.env.INSTITUTION_NAME_EN || 'Academic Institution'
const CHAIRMAN_NAME_HE = process.env.APPROVAL_CHAIRMAN_NAME_HE || process.env.CHAIRMAN_NAME_HE || ''
const CHAIRMAN_NAME_EN = process.env.APPROVAL_CHAIRMAN_NAME_EN || process.env.CHAIRMAN_NAME_EN || ''

/**
 * Formats date as dd/MM/yyyy for Hebrew locale.
 * @param {Date|string} date
 * @returns {string}
 */
function fmtDate(date) {
  return new Date(date).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/**
 * Formats date as long English form.
 * @param {Date|string} date
 * @returns {string}
 */
function fmtDateEn(date) {
  return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
}

/**
 * Returns bilingual track label.
 * @param {string} track
 * @returns {{ he: string, en: string }}
 */
function trackLabel(track) {
  const map = {
    FULL: { he: 'מסלול מלא', en: 'Full Review' },
    EXPEDITED: { he: 'מסלול מקוצר', en: 'Expedited Review' },
    EXEMPT: { he: 'פטור', en: 'Exempt' },
  }
  return map[track] ?? { he: String(track), en: String(track) }
}

/**
 * Calculates validity date (one year from approval).
 * @param {Date|string} approvedAt
 * @param {'he'|'en'} lang
 * @returns {string}
 */
function validUntil(approvedAt, lang = 'he') {
  const d = new Date(approvedAt)
  d.setFullYear(d.getFullYear() + 1)
  return lang === 'he' ? fmtDate(d) : fmtDateEn(d)
}

/**
 * Interpolates allowed template tokens.
 * @param {string} text
 * @param {Record<string, string>} context
 * @returns {string}
 */
function applyTemplateTokens(text, context) {
  return String(text ?? '').replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_match, tokenName) => context[tokenName] ?? '')
}

/**
 * Applies template tokens to all editable fields.
 * @param {ReturnType<typeof getDefaultApprovalTemplate>} template
 * @param {Record<string, string>} context
 * @returns {ReturnType<typeof getDefaultApprovalTemplate>}
 */
function materializeTemplate(template, context) {
  return {
    docTitle: applyTemplateTokens(template.docTitle, context),
    subject: applyTemplateTokens(template.subject, context),
    intro: applyTemplateTokens(template.intro, context),
    conditionsTitle: applyTemplateTokens(template.conditionsTitle, context),
    conditions: template.conditions.map((line) => applyTemplateTokens(line, context)).filter(Boolean),
    signatureLabel: applyTemplateTokens(template.signatureLabel, context),
    legalFooter: applyTemplateTokens(template.legalFooter, context),
  }
}

/**
 * Clamps approval template text to keep a single-page layout.
 * Prevents long user-customized copy from spilling into extra pages.
 * @param {ReturnType<typeof getDefaultApprovalTemplate>} template
 * @returns {ReturnType<typeof getDefaultApprovalTemplate>}
 */
function fitApprovalTemplateToSinglePage(template) {
  const trimWithEllipsis = (value, max) => {
    if (typeof value !== 'string') return ''
    const trimmed = value.trim()
    return trimmed.length > max ? `${trimmed.slice(0, max - 1).trim()}…` : trimmed
  }
  return {
    ...template,
    intro: trimWithEllipsis(template.intro, 720),
    conditions: (template.conditions || [])
      .slice(0, 4)
      .map((line) => trimWithEllipsis(line, 170))
      .filter(Boolean),
    legalFooter: trimWithEllipsis(template.legalFooter, 220),
  }
}

/**
 * Loads approval template by language.
 * @param {'he'|'en'} lang
 * @returns {Promise<ReturnType<typeof getDefaultApprovalTemplate>>}
 */
/**
 * Loads stored approval template by language and route variant.
 * @param {'he'|'en'} lang
 * @param {'COMMITTEE'|'EXPEDITED'} [route='COMMITTEE']
 * @returns {Promise<ReturnType<typeof getDefaultApprovalTemplate>>}
 */
async function getStoredApprovalTemplate(lang, route = 'COMMITTEE') {
  const key = lang === 'en' ? 'approval_template_en' : 'approval_template_he'
  const setting = await prisma.institutionSetting.findUnique({ where: { key }, select: { value: true } })
  let template
  if (!setting?.value) {
    template = getDefaultApprovalTemplate(lang, route)
  } else {
    try {
      template = normalizeApprovalTemplate(JSON.parse(setting.value), lang)
    } catch {
      template = getDefaultApprovalTemplate(lang, route)
    }
  }
  if (route === 'EXPEDITED') {
    const expeditedDefaults = getDefaultApprovalTemplate(lang, 'EXPEDITED')
    template = {
      ...template,
      docTitle: expeditedDefaults.docTitle,
      subject: expeditedDefaults.subject,
      intro: expeditedDefaults.intro,
      signatureLabel: expeditedDefaults.signatureLabel,
    }
  }
  return template
}

/**
 * Loads rejection template by language.
 * @param {'he'|'en'} lang
 * @returns {Promise<ReturnType<typeof getDefaultRejectionTemplate>>}
 */
async function getStoredRejectionTemplate(lang) {
  const key = lang === 'en' ? 'rejection_template_en' : 'rejection_template_he'
  const setting = await prisma.institutionSetting.findUnique({ where: { key }, select: { value: true } })
  if (!setting?.value) return getDefaultRejectionTemplate(lang)
  try {
    return normalizeRejectionTemplate(JSON.parse(setting.value), lang)
  } catch {
    return getDefaultRejectionTemplate(lang)
  }
}

/**
 * Reads chairman signature image from settings as data URL.
 * @returns {Promise<string>}
 */
async function getStoredChairmanSignature() {
  const setting = await prisma.institutionSetting.findUnique({
    where: { key: APPROVAL_SIGNATURE_KEY },
    select: { value: true },
  })
  return String(setting?.value ?? '')
}

/**
 * Resolves chairman display name by language from settings, DB role, or env fallback.
 * @param {'he'|'en'} lang
 * @returns {Promise<string>}
 */
async function getChairmanDisplayName(lang) {
  const key = lang === 'en' ? 'approval_chairman_name_en' : 'approval_chairman_name_he'
  const setting = await prisma.institutionSetting.findUnique({
    where: { key },
    select: { value: true },
  })
  const explicitName = String(setting?.value ?? '').trim()
  if (explicitName) return explicitName

  const chairmanUser = await prisma.user.findFirst({
    where: { isActive: true, roles: { has: 'CHAIRMAN' } },
    select: { fullName: true, fullNameHe: true },
    orderBy: { createdAt: 'asc' },
  })
  if (chairmanUser) return getUserDisplayName(chairmanUser, lang)

  return lang === 'en' ? CHAIRMAN_NAME_EN : CHAIRMAN_NAME_HE
}

/**
 * Returns configured institution primary color.
 * @returns {Promise<string>}
 */
async function getInstitutionPrimaryColorHex() {
  const row = await prisma.institutionSetting.findUnique({
    where: { key: 'primary_color' },
    select: { value: true },
  })
  const v = String(row?.value ?? '').trim()
  return /^#[0-9A-Fa-f]{6}$/.test(v) ? v : BRAND_PRIMARY
}

/**
 * Loads an approved submission required for approval-letter generation.
 * @param {string} submissionId
 * @returns {Promise<object>}
 */
async function getApprovalSubmission(submissionId) {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      author: { select: { fullName: true, fullNameHe: true, email: true } },
      formConfig: { select: { name: true } },
      slaTracking: true,
    },
  })
  if (!submission) throw new Error('Submission not found')
  if (submission.status !== 'APPROVED') throw new Error('Submission is not approved')
  return submission
}

/**
 * Loads a submission for committee decision-letter generation.
 * @param {string} submissionId
 * @param {'APPROVED'|'REJECTED'} requiredStatus
 * @returns {Promise<object>}
 */
async function getDecisionSubmission(submissionId, requiredStatus) {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      author: { select: { fullName: true, fullNameHe: true, email: true } },
      comments: {
        where: { isInternal: false },
        orderBy: { createdAt: 'desc' },
        select: { content: true, createdAt: true },
        take: 10,
      },
    },
  })
  if (!submission) throw new Error('Submission not found')
  if (submission.status !== requiredStatus) throw new Error(`Submission is not ${requiredStatus}`)
  return submission
}

/**
 * Builds placeholder context from submission for template interpolation.
 * @param {'he'|'en'} lang
 * @param {object} submission
 * @returns {Record<string, string>}
 */
function buildApprovalTemplateContext(lang, submission) {
  const track = trackLabel(submission.track)
  return {
    applicationId: String(submission.applicationId ?? ''),
    researchTitle: String(submission.title ?? ''),
    trackLabel: lang === 'he' ? track.he : track.en,
    issueDate: lang === 'he' ? fmtDate(new Date()) : fmtDateEn(new Date()),
    approvedDate: lang === 'he' ? fmtDate(submission.updatedAt) : fmtDateEn(submission.updatedAt),
    validUntil: validUntil(submission.updatedAt, lang),
    researcherName: getUserDisplayName(submission.author, lang),
    researcherEmail: String(submission.author?.email ?? ''),
    institutionName: lang === 'he' ? INSTITUTION_NAME_HE : INSTITUTION_NAME_EN,
    chairmanName: '',
  }
}

/**
 * Builds template context for rejection letters.
 * @param {'he'|'en'} lang
 * @param {object} submission
 * @returns {Record<string, string>}
 */
function buildRejectionTemplateContext(lang, submission) {
  const track = trackLabel(submission.track)
  const latestDecisionComment = (submission.comments || []).find((comment) => String(comment.content || '').trim())
  const fallbackReason = lang === 'he'
    ? 'לא התקבלו נימוקים נוספים בהחלטה.'
    : 'No additional decision notes were provided.'
  return {
    applicationId: String(submission.applicationId ?? ''),
    researchTitle: String(submission.title ?? ''),
    trackLabel: lang === 'he' ? track.he : track.en,
    issueDate: lang === 'he' ? fmtDate(new Date()) : fmtDateEn(new Date()),
    rejectedDate: lang === 'he' ? fmtDate(submission.updatedAt) : fmtDateEn(submission.updatedAt),
    researcherName: getUserDisplayName(submission.author, lang),
    researcherEmail: String(submission.author?.email ?? ''),
    institutionName: lang === 'he' ? INSTITUTION_NAME_HE : INSTITUTION_NAME_EN,
    rejectionReason: String(latestDecisionComment?.content ?? '').trim() || fallbackReason,
    chairmanName: '',
  }
}

/**
 * Checks whether a generated PDF already exists and is active.
 * @param {{ storagePath: string, submissionId?: string, protocolId?: string }} input
 * @returns {Promise<{ docId: string, storagePath: string, cached: true }|null>}
 */
async function findCachedGeneratedDoc(input) {
  if (!(await storageExists(input.storagePath))) return null
  const where = input.submissionId
    ? { submissionId: input.submissionId, storagePath: input.storagePath, isActive: true }
    : input.protocolId
      ? { protocolId: input.protocolId, storagePath: input.storagePath, isActive: true }
      : { storagePath: input.storagePath, isActive: true }
  const existing = await prisma.document.findFirst({
    where,
    select: { id: true },
  })
  return existing ? { docId: existing.id, storagePath: input.storagePath, cached: true } : null
}

/**
 * Deactivates cached approval/rejection PDFs after template or signature changes.
 * Next download regenerates with updated settings.
 * @returns {Promise<number>} Count of deactivated document rows
 */
export async function invalidateCachedDecisionLetters() {
  const result = await prisma.document.updateMany({
    where: {
      isActive: true,
      source: 'GENERATED',
      OR: [
        { storagePath: { startsWith: 'generated/approval/' } },
        { storagePath: { startsWith: 'generated/rejection/' } },
      ],
    },
    data: { isActive: false },
  })
  return result.count
}

/**
 * Upserts document metadata row for generated PDFs.
 * @param {{ submissionId?: string, protocolId?: string, filename: string, storagePath: string, originalName: string, sizeBytes: number }} input
 * @returns {Promise<{ id: string }>}
 */
async function upsertGeneratedDocument(input) {
  const where = input.submissionId
    ? { submissionId: input.submissionId, storagePath: input.storagePath }
    : input.protocolId
      ? { protocolId: input.protocolId, storagePath: input.storagePath }
      : { storagePath: input.storagePath }
  const existing = await prisma.document.findFirst({ where })
  if (existing) {
    return prisma.document.update({
      where: { id: existing.id },
      data: { sizeBytes: input.sizeBytes, isActive: true },
      select: { id: true },
    })
  }
  return prisma.document.create({
    data: {
      filename: input.filename,
      originalName: input.originalName,
      mimeType: 'application/pdf',
      sizeBytes: input.sizeBytes,
      storagePath: input.storagePath,
      source: 'GENERATED',
      submissionId: input.submissionId ?? null,
      protocolId: input.protocolId ?? null,
      uploadedById: null,
    },
    select: { id: true },
  })
}

/**
 * Generates a single-language approval letter PDF.
 * @param {string} submissionId
 * @param {'he'|'en'} lang
 * @param {boolean} [force]
 * @returns {Promise<{ docId: string, storagePath: string, cached?: boolean }>}
 */
export async function generateApprovalLetter(submissionId, lang = 'he', force = false) {
  const safeLang = lang === 'en' ? 'en' : 'he'
  const submission = await getApprovalSubmission(submissionId)
  const route = submission.approvalRoute || 'COMMITTEE'
  const routeSlug = route === 'EXPEDITED' ? 'expedited' : 'committee'
  const filename = `approval-letter-${routeSlug}-${safeLang}.pdf`
  const dir = path.join(GENERATED_DIR, submissionId)
  await fs.mkdir(dir, { recursive: true })
  const absPath = path.join(dir, filename)
  const storagePath = path.join('generated', 'approval', submissionId, filename)
  if (!force) {
    const cached = await findCachedGeneratedDoc({ storagePath, submissionId })
    if (cached) return cached
  }
  const [template, signatureDataUrl, brandPrimary] = await Promise.all([
    getStoredApprovalTemplate(safeLang, route),
    getStoredChairmanSignature(),
    getInstitutionPrimaryColorHex(),
  ])
  const ctx = buildApprovalTemplateContext(safeLang, submission)
  ctx.chairmanName = await getChairmanDisplayName(safeLang)
  const hydratedTemplate = fitApprovalTemplateToSinglePage(materializeTemplate(template, ctx))
  const html = safeLang === 'he'
    ? buildHeHtml(submission, hydratedTemplate, ctx, signatureDataUrl, brandPrimary)
    : buildEnHtml(submission, hydratedTemplate, ctx, signatureDataUrl, brandPrimary)
  await renderHtmlToPdf(html, absPath)
  const pdfBuffer = await fs.readFile(absPath)
  await storageSave(storagePath, pdfBuffer)
  const sizeBytes = pdfBuffer.length
  const dbDoc = await upsertGeneratedDocument({
    submissionId,
    filename,
    storagePath,
    originalName: `approval-letter-${routeSlug}-${safeLang}-${submission.applicationId}.pdf`,
    sizeBytes,
  })
  return { docId: dbDoc.id, storagePath, cached: false }
}

/**
 * Generates a single-language rejection letter PDF.
 * @param {string} submissionId
 * @param {'he'|'en'} lang
 * @param {boolean} [force]
 * @returns {Promise<{ docId: string, storagePath: string }>}
 */
export async function generateRejectionLetter(submissionId, lang = 'he', force = false) {
  const safeLang = lang === 'en' ? 'en' : 'he'
  const submission = await getDecisionSubmission(submissionId, 'REJECTED')
  const filename = `rejection-letter-${safeLang}.pdf`
  const dir = path.join(GENERATED_REJECTION_DIR, submissionId)
  await fs.mkdir(dir, { recursive: true })
  const absPath = path.join(dir, filename)
  const storagePath = path.join('generated', 'rejection', submissionId, filename)
  if (!force) {
    const cached = await findCachedGeneratedDoc({ storagePath, submissionId })
    if (cached) return cached
  }
  const [template, signatureDataUrl, brandPrimary] = await Promise.all([
    getStoredRejectionTemplate(safeLang),
    getStoredChairmanSignature(),
    getInstitutionPrimaryColorHex(),
  ])
  const ctx = buildRejectionTemplateContext(safeLang, submission)
  ctx.chairmanName = await getChairmanDisplayName(safeLang)
  const html = safeLang === 'he'
    ? buildHeRejectionHtml(submission, template, ctx, signatureDataUrl, brandPrimary)
    : buildEnRejectionHtml(submission, template, ctx, signatureDataUrl, brandPrimary)
  await renderHtmlToPdf(html, absPath)
  const pdfBuffer = await fs.readFile(absPath)
  await storageSave(storagePath, pdfBuffer)
  const dbDoc = await upsertGeneratedDocument({
    submissionId,
    filename,
    storagePath,
    originalName: `rejection-letter-${safeLang}-${submission.applicationId}.pdf`,
    sizeBytes: pdfBuffer.length,
  })
  return { docId: dbDoc.id, storagePath, cached: false }
}

/**
 * Generates bilingual approval letter PDF.
 * @param {string} submissionId
 * @returns {Promise<{ docId: string, storagePath: string }>}
 */
export async function generateBilingualApprovalLetter(submissionId, force = false) {
  const submission = await getApprovalSubmission(submissionId)
  const route = submission.approvalRoute || 'COMMITTEE'
  const routeSlug = route === 'EXPEDITED' ? 'expedited' : 'committee'
  const filename = `approval-letter-bilingual-${routeSlug}.pdf`
  const dir = path.join(GENERATED_DIR, submissionId)
  await fs.mkdir(dir, { recursive: true })
  const absPath = path.join(dir, filename)
  const storagePath = path.join('generated', 'approval', submissionId, filename)
  if (!force) {
    const cached = await findCachedGeneratedDoc({ storagePath, submissionId })
    if (cached) return cached
  }
  const [heTemplate, enTemplate, signatureDataUrl, brandPrimary] = await Promise.all([
    getStoredApprovalTemplate('he', route),
    getStoredApprovalTemplate('en', route),
    getStoredChairmanSignature(),
    getInstitutionPrimaryColorHex(),
  ])
  const heCtx = buildApprovalTemplateContext('he', submission)
  const enCtx = buildApprovalTemplateContext('en', submission)
  heCtx.chairmanName = await getChairmanDisplayName('he')
  enCtx.chairmanName = await getChairmanDisplayName('en')
  const html = buildBilingualHtml(
    submission,
    fitApprovalTemplateToSinglePage(materializeTemplate(heTemplate, heCtx)),
    fitApprovalTemplateToSinglePage(materializeTemplate(enTemplate, enCtx)),
    heCtx,
    enCtx,
    signatureDataUrl,
    brandPrimary
  )
  await renderHtmlToPdf(html, absPath)
  const pdfBuffer = await fs.readFile(absPath)
  await storageSave(storagePath, pdfBuffer)
  const dbDoc = await upsertGeneratedDocument({
    submissionId,
    filename,
    storagePath,
    originalName: `approval-letter-bilingual-${routeSlug}-${submission.applicationId}.pdf`,
    sizeBytes: pdfBuffer.length,
  })
  return { docId: dbDoc.id, storagePath, cached: false }
}

/**
 * Generates approval-letter preview PDF without persisting document records.
 * @param {string} submissionId
 * @param {'he'|'en'} lang
 * @param {unknown} templateInput
 * @returns {Promise<{ buffer: Buffer, filename: string, renderer: 'puppeteer' }>}
 */
export async function generateApprovalLetterPreview(submissionId, lang = 'he', templateInput) {
  const safeLang = lang === 'en' ? 'en' : 'he'
  const submission = await getApprovalSubmission(submissionId)
  const template = validateApprovalTemplatePayload(templateInput, safeLang)
  const signatureDataUrl = await getStoredChairmanSignature()
  const brandPrimary = await getInstitutionPrimaryColorHex()
  const ctx = buildApprovalTemplateContext(safeLang, submission)
  ctx.chairmanName = await getChairmanDisplayName(safeLang)
  const hydratedTemplate = fitApprovalTemplateToSinglePage(materializeTemplate(template, ctx))
  const html = safeLang === 'he'
    ? buildHeHtml(submission, hydratedTemplate, ctx, signatureDataUrl, brandPrimary)
    : buildEnHtml(submission, hydratedTemplate, ctx, signatureDataUrl, brandPrimary)
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ef-approval-preview-'))
  const filename = `approval-template-preview-${safeLang}.pdf`
  const outputPath = path.join(tmpDir, filename)
  try {
    await renderHtmlToPdf(html, outputPath)
    const buffer = await fs.readFile(outputPath)
    return { buffer, filename, renderer: 'puppeteer' }
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {})
  }
}

/**
 * Generates protocol PDF in Hebrew, English, or bilingual mode.
 * @param {object} protocol
 * @param {'he'|'en'|'both'} lang
 * @param {boolean} [force]
 * @returns {Promise<{ docId: string, storagePath: string }>}
 */
export async function generateProtocolPdf(protocol, lang = 'he', force = false) {
  const safeLang = lang === 'en' ? 'en' : lang === 'both' ? 'both' : 'he'
  const dir = path.join(PROTOCOL_GENERATED_DIR, protocol.id)
  await fs.mkdir(dir, { recursive: true })
  const filename = safeLang === 'both' ? 'protocol-bilingual.pdf' : `protocol-${safeLang}.pdf`
  const absPath = path.join(dir, filename)
  const storagePath = path.join('generated', 'protocols', protocol.id, filename)
  const canReuse = protocol.status === 'SIGNED' && !force
  if (canReuse) {
    const cached = await findCachedGeneratedDoc({ storagePath, protocolId: protocol.id })
    if (cached) return cached
  }
  const brandPrimary = await getInstitutionPrimaryColorHex()
  const statusMap = {
    DRAFT: { he: 'טיוטה', en: 'Draft' },
    PENDING_SIGNATURES: { he: 'ממתין לחתימות', en: 'Pending Signatures' },
    SIGNED: { he: 'חתום', en: 'Signed' },
    ARCHIVED: { he: 'בארכיון', en: 'Archived' },
  }
  const statusLabel = statusMap[protocol.status] ?? { he: String(protocol.status), en: String(protocol.status) }
  const meetingDateHe = protocol.meeting?.scheduledAt ? fmtDate(protocol.meeting.scheduledAt) : '—'
  const meetingDateEn = protocol.meeting?.scheduledAt ? fmtDateEn(protocol.meeting.scheduledAt) : '—'
  const context = {
    brandPrimary,
    he: {
      issueDate: `הופק: ${fmtDate(new Date())}`,
      meetingDate: meetingDateHe,
      statusLabel: statusLabel.he,
      titleLabel: 'פרוטוקול ועדת אתיקה',
      meetingLabel: 'תאריך ישיבה',
      statusFieldLabel: 'סטטוס',
      footer: `מסמך זה הופק על ידי מערכת Ethic-Net • ${fmtDate(new Date())}`,
      institutionName: INSTITUTION_NAME_HE,
    },
    en: {
      issueDate: `Generated: ${fmtDateEn(new Date())}`,
      meetingDate: meetingDateEn,
      statusLabel: statusLabel.en,
      titleLabel: 'Ethics Committee Protocol',
      meetingLabel: 'Meeting Date',
      statusFieldLabel: 'Status',
      footer: `Generated by Ethic-Net • ${fmtDateEn(new Date())}`,
      institutionName: INSTITUTION_NAME_EN,
    },
  }
  const html = safeLang === 'both'
    ? buildBilingualProtocolHtml(protocol, context)
    : buildProtocolHtml(protocol, safeLang, context)
  await renderHtmlToPdf(html, absPath)
  const stat = await fs.stat(absPath)
  const dbDoc = await upsertGeneratedDocument({
    protocolId: protocol.id,
    filename,
    storagePath,
    originalName: `${filename.replace('.pdf', '')}-${protocol.id}.pdf`,
    sizeBytes: stat.size,
  })
  return { docId: dbDoc.id, storagePath }
}

export { buildHeHtml, buildEnHtml }
