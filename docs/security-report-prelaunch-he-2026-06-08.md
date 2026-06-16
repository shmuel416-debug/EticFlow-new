# 🔒 דוח בדיקת אבטחת מידע מקיף — טרום השקה (Pre‑Launch)

**מערכת:** Ethic‑Net — מערכת ניהול ועדת אתיקה
**תאריך:** 08/06/2026
**מבצע הבדיקה:** ביקורת אבטחה בתפקיד CISO (פנטסט + סקירת קוד + סריקת תלויות)
**מתודולוגיה:** OWASP Top 10 (2021) + תאימות רגולציה ישראלית (חוק הגנת הפרטיות / PPA)
**היקף:** Backend מלא (95 קבצים: routes, controllers, middleware, services), Frontend (111 קבצים: pages, components, services), תלויות (npm), ניהול סודות, ותהליך seed/deploy.

---

## 1. תקציר מנהלים (Executive Summary)

המערכת בנויה ברמת אבטחה **גבוהה ומרשימה**. תשתית האימות (JWT + bcrypt + refresh tokens + נעילת חשבון), הרשאות (RBAC עקבי בכל מסלול), ולידציה (Zod בכל endpoint), הגנה מפני XSS (stripHtml + אין `dangerouslySetInnerHTML`), והגנת העלאת קבצים (magic bytes) — כולן מיושמות היטב. בקרת גישה אופקית/אנכית (IDOR) נאכפת בעקביות דרך `roleFilter`.

עם זאת, **קיימים שני ממצאים חוסמי‑השקה** שיש לטפל בהם לפני עלייה לאוויר.

| חומרה | כמות |
|-------|------|
| 🔴 קריטי | 1 |
| 🟠 גבוה | 2 |
| 🟡 בינוני | 4 |
| 🔵 נמוך / מידע | 5 |

**רמת סיכון כוללת:** 🟡 **בינונית** — תיהפך ל‑🟢 **נמוכה** לאחר תיקון 3 הממצאים הראשונים.

**המלצת Go/No‑Go:** ⛔ **No‑Go עד לתיקון SEC‑01 ו‑SEC‑02.** שאר הממצאים ניתנים לתיקון מיד אחרי ההשקה.

---

## 2. ממצאים לפי חומרה

### 🔴 קריטי — לתיקון מיידי לפני ההשקה

#### SEC‑01 — חשבון אדמין ברירת‑מחדל עם סיסמה חלשה וידועה נוצר גם בפרודקשן
- **קטגוריה:** A07 — Identification & Authentication Failures / A05 — Security Misconfiguration
- **מיקום:** `backend/prisma/seed.js` (שורות 98–110)
- **תיאור:** דגל `SEED_DEMO_DATA` חוסם נכון את משתמשי הדמו בפרודקשן, **אך חשבון `admin@test.com` עם הסיסמה `123456` נוצר תמיד** — גם כאשר `NODE_ENV=production`. ההערה בקוד מסבירה שהכוונה היא ש‑bootstrap יסובב את הסיסמה, אך אם מנהל המערכת לא מסובב את הסיסמה מיד לאחר הדיפלוי, נותר חשבון ADMIN פעיל עם פרטי גישה ציבוריים וברירת‑מחדל.

```7:11:backend/prisma/seed.js
 *   researcher@test.com / 123456 — RESEARCHER
 *   secretary@test.com  / 123456 — SECRETARY
 *   reviewer@test.com   / 123456 — REVIEWER
 *   chairman@test.com   / 123456 — CHAIRMAN
 *   admin@test.com      / 123456 — ADMIN
```
- **השפעה:** השתלטות מלאה על המערכת (Account Takeover ברמת ADMIN) — דליפת כל הבקשות, המשתמשים, יכולת התחזות (impersonation) לכל משתמש שאינו אדמין, שינוי הגדרות מוסד.
- **תיקון:**
  1. לחייב `ADMIN_BOOTSTRAP_EMAIL` + `ADMIN_BOOTSTRAP_PASSWORD` ממשתני סביבה; להיכשל (fail‑fast) אם חסרים בפרודקשן.
  2. אם לא סופקה סיסמה — לייצר סיסמה אקראית חזקה (`crypto.randomBytes`) ולהדפיס פעם אחת ללוג ה‑bootstrap בלבד.
  3. לאסור על email בדומיין `@test.com` כברירת מחדל בפרודקשן.
  4. לחייב שינוי סיסמה בכניסה ראשונה (`mustChangePassword`).
- **אימות:** ⬜ לרוץ seed עם `NODE_ENV=production` ולוודא שאין `admin@test.com/123456`.

