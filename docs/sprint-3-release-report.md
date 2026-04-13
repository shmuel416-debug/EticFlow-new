# Sprint 3 Release Report — 2026-04-13

| Check | Status | Critical | Warnings | Report |
|-------|--------|----------|----------|--------|
| Code Review | ✅ | 0 | 2 (fixed) | docs/code-review-sprint-3.md |
| QA Testing | ✅ | 4 (fixed) | 2 (fixed) | docs/qa-report-sprint-3.md |
| Accessibility | ✅ | 0 | 1 (fixed) | docs/accessibility-report-sprint-3.md |
| Security | ✅ | 0 | 0 | docs/security-report-sprint-3.md |

**Decision: ✅ APPROVED FOR MERGE — Tag v0.3.0**

## Issues Fixed During Pipeline
| ID | Phase | Issue | Fix |
|----|-------|-------|-----|
| CR-001 | Code Review | he.json + en.json invalid JSON (missing comma) | Added `,` after `submission.detail` block |
| CR-002 | Code Review | CommentThread 99-line function | Extracted `CommentItem` + `AddCommentForm` |
| QA-001 | QA | XSS in comments content not stripped | Added `stripHtml` to commentSchema |
| QA-002 | QA | Search param caused 500 error | Implemented OR search in `list` controller |
| QA-003 | QA | nodemailer high CVE | Updated to 8.0.5 |
| QA-004 | QA | review + decision schemas missing stripHtml | Added transforms |
| QA-005 | QA | roleFilter breaks with OR+status combined | Refactored to use AND wrapper |
| A11Y-001 | Accessibility | `<li role="button">` wrong aria-label | Fixed to include notification type |

## Sprint 3 Deliverables
- Secretary: Submissions list (search/filter/paginate) + Detail page (status transitions + reviewer assignment)
- Reviewer: Assignments list + Review detail page with score/recommendation form
- Chairman: Decision queue + Full decision page (APPROVE/REJECT/REVISION)
- Shared: StatusBadge, CommentThread, StatusTransitionPanel, ReviewerSelect, FormAnswersViewer, ReviewForm
- Notifications: In-app notifications page with mark-as-read
- Backend: 5 new status transition endpoints + notifications API + users/reviewers API
- i18n: 345 keys, 100% parity (he + en)
