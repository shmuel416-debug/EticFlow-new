CREATE TYPE "DataSubjectRequestType" AS ENUM ('ACCESS', 'ERASURE');
CREATE TYPE "DataSubjectRequestStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'REJECTED');

CREATE TABLE "privacy_consents" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "consent_type" TEXT NOT NULL,
  "policy_version" TEXT NOT NULL,
  "accepted" BOOLEAN NOT NULL,
  "ip_address" TEXT,
  "user_agent" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "privacy_consents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "data_subject_requests" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "type" "DataSubjectRequestType" NOT NULL,
  "status" "DataSubjectRequestStatus" NOT NULL DEFAULT 'OPEN',
  "details" TEXT,
  "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolved_at" TIMESTAMP(3),
  "resolution_note" TEXT,
  CONSTRAINT "data_subject_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "privacy_consents_user_id_created_at_idx" ON "privacy_consents"("user_id", "created_at");
CREATE INDEX "data_subject_requests_user_id_requested_at_idx" ON "data_subject_requests"("user_id", "requested_at");

ALTER TABLE "privacy_consents"
  ADD CONSTRAINT "privacy_consents_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "data_subject_requests"
  ADD CONSTRAINT "data_subject_requests_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
