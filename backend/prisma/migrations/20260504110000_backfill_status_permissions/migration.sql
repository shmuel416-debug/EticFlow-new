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
SELECT
  md5(status."id" || permission.role_name || permission.action_name),
  status."id",
  permission.role_name::"Role",
  permission.action_name::"StatusAction",
  CASE
    WHEN permission.action_name = 'VIEW' THEN TRUE
    WHEN permission.action_name = 'EDIT' THEN permission.role_name IN ('ADMIN', 'SECRETARY')
      OR (permission.role_name = 'RESEARCHER' AND status."code" IN ('DRAFT', 'PENDING_REVISION'))
    WHEN permission.action_name = 'COMMENT' THEN permission.role_name IN ('SECRETARY', 'REVIEWER', 'CHAIRMAN', 'ADMIN')
    WHEN permission.action_name IN ('UPLOAD_DOC', 'DELETE_DOC') THEN permission.role_name IN ('ADMIN', 'SECRETARY')
      OR (permission.role_name = 'RESEARCHER' AND status."code" IN ('DRAFT', 'SUBMITTED', 'PENDING_REVISION'))
    WHEN permission.action_name = 'VIEW_INTERNAL' THEN permission.role_name IN ('SECRETARY', 'REVIEWER', 'CHAIRMAN', 'ADMIN')
    WHEN permission.action_name = 'TRANSITION' THEN (
      status."code" IN ('SUBMITTED', 'IN_TRIAGE', 'ASSIGNED', 'PENDING_REVISION')
      AND permission.role_name IN ('SECRETARY', 'ADMIN')
    ) OR (
      status."code" = 'IN_REVIEW'
      AND permission.role_name IN ('CHAIRMAN', 'ADMIN')
    )
    WHEN permission.action_name = 'ASSIGN' THEN permission.role_name IN ('SECRETARY', 'ADMIN')
      AND status."code" IN ('IN_TRIAGE', 'ASSIGNED')
    WHEN permission.action_name = 'SUBMIT_REVIEW' THEN permission.role_name = 'REVIEWER'
      AND status."code" = 'ASSIGNED'
    WHEN permission.action_name = 'RECORD_DECISION' THEN permission.role_name IN ('CHAIRMAN', 'ADMIN')
      AND status."code" = 'IN_REVIEW'
    ELSE FALSE
  END,
  TRUE,
  NOW(),
  NOW()
FROM "submission_statuses" status
CROSS JOIN (
  VALUES
    ('RESEARCHER', 'VIEW'),
    ('RESEARCHER', 'EDIT'),
    ('RESEARCHER', 'COMMENT'),
    ('RESEARCHER', 'UPLOAD_DOC'),
    ('RESEARCHER', 'DELETE_DOC'),
    ('RESEARCHER', 'VIEW_INTERNAL'),
    ('RESEARCHER', 'TRANSITION'),
    ('RESEARCHER', 'ASSIGN'),
    ('RESEARCHER', 'SUBMIT_REVIEW'),
    ('RESEARCHER', 'RECORD_DECISION'),
    ('SECRETARY', 'VIEW'),
    ('SECRETARY', 'EDIT'),
    ('SECRETARY', 'COMMENT'),
    ('SECRETARY', 'UPLOAD_DOC'),
    ('SECRETARY', 'DELETE_DOC'),
    ('SECRETARY', 'VIEW_INTERNAL'),
    ('SECRETARY', 'TRANSITION'),
    ('SECRETARY', 'ASSIGN'),
    ('SECRETARY', 'SUBMIT_REVIEW'),
    ('SECRETARY', 'RECORD_DECISION'),
    ('REVIEWER', 'VIEW'),
    ('REVIEWER', 'EDIT'),
    ('REVIEWER', 'COMMENT'),
    ('REVIEWER', 'UPLOAD_DOC'),
    ('REVIEWER', 'DELETE_DOC'),
    ('REVIEWER', 'VIEW_INTERNAL'),
    ('REVIEWER', 'TRANSITION'),
    ('REVIEWER', 'ASSIGN'),
    ('REVIEWER', 'SUBMIT_REVIEW'),
    ('REVIEWER', 'RECORD_DECISION'),
    ('CHAIRMAN', 'VIEW'),
    ('CHAIRMAN', 'EDIT'),
    ('CHAIRMAN', 'COMMENT'),
    ('CHAIRMAN', 'UPLOAD_DOC'),
    ('CHAIRMAN', 'DELETE_DOC'),
    ('CHAIRMAN', 'VIEW_INTERNAL'),
    ('CHAIRMAN', 'TRANSITION'),
    ('CHAIRMAN', 'ASSIGN'),
    ('CHAIRMAN', 'SUBMIT_REVIEW'),
    ('CHAIRMAN', 'RECORD_DECISION'),
    ('ADMIN', 'VIEW'),
    ('ADMIN', 'EDIT'),
    ('ADMIN', 'COMMENT'),
    ('ADMIN', 'UPLOAD_DOC'),
    ('ADMIN', 'DELETE_DOC'),
    ('ADMIN', 'VIEW_INTERNAL'),
    ('ADMIN', 'TRANSITION'),
    ('ADMIN', 'ASSIGN'),
    ('ADMIN', 'SUBMIT_REVIEW'),
    ('ADMIN', 'RECORD_DECISION')
) AS permission(role_name, action_name)
WHERE status."is_active" = TRUE
  AND NOT EXISTS (
    SELECT 1
    FROM "status_permissions" existing
    WHERE existing."status_id" = status."id"
      AND existing."role" = permission.role_name::"Role"
      AND existing."action" = permission.action_name::"StatusAction"
  );
