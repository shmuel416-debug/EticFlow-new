/**
 * reviewerChecklist.service.js
 * Business logic for the dynamic reviewer checklist system.
 * Handles template management (admin) and review lifecycle (reviewer).
 */

import prisma from '../config/database.js';
import { AppError } from '../utils/errors.js';
import { notifyStatusChange } from './notification.service.js';
import { setDueDates } from './sla.service.js';

// ─── Template queries ────────────────────────────────────────────────────────

/**
 * Find the active+published template for a given track.
 * Prefers a track-specific template; falls back to the null-track (universal) template.
 * @param {string|null} track - Submission track or null
 * @returns {Promise<object|null>}
 */
export async function getActiveTemplate(track) {
  const specific = track
    ? await prisma.reviewerChecklistTemplate.findFirst({
        where: { isActive: true, isPublished: true, track },
      })
    : null;
  if (specific) return specific;

  return prisma.reviewerChecklistTemplate.findFirst({
    where: { isActive: true, isPublished: true, track: null },
  });
}

/**
 * Return a full template with ordered sections and active items.
 * @param {string} templateId
 * @returns {Promise<object>}
 */
export async function getTemplateWithSections(templateId) {
  const template = await prisma.reviewerChecklistTemplate.findUnique({
    where: { id: templateId },
    include: {
      sections: {
        orderBy: { orderIndex: 'asc' },
        include: {
          items: {
            where: { isActive: true },
            orderBy: { orderIndex: 'asc' },
          },
        },
      },
    },
  });
  if (!template) throw new AppError('Template not found', 'TEMPLATE_NOT_FOUND', 404);
  return template;
}

/**
 * List all templates, newest first.
 * @returns {Promise<object[]>}
 */
export async function listTemplates() {
  return prisma.reviewerChecklistTemplate.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { sections: true, reviews: true } } },
  });
}

// ─── Template mutations ──────────────────────────────────────────────────────

/**
 * Create a new DRAFT template (not active, not published).
 * @param {{ name: string, nameEn: string, track?: string|null }} data
 * @returns {Promise<object>}
 */
export async function createTemplate(data) {
  return prisma.reviewerChecklistTemplate.create({
    data: { ...data, isActive: false, isPublished: false, version: 1 },
  });
}

/**
 * Update template metadata. Blocked if already published.
 * @param {string} templateId
 * @param {{ name?: string, nameEn?: string, track?: string|null, sections?: object[] }} data
 * @returns {Promise<object>}
 */
export async function updateTemplate(templateId, data) {
  const tpl = await prisma.reviewerChecklistTemplate.findUnique({ where: { id: templateId } })
  if (!tpl) throw new AppError('Template not found', 'TEMPLATE_NOT_FOUND', 404)
  if (tpl.isPublished) throw new AppError('Cannot edit a published template', 'TEMPLATE_PUBLISHED', 409)

  const { sections, ...metadata } = data
  if (!Array.isArray(sections)) {
    return prisma.reviewerChecklistTemplate.update({ where: { id: templateId }, data: metadata })
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.reviewerChecklistTemplate.update({
      where: { id: templateId },
      data: metadata,
    })

    await tx.reviewerChecklistSection.deleteMany({ where: { templateId } })
    for (const section of sections) {
      const createdSection = await tx.reviewerChecklistSection.create({
        data: {
          templateId,
          code: section.code,
          title: section.title,
          titleEn: section.titleEn,
          description: section.description ?? null,
          answerType: section.answerType,
          yesIsProblem: Boolean(section.yesIsProblem),
          orderIndex: section.orderIndex,
        },
      })

      for (const item of section.items || []) {
        await tx.reviewerChecklistItem.create({
          data: {
            sectionId: createdSection.id,
            code: item.code,
            label: item.label,
            labelEn: item.labelEn,
            helpText: item.helpText ?? null,
            helpTextEn: item.helpTextEn ?? null,
            orderIndex: item.orderIndex,
            isRequired: item.isRequired !== false,
            requiresDetails: Boolean(item.requiresDetails),
            conditional: item.conditional ?? null,
          },
        })
      }
    }
    return updated
  })
}

/**
 * Publish a template: activate it and deactivate the previous active for the same track.
 * @param {string} templateId
 * @param {string} adminId - ID of admin performing the action
 * @returns {Promise<object>}
 */
