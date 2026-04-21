# דוח בדיקה חי — Production Smoke E2E (API + RBAC)

## פרטי הרצה
- תאריך: 21 באפריל 2026
- סביבה: `https://frontend-eticflow-dev.up.railway.app`
- סוג בדיקה: Live smoke על Production (אימות זמינות, Login, RBAC לפי תפקיד)
- כלי הרצה: `node fetch` מול API חי

## תוצאות סיכום
- סטטוס כללי: PASS
- זמינות Frontend: PASS
- זמינות API Health: PASS
- התחברות 5 תפקידים: PASS
- בדיקות RBAC לפי endpoint: PASS (50/50)

## בדיקות שבוצעו בפועל

### 1) זמינות שירות
- `GET /` (Frontend): תקין
- `GET /api/health`: `200` עם `database: connected`

### 2) Login לכל 5 תפקידים
- RESEARCHER: PASS (200)
- SECRETARY: PASS (200)
- REVIEWER: PASS (200)
- CHAIRMAN: PASS (200)
- ADMIN: PASS (200)

### 3) RBAC Live Matrix (לפי Role)
אומת לכל תפקיד מול ה-endpoints הבאים:
- `GET /api/auth/me`
- `GET /api/submissions`
- `GET /api/notifications`
- `GET /api/meetings`
- `GET /api/submissions/dashboard/secretary`
- `GET /api/reports/stats`
- `GET /api/audit-logs`
- `GET /api/users/reviewers`
- `GET /api/users/admin/users`
- `GET /api/protocols`

תוצאה: כל התגובות תואמות ציפיות הרשאה (`200` למורשים, `403` ללא מורשים).

## ממצאים
- אין ממצא קריטי/חוסם ב-smoke החי שנבדק.
- מודל ההרשאות פועל תקין ב-API במטריצה שנבדקה.
- Login צד שרת תקין לכל התפקידים.

## מגבלות הבדיקה הנוכחית
- זו בדיקת API smoke חיה, לא אוטומציית UI בדפדפן.
- לא בוצעו כאן תרחישי UI מורכבים כגון drag/drop, responsive ויזואלי, וזרימות ארוכות עם side effects מלאים (כמו cycle מלא של submission עם החלטות ו-PDF דרך ה-UI).

## המלצה מיידית
- להשלים סבב UI חי מונחה תפקידים על בסיס המסמך:
  - `docs/e2e-test-plan-hebrew.md`
- לשמור את המטריצה התפעולית החדשה כ-baseline:
  - `docs/live-production-qa-matrix-hebrew.md`

## החלטה
- עבור שכבת API + RBAC + Login: Go
- עבור Go מלא לפרודקשן (UI end-to-end): נדרש להשלים סבב UI וולידציה מלא.