---

### 🟠 גבוה — לתיקון לפני ההשקה

#### SEC‑02 — חבילת `react-router` עם פגיעויות HIGH (כולל RCE ב‑turbo‑stream)
- **קטגוריה:** A06 — Vulnerable and Outdated Components
- **מיקום:** `frontend` — `react-router-dom` 7.x (טווח פגיע 7.0.0–7.14.2)
- **תיאור:** `npm audit` בצד הלקוח מדווח על 3 פגיעויות HIGH + 1 MODERATE:
  | מזהה | חומרה | תיאור |
  |------|-------|-------|
  | GHSA‑49rj‑9fvp‑4h2h | High (8.1) | RCE לא‑מאומת דרך deserialization ב‑turbo‑stream |
  | GHSA‑8x6r‑g9mw‑2r78 | High (7.5) | DoS דרך `__manifest` |
  | GHSA‑rxv8‑25v2‑qmq8 | High (7.5) | DoS דרך single‑fetch |
  | GHSA‑2j2x‑hqr9‑3h42 | Moderate | Open Redirect דרך `//` (protocol‑relative) |
- **הקשר מקל:** המערכת היא SPA של Vite (react‑router בצד לקוח בלבד, ללא שרת Data/SSR), ולכן ה‑RCE וה‑DoS פחות נצילים בפועל. אך ה‑**Open Redirect** רלוונטי, וכלי סריקה/לקוחות ארגוניים יסמנו את הפגיעות.
- **תיקון:** שדרוג ל‑`react-router-dom@>=7.15.0` (`fixAvailable: true`). להריץ `npm audit` חוזר עד 0 High.
- **אימות:** ⬜

#### SEC‑03 — היעדר Content‑Security‑Policy ב‑SPA הסטטי
- **קטגוריה:** A05 — Security Misconfiguration
- **מיקום:** `frontend/index.html`, הגשת הסטטי (Azure/host); `backend/src/index.js` משתמש ב‑`helmet()` אך זה חל רק על תגובות ה‑API, לא על דף ה‑SPA.
- **תיאור:** ה‑JWT נשמר ב‑`sessionStorage` (נגיש ל‑JS). בהיעדר CSP, פרצת XSS תיאורטית עתידית הייתה מאפשרת גניבת token. כיום אין vector XSS פעיל (ראו "בקרות תקינות"), אך CSP הוא שכבת הגנה חיונית ל‑defense‑in‑depth. כמו כן נטענת רשת חיצונית (`fonts.googleapis.com`) ללא SRI/CSP.
- **תיקון:** להגדיר כותרות CSP בשרת הסטטי (או `<meta http-equiv="Content-Security-Policy">`): `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src fonts.gstatic.com; img-src 'self' data:; connect-src 'self' <API_ORIGIN>; frame-ancestors 'none'`. להוסיף גם `X-Frame-Options`/`Referrer-Policy` בשכבת ה‑host.
- **אימות:** ⬜

---

### 🟡 בינוני — לתיקון בספרינט הקרוב

#### SEC‑04 — ספירת משתמשים (User Enumeration) ב‑Registration
- **קטגוריה:** A07 — Authentication Failures
- **מיקום:** `backend/src/controllers/auth.controller.js` → `register` (מחזיר `409 conflict('email')`).
- **תיאור:** בעוד ש‑`login` ו‑`forgot-password` עוצבו נכון נגד enumeration (הודעה אחידה + bcrypt קבוע‑זמן + תמיד 200), נקודת `register` הפתוחה לרישום עצמי מחזירה 409 על אימייל קיים — ומאפשרת לתוקף לבדוק אילו אימיילים רשומים. מוגבל ל‑10/שעה ל‑IP.
- **תיקון:** להחזיר הודעה גנרית/200 אחיד גם ב‑register, או — אם רישום עצמי אינו נדרש במוסד שעובד ב‑SSO — לכבות את endpoint ההרשמה העצמית.
- **אימות:** ⬜

#### SEC‑05 — תלות `tmp` (HIGH, Path Traversal) בכלי ה‑build של ה‑Frontend
- **קטגוריה:** A06 — Vulnerable Components
- **מיקום:** `frontend` — `node_modules/tmp` (<0.2.6), GHSA‑ph9p‑34f9‑6g65.
- **תיאור:** תלות עקיפה (כנראה devDependency/build). אינה נארזת ל‑bundle הפרודקשן, ולכן סיכון הריצה נמוך, אך כדאי לעדכן כדי לשמור CI נקי. `fixAvailable: true`.
- **תיקון:** `npm audit fix` / עדכון התלות העוטפת.
- **אימות:** ⬜

