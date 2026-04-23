# EthicFlow Post-Launch Deferred Items

## Decision

The `Calendar` and `Diff` placeholder screens are **deferred to post-launch sprint** and do not block production release.

## Rationale

- Core regulated workflow is already covered in production readiness checks:
  - submission lifecycle
  - review/decision flow
  - meetings and notifications
  - role-based access control
- Deferring placeholders lowers go-live risk by avoiding unrelated late-stage UI scope.

## Guardrails

- Keep sidebar labels explicit with "coming soon" messaging to avoid user confusion.
- Do not expose placeholder routes to roles that do not need them.
- Track deferred work as top-priority post-launch backlog.

## Post-Launch Targets

1. Replace placeholder `Calendar` screen with live sync status and conflict resolution UI.
2. Replace placeholder `Diff` screen with reviewer comparison and export support.
3. Add E2E coverage for both pages before promoting to release branch.
