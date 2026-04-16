-- EthicFlow — Migration: add external_calendar_id to meetings
-- Sprint 7 — Microsoft Calendar integration
-- Sprint 8 — Google Calendar integration
-- Stores the external calendar event ID (Outlook or Google Calendar)

ALTER TABLE "meetings" ADD COLUMN IF NOT EXISTS "external_calendar_id" TEXT;
