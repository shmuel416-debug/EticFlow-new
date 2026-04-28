/**
 * Reviewer Checklist Service
 *
 * Handles template management, review workflows, and response tracking.
 * Supports multi-track templates (nullable track = applies to all tracks).
 * DRAFT/SUBMITTED states separate from old submission status enum.
 */

import { prisma } from '../db.js';
import { AppError } from '../errors/AppError.js';

/**
 * List all reviewer checklist templates with pagination
 * @param {Object} opts - Options {skip, take, isActive}
 * @returns {Promise<Object>} {templates, total, skip, take}
 */
export async function listTemplates({ skip = 0, take = 10, isActive = true } = {}) {
  const templates = await prisma.reviewerChecklistTemplate.findMany({
    where: isActive ? { isActive: true } : undefined,
    skip,
    take,
    include: { sections: { include: { items: true } } },
    orderBy: { updatedAt: 'desc' },
  });

  const total = await prisma.reviewerChecklistTemplate.count({
    where: isActive ? { isActive: true } : undefined,
  });

  return { templates, total, skip, take };
}

/**
 * Get a single template by ID with all sections and items
 * @param {string} templateId - Template UUID
 * @returns {Promise<Object>} Template with sections and items
 */
export async function getTemplate(templateId) {
  const template = await prisma.reviewerChecklistTemplate.findUnique({
    where: { id: templateId },
    include: { sections: { include: { items: true }, orderBy: { orderIndex: 'asc' } } },
  });

  if (!template) {
    throw new AppError('TEMPLATE_NOT_FOUND', 'Checklist template not found', { templateId }, 404);
  }

  return template;
}

/**
 * Get active template for a given track
 * @param {string|null} track - Track code (null = all tracks, 'FULL', 'EXPEDITED', etc.)
 * @returns {Promise<Object>} Active template for track
 */
export async function getActiveTemplateForTrack(track = null) {
  const template = await prisma.reviewerChecklistTemplate.findFirst({
    where: {
      track,
      isActive: true,
      isPublished: true,
    },
    include: { sections: { include: { items: true }, orderBy: { orderIndex: 'asc' } } },
  });

  if (!template) {
    throw new AppError(
      'NO_ACTIVE_TEMPLATE',
      `No active template found for track: ${track || 'all'}`,
      { track },
      404
    );
  }

  return template;
}

/**
 * Create a new checklist template (DRAFT status)
 * @param {Object} data - {name, nameEn, track}
 * @returns {Promise<Object>} Created template
 */
export async function createTemplate({ name, nameEn, track = null }) {
  const template = await prisma.reviewerChecklistTemplate.create({
    data: {
      name,
      nameEn,
      track,
      version: 1,
      isActive: false,
      isPublished: false,
    },
  });

  return template;
}

/**
 * Update template metadata and sections/items
 * @param {string} templateId - Template UUID
 * @param {Object} data - {name, nameEn, track, sections}
 * @returns {Promise<Object>} Updated template
 */
export async function updateTemplate(templateId, { name, nameEn, track, sections }) {
  const template = await getTemplate(templateId);

  if (template.isPublished) {
    throw new AppError('CANNOT_EDIT_PUBLISHED', 'Cannot edit published template', {}, 400);
  }

  // Update template
  const updated = await prisma.reviewerChecklistTemplate.update({
    where: { id: templateId },
    data: {
      name: name || template.name,
      nameEn: nameEn || template.nameEn,
      track: track !== undefined ? track : template.track,
    },
  });

  // If sections provided, rebuild them
  if (sections && Array.isArray(sections)) {
    // Delete old sections (cascades to items)
    await prisma.reviewerChecklistSection.deleteMany({ where: { templateId } });

    // Create new sections with items
    for (const section of sections) {
      const createdSection = await prisma.reviewerChecklistSection.create({
        data: {
          templateId,
          code: section.code,
          title: section.title,
          titleEn: section.titleEn,
          description: section.description,
          answerType: section.answerType,
          yesIsProblem: section.yesIsProblem || false,
          orderIndex: section.orderIndex,
        },
      });

      if (section.items && Array.isArray(section.items)) {
        for (const item of section.items) {
          await prisma.reviewerChecklistItem.create({
            data: {
              sectionId: createdSection.id,
              code: item.code,
              label: item.label,
              labelEn: item.labelEn,
              helpText: item.helpText,
              helpTextEn: item.helpTextEn,
              orderIndex: item.orderIndex,
              isRequired: item.isRequired || true,
              requiresDetails: item.requiresDetails || false,
              conditional: item.conditional || null,
              isActive: true,
            },
          });
        }
      }
    }
  }

  return getTemplate(templateId);
}

/**
 * Publish a template (sets isActive=true for this track, deactivates previous)
 * @param {string} templateId - Template UUID
 * @returns {Promise<Object>} Published template
 */
export async function publishTemplate(templateId) {
  const template = await getTemplate(templateId);

  if (!template.sections || template.sections.length === 0) {
    throw new AppError('EMPTY_TEMPLATE', 'Cannot publish template without sections', {}, 400);
  }

  // Deactivate any previous active template for this track
  if (template.track === null || template.track === undefined) {
    await prisma.reviewerChecklistTemplate.updateMany({
      where: {
        track: null,
        isActive: true,
        id: { not: templateId },
      },
      data: { isActive: false },
    });
  } else {
    await prisma.reviewerChecklistTemplate.updateMany({
      where: {
        track: template.track,
        isActive: true,
        id: { not: templateId },
      },
      data: { isActive: false },
    });
  }

  // Publish this template
  const published = await prisma.reviewerChecklistTemplate.update({
    where: { id: templateId },
    data: {
      isActive: true,
      isPublished: true,
      publishedAt: new Date(),
    },
  });

  return published;
}

