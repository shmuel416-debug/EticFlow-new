## Code Review Report — 2026-05-05

### Summary
- Scope reviewed: lifecycle/status changes for researcher + staff detail pages, status management backend/frontend, i18n updates
- Files reviewed: 13
- Issues found: 0 critical, 2 warning, 3 info
- Overall: Approved with notes

### Critical
- None.

### Warnings
1. `frontend/src/pages/researcher/SubmissionStatusPage.jsx`  
   The previous "next possible statuses" text was removed when the timeline logic moved into `SubmissionLifecycle`. This can reduce transparency for researchers about potential branching paths.  
   Recommendation: optionally re-add "next possible statuses" in the shared component when transition metadata is available.

2. `frontend/src/components/submissions/SubmissionLifecycle.jsx`  
   Animation uses `transition-all duration-500` but does not include reduced-motion fallback.  
   Recommendation: add `motion-reduce:transition-none` or equivalent to satisfy WCAG reduced-motion best practice.

### Info
1. `frontend/src/components/submissions/SubmissionLifecycle.jsx`  
   Shared component extraction improved maintainability and removed duplicated timeline logic.

2. `backend/src/routes/statuses.routes.js`  
   Zod validation now limits `descriptionHe/descriptionEn` to 500 chars, which is appropriate for admin-entered text.

3. `frontend/src/pages/admin/StatusManagementPage.jsx`  
   Description fields are now editable in both create and row-edit flows, aligning UI with backend schema.

### What is good
- Hybrid fallback (DB -> i18n) is implemented consistently in backend + frontend config hooks.
- Staff detail pages now have a clear lifecycle context card.
- No linter diagnostics were reported on modified files.
