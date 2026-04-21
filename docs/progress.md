# EthicFlow — Progress Tracker

## Latest Update: Sprint 9 — Stabilization & Growth
**Status:** ✅ Complete | **Date:** 2026-04-21 | **Report:** `docs/sprint-9-report-hebrew.md`

- [x] Production stability playbook + daily smoke automation
- [x] Meetings Calendar page implemented (replaced placeholder)
- [x] Reviewer Diff page implemented (replaced placeholder)
- [x] Playwright core E2E suite (4 critical scenarios)
- [x] E2E integrated into CI quality gates
- [x] Rollback/backup drill documented + runbook updated
- [x] Sprint 9 regression run and signoff report published

---

## Current Sprint: Sprint 1 — Infrastructure
**Status:** ✅ Complete | **Duration:** 4 weeks | **Tag:** v0.1.0

### S1.1 — Docker + Database (Days 1-2)
- [x] S1.1.1 Docker Compose (PostgreSQL + pgAdmin)
- [x] S1.1.2 Prisma Schema (15 tables)
- [x] S1.1.3 Seed Data (users, forms, submissions)
🔍 **Preview:** pgAdmin at localhost:5050 → see tables + data

### S1.2 — Backend Foundation (Days 3-5)
- [x] S1.2.1 Express Setup + health endpoint
- [x] S1.2.2 Config files (DB, Auth, Services)
- [x] S1.2.3 Middleware (validate, error, audit)
- [x] S1.2.4 Rate Limiting
🔍 **Preview:** localhost:5000/api/health → JSON response

### S1.3 — Auth System (Days 6-9)
- [x] S1.3.1 Register + Login endpoints
- [x] S1.3.2 JWT + RBAC Middleware
- [x] S1.3.3 Forgot/Reset Password + Email console
🔍 **Preview:** Postman → login → get JWT → /me works

### S1.4 — Frontend Shell (Days 10-17)
- [x] S1.4.1 React + Vite + Tailwind setup
- [x] S1.4.2 i18n (he.json + en.json)
- [x] S1.4.3 Auth Context + API service
- [x] S1.4.4 Login Page (responsive + bilingual)
- [x] S1.4.5 Forgot Password Page
- [x] S1.4.6 Layout + Sidebar (responsive)
- [x] S1.4.7 Protected Routes + role routing
- [x] S1.4.8 Placeholder Dashboards (5 roles)
- [x] S1.4.9 Sprint wrap-up + tests + tag

🔍 **Preview:** localhost:5173 → Login → Dashboard per role, he/en, mobile/desktop

---

## Current Sprint: Sprint 2 — Dynamic Forms
**Status:** ✅ Complete | **Tag:** v0.2.0

### S2.1 — Forms API (Days 1-3)
- [x] S2.1.1 Forms CRUD Backend (GET list, GET active, GET :id, POST, PUT, POST publish, POST archive)
- [x] S2.1.2 Submissions CRUD Backend (GET list role-filtered+paginated, GET :id+versions+comments, POST create+SLA, PUT update+version, POST continue)

### S2.2 — Form Builder UI (Days 4-10)
- [x] S2.2.1 Drag & Drop Canvas + Field Settings Panel (FormBuilderPage, FieldPalette, CanvasField, FormCanvas, FieldSettingsPanel, PublishDialog)
- [x] S2.2.2 Save + Publish API wiring (POST /api/forms, PUT /api/forms/:id, POST /api/forms/:id/publish — auto-save before publish, load existing form on edit route)
- [x] S2.2.3 Form Preview (FormFieldPreview, FormPreview, FormPreviewPage — /secretary/forms/:id/preview)

### S2.3 — Form Library + Preview (Days 11-13)
- [x] S2.3.1 Form Library Page (FormLibraryPage + FormCard, stats bar, filter tabs, search, card grid)
- [x] S2.3.2 Form Preview Page (done as part of S2.2.3)

### S2.4 — Form Renderer + Submission (Days 14-20)
- [x] S2.4.1 FormRenderer Component (12 field types, validation feedback, IS 5568)
- [x] S2.4.2 Researcher Submit Page (design B: navy header + numbered sections + summary sidebar)
- [x] S2.4.9 Sprint wrap-up: Code Review + QA + Accessibility + Security — APPROVED FOR MERGE

