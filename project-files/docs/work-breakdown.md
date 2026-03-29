# EthicFlow — פירוק משימות מלא (Work Breakdown Structure)

## עקרון מנחה: Preview-First Development
> כל משימה מסתיימת בדבר שניתן **לראות בדפדפן**.
> לא מחכים לסוף הספרינט — כל יום יש משהו חדש לצפות בו.

## אסטרטגיית עבודה עם Claude Code
```
1. פתח session → הדבק session-startup.md
2. הקלד /sprint-plan → בחר משימה
3. Claude מציג plan → אתה מאשר
4. Claude כותב קוד → אתה צופה בתוצאה בדפדפן
5. /review → commit → update sprint-log
6. /compact ב-50% | /clear בין משימות לא קשורות
```

---

# 🔹 Sprint 1 — תשתית (4 שבועות)
**מטרה:** Login עובד, כל תפקיד רואה Dashboard placeholder שונה.
**תוצאה צפויה:** נכנסים ל-localhost:5173 → רואים דף Login → מתחברים → מגיעים לדשבורד לפי תפקיד.

---

## S1.1 — Docker + Database (ימים 1-2)
**Preview:** pgAdmin פתוח ב-localhost:5050, רואים טבלאות ריקות.

### S1.1.1 — Docker Compose
- [ ] צור `docker-compose.yml` עם PostgreSQL 16 + pgAdmin
- [ ] צור `.env.example` עם כל המשתנים
- [ ] צור `.env` מקומי (מועתק מ-example)
- [ ] הרץ `docker compose up -d` ← וודא שעולה
- [ ] גלוש ל-localhost:5050 ← וודא pgAdmin עובד
**📁 קבצים:** `docker-compose.yml`, `.env.example`, `.env`

### S1.1.2 — Prisma Schema
- [ ] צור `backend/package.json` עם dependencies
- [ ] הרץ `npm install`
- [ ] הרץ `npx prisma init`
- [ ] כתוב את כל 16 הטבלאות ב-`schema.prisma`:
  - [ ] User (+ Role enum + AuthProvider enum: LOCAL/MICROSOFT/GOOGLE)
    - password_hash nullable (NULL for SSO users)
    - auth_provider field (default: LOCAL)
    - external_id field (SSO provider Object ID, nullable)
  - [ ] Submission (+ Track enum, SubStatus enum)
  - [ ] FormConfig
  - [ ] SubmissionVersion
  - [ ] Comment
  - [ ] SLATracking
  - [ ] AIAnalysis
  - [ ] AuditLog
  - [ ] InstitutionSetting
  - [ ] Meeting (+ MeetingStatus enum)
  - [ ] MeetingAgendaItem (+ Decision enum)
  - [ ] MeetingAttendee
  - [ ] Protocol (+ ProtocolStatus enum)
  - [ ] ProtocolSignature (+ SignatureStatus enum)
  - [ ] Notification (+ NotificationType enum)
  - [ ] Document (+ DocumentSource enum: UPLOADED/GENERATED)
- [ ] הרץ `npx prisma migrate dev --name init`
- [ ] וודא ב-pgAdmin שכל הטבלאות נוצרו
**📁 קבצים:** `backend/prisma/schema.prisma`, `backend/package.json`

### S1.1.3 — Seed Data
- [ ] צור `backend/prisma/seed.js`
- [ ] הוסף 5 משתמשים (אחד לכל תפקיד):
  - researcher@test.com (סיסמה: 123456)
  - secretary@test.com
  - reviewer@test.com
  - chairman@test.com
  - admin@test.com
- [ ] הוסף הגדרות מוסד ראשוניות (institution_settings)
- [ ] הוסף טופס בדיקה (form_config) עם JSON Schema בסיסי
- [ ] הוסף 3 submissions לדוגמה בסטטוסים שונים
- [ ] עדכן package.json עם prisma seed command
- [ ] הרץ `npx prisma db seed` ← וודא ב-pgAdmin שהנתונים נטענו
**📁 קבצים:** `backend/prisma/seed.js`

---

## S1.2 — Backend Foundation (ימים 3-5)
**Preview:** localhost:5000/api/health מחזיר `{ status: "ok" }`.

