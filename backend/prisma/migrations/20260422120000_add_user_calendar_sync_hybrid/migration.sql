-- CreateEnum
CREATE TYPE "CalendarProvider" AS ENUM ('NONE', 'GOOGLE', 'MICROSOFT');

-- CreateEnum
CREATE TYPE "CalendarSyncStatus" AS ENUM ('PENDING', 'SYNCED', 'FAILED', 'CANCELLED');

-- AlterTable
ALTER TABLE "users"
ADD COLUMN "calendar_access_token" TEXT,
ADD COLUMN "calendar_email" TEXT,
ADD COLUMN "calendar_provider" "CalendarProvider" NOT NULL DEFAULT 'NONE',
ADD COLUMN "calendar_refresh_token" TEXT,
ADD COLUMN "calendar_sync_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "calendar_token_expiry" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "meeting_calendar_syncs" (
    "id" TEXT NOT NULL,
    "meeting_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" "CalendarProvider" NOT NULL,
    "external_event_id" TEXT,
    "status" "CalendarSyncStatus" NOT NULL DEFAULT 'PENDING',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "last_attempt_at" TIMESTAMP(3),
    "next_retry_at" TIMESTAMP(3),
    "last_sync_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meeting_calendar_syncs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "meeting_calendar_syncs_meeting_id_user_id_key" ON "meeting_calendar_syncs"("meeting_id", "user_id");

-- CreateIndex
CREATE INDEX "meeting_calendar_syncs_status_next_retry_at_idx" ON "meeting_calendar_syncs"("status", "next_retry_at");

-- CreateIndex
CREATE INDEX "meeting_calendar_syncs_user_id_status_idx" ON "meeting_calendar_syncs"("user_id", "status");

-- AddForeignKey
ALTER TABLE "meeting_calendar_syncs" ADD CONSTRAINT "meeting_calendar_syncs_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_calendar_syncs" ADD CONSTRAINT "meeting_calendar_syncs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
