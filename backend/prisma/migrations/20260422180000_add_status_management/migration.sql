-- CreateEnum
CREATE TYPE "StatusAction" AS ENUM (
  'VIEW',
  'EDIT',
  'COMMENT',
  'UPLOAD_DOC',
  'DELETE_DOC',
  'VIEW_INTERNAL',
  'TRANSITION',
  'ASSIGN',
  'SUBMIT_REVIEW',
  'RECORD_DECISION'
);

-- CreateEnum
CREATE TYPE "SlaPhase" AS ENUM ('TRIAGE', 'REVIEW', 'APPROVAL', 'COMPLETED');

-- CreateTable
CREATE TABLE "submission_statuses" (
  "id" TEXT NOT NULL,
  "code" VARCHAR(40) NOT NULL,
  "label_he" TEXT NOT NULL,
  "label_en" TEXT NOT NULL,
  "color" TEXT NOT NULL DEFAULT '#64748b',
  "order_index" INTEGER NOT NULL DEFAULT 0,
  "is_initial" BOOLEAN NOT NULL DEFAULT false,
  "is_terminal" BOOLEAN NOT NULL DEFAULT false,
  "sla_phase" "SlaPhase",
  "notification_type" "NotificationType",
  "is_system" BOOLEAN NOT NULL DEFAULT false,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "submission_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "status_transitions" (
  "id" TEXT NOT NULL,
  "from_status_id" TEXT NOT NULL,
  "to_status_id" TEXT NOT NULL,
  "allowedRoles" "Role"[] DEFAULT ARRAY[]::"Role"[],
  "require_reviewer_assigned" BOOLEAN NOT NULL DEFAULT false,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "status_transitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "status_permissions" (
  "id" TEXT NOT NULL,
  "status_id" TEXT NOT NULL,
  "role" "Role" NOT NULL,
  "action" "StatusAction" NOT NULL,
  "allowed" BOOLEAN NOT NULL DEFAULT false,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "status_permissions_pkey" PRIMARY KEY ("id")
);

-- Seed default statuses
INSERT INTO "submission_statuses"
  ("id", "code", "label_he", "label_en", "color", "order_index", "is_initial", "is_terminal", "sla_phase", "notification_type", "is_system", "is_active", "created_at", "updated_at")
VALUES
  ('c6df8722-9164-4064-80f7-fa0d0e97e001', 'DRAFT', 'טיוטה', 'Draft', '#64748b', 10, true, false, NULL, NULL, true, true, NOW(), NOW()),
  ('c6df8722-9164-4064-80f7-fa0d0e97e002', 'SUBMITTED', 'הוגש', 'Submitted', '#2563eb', 20, false, false, 'TRIAGE', 'SUBMISSION_RECEIVED', true, true, NOW(), NOW()),
  ('c6df8722-9164-4064-80f7-fa0d0e97e003', 'IN_TRIAGE', 'בבדיקה ראשונית', 'In Triage', '#ca8a04', 30, false, false, 'TRIAGE', NULL, true, true, NOW(), NOW()),
  ('c6df8722-9164-4064-80f7-fa0d0e97e004', 'ASSIGNED', 'הוקצה לסוקר', 'Assigned', '#ea580c', 40, false, false, 'REVIEW', 'SUBMISSION_ASSIGNED', true, true, NOW(), NOW()),
  ('c6df8722-9164-4064-80f7-fa0d0e97e005', 'IN_REVIEW', 'בביקורת', 'In Review', '#7c3aed', 50, false, false, 'APPROVAL', 'REVIEW_REQUESTED', true, true, NOW(), NOW()),
  ('c6df8722-9164-4064-80f7-fa0d0e97e006', 'PENDING_REVISION', 'ממתין לתיקון', 'Pending Revision', '#dc2626', 60, false, false, NULL, 'REVISION_REQUIRED', true, true, NOW(), NOW()),
  ('c6df8722-9164-4064-80f7-fa0d0e97e007', 'APPROVED', 'אושר', 'Approved', '#16a34a', 70, false, true, 'COMPLETED', 'APPROVED', true, true, NOW(), NOW()),
  ('c6df8722-9164-4064-80f7-fa0d0e97e008', 'REJECTED', 'נדחה', 'Rejected', '#b91c1c', 80, false, true, 'COMPLETED', 'REJECTED', true, true, NOW(), NOW()),
  ('c6df8722-9164-4064-80f7-fa0d0e97e009', 'WITHDRAWN', 'בוטל', 'Withdrawn', '#6b7280', 90, false, true, 'COMPLETED', NULL, true, true, NOW(), NOW()),
  ('c6df8722-9164-4064-80f7-fa0d0e97e010', 'CONTINUED', 'המשך', 'Continued', '#0d9488', 100, false, true, 'COMPLETED', NULL, true, true, NOW(), NOW());

