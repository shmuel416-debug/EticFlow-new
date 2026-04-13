# QA Report — Sprint 3 — 2026-04-13

### Test Summary
| Category | Passed | Failed | Fixed |
|----------|--------|--------|-------|
| Build checks | 3/3 | 0 | — |
| API endpoints | 14 | 2 | 2 |
| Auth / RBAC | 3/3 | 0 | — |
| Validation | 4/4 | 0 | — |
| i18n JSON | 1 | 1 | 1 |
| Security (XSS) | 0 | 1 | 1 |
| Dependency audit | ✅ | 1 high | 1 |
| **Total** | **25** | **5** | **5** |

---

### 🔴 Bugs Found & Fixed (Critical)

| # | Description | Fix |
|---|-------------|-----|
| QA-001 | **he.json + en.json invalid JSON** — missing comma after `submission.detail` block | Added `,` after closing `}` |
| QA-002 | **XSS in comments endpoint** — `content` field not stripped of HTML tags | Added `.transform(stripHtml)` to commentSchema in submissions.routes.js |
| QA-003 | **Search param not implemented** — `?search=` returned 500 error | Added `OR: [{ title }, { applicationId }]` to `list` controller |
| QA-004 | **nodemailer high CVE** — 4 SMTP injection vulnerabilities | Updated to nodemailer@8.0.5 via `npm audit fix --force` |

---

### 🟡 Bugs Found & Fixed (Medium)

| # | Description | Fix |
|---|-------------|-----|
| QA-005 | **review + decision schemas missing stripHtml** — XSS possible in review comments and decision notes | Added `.transform(stripHtml)` to both schemas |
| QA-006 | **roleFilter breaks with OR (search) + status combined** — `...extra` spread could conflict | Refactored `roleFilter` to use `AND` wrapper when `OR` is present |

---

### ✅ What Works Well

**API Happy Paths:**
- `PATCH /submissions/:id/status` — SUBMITTED→IN_TRIAGE ✅
- `PATCH /submissions/:id/assign` — assigns reviewer + sets ASSIGNED status ✅
- `PATCH /submissions/:id/review` — reviewer submits + sets IN_REVIEW ✅
- `PATCH /submissions/:id/decision` — chairman APPROVED → status APPROVED ✅
- `GET /api/users/reviewers` — returns active reviewers ✅
- `GET /api/notifications` — returns empty list correctly ✅

**Auth / RBAC:**
- No token → 401 UNAUTHORIZED ✅
- Researcher tries to change status → 403 FORBIDDEN ✅
- Invalid transition (APPROVED→REJECTED) → 400 INVALID_TRANSITION ✅

**Validation:**
- Missing `status` field → 400 VALIDATION_ERROR ✅
- XSS stripped from comments → `alert(1)` stored, tags removed ✅
- Prisma schema valid ✅
- Frontend builds without errors (152 modules) ✅

---

### 📱 Frontend — Manual Test Checklist
*(Run locally at localhost:5173)*

| Page | Mobile 375px | Desktop 1280px | Hebrew | English |
|------|-------------|----------------|--------|---------|
| Secretary Submissions List | ✅ horizontal scroll table | ✅ full table | ✅ | ✅ |
| Submission Detail | ✅ stacked layout | ✅ 3-col grid | ✅ | ✅ |
| Reviewer Assignments | ✅ table | ✅ table | ✅ | ✅ |
| Chairman Queue | ✅ table | ✅ table | ✅ | ✅ |
| Notifications Page | ✅ list | ✅ list | ✅ | ✅ |

---

### 🔵 Improvements Suggested (non-blocking)

1. Add test suite (jest) — currently no tests exist for new endpoints
2. `?statuses=` multi-value filter planned but not implemented (not blocking)
3. Notification email uses Hebrew-only subject line — should be i18n key

---

### Recommendation
⚠️ Fixed all critical bugs found. **Ready for Accessibility audit.**
