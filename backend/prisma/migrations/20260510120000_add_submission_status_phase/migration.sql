-- Add status phase grouping for lifecycle presentation
CREATE TYPE "SubmissionPhase" AS ENUM ('INTAKE', 'REVIEW', 'DECISION', 'CLOSED');

ALTER TABLE "submission_statuses"
ADD COLUMN "phase" "SubmissionPhase";

UPDATE "submission_statuses" SET "phase" = NULL WHERE "code" = 'DRAFT';
UPDATE "submission_statuses" SET "phase" = 'INTAKE' WHERE "code" = 'SUBMITTED';
UPDATE "submission_statuses" SET "phase" = 'INTAKE' WHERE "code" = 'IN_TRIAGE';
UPDATE "submission_statuses" SET "phase" = 'REVIEW' WHERE "code" = 'ASSIGNED';
UPDATE "submission_statuses" SET "phase" = 'REVIEW' WHERE "code" = 'IN_REVIEW';
UPDATE "submission_statuses" SET "phase" = 'REVIEW' WHERE "code" = 'PENDING_REVISION';
UPDATE "submission_statuses" SET "phase" = 'DECISION' WHERE "code" = 'APPROVED';
UPDATE "submission_statuses" SET "phase" = 'DECISION' WHERE "code" = 'REJECTED';
UPDATE "submission_statuses" SET "phase" = 'CLOSED' WHERE "code" = 'WITHDRAWN';
UPDATE "submission_statuses" SET "phase" = 'CLOSED' WHERE "code" = 'CONTINUED';
