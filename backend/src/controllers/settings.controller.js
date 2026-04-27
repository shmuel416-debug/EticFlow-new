/**
 * EthicFlow — Settings Controller
 * Manages InstitutionSetting records (admin-only configuration).
 *
 * Endpoints:
 *   GET /api/settings       — list all settings
 *   PUT /api/settings/:key  — update a single setting value
 */

import prisma from '../config/database.js'
import { AppError } from '../utils/errors.js'
import { generateApprovalLetterPreview } from '../services/pdf.service.js'
import {
  APPROVAL_TEMPLATE_KEYS,
  APPROVAL_SIGNATURE_KEY,
  APPROVAL_TEMPLATE_HISTORY_KEYS,
  getApprovalTemplateHistoryKey,
  getDefaultApprovalTemplate,
  normalizeApprovalTemplate,
  validateApprovalTemplatePayload,
} from '../constants/approvalTemplate.js'
import { getRequestRole } from '../utils/roles.js'

/** Allowed setting keys to prevent arbitrary key creation via the API. */
const ADMIN_ONLY_KEYS = new Set([
  'institution_name_he',
  'institution_name_en',
  'institution_logo_url',
  'primary_color',
  'sla_triage_days',
  'sla_review_days',
  'sla_decision_days',
  'max_file_size_mb',
  'allowed_file_types',
  'email_sender_name',
  'email_sender_address',
])
const TEMPLATE_MANAGED_KEYS = new Set([...APPROVAL_TEMPLATE_KEYS, APPROVAL_SIGNATURE_KEY])
const ALLOWED_UPDATE_KEYS = new Set([...ADMIN_ONLY_KEYS, ...TEMPLATE_MANAGED_KEYS])
const ALLOWED_READ_KEYS = new Set([...ADMIN_ONLY_KEYS, ...TEMPLATE_MANAGED_KEYS, ...APPROVAL_TEMPLATE_HISTORY_KEYS])

/**
 * Resolves keys available for a role.
 * @param {string|undefined} role
 * @returns {Set<string>}
 */
function allowedKeysForRole(role) {
  if (role === 'ADMIN') {
    return {
      readKeys: ALLOWED_READ_KEYS,
      updateKeys: ALLOWED_UPDATE_KEYS,
    }
  }
  if (role === 'SECRETARY') {
    return {
      readKeys: new Set([...TEMPLATE_MANAGED_KEYS, ...APPROVAL_TEMPLATE_HISTORY_KEYS]),
      updateKeys: TEMPLATE_MANAGED_KEYS,
    }
  }
  return {
    readKeys: new Set(),
    updateKeys: new Set(),
  }
}

// ─────────────────────────────────────────────
// LIST
// ─────────────────────────────────────────────

