-- Add instructions columns
ALTER TABLE "form_configs" ADD COLUMN "instructions_he" TEXT,
ADD COLUMN "instructions_en" TEXT,
ADD COLUMN "attachments_list" JSONB,
ADD COLUMN "duplicated_from_id" TEXT;

-- Add foreign key for duplication
ALTER TABLE "form_configs" ADD CONSTRAINT "form_configs_duplicated_from_id_fkey" FOREIGN KEY ("duplicated_from_id") REFERENCES "form_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create index for better query performance on duplication lookups
CREATE INDEX "form_configs_duplicated_from_id_idx" ON "form_configs"("duplicated_from_id");