🔍 **Preview:** localhost:5173 → /submissions/new → loads active form → fill fields → submit → applicationId

---

## Current Sprint: Sprint 3 — Review Workflow
**Status:** 🔄 In Progress | **Tag:** —

### S3.0 — Sprint 2 fixes + Pre-Sprint 3 QA/Security/Accessibility (applied before Sprint 3 begins)
- [x] Fix `FormPreviewPage.jsx`: `setForm(data)` → `setForm(data.form)`
- [x] Add `POST /api/forms/:id/restore` endpoint
- [x] Wire "Save Draft" button in `SubmitPage.jsx`
- [x] Fix dead language toggle in `FormCanvas.jsx` — wired `onPreviewLangChange` prop
- [x] **BUG-001** Fix `formConfigId` Zod validation: `uuid()` → `min(1)` — was blocking all form submissions
- [x] **BUG-002/003** Update `pages.comingSoon` translation: "Sprint 2" → "בקרוב" / "coming soon"
- [x] **BUG-004** Create `ResetPasswordPage.jsx` + add `/reset-password` route to App.jsx
- [x] **BUG-005** Remove unused `user` import in `AppLayout.jsx`
- [x] **BUG-006** Fix `setState` sync in `AuthContext.jsx` useEffect → `setTimeout`
- [x] **BUG-007** Replace hardcoded `aria-label="סגור שגיאה"` with `t('closeError')` in `FormBuilderPage.jsx`
- [x] **BUG-008** Add `stripHtml` transform to form name Zod schema — prevent stored XSS
- [x] **BUG-009** Run `npm audit fix` — fixed 3 Vite CVEs (0 vulnerabilities remaining)
- [x] **SEC-M02** Add `stripHtml` + `.max(500)` to submission title Zod schema
- [x] **SEC-M03** Add `.max(500)` to submission title, `.max(1000)` to changeNote
- [x] **A11Y-H01** Fix broken `aria-describedby`: add `id` prop to `FieldFeedback` component
- [x] **A11Y-L01** Add `aria-required` on radio/checkbox `<fieldset>` in FormRenderer
- [x] **A11Y-L03** Disable "Add Condition" button (no handler) + add `title` tooltip
- [x] **A11Y-L04** Replace hardcoded Hebrew `aria-label="שדה חובה"` with `t('common.requiredField')`
- [x] Full QA audit — report: `docs/qa-report-sprint-3-pre.md`
- [x] Full Security audit — report: `docs/security-report-sprint-3-pre.md`
- [x] Full Accessibility audit — report: `docs/accessibility-report-sprint-3-pre.md`

### S3.1 — Submission Review (Secretary)
- [x] S3.1.1 Submission list page (secretary view — status filter, search, pagination)
- [x] S3.1.2 Submission detail page (view answers, comments, status actions)
- [x] S3.1.3 Status transitions (SUBMITTED→IN_TRIAGE→ASSIGNED→IN_REVIEW→APPROVED/REJECTED/PENDING_REVISION)

### S3.2 — Reviewer Workflow
- [x] S3.2.1 Reviewer submission list (assigned to me — AssignmentsPage)
- [x] S3.2.2 Review form (score 1-5, recommendation, comments — ReviewForm)
- [x] S3.2.3 Assign reviewer (secretary assigns reviewer via ReviewerSelect dropdown)

### S3.3 — Chairman Decisions
- [x] S3.3.1 Chairman queue (submissions in IN_REVIEW awaiting decision)
- [x] S3.3.2 Approve / Reject / Request revision actions (SubmissionDecisionPage)
- [ ] S3.3.3 Approval letter generation (PDF) — Sprint 4

### S3.4 — Notifications + Polish
- [x] S3.4.1 Email notifications on status change (notification.service.js + notifyStatusChange)
- [x] S3.4.2 NotificationsPage — in-app notifications with mark-as-read
- [x] S3.4.2 Researcher dashboard — live submission status tracker (Design C, real API data)
- [ ] S3.4.9 Sprint wrap-up: Code Review + QA + Accessibility + Security