/**
 * GET /api/settings
 * Returns all active institution settings as a flat list.
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function list(req, res, next) {
  try {
    const permissions = allowedKeysForRole(getRequestRole(req))
    if (!(permissions?.readKeys instanceof Set) || permissions.readKeys.size === 0) {
      throw new AppError('Forbidden', 'FORBIDDEN', 403)
    }

    const settings = await prisma.institutionSetting.findMany({
      where:   { isActive: true, key: { in: [...permissions.readKeys] } },
      orderBy: { key: 'asc' },
    })

    // Ensure template keys always exist for secretary/admin even on non-seeded DBs.
    const map = new Map(settings.map((item) => [item.key, item]))
    for (const templateKey of APPROVAL_TEMPLATE_KEYS) {
      if (!permissions.readKeys.has(templateKey) || map.has(templateKey)) continue
      const lang = templateKey.endsWith('_en') ? 'en' : 'he'
      const created = await prisma.institutionSetting.upsert({
        where:  { key: templateKey },
        update: {},
        create: {
          key: templateKey,
          value: JSON.stringify(getDefaultApprovalTemplate(lang)),
          valueType: 'json',
        },
      })
      map.set(templateKey, created)
    }
    for (const historyKey of APPROVAL_TEMPLATE_HISTORY_KEYS) {
      if (!permissions.readKeys.has(historyKey) || map.has(historyKey)) continue
      const created = await prisma.institutionSetting.upsert({
        where:  { key: historyKey },
        update: {},
        create: {
          key: historyKey,
          value: '[]',
          valueType: 'json',
        },
      })
      map.set(historyKey, created)
    }
    if (permissions.readKeys.has(APPROVAL_SIGNATURE_KEY) && !map.has(APPROVAL_SIGNATURE_KEY)) {
      const created = await prisma.institutionSetting.upsert({
        where: { key: APPROVAL_SIGNATURE_KEY },
        update: {},
        create: {
          key: APPROVAL_SIGNATURE_KEY,
          value: '',
          valueType: 'string',
        },
      })
      map.set(APPROVAL_SIGNATURE_KEY, created)
    }

    res.json({ data: [...map.values()] })
  } catch (err) {
    next(err)
  }
}

// ─────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────

/**
 * PUT /api/settings/:key
 * Updates the value of an existing setting.
 * Only keys in the ALLOWED_KEYS set can be updated.
 * @param {import('express').Request}  req - params: { key }, body: { value: string }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function update(req, res, next) {
  try {
    const { key }   = req.params
    const { value } = req.body

    const activeRole = getRequestRole(req)
    const permissions = allowedKeysForRole(activeRole)
    if (!ALLOWED_UPDATE_KEYS.has(key)) {
      throw new AppError(`Unknown setting key: "${key}"`, 'INVALID_SETTING_KEY', 400)
    }
    if (!(permissions?.updateKeys instanceof Set) || !permissions.updateKeys.has(key)) {
      throw new AppError('Forbidden', 'FORBIDDEN', 403)
    }

    const setting = await prisma.institutionSetting.findUnique({ where: { key } })
    if (!setting || !setting.isActive) {
      throw new AppError(`Setting "${key}" not found`, 'NOT_FOUND', 404)
    }

    let nextValue = String(value ?? '')
    let nextType = setting.valueType || 'string'
    if (key === APPROVAL_SIGNATURE_KEY) {
      if (nextValue && !/^data:image\/(png|jpe?g);base64,[A-Za-z0-9+/=]+$/i.test(nextValue)) {
        throw new AppError('Signature must be PNG/JPEG data URL', 'VALIDATION_ERROR', 400)
      }
      if (nextValue.length > 3_000_000) {
        throw new AppError('Signature image is too large', 'VALIDATION_ERROR', 400)
      }
    }
    if (APPROVAL_TEMPLATE_KEYS.has(key)) {
      const lang = key.endsWith('_en') ? 'en' : 'he'
      try {
        const validated = validateApprovalTemplatePayload(value, lang)
        nextValue = JSON.stringify(validated)
        nextType = 'json'
      } catch (e) {
        throw new AppError(e?.message || 'Invalid template payload', 'VALIDATION_ERROR', 400)
      }
    }

    const updated = await prisma.institutionSetting.update({
      where: { key },
      data:  { value: nextValue, valueType: nextType },
    })

    if (APPROVAL_TEMPLATE_KEYS.has(key)) {
      const lang = key.endsWith('_en') ? 'en' : 'he'
      const historyKey = getApprovalTemplateHistoryKey(lang)
      const previousTemplate = (() => {
        try {
          return normalizeApprovalTemplate(JSON.parse(setting.value), lang)
        } catch {
          return getDefaultApprovalTemplate(lang)
        }
      })()
      const historySetting = await prisma.institutionSetting.findUnique({ where: { key: historyKey } })
      const historyList = (() => {
        try {
          const parsed = historySetting?.value ? JSON.parse(historySetting.value) : []
          return Array.isArray(parsed) ? parsed : []
        } catch {
          return []
        }
      })()
      const entry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        editedAt: new Date().toISOString(),
        editedById: req.user?.id ?? null,
        editedByRole: activeRole ?? null,
        template: previousTemplate,
      }
      const nextHistory = [entry, ...historyList].slice(0, 20)
      await prisma.institutionSetting.upsert({
        where: { key: historyKey },
        update: { value: JSON.stringify(nextHistory), valueType: 'json' },
        create: {
          key: historyKey,
          value: JSON.stringify(nextHistory),
          valueType: 'json',
        },
      })
    }

    res.locals.entityId = updated.id
    res.json({ data: updated })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/settings/approval-template/preview
 * Generates a PDF preview using a draft template without saving it.
 * @param {import('express').Request} req - body: { submissionId, lang, template }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function previewApprovalTemplate(req, res, next) {
  try {
    const role = getRequestRole(req)
    if (!['ADMIN', 'SECRETARY'].includes(role)) {
      throw new AppError('Forbidden', 'FORBIDDEN', 403)
    }
    const safeLang = req.body?.lang === 'en' ? 'en' : 'he'
    const { submissionId, template } = req.body
    const { buffer, filename, renderer } = await generateApprovalLetterPreview(submissionId, safeLang, template)

    res.locals.entityId = submissionId
    res.setHeader('X-EticFlow-Pdf-Renderer', renderer)
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`)
    res.setHeader('Content-Length', buffer.length)
    res.send(buffer)
  } catch (err) {
    next(err)
  }
}
