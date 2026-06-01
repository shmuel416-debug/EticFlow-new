-- Migration: per_field_review
-- Replaces checklist item responses with dynamic per-form-field review responses.

-- ─────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────

CREATE TYPE "ReviewerFieldStatus" AS ENUM ('VALID', 'INVALID', 'NA');

-- ─────────────────────────────────────────────
-- REVIEWER CHECKLIST REVIEWS
-- ─────────────────────────────────────────────

ALTER TABLE "reviewer_checklist_reviews"
  ALTER COLUMN "template_id" DROP NOT NULL,
  ADD COLUMN "impression" TEXT;

-- ─────────────────────────────────────────────
-- PER-FIELD RESPONSES
-- ─────────────────────────────────────────────

CREATE TABLE "reviewer_field_responses" (
  "id"         TEXT                  NOT NULL,
  "review_id"  TEXT                  NOT NULL,
  "field_key"  TEXT                  NOT NULL,
  "status"     "ReviewerFieldStatus" NOT NULL,
  "comment"    TEXT,
  "created_at" TIMESTAMPTZ           NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ           NOT NULL DEFAULT NOW(),

  CONSTRAINT "reviewer_field_responses_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "reviewer_field_responses_review_field_key_key"
    UNIQUE ("review_id", "field_key"),
  CONSTRAINT "reviewer_field_responses_review_id_fkey"
    FOREIGN KEY ("review_id")
    REFERENCES "reviewer_checklist_reviews" ("id")
    ON DELETE CASCADE
);

CREATE INDEX "reviewer_field_responses_review_id_idx"
  ON "reviewer_field_responses" ("review_id");