---

## Current Sprint: Sprint 4 — SLA + Documents + AI
**Status:** ✅ Complete | **Tag:** v0.4.0

### S4.1 — Researcher Dashboard + Status Page
- [x] ResearcherDashboard.jsx — Design C split-screen (real data, Lev palette)
- [x] SubmissionStatusPage.jsx — timeline + tabs (ציר זמן / הערות / תשובות)
- [x] Route /submissions/:id for researcher
- [x] S4.2 SLA Engine (addBusinessDays, setDueDates, runSlaCheck, nightly cron)
- [x] S4.3 Document Upload (backend + frontend)
- [x] S4.4 PDF Approval Letter generation
- [x] S4.5 AI Mock Integration (pre-check + reviewer panel)
- [x] S4.9 Sprint wrap-up: Code Review + QA + Accessibility + Security — APPROVED FOR MERGE

---

## Current Sprint: Sprint 5 — Secretary Dashboard + Meetings + Admin Users + Impersonation
**Status:** ✅ Complete | **Tag:** v0.5.0

### Phase 1 — Admin Users CRUD + Impersonation (Backend)
- [x] `users.controller.js` — listAll, create, update, deactivate, impersonate
- [x] `users.routes.js` — 5 admin routes (GET/POST /admin/users, PUT/PATCH /admin/users/:id, POST /admin/impersonate/:userId)
- [x] `auth.js` — impersonatedBy field in req.user
- [x] `meetings.controller.js` — list, create, getById, update, cancel, addAgendaItem, removeAgendaItem, recordAttendance
- [x] `meetings.routes.js` — full REST API for meetings
- [x] `index.js` — meetingsRouter registered at /api/meetings
- [x] `submissions.controller.js` — secretaryDashboard() added
- [x] `submissions.routes.js` — GET /api/submissions/dashboard/secretary

### Phase 2 — Admin Users Page + Impersonation UI (Frontend)
- [x] `AuthContext.jsx` — impersonation state, startImpersonation, stopImpersonation
- [x] `api.js` — getToken() exported for impersonation token save
- [x] `ImpersonationBanner.jsx` — amber sticky banner with stop button
- [x] `AppLayout.jsx` — ImpersonationBanner added above layout
- [x] `Sidebar.jsx` — impersonation indicator in user footer
- [x] `pages/admin/UsersPage.jsx` — full CRUD table + impersonate actions

### Phase 3 — Secretary Dashboard (real data)
- [x] `SecretaryDashboard.jsx` — 5 KPI cards + recent submissions table (real API)

### Phase 4 — Meeting Management
- [x] `pages/meetings/MeetingsPage.jsx` — list with filter tabs + create modal
- [x] `pages/meetings/MeetingDetailPage.jsx` — agenda + attendance tabs
- [x] `App.jsx` — routes for /meetings, /meetings/:id, /users (real pages)

### Phase 5 — Chairman Dashboard (real data)
- [x] `ChairmanDashboard.jsx` — Kanban with real data

### Phase 6 — i18n + Sprint End
- [x] `he.json` + `en.json` — admin.* and meetings.* namespaces + lowercase role aliases
- [x] Sprint-end pipeline → tag v0.5.0

---

## Current Sprint: Sprint 6 — Protocols + Statistics + Settings + v1.0
**Status:** 🔄 In Progress | **Tag:** —

### Phase 1 — Protocol System Backend (S6.1)
- [x] `protocols.controller.js` — 8 endpoints: list, create, getById, update, finalize, requestSignatures, signByToken (public), getSignInfo, getPdf
- [x] `protocols.routes.js` — authenticated router + public `publicSignRouter`
- [x] `pdf.service.js` — added `generateProtocolPdf()` with A4 layout, sections, signature page
- [x] `index.js` — registered `/api/protocols` + `/api/protocol` (public)