export async function publishTemplate(templateId, adminId) {
  const tpl = await prisma.reviewerChecklistTemplate.findUnique({ where: { id: templateId } });
  if (!tpl) throw new AppError('Template not found', 'TEMPLATE_NOT_FOUND', 404);
  if (tpl.isPublished) throw new AppError('Template already published', 'ALREADY_PUBLISHED', 409);

  return prisma.$transaction(async (tx) => {
    await tx.reviewerChecklistTemplate.updateMany({
      where: { isActive: true, track: tpl.track, id: { not: templateId } },
      data: { isActive: false },
    });

    const published = await tx.reviewerChecklistTemplate.update({
      where: { id: templateId },
      data: { isActive: true, isPublished: true, publishedAt: new Date() },
    });

    await tx.auditLog.create({
      data: {
        userId: adminId,
        action: 'REVIEWER_CHECKLIST_TEMPLATE_PUBLISHED',
        entityType: 'ReviewerChecklistTemplate',
        entityId: templateId,
        metaJson: { name: tpl.name, track: tpl.track, version: tpl.version },
      },
    });

    return published;
  });
}

/**
 * Deep-clone a template with all its sections and items.
 * The clone is a DRAFT with version incremented.
 * @param {string} templateId
 * @param {string} adminId
 * @returns {Promise<object>}
 */
export async function cloneTemplate(templateId, adminId) {
  const source = await getTemplateWithSections(templateId);

  return prisma.$transaction(async (tx) => {
    const maxVersion = await tx.reviewerChecklistTemplate.aggregate({
      where: { name: source.name },
      _max: { version: true },
    });

    const clone = await tx.reviewerChecklistTemplate.create({
      data: {
        name: source.name,
        nameEn: source.nameEn,
        track: source.track,
        version: (maxVersion._max.version ?? source.version) + 1,
        isActive: false,
        isPublished: false,
      },
    });

    for (const section of source.sections) {
      const { items, id: _sid, templateId: _tid, createdAt: _sc, updatedAt: _su, ...sectionData } = section;
      const newSection = await tx.reviewerChecklistSection.create({
        data: { ...sectionData, templateId: clone.id },
      });

      for (const item of items) {
        const { id: _iid, sectionId: _isid, createdAt: _ic, updatedAt: _iu, ...itemData } = item;
        await tx.reviewerChecklistItem.create({ data: { ...itemData, sectionId: newSection.id } });
      }
    }

    await tx.auditLog.create({
      data: {
        userId: adminId,
        action: 'REVIEWER_CHECKLIST_TEMPLATE_CLONED',
        entityType: 'ReviewerChecklistTemplate',
        entityId: clone.id,
        metaJson: { sourceId: templateId, version: clone.version },
      },
    });

    return clone;
  });
}

// ─── Section mutations ───────────────────────────────────────────────────────

/**
 * @param {string} templateId
 * @param {object} data - section fields
 */
async function assertTemplateEditable(templateId) {
  const tpl = await prisma.reviewerChecklistTemplate.findUnique({ where: { id: templateId } });
  if (!tpl) throw new AppError('Template not found', 'TEMPLATE_NOT_FOUND', 404);
  if (tpl.isPublished) throw new AppError('Cannot edit a published template', 'TEMPLATE_PUBLISHED', 409);
  return tpl;
}

/**
 * Add a section to a draft template.
 * @param {string} templateId
 * @param {object} data
 */
export async function createSection(templateId, data) {
  await assertTemplateEditable(templateId);
  return prisma.reviewerChecklistSection.create({ data: { ...data, templateId } });
}

/**
 * Update section fields. Template must be a draft.
 * @param {string} sectionId
 * @param {object} data
 */
export async function updateSection(sectionId, data) {
  const section = await prisma.reviewerChecklistSection.findUnique({ where: { id: sectionId } });
  if (!section) throw new AppError('Section not found', 'SECTION_NOT_FOUND', 404);
  await assertTemplateEditable(section.templateId);
  return prisma.reviewerChecklistSection.update({ where: { id: sectionId }, data });
}

/**
 * Hard-delete a section only if the parent template has no submitted reviews.
 * @param {string} sectionId
 */
export async function deleteSection(sectionId) {
  const section = await prisma.reviewerChecklistSection.findUnique({ where: { id: sectionId } });
  if (!section) throw new AppError('Section not found', 'SECTION_NOT_FOUND', 404);

  const reviewCount = await prisma.reviewerChecklistReview.count({
    where: { templateId: section.templateId },
  });
  if (reviewCount > 0) {
    throw new AppError(
      'Cannot delete section: template has existing reviews',
      'SECTION_HAS_REVIEWS',
      409
    );
  }

  return prisma.reviewerChecklistSection.delete({ where: { id: sectionId } });
}

// ─── Item mutations ──────────────────────────────────────────────────────────

/**
 * Add an item to a section.
 * @param {string} sectionId
 * @param {object} data
 */
export async function createItem(sectionId, data) {
  const section = await prisma.reviewerChecklistSection.findUnique({ where: { id: sectionId } });
  if (!section) throw new AppError('Section not found', 'SECTION_NOT_FOUND', 404);
  return prisma.reviewerChecklistItem.create({ data: { ...data, sectionId } });
}

/**
 * Update item fields.
 * @param {string} itemId
 * @param {object} data
 */
