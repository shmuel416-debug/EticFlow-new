-- Add failed-login tracking and account lockout fields
ALTER TABLE "users"
  ADD COLUMN "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lockout_until" TIMESTAMP(3);
