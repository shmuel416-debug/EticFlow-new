/**
 * Reviewer Checklist Controller
 *
 * HTTP handlers for checklist template management and review workflows.
 * Routes:
 * - GET /api/checklists/templates — List templates (admin)
 * - POST /api/checklists/templates — Create template (admin)
 * - GET /api/checklists/templates/:id — Get template (admin)
 * - PUT /api/checklists/templates/:id — Update template (admin)
 * - POST /api/checklists/templates/:id/publish — Publish template (admin)
 * - POST /api/checklists/reviews — Create review for submission (auto on assign)
 * - GET /api/checklists/reviews/:id — Get review (reviewer/secretary/admin)
 * - PUT /api/checklists/reviews/:id — Update responses (reviewer)
 * - POST /api/checklists/reviews/:id/submit — Submit review (reviewer)
 * - GET /api/checklists/reviews/submission/:submissionId — Get all reviews (secretary/admin)
 * - GET /api/checklists/my-assignments — Get my incomplete reviews (reviewer)
 */

import * as checklistService from '../services/checklist.service.js';

/**
 * List reviewer checklist templates
 * GET /api/checklists/templates
 * Query: {skip, take, isActive}
 */
export async function listTemplates(req, res, next) {
  try {
    const { skip = 0, take = 10, isActive = true } = req.query;
    const result = await checklistService.listTemplates({
      skip: Number(skip),
      take: Number(take),
      isActive: isActive === 'true',
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * Get a single template by ID
 * GET /api/checklists/templates/:id
 */
export async function getTemplate(req, res, next) {
  try {
    const { id } = req.params;
    const template = await checklistService.getTemplate(id);
    res.json({ template });
  } catch (err) {
    next(err);
  }
}

/**
 * Create a new checklist template
 * POST /api/checklists/templates
 * Body: {name, nameEn, track}
 */
export async function createTemplate(req, res, next) {
  try {
    const { name, nameEn, track } = req.body;
    const template = await checklistService.createTemplate({
      name,
      nameEn,
      track: track || null,
    });

    // Audit log
    await req.auditLog('checklist.create', 'ReviewerChecklistTemplate', {
      templateId: template.id,
      name,
      track,
    });

    res.status(201).json({ template });
  } catch (err) {
    next(err);
  }
}

/**
 * Update a checklist template
 * PUT /api/checklists/templates/:id
 * Body: {name, nameEn, track, sections}
 */
export async function updateTemplate(req, res, next) {
  try {
    const { id } = req.params;
    const { name, nameEn, track, sections } = req.body;

    const template = await checklistService.updateTemplate(id, {
      name,
      nameEn,
      track,
      sections,
    });

    // Audit log
    await req.auditLog('checklist.update', 'ReviewerChecklistTemplate', {
      templateId: id,
      name,
      track,
      sectionCount: sections?.length || 0,
    });

    res.json({ template });
  } catch (err) {
    next(err);
  }
}

/**
 * Publish a checklist template
 * POST /api/checklists/templates/:id/publish
 */
export async function publishTemplate(req, res, next) {
  try {
    const { id } = req.params;
    const published = await checklistService.publishTemplate(id);

    // Audit log
    await req.auditLog('checklist.publish', 'ReviewerChecklistTemplate', {
      templateId: id,
      name: published.name,
      track: published.track,
    });

    res.json({ template: published });
  } catch (err) {
    next(err);
  }
}

/**
 * Create a checklist review for submission
 * POST /api/checklists/reviews
 * Body: {submissionId, reviewerId, track}
 * Called when secretary assigns reviewer
 */
export async function createChecklistReview(req, res, next) {
  try {
    const { submissionId, reviewerId, track = null } = req.body;

    const review = await checklistService.createChecklistReview(
      submissionId,
      reviewerId,
      track
    );

    // Audit log
    await req.auditLog('checklist.review.create', 'ReviewerChecklistReview', {
      reviewId: review.id,
      submissionId,
      reviewerId,
      track,
    });

    res.status(201).json({ review });
  } catch (err) {
    next(err);
  }
}

/**
 * Get a checklist review
 * GET /api/checklists/reviews/:id
 */
export async function getChecklistReview(req, res, next) {
  try {
    const { id } = req.params;
    const review = await checklistService.getChecklistReview(id);

    // RBAC: reviewer can see own review, secretary/admin can see all
    const isOwnReview = req.user.id === review.reviewerId;
    if (!isOwnReview && !['SECRETARY', 'ADMIN'].includes(req.user.roles[0])) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Cannot view this review' });
    }

    res.json({ review });
  } catch (err) {
    next(err);
  }
}

/**
 * Update checklist responses (save draft)
 * PUT /api/checklists/reviews/:id
 * Body: {responses: [{itemId, answer, details}]}
 */
export async function updateChecklistResponses(req, res, next) {
  try {
    const { id } = req.params;
    const { responses } = req.body;

    // Verify ownership
    const review = await checklistService.getChecklistReview(id);
    if (req.user.id !== review.reviewerId && !['ADMIN'].includes(req.user.roles[0])) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Cannot update this review' });
    }

    const updated = await checklistService.updateChecklistResponses(id, responses);

    // Audit log
    await req.auditLog('checklist.review.update', 'ReviewerChecklistReview', {
      reviewId: id,
      responseCount: responses.length,
    });

    res.json({ review: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * Submit checklist review
 * POST /api/checklists/reviews/:id/submit
 * Body: {recommendation, generalNote}
 */
export async function submitChecklistReview(req, res, next) {
  try {
    const { id } = req.params;
    const { recommendation, generalNote } = req.body;

    // Verify ownership
    const review = await checklistService.getChecklistReview(id);
    if (req.user.id !== review.reviewerId && !['ADMIN'].includes(req.user.roles[0])) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Cannot submit this review' });
    }

    const submitted = await checklistService.submitChecklistReview(
      id,
      recommendation,
      generalNote
    );

    // Audit log
    await req.auditLog('checklist.review.submit', 'ReviewerChecklistReview', {
      reviewId: id,
      recommendation,
      hasGeneralNote: !!generalNote,
    });

    res.json({ review: submitted });
  } catch (err) {
    next(err);
  }
}

/**
 * Get all reviews for a submission
 * GET /api/checklists/submission/:submissionId
 */
export async function getSubmissionReviews(req, res, next) {
  try {
    const { submissionId } = req.params;
    const reviews = await checklistService.getSubmissionReviews(submissionId);

    res.json({ reviews, count: reviews.length });
  } catch (err) {
    next(err);
  }
}

/**
 * Get reviewer's incomplete checklist assignments
 * GET /api/checklists/my-assignments
 */
export async function getMyChecklistAssignments(req, res, next) {
  try {
    const assignments = await checklistService.getReviewerAssignments(req.user.id);
    res.json({ assignments, count: assignments.length });
  } catch (err) {
    next(err);
  }
}