### S1.2.1 — Express Setup
- [ ] צור `backend/src/index.js` — entry point
- [ ] הגדר Express app עם:
  - [ ] JSON body parser
  - [ ] CORS (מאפשר localhost:5173)
  - [ ] helmet (security headers)
  - [ ] morgan (request logging)
- [ ] צור route: `GET /api/health` → `{ status: "ok", timestamp }`
- [ ] הוסף script ב-package.json: `"dev": "nodemon src/index.js"`
- [ ] הרץ `npm run dev` ← בדוק localhost:5000/api/health בדפדפן
**📁 קבצים:** `backend/src/index.js`, `backend/nodemon.json`

### S1.2.2 — Prisma Client + Config
- [ ] צור `backend/src/config/database.js` — Prisma client singleton
- [ ] צור `backend/src/config/auth.js` — JWT config (מ-env)
- [ ] צור `backend/src/config/services.js` — service provider loader
- [ ] וודא ש-index.js מתחבר ל-DB בהרצה
**📁 קבצים:** `backend/src/config/database.js`, `auth.js`, `services.js`

### S1.2.3 — Middleware
- [ ] צור `backend/src/middleware/validate.js` — Zod validation wrapper
- [ ] צור `backend/src/middleware/error.js` — Global error handler
  - Catches all errors → `{ error, code, details }`
  - בפיתוח: מציג stack trace
  - ב-PROD: מסתיר פרטים
- [ ] צור `backend/src/middleware/audit.js` — Audit logging
  - רושם: userId, action, entityType, entityId, IP, timestamp
  - שומר ב-AuditLog table
- [ ] צור `backend/src/utils/errors.js` — AppError class
  - constructor(message, code, statusCode)
  - static methods: notFound(), unauthorized(), forbidden(), validation()
**📁 קבצים:** `backend/src/middleware/validate.js`, `error.js`, `audit.js`, `backend/src/utils/errors.js`

### S1.2.4 — Rate Limiting
- [ ] התקן `express-rate-limit`
- [ ] הגדר global rate limit: 100 req/min
- [ ] הגדר auth rate limit: 5 req/15min (per IP)
- [ ] הוסף ל-index.js
**📁 קבצים:** עדכון `backend/src/index.js`

---

## S1.3 — Auth System (ימים 6-9)
**Preview:** Postman/דפדפן — POST login מחזיר JWT. GET /me מחזיר פרטי user.

### S1.3.1 — Auth Routes + Controller
- [ ] צור `backend/src/routes/auth.routes.js`
- [ ] צור `backend/src/controllers/auth.controller.js`
- [ ] Endpoint: `POST /api/auth/register`
  - Input: { email, password?, fullName, role, department, authProvider? }
  - Validation: Zod schema (email format, password 8+ chars IF authProvider=LOCAL)
  - Logic: hash password (bcrypt 12) if local, set NULL if SSO
  - Set authProvider: LOCAL (default) | MICROSOFT | GOOGLE
  - Auth: Admin only
  - NEVER return password_hash in response
- [ ] Endpoint: `POST /api/auth/login`
  - Input: { email, password }
  - Validation: Zod
  - Logic: find user → check authProvider:
    - LOCAL: compare bcrypt → generate JWT
    - MICROSOFT/GOOGLE: reject (must use SSO endpoint)
  - Return: { token, user: { id, email, fullName, role } }
  - Rate limited: 5 attempts / 15 min
- [ ] Endpoint: `POST /api/auth/sso/callback` (SSO-ready, Phase 2)
  - For now: placeholder that returns 501 "SSO not configured"
  - Phase 2: validates SSO token → finds/creates user → returns JWT
- [ ] חבר routes ל-index.js
- [ ] בדוק ב-Postman: register → login → קבל token
**📁 קבצים:** `backend/src/routes/auth.routes.js`, `backend/src/controllers/auth.controller.js`

### S1.3.2 — Auth Middleware (JWT)
- [ ] צור `backend/src/middleware/auth.js`
  - Extract token from Authorization header
  - Verify JWT signature + expiry
  - Attach user to req.user
  - If invalid → 401 Unauthorized
- [ ] צור `backend/src/middleware/role.js`
  - Receives allowed roles array
  - Checks req.user.role
  - If not allowed → 403 Forbidden
