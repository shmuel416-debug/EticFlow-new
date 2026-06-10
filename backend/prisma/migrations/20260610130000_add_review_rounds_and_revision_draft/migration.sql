-- ===========================================================================
-- Review rounds + REVISION_DRAFT status
-- Adds per-cycle review rounds (with reviewer history) and a researcher
-- revision-edit state, enabling submissions to be revised and re-reviewed across
-- multiple rounds while preserving each round's reviewers and reviews.
-- ===========================================================================

-- 1. Submission.currentRound — points at the active review round number.
ALTER TABLE "submissions"
  ADD COLUMN "current_round" INTEGER NOT NULL DEFAULT 1;

-- 2. review_rounds table.
CREATE TABLE "review_rounds" (
  "id" TEXT NOT NULL,
  "submission_id" TEXT NOT NULL,
  "round_num" INTEGER NOT NULL,
  "primary_reviewer_id" TEXT,
  "secondary_reviewer_id" TEXT,
  "outcome" VARCHAR(40),
  "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "review_rounds_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "review_rounds_submission_id_round_num_key" ON "review_rounds"("submission_id", "round_num");
CREATE INDEX "review_rounds_submission_id_idx" ON "review_rounds"("submission_id");

ALTER TABLE "review_rounds"
  ADD CONSTRAINT "review_rounds_submission_id_fkey"
  FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "review_rounds"
  ADD CONSTRAINT "review_rounds_primary_reviewer_id_fkey"
  FOREIGN KEY ("primary_reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "review_rounds"
  ADD CONSTRAINT "review_rounds_secondary_reviewer_id_fkey"
  FOREIGN KEY ("secondary_reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 3. reviewer_checklist_reviews.review_round_id
ALTER TABLE "reviewer_checklist_reviews"
  ADD COLUMN "review_round_id" TEXT;

-- 4. Backfill: create round 1 for every existing submission, snapshotting the
--    currently assigned reviewers. Deterministic id keeps the migration re-runnable.
INSERT INTO "review_rounds"
  ("id", "submission_id", "round_num", "primary_reviewer_id", "secondary_reviewer_id", "opened_at", "created_at", "updated_at")
SELECT md5(s."id" || '-round-1'),
       s."id",
       1,
       s."reviewer_id",
       s."secondary_reviewer_id",
       s."created_at",
       s."created_at",
       NOW()
FROM "submissions" s
WHERE NOT EXISTS (
  SELECT 1 FROM "review_rounds" rr WHERE rr."submission_id" = s."id" AND rr."round_num" = 1
);

-- 5. Link existing checklist reviews to their submission's round 1.
UPDATE "reviewer_checklist_reviews" r
SET "review_round_id" = rr."id"
FROM "review_rounds" rr
WHERE rr."submission_id" = r."submission_id"
  AND rr."round_num" = 1
  AND r."review_round_id" IS NULL;

-- 6. Swap the per-(submission,reviewer) uniqueness to per-(round,reviewer),
--    so the same reviewer can review the submission again in a later round.
DROP INDEX IF EXISTS "reviewer_checklist_reviews_submission_id_reviewer_id_key";
CREATE UNIQUE INDEX "reviewer_checklist_reviews_review_round_id_reviewer_id_key"
  ON "reviewer_checklist_reviews"("review_round_id", "reviewer_id");

-- 7. FK for review_round_id.
ALTER TABLE "reviewer_checklist_reviews"
  ADD CONSTRAINT "reviewer_checklist_reviews_review_round_id_fkey"
  FOREIGN KEY ("review_round_id") REFERENCES "review_rounds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 8. Insert the REVISION_DRAFT status (between PENDING_REVISION and APPROVED).
INSERT INTO "submission_statuses"
  ("id", "code", "label_he", "label_en", "description_he", "description_en", "color", "order_index", "is_initial", "is_terminal", "sla_phase", "notification_type", "is_system", "is_active", "created_at", "updated_at")
SELECT
  'b8e3d5a1-4c2f-4e6a-9f1b-2d7c3a4e5f60',
  'REVISION_DRAFT',
  'בעריכת תיקון',
  'Revision Draft',
  'החוקר/ת עורך/ת את הבקשה בעקבות בקשת תיקונים, לפני הגשה מחדש.',
  'The researcher is editing the submission following a revision request, before resubmitting.',
  '#f59e0b',
  65,
  false,
  false,
  NULL,
  NULL,
  true,
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "submission_statuses" WHERE "code" = 'REVISION_DRAFT'
);

-- 9. Transitions for the revision loop (idempotent).
INSERT INTO "status_transitions" (
  "id", "from_status_id", "to_status_id", "allowedRoles", "require_reviewer_assigned", "is_active", "created_at", "updated_at"
)
SELECT md5(from_status.id || to_status.id || clock_timestamp()::text),
       from_status.id,
       to_status.id,
       transition.allowed_roles::"Role"[],
       transition.require_reviewer_assigned,
       TRUE,
       NOW(),
       NOW()
FROM (
  VALUES
    ('PENDING_REVISION', 'REVISION_DRAFT', ARRAY['RESEARCHER','SECRETARY','ADMIN'], FALSE),
    ('REVISION_DRAFT', 'SUBMITTED', ARRAY['RESEARCHER','SECRETARY','ADMIN'], FALSE),
    ('REVISION_DRAFT', 'WITHDRAWN', ARRAY['RESEARCHER','SECRETARY','ADMIN'], FALSE)
) AS transition(from_code, to_code, allowed_roles, require_reviewer_assigned)
JOIN "submission_statuses" from_status ON from_status."code" = transition.from_code
JOIN "submission_statuses" to_status ON to_status."code" = transition.to_code
WHERE NOT EXISTS (
  SELECT 1 FROM "status_transitions" existing
  WHERE existing."from_status_id" = from_status."id"
    AND existing."to_status_id" = to_status."id"
);

-- 10. Permission grants for REVISION_DRAFT (only the allowed=TRUE rows; a missing
--     row resolves to "not allowed"). seed.js remains the canonical source.
INSERT INTO "status_permissions" (
  "id", "status_id", "role", "action", "allowed", "is_active", "created_at", "updated_at"
)
SELECT md5(target_status.id || grants.role || grants.action || clock_timestamp()::text),
       target_status.id,
       grants.role::"Role",
       grants.action::"StatusAction",
       TRUE,
       TRUE,
       NOW(),
       NOW()
FROM (
  VALUES
    ('RESEARCHER', 'VIEW'), ('SECRETARY', 'VIEW'), ('REVIEWER', 'VIEW'), ('CHAIRMAN', 'VIEW'), ('ADMIN', 'VIEW'),
    ('RESEARCHER', 'EDIT'), ('SECRETARY', 'EDIT'), ('ADMIN', 'EDIT'),
    ('SECRETARY', 'COMMENT'), ('REVIEWER', 'COMMENT'), ('CHAIRMAN', 'COMMENT'), ('ADMIN', 'COMMENT'),
    ('RESEARCHER', 'UPLOAD_DOC'), ('SECRETARY', 'UPLOAD_DOC'), ('ADMIN', 'UPLOAD_DOC'),
    ('RESEARCHER', 'DELETE_DOC'), ('SECRETARY', 'DELETE_DOC'), ('ADMIN', 'DELETE_DOC'),
    ('SECRETARY', 'VIEW_INTERNAL'), ('REVIEWER', 'VIEW_INTERNAL'), ('CHAIRMAN', 'VIEW_INTERNAL'), ('ADMIN', 'VIEW_INTERNAL'),
    ('SECRETARY', 'TRANSITION'), ('ADMIN', 'TRANSITION')
) AS grants(role, action)
JOIN "submission_statuses" target_status ON target_status."code" = 'REVISION_DRAFT'
WHERE NOT EXISTS (
  SELECT 1 FROM "status_permissions" existing
  WHERE existing."status_id" = target_status."id"
    AND existing."role" = grants.role::"Role"
    AND existing."action" = grants.action::"StatusAction"
);
