# EthicFlow — Sprint Log

## Sprint 12 — Dynamic Status Management

| Date | Task | Status | Notes |
|------|------|--------|-------|
| 2026-04-22 | Status data model migration | ✅ Done | Added `SubmissionStatus`, `StatusTransition`, `StatusPermission`, migrated submission status to string |
| 2026-04-22 | Status service + backend refactor | ✅ Done | Added `status.service.js`, removed hardcoded transition/notification/SLA mappings |
| 2026-04-22 | Admin Status Management API | ✅ Done | Added `/api/admin/statuses*` CRUD/reorder/transitions/permissions endpoints |
| 2026-04-22 | Admin Status Management UI | ✅ Done | Added `/admin/statuses` page with tabs for statuses, transitions, permissions |
| 2026-04-22 | Dynamic status UI wiring | ✅ Done | Updated StatusBadge/StatusTransitionPanel and list filters to use backend config |
| 2026-04-22 | E2E + unit tests updates | ✅ Done | Added backend `status.service` tests and new Playwright admin status spec |
| 2026-04-22 | Sprint 12 reports | ✅ Done | Published code-review, QA, accessibility, security, and sprint report docs |

## Sprint 11 — UI E2E Expansion

| Date | Task | Status | Notes |
|------|------|--------|-------|
| 2026-04-21 | Coverage matrix | ✅ Done | Added `docs/e2e-ui-coverage-matrix-sprint-11-hebrew.md` |
| 2026-04-21 | E2E suite restructuring + fixtures | ✅ Done | Reorganized `frontend/e2e/*`, added shared support layer |
| 2026-04-21 | Stable selectors (`data-testid`) | ✅ Done | Added hooks in login/submit/meetings/diff/review/chairman pages and components |
| 2026-04-21 | UI core flows (Playwright) | ✅ Done | Added UI specs for submit→assign→review→decision, meetings calendar/list, reviewer diff |
| 2026-04-21 | RBAC negative UI flows | ✅ Done | Added direct-route negative scenarios in `frontend/e2e/rbac/rbac-negative-ui.spec.js` |
| 2026-04-21 | i18n + RTL/LTR smoke | ✅ Done | Added smoke coverage for login + key protected routes in `frontend/e2e/i18n/i18n-rtl-smoke.spec.js` |
| 2026-04-21 | CI hardening | ✅ Done | Updated `playwright.config.js`, `frontend/package.json`, `.github/workflows/quality-gates.yml` |
| 2026-04-21 | Flaky triage baseline | ✅ Done | Repeat-each run passed on available smoke tests; role-based flows require secrets in CI |
| 2026-04-21 | Sprint 11 report & tracker updates | ✅ Done | Published `docs/sprint-11-report-hebrew.md`, updated `docs/progress.md` |
| 2026-04-22 | CI strict role-credentials preflight | ✅ Done | Added `frontend/scripts/verify-e2e-env.mjs`; `e2e-quality` now runs `npm run e2e:ci:strict` to fail early when any `E2E_*` role secret is missing |

## Sprint 10 — Ops Hardening + Product Completion

| Date | Task | Status | Notes |
|------|------|--------|-------|
| 2026-04-21 | Stream A — Runtime rollback drill | ✅ Done | `docs/ops/drills/sprint-10-runtime-rollback-drill.md` with measured RTO (13.98s) |
| 2026-04-21 | Stream A — Backup/restore drill | ✅ Done | `docs/ops/drills/sprint-10-backup-restore-drill.md` with measured RPO (0.38s) |
| 2026-04-21 | Stream A — Runbook Go/No-Go closure | ✅ Done | Updated `docs/DEPLOYMENT.md` + `docs/ops-production-stability-playbook.md` |
| 2026-04-21 | Stream B — Calendar V2 | ✅ Done | Added status/range filters, crowded-day highlighting, mobile-focused day summary |
| 2026-04-21 | Stream B — Diff V2 | ✅ Done | Added grouping, filters, search, noisy-change suppression, long-text highlighting |
| 2026-04-21 | Stream B — RBAC consistency | ✅ Done | Meetings routes restricted in frontend and backend to `SECRETARY/CHAIRMAN/ADMIN` |
| 2026-04-21 | Stream C — Regression + signoff | ✅ Done | lint/build/e2e/backend tests/prisma validate all PASS; report published |

## Sprint 9 — Stabilization & Growth

