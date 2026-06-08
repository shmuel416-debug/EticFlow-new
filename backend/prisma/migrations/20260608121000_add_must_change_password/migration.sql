-- Add force-password-change flag for bootstrap and reset flows
ALTER TABLE "users"
  ADD COLUMN "must_change_password" BOOLEAN NOT NULL DEFAULT false;
