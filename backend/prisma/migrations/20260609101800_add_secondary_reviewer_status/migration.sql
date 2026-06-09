-- Add secondary reviewer column to submissions
ALTER TABLE "submissions"
  ADD COLUMN "secondary_reviewer_id" TEXT;

ALTER TABLE "submissions"
  ADD CONSTRAINT "submissions_secondary_reviewer_id_fkey"
  FOREIGN KEY ("secondary_reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Rename existing ASSIGNED status to "Primary Reviewer Assignment"
UPDATE "submission_statuses"
SET "label_he" = 'הקצאת סוקר ראשי',
    "label_en" = 'Primary Reviewer Assignment',
    "description_he" = 'הבקשה הוקצתה לסוקר ראשי שמתחיל כעת בבדיקה מקצועית.',
    "description_en" = 'A primary reviewer has been assigned and can now start the formal review.'
WHERE "code" = 'ASSIGNED';

-- Insert new "Secondary Reviewer Assignment" status (between ASSIGNED and IN_REVIEW)
INSERT INTO "submission_statuses"
  ("id", "code", "label_he", "label_en", "description_he", "description_en", "color", "order_index", "is_initial", "is_terminal", "sla_phase", "notification_type", "is_system", "is_active", "created_at", "updated_at")
SELECT
  'c6df8722-9164-4064-80f7-fa0d0e97e011',
  'ASSIGNED_SECONDARY',
  'הקצאת סוקר משני',
  'Secondary Reviewer Assignment',
  'הבקשה הוקצתה לסוקר משני בנוסף לסוקר הראשי.',
  'A secondary reviewer has been assigned in addition to the primary reviewer.',
  '#fb923c',
  45,
  false,
  false,
  'REVIEW',
  'SUBMISSION_ASSIGNED',
  true,
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "submission_statuses" WHERE "code" = 'ASSIGNED_SECONDARY'
);

-- Insert transitions for the secondary reviewer status
INSERT INTO "status_transitions" (
  "id",
  "from_status_id",
  "to_status_id",
  "allowedRoles",
  "require_reviewer_assigned",
  "is_active",
  "created_at",
  "updated_at"
)
SELECT md5(from_status.id || to_status.id || clock_timestamp()::text),
       from_status.id,
       to_status.id,
       transition.allowed_roles::"Role"[],
       transition.require_reviewer_assigned,
       TRUE,
       NOW(),
       NOW()
FROM (
  VALUES
    ('ASSIGNED', 'ASSIGNED_SECONDARY', ARRAY['SECRETARY','ADMIN'], TRUE),
    ('ASSIGNED_SECONDARY', 'IN_REVIEW', ARRAY['SECRETARY','ADMIN'], TRUE),
    ('ASSIGNED_SECONDARY', 'WITHDRAWN', ARRAY['SECRETARY','ADMIN'], FALSE)
) AS transition(from_code, to_code, allowed_roles, require_reviewer_assigned)
JOIN "submission_statuses" from_status ON from_status."code" = transition.from_code
JOIN "submission_statuses" to_status ON to_status."code" = transition.to_code
WHERE NOT EXISTS (
  SELECT 1
  FROM "status_transitions" existing
  WHERE existing."from_status_id" = from_status."id"
    AND existing."to_status_id" = to_status."id"
);

-- Mirror ASSIGNED permissions onto ASSIGNED_SECONDARY (idempotent best-effort;
-- seed.js remains the canonical source for status permissions)
INSERT INTO "status_permissions" (
  "id",
  "status_id",
  "role",
  "action",
  "allowed",
  "is_active",
  "created_at",
  "updated_at"
)
SELECT md5(new_status.id || sp.role::text || sp.action::text || clock_timestamp()::text),
       new_status.id,
       sp.role,
       sp.action,
       sp.allowed,
       sp.is_active,
       NOW(),
       NOW()
FROM "status_permissions" sp
JOIN "submission_statuses" assigned ON assigned."code" = 'ASSIGNED' AND sp."status_id" = assigned."id"
JOIN "submission_statuses" new_status ON new_status."code" = 'ASSIGNED_SECONDARY'
WHERE NOT EXISTS (
  SELECT 1
  FROM "status_permissions" existing
  WHERE existing."status_id" = new_status."id"
    AND existing."role" = sp."role"
    AND existing."action" = sp."action"
);

-- Guarantee SECRETARY/ADMIN can ASSIGN and TRANSITION at ASSIGNED and ASSIGNED_SECONDARY.
-- This is required so a secondary reviewer can be assigned while the submission is
-- already in the primary-assigned (or secondary-assigned) state, regardless of the
-- permission state inherited from older seeds.
INSERT INTO "status_permissions" (
  "id",
  "status_id",
  "role",
  "action",
  "allowed",
  "is_active",
  "created_at",
  "updated_at"
)
SELECT md5(target_status.id || grants.role || grants.action || clock_timestamp()::text),
       target_status.id,
       grants.role::"Role",
       grants.action::"StatusAction",
       TRUE,
       TRUE,
       NOW(),
       NOW()
FROM (
  VALUES
    ('ASSIGNED', 'SECRETARY', 'ASSIGN'),
    ('ASSIGNED', 'ADMIN', 'ASSIGN'),
    ('ASSIGNED', 'SECRETARY', 'TRANSITION'),
    ('ASSIGNED', 'ADMIN', 'TRANSITION'),
    ('ASSIGNED_SECONDARY', 'SECRETARY', 'ASSIGN'),
    ('ASSIGNED_SECONDARY', 'ADMIN', 'ASSIGN'),
    ('ASSIGNED_SECONDARY', 'SECRETARY', 'TRANSITION'),
    ('ASSIGNED_SECONDARY', 'ADMIN', 'TRANSITION')
) AS grants(status_code, role, action)
JOIN "submission_statuses" target_status ON target_status."code" = grants.status_code
WHERE NOT EXISTS (
  SELECT 1
  FROM "status_permissions" existing
  WHERE existing."status_id" = target_status."id"
    AND existing."role" = grants.role::"Role"
    AND existing."action" = grants.action::"StatusAction"
);
