-- Add multilingual stage descriptions to submission statuses
ALTER TABLE "submission_statuses"
ADD COLUMN "description_he" TEXT,
ADD COLUMN "description_en" TEXT;
