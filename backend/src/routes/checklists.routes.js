/**
 * Reviewer Checklist Routes
 *
 * API endpoints for checklist templates and reviews.
 */

import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as checklistsController from '../controllers/checklists.controller.js';

const router = Router();

// ─────────────────────────────────────────────
// VALIDATION SCHEMAS
// ─────────────────────────────────────────────

const createTemplateSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(200),
    nameEn: z.string().min(1).max(200),
    track: z.enum(['FULL', 'EXPEDITED', 'EXEMPT']).nullable().optional(),
  }),
});

const updateTemplateSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(200).optional(),
    nameEn: z.string().min(1).max(200).optional(),
    track: z.enum(['FULL', 'EXPEDITED', 'EXEMPT']).nullable().optional(),
    sections: z
      .array(
        z.object({
          code: z.string().min(1).max(100),
          title: z.string().min(1).max(200),
          titleEn: z.string().min(1).max(200),
          description: z.string().max(500).optional(),
          answerType: z.enum(['ADEQUACY', 'YES_NO', 'YES_NO_PROBLEM']),
          yesIsProblem: z.boolean().optional(),
          orderIndex: z.number().int().min(0),
          items: z
            .array(
              z.object({
                code: z.string().min(1).max(100),
                label: z.string().min(1).max(200),
                labelEn: z.string().min(1).max(200),
                helpText: z.string().max(500).optional(),
                helpTextEn: z.string().max(500).optional(),
                orderIndex: z.number().int().min(0),
                isRequired: z.boolean().optional(),
                requiresDetails: z.boolean().optional(),
                conditional: z.object({}).optional(),
              })
            )
            .optional(),
        })
      )
      .optional(),
  }),
});

const createReviewSchema = z.object({
  body: z.object({
    submissionId: z.string().uuid(),
    reviewerId: z.string().uuid(),
    track: z.enum(['FULL', 'EXPEDITED', 'EXEMPT']).nullable().optional(),
  }),
});

const updateResponsesSchema = z.object({
  body: z.object({
    responses: z
      .array(
        z.object({
          itemId: z.string().uuid(),
          answer: z.enum(['ADEQUATE', 'INADEQUATE', 'YES', 'NO', 'NA']),
          details: z.string().max(2000).optional(),
        })
      )
      .min(1),
  }),
});

const submitReviewSchema = z.object({
  body: z.object({
    recommendation: z.enum(['EXEMPT', 'APPROVED', 'APPROVED_CONDITIONAL', 'REVISION_REQUIRED', 'REJECTED']),
    generalNote: z.string().max(5000).optional(),
  }),
});

// ─────────────────────────────────────────────
// ROUTES: TEMPLATE MANAGEMENT
// ─────────────────────────────────────────────

/**
 * GET /api/checklists/templates
 * List all checklist templates
 * Role: ADMIN
 */
router.get(
  '/templates',
  authenticate,
  authorize(['ADMIN']),
  checklistsController.listTemplates
);

/**
 * GET /api/checklists/templates/:id
 * Get a single template
 * Role: ADMIN
 */
router.get(
  '/templates/:id',
  authenticate,
  authorize(['ADMIN']),
  checklistsController.getTemplate
);

/**
 * POST /api/checklists/templates
 * Create a new checklist template (DRAFT)
 * Role: ADMIN
 */
router.post(
  '/templates',
  authenticate,
  authorize(['ADMIN']),
  validate(createTemplateSchema),
  checklistsController.createTemplate
);

/**
 * PUT /api/checklists/templates/:id
 * Update a template (only if DRAFT)
 * Role: ADMIN
 */
router.put(
  '/templates/:id',
  authenticate,
  authorize(['ADMIN']),
  validate(updateTemplateSchema),
  checklistsController.updateTemplate
);

/**
 * POST /api/checklists/templates/:id/publish
 * Publish a template (sets isActive=true, deactivates previous)
 * Role: ADMIN
 */
router.post(
  '/templates/:id/publish',
  authenticate,
  authorize(['ADMIN']),
  checklistsController.publishTemplate
);

// ─────────────────────────────────────────────
// ROUTES: REVIEW WORKFLOW
// ─────────────────────────────────────────────

/**
 * POST /api/checklists/reviews
 * Create a checklist review for a submission
 * Called when secretary assigns reviewer
 * Role: SECRETARY, ADMIN
 */
router.post(
  '/reviews',
  authenticate,
  authorize(['SECRETARY', 'ADMIN']),
  validate(createReviewSchema),
  checklistsController.createChecklistReview
);

/**
 * GET /api/checklists/reviews/:id
 * Get a checklist review (reviewer can see own, secretary/admin can see all)
 * Role: REVIEWER, SECRETARY, ADMIN
 */
router.get(
  '/reviews/:id',
  authenticate,
  authorize(['REVIEWER', 'SECRETARY', 'ADMIN']),
  checklistsController.getChecklistReview
);

/**
 * PUT /api/checklists/reviews/:id
 * Update responses (save draft)
 * Role: REVIEWER (own), ADMIN
 */
router.put(
  '/reviews/:id',
  authenticate,
  authorize(['REVIEWER', 'ADMIN']),
  validate(updateResponsesSchema),
  checklistsController.updateChecklistResponses
);

/**
 * POST /api/checklists/reviews/:id/submit
 * Submit a completed checklist review
 * Role: REVIEWER (own), ADMIN
 */
router.post(
  '/reviews/:id/submit',
  authenticate,
  authorize(['REVIEWER', 'ADMIN']),
  validate(submitReviewSchema),
  checklistsController.submitChecklistReview
);

/**
 * GET /api/checklists/submission/:submissionId
 * Get all checklist reviews for a submission
 * Role: SECRETARY, ADMIN
 */
router.get(
  '/submission/:submissionId',
  authenticate,
  authorize(['SECRETARY', 'ADMIN']),
  checklistsController.getSubmissionReviews
);

/**
 * GET /api/checklists/my-assignments
 * Get reviewer's incomplete checklist assignments
 * Role: REVIEWER
 */
router.get(
  '/my-assignments',
  authenticate,
  authorize(['REVIEWER']),
  checklistsController.getMyChecklistAssignments
);

export default router;
