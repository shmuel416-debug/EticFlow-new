# דוח אבטחה מפורט לפני עלייה לאוויר — 21/04/2026

## תקציר מנהלים

המערכת עברה הקשחת אבטחה ממוקדת לפרודקשן, עם דגש על זרימת SSO, הקשחת CORS, וחשיפת headers.

תוצאה נוכחית:
- פגיעויות תלויות (`npm audit`): **0** (backend + frontend)
- ממצאים קריטיים שזוהו: **1**
- ממצאים גבוהים שזוהו: **1**
- סטטוס אחרי תיקון: **מוכן לשלב staging smoke לפני Go-Live**

---

## היקף הבדיקה

### Backend
- `backend/src/controllers/auth.controller.js`
- `backend/src/routes/auth.routes.js`
- `backend/src/index.js`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/20260421110000_add_auth_exchange_codes/migration.sql`
- `docker-compose.prod.yml`
- `.env.example`
- `.env.prod.example`

### Frontend
- `frontend/src/pages/auth/SsoCallbackPage.jsx`
- `frontend/playwright.config.js`

### תיעוד
- `docs/DEPLOYMENT.md`

---

## ממצאים מהותיים (לפני תיקון)

### 1) קריטי — JWT הועבר ב-URL בזרימת SSO
**סיכון:** דליפת token דרך history, logs, analytics, או referrer.

**מצב קודם:** redirect ל-`/sso-callback?token=...`.

### 2) גבוה — fallback לא בטוח ליעד Frontend בפרודקשן
**סיכון:** שימוש ב-`Origin` בזמן fallback עלול לאפשר redirect לא מורשה אם `FRONTEND_URL` חסר/לא תקין.

### 3) בינוני — CORS בפרודקשן אפשר דומיינים קשיחים נוספים
**סיכון:** הרחבת שטח חשיפה מעבר ל-origin יחיד מאושר.

### 4) בינוני — חשיפת חתימת שרת (`x-powered-by`)
**סיכון:** דליפת fingerprinting מידע טכנולוגי לתוקף.

---

## תיקונים שבוצעו

### A) מעבר ל-One-Time Code במקום JWT ב-URL
- נוספה טבלת `AuthExchangeCode` ב-Prisma:
  - שדות: `codeHash`, `userId`, `expiresAt`, `usedAt`, `isActive`, `createdAt`
  - אינדקסים: `codeHash` (unique), `expiresAt`, `userId+createdAt`
- callback של Google/Microsoft יוצר code חד-פעמי קצר חיים ומפנה עם:
  - `?code=<one-time-code>`
- נוספה נקודת קצה:
  - `POST /api/auth/exchange-code`
  - ולידציה עם Zod לפורמט קוד
  - אכיפה: תוקף זמן + single-use + בדיקת `isActive`
  - צריכה אטומית עם `updateMany` למניעת replay/race

### B) הקשחת פרודקשן ל-origin
- בפרודקשן `FRONTEND_URL` כעת **חובה**:
  - אם חסר: startup error מפורש
- CORS בפרודקשן מוגבל ל-origin יחיד:
  - `FRONTEND_URL` בלבד
- פונקציית resolve ל-frontend בפרודקשן לא סומכת על `Origin`.

### C) הקשחת headers
- הוגדר `app.disable('x-powered-by')`.

### D) הקשחת תצורה ותיעוד
- נוספה הגדרת TTL לקוד החלפה:
  - `AUTH_EXCHANGE_TTL_MS` (ברירת מחדל: 90000)
- עודכנו:
  - `.env.example`
  - `.env.prod.example`
  - `docker-compose.prod.yml`
  - `docs/DEPLOYMENT.md` (זרימת SSO חדשה + checklist קשיחות)

### E) הרחבת כיסוי בדיקות לזרימת החלפה
- נוסף קובץ בדיקות חדש:
  - `backend/tests/auth.exchange-code.test.js`
- תרחישים שנבדקים:
  - החלפה תקינה של קוד חד-פעמי וקבלת JWT
  - דחיית קוד שפג תוקף
  - דחיית replay כאשר צריכה אטומית נכשלת (`updateMany.count === 0`)

### F) איחוד שינויים מקבילים (Audit/Routes/E2E/CI)
- `backend/src/middleware/audit.js` עודכן כך ש-log נרשם על הצלחת `res.json`, וב-SSO גם על `res.redirect` ל-`/sso-callback?code=...`.
- הועברה עקביות ברוב ה-routes כך ש-`auditLog(...)` נרשם לפני handler (כדי להבטיח capture של תגובות שמסתיימות ב-`res.json` ללא `next()`).
- `backend/src/routes/submissions.routes.js` קיבל audit ייעודי ל-response זורם (PDF) באמצעות `recordAuditEntry` על `res.finish`.
- `backend/src/controllers/users.controller.js` ו-`backend/src/controllers/protocols.controller.js` משלימים `res.locals.entityId` לשיפור שלמות audit.
- `frontend/src/pages/reports/AuditLogPage.jsx` עודכן לפרמטרים תואמי backend (`from`/`to` ב-ISO range מלא ליום), מה שמצמצם פערי סינון תאריכים.
- `.github/workflows/quality-gates.yml` עודכן להתקנת דפדפני Playwright ב-CI, להפחתת כשלים סביבתיים בבדיקות.
- תשתית E2E (`frontend/e2e/support/*`, `frontend/e2e/*workflow*.spec.js`) הוקשחה לדרישת סט הרשאות מינימלי ורלוונטי ל-workflow.

---

## ראיות אימות

### 1) חיפוש קוד: אין JWT ב-SSO callback URL
- לא נמצאו מופעים של `sso-callback?token` בקוד הרלוונטי.
- כן נמצאו מופעים של `sso-callback?code=...` ב-backend callbacks.

### 2) נקודת החלפה פעילה
- נמצאו:
  - `POST /api/auth/exchange-code` בראוטים
  - קריאה מה-frontend `SsoCallbackPage` ל-`/auth/exchange-code`

### 3) פרודקשן קשיח
- נמצאו:
  - `FRONTEND_URL must be configured in production`
  - `app.disable('x-powered-by')`
  - CORS origin לפי `IS_PROD`.

### 4) בדיקות תלויות
- Backend `npm audit`: 0 vulnerabilities
- Frontend `npm audit`: 0 vulnerabilities

### 5) בדיקות איכות
- Lint diagnostics על הקבצים ששונו: ללא שגיאות
- `npm test` backend: עבר (כולל טסטים ייעודיים ל-`exchange-code`)
- `npm run build` frontend: עבר
- סקירת דלתאות רוחבית לקבצי backend routes/controllers + e2e/CI: הושלמה

---

## תקלות שהתגלו במהלך היישום ותוקנו

### תקלה: קריסת backend עקב התנגשות שם משתנה ב-callback
- סימפטום: `Identifier 'code' has already been declared`
- סיבה: שימוש בשם `code` כפול (query param + משתנה פנימי)
- תיקון: שינוי שם המשתנה ל-`exchangeCode` בשני callbacks.
- אימות לאחר תיקון: טסטים ובילד עברו.

---

## סיכונים שנותרו (Residual Risk)

1. **שכבת smoke חי מלאה לא בוצעה מול סביבת staging/production**
   - יש להריץ E2E חי עם זהויות Google/Microsoft לפני Go-Live.

2. **תלוי תצורה נכונה בסביבת פרודקשן**
   - `FRONTEND_URL` חייב להיות תקין ומדויק
   - `AUTH_EXCHANGE_TTL_MS` חייב להישאר קצר

3. **הערת בדיקות E2E (informational): `playwright.config.js` מצביע כברירת מחדל לשרת dev מרוחק**
   - `VITE_API_URL` ב-`webServer.env` ברירת מחדל ל-`https://frontend-eticflow-dev.up.railway.app/api`
   - מומלץ שב-CI/בדיקות מקומיות רגישות יוגדר `E2E_API_URL` מפורש לסביבת בדיקה מבודדת.

4. **תוצרי בדיקה מקומיים לא מנוהלים (repo hygiene)**
   - זוהו תיקיות לא מנוהלות: `frontend/playwright-report/`, `frontend/test-results/`
   - מומלץ לוודא שהן מוחרגות ב-`.gitignore` ולא נכנסות ל-release artifacts.

---

## המלצות Go-Live מיידיות

1. להריץ `prisma migrate deploy` בסביבת היעד.
2. לבצע smoke SSO חי (Google + Microsoft):
   - login success
   - exchange success
   - replay נכשל
   - expiry נכשל
3. לאשר ש-CORS דוחה origin זר.
4. לוודא שב-logs/monitoring אין token leakage.
5. לבצע בדיקת rollback קצרה לפני פתיחת תעבורה מלאה.

---

## פסק דין שחרור

סטטוס: **Go ל-Staging smoke, ואז Go-Live לאחר אימות חי מוצלח**.

המערכת קשיחה משמעותית יותר מהמצב הקודם, והפער הקריטי של JWT ב-URL נסגר.
