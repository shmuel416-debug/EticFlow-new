/**
 * EthicFlow — Forms Controller
 * Manages FormConfig CRUD: create draft, update schema, publish, archive.
 * Status is derived from isPublished + isActive fields.
 *   Draft:     isPublished=false, isActive=true
 *   Published: isPublished=true,  isActive=true
 *   Archived:  isActive=false
 */

import prisma from '../config/database.js'
import { AppError } from '../utils/errors.js'

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/**
 * Derives a human-readable status string from FormConfig flags.
 * @param {{ isPublished: boolean, isActive: boolean }} form
 * @returns {'draft' | 'published' | 'archived'}
 */
function formStatus(form) {
  if (!form.isActive) return 'archived'
  if (form.isPublished) return 'published'
  return 'draft'
}

/**
 * Appends a computed `status` field to a FormConfig record.
 * @param {object} form - Prisma FormConfig record
 * @returns {object}
 */
function withStatus(form) {
  return { ...form, status: formStatus(form) }
}

/**
 * Returns normalized field list from supported schema shapes.
 * @param {unknown} schemaJson
 * @returns {Array<Record<string, unknown>>}
 */
function getSchemaFields(schemaJson) {
  if (!schemaJson || typeof schemaJson !== 'object') return []
  if (Array.isArray(schemaJson.fields)) return schemaJson.fields.filter(Boolean)
  if (Array.isArray(schemaJson.sections)) {
    return schemaJson.sections.flatMap((section) =>
      Array.isArray(section?.fields) ? section.fields.filter(Boolean) : []
    )
  }
  return []
}

// ─────────────────────────────────────────────
// CONTROLLERS
// ─────────────────────────────────────────────

