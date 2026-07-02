/**
 * reviewerChecklist.controller.js
 * HTTP handlers for the reviewer checklist system.
 * Admin endpoints: template/section/item CRUD.
 * Reviewer endpoints: get, save-draft, submit.
 */

import { z } from 'zod';
import prisma from '../config/database.js';
import * as service from '../services/reviewerChecklist.service.js';
import { getRequestRole, hasAnyRole } from '../utils/roles.js';
import { hasConflict } from '../services/coi.service.js';
import { AppError } from '../utils/errors.js';
import { roleFilter } from './submissions.controller.js';

// ─── Zod schemas ─────────────────────────────────────────────────────────────

const templateSchema = z.object({
  name:   z.string().min(1).max(200),
  nameEn: z.string().min(1).max(200),
  track:  z.enum(['FULL', 'EXPEDITED', 'EXEMPT']).nullable().optional(),
});

const sectionSchema = z.object({
  code:        z.string().min(1).max(50),
  title:       z.string().min(1).max(200),
  titleEn:     z.string().min(1).max(200),
  answerType:  z.enum(['ADEQUACY', 'YES_NO', 'YES_NO_PROBLEM']),
  yesIsProblem: z.boolean().optional(),
  description: z.string().max(500).optional(),
  orderIndex:  z.number().int().min(0),
});

const itemSchema = z.object({
  code:            z.string().min(1).max(80),
  label:           z.string().min(1).max(300),
  labelEn:         z.string().min(1).max(300),
  helpText:        z.string().max(500).optional(),
  helpTextEn:      z.string().max(500).optional(),
  orderIndex:      z.number().int().min(0),
  isRequired:      z.boolean().optional(),
  requiresDetails: z.boolean().optional(),
  conditional:     z.object({ dependsOn: z.string(), showWhen: z.string() }).nullable().optional(),
});

const sectionWithItemsSchema = sectionSchema.extend({
  items: z.array(itemSchema).default([]),
})

const templateUpdateSchema = templateSchema.partial().extend({
  sections: z.array(sectionWithItemsSchema).optional(),
})

const responseSchema = z.object({
  fieldKey: z.string().min(1).max(200),
  status: z.enum(['VALID', 'INVALID', 'NA']),
  comment: z.string().max(2000).optional(),
});

const saveDraftSchema = z.object({
  responses: z.array(responseSchema).optional(),
  generalNote: z.string().max(2000).optional(),
  impression: z.string().max(2000).optional(),
});

const submitSchema = saveDraftSchema.extend({
  recommendation: z.enum([
    'EXEMPT', 'APPROVED', 'APPROVED_CONDITIONAL', 'REVISION_REQUIRED', 'REJECTED',
  ]),
});

/**
 * Ensures reviewers can only list reviews for submissions visible to them.
 * @param {{ id: string, roles?: string[] }} user
 * @param {string} submissionId
 * @returns {Promise<void>}
 */
async function assertReviewerCanListReviews(user, submissionId) {
  const where = await roleFilter(user, 'REVIEWER', { id: submissionId });
  const visible = await prisma.submission.findFirst({
    where,
    select: { id: true },
  });
  if (!visible) {
    throw new AppError('Submission not found', 'SUBMISSION_NOT_FOUND', 404);
  }
}

// ─── Admin: Template handlers ─────────────────────────────────────────────────

/**
 * GET /api/reviewer-checklist/templates
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function listTemplates(req, res, next) {
  try {
    const templates = await service.listTemplates();
    res.json({ data: templates });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/reviewer-checklist/templates/:id
 */