- [ ] צור endpoint: `GET /api/auth/me` (protected)
  - Returns current user details
- [ ] בדוק ב-Postman: login → copy token → GET /me with Bearer token
**📁 קבצים:** `backend/src/middleware/auth.js`, `backend/src/middleware/role.js`

### S1.3.3 — Forgot Password
- [ ] צור Endpoint: `POST /api/auth/forgot-password`
  - Input: { email }
  - Logic: generate reset token (random 64 chars), save hash to DB, set expiry (1 hour)
  - Send email with link: `FRONTEND_URL/reset-password?token=xxx`
  - Email provider: console (dev) — מדפיס לטרמינל
  - Always return success (don't reveal if email exists)
- [ ] צור Endpoint: `POST /api/auth/reset-password`
  - Input: { token, newPassword }
  - Logic: find user by token hash, check expiry, hash new password, clear token
  - Return: { message: "Password updated" }
- [ ] הוסף שדות ל-User model: resetToken, resetTokenExpiry
- [ ] הרץ migration: `npx prisma migrate dev --name add_reset_token`
- [ ] בדוק: forgot → copy token from console → reset → login with new password
**📁 קבצים:** עדכון auth routes + controller, `backend/src/services/email.service.js`, `backend/src/services/email/console.provider.js`

---

## S1.4 — Frontend Shell (ימים 10-17)
**Preview:** localhost:5173 → Login page → התחבר → Dashboard לפי תפקיד.

### S1.4.1 — React + Vite Setup
- [ ] הרץ `npm create vite@latest frontend -- --template react`
- [ ] התקן dependencies:
  - [ ] `tailwindcss @tailwindcss/vite` (Tailwind v4)
  - [ ] `react-router-dom` (routing)
  - [ ] `axios` (API calls)
  - [ ] `react-i18next i18next i18next-browser-languagedetector` (i18n)
  - [ ] `react-hot-toast` (notifications)
  - [ ] `lucide-react` (icons)
- [ ] הגדר Tailwind (tailwind.config.js)
- [ ] הגדר proxy ב-vite.config.js → /api → localhost:5000
- [ ] הרץ `npm run dev` ← וודא שעולה ב-localhost:5173
**📁 קבצים:** `frontend/package.json`, `vite.config.js`, `tailwind.config.js`, `index.css`

### S1.4.2 — i18n Setup
- [ ] צור `frontend/src/i18n.js` — i18next config
  - Default language: he
  - Fallback: en
  - Detection: localStorage → browser language
- [ ] צור `frontend/src/locales/he.json` — Hebrew translations
  - common: save, cancel, delete, loading, error, success, search, noData
  - auth: login, email, password, forgotPassword, resetPassword, loginButton
  - nav: dashboard, submissions, forms, meetings, protocols, settings, users, auditLog
  - roles: researcher, secretary, reviewer, chairman, admin
- [ ] צור `frontend/src/locales/en.json` — English translations (same keys)
- [ ] צור `frontend/src/hooks/useDirection.js` — returns 'rtl'/'ltr'
- [ ] Import i18n in main.jsx
- [ ] בדוק: אתר עולה בעברית, console בלי שגיאות
**📁 קבצים:** `frontend/src/i18n.js`, `locales/he.json`, `locales/en.json`, `hooks/useDirection.js`

### S1.4.3 — Auth Context + API Service
- [ ] צור `frontend/src/services/api.js` — Axios instance
  - baseURL: /api
  - Interceptor: מוסיף JWT token מ-localStorage
  - Interceptor: 401 → redirect to /login
- [ ] צור `frontend/src/services/authService.js`
  - login(email, password) → token + user
  - forgotPassword(email) → void
  - resetPassword(token, password) → void
  - getMe() → user
- [ ] צור `frontend/src/context/AuthContext.jsx`
  - State: user, token, isLoading
  - Methods: login, logout
  - On mount: check localStorage for token → validate with /me
- [ ] צור `frontend/src/hooks/useAuth.js` — shortcut hook
**📁 קבצים:** `frontend/src/services/api.js`, `authService.js`, `context/AuthContext.jsx`, `hooks/useAuth.js`

### S1.4.4 — Login Page
- [ ] צור `frontend/src/pages/auth/LoginPage.jsx`
  - Email input + Password input + Login button
  - Loading state on submit
  - Error message (translated) on failure
  - "שכחתי סיסמה" link
  - Language switcher (he/en)
  - Institution logo (from config)
  - Desktop: split layout (image + form)
  - Mobile: full width form
- [ ] צור `frontend/src/components/LanguageSwitcher.jsx`
  - Toggle button he/en
  - Changes i18n language + document dir
- [ ] צור `frontend/src/config/institution.js`
  - Reads from env: name, logo, primaryColor
- [ ] בדוק בדפדפן: localhost:5173 → רואים Login → מזינים → מתחברים
**📁 קבצים:** `pages/auth/LoginPage.jsx`, `components/LanguageSwitcher.jsx`, `config/institution.js`

### S1.4.5 — Forgot Password Page
- [ ] צור `frontend/src/pages/auth/ForgotPasswordPage.jsx`
  - Email input + Submit button
  - Success message: "נשלח מייל עם לינק איפוס"
  - Back to login link
  - Responsive: same as Login
- [ ] צור route: /forgot-password
- [ ] בדוק: Login → "שכחתי סיסמה" → מזינים email → הודעת הצלחה
**📁 קבצים:** `pages/auth/ForgotPasswordPage.jsx`

### S1.4.6 — Layout + Sidebar
- [ ] צור `frontend/src/components/Layout.jsx`
  - Desktop: Sidebar fixed (240px) + Content area
  - Mobile: Hamburger → Sidebar as drawer (overlay)
  - Header: logo + user name + notification bell + language switch + logout
- [ ] צור `frontend/src/components/Sidebar.jsx`
  - Navigation links based on user role
  - Researcher: Dashboard, הגשות שלי
  - Secretary: Dashboard, Triage, טפסים, פגישות, פרוטוקולים, SLA, סטטיסטיקות
  - Reviewer: הבקשות שלי
  - Chairman: Dashboard, אישורים
  - Admin: משתמשים, Audit Log, הגדרות
  - Active link highlighted
  - Collapsible on mobile
- [ ] צור `frontend/src/components/Header.jsx`
  - Logo (from institution config)
  - User avatar + name
  - Language switcher
  - Notification bell (count badge)
  - Logout button
- [ ] בדוק: אחרי login → רואים Layout עם Sidebar + Header
**📁 קבצים:** `components/Layout.jsx`, `Sidebar.jsx`, `Header.jsx`

### S1.4.7 — Protected Routes + Role Routing
- [ ] צור `frontend/src/components/ProtectedRoute.jsx`
  - If not logged in → redirect to /login
  - If wrong role → redirect to /unauthorized
  - If OK → render children
- [ ] צור `frontend/src/App.jsx` — Router setup:
  - `/login` → LoginPage
  - `/forgot-password` → ForgotPasswordPage
  - `/researcher/*` → ProtectedRoute(RESEARCHER) → Researcher pages
  - `/secretary/*` → ProtectedRoute(SECRETARY) → Secretary pages
  - `/reviewer/*` → ProtectedRoute(REVIEWER) → Reviewer pages
  - `/chairman/*` → ProtectedRoute(CHAIRMAN) → Chairman pages
  - `/admin/*` → ProtectedRoute(ADMIN) → Admin pages
  - Auto-redirect after login based on role
- [ ] בדוק: login as researcher → מנותב ל /researcher/dashboard
- [ ] בדוק: login as secretary → מנותב ל /secretary/dashboard
**📁 קבצים:** `components/ProtectedRoute.jsx`, `App.jsx`

### S1.4.8 — Placeholder Dashboards (5)
- [ ] צור `frontend/src/pages/researcher/DashboardPage.jsx`
  - "שלום [שם], ברוך הבא לדשבורד החוקר"
  - Placeholder cards
- [ ] צור `frontend/src/pages/secretary/DashboardPage.jsx`
  - "דשבורד מזכירה — בפיתוח"
- [ ] צור `frontend/src/pages/reviewer/MyRequestsPage.jsx`
  - "הבקשות שלי — בפיתוח"
- [ ] צור `frontend/src/pages/chairman/ControlDashboardPage.jsx`
  - "דשבורד בקרה — בפיתוח"
- [ ] צור `frontend/src/pages/admin/UsersPage.jsx`
  - "ניהול משתמשים — בפיתוח"
- [ ] כל placeholder: כולל כותרת מתורגמת + אייקון + הודעה
- [ ] בדוק: login עם כל 5 המשתמשים → כל אחד רואה dashboard אחר
**📁 קבצים:** 5 placeholder pages

---

## S1.4.9 — Sprint 1 Wrap-up (יום 17-18)
- [ ] בדוק End-to-End: Docker up → backend up → frontend up → login → dashboard
- [ ] בדוק responsive: Login + Layout + Sidebar on mobile (375px)
- [ ] בדוק i18n: switch he↔en on Login + Dashboard
- [ ] בדוק שגיאות: wrong password, expired token, wrong role access
- [ ] עדכן docs/progress.md — סמן הכל done
- [ ] עדכן docs/sprint-log.md
- [ ] Git: merge feature branches → main
- [ ] Tag: `git tag v0.1.0-sprint1`
**🎉 Preview:** מערכת עם Login עובד, 5 dashboards, i18n, responsive.

---
---

# 🔹 Sprint 2 — Dynamic Forms (4 שבועות)
**מטרה:** מזכירה בונה טפסים, חוקר ממלא ומגיש.
**Preview:** מזכירה גוררת שדות → פרסום → חוקר רואה טופס דינמי.

---

## S2.1 — Forms API (ימים 1-3)
### S2.1.1 — Forms CRUD Backend
- [ ] צור `routes/forms.routes.js` + `controllers/forms.controller.js`
- [ ] `GET /api/forms` — רשימת טפסים (מזכירה/admin)
- [ ] `GET /api/forms/active` — טופס פעיל (כולם)
- [ ] `GET /api/forms/:id` — טופס בודד
- [ ] `POST /api/forms` — צור טופס חדש (draft)
- [ ] `PUT /api/forms/:id` — עדכן schema
- [ ] `POST /api/forms/:id/publish` — פרסם (נעול + version++)
- [ ] `POST /api/forms/:id/archive` — ארכיון
- [ ] בדוק ב-Postman: CRUD עובד
**📁 קבצים:** routes + controller

### S2.1.2 — Submissions CRUD Backend
- [ ] צור `routes/submissions.routes.js` + `controllers/submissions.controller.js`
- [ ] `GET /api/submissions` — רשימה (filtered by role)
- [ ] `GET /api/submissions/:id` — בקשה בודדת + versions + comments
- [ ] `POST /api/submissions` — הגשה חדשה (חוקר)
  - Generate applicationId: ETH-{YEAR}-{SEQ}
  - Save data_json in SubmissionVersion (V1)
  - Create SLA tracking entry
- [ ] `PUT /api/submissions/:id` — עדכון (חוקר, creates new version)
- [ ] `POST /api/submissions/:id/continue` — מחקר המשך (clone)
- [ ] בדוק ב-Postman
**📁 קבצים:** routes + controller

## S2.2 — Form Builder UI (ימים 4-10)
### S2.2.1 — Drag & Drop Canvas
- [ ] התקן `@dnd-kit/core @dnd-kit/sortable`
- [ ] צור `pages/secretary/FormBuilderPage.jsx`
  - Left panel: field palette (drag source)
  - Center: canvas (drop zone)
  - Right panel: field settings
- [ ] צור field types:
  - [ ] TextInput, TextArea, Select, RadioGroup, CheckboxGroup
  - [ ] DatePicker, FileUpload, Declaration, Signature
- [ ] Drag from palette → drop on canvas → field appears
- [ ] Click field → settings panel opens
- [ ] בדוק: גורר שדה → מופיע ב-canvas
**📁 קבצים:** FormBuilderPage.jsx + field components

### S2.2.2 — Field Settings Panel
- [ ] Label (he + en)
- [ ] Placeholder
- [ ] Required toggle
- [ ] Validation rules (min/max length, regex)
- [ ] Conditional logic: show if [other field] = [value]
- [ ] בדוק: שנה label → רואים שינוי ב-canvas

### S2.2.3 — Save + Publish + Preview
- [ ] כפתור "שמור טיוטה" → POST /api/forms
- [ ] כפתור "Preview" → פותח FormPreview
- [ ] כפתור "פרסם" → POST /api/forms/:id/publish
- [ ] בדוק: בנה טופס → שמור → preview → פרסם

## S2.3 — Form Library + Preview (ימים 11-13)
### S2.3.1 — Form Library Page
- [ ] צור `pages/secretary/FormLibraryPage.jsx`
- [ ] טבלה/כרטיסיות: שם, גרסה, סטטוס, תאריך, פעולות
- [ ] Mobile: card layout
- [ ] בדוק: רואים טפסים שנוצרו

### S2.3.2 — Form Preview Page
- [ ] צור `pages/secretary/FormPreviewPage.jsx`
- [ ] Desktop: toggle between Desktop/Mobile view
- [ ] Render form from JSON schema (read-only)
- [ ] בדוק: preview מראה את הטופס כמו שחוקר יראה

## S2.4 — Form Renderer + Submission (ימים 14-20)
### S2.4.1 — FormRenderer Component
- [ ] צור `components/FormRenderer.jsx`
- [ ] Reads JSON schema → renders form fields dynamically
- [ ] Supports all field types
- [ ] Handles conditional logic
- [ ] Validation on submit
- [ ] Bilingual labels (he/en based on current language)
- [ ] Mobile: single column, touch-friendly

### S2.4.2 — Researcher Submit Page (basic)
- [ ] צור `pages/researcher/SubmitPage.jsx` (single step for now)
- [ ] Loads active form schema
- [ ] Renders with FormRenderer
- [ ] Submit → POST /api/submissions
- [ ] Success → redirect to dashboard
- [ ] בדוק: חוקר רואה טופס → ממלא → שולח → רואה בדשבורד
**🎉 Preview:** מזכירה בונה טופס → חוקר ממלא ומגיש → מופיע ברשימה.

---
---

# 🔹 Sprint 3 — Researcher Portal + Versioning (3 שבועות)
**מטרה:** חוקר מגיש multi-step, רואה סטטוס, מתקן.
**Preview:** חוקר עובר 4 שלבים בטופס, רואה progress bar, מקבל הערות.

## S3.1 — Multi-step Wizard (ימים 1-5)
- [ ] שדרג SubmitPage.jsx ל-4 steps
- [ ] Step progress bar (horizontal desktop, dots mobile)
- [ ] File upload component (drag desktop, button mobile)
- [ ] Document storage service (local provider):
  - [ ] Upload → save to uploads/submissions/{subId}/
  - [ ] Save metadata to `documents` table (filename, size, mime, path)
  - [ ] Validate: max 20MB, allowed types (PDF/DOC/DOCX/JPG/PNG/XLSX)
  - [ ] Magic bytes check (not just extension)
  - [ ] Download endpoint: GET /api/documents/:id/download
  - [ ] Delete endpoint: DELETE /api/documents/:id (researcher only, before submit)
- [ ] Auto-save draft every 30 seconds
- [ ] AI pre-check button (mock for now)

## S3.2 — Versioning + Diff (ימים 6-9)
- [ ] Save JSON snapshot on each submission update
- [ ] Build DiffPage.jsx — side-by-side comparison
- [ ] Mobile: unified diff view
- [ ] Change highlights: green/red/yellow

## S3.3 — Researcher Dashboard (real) (ימים 10-13)
- [ ] Replace placeholder with real dashboard
- [ ] Submission cards with SLA badges
- [ ] Status page with timeline
- [ ] Edit submission with inline comments display
- [ ] Continue research (clone)

---

# 🔹 Sprint 4 — Reviewers + AI (3 שבועות)
**מטרה:** רפרנט סוקר עם AI, מזכירה מנתבת.
**Preview:** מזכירה מקצה → רפרנט רואה split screen עם AI.

## S4.1 — Triage + Assignment (ימים 1-3)
- [ ] Secretary Triage page (real)
- [ ] Reviewer picker with conflict detection
- [ ] Assignment endpoint + notifications

## S4.2 — Review Split Screen (ימים 4-8)
- [ ] ReviewPage.jsx — split screen
- [ ] Inline comments system
- [ ] Action footer (send to revision / approve / reject)
- [ ] Mobile: tab-based layout

## S4.3 — AI Service (ימים 9-13)
- [ ] Mock provider implementation
- [ ] Gemini provider implementation
- [ ] AI panel in review page
- [ ] AI pre-check in submit page
- [ ] Notification system (bell + in-app)

---

# 🔹 Sprint 5 — SLA + Committee (4 שבועות)
**מטרה:** SLA רמזורים עובדים, פגישות מנוהלות.
**Preview:** רמזורים צבעוניים, לוח שנה עם פגישות.

## S5.1 — SLA Engine (ימים 1-5)
- [ ] Business days calculator (skip Shabbat + holidays)
- [ ] SLA tracking service
- [ ] Traffic light component (green/yellow/red)
- [ ] Cron job: midnight SLA check
- [ ] Email alerts on breach

## S5.2 — Secretary Dashboard (real) (ימים 6-8)
- [ ] Replace placeholder with real data
- [ ] Summary cards + table + filters
- [ ] SLA badges on every submission

## S5.3 — Meeting Management (ימים 9-14)
- [ ] Calendar service (internal provider):
  - [ ] services/calendar.service.js (factory)
  - [ ] services/calendar/internal.provider.js (saves to DB only)
  - [ ] createEvent(), updateEvent(), deleteEvent() interface
- [ ] MeetingsPage.jsx — list + create
- [ ] Agenda builder (drag submissions)
- [ ] Send invitations (email) with agenda + system link
- [ ] CalendarPage.jsx — month/week view
- [ ] Meeting execution: attendance + decisions per submission
- [ ] Auto-reminder: 24h before meeting (cron)

## S5.4 — Chairman Dashboard (ימים 15-18)
- [ ] ControlDashboardPage.jsx with Kanban
- [ ] Bottleneck charts
- [ ] SLA settings page

---

# 🔹 Sprint 6 — Outputs + QA (4 שבועות)
**מטרה:** פרוטוקולים חתומים, PDF, מוצר מוכן.
**Preview:** פרוטוקול נחתם דיגיטלית, PDF מופק.

## S6.1 — Protocol System (ימים 1-7)
- [ ] Protocol editor (Rich Text)
- [ ] Auto-generate from meeting data
- [ ] Digital signature flow (email link → approve)
- [ ] Signature tracking page
- [ ] Protocol archive with search

## S6.2 — PDF Generation (ימים 8-10)
- [ ] Approval letter template
- [ ] PDF generator with institution branding
- [ ] Chairman approval flow

## S6.3 — Statistics + Export (ימים 11-13)
- [ ] StatsPage.jsx with charts (Recharts)
- [ ] Excel export (XLSX generated → stored in documents table)
- [ ] Audit log page

## S6.4 — Admin + Settings (ימים 14-16)
- [ ] Users management page (real CRUD)
- [ ] Institution settings page
- [ ] Impersonation
- [ ] Email template editor
- [ ] Document storage settings (provider, max size, allowed types)

## S6.5 — Production Readiness (ימים 17-22)
- [ ] setup.sh — installation script for new institution
- [ ] docker-compose.prod.yml
- [ ] Security audit (npm audit, OWASP ZAP scan)
- [ ] Load testing (k6)
- [ ] Documentation: DEPLOYMENT.md, NEW_INSTITUTION.md
- [ ] Final UAT testing
- [ ] Tag: `git tag v1.0.0`

**🎉 מוצר v1.0 מוכן — עצמאי, עובד בלי שום חיבור חיצוני!**

---
---

# 🔹 Phase 2 — אינטגרציות (אחרי v1.0)
**מטרה:** תוספות ערך למוסדות שרוצים חיבור למערכות ארגוניות.
**עיקרון:** הכל אופציונלי. המוצר עובד מעולה בלעדיהם.

---

## P2.1 — Microsoft Integration (2 שבועות)
**Preview:** פגישה שנוצרת ב-EthicFlow מופיעה גם ביומן Outlook של חברי הוועדה.

### P2.1.1 — Microsoft Calendar Provider
- [ ] צור `services/calendar/microsoft.provider.js`
- [ ] Register app in Azure AD → get client ID/secret
- [ ] Implement: createEvent() → Microsoft Graph API → POST /events
- [ ] Implement: updateEvent() → PATCH /events/{id}
- [ ] Implement: deleteEvent() → DELETE /events/{id}
- [ ] Attendees receive Outlook invite with Accept/Decline
- [ ] Add env vars: MICROSOFT_TENANT_ID, CLIENT_ID, CLIENT_SECRET
- [ ] Test: create meeting in EthicFlow → appears in Outlook Calendar
**📁 קבצים:** `services/calendar/microsoft.provider.js`

### P2.1.2 — Microsoft Email Provider (Outlook)
- [ ] צור `services/email/microsoft.provider.js`
- [ ] Send emails via Microsoft Graph API (from organizational email)
- [ ] Emails come from "ethics@institution.ac.il" instead of generic SMTP
- [ ] Test: approval email arrives from institutional address
**📁 קבצים:** `services/email/microsoft.provider.js`

### P2.1.3 — Microsoft SSO (Entra ID)
- [ ] צור `services/auth/entra.provider.js`
- [ ] OIDC flow: redirect to Microsoft login → callback → JWT
- [ ] Auto-create user on first login if in allowed tenant
- [ ] Map Azure AD groups to EthicFlow roles (optional)
- [ ] Test: "Login with Microsoft" button works
**📁 קבצים:** `services/auth/entra.provider.js`, update LoginPage.jsx

## P2.2 — Google Integration (2 שבועות)
**Preview:** פגישה מופיעה ב-Google Calendar, מיילים יוצאים מ-Gmail ארגוני.

### P2.2.1 — Google Calendar Provider
- [ ] צור `services/calendar/google.provider.js`
- [ ] Google Calendar API: create/update/delete events
- [ ] Attendees get Google Calendar invite
- [ ] Add env: GOOGLE_CALENDAR_CREDENTIALS (service account JSON)
**📁 קבצים:** `services/calendar/google.provider.js`

### P2.2.2 — Gmail Provider
- [ ] צור `services/email/gmail.provider.js`
- [ ] Gmail API for sending from organizational Gmail
**📁 קבצים:** `services/email/gmail.provider.js`

### P2.2.3 — Google SSO
- [ ] צור `services/auth/google.provider.js`
- [ ] Google OAuth2 flow
- [ ] "Login with Google" button
**📁 קבצים:** `services/auth/google.provider.js`

## P2.3 — Cloud Storage Providers (1 שבוע)

### P2.3.1 — AWS S3 Provider
- [ ] צור `services/storage/s3.provider.js`
- [ ] upload(file, path) → S3 PUT → returns URL
- [ ] download(path) → S3 GET → returns stream
- [ ] delete(path) → S3 DELETE
- [ ] Presigned URLs for direct browser upload (large files)
- [ ] Add env: S3_BUCKET, S3_REGION, AWS_ACCESS_KEY, AWS_SECRET_KEY
**📁 קבצים:** `services/storage/s3.provider.js`

### P2.3.2 — Azure Blob Provider
- [ ] צור `services/storage/azure.provider.js`
- [ ] Same interface as S3 but with Azure Blob Storage SDK
- [ ] Add env: AZURE_STORAGE_CONNECTION_STRING, AZURE_CONTAINER
**📁 קבצים:** `services/storage/azure.provider.js`

## P2.4 — Advanced Document Features (1 שבוע)

### P2.4.1 — Virus Scanning
- [ ] Integrate ClamAV (open source antivirus) in Docker
- [ ] Scan every uploaded file before saving
- [ ] Reject infected files with clear error message

### P2.4.2 — Document Preview
- [ ] In-browser PDF preview (pdf.js)
- [ ] In-browser image preview
- [ ] DOC/DOCX preview via conversion to PDF (LibreOffice headless)

### P2.4.3 — Digital Signatures on PDFs
- [ ] Cryptographic PDF signing (not just text stamp)
- [ ] Verify signature validity
- [ ] Certificate-based signing (optional)

---

**🎉 Phase 2 מוסיף ~6 שבועות. מוצר v2.0 עם אינטגרציות מלאות.**