export async function updateItem(itemId, data) {
  const item = await prisma.reviewerChecklistItem.findUnique({ where: { id: itemId } });
  if (!item) throw new AppError('Item not found', 'ITEM_NOT_FOUND', 404);
  return prisma.reviewerChecklistItem.update({ where: { id: itemId }, data });
}

/**
 * Soft-delete an item (isActive = false). Never hard-deletes.
 * @param {string} itemId
 */
export async function deactivateItem(itemId) {
  const item = await prisma.reviewerChecklistItem.findUnique({ where: { id: itemId } });
  if (!item) throw new AppError('Item not found', 'ITEM_NOT_FOUND', 404);
  return prisma.reviewerChecklistItem.update({ where: { id: itemId }, data: { isActive: false } });
}

/**
 * Bulk-reorder items by setting orderIndex.
 * @param {Array<{ id: string, orderIndex: number }>} items
 */
export async function reorderItems(items) {
  return prisma.$transaction(
    items.map(({ id, orderIndex }) =>
      prisma.reviewerChecklistItem.update({ where: { id }, data: { orderIndex } })
    )
  );
}

// ─── Review lifecycle ────────────────────────────────────────────────────────

/**
 * Return existing DRAFT review for this reviewer+submission, or create one.
 * Loads the active template based on the submission's track.
 * @param {string} submissionId
 * @param {string} reviewerId
 * @returns {Promise<{ review: object, template: object, responses: object[] }>}
 */
export async function getOrCreateReview(submissionId, reviewerId) {
  const submission = await prisma.submission.findUnique({ where: { id: submissionId } });
  if (!submission) throw new AppError('Submission not found', 'SUBMISSION_NOT_FOUND', 404);
  if (submission.reviewerId !== reviewerId) {
    throw new AppError('Forbidden', 'FORBIDDEN', 403);
  }

  const template = await getActiveTemplate(submission.track);
  if (!template) throw new AppError('No active checklist template found', 'NO_ACTIVE_TEMPLATE', 404);

  let review = await prisma.reviewerChecklistReview.findUnique({
    where: { submissionId_reviewerId: { submissionId, reviewerId } },
  });

  if (!review) {
    review = await prisma.reviewerChecklistReview.create({
      data: { submissionId, reviewerId, templateId: template.id, status: 'DRAFT' },
    });
  }

  const [fullTemplate, responses] = await Promise.all([
    getTemplateWithSections(review.templateId),
    prisma.reviewerChecklistResponse.findMany({ where: { reviewId: review.id } }),
  ]);

  return { review, template: fullTemplate, responses };
}

/**
 * Upsert draft responses for a review. Validates requiresDetails constraint.
 * @param {string} reviewId
 * @param {string} reviewerId - Must match review.reviewerId
 * @param {object} payload
 */
export async function saveDraft(reviewId, reviewerId, payload) {
  const review = await prisma.reviewerChecklistReview.findUnique({ where: { id: reviewId } });
  if (!review) throw new AppError('Review not found', 'REVIEW_NOT_FOUND', 404);
  if (review.reviewerId !== reviewerId) throw new AppError('Forbidden', 'FORBIDDEN', 403);
  if (review.status === 'SUBMITTED') throw new AppError('Review already submitted', 'ALREADY_SUBMITTED', 409);

  const { responses = [], ...summaryFields } = payload;

  await validateDetailsConstraints(responses, review.templateId);

  return prisma.$transaction(async (tx) => {
    for (const r of responses) {
      await tx.reviewerChecklistResponse.upsert({
        where: { reviewId_itemId: { reviewId, itemId: r.itemId } },
        create: { reviewId, itemId: r.itemId, itemCode: r.itemCode, answer: r.answer, details: r.details ?? null },
        update: { answer: r.answer, details: r.details ?? null },
      });
    }

    return tx.reviewerChecklistReview.update({
      where: { id: reviewId },
      data: {
        generalNote: summaryFields.generalNote ?? undefined,
        exemptConsentRequested: summaryFields.exemptConsentRequested ?? undefined,
        exemptConsentReviewerView: summaryFields.exemptConsentReviewerView ?? undefined,
        minorsBothParentsExempt: summaryFields.minorsBothParentsExempt ?? undefined,
        minorsExemptReviewerView: summaryFields.minorsExemptReviewerView ?? undefined,
      },
    });
  });
}

/**
 * Submit a completed review. Validates all required items answered.
 * @param {string} reviewId
 * @param {string} reviewerId
 * @param {object} payload - Must include recommendation
 */
