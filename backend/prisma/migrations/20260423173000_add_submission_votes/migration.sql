CREATE TYPE "CommitteeVoteDecision" AS ENUM ('APPROVED', 'REJECTED', 'REVISION_REQUIRED', 'ABSTAIN');

CREATE TABLE "submission_votes" (
  "id" TEXT NOT NULL,
  "submission_id" TEXT NOT NULL,
  "voter_id" TEXT NOT NULL,
  "decision" "CommitteeVoteDecision" NOT NULL,
  "note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "submission_votes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "submission_votes_submission_id_voter_id_key" ON "submission_votes"("submission_id", "voter_id");
CREATE INDEX "submission_votes_submission_id_created_at_idx" ON "submission_votes"("submission_id", "created_at");

ALTER TABLE "submission_votes"
  ADD CONSTRAINT "submission_votes_submission_id_fkey"
  FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "submission_votes"
  ADD CONSTRAINT "submission_votes_voter_id_fkey"
  FOREIGN KEY ("voter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "institution_settings" ("id", "key", "value", "value_type", "is_active", "created_at", "updated_at")
VALUES
  (md5('decision_model'), 'decision_model', 'IRB_FULL', 'string', true, NOW(), NOW()),
  (md5('committee_quorum_min_votes'), 'committee_quorum_min_votes', '3', 'number', true, NOW(), NOW())
ON CONFLICT ("key") DO NOTHING;