export async function getTemplate(req, res, next) {
  try {
    const template = await service.getTemplateWithSections(req.params.id);
    res.json({ data: template });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/reviewer-checklist/templates
 */
export async function createTemplate(req, res, next) {
  try {
    const data = templateSchema.parse(req.body);
    const template = await service.createTemplate(data);
    res.status(201).json({ data: template });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/reviewer-checklist/templates/:id
 */
export async function updateTemplate(req, res, next) {
  try {
    const data = templateUpdateSchema.parse(req.body);
    const template = await service.updateTemplate(req.params.id, data);
    res.json({ data: template });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/reviewer-checklist/templates/:id/publish
 */
export async function publishTemplate(req, res, next) {
  try {
    const template = await service.publishTemplate(req.params.id, req.user.id);
    res.json({ data: template });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/reviewer-checklist/templates/:id/clone
 */
export async function cloneTemplate(req, res, next) {
  try {
    const clone = await service.cloneTemplate(req.params.id, req.user.id);
    res.status(201).json({ data: clone });
  } catch (err) {
    next(err);
  }
}

// ─── Admin: Section handlers ──────────────────────────────────────────────────

/**
 * POST /api/reviewer-checklist/templates/:id/sections
 */
export async function createSection(req, res, next) {
  try {
    const data = sectionSchema.parse(req.body);
    const section = await service.createSection(req.params.id, data);
    res.status(201).json({ data: section });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/reviewer-checklist/sections/:sectionId
 */
export async function updateSection(req, res, next) {
  try {
    const data = sectionSchema.partial().parse(req.body);
    const section = await service.updateSection(req.params.sectionId, data);
    res.json({ data: section });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/reviewer-checklist/sections/:sectionId
 */
export async function deleteSection(req, res, next) {
  try {
    await service.deleteSection(req.params.sectionId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

// ─── Admin: Item handlers ─────────────────────────────────────────────────────

/**
 * POST /api/reviewer-checklist/sections/:sectionId/items
 */
export async function createItem(req, res, next) {
  try {
    const data = itemSchema.parse(req.body);
    const item = await service.createItem(req.params.sectionId, data);
    res.status(201).json({ data: item });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/reviewer-checklist/items/:itemId
 */
export async function updateItem(req, res, next) {
  try {
    const data = itemSchema.partial().parse(req.body);
    const item = await service.updateItem(req.params.itemId, data);
    res.json({ data: item });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/reviewer-checklist/items/:itemId (soft delete)
 */
export async function deactivateItem(req, res, next) {
  try {
    await service.deactivateItem(req.params.itemId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/reviewer-checklist/items/reorder
 */
export async function reorderItems(req, res, next) {
  try {
    const { items } = z.object({
      items: z.array(z.object({ id: z.string().uuid(), orderIndex: z.number().int().min(0) })).min(1),
    }).parse(req.body);
    await service.reorderItems(items);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// ─── Reviewer handlers ────────────────────────────────────────────────────────

/**
 * GET /api/submissions/:id/checklist
 * Returns dynamic field list + reviewer's current review + saved responses.
 */
export async function getChecklist(req, res, next) {
  try {
    const result = await service.getOrCreateReview(req.params.id, req.user.id);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/submissions/:id/checklist
 * Auto-save draft per-field review responses.
 */
export async function saveDraft(req, res, next) {
  try {
    const payload = saveDraftSchema.parse(req.body);
    const { review } = await service.getOrCreateReview(req.params.id, req.user.id);
    const updated = await service.saveDraft(review.id, req.user.id, payload);
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/submissions/:id/checklist/submit
 * Submit a completed review. All required items must be answered.
 */
export async function submitReview(req, res, next) {
  try {
    const payload = submitSchema.parse(req.body);
    const { review } = await service.getOrCreateReview(req.params.id, req.user.id);
    const submitted = await service.submitReview(review.id, req.user.id, payload);
    res.json({ data: submitted });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/submissions/:id/reviews
 * Read-only view of reviewer field reviews for a submission.
 * Staff (SECRETARY/CHAIRMAN/ADMIN) see every review including drafts.
 * Committee reviewers see only SUBMITTED reviews, and are blocked when they have
 * a declared conflict of interest on the submission.
 */
export async function listSubmissionReviews(req, res, next) {
  try {
    const activeRole = getRequestRole(req);
    const isStaff = hasAnyRole(req.user, 'SECRETARY', 'CHAIRMAN', 'ADMIN');
    if (!isStaff && activeRole === 'REVIEWER') {
      await assertReviewerCanListReviews(req.user, req.params.id);
      const conflictCheck = await hasConflict(req.user.id, req.params.id);
      if (conflictCheck.conflict) {
        return next(new AppError('Conflict of interest', 'COI_BLOCKED', 403, { reasons: conflictCheck.reasons }));
      }
    }
    const result = await service.listSubmissionReviewsForStaff(req.params.id, {
      submittedOnly: !isStaff,
    });
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}
