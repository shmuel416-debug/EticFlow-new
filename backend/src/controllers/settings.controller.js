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

/** Allowed setting keys to prevent arbitrary key creation via the API. */
const ALLOWED_KEYS = new Set([
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
    const settings = await prisma.institutionSetting.findMany({
      where:   { isActive: true },
      orderBy: { key: 'asc' },
    })

    res.json({ data: settings })
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

    if (!ALLOWED_KEYS.has(key)) {
      throw new AppError(`Unknown setting key: "${key}"`, 'INVALID_SETTING_KEY', 400)
    }

    const setting = await prisma.institutionSetting.findUnique({ where: { key } })
    if (!setting || !setting.isActive) {
      throw new AppError(`Setting "${key}" not found`, 'NOT_FOUND', 404)
    }

    const updated = await prisma.institutionSetting.update({
      where: { key },
      data:  { value: String(value) },
    })

    res.locals.entityId = updated.id
    res.json({ data: updated })
  } catch (err) {
    next(err)
  }
}
