-- Create system templates table for versioned downloadable templates
CREATE TABLE IF NOT EXISTS "system_templates" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "lang" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "filename" TEXT NOT NULL,
  "storage_path" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "uploaded_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "system_templates_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "system_templates_uploaded_by_fkey"
    FOREIGN KEY ("uploaded_by") REFERENCES "users" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "system_templates_key_lang_version_key" UNIQUE ("key", "lang", "version")
);

CREATE INDEX IF NOT EXISTS "system_templates_key_lang_is_active_idx"
  ON "system_templates"("key", "lang", "is_active");

CREATE INDEX IF NOT EXISTS "system_templates_key_is_active_idx"
  ON "system_templates"("key", "is_active");
