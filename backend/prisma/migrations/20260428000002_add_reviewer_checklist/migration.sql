-- Migration: add_reviewer_checklist
-- Sprint 14: Adds dynamic reviewer checklist system
-- Tables: reviewer_checklist_templates, sections, items, reviews, responses

-- ─────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────

CREATE TYPE "ChecklistAnswerType" AS ENUM ('ADEQUACY', 'YES_NO', 'YES_NO_PROBLEM');
CREATE TYPE "ChecklistReviewStatus" AS ENUM ('DRAFT', 'SUBMITTED');
CREATE TYPE "ChecklistRecommendation" AS ENUM (
  'EXEMPT',
  'APPROVED',
  'APPROVED_CONDITIONAL',
  'REVISION_REQUIRED',
  'REJECTED'
);

-- ─────────────────────────────────────────────
-- TEMPLATES
-- ─────────────────────────────────────────────

CREATE TABLE "reviewer_checklist_templates" (
  "id"           UUID         NOT NULL DEFAULT gen_random_uuid(),
  "name"         TEXT         NOT NULL,
  "name_en"      TEXT         NOT NULL,
  "version"      INTEGER      NOT NULL DEFAULT 1,
  "track"        TEXT,                           -- NULL = all tracks
  "is_active"    BOOLEAN      NOT NULL DEFAULT false,
  "is_published" BOOLEAN      NOT NULL DEFAULT false,
  "published_at" TIMESTAMPTZ,
  "created_at"   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updated_at"   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT "reviewer_checklist_templates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "reviewer_checklist_templates_is_active_track_idx"
  ON "reviewer_checklist_templates" ("is_active", "track");

-- ─────────────────────────────────────────────
-- SECTIONS
-- ─────────────────────────────────────────────

CREATE TABLE "reviewer_checklist_sections" (
  "id"            UUID                  NOT NULL DEFAULT gen_random_uuid(),
  "template_id"   UUID                  NOT NULL,
  "code"          TEXT                  NOT NULL,
  "title"         TEXT                  NOT NULL,
  "title_en"      TEXT                  NOT NULL,
  "description"   TEXT,
  "answer_type"   "ChecklistAnswerType" NOT NULL,
  "yes_is_problem" BOOLEAN              NOT NULL DEFAULT false,
  "order_index"   INTEGER               NOT NULL,
  "created_at"    TIMESTAMPTZ           NOT NULL DEFAULT NOW(),
  "updated_at"    TIMESTAMPTZ           NOT NULL DEFAULT NOW(),

  CONSTRAINT "reviewer_checklist_sections_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "reviewer_checklist_sections_template_id_code_key"
    UNIQUE ("template_id", "code"),
  CONSTRAINT "reviewer_checklist_sections_template_id_fkey"
    FOREIGN KEY ("template_id")
    REFERENCES "reviewer_checklist_templates" ("id")
    ON DELETE CASCADE
);

CREATE INDEX "reviewer_checklist_sections_template_order_idx"
  ON "reviewer_checklist_sections" ("template_id", "order_index");

-- ─────────────────────────────────────────────
-- ITEMS
-- ─────────────────────────────────────────────

CREATE TABLE "reviewer_checklist_items" (
  "id"               UUID        NOT NULL DEFAULT gen_random_uuid(),
  "section_id"       UUID        NOT NULL,
  "code"             TEXT        NOT NULL,
  "label"            TEXT        NOT NULL,
  "label_en"         TEXT        NOT NULL,
  "help_text"        TEXT,
  "help_text_en"     TEXT,
  "order_index"      INTEGER     NOT NULL,
  "is_required"      BOOLEAN     NOT NULL DEFAULT true,
  "requires_details" BOOLEAN     NOT NULL DEFAULT false,
  "conditional"      JSONB,
  "is_active"        BOOLEAN     NOT NULL DEFAULT true,
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "reviewer_checklist_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "reviewer_checklist_items_section_id_code_key"
    UNIQUE ("section_id", "code"),
  CONSTRAINT "reviewer_checklist_items_section_id_fkey"
    FOREIGN KEY ("section_id")
    REFERENCES "reviewer_checklist_sections" ("id")
    ON DELETE CASCADE
);

CREATE INDEX "reviewer_checklist_items_section_order_active_idx"
  ON "reviewer_checklist_items" ("section_id", "order_index", "is_active");

-- ─────────────────────────────────────────────
-- REVIEWS
-- ─────────────────────────────────────────────

CREATE TABLE "reviewer_checklist_reviews" (
  "id"                           UUID                     NOT NULL DEFAULT gen_random_uuid(),
  "submission_id"                UUID                     NOT NULL,
  "reviewer_id"                  UUID                     NOT NULL,
  "template_id"                  UUID                     NOT NULL,
  "status"                       "ChecklistReviewStatus"  NOT NULL DEFAULT 'DRAFT',
  "recommendation"               "ChecklistRecommendation",
  "general_note"                 TEXT,
  "exempt_consent_requested"     BOOLEAN,
  "exempt_consent_reviewer_view" TEXT,               -- 'APPROVE' | 'REJECT'
  "minors_both_parents_exempt"   BOOLEAN,
  "minors_exempt_reviewer_view"  TEXT,               -- 'APPROVE' | 'REJECT'
  "submitted_at"                 TIMESTAMPTZ,
  "created_at"                   TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
  "updated_at"                   TIMESTAMPTZ          NOT NULL DEFAULT NOW(),

  CONSTRAINT "reviewer_checklist_reviews_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "reviewer_checklist_reviews_submission_reviewer_key"
    UNIQUE ("submission_id", "reviewer_id"),
  CONSTRAINT "reviewer_checklist_reviews_submission_id_fkey"
    FOREIGN KEY ("submission_id")
    REFERENCES "submissions" ("id"),
  CONSTRAINT "reviewer_checklist_reviews_reviewer_id_fkey"
    FOREIGN KEY ("reviewer_id")
    REFERENCES "users" ("id"),
  CONSTRAINT "reviewer_checklist_reviews_template_id_fkey"
    FOREIGN KEY ("template_id")
    REFERENCES "reviewer_checklist_templates" ("id")
);

CREATE INDEX "reviewer_checklist_reviews_submission_status_idx"
  ON "reviewer_checklist_reviews" ("submission_id", "status");
CREATE INDEX "reviewer_checklist_reviews_reviewer_status_idx"
  ON "reviewer_checklist_reviews" ("reviewer_id", "status");

-- ─────────────────────────────────────────────
-- RESPONSES
-- ─────────────────────────────────────────────

CREATE TABLE "reviewer_checklist_responses" (
  "id"         UUID        NOT NULL DEFAULT gen_random_uuid(),
  "review_id"  UUID        NOT NULL,
  "item_id"    UUID        NOT NULL,
  "item_code"  TEXT        NOT NULL,   -- snapshot for audit stability
  "answer"     TEXT        NOT NULL,   -- ADEQUATE | INADEQUATE | YES | NO | NA
  "details"    TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "reviewer_checklist_responses_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "reviewer_checklist_responses_review_item_key"
    UNIQUE ("review_id", "item_id"),
  CONSTRAINT "reviewer_checklist_responses_review_id_fkey"
    FOREIGN KEY ("review_id")
    REFERENCES "reviewer_checklist_reviews" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "reviewer_checklist_responses_item_id_fkey"
    FOREIGN KEY ("item_id")
    REFERENCES "reviewer_checklist_items" ("id")
);

CREATE INDEX "reviewer_checklist_responses_review_id_idx"
  ON "reviewer_checklist_responses" ("review_id");
