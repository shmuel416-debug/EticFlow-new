# EthicFlow — Sprint Log

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