| Date | Task | Status | Notes |
|------|------|--------|-------|
| 2026-04-21 | Stream A — Production Stability Playbook | ✅ Done | Added `docs/ops-production-stability-playbook.md`, incident template, ops evidence directories, and daily smoke script |
| 2026-04-21 | Stream A — Daily smoke evidence | ✅ Done | Archived live run in `docs/ops/smoke-history/` |
| 2026-04-21 | Stream B — UI/UX Design Calendar | ✅ Done | 3 options created in `docs/designs/meetings-calendar-design.html`; execution follows structured option |
| 2026-04-21 | Stream B — UI/UX Design Reviewer Diff | ✅ Done | 3 options created in `docs/designs/reviewer-diff-design.html`; execution follows structured option |
| 2026-04-21 | Stream B — MeetingsCalendarPage implementation | ✅ Done | Monthly navigation, day drill-down, links to meeting detail, i18n keys |
| 2026-04-21 | Stream B — ReviewDiffPage implementation | ✅ Done | Version selectors, field-level diff table, change type summary, i18n keys |
| 2026-04-21 | Stream C — Playwright setup + 4 core scenarios | ✅ Done | `frontend/e2e/core-flows.spec.js`, scenarios passed locally (4/4) |
| 2026-04-21 | Stream C — CI quality gate | ✅ Done | Added `e2e-quality` job + Playwright report artifact upload |
| 2026-04-21 | Stream D — rollback + backup/restore drill report | ✅ Done | Added `docs/ops/drills/sprint-9-rollback-backup-drill.md`; preflight PASS, runtime blocked locally |
| 2026-04-21 | Sprint 9 regression + signoff report | ✅ Done | Published `docs/sprint-9-report-hebrew.md` |

## Sprint 8 — Google Integration (Calendar + Gmail + SSO)

| Date | Task | Status | Notes |
|------|------|--------|-------|
| 2026-04-16 | Install googleapis package | ✅ Done | `npm install googleapis` — 0 vulnerabilities |
| 2026-04-16 | P2.2.1 — Google Calendar Provider | ✅ Done | google.provider.js (Calendar API v3, service account auth, createEvent/updateEvent/deleteEvent, attendee invites, domain-wide delegation support), registered in calendar.service.js factory |
| 2026-04-16 | P2.2.2 — Gmail Email Provider | ✅ Done | gmail.provider.js (Gmail API, OAuth2 refresh-token flow, RFC-2822 base64url, UTF-8 Hebrew support), registered in email.service.js factory |
| 2026-04-16 | P2.2.3 — Google SSO provider | ✅ Done | google.provider.js (googleapis OAuth2, getAuthUrl + exchangeCode + userinfo.get, optional domain restriction) |
| 2026-04-16 | P2.2.3 — auth.controller.js Google SSO | ✅ Done | googleRedirect (state cookie g_oauth_state), googleCallback (validate state, findOrCreateGoogleUser, JWT redirect), findOrCreateGoogleUser helper |
| 2026-04-16 | P2.2.3 — auth.routes.js | ✅ Done | GET /api/auth/google + GET /api/auth/google/callback + auditLog |
| 2026-04-16 — LoginPage.jsx Google button | ✅ Done | Google SVG logo (brand 4-color), "כניסה עם Google", 44px touch target, below Microsoft button |
| 2026-04-16 | i18n keys | ✅ Done | auth.loginWithGoogle (he+en), SSO error keys made provider-agnostic |
| 2026-04-16 | Phase 4 — Docs | ✅ Done | .env.example fully documented, DEPLOYMENT.md Google Integration Setup section (Calendar, Gmail, SSO) |
| 2026-04-16 | Build check | ✅ Done | Frontend build passes (166 modules, 0 errors) |
| 2026-04-16 | Tag v0.8.0 | ✅ Done | All 3 Google integrations opt-in, graceful degradation, backward-compatible |

## Sprint 7 — Microsoft Integration (Email + Calendar + SSO)