/**
 * Create a checklist review (called when reviewer assigned)
 * @param {string} submissionId - Submission UUID
 * @param {string} reviewerId - Reviewer user UUID
 * @param {string} track - Track code (used to find active template)
 * @returns {Promise<Object>} Created review with empty responses
 */
export async function createChecklistReview(submissionId, reviewerId, track = null) {
  // Check if review already exists
  const existing = await prisma.reviewerChecklistReview.findUnique({
    where: {
      submissionId_reviewerId: { submissionId, reviewerId },
    },
  });

  if (existing) {
    throw new AppError(
      'REVIEW_EXISTS',
      'Checklist review already exists for this reviewer',
      { submissionId, reviewerId },
      400
    );
  }

  // Get active template for track
  const template = await getActiveTemplateForTrack(track);

  // Create review
  const review = await prisma.reviewerChecklistReview.create({
    data: {
      submissionId,
      reviewerId,
      templateId: template.id,
      status: 'DRAFT',
    },
  });

  return review;
}

/**
 * Get a reviewer's checklist review
 * @param {string} reviewId - Review UUID
 * @returns {Promise<Object>} Review with sections, items, and responses
 */
export async function getChecklistReview(reviewId) {
  const review = await prisma.reviewerChecklistReview.findUnique({
    where: { id: reviewId },
    include: {
      template: {
        include: {
          sections: { include: { items: true }, orderBy: { orderIndex: 'asc' } },
        },
      },
      responses: true,
    },
  });

  if (!review) {
    throw new AppError('REVIEW_NOT_FOUND', 'Checklist review not found', { reviewId }, 404);
  }

  return review;
}

/**
 * Update responses for a checklist review
 * @param {string} reviewId - Review UUID
 * @param {Array} responses - [{itemId, answer, details}]
 * @returns {Promise<Object>} Updated review
 */
export async function updateChecklistResponses(reviewId, responses) {
  const review = await getChecklistReview(reviewId);

  if (review.status === 'SUBMITTED') {
    throw new AppError('REVIEW_SUBMITTED', 'Cannot update submitted review', {}, 400);
  }

  for (const response of responses) {
    const { itemId, answer, details } = response;

    // Get item to snapshot code
    const item = await prisma.reviewerChecklistItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new AppError('ITEM_NOT_FOUND', 'Checklist item not found', { itemId }, 404);
    }

    // Upsert response
    await prisma.reviewerChecklistResponse.upsert({
      where: {
        reviewId_itemId: { reviewId, itemId },
      },
      create: {
        reviewId,
        itemId,
        itemCode: item.code,
        answer,
        details,
      },
      update: {
        answer,
        details,
        updatedAt: new Date(),
      },
    });
  }

  return getChecklistReview(reviewId);
}

/**
 * Submit a completed checklist review
 * @param {string} reviewId - Review UUID
 * @param {string} recommendation - ChecklistRecommendation enum
 * @param {string} generalNote - Optional general note
 * @returns {Promise<Object>} Submitted review
 */
export async function submitChecklistReview(reviewId, recommendation, generalNote = null) {
  const review = await getChecklistReview(reviewId);

  if (review.status === 'SUBMITTED') {
    throw new AppError('ALREADY_SUBMITTED', 'Review already submitted', {}, 400);
  }

  // Count required items without responses
  const template = review.template;
  const allItems = [];
  for (const section of template.sections) {
    allItems.push(...section.items);
  }

  const requiredItems = allItems.filter((i) => i.isRequired && i.isActive);
  const respondedItemIds = new Set(review.responses.map((r) => r.itemId));
  const missingRequired = requiredItems.filter((i) => !respondedItemIds.has(i.id));

  if (missingRequired.length > 0) {
    throw new AppError(
      'INCOMPLETE_REVIEW',
      `Missing required items: ${missingRequired.map((i) => i.code).join(', ')}`,
      { missingItems: missingRequired },
      400
    );
  }

  // Update review
  const submitted = await prisma.reviewerChecklistReview.update({
    where: { id: reviewId },
    data: {
      status: 'SUBMITTED',
      recommendation,
      generalNote,
      submittedAt: new Date(),
    },
  });

  return submitted;
}

/**
 * Get all reviews for a submission
 * @param {string} submissionId - Submission UUID
 * @returns {Promise<Array>} All reviews for submission
 */
export async function getSubmissionReviews(submissionId) {
  const reviews = await prisma.reviewerChecklistReview.findMany({
    where: { submissionId },
    include: {
      reviewer: { select: { id: true, fullName: true, email: true } },
      template: { select: { id: true, name: true } },
      responses: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  return reviews;
}

/**
 * Get a reviewer's assignments (incomplete checklists)
 * @param {string} reviewerId - Reviewer user UUID
 * @returns {Promise<Array>} Incomplete checklist reviews
 */
export async function getReviewerAssignments(reviewerId) {
  const reviews = await prisma.reviewerChecklistReview.findMany({
    where: {
      reviewerId,
      status: 'DRAFT',
    },
    include: {
      submission: { select: { id: true, applicationId: true } },
      template: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return reviews;
}
