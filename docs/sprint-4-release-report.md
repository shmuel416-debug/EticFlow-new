# Sprint 4 Release Report — 2026-04-14

## Tag: v0.4.0

| Check | Status | Critical | Warnings | Report |
|-------|--------|----------|----------|--------|
| Code Review | ✅ | 1 (fixed) | 3 | docs/code-review-sprint-4.md |
| QA Testing | ✅ | 3 (fixed) | 2 | docs/qa-report-sprint-4.md |
| Accessibility | ✅ | 0 | 2 (fixed) | docs/accessibility-report-sprint-4.md |
| Security | ✅ | 0 | 1 (tracked S5) | docs/security-report-sprint-4.md |

**Decision: ✅ APPROVED FOR MERGE**

---

## Sprint 4 — What Was Delivered

### S4.1 — Researcher Dashboard + Status Page
- `ResearcherDashboard.jsx` — Design C split-screen, real API data, SLA indicators
- `SubmissionStatusPage.jsx` — tabs: timeline / comments / documents / answers, progress bar, PDF download

### S4.2 — SLA Engine
- `sla.service.js` — `addBusinessDays()` (Sun–Thu), `setDueDates()`, `runSlaCheck()`
- Nightly cron at midnight — auto-marks breaches, creates in-app notifications

### S4.3 — Document Upload
- `documents.controller.js` + `documents.routes.js`
- `storage.service.js` — magic-bytes validation (not just MIME), max 20MB, 6 allowed types
- `DocumentList.jsx` — drag-and-drop upload, download, delete with ARIA

### S4.4 — PDF Approval Letter
- `pdf.service.js` — pdfkit Hebrew letter: navy header, details box, conditions, signature area
- `POST /api/submissions/:id/approval-letter` — RESEARCHER ownership check (critical security fix)

### S4.5 — AI Mock Integration
- `mock.provider.js` — keyword-based risk scoring (LOW/MEDIUM/HIGH)
- `ai.service.js` — factory pattern (pluggable to Gemini via env)
- `ai.controller.js` + `ai.routes.js`
- `AiPanel.jsx` — risk badge, score bar, flags, suggestions, disclaimer

---

## Bugs Fixed During Sprint End Pipeline

| ID | File | Issue | Severity |
|----|------|-------|----------|
| CR-S4-001 | submissions.routes.js | RESEARCHER ownership bypass on approval-letter | 🔴 Critical |
| QA-S4-001 | documents.controller.js | `name` → `fullName` (Prisma 500 on list) | 🔴 Critical |
| QA-S4-002 | pdf.service.js | `name` → `fullName` (Prisma 500 on approval letter) | 🔴 Critical |
| QA-S4-003 | documents.controller.js, ai.controller.js, submissions.routes.js | AppError arg order swapped | 🔴 Critical |
| A11Y-S4-01 | AiPanel.jsx | Missing `aria-live` on run button state | 🔵 Info |
| A11Y-S4-02 | DocumentList.jsx | `uploadedBy.name` → `uploadedBy.fullName` (silent blank) | 🔵 Info |

---

## Warnings Tracked for Sprint 5

1. `pdf.service.js` — `generateApprovalLetter` 172 lines (limit 30) — split into helpers
2. `submissions.routes.js` — approval-letter handler inline in route — move to controller
3. `mock.provider.js` — setTimeout 400ms always active — gate on `NODE_ENV=development`
4. No automated test suite (Jest + Supertest) — add in Sprint 5
5. Frontend bundle 539KB — consider lazy loading heavy pages