-- Seed default transitions
INSERT INTO "status_transitions"
  ("id", "from_status_id", "to_status_id", "allowedRoles", "require_reviewer_assigned", "is_active", "created_at", "updated_at")
VALUES
  ('5b4a663a-b5b6-4f0e-a9c7-a06c43f63001', 'c6df8722-9164-4064-80f7-fa0d0e97e002', 'c6df8722-9164-4064-80f7-fa0d0e97e003', ARRAY['SECRETARY', 'ADMIN']::"Role"[], false, true, NOW(), NOW()),
  ('5b4a663a-b5b6-4f0e-a9c7-a06c43f63002', 'c6df8722-9164-4064-80f7-fa0d0e97e003', 'c6df8722-9164-4064-80f7-fa0d0e97e004', ARRAY['SECRETARY', 'ADMIN']::"Role"[], true, true, NOW(), NOW()),
  ('5b4a663a-b5b6-4f0e-a9c7-a06c43f63003', 'c6df8722-9164-4064-80f7-fa0d0e97e004', 'c6df8722-9164-4064-80f7-fa0d0e97e005', ARRAY['SECRETARY', 'ADMIN']::"Role"[], true, true, NOW(), NOW()),
  ('5b4a663a-b5b6-4f0e-a9c7-a06c43f63004', 'c6df8722-9164-4064-80f7-fa0d0e97e005', 'c6df8722-9164-4064-80f7-fa0d0e97e007', ARRAY['CHAIRMAN', 'ADMIN']::"Role"[], false, true, NOW(), NOW()),
  ('5b4a663a-b5b6-4f0e-a9c7-a06c43f63005', 'c6df8722-9164-4064-80f7-fa0d0e97e005', 'c6df8722-9164-4064-80f7-fa0d0e97e008', ARRAY['CHAIRMAN', 'ADMIN']::"Role"[], false, true, NOW(), NOW()),
  ('5b4a663a-b5b6-4f0e-a9c7-a06c43f63006', 'c6df8722-9164-4064-80f7-fa0d0e97e005', 'c6df8722-9164-4064-80f7-fa0d0e97e006', ARRAY['CHAIRMAN', 'ADMIN']::"Role"[], false, true, NOW(), NOW()),
  ('5b4a663a-b5b6-4f0e-a9c7-a06c43f63007', 'c6df8722-9164-4064-80f7-fa0d0e97e006', 'c6df8722-9164-4064-80f7-fa0d0e97e002', ARRAY['SECRETARY', 'ADMIN']::"Role"[], false, true, NOW(), NOW());

-- Alter submissions.status from enum to string
ALTER TABLE "submissions" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "submissions" ALTER COLUMN "status" TYPE VARCHAR(40) USING ("status"::text);
ALTER TABLE "submissions" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- Indexes
CREATE UNIQUE INDEX "submission_statuses_code_key" ON "submission_statuses"("code");
CREATE INDEX "submission_statuses_is_active_order_index_idx" ON "submission_statuses"("is_active", "order_index");
CREATE UNIQUE INDEX "status_transitions_from_status_id_to_status_id_key" ON "status_transitions"("from_status_id", "to_status_id");
CREATE INDEX "status_transitions_from_status_id_is_active_idx" ON "status_transitions"("from_status_id", "is_active");
CREATE INDEX "status_transitions_to_status_id_is_active_idx" ON "status_transitions"("to_status_id", "is_active");
CREATE UNIQUE INDEX "status_permissions_status_id_role_action_key" ON "status_permissions"("status_id", "role", "action");
CREATE INDEX "status_permissions_status_id_role_is_active_idx" ON "status_permissions"("status_id", "role", "is_active");

-- Foreign keys
ALTER TABLE "status_transitions"
  ADD CONSTRAINT "status_transitions_from_status_id_fkey"
  FOREIGN KEY ("from_status_id") REFERENCES "submission_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "status_transitions"
  ADD CONSTRAINT "status_transitions_to_status_id_fkey"
  FOREIGN KEY ("to_status_id") REFERENCES "submission_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "status_permissions"
  ADD CONSTRAINT "status_permissions_status_id_fkey"
  FOREIGN KEY ("status_id") REFERENCES "submission_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "submissions"
  ADD CONSTRAINT "submissions_status_fkey"
  FOREIGN KEY ("status") REFERENCES "submission_statuses"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Drop obsolete enum
DROP TYPE "SubStatus";
