# Sprint 1 Release Report — 2026-03-30

| Check | Status | Critical | Warnings | Report |
|-------|--------|----------|----------|--------|
| Code Review | ✅ Approved | 0 | 3 (all fixed) | docs/code-review-sprint-1.md |
| QA Testing | ✅ Approved | 0 | 1 (invalid JSON → fixed) | docs/qa-report-sprint-1.md |
| Accessibility | ✅ Compliant | 0 | 3 (deferred Sprint 2) | docs/accessibility-report-sprint-1.md |
| Security | ✅ Approved | 0 | 5 (3 fixed, 2 deferred) | docs/security-report-sprint-1.md |

**Decision: ✅ APPROVED — Tagged v0.1.0**

## Sprint 1 Deliverables

- PostgreSQL 16 + Prisma schema (16 tables)
- Express API with JWT auth, RBAC, rate limiting, Zod validation
- Forgot/reset password with SHA-256 token hashing, console email provider
- React 18 + Vite + Tailwind frontend with Hebrew/English RTL/LTR
- Login page, Forgot Password page (IS 5568 / WCAG 2.1 AA)
- Protected routes, role-based sidebar, 5 role dashboards
- Full sprint-end pipeline: Code Review → QA → Accessibility → Security

## Bugs Fixed During Pipeline

| # | Type | Fix |
|---|------|-----|
| 1 | QA | Invalid JSON body → 500 (now 400 INVALID_JSON) |
| 2 | A11y | Skip link missing in AppLayout |
| 3 | A11y | `<aside>`/`<nav>` aria-label said "Dashboard" → "ניווט ראשי" |
| 4 | A11y | Table `<th>` missing `scope="col"` + hardcoded Hebrew headers |
| 5 | A11y | Hardcoded Hebrew in 4 placeholder dashboards |
| 6 | A11y | Back arrow direction wrong in RTL |
| 7 | Security | Timing attack: email enumeration via login response time (560ms gap → <40ms) |
| 8 | Security | forgot-password had no rate limit (email bombing) |
| 9 | Security | register had no rate limit (account spam) |

## Known Deferred Items (Sprint 2)

- Page titles (`<title>`) should update per route (WCAG 2.4.2)
- Password complexity policy (uppercase + number required)
- JSON body limit should be reduced to 1kb for auth routes
- `npm install nodemailer@latest` required before enabling SMTP
