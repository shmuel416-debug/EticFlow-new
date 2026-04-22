-- EthicFlow — Migration: add auth_exchange_codes table
-- Purpose: secure SSO handoff via one-time code exchange (no JWT in URL)

CREATE TABLE "auth_exchange_codes" (
  "id" TEXT NOT NULL,
  "code_hash" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "used_at" TIMESTAMP(3),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "auth_exchange_codes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "auth_exchange_codes_code_hash_key" ON "auth_exchange_codes"("code_hash");
CREATE INDEX "auth_exchange_codes_expires_at_idx" ON "auth_exchange_codes"("expires_at");
CREATE INDEX "auth_exchange_codes_user_id_created_at_idx" ON "auth_exchange_codes"("user_id", "created_at");

ALTER TABLE "auth_exchange_codes"
  ADD CONSTRAINT "auth_exchange_codes_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