/**
 * GET /api/forms
 * Returns all forms (including archived). SECRETARY and ADMIN only.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function list(req, res, next) {
  try {
    const forms = await prisma.formConfig.findMany({
      orderBy: { createdAt: 'desc' },
    })
    res.json({ forms: forms.map(withStatus) })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/forms/active
 * Returns the most recently published + active form. Accessible by all authenticated roles.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function getActive(req, res, next) {
  try {
    const form = await prisma.formConfig.findFirst({
      where:   { isPublished: true, isActive: true },
      orderBy: { publishedAt: 'desc' },
    })
    if (!form) return next(AppError.notFound('Active form'))
    res.json({ form: withStatus(form) })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/forms/available
 * Lists all published, active forms (metadata only) for researchers and form pickers.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function listAvailable(req, res, next) {
  try {
    const forms = await prisma.formConfig.findMany({
      where:   { isPublished: true, isActive: true },
      orderBy: { publishedAt: 'desc' },
      select:  {
        id: true,
        name: true,
        nameEn: true,
        version: true,
        publishedAt: true,
        isActive: true,
        isPublished: true,
        schemaJson: true,
      },
    })
    const usableForms = forms
      .filter((form) => getSchemaFields(form.schemaJson).length > 0)
      .map((form) => {
        const { schemaJson: _schemaJson, ...meta } = form
        return withStatus(meta)
      })
    res.json({ forms: usableForms })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/forms/available/:id
 * Returns a full form only if it is published and active.
 * @param {import('express').Request} req - params: { id }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function getAvailableById(req, res, next) {
  try {
    const form = await prisma.formConfig.findFirst({
      where: {
        id:          req.params.id,
        isPublished: true,
        isActive:    true,
      },
    })
    if (!form) return next(AppError.notFound('Form'))
    if (getSchemaFields(form.schemaJson).length === 0) {
      return next(AppError.notFound('Form'))
    }
    res.json({ form: withStatus(form) })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/forms/:id
 * Returns a single form by ID. SECRETARY and ADMIN only.
 * @param {import('express').Request} req - params: { id }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function getById(req, res, next) {
  try {
    const form = await prisma.formConfig.findUnique({ where: { id: req.params.id } })
    if (!form) return next(AppError.notFound('Form'))
    res.json({ form: withStatus(form) })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/forms
 * Creates a new form in draft state. SECRETARY and ADMIN only.
 * @param {import('express').Request} req - body: { name, nameEn, schemaJson }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function create(req, res, next) {
  try {
    const { name, nameEn, schemaJson } = req.body
    const form = await prisma.formConfig.create({
      data: { name, nameEn, schemaJson, isPublished: false, isActive: true },
    })
    res.locals.entityId = form.id
    res.status(201).json({ form: withStatus(form) })
  } catch (err) {
    next(err)
  }
}

/**
 * PUT /api/forms/:id
 * Updates the name and/or schema of a draft form. Rejected if already published.
 * @param {import('express').Request} req - params: { id }, body: { name?, nameEn?, schemaJson? }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function update(req, res, next) {
  try {
    const existing = await prisma.formConfig.findUnique({ where: { id: req.params.id } })
    if (!existing) return next(AppError.notFound('Form'))
    if (!existing.isActive) {
      return next(new AppError('Cannot edit an archived form', 'FORM_ARCHIVED', 400))
    }
    if (existing.isPublished) {
      return next(new AppError('Cannot edit a published form', 'FORM_LOCKED', 400))
    }

    const { name, nameEn, schemaJson } = req.body
    const data = {}
    if (name      !== undefined) data.name      = name
    if (nameEn    !== undefined) data.nameEn    = nameEn
    if (schemaJson !== undefined) data.schemaJson = schemaJson

    const form = await prisma.formConfig.update({ where: { id: req.params.id }, data })
    res.locals.entityId = form.id
    res.json({ form: withStatus(form) })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/forms/:id/publish
 * Publishes a draft form: locks it, increments version, records publishedAt.
 * SECRETARY and ADMIN only.
 * @param {import('express').Request} req - params: { id }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function publish(req, res, next) {
  try {
    const existing = await prisma.formConfig.findUnique({ where: { id: req.params.id } })
    if (!existing) return next(AppError.notFound('Form'))
    if (!existing.isActive) {
      return next(new AppError('Cannot publish an archived form', 'FORM_ARCHIVED', 400))
    }
    if (existing.isPublished) {
      return next(new AppError('Form is already published', 'FORM_ALREADY_PUBLISHED', 400))
    }
    if (getSchemaFields(existing.schemaJson).length === 0) {
      return next(new AppError('Cannot publish a form without fields', 'FORM_SCHEMA_EMPTY', 400))
    }

    const form = await prisma.formConfig.update({
      where: { id: req.params.id },
      data:  {
        isPublished: true,
        publishedAt: new Date(),
        version:     { increment: 1 },
      },
    })
    res.locals.entityId = form.id
    res.json({ form: withStatus(form) })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/forms/:id/restore
 * Restores an archived form back to draft state. SECRETARY and ADMIN only.
 * @param {import('express').Request} req - params: { id }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function restore(req, res, next) {
  try {
    const existing = await prisma.formConfig.findUnique({ where: { id: req.params.id } })
    if (!existing) return next(AppError.notFound('Form'))
    if (existing.isActive) {
      return next(new AppError('Form is not archived', 'FORM_NOT_ARCHIVED', 400))
    }

    const form = await prisma.formConfig.update({
      where: { id: req.params.id },
      data:  { isActive: true, isPublished: false },
    })
    res.locals.entityId = form.id
    res.json({ form: withStatus(form) })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/forms/:id/archive
 * Archives a form (soft delete). SECRETARY and ADMIN only.
 * @param {import('express').Request} req - params: { id }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function archive(req, res, next) {
  try {
    const existing = await prisma.formConfig.findUnique({ where: { id: req.params.id } })
    if (!existing) return next(AppError.notFound('Form'))
    if (!existing.isActive) {
      return next(new AppError('Form is already archived', 'FORM_ALREADY_ARCHIVED', 400))
    }

    const form = await prisma.formConfig.update({
      where: { id: req.params.id },
      data:  { isActive: false },
    })
    res.locals.entityId = form.id
    res.json({ form: withStatus(form) })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/forms/:id/duplicate
 * Duplicates a form (creates new FormConfig from existing).
 * Copies schema, instructions, attachments. SECRETARY and ADMIN only.
 * @param {import('express').Request} req - params: { id }, body: { includeInstructions?, includeAttachments? }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function duplicate(req, res, next) {
  try {
    const existing = await prisma.formConfig.findUnique({ where: { id: req.params.id } })
    if (!existing) return next(AppError.notFound('Form'))

    const { includeInstructions = true, includeAttachments = true } = req.body

    const newName = `${existing.name} - העתק`
    const newNameEn = `${existing.nameEn} - Copy`

    const form = await prisma.formConfig.create({
      data: {
        name: newName,
        nameEn: newNameEn,
        schemaJson: existing.schemaJson,
        instructionsHe: includeInstructions ? existing.instructionsHe : null,
        instructionsEn: includeInstructions ? existing.instructionsEn : null,
        attachmentsList: includeAttachments ? existing.attachmentsList : null,
        isActive: true,
        isPublished: false,
        version: 1,
        duplicatedFromId: existing.id,
      },
    })
    res.locals.entityId = form.id
    res.json({ form: withStatus(form) })
  } catch (err) {
    next(err)
  }
}

/**
 * PUT /api/forms/:id/instructions
 * Updates form instructions and attachments list. SECRETARY and ADMIN only.
 * @param {import('express').Request} req - params: { id }, body: { instructionsHe?, instructionsEn?, attachmentsList? }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function updateInstructions(req, res, next) {
  try {
    const existing = await prisma.formConfig.findUnique({ where: { id: req.params.id } })
    if (!existing) return next(AppError.notFound('Form'))

    const { instructionsHe, instructionsEn, attachmentsList } = req.body

    const form = await prisma.formConfig.update({
      where: { id: req.params.id },
      data: {
        ...(instructionsHe !== undefined && { instructionsHe }),
        ...(instructionsEn !== undefined && { instructionsEn }),
        ...(attachmentsList !== undefined && { attachmentsList }),
      },
    })
    res.locals.entityId = form.id
    res.json({ form: withStatus(form) })
  } catch (err) {
    next(err)
  }
}
