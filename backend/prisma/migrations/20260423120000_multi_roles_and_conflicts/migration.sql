-- EthicFlow: support multi-role users and COI declarations

-- 1) Users: migrate single role -> roles array
ALTER TABLE "users"
ADD COLUMN "roles" "Role"[] NOT NULL DEFAULT ARRAY['RESEARCHER']::"Role"[];

UPDATE "users"
SET "roles" = CASE
  WHEN "role" = 'RESEARCHER'::"Role" THEN ARRAY['RESEARCHER']::"Role"[]
  ELSE ARRAY['RESEARCHER'::"Role", "role"]
END;

ALTER TABLE "users"
DROP COLUMN "role";

-- 2) Conflict scope enum
CREATE TYPE "ConflictScope" AS ENUM ('SUBMISSION', 'USER', 'DEPARTMENT', 'GLOBAL');

-- 3) Conflict declarations table
CREATE TABLE "conflict_declarations" (
  "id" TEXT NOT NULL,
  "declarer_id" TEXT NOT NULL,
  "scope" "ConflictScope" NOT NULL,
  "target_submission_id" TEXT,
  "target_user_id" TEXT,
  "target_department" TEXT,
  "reason" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "declared_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "conflict_declarations_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "conflict_declarations"
ADD CONSTRAINT "conflict_declarations_declarer_id_fkey"
FOREIGN KEY ("declarer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "conflict_declarations"
ADD CONSTRAINT "conflict_declarations_target_submission_id_fkey"
FOREIGN KEY ("target_submission_id") REFERENCES "submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "conflict_declarations"
ADD CONSTRAINT "conflict_declarations_target_user_id_fkey"
FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "conflict_declarations_declarer_id_is_active_idx"
ON "conflict_declarations"("declarer_id", "is_active");

CREATE INDEX "conflict_declarations_target_submission_id_is_active_idx"
ON "conflict_declarations"("target_submission_id", "is_active");

CREATE INDEX "conflict_declarations_target_user_id_is_active_idx"
ON "conflict_declarations"("target_user_id", "is_active");

CREATE INDEX "conflict_declarations_scope_is_active_idx"
ON "conflict_declarations"("scope", "is_active");
