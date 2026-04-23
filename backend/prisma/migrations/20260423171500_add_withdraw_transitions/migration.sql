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
       FALSE,
       TRUE,
       NOW(),
       NOW()
FROM (
  VALUES
    ('DRAFT', 'WITHDRAWN', ARRAY['RESEARCHER','SECRETARY','ADMIN']),
    ('SUBMITTED', 'WITHDRAWN', ARRAY['RESEARCHER','SECRETARY','ADMIN']),
    ('IN_TRIAGE', 'WITHDRAWN', ARRAY['SECRETARY','ADMIN']),
    ('ASSIGNED', 'WITHDRAWN', ARRAY['SECRETARY','ADMIN']),
    ('PENDING_REVISION', 'WITHDRAWN', ARRAY['RESEARCHER','SECRETARY','ADMIN'])
) AS transition(from_code, to_code, allowed_roles)
JOIN "submission_statuses" from_status ON from_status."code" = transition.from_code
JOIN "submission_statuses" to_status ON to_status."code" = transition.to_code
WHERE NOT EXISTS (
  SELECT 1
  FROM "status_transitions" existing
  WHERE existing."from_status_id" = from_status."id"
    AND existing."to_status_id" = to_status."id"
);
