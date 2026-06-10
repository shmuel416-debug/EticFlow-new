-- Add approval route on submissions and optional meeting link on committee votes.

CREATE TYPE "ApprovalRoute" AS ENUM ('COMMITTEE', 'EXPEDITED');

ALTER TABLE "submissions"
  ADD COLUMN "approval_route" "ApprovalRoute";

ALTER TABLE "submission_votes"
  ADD COLUMN "meeting_id" TEXT;

CREATE INDEX "submission_votes_meeting_id_idx" ON "submission_votes"("meeting_id");

ALTER TABLE "submission_votes"
  ADD CONSTRAINT "submission_votes_meeting_id_fkey"
  FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