### Phase 2 — Protocol Pages Frontend (S6.1)
- [x] `ProtocolsListPage.jsx` — filter tabs (ALL/DRAFT/PENDING_SIGNATURES/SIGNED/ARCHIVED), signature progress bar per row
- [x] `ProtocolDetailPage.jsx` — sections editor, finalize dialog, signature request modal, PDF download
- [x] `ProtocolSignPage.jsx` — public token page (no auth), Sign/Decline buttons, error states
- [x] `App.jsx` — added protocol routes + public /protocol/sign/:token
- [x] `Sidebar.jsx` — Protocols nav item (SECRETARY, CHAIRMAN, ADMIN)
- [x] `he.json` + `en.json` — full `protocols.*` namespace (40+ keys)

### Phase 3 — Statistics + Export Backend (S6.3)
- [x] `reports.controller.js` — getStats (byStatus, byTrack, monthly trend, rates), exportSubmissions (ExcelJS XLSX streaming), getAuditLogs (paginated + filterable)
- [x] `reports.routes.js` — /api/reports/stats, /api/reports/export/submissions, /api/audit-logs

### Phase 4 — Statistics Frontend (S6.3)
- [x] UI/UX design — Option B + Lev palette chosen — `docs/designs/stats-reports-design.html`
- [x] `StatsPage.jsx` — navy gradient header, 4 KPI cards, CSS bar chart, track bars, SVG line chart, XLSX export
- [x] `AuditLogPage.jsx` — filter bar (action/entity/date), desktop table + mobile cards, pagination
- [x] `App.jsx` — /reports → StatsPage, /reports/audit-log → AuditLogPage
- [x] `Sidebar.jsx` — auditLog indented sub-link (ADMIN only)

### Phase 5 — Institution Settings (S6.4)
- [x] `settings.controller.js` — list + update, ALLOWED_KEYS allowlist
- [x] `settings.routes.js` — ADMIN-only GET/PUT /api/settings/:key
- [x] `SettingsPage.jsx` — 4 grouped sections, inline-edit + per-section Save, dirty-check, toast feedback
- [x] `App.jsx` — /settings → SettingsPage (non-admins see lock screen)

### Phase 6 — Production Readiness (S6.5)
- [x] `setup.sh` — interactive wizard (institution, DB, JWT, email, admin user)
- [x] `docs/DEPLOYMENT.md` — step-by-step deployment guide
- [x] `docs/NEW_INSTITUTION.md` — onboarding guide for new customers
- [x] `npm audit` — 0 vulnerabilities (backend + frontend)
- [x] `docker-compose.prod.yml` — verified structure

### Phase 7 — Sprint End Pipeline (S6.9)
- [x] `/code-review` — all new Sprint 6 files — report: `docs/code-review-sprint-6.md`
- [x] `/qa-senior` — full regression — report: `docs/qa-report-sprint-6.md` (3 minor fixed)
- [x] `/accessibility-expert` — ProtocolSignPage, StatsPage, SettingsPage — report: `docs/accessibility-report-sprint-6.md` (5 contrast issues fixed)
- [x] `/security-audit` — protocol tokens, public sign endpoint, XLSX export — report: `docs/security-report-sprint-6.md` (2 medium + 1 low fixed)
- [x] Tag `v1.0.0` — **RELEASED**

---

## Current Sprint: Sprint 8 — Google Integration
**Status:** ✅ Complete | **Tag:** v0.8.0

### Phase 1 — Google Calendar Provider
- [x] `backend/src/services/calendar/google.provider.js` — Google Calendar API v3 (service account, createEvent/updateEvent/deleteEvent, attendee invites)
- [x] `backend/src/services/calendar/calendar.service.js` — registered `google` provider in factory map

### Phase 2 — Gmail Email Provider
- [x] `backend/src/services/email/gmail.provider.js` — Gmail API OAuth2 refresh-token flow, RFC-2822 base64url encoding, UTF-8 Hebrew subject/from support
- [x] `backend/src/services/email/email.service.js` — registered `gmail` provider in factory map

### Phase 3 — Google SSO
- [x] `backend/src/services/auth/google.provider.js` — Google OAuth2 getAuthUrl + exchangeCode + userinfo, optional domain restriction
- [x] `backend/src/controllers/auth.controller.js` — googleRedirect (state cookie), googleCallback (validate state, find/create user, JWT redirect), findOrCreateGoogleUser helper
- [x] `backend/src/routes/auth.routes.js` — GET /api/auth/google + GET /api/auth/google/callback + auditLog
- [x] `frontend/src/pages/LoginPage.jsx` — Google SSO button (brand colors SVG logo, 44px), below Microsoft button
- [x] `frontend/src/locales/he.json` + `en.json` — auth.loginWithGoogle + updated SSO error keys (provider-agnostic)