export async function submitReview(reviewId, reviewerId, payload) {
  const review = await prisma.reviewerChecklistReview.findUnique({ where: { id: reviewId } });
  if (!review) throw new AppError('Review not found', 'REVIEW_NOT_FOUND', 404);
  if (review.reviewerId !== reviewerId) throw new AppError('Forbidden', 'FORBIDDEN', 403);
  if (review.status === 'SUBMITTED') throw new AppError('Review already submitted', 'ALREADY_SUBMITTED', 409);
  const submission = await prisma.submission.findUnique({
    where: { id: review.submissionId },
    select: { status: true },
  });
  if (!submission) throw new AppError('Submission not found', 'SUBMISSION_NOT_FOUND', 404);
  if (submission.status !== 'ASSIGNED') {
    throw new AppError('Submission must be ASSIGNED', 'INVALID_TRANSITION', 409);
  }

  await validateSubmitCompleteness(reviewId, review.templateId);

  const submitted = await prisma.$transaction(async (tx) => {
    const submitted = await tx.reviewerChecklistReview.update({
      where: { id: reviewId },
      data: {
        status: 'SUBMITTED',
        recommendation: payload.recommendation,
        generalNote: payload.generalNote ?? null,
        exemptConsentRequested: payload.exemptConsentRequested ?? null,
        exemptConsentReviewerView: payload.exemptConsentReviewerView ?? null,
        minorsBothParentsExempt: payload.minorsBothParentsExempt ?? null,
        minorsExemptReviewerView: payload.minorsExemptReviewerView ?? null,
        submittedAt: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        userId: reviewerId,
        action: 'REVIEWER_CHECKLIST_SUBMITTED',
        entityType: 'ReviewerChecklistReview',
        entityId: reviewId,
        metaJson: { submissionId: review.submissionId, recommendation: payload.recommendation },
      },
    });

    await tx.submission.update({
      where: { id: review.submissionId },
      data: { status: 'IN_REVIEW' },
    });

    return submitted;
  });

  const updatedSubmission = await prisma.submission.findFirst({
    where: { id: review.submissionId, isActive: true },
    include: {
      author: { select: { id: true, email: true } },
      reviewer: { select: { id: true, email: true } },
    },
  });
  if (updatedSubmission) {
    setDueDates(review.submissionId, 'IN_REVIEW').catch(() => {});
    notifyStatusChange(updatedSubmission, 'IN_REVIEW').catch(() => {});
  }

  return submitted;
}

// ─── Internal validation helpers ─────────────────────────────────────────────

/**
 * Throw if any response violates the requiresDetails constraint.
 * @param {object[]} responses
 * @param {string} templateId
 */
async function validateDetailsConstraints(responses, templateId) {
  if (!responses.length) return;

  const itemIds = responses.map((r) => r.itemId);
  const items = await prisma.reviewerChecklistItem.findMany({
    where: { id: { in: itemIds } },
    select: { id: true, requiresDetails: true },
  });

  const requiresMap = Object.fromEntries(items.map((i) => [i.id, i.requiresDetails]));
  const negativeAnswers = new Set(['INADEQUATE', 'YES']);

  for (const r of responses) {
    if (requiresMap[r.itemId] && negativeAnswers.has(r.answer)) {
      if (!r.details || r.details.trim().length < 3) {
        throw new AppError(
          `Details required for item ${r.itemCode} when answer is ${r.answer}`,
          'DETAILS_REQUIRED',
          422
        );
      }
    }
  }
}

/**
 * Throw if any required+active item has no saved response.
 * @param {string} reviewId
 * @param {string} templateId
 */
async function validateSubmitCompleteness(reviewId, templateId) {
  const requiredItems = await prisma.reviewerChecklistItem.findMany({
    where: {
      isRequired: true,
      isActive: true,
      section: { templateId },
    },
    select: { id: true, code: true, conditional: true },
  });

  const responses = await prisma.reviewerChecklistResponse.findMany({
    where: { reviewId },
    select: { itemId: true, itemCode: true, answer: true },
  });

  const answeredIds = new Set(responses.map((r) => r.itemId));
  const answersByCode = responses.reduce((acc, row) => {
    if (row.itemCode && row.answer) acc[row.itemCode] = row.answer;
    return acc;
  }, {});

  const missing = requiredItems.filter((item) => {
    const rule = item.conditional;
    if (rule && typeof rule === 'object' && !Array.isArray(rule)) {
      const dependsOn = rule.dependsOn;
      const showWhen = rule.showWhen;
      if (dependsOn && showWhen) {
        const current = answersByCode[dependsOn];
        if (!current) return false;
        if (Array.isArray(showWhen)) {
          if (!showWhen.includes(current)) return false;
        } else if (current !== showWhen) {
          return false;
        }
      }
    }
    return !answeredIds.has(item.id);
  });

  if (missing.length > 0) {
    throw new AppError(
      `${missing.length} required item(s) have no answer`,
      'INCOMPLETE_CHECKLIST',
      422,
      { missingCodes: missing.map((i) => i.code) }
    );
  }
}
