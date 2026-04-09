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

### S3.0 — Sprint 2 fixes (applied before Sprint 3 begins)
- [x] Fix `FormPreviewPage.jsx`: `setForm(data)` → `setForm(data.form)`
- [x] Add `POST /api/forms/:id/restore` endpoint
- [x] Wire "Save Draft" button in `SubmitPage.jsx`
- [x] Fix dead language toggle in `FormCanvas.jsx` — wired `onPreviewLangChange` prop

### S3.1 — Submission Review (Secretary)
- [ ] S3.1.1 Submission list page (secretary view — status filter, search, sort)
- [ ] S3.1.2 Submission detail page (view answers, comments, status actions)
- [ ] S3.1.3 Status transitions (DRAFT→SUBMITTED→IN_REVIEW→APPROVED/REJECTED)

### S3.2 — Reviewer Workflow
- [ ] S3.2.1 Reviewer submission list (assigned to me)
- [ ] S3.2.2 Review form (score fields, recommendation, comments)
- [ ] S3.2.3 Assign reviewer (secretary assigns reviewer to submission)

### S3.3 — Chairman Decisions
- [ ] S3.3.1 Chairman queue (submissions awaiting final decision)
- [ ] S3.3.2 Approve / Reject / Request revision actions
- [ ] S3.3.3 Approval letter generation (PDF)

### S3.4 — Notifications + Polish
- [ ] S3.4.1 Email notifications on status change
- [ ] S3.4.2 Researcher dashboard — live submission status tracker
- [ ] S3.4.9 Sprint wrap-up: Code Review + QA + Accessibility + Security