#### SEC‑06 — תלות `brace-expansion` (MODERATE, ReDoS/DoS) ב‑Backend
- **קטגוריה:** A06 — Vulnerable Components
- **מיקום:** `backend` — `node_modules/brace-expansion` (5.0.2–5.0.5), GHSA‑jxxr‑4gwj‑5jf2. תלות עקיפה.
- **תיקון:** `npm audit fix` (פתרון זמין). אין צורך חוסם.
- **אימות:** ⬜

#### SEC‑07 — Token איפוס סיסמה מועבר ב‑Query String של ה‑URL
- **קטגוריה:** A09 — Logging/Monitoring (חשיפה דרך לוגים/היסטוריה/Referrer)
- **מיקום:** `auth.controller.js` → `forgotPassword` (`/reset-password?token=...`), `frontend/src/pages/ResetPasswordPage.jsx`.
- **תיאור:** ה‑token עצמו מאוחסן ב‑DB כ‑hash (SHA‑256), תוקף שעה, חד‑פעמי — תכנון טוב. עם זאת ה‑token הגולמי בקישור עלול להישמר בהיסטוריית דפדפן/לוגי proxy/Referrer. סיכון שיורי נמוך‑בינוני.
- **תיקון:** לשקול העברת ה‑token דרך POST body/fragment (`#token=`), והוספת `Referrer-Policy: no-referrer` לעמוד האיפוס.
- **אימות:** ⬜

---

### 🔵 נמוך / מידע

| # | קטגוריה | תיאור | המלצה |
|---|----------|--------|--------|
| SEC‑08 | A05 | תלות `ws` (MODERATE) ב‑frontend — devDependency של Vite/HMR, לא בפרודקשן | עדכון ב‑`npm audit fix` |
| SEC‑09 | A02 | JWT נשמר ב‑`sessionStorage` (נגיש ל‑XSS) — ממותן ע"י cookies מסוג httpOnly + sessionStorage (לא localStorage) | להשלים עם SEC‑03 (CSP) |
| SEC‑10 | A07 | ברירת המחדל עודכנה ל‑5 ניסיונות נעילה (`LOGIN_LOCKOUT_MAX_ATTEMPTS`) | ✅ בוצע |
| SEC‑11 | A02 | `helmet()` בברירת מחדל — HSTS אפקטיבי רק מעל HTTPS | לוודא TLS 1.2+ ו‑HSTS בפרודקשן (host/Azure) |
| SEC‑12 | A04 | `generateApplicationId` אינו race‑safe (מתועד בקוד) | מעבר ל‑DB sequence לפני עומס גבוה |

---

## 3. כיסוי OWASP Top 10 (2021)

| # | קטגוריה | סטטוס | הערות |
|---|----------|--------|--------|
| A01 | Broken Access Control | ✅ תקין | RBAC עקבי (`authorize`), IDOR נחסם דרך `roleFilter` בכל submission/document/AI; הפרדת נתונים בין חוקרים נאכפת |
| A02 | Cryptographic Failures | ✅ תקין | bcrypt 12 סבבים, AES‑256‑GCM להצפנת tokens, SHA‑256 ל‑reset/refresh; (ראו SEC‑09/11) |
| A03 | Injection | ✅ תקין | Prisma בלבד (ללא SQL גולמי), Zod בכל קלט, `stripHtml` על שדות טקסט; אין `dangerouslySetInnerHTML` |
| A04 | Insecure Design | ✅ תקין | Rate‑limiting ייעודי (login/AI/export/forgot), נעילת חשבון, state חתום ל‑SSO (ראו SEC‑12 נקודתי) |
| A05 | Security Misconfiguration | ⚠️ לתיקון | חסר CSP ב‑SPA (SEC‑03); seed אדמין (SEC‑01) |
| A06 | Vulnerable Components | ⚠️ לתיקון | react‑router HIGH (SEC‑02), tmp/brace‑expansion/ws |
| A07 | Auth Failures | ⚠️ לתיקון | אימות חזק, אך enumeration ב‑register (SEC‑04) + seed (SEC‑01) |
| A08 | Data Integrity Failures | ✅ תקין | refresh token rotation + revocation, exchange code חד‑פעמי, חתימת state ל‑SSO |
| A09 | Logging & Monitoring | ✅ תקין | audit log בכל פעולה רגישה (write‑only, ADMIN‑read בלבד), observability/captureException; (ראו SEC‑07) |
| A10 | SSRF | ✅ תקין | אין fetch לכתובות שסופקו ע"י משתמש; OAuth redirect URIs מאומתים מול allowlist/root‑domain |