| Date | Task | Status | Notes |
|------|------|--------|-------|
| 2026-04-16 | Phase 1 — Microsoft Email Provider | ✅ Done | microsoft.provider.js (Graph API, ClientSecretCredential, cached client), registered in email.service.js factory |
| 2026-04-16 | Phase 2 — Calendar Service factory | ✅ Done | calendar.service.js (createEvent/updateEvent/deleteEvent), internal.provider.js (no-op default) |
| 2026-04-16 | Phase 2 — Microsoft Calendar Provider | ✅ Done | microsoft.provider.js (Graph API Outlook events), graceful degradation on failure |
| 2026-04-16 | Phase 2 — Prisma schema migration | ✅ Done | externalCalendarId added to Meeting model; migrate when Docker available |
| 2026-04-16 | Phase 2 — meetings.controller.js wiring | ✅ Done | syncCreate/Update/Delete helpers extracted (≤30 lines), wired into create/update/cancel |
| 2026-04-16 | Phase 3 — Microsoft SSO provider | ✅ Done | @azure/msal-node ConfidentialClientApplication, getAuthUrl + exchangeCode + Graph /me |
| 2026-04-16 | Phase 3 — auth.controller.js SSO | ✅ Done | microsoftRedirect (state cookie), microsoftCallback (validate state, find/create user, JWT redirect), findOrCreateMicrosoftUser helper |
| 2026-04-16 | Phase 3 — auth.routes.js | ✅ Done | GET /api/auth/microsoft + GET /api/auth/microsoft/callback + auditLog |
| 2026-04-16 | Phase 3 — cookie-parser | ✅ Done | installed + wired in index.js for httpOnly state cookie |
| 2026-04-16 | Phase 3 — SsoCallbackPage.jsx | ✅ Done | loginWithToken from AuthContext, error→i18n mapping, loading spinner (WCAG aria-live) |
| 2026-04-16 | Phase 3 — LoginPage.jsx | ✅ Done | Microsoft SSO button (brand #0078D4, SVG logo, 44px), OR divider, ssoError query param display |
| 2026-04-16 | Phase 3 — AuthContext.jsx | ✅ Done | loginWithToken + decodePayload (no external dependency), exposed in context value |
| 2026-04-16 | Phase 3 — App.jsx + i18n | ✅ Done | /sso-callback public route, auth.loginWithMicrosoft + SSO error keys (he + en) |
| 2026-04-16 | Phase 4 — Docs | ✅ Done | .env.example fully documented, DEPLOYMENT.md Microsoft Integration Setup section |
| 2026-04-16 | Sprint 7 pipeline — build check | ✅ Done | Frontend build passes (166 modules, 0 errors). Fixed: useAuth import path, loginWithToken method name |
| 2026-04-16 | Tag v0.7.0 | ✅ Done | All 3 Microsoft integrations opt-in, graceful degradation, backward-compatible |

## Sprint 6 — Protocol System + Statistics + Settings + v1.0

| Date | Task | Status | Notes |
|------|------|--------|-------|
| 2026-04-15 | Phase 1 Backend — Protocol System | ✅ Done | protocols.controller.js (8 endpoints), protocols.routes.js, public sign endpoint, token-based signing, auto-transition to SIGNED |
| 2026-04-15 | Phase 1 Backend — PDF generation | ✅ Done | generateProtocolPdf() added to pdf.service.js, PDFKit A4 with sections + signature page |
| 2026-04-15 | Phase 2 Frontend — Protocol pages | ✅ Done | ProtocolsListPage, ProtocolDetailPage (rich sections editor), ProtocolSignPage (public token page) |
| 2026-04-15 | Phase 2 Frontend — i18n protocols | ✅ Done | 40+ keys in protocols.* namespace (he + en) |
| 2026-04-15 | Phase 3 Backend — Reports + AuditLogs | ✅ Done | reports.controller.js (stats/export/auditLogs), reports.routes.js, ExcelJS XLSX streaming |
| 2026-04-15 | Phase 5 Backend — Settings | ✅ Done | settings.controller.js + settings.routes.js, ALLOWED_KEYS allowlist, ADMIN-only |
| 2026-04-15 | Phase 4 UI/UX — Stats design | ✅ Done | 3 options (A/B/C), user chose B + Lev palette. docs/designs/stats-reports-design.html |
| 2026-04-15 | Phase 4 Frontend — StatsPage | ✅ Done | Option B: navy gradient header, KPI cards, bar chart, track breakdown, line chart, XLSX export |
| 2026-04-15 | Phase 4 Frontend — AuditLogPage | ✅ Done | Paginated table + mobile cards, filters: action/entityType/dateRange, ADMIN only |
| 2026-04-15 | Phase 4 Frontend — routing + sidebar | ✅ Done | /reports → StatsPage, /reports/audit-log → AuditLogPage, auditLog sub-link in sidebar |
| 2026-04-15 | Phase 5 Frontend — SettingsPage | ✅ Done | 4 groups (Institution/SLA/Files/Email), inline-edit + per-section Save, Lev navy header, non-admin lock screen |
| 2026-04-16 | Phase 7 — Code Review | ✅ Done | 2 critical (StatsPage shape + field name), 3 warnings (i18n, N+1, hardcoded Hebrew). Report: docs/code-review-sprint-6.md |
| 2026-04-16 | Phase 7 — QA Senior | ✅ Done | 3 minor bugs fixed (MonthlyTrendChart division-by-zero, 2 i18n strings). 0 critical. Report: docs/qa-report-sprint-6.md |
| 2026-04-16 | Phase 7 — Accessibility Audit | ✅ Done | 5 contrast fixes (gray-400→gray-500, opacity 0.6→0.8, 0.7→0.85), aria-busy on Save button. WCAG 2.2 AA. Report: docs/accessibility-report-sprint-6.md |
| 2026-04-16 | Phase 7 — Security Audit | ✅ Done | 2 medium fixed (token hashing, settings min(1)), 1 low fixed (limit cap). 0 critical/high. Report: docs/security-report-sprint-6.md |

## Sprint 5 — Secretary Dashboard + Meetings + Admin Users + Impersonation

| Date | Task | Status | Notes |
|------|------|--------|-------|
| 2026-04-14 | Phase 1 Backend — Admin Users CRUD | ✅ Done | users.controller.js: listAll, create, update, deactivate, impersonate |
| 2026-04-14 | Phase 1 Backend — Impersonation | ✅ Done | 1h JWT with impersonatedBy, blocks ADMIN target + nested impersonation |
| 2026-04-14 | Phase 1 Backend — Meetings API | ✅ Done | meetings.controller.js + meetings.routes.js — 8 endpoints |
| 2026-04-14 | Phase 1 Backend — Secretary Dashboard endpoint | ✅ Done | GET /api/submissions/dashboard/secretary — 5 KPIs + 10 recent |
| 2026-04-14 | Phase 2 Frontend — Impersonation | ✅ Done | AuthContext: startImpersonation/stopImpersonation, getToken() in api.js |
| 2026-04-14 | Phase 2 Frontend — ImpersonationBanner | ✅ Done | Amber sticky banner, aria-live, stop button |
| 2026-04-14 | Phase 2 Frontend — AppLayout + Sidebar | ✅ Done | Banner above layout, impersonation indicator in sidebar user footer |
| 2026-04-14 | Phase 2 Frontend — UsersPage | ✅ Done | Admin CRUD table — search, role/status filter, impersonate, edit, deactivate |
| 2026-04-14 | Phase 3 Frontend — SecretaryDashboard | ✅ Done | 5 KPI cards + recent submissions table with SLA dots, real API |
| 2026-04-14 | Phase 4 Frontend — MeetingsPage | ✅ Done | Filter tabs (upcoming/past/all) + create meeting modal |
| 2026-04-14 | Phase 4 Frontend — MeetingDetailPage | ✅ Done | Agenda (add/remove) + attendance (record per user) tabs |
| 2026-04-14 | Phase 5 Frontend — ChairmanDashboard | ✅ Done | Kanban board (IN_REVIEW/APPROVED/REJECTED) with real API data |
| 2026-04-14 | Phase 6 — i18n | ✅ Done | admin.* + meetings.* namespaces, lowercase role aliases, common.* additions |
| 2026-04-14 | Phase 6 — App.jsx routes | ✅ Done | /meetings, /meetings/:id, /users wired to real pages |
| 2026-04-14 | S5.9 Code Review | ✅ Done | 2 critical fixed (SLATracking fields, i18n keys), 3 warnings. Report: docs/code-review-sprint-5.md |
| 2026-04-14 | S5.9 QA Testing | ✅ Done | 0 critical bugs, 1 lint fix (unused t). Report: docs/qa-report-sprint-5.md |
| 2026-04-14 | S5.9 Accessibility Audit | ✅ Done | 2 issues fixed (mobile aria-labels, Escape key). WCAG 2.2 AA compliant. Report: docs/accessibility-report-sprint-5.md |
| 2026-04-14 | S5.9 Security Audit | ✅ Done | 1 medium fixed (javascript: URL in meetingLink). OWASP Top 10 clean. Report: docs/security-report-sprint-5.md |
| 2026-04-14 | Sprint 5 Release | ✅ Done | Tagged v0.5.0. Report: docs/sprint-5-release-report.md |

## Sprint 4 — SLA + Documents + AI

| Date | Task | Status | Notes |
|------|------|--------|-------|
| 2026-04-13 | UI/UX Design — Researcher Dashboard | ✅ Done | עיצוב C נבחר: split-screen + ציר זמן + Lev palette |
| 2026-04-13 | S4.1 ResearcherDashboard | ✅ Done | Design C: list pane + timeline pane, real API data, SLA dots |
| 2026-04-13 | S4.1 SubmissionStatusPage | ✅ Done | Tabs: timeline / comments / answers, progress bar, action buttons |
| 2026-04-13 | S4.2 SLA Engine | ✅ Done | addBusinessDays (Sun–Thu), setDueDates on transitions, nightly cron, breach+warning notifications |
| 2026-04-13 | S4.3 Document Upload | ✅ Done | documents.controller.js + documents.routes.js, storage.service.js (magic bytes validation), DocumentList component (drag-and-drop, upload/download/delete), tab in SubmissionStatusPage + SubmissionDetailPage |
| 2026-04-13 | S4.4 PDF Approval Letter | ✅ Done | pdf.service.js (pdfkit — Hebrew letter, details box, conditions, signature area), POST /api/submissions/:id/approval-letter, download button in SubmissionStatusPage + SubmissionDetailPage |
| 2026-04-13 | S4.5 AI Mock Integration | ✅ Done | mock.provider.js (keyword rules, risk levels), ai.service.js (factory), ai.controller.js, /api/ai routes, AiPanel.jsx (risk badge, score bar, flags, suggestions), wired into ReviewDetailPage + SubmissionDetailPage |
| 2026-04-14 | S4.9 Code Review | ✅ Done | 1 critical fixed (RESEARCHER ownership bypass on approval-letter), 3 warnings, 4 info. Report: docs/code-review-sprint-4.md |
| 2026-04-14 | S4.9 QA Testing | ✅ Done | 3 critical fixed (fullName field mismatch ×2, AppError arg order), 0 open. Report: docs/qa-report-sprint-4.md |
| 2026-04-14 | S4.9 Accessibility Audit | ✅ Done | 2 fixed (aria-live on AiPanel, fullName in DocumentList). WCAG 2.2 AA compliant. Report: docs/accessibility-report-sprint-4.md |
| 2026-04-14 | S4.9 Security Audit | ✅ Done | 0 critical/high, 1 medium tracked (setTimeout), OWASP Top 10 clean. Report: docs/security-report-sprint-4.md |
| 2026-04-14 | Sprint 4 Release | ✅ Done | Tagged v0.4.0. Report: docs/sprint-4-release-report.md |

## Sprint 3 — Review Workflow

| Date | Task | Status | Notes |
|------|------|--------|-------|
| 2026-04-13 | S3.1.1 Secretary Submissions List | ✅ Done | Search + status filter + pagination. Route: /secretary/submissions |
| 2026-04-13 | S3.1.2 Submission Detail Page | ✅ Done | FormAnswersViewer + CommentThread + StatusTransitionPanel + ReviewerSelect |
| 2026-04-13 | S3.1.3 Status Transitions Backend | ✅ Done | SUBMITTED→IN_TRIAGE→ASSIGNED→IN_REVIEW→APPROVED/REJECTED/PENDING_REVISION |
| 2026-04-13 | S3.2.1 Reviewer Assignments Page | ✅ Done | Lists submissions assigned to reviewer. Route: /reviewer/assignments |
| 2026-04-13 | S3.2.2 Review Form | ✅ Done | Score 1-5, recommendation radio, comments textarea |
| 2026-04-13 | S3.2.3 Assign Reviewer | ✅ Done | ReviewerSelect dropdown + PATCH /api/submissions/:id/assign |
| 2026-04-13 | S3.3.1 Chairman Queue | ✅ Done | IN_REVIEW submissions. Route: /chairman/queue |
| 2026-04-13 | S3.3.2 Chairman Decision | ✅ Done | APPROVE/REJECT/REVISION with note. Route: /chairman/queue/:id |
| 2026-04-13 | S3.4.1 Email Notifications | ✅ Done | notification.service.js — notifyStatusChange on every transition |
| 2026-04-13 | S3.4.2 NotificationsPage | ✅ Done | In-app notifications list + mark-read. Route: /notifications |
| 2026-04-13 | Shared Components | ✅ Done | StatusBadge, CommentThread, StatusTransitionPanel, ReviewerSelect, FormAnswersViewer, ReviewForm |
| 2026-04-13 | i18n Sprint 3 | ✅ Done | Fixed status keys + added reviewer/chairman/notifications namespaces (he+en) |

## Sprint 1 — Infrastructure

| Date | Task | Status | Notes |
|------|------|--------|-------|
| — | Sprint started | — | — |
| 2026-03-29 | S1.1.1 Docker Compose | ✅ Done | PostgreSQL 16 + pgAdmin up on :5432/:5050 |
| 2026-03-29 | S1.1.2 Prisma Schema | ✅ Done | 16 tables created, migration init applied |
| 2026-03-29 | S1.1.3 Seed Data | ✅ Done | 5 users, 6 settings, 1 form, 3 submissions |
| 2026-03-29 | S1.2.1 Express Setup | ✅ Done | GET /api/health returns 200 + DB status |
| 2026-03-29 | S1.2.2 Config files | ✅ Done | auth.js (JWT/bcrypt), services.js (4 pluggable providers) |
| 2026-03-29 | S1.2.3 Middleware | ✅ Done | validate.js, error.js (Prisma+AppError), audit.js |
| 2026-03-29 | S1.2.4 Rate Limiting | ✅ Done | apiLimiter (100/min), loginLimiter (5/15min) |
| 2026-03-29 | S1.3.1 Register + Login | ✅ Done | POST /register, /login, GET /me + JWT + bcrypt |
| 2026-03-29 | S1.3.2 JWT + RBAC | ✅ Done | authenticate.js, authorize(), authorizeOwnerOrRoles() |
| 2026-03-29 | S1.3.3 Forgot/Reset Password | ✅ Done | crypto tokens, SHA-256 hashing, console email provider |
| 2026-03-30 | S1.4 UI/UX Design — Login + Layout | ✅ Done | 3 design options (A/B/C) in docs/designs/login-layout-design.html |
| 2026-03-30 | S1.4 A11y Review — IS 5568 / WCAG 2.1 AA | ✅ Done | All 3 designs reviewed + fixed (see details below) |
| 2026-03-30 | S1.4.1 React + Vite + Tailwind | ✅ Done | Vite 8, React 18, @tailwindcss/vite, brand tokens in CSS vars |
| 2026-03-30 | S1.4.2 i18n Setup | ✅ Done | react-i18next, he.json + en.json, RTL/LTR auto-switch |
| 2026-03-30 | S1.4.3 Auth Context + API Service | ✅ Done | JWT in memory (not localStorage), Axios interceptors, setToken() |
| 2026-03-30 | S1.4.4 Login Page | ✅ Done | Option A + Lev colors, IS 5568 compliant, responsive split-panel |
| 2026-03-30 | S1.4.5 Forgot Password Page | ✅ Done | No user enumeration, role="alert", IS 5568 compliant |
| 2026-03-30 | S1.4.6 Layout + Sidebar | ✅ Done | Mobile drawer + desktop fixed, role-filtered nav, 44px targets |
| 2026-03-30 | S1.4.7 Protected Routes | ✅ Done | ProtectedRoute with optional roles[], redirects on unauthorized |
| 2026-03-30 | S1.4.8 Placeholder Dashboards | ✅ Done | 5 role dashboards, ResearcherDashboard with mock data + table |
| 2026-03-30 | S1.4.9 Code Review | ✅ Done | 0 critical, 3 warnings fixed (unused var, hardcoded strings, hardcoded aria-labels) |
| 2026-03-30 | S1.4.9 QA Testing | ✅ Done | 20+ API tests, 1 bug fixed: invalid JSON body → 500 (now 400 INVALID_JSON) |
| 2026-03-30 | S1.4.9 Accessibility Audit | ✅ Done | 6 issues fixed: skip link, aria-labels, table scope, hardcoded Hebrew in dashboards, RTL arrow |
| 2026-03-30 | S1.4.9 Security Audit | ✅ Done | 3 high fixes: timing attack (email enum), forgot-password rate limit, register rate limit |
| 2026-03-30 | S1.4.9 Sprint Wrap-up | ✅ Done | All reports saved in docs/. Tagged v0.1.0 |

## Sprint 2 — Dynamic Forms

| Date | Task | Status | Notes |
|------|------|--------|-------|
| 2026-03-31 | S2.1.1 Forms CRUD Backend | ✅ Done | 7 endpoints: GET list/active/:id, POST, PUT, POST publish/archive + audit logging |
| 2026-03-31 | S2.1.2 Submissions CRUD Backend | ✅ Done | 5 endpoints: GET list (role-filter+pagination), GET :id (+versions+comments), POST (ETH-YEAR-SEQ + SLA), PUT (versioning), POST continue |
| 2026-03-31 | S2.2.1 UI/UX Design — Form Builder | ✅ Done | עיצוב C נבחר: split-screen + פלטת לב + IS 5568 | docs/designs/form-builder-lev-design.html |
| 2026-03-31 | S2.2.1 React — Form Builder | ✅ Done | 7 קומפוננטות: FormBuilderPage, FieldPalette, CanvasField, FormCanvas, FieldSettingsPanel, PublishDialog, useFormBuilder hook. @dnd-kit drag-to-reorder, IS 5568, bilingual. Route: /secretary/forms/new |
| 2026-03-31 | S2.2.2 Save + Publish API | ✅ Done | POST/PUT /api/forms wired, auto-save before publish, load existing form on edit route, error banner, status badge, bilingual form name (he+en) |
| 2026-03-31 | S2.2.3 Form Preview | ✅ Done | FormFieldPreview (12 types), FormPreview, FormPreviewPage. Route: /secretary/forms/:id/preview. Lev palette only, IS 5568. Preview button in toolbar. |
| 2026-03-31 | S2.3.1 UI/UX Design — Form Library | ✅ Done | עיצוב B נבחר: stats bar + card grid עם פס צבע עליון | docs/designs/form-library-design.html |
| 2026-03-31 | S2.3.1 React — Form Library | ✅ Done | FormLibraryPage + FormCard. Stats bar, filter tabs, search, card grid 1→2→3 cols. Archive/restore API. Sidebar link. Bilingual (he+en). IS 5568. |
| 2026-03-31 | S2.4 UI/UX Design — Researcher Submit | ✅ Done | עיצוב B נבחר: navy header band + סקציות ממוספרות + סיידבר סיכום | docs/designs/researcher-submit-design.html |
| 2026-04-09 | S2.4.1 FormRenderer Component | ✅ Done | 12 field types, validation inline, IS 5568, Lev palette, bilingual labels |
| 2026-04-09 | S2.4.2 Researcher Submit Page | ✅ Done | Navy header + sections + summary sidebar + POST /api/submissions + success screen |
| 2026-04-09 | S2 Code Review | ✅ Done | 5 critical fixed (API shape bug, payload bug, hardcoded strings), 8 warnings → Sprint 3 |
| 2026-04-09 | S2 QA Testing | ✅ Done | 3 critical (2 fixed, 1 tracked for Sprint 3: FormPreviewPage data unwrap), 6 warnings |
| 2026-04-09 | S2 Accessibility Audit | ✅ Done | 3 critical fixed (hardcoded Hebrew aria-labels), 5 warnings → Sprint 3 |
| 2026-04-09 | S2 Security Audit | ✅ Done | 0 critical, 5 warnings (race-safe IDs, rate limits, file upload) → Sprint 3 |
| 2026-04-09 | S2 Sprint Wrap-up | ✅ Done | All reports saved in docs/. APPROVED FOR MERGE with 1 known issue tracked. |
| 2026-04-09 | S2 Post-audit fixes | ✅ Done | API shape bugs fixed (FormPreviewPage, FormBuilderPage, FormLibraryPage), POST /api/forms/:id/restore added, FormCanvas lang toggle wired, SubmitPage Save Draft wired. Tagged v0.2.0 |

## Sprint 3 — Pre-Sprint QA / Security / Accessibility Audit

| Date | Task | Status | Notes |
|------|------|--------|-------|
| 2026-04-09 | Pre-Sprint QA Audit | ✅ Done | 2 critical, 2 high, 4 medium found. Report: docs/qa-report-sprint-3-pre.md |
| 2026-04-09 | BUG-001 formConfigId UUID | ✅ Fixed | `z.string().uuid()` → `z.string().min(1)` — was blocking all researcher submissions |
| 2026-04-09 | BUG-002/003 Sprint 2 text | ✅ Fixed | `pages.comingSoon` → "יפותח בקרוב" / "coming soon" in he.json + en.json |
| 2026-04-09 | BUG-004 ResetPasswordPage | ✅ Fixed | Created ResetPasswordPage.jsx + route — /reset-password was a dead link |
| 2026-04-09 | BUG-005 unused var | ✅ Fixed | Removed unused `user` import from AppLayout.jsx |
| 2026-04-09 | BUG-006 setState in effect | ✅ Fixed | AuthContext useEffect: setLoading wrapped in setTimeout |
| 2026-04-09 | BUG-007 hardcoded aria-label | ✅ Fixed | FormBuilderPage: `"סגור שגיאה"` → `t('closeError')` |
| 2026-04-09 | BUG-008 stored XSS form name | ✅ Fixed | `stripHtml` transform added to form name + nameEn Zod schema |
| 2026-04-09 | BUG-009 Vite CVEs | ✅ Fixed | `npm audit fix` — 0 frontend vulnerabilities |
| 2026-04-09 | Pre-Sprint Security Audit | ✅ Done | 0 critical, 1 high (nodemailer), 3 medium. Report: docs/security-report-sprint-3-pre.md |
| 2026-04-09 | SEC-M02 XSS in submission title | ✅ Fixed | `stripHtml` + `.max(500)` on submission title Zod schema |
| 2026-04-09 | SEC-M03 no max title length | ✅ Fixed | `.max(500)` title, `.max(1000)` changeNote |
| 2026-04-09 | Pre-Sprint Accessibility Audit | ✅ Done | 0 critical, 1 high, 3 medium, 4 low. Report: docs/accessibility-report-sprint-3-pre.md |
| 2026-04-09 | A11Y-H01 broken aria-describedby | ✅ Fixed | FieldFeedback: added `id` prop → `<p id={id}>` — screen readers now hear error messages |
| 2026-04-09 | A11Y-L01 fieldset aria-required | ✅ Fixed | Added `aria-required` on radio/checkbox fieldset elements |
| 2026-04-09 | A11Y-L03 dead button | ✅ Fixed | "Add Condition" button: added `disabled` + tooltip |
| 2026-04-09 | A11Y-L04 hardcoded Hebrew aria | ✅ Fixed | `"שדה חובה"` → `t('common.requiredField')` in FormRenderer |
| 2026-04-09 | i18n keys | ✅ Done | Added: `closeError`, `conditionalComingSoon`, `common.requiredField` (he + en) |

## S1.4 — Accessibility Fixes Applied to Login Design (IS 5568 / WCAG 2.1 AA)

### Fixes applied to all 3 options (A, B, C):
| Fix | Detail |
|-----|--------|
| Skip navigation link | `<a href="#main-content" class="skip-link">דלג לתוכן הראשי</a>` — IS 5568 mandatory first element |
| Form `<label>` + `for`/`id` | All inputs now have associated labels: `for="email-a"`, `for="pass-a"`, etc. |
| `autocomplete` attributes | `autocomplete="email"` and `autocomplete="current-password"` on login fields |
| `aria-required="true"` | On email + password inputs |
| `novalidate` + `aria-label` on `<form>` | `<form novalidate aria-label="טופס כניסה למערכת">` |
| Error message area | `<div role="alert" aria-live="assertive">` — screen reader announces errors immediately |
| Nav links: `<div>` → `<a>` | All sidebar navigation items converted from non-interactive `<div>` to `<a href="#">` |
| `aria-current="page"` | Active nav link marked for screen readers |
| `aria-label="ניווט ראשי"` on `<nav>` | Landmark label in Hebrew |
| Touch targets ≥ 44px | `min-height:44px; min-width:44px` on all buttons (submit + language switcher) |
| Language buttons | `aria-label="עברית"` / `aria-label="English"` + `aria-pressed="true/false"` + `role="group"` |
| Decorative SVGs | `aria-hidden="true"` on all logo/icon SVGs |
| Tab ARIA | `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls` on design-picker tabs |
| Tab JS | `showTab()` now updates `aria-selected` attribute dynamically |
| Notification badge | `aria-label="3 התראות"` on red badge |
| Emoji icons in nav | `<span aria-hidden="true">🏠</span>` — decorative, hidden from screen readers |
| Focus indicators | CSS: `button:focus-visible, a:focus-visible, input:focus-visible { outline: 3px solid #1e40af }` |

### Option C specific fix:
| Fix | Detail |
|-----|--------|
| Contrast failure | `text-gray-500` on `bg-gray-900` = **3.9:1** (fails WCAG AA 4.5:1) → changed to `text-gray-400` = **5.7:1** ✅ |
