# דוח Sprint 12 — ניהול סטטוסים דינמי

תאריך סגירה: 2026-04-22  
סטטוס: הושלם

## מטרות הספרינט
- מעבר מ־`SubStatus` קשיח למודל סטטוסים דינמי מבוסס DB.
- ניהול מעברים והרשאות לפי שלב ותפקיד (כולל ADMIN/SECRETARY).
- שמירה על תאימות לזרימות קיימות: SLA, התראות, מסמכים, ו־E2E קיימים.

## תוצרים מרכזיים

### 1) שכבת נתונים ומיגרציה
- נוספו ישויות חדשות ב־Prisma:
  - `SubmissionStatus`
  - `StatusTransition`
  - `StatusPermission`
  - enums חדשים: `StatusAction`, `SlaPhase`
- שדה `Submission.status` הומר מ־enum לערך מחרוזת (`String @db.VarChar(40)`).
- נוספה מיגרציה: `backend/prisma/migrations/20260422180000_add_status_management/migration.sql`.
- seed עודכן להקמת סטטוסים/מעברים/הרשאות ברירת מחדל.

### 2) Backend סטטוסים דינמי
- שירות חדש: `backend/src/services/status.service.js`
  - cache in-memory
  - `listStatuses`, `getAllowedTransitions`, `can`, `getSlaPhase`, `getNotificationType`
- רפקטור לוגיקה קיימת:
  - `submissions.status.controller.js` — מעבר ממטריצה קשיחה לקונפיג דינמי.
  - `sla.service.js` — SLA לפי `slaPhase`.
  - `notification.service.js` — מיפוי התראות לפי DB.
  - `documents.controller.js` — הרשאות העלאה/מחיקה לפי מטריצת הרשאות.

### 3) API ניהול סטטוסים
- נקודות קצה חדשות:
  - `GET /api/statuses/config` (authenticated)
  - `GET /api/statuses/actions/allowed`
  - `GET/POST/PUT/DELETE /api/admin/statuses`
  - `PUT /api/admin/statuses/reorder`
  - `GET/PUT /api/admin/statuses/:id/transitions`
  - `GET/PUT /api/admin/statuses/:id/permissions`
- כל פעולות admin מוגנות עם `authorize('ADMIN')` ומתועדות audit.

### 4) Frontend ודינמיות UI
- hook חדש: `frontend/src/hooks/useStatusConfig.js`
- רכיבים שעודכנו ל־DB-driven:
  - `StatusTransitionPanel.jsx`
  - `StatusBadge.jsx`
  - `secretary/SubmissionsListPage.jsx`
  - `researcher/SubmissionsListPage.jsx`
  - `dashboards/SecretaryDashboard.jsx`
- עמוד חדש לניהול סטטוסים:
  - `frontend/src/pages/admin/StatusManagementPage.jsx`
  - route: `/admin/statuses`
  - sidebar link: `nav.statusManagement`

### 5) עיצוב ונגישות
- קובץ עיצוב 3 אפשרויות: `docs/designs/status-management-design.html`
- סקירת נגישות pre-implementation: `docs/accessibility-report-status-management-design-review.md`

### 6) בדיקות ודוחות סיום
- דוח Code Review: `docs/code-review-sprint-12.md`
- דוח QA: `docs/qa-report-sprint-12.md`
- דוח Accessibility: `docs/accessibility-report-sprint-12.md`
- דוח Security: `docs/security-report-sprint-12.md`

## תוצאות הרצה
- `backend npm test` — PASS (23/23)
- `frontend npm run lint` — PASS
- `frontend npm run build` — PASS
- `backend npx prisma validate` — PASS
- `backend npm audit --audit-level=high` — PASS (0 vulnerabilities)
- `frontend npm audit --audit-level=high` — PASS (0 vulnerabilities)
- `npx playwright test e2e/admin/status-management.spec.js --list` — PASS (test discovery)

## החלטת Go/No-Go
- **GO** לשילוב הספרינט.
- המלצת hardening עתידית: invalidation מבוזר לקאש בסביבה מרובת מופעים.