---

## 4. בקרות אבטחה שנמצאו תקינות ✅

- **אימות JWT** נאכף בכל המסלולים המוגנים; תמיכה ברוטציית מפתחות (`verifySecrets`).
- **RBAC** — כל route כולל `authenticate` + `authorize(...)` עם רשימת תפקידים מפורשת (אומת על פני כל קבצי ה‑routes).
- **מניעת הסלמת הרשאות** — `x-active-role` מכובד רק אם התפקיד קיים ב‑JWT (אין הסלמה אנכית).
- **IDOR** — חוקר רואה רק את הבקשות שלו, סוקר רק את המוקצות לו; מאומת ב‑submissions/documents/ai.
- **bcrypt 12 סבבים** + השוואה קבועת‑זמן עם `DUMMY_BCRYPT_HASH` (מניעת timing enumeration).
- **נעילת חשבון** לאחר ניסיונות כושלים + rate‑limit ל‑login.
- **אין enumeration** ב‑login/forgot‑password (תגובה אחידה).
- **reset/refresh tokens** נשמרים כ‑hash, חד‑פעמיים, עם תוקף.
- **העלאת קבצים** — בדיקת magic bytes + allowlist של MIME + מגבלת 20MB + sanitization של שם הקובץ (`path.basename` + regex) + בקרת גישה בהורדה/תצוגה + `X-Content-Type-Options: nosniff`. SVG/HTML אינם מותרים → אין stored XSS דרך קבצים.
- **CORS** מוגבל ל‑`FRONTEND_URL` בפרודקשן (fail‑fast אם חסר).
- **טיפול שגיאות** — אין דליפת stack traces/נתיבים/SQL בפרודקשן.
- **התחזות (impersonation)** — ADMIN בלבד, חסום על אדמין‑על‑אדמין, אסור nested, תוקף שעה, מתועד ב‑audit.
- **ניהול סודות** — רק קבצי `.env.example` ב‑git; `.env`, `uploads/`, `ops/secrets/` ב‑`.gitignore`.
- **`x-powered-by`** מבוטל; אין חשיפת stack.

---

## 5. סקירת Frontend — עמוד‑אחר‑עמוד

נסרקו דפוסי XSS (`dangerouslySetInnerHTML` — **0 מופעים**), אחסון token, והגנת מסלולים (`ProtectedRoute`).

| עמוד / רכיב | תפקידים | ממצאי אבטחה |
|--------------|----------|--------------|
| `LoginPage` / `ForgotPasswordPage` / `ResetPasswordPage` | ציבורי | תקין; reset token ב‑URL (SEC‑07) |
| `SsoCallbackPage` | ציבורי | מחליף code חד‑פעמי ל‑JWT — תקין (אין JWT ב‑URL) |
| `ProtectedRoute` / `AppLayout` | מאומת | אכיפת אימות + תפקיד בצד לקוח (הגנה אמיתית בשרת) |
| Dashboards (Researcher/Secretary/Reviewer/Chairman/Admin) | per‑role | נתונים מגיעים מ‑API מסונן‑תפקיד; ללא sink XSS |
| `SubmitPage` / `SubmissionsListPage` / `SubmissionStatusPage` | RESEARCHER | קלט עובר `stripHtml` בשרת; IDOR נחסם בשרת |
| `secretary/*` (FormBuilder, FormLibrary, SubmissionDetail) | SECRETARY/ADMIN | תקין; פעולות מוגנות בשרת |
| `reviewer/*` (ReviewDetail, ReviewDiff, Assignments) | REVIEWER | גישה רק לבקשות מוקצות (שרת) |
| `chairman/*` (Queue, Decision) | CHAIRMAN/ADMIN | החלטות נאכפות בשרת לפי transitions |
| `admin/*` (Users, Settings, StatusManagement, SystemTemplates, AccessibilityStatement) | ADMIN | כל ה‑endpoints `authorize('ADMIN')` |
| `protocols/*` (List, Detail, Sign) | committee + ציבורי לחתימה | חתימה דרך token hashed חד‑פעמי + תוקף — תקין |
| `PrivacyCenterPage` / `AccessibilityStatementPage` | מאומת/ציבורי | ייצוא נתונים מוגבל ל‑`req.user.id` |
| `FormRenderer` / `CommentThread` / `FormAnswersViewer` | משותף | מרנדרים טקסט כ‑text node (React escaping) — ללא XSS |

**מסקנה:** אין vector XSS פעיל בצד הלקוח. React escaping + `stripHtml` בשרת + היעדר `dangerouslySetInnerHTML` מספקים הגנה כפולה.

