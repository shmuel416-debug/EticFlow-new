## 🧪 QA Report — Workflow Gaps (spec-workflow-gaps) — 2026-06-10 (final)

מימוש לפי `docs/spec-workflow-gaps.md` — 6 פאזות (דרישות #1, #3, #6–#10).

### Test Summary

| Category | Passed | Failed | Skipped |
|----------|--------|--------|---------|
| Backend automated tests (63) | 63 | 0 | 0 |
| Backend lint | ✅ | — | — |
| Frontend lint | ✅ | — | — |
| Frontend build | ✅ | — | — |
| Prisma validate | ✅ | — | — |
| DB migrations (local) | ✅ | — | — |
| npm audit (backend + frontend) | ✅ (0 vulns) | — | — |
| API smoke (health) | ✅ | — | — |
| Manual E2E / full auth flows | — | — | 1 |
| Accessibility axe audit | — | — | 1 |

### Executed Checks

```text
backend:  npm test              → PASS (19 suites, 63 tests)
backend:  npm run lint           → PASS (106 files)
backend:  npx prisma validate   → PASS
backend:  npx prisma migrate deploy → PASS (2 new migrations applied)
backend:  npm audit --omit=dev  → PASS (0 vulnerabilities)
frontend: npm run lint          → PASS
frontend: npm run build         → PASS
frontend: npm audit --omit=dev  → PASS (0 vulnerabilities)
runtime:  GET /api/health       → 200 { status: ok, database: connected }
```

### Coverage vs Spec

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| 1 | Researcher sees stage (mapped labels) | ✅ | `submissionStatusDisplay.js` + `StatusBadge` audience=researcher |
| 3 | Reviewer peer visibility default on | ✅ | seed `reviewer_peer_visibility=true`; async `buildReviewerPeerClause` |
| 6 | Reviewers see peer reviews | ✅ | REVIEWER on `GET /:id/reviews`; `FieldReviewSummary` on ReviewDetailPage |
| 7 | Dual approval routes + PDF templates | ✅ | `ApprovalRoute` enum; route-specific templates and filenames |
| 8 | Meeting-linked voting | ✅ | `enforce_meeting_voting` setting; `meetingId` on vote; panel on MeetingDetailPage |
| 9 | Revision loop + review rounds | ✅ | `REVISION_DRAFT`, `ReviewRound`, previous-round API + secretary UI |
| 10 | PDF caching via storage | ✅ | Storage-backed cache, `X-Generated` header, invalidation on template/signature/name change |

### Post-QA Additions (2026-06-10)

- `invalidateCachedDecisionLetters()` in `pdf.service.js` — deactivates generated approval/rejection docs when settings change.
- Migrations applied locally: `20260610130000_*`, `20260610140000_*`.
- Frontend lint warning in `SubmissionDecisionPage.jsx` resolved.

### Manual Follow-up (staging)

| Item | Notes |
|------|-------|
| Full E2E journey | Requires authenticated session (local login may be break-glass only) |
| Accessibility spot-check | Researcher status page, meeting vote panel, secretary previous-round UI |

### Recommendation

✅ **Ready for staging / PR review.** Automated gates green; migrations applied on dev DB. Complete manual E2E in staging environment with real auth before production.
