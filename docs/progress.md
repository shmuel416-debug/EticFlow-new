# EthicFlow — Progress Tracker

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