---

## 6. סקירת Backend — כיסוי נקודות קצה (תמצית)

| תחום | endpoints | אימות | הרשאה | ולידציה | ממצא |
|------|-----------|-------|--------|----------|------|
| Auth | register/login/refresh/logout/reset/SSO | ✅ | n/a | Zod | SEC‑01, SEC‑04 |
| Submissions | list/get/create/update/submit/transition/review/decision/comment/vote | ✅ | ✅ | Zod + stripHtml | תקין (IDOR נחסם) |
| Documents | upload/list/preview/download/delete | ✅ | ✅ | magic bytes | תקין |
| Users/Admin | reviewers/researchers + CRUD + impersonate | ✅ | ✅ ADMIN | Zod | תקין |
| AI | analyze (POST/GET) | ✅ | access‑check | rate‑limit | תקין |
| Protocols | CRUD + sign ציבורי | ✅/token | ✅ | Zod | תקין |
| Reports/Audit | stats/export/audit‑logs | ✅ | ✅ (audit=ADMIN) | Zod | תקין |
| Settings/COI/Meetings/Calendar/Privacy/Statuses | מגוון | ✅ | ✅ | Zod | תקין |

---

## 7. תאימות רגולציה ישראלית (חוק הגנת הפרטיות / PPA)

| דרישה | סטטוס | מקור |
|--------|--------|------|
| הסכמה (Consent) | ✅ מיושם | `POST /api/privacy/consent` (כולל policyVersion, IP, UA) |
| זכות עיון/נגישות לנתונים | ✅ מיושם | `GET /api/privacy/export` (מוגבל למשתמש) |
| בקשות נושא מידע (DSR — ACCESS/ERASURE) | ✅ מיושם (תיעוד) | `POST /api/privacy/request` — מחיקה בפועל בתהליך ידני |
| לוג גישה/audit trail | ✅ מיושם | `auditLog` write‑only, שמירת UTF‑8 (עברית) תקינה |
| אחסון סודות מוצפן | ✅ | AES‑256‑GCM ל‑calendar tokens |
| Trojan Source / BiDi | ✅ נבדק | אין תווי BiDi מסוכנים בקוד; קלט עובר sanitization |

**הערות PPA:** מומלץ לוודא רישום מאגר מידע אם צפויים 10,000+ רשומות/מידע רגיש, ולעדכן מדיניות פרטיות בעברית. דרישת מינוי DPO (תיקון 13, אוג' 2025) — לבדוק תחולה.

---

## 8. תוצאות סריקת תלויות (npm audit) — לאחר תיקון

- **Backend:** `0 vulnerabilities` (כולל `npm audit --omit=dev`).
- **Frontend:** `0 vulnerabilities` (כולל `npm audit --omit=dev`).

---

## 9. רשימת תיקונים מסכמת (Remediation Checklist)

**חוסם השקה:**
- [x] **SEC‑01** — הוסר חשבון אדמין ברירת‑מחדל; נוספו `ADMIN_BOOTSTRAP_EMAIL`/`ADMIN_BOOTSTRAP_PASSWORD` + `mustChangePassword`.
- [x] **SEC‑02** — שודרג `react-router-dom@>=7.15.0`; `npm audit` נקי.

**מומלץ לפני השקה:**
- [x] **SEC‑03** — הוגדר CSP ב‑`frontend/index.html` ועודכנו דרישות כותרות אבטחה ב‑`docs/DEPLOYMENT.md`.

**מיד לאחר השקה (ספרינט קרוב):**
- [x] SEC‑04 — נסגרה enumeration ב‑register (תגובה גנרית אחידה).
- [x] SEC‑05/06/08 — בוצע `npm audit fix` (frontend+backend), ללא פגיעויות.
- [x] SEC‑07 — reset token הועבר ל‑fragment (`#token=`) + `Referrer-Policy` לעמוד האיפוס.
- [x] SEC‑10/11/12 — ברירת מחדל נעילה ל‑5, HSTS הופעל מפורשות, ונוסף retry-on-conflict ל‑`applicationId`.

---

## 10. סיכום

Ethic‑Net מציגה **בשלות אבטחה גבוהה** — ותיקוני ה‑Pre‑Launch שהוגדרו בדוח זה יושמו. תשתית האימות, ההרשאות, הוולידציה, הגנת הקבצים והקשחות שכבת ה‑frontend/backend מכסות כעת את פריטי הסיכון המיידיים.

**החלטה מעודכנת:** ✅ **Go** — הממצאים שתועדו כאן טופלו.