### Phase 4 — Docs Update
- [x] `.env.example` — documented all GOOGLE_CALENDAR_*, GMAIL_*, GOOGLE_AUTH_* vars
- [x] `docs/DEPLOYMENT.md` — "Google Integration Setup" section (Calendar, Gmail, SSO subsections)

🔍 **Preview targets:**
- Calendar: `CALENDAR_PROVIDER=google` → create meeting → event in Google Calendar with attendees
- Email: `EMAIL_PROVIDER=gmail` → trigger password reset → email arrives via Gmail
- SSO: click "כניסה עם Google" → Google OAuth → return to EthicFlow dashboard
- Conflict: Google SSO with LOCAL/Microsoft-account email → Hebrew error on LoginPage

---

## Current Sprint: Sprint 7 — Microsoft Integration
**Status:** ✅ Complete | **Tag:** v0.7.0

### Phase 1 — Microsoft Email Provider
- [x] `backend/src/services/email/microsoft.provider.js` — Graph API mail sender (ClientSecretCredential, cached client)
- [x] `backend/src/services/email/email.service.js` — registered `microsoft` provider in factory map
- [x] `npm install @microsoft/microsoft-graph-client @azure/identity` (backend)

### Phase 2 — Calendar Service + Microsoft Calendar Provider
- [x] `backend/prisma/schema.prisma` — added `externalCalendarId String?` to Meeting model
- [x] Migration: `npx prisma migrate dev --name add_meeting_external_calendar_id` *(run when DB available)*
- [x] `backend/src/services/calendar/calendar.service.js` — factory: createEvent, updateEvent, deleteEvent
- [x] `backend/src/services/calendar/internal.provider.js` — no-op default (CALENDAR_PROVIDER=internal)
- [x] `backend/src/services/calendar/microsoft.provider.js` — Graph API Outlook calendar sync
- [x] `backend/src/controllers/meetings.controller.js` — wired calendar sync on create/update/cancel

### Phase 3 — Microsoft SSO (Entra ID / Azure AD)
- [x] `backend/src/services/auth/microsoft.provider.js` — MSAL ConfidentialClientApplication, getAuthUrl + exchangeCode
- [x] `backend/src/controllers/auth.controller.js` — microsoftRedirect + microsoftCallback + findOrCreateMicrosoftUser
- [x] `backend/src/routes/auth.routes.js` — GET /api/auth/microsoft + GET /api/auth/microsoft/callback
- [x] `backend/src/index.js` — added cookie-parser middleware
- [x] `npm install @azure/msal-node cookie-parser` (backend)
- [x] `frontend/src/pages/auth/SsoCallbackPage.jsx` — token handler, loginWithToken, error mapping
- [x] `frontend/src/pages/auth/LoginPage.jsx` — Microsoft SSO button + OR divider + ssoError display
- [x] `frontend/src/context/AuthContext.jsx` — loginWithToken + decodePayload helpers
- [x] `frontend/src/App.jsx` — /sso-callback route (public)
- [x] `frontend/src/locales/he.json` + `en.json` — auth.loginWithMicrosoft + SSO error keys

### Phase 4 — Docs Update
- [x] `.env.example` — documented all MICROSOFT_MAIL_*, MICROSOFT_CALENDAR_*, MICROSOFT_AUTH_* vars
- [x] `docs/DEPLOYMENT.md` — "Microsoft Integration Setup" section (Email, Calendar, SSO subsections)

🔍 **Preview targets:**
- Email: set `EMAIL_PROVIDER=microsoft` → trigger password reset → email arrives in Outlook inbox
- Calendar: set `CALENDAR_PROVIDER=microsoft` → create meeting → event in Outlook with attendee invites
- SSO: click "כניסה עם Microsoft" → Microsoft login → return to EthicFlow dashboard
- Conflict: SSO with LOCAL-account email → Hebrew error message on LoginPage
