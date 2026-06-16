# PROJECT_STORY.md — Ethic-Net (EticFlow)

מסמך תקציר חומר־גלם לסדרת פוסטים ל-LinkedIn. כל סעיף מבוסס על תיעוד וקוד שנמצאים בריפו. כל מה שלא תועד מסומן בפירוש.

---

## 1. תמונת על

**במשפט אחד (מתוך `CLAUDE.md` ו-`docs/spec.md`):**
Ethic-Net הוא מערכת SaaS עצמאית (standalone) לניהול בקשות אישור אתי במחקר אקדמי — מחליפה תהליך ידני שמתבצע כיום במייל ובאקסל בתהליך דיגיטלי מלא: הגשה → סקירה → ועדה → אישור → PDF חתום.

**משתמשים — 5 תפקידים (RBAC):**
- **Researcher (חוקר)** — מגיש בקשות, עורך גרסאות, עוקב סטטוס.
- **Secretary (מזכירה)** — טריאז', שיוך סוקרים, בניית טפסים (Form Builder), ניהול ישיבות, פרוטוקולים, SLA.
- **Reviewer (סוקר)** — סקירה ב־split screen, הערות inline, פאנל AI, חתימה על פרוטוקולים.
- **Chairman (יו"ר)** — דשבורד שליטה, אישור סופי, יצירת PDF חתום.
- **Admin** — ניהול משתמשים, audit log, impersonation, הגדרות מוסד.

**הבעיה — "איך זה עבד לפני":**
- `docs/spec.md` שורה 4 מתאר במפורש: "Digital platform replacing manual (email/Excel) ethics approval process."
- מעבר לזה — תיאור איכותני של הכאב ("מה היה מעצבן ביום-יום של המזכירה / החוקר / היו"ר") **לא תועד בריפו**.

**איפה הוא רץ:**
- הלקוח הראשון: JCT (מכון לב, `acad.jct.ac.il`) — נפרס ל-Azure App Service.
- Hostname קנוני בפרודקשן: `ethics-net-api.jct.ac.il` (`CLAUDE.md` + `docs/ops/`).

---

## 2. הסטאק הטכנולוגי

### Frontend (`frontend/package.json`)
- **React 19.2** + **Vite 8** + **TailwindCSS 4.2**
- **react-router-dom 7.13**
- **react-i18next 17** + **i18next 26** — דו-לשוני he/en, RTL/LTR אוטומטי
- **axios 1.14**
- **@dnd-kit** — Drag & Drop ל-Form Builder
- **react-markdown + remark-gfm**
- **lucide-react** — אייקונים
- Testing: **Playwright 1.59** (E2E), **@axe-core/cli** (a11y), **ESLint 9**

### Backend (`backend/package.json`)
- **Node.js + Express 4.19** (ES Modules בלבד — חוק קשיח מ-CLAUDE.md)
- **Prisma 5.14** + **PostgreSQL 16**
- **Zod 3.23** — וולידציה על כל endpoint
- **JWT (jsonwebtoken 9)** + **bcryptjs 2.4** — auth
- **helmet, cors, express-rate-limit, morgan, cookie-parser** — אבטחה ו-middleware
- **multer 2.1** — קבצים
- **node-cron 4.2** — בודק SLA חצות
- **nodemailer 8** — אימייל (provider בסיסי)
- **pdfkit 0.18 + pdf-lib 1.17 + puppeteer 24.41** — יצירת PDFs (סיפור בפני עצמו, סעיף 4)
- **exceljs 4.4** — ייצוא דוחות

### אינטגרציות חיצוניות (פלאגינים)
- **Microsoft 365:** `@azure/identity`, `@azure/msal-node`, `@microsoft/microsoft-graph-client` — SSO (Entra ID), Outlook Calendar, Graph Mail.
- **Google:** `googleapis 171` — Google SSO, Google Calendar, Gmail API.
- **AI:** Gemini (פלאגין `mock.provider.js` בדב; production: Gemini — לא נמצא בפרובידר ייעודי בקוד, רק כתועד ב-spec).

### DevOps
- **Docker Compose** — שלושה קבצים: בסיס, dev, prod.
- **Azure App Service** (`infra/azure/appservice`) + **Terraform** (`infra/azure/terraform`).
- **GitHub Actions** (`.github/`) — quality gates, E2E ב-CI עם strict preflight.
- **Nginx** (`nginx/`) ככל הנראה כ-reverse proxy ב-prod.
- ב-Sprint 8 הייתה התנסות קצרה ב-**Railway** (commits eb7cd65, 3cb99fb), והוחלף ל-Azure ב-Sprint 10/Phase deployment (commit 0993ca4 — 2026-05-19).

### החלטות ארכיטקטוניות בולטות (מ-CLAUDE.md)
1. **Pluggable services דרך env**: `AI_PROVIDER`, `EMAIL_PROVIDER`, `STORAGE_PROVIDER`, `CALENDAR_PROVIDER`, `AUTH_PROVIDER` — Factory Pattern. אותו קוד עובד עם mock בדב ועם cloud providers בפרוד.
2. **Form schemas = JSON ב-DB** — לא טפסים hardcoded. ה-FormRenderer מרנדר טופס בזמן ריצה מ-JSON.
3. **Submission versions = JSON snapshots** — לכל גרסה snapshot מלא להשוואה (diff view).
4. **SLA = ימי עסקים בלבד** (ללא שבת + חגים מוגדרים).
5. **Users table תמיד קיים — גם עם SSO**. SSO = authentication. ה-DB שלנו = authorization. תפקיד תמיד נקבע אצלנו.
6. **Auth Provider hybrid:** `auth_provider` field ("local"/"microsoft"/"google"), `password_hash` nullable, מצב מעורב נתמך.
7. **AI = advisory only** — אף פעם לא חוסם / לא מחליט.
8. **Documents בשתי קטגוריות:** uploaded (חוקר) vs. generated (מערכת — immutable).
9. **Status workflow = DB-driven** מ-Sprint 12 ואילך — לא enum hardcoded, אלא טבלאות `statuses / transitions / permissions`.
10. **i18n קשיח:** אסור hardcode טקסט. הכל דרך `t('key')`.
11. **כללי קוד:** הכל באנגלית בקוד, JSDoc לכל פונקציה, מקסימום 30 שורות לפונקציה, אסור raw SQL.

### מבנה
- 16 טבלאות (לפי spec.md), 27 מסכים מתוכננים.
- 19 Prisma migrations בין 2026-03-29 ל-2026-06-01.

---

## 2.5 שלב האפיון והתכנון (לפני שורת קוד אחת)

זה השלב שפספסתי בגרסה הראשונה. בריפו יש שכבת תכנון מובנית שקדמה לקוד וליוותה אותו — היא הייתה כנראה ההבדל בין "פרויקט שמתחיל בקוד" לבין מה שיצא בפועל.

### האפיון המקדים — מסמכי Source of Truth

**`docs/spec.md` (124 שורות) — המפרט הקנוני**
נכתב לפני Sprint 1 וקובע מראש:
- 5 תפקידים עם הפעולות הבולטות של כל אחד
- **16 טבלאות DB** מסומנות לפי מודולים (Core 9 / Meetings 3 / Protocols 2 / Documents 1 / Notifications 1)
- **27 מסכים** מחולקים לפי תפקיד
- מודל סטטוסים מלא (10 סטטוסים) עם כל המעברים
- כללי SLA מספריים (3/14/30/5 ימים)
- **מטריצת Pluggable Services** — 5 שירותים × dev/prod options. החליטה מראש שכל אינטגרציה חיצונית תהיה swappable.
- מודל auth hybrid (local + SSO) — מתואר כטבלה עם 8 שדות והבדל בין standalone לבין SSO.
- מודל documents (uploaded vs. generated, מגבלות גודל, magic bytes).
- 18 סוגי אימיילים אוטומטיים מסווגים לפי trigger.

**`docs/work-breakdown.md` (660 שורות) — ה-WBS המלא**
פירוק אטומי של **~27 משימות-על** ב-6 ספרינטים, כאשר כל משימה מפורקת ל-checkboxes (לעיתים 10–20 פר משימה). העיקרון המנחה מצוטט בראש הקובץ:

> **"Preview-First Development — כל משימה מסתיימת בדבר שניתן לראות בדפדפן. לא מחכים לסוף הספרינט — כל יום יש משהו חדש לצפות בו."**

המסמך כולל גם **"Phase 2 — אינטגרציות (אחרי v1.0)"** עם 4 תתי-פאזות (Microsoft, Google, Cloud Storage, Advanced Documents) — כלומר התכנון של Sprint 7+8 היה כתוב **מהיום הראשון**.

**`docs/gantt.md` — לוח הזמנים המקורי**
- **22 שבועות מתוכננים** ל-v1.0 (6 ספרינטים), + Phase 2 של 6 שבועות נוספים.
- כל שבוע מתואר עם deliverable אחד צפוי.
- ההערכה: "Team: Claude Code + 1 developer".

**`docs/session-startup.md` — חוקים לכל סשן עם Claude Code**
מסמך של 26 שורות שמודבק בתחילת כל session. 7 כללים נוקשים:
1. **PLAN FIRST** — checkbox plan לפני שורת קוד אחת. אישור לפני שמתחילים.
2. JSDoc חובה, max 30 שורות לפונקציה, English code / Hebrew UI.
3. בדיקה ידנית / טסטים אחרי כל משימה.
4. עדכון `progress.md` + `sprint-log.md` אחרי כל משימה.
5. Feature branch per task, commit conventional (`feat:`/`fix:`/`docs:`).
6. `/compact` ב-50% context, `/clear` בין משימות לא קשורות.
7. `/review` לפני commit.

**`docs/spec.md` + `gantt.md` + `work-breakdown.md` + `session-startup.md` ביחד = "חוזה" שנכתב לפני שורת קוד.**

### השיטה — איך תכנון מתורגם לעבודה

מתוך `work-breakdown.md` שורות 7–15, השיטה היומית:
```
1. פתח session → הדבק session-startup.md
2. הקלד /sprint-plan → בחר משימה
3. Claude מציג plan → אתה מאשר
4. Claude כותב קוד → אתה צופה בתוצאה בדפדפן
5. /review → commit → update sprint-log
6. /compact ב-50% | /clear בין משימות לא קשורות
```
זה לא "וייב קודינג". זה תהליך מובנה: **תכנון → אישור → קוד → review → log**, חוזר על עצמו עשרות פעמים בכל ספרינט.

### Slash Commands שיוצרים את ה-flow
ארבע פקודות מותאמות אישית (`.claude/commands/`):
- **`/sprint-plan`** — קורא את `progress.md`, מציע את המשימה הבאה, **חוסם פיתוח UI לפני שיש אישור עיצוב**.
- **`/task-done`** — בדיקת איכות מהירה אחרי משימה בודדת (code review על קבצים שהשתנו + QA בסיסי).
- **`/review`** — סקירת הקוד לפני commit.
- **`/sprint-end`** — pipeline סוף-ספרינט מלא: Code Review → QA → Accessibility → Security → Merge. **כל ארבעת חייבים לעבור**.

### 10 Skills מתמחים שמופעלים בתכנון
מסמכי skill ב-`.claude/skills/` שמופעלים לפי קונטקסט:
- `ui-ux-designer` — **חובה לפני כל מסך חדש**: יוצר user flow + 3 אופציות עיצוב חיות ב-HTML. המשתמש בוחר אחת *לפני* שנכתב קוד. 14 קבצי `docs/designs/*.html` הם התוצרים.
- `prisma-schema`, `api-endpoint`, `react-component`, `pluggable-service`, `i18n-setup` — תבניות קוד.
- `code-review`, `qa-senior`, `accessibility-expert`, `security-audit` — סוקרים סדרתיים בסוף ספרינט.

### תכנון לפי ספרינט — לא רק בהתחלה

**Sprint-specific plans** כתובים בנפרד לכל ספרינט גדול:
- `docs/sprint-14-plan.md` (275 שורות) — דוגמה מתועדת: לפני Sprint 14 נכתב Implementation Plan מפורט הכולל:
  - Overview של היכולות
  - **7 Key Design Decisions מסומנים בצ'ק** (no reviewer signature, multi-answer types, track-nullable, conditional items, item snapshots, separated recommendation field)
  - סכמת DB מלאה (5 טבלאות חדשות) לפני שהמיגרציה נכתבה
  - חלוקה לפאזות
  - הסטטוס נרשם מראש: **"Ready to begin"**
- `MEMORY.md` של המשתמש (מחוץ לריפו אבל מתועד): "Sprint 13 — Researcher Questionnaire Plan — Approved implementation plan… Ready to execute on command" + "Sprint 14 — Reviewer Checklist Plan — Finalized plan… Ready after Sprint 13".

כלומר: **תכנון ספרינט גם הוא משימה — מאושר לפני שמתחילים לקודד.**

### ביקורת לפני שהספרינט מתחיל (Pre-Sprint Audit)
דפוס שחזר מ-Sprint 3 ואילך — לפני שספרינט חדש נפתח, מורצת ביקורת על תוצרי הספרינט הקודם:
- `docs/qa-report-sprint-3-pre.md`
- `docs/security-report-sprint-3-pre.md`
- `docs/accessibility-report-sprint-3-pre.md`

הבאגים נסגרים *לפני* שהקוד החדש נכתב. זה מסביר את ה-`fix:` הצפוף בתחילת כל ספרינט בלוג.

### אנטומיה של תכנון מסך
לקיחת מסך מ-spec בלבד ועד קוד:
1. **spec.md** מגדיר את המסך ברמת תפקיד + סטטוסים.
2. **work-breakdown.md** מפרק אותו לתתי-משימות עם Preview ספציפי.
3. **`ui-ux-designer` skill** מייצר 3 mockups חיים ב-HTML.
4. המשתמש בוחר אחד (תיעוד בקומיטים: *"עיצוב B נבחר"*, *"Design C נבחר: split-screen + Lev palette"*).
5. רק אז `/sprint-plan` מאשר התחלת קוד.
6. בסוף — `/sprint-end` מריץ 4 ביקורות סדרתיות.

### כמות וטריוויה
- **6 ספרינטים מתוכננים מראש** (Sprint 1–6) → **בפועל הגיע ל-14**. הספרינטים 7–14 לא היו מתוכננים בלוח המקורי, אבל Phase 2 (Microsoft + Google) **היה** בתכנון (work-breakdown.md סוף).
- **19 Prisma migrations** — כל מיגרציה מסומנת בקובץ נפרד עם timestamp. החלטות סכמה לא בוצעו ad-hoc אלא תועדו.
- **דוחות sprint-end** קיימים לכל ספרינט 1–13: 4 דוחות פר ספרינט (CR/QA/A11y/SEC) = ~52 דוחות איכות פורמליים.

### Trade-off שנעשה
לפי `gantt.md` שורה 71–73:
> "If a task takes 2x longer than planned → simplify scope, ship MVP version"
> "If context gets messy → /clear and restart fresh with plan"
> "If tests fail → fix before moving to next task (never skip)"

הוחלט מראש על אסטרטגיית token management ו-scope reduction — לא scope creep.

---

## 3. ציר הזמן של הפיתוח (מ-git log)

**סה"כ:** 157 commits, סופר אחד (`shmuel goldberg`), הראשון 2026-03-29, האחרון 2026-06-02. 14 ספרינטים מסומנים.

### Sprint 1 — Infrastructure (2026-03-29 → 2026-03-30) → tag v0.1.0
- `090e6c6` "initial project setup"
- `2515816` "S1.1 — Docker, Prisma schema (16 tables), seed data"
- `3f7f80f` Express + health endpoint
- `1451673` validate/error/audit middleware
- `72a5c82` rate limiting
- `44f60da` JWT + RBAC
- `0a64ab3` forgot/reset password + console email provider

### Sprint 2 — Dynamic Forms (2026-04-09) → v0.2.0
- `522c329` "Sprint 2 — Dynamic Forms (v0.2.0)" — Form Builder עם dnd-kit, FormRenderer, Submissions CRUD.

### "תקופת הקאוס" של תחילת אפריל (2026-04-12)
לפני שהתייצב התהליך, רצף קומיטים קצרים: `login`, `login`, `login`, `dokerfile`, `update docerfilse`, `run apk`, `test`, `e`, `e`. סה"כ ~15 קומיטים שמראים מאבק בלוגין/Dockerfile/bcrypt. נסגר ב-`67ff6d5` "switch to bcryptjs with updated lockfile" + `9ad5955` cleanup.

### Sprint 3 — Review Workflow (2026-04-13) → v0.3.0
- `f85e138` Sprint 3 — Secretary/Reviewer/Chairman workflow + Notifications.
- `8b10257` תיקוני pipeline: XSS בהערות, JSON syntax, חיפוש, a11y, nodemailer CVE.

### Sprint 4 — SLA + Documents + AI (2026-04-13/14) → v0.4.0
- `d132552` Researcher Dashboard + Status Page (Design C)
- `443b945` SLA Engine — ימי עסקים, cron חצות, התראות
- `8324058` Document Upload
- `6791efb` PDF Approval Letter (pdfkit)
- `b9019ba` AI Mock Integration

### Sprint 5 — Secretary Dashboard + Meetings + Admin + Impersonation (2026-04-13/14) → v0.5.0
- `74ff299` + `46e3f96` sprint5
- `6919780` תיקוני QA: field-name + AppError bugs

### Sprint 6 — Protocols + Statistics + Settings (2026-04-14/15) → v1.0.0
- `6d1d375` Backend: protocols, reports, settings, protocol PDF
- `0d06e0c` + `139eaa1` + `1b06766` "sprint6 phase7 — sprint-end pipeline + v1.0.0"
- `1836940` "mark v1.0.0 released"

### Sprint 7 — Microsoft Integration (2026-04-16) → v0.7.0
- `1ed1889` "Sprint 7 — Microsoft integration (email, calendar, SSO)"
- Mail דרך Graph, Outlook Calendar sync, MSAL SSO + `SsoCallbackPage`, cookie-parser.

### Sprint 8 — Google Integration (2026-04-16) → v0.8.0
- `07f38b0` "Sprint 8 — Google integration (Calendar, Gmail, SSO)"
- `2f4990f` "mettBUG" (commit message חריג — תיקון אד-הוק).

### "ספרינט באגים" אחרי Sprint 8 (2026-04-19/20)
רצף ארוך של תיקונים על HE/PDF/CORS:
- `eb7cd65` + `3cb99fb` CORS configuration ל-Railway
- `fa9bf3a` JWT persist ב-sessionStorage
- `669ba77` "replace PDFKit with Puppeteer for proper Hebrew RTL approval letters" — **שינוי כיוון משמעותי, ראה סעיף 5**.
- שורת תיקונים מצטברת ב-`5782173` "Merge fix/researcher-submit-pdf-hebrew: Sprint 8 QA bug fixes"
- `a69c991` "field-sharing bug in SubmitPage — use f.id || f.key everywhere"

### Sprint 9 — Stabilization (2026-04-21) → playwright + CI quality gate
- `f6cde9a` "deliver sprint 9 stabilization and quality automation"
- `e2d7784` + `f41d8e6` finalize production readiness

### Sprint 10 — Ops Hardening (2026-04-21) → Calendar V2, Diff V2, drills
- `ce48270` "complete sprint 10 ops hardening and product upgrades"
- runbooks + measured RTO/RPO (`docs/ops/drills/`).

### Sprint 11 — UI E2E Expansion (2026-04-21/22)
- `fd2e2d9` "expand sprint 11 UI E2E coverage and CI hardening"
- `8664dd5` strict E2E preflight ב-CI.

### Sprint 12 — Dynamic Status Management (2026-04-22)
- `5a48144` "migrate submissions to DB-driven status workflow" — refactor גדול: סטטוסים יוצאים מ-enum ועוברים לטבלאות `statuses / transitions / permissions`.
- `c52d592` + `7ebd486` SSO exchange codes, user calendar sync, role guards.

### Sprint 13 — System Templates (Questionnaire Preface) (2026-04-28) → v0.13.0
- `9478576` "System Templates feature"
- `86a68fb` "researcher questionnaire, instructions editor, form duplication"

### Sprint 14 — Reviewer Checklist (2026-04-28/29)
- `89779b6` Phase 1 backend
- `568ee88` Admin checklist templates UI + API client
- `dcbf811` "finalize reviewer checklist workflow and stabilization"
- ואחריו רצף תיקונים על מבנה ה-checklist, COI selectors, accessibility statement editor.

### השלב האחרון — Production + Branding (2026-05-03 → 2026-06-02)
- `e6dc928` (2026-05-05) shared timeline + export hardening
- `eb2d857` + `f0485e3` (2026-05-10) PDF — unify RTL-safe rendering, one-page approval, chairman details, bilingual protocol
- `0993ca4` (2026-05-19) **Azure App Service deployment infrastructure for JCT**
- `ebb3025` (2026-05-31) Lev branding alignment
- `a6633f3` (2026-05-31) **REBRAND: "EthicFlow" → "Ethic-Net"** — שם הפלטפורמה שונה.
- `b1bc8e0` + `1dd99c0` (2026-05-31) email normalization ל-Microsoft SSO (acad → jct)
- `5cc3df4` (2026-05-31) enforce canonical ethics-net domain
- `7e21665` + `0d66b57` (2026-05-31) PDF approval preview in-app
- `ad52413` (2026-06-01) **dynamic per-field reviewer review** מחליף checklist סטטי — refactor פונקציונלי גדול.
- `c03fd82` + `8b50685` (2026-06-01/02) תיעוד תקלת Microsoft SSO AADSTS50011 בפרודקשן.

---

## 4. תקלות, באגים והתמודדויות

> 65+ commits של `fix(...)`. להלן הבולטים, לפי תחום:

### תקלת פרודקשן מתועדת — Microsoft SSO AADSTS50011 (2026-06-02)
**מקור:** `docs/ops/incident-2026-06-02-microsoft-sso-redirect-uri-he.md` + commit `8b50685`.
- **סימפטום:** התחברות Microsoft נכשלת — "redirect URI mismatch".
- **שורש:** ה-backend גוזר את ה-redirect URI דינמית מתוך host של הבקשה (`resolveMicrosoftCallbackUrl`). עד לאחרונה ה-API הוגש דרך `app-ethics-net-api.azurewebsites.net` — שהיה רשום ב-App Registration. אחרי חיבור דומיין מותאם `ethics-net-api.jct.ac.il` — ה-URI החדש לא היה רשום.
- **תיקון:** הוספת ה-URI הקנוני ל-App Registration.

### אפוס ה-PDF העברי (סיפור מתמשך, אפריל 2026)
שרשרת קומיטים שמראה מאבק של שבועיים עם RTL בעברית ב-PDF:
- `6791efb` PDFKit raw — לא מספיק עברית.
- `669ba77` (2026-04-20) **"replace PDFKit with Puppeteer for proper Hebrew RTL approval letters"** — מעבר ל-Puppeteer.
- `ca863d3` enhance Puppeteer-based generation.
- `c412116` "remove --disable-gpu on non-Linux to restore Hebrew RTL rendering"
- `854a1e8` "rewrite Hebrew approval letter HTML for correct RTL"
- `96767de` "embed Arial fonts, use 14pt body, bold headings, RTL/LTR isolation, iOS download"
- `1690844` "Align approval letter PDF with design spec A (HE/EN)"
- `6417c99` align fallback (PDFKit) with design A — שמרו על PDFKit כ-fallback.
- `8bd0e60` + `f41d8e6` harden fallback font handling.
- `88aa321` "Hebrew RTL reliability for approval letters and preview."
- `eb2d857` (2026-05-10) "unify rtl-safe rendering and one-page approval output"

**הלקח (מהקומיטים):** rendering של עברית RTL ב-PDF מנוע אחד (PDFKit) לא הספיק — נדרש headless browser (Puppeteer) + fallback + טיפול ב-iOS + טיפול ב-fonts מוטמעים.

### Sprint 8 — מערבולת ה-CORS/Hosting
- `eb7cd65` ניסיון ראשון: "CORS configuration for Railway deployment".
- `3cb99fb` תיקון שני באותו היום: "simplify CORS configuration with array of allowed origins".
- בהמשך — מעבר מ-Railway ל-Azure (`0993ca4`).

### באגי "submission flow" (2026-04-20)
- `a69c991` field-sharing bug: שדות בטופס שהיו "מקושרים" אחד לשני (כפילות key) — תוקן ע"י `f.id || f.key`.
- `33cd4a9` "form fields linked together issue".
- `7b11c7a` "handle object-type options in FormRenderer select/radio/checkbox".
- `9c88536` (2026-04-28) "normalize schema fields to prevent new submission white screen".

### Authentication
- `67ff6d5` switch bcrypt → bcryptjs (תאימות Docker).
- `fa9bf3a` JWT persist ב-sessionStorage (cross-navigation).
- `b1bc8e0` + `1dd99c0` email normalization ל-Microsoft SSO — חשבונות `@acad.jct.ac.il` נדרשו לדאר ל-`@jct.ac.il`.
- `6cd9c75` correct Microsoft auth URL.
- `adb340c` handle oauth redirect failures gracefully.

### Mobile / Responsive
- `f3deca6` + `4e25b1f` + `066a8ec` + `d234b3c` + `c508318` — שרשרת של 5 תיקוני sidebar drawer ב-mobile (כיווניות RTL/LTR, Escape, מהימנות הסגירה).

### Data integrity / Sprint pipelines
- `8b10257` Sprint 3 pipeline: XSS בהערות, JSON syntax, search, accessibility, nodemailer CVE.
- `6919780` Sprint 4: "correct field-name and AppError bugs found in QA".
- `395854a` Sprint 5 pipeline QA/A11y/Security fixes.

### תקלות תקופתיות ב-CI
- `60e57db` "skip E2E gracefully when role secrets are not configured"
- `8664dd5` "enforce strict E2E secret preflight in quality gates" (כיוון הפוך — לאכוף שיהיו secrets).
- `d675f41` "ignore .claude/ in gitleaks scan (tool allowlist placeholders, not secrets)" — false positive של סורק סודות.

### Commits חריגים (אינדיקציה שהיו רגעי דחק)
- `2f4990f` "mettBUG"
- `e8d0af2` "e", `6cd7c11` "e", `e568a66` "test", `ffb81b7` "up" — רצף 2026-04-12.

---

## 5. החלטות טכניות מעניינות

### 1. Pluggable architecture כעמוד שדרה
מ-יום 1 — `docs/spec.md` קובע מטריצה של 5 שירותים שעוברים swap דרך env. גם בדב הוחלט להריץ providers ייעודיים (`console` ל-email, `mock` ל-AI, `local` ל-storage, `internal` ל-calendar) במקום stubs — כך שאותו factory pattern עובד עד פרוד.

### 2. JSON-driven form engine
החלטה לא לכתוב טפסים בקוד אלא לאחסן אותם כסכמות JSON ב-DB ולרנדר בזמן ריצה. זה אפשר את Sprint 13 (Form duplication, Instructions editor) כתוספת קלה במקום refactor.

### 3. PDFKit → Puppeteer → Hybrid (סעיף 4 לעיל)
הניסיון להריץ PDFKit "טהור" לעברית RTL נכשל; השינוי ל-Puppeteer יקר יותר במשאבים אבל פתר את הבעיה. ה-fallback ל-PDFKit נשמר עבור סביבות בלי headless Chrome.

### 4. Status workflow: enum → DB-driven (Sprint 12, commit `5a48144`)
שינוי כיוון משמעותי באמצע הדרך. במקום סטטוסים hardcoded ב-enum של Prisma, הוקמו טבלאות `SubmissionStatus`, `StatusTransition`, `StatusPermission`. עלות: refactor של SLA, notifications, document, frontend. תועלת: ה-admin יכול לערוך flow בלי deploy.

### 5. Reviewer Checklist → Per-Field Review (sprint 14 → אחרי)
- Sprint 14 בנה checklist דינמי (`89779b6` → `dcbf811`).
- חודש אחר כך, commit `ad52413` (2026-06-01): "replace static checklist with dynamic field-based review" — כיוון נוסף.

### 6. Lev/JCT branding כ-step נפרד מהפיתוח
`a6633f3` (rebrand EthicFlow→Ethic-Net) ו-`ebb3025` (Lev identity branding) מאוחרים, ב-2026-05-31 — אחרי שכל הפיצ'רים מוכנים. השם פותח תחת "EthicFlow" ושונה לפני go-live ל-JCT.

### 7. Multi-role flows + COI
`6b51ba6` "enable multi-role flows with conflict enforcement" + `d838d04` "allow chairman to act as reviewer" + מודולי COI ייעודיים — הכרה שאדם אחד יכול ללבוש כובעים שונים בועדה, עם enforcement של ניגוד עניינים.

### 8. Sprint-end pipeline כשיטה
שיטת עבודה מתועדת ב-CLAUDE.md ובהיסטוריה: כל ספרינט נסגר עם 4 ביקורות סדרתיות — Code Review → QA → Accessibility → Security. ראיות: `docs/code-review-sprint-*.md`, `docs/qa-report-sprint-*.md`, `docs/accessibility-report-sprint-*.md`, `docs/security-report-sprint-*.md` קיימים לכל ספרינט מ-1 עד 13. (איכותית: למה בחר בשיטה הזו — **לא תועד בריפו**.)

### 9. Mobile-first + IS 5568 כדרישה ולא ייעוץ
`CLAUDE.md` מצריך touch targets ≥44px, בדיקה ב-375/768/1280, ועמידה ב-WCAG 2.2 AA + תקן 5568 הישראלי. דוחות a11y קיימים לכל ספרינט.

### 10. בחירת DB ו-ORM
PostgreSQL + Prisma. Prisma migrations שמורים ולא ידניים (19 migrations). חוק קשיח ב-CLAUDE.md: "Prisma for ALL DB access — never raw SQL".

---

## 6. תרשימי זרימת מידע

### `docs/ethicflow-architecture-diagrams.html` — 6 תרשימים
מקור: `<title>Ethic-Net — תרשימי ארכיטקטורה</title>`
1. **ארכיטקטורת תשתית כוללת**
2. **תהליך CI/CD — מקוד לפרודקשן**
3. **אינטגרציות עם Microsoft 365 הארגוני**
4. **מסלול משתמש — מהגשה ועד אישור**
5. **שכבות אבטחה — Defense in Depth**
6. **מסלול Request — רגע אחד בחיי המערכת**

### `docs/designs/*.html` — 14 קבצי עיצוב (mockups חיים)
- `login-layout-design.html` + `login-lev-preview.html` — מסך כניסה
- `form-builder-design.html` + `form-builder-lev-design.html` — בונה הטפסים
- `form-library-design.html` — ספריית הטפסים
- `researcher-dashboard-design.html` — דשבורד חוקר (3 אופציות, נבחר Design C)
- `researcher-submit-design.html` — מסך הגשה (Option B — Navy header + summary sidebar)
- `meetings-calendar-design.html` — לוח שנה ישיבות
- `protocol-system-design.html` — פרוטוקולים
- `reviewer-checklist-design.html` — checklist סוקר
- `reviewer-diff-design.html` — תצוגת diff בין גרסאות
- `stats-reports-design.html` — דשבורד סטטיסטיקות (Option B + Lev palette)
- `status-management-design.html` — ניהול סטטוסים דינמי
- `approval-letter-design-A.html` — מכתב אישור (Design A — Spec הסופי ל-PDF)

### דיאגרמות נוספות שהוזכרו ב-README אבל לא בריפו
ה-README מצביע על `reference-docs/01-diagrams.html` עם 8 דיאגרמות (workflow, ERD, architecture) — **התיקייה הזו לא בריפו** (מסומנת כ"NOT in Git").

### תיאור זרימה טקסטואלי קיים
`docs/spec.md` מתאר במפורש:
- זרימת submission statuses: `DRAFT → SUBMITTED → IN_TRIAGE → ASSIGNED → IN_REVIEW → PENDING_REVISION → APPROVED/REJECTED/WITHDRAWN/CONTINUED`.
- זרימת login עם SSO (5 שלבים).
- זרימת aprovr cycle של SLA.

---

## 7. שימוש ב-AI בתהליך הפיתוח עצמו

### כלים שזוהו
1. **Claude Code (Anthropic)** — שימוש מרכזי ומתועד:
   - `CLAUDE.md` ייעודי בשורש הריפו עם הוראות מפורטות.
   - תיקיית `.claude/` עם 10 skills (`prisma-schema`, `api-endpoint`, `react-component`, `pluggable-service`, `i18n-setup`, `code-review`, `qa-senior`, `security-audit`, `accessibility-expert`, `ui-ux-designer`).
   - 4 slash commands: `/sprint-plan`, `/task-done`, `/review`, `/sprint-end`.
   - 31 commits שמזכירים "Claude" בגוף ההודעה.
   - `Co-Authored-By: Claude Opus 4.7 / Sonnet 4.6 / Haiku 4.5 <noreply@anthropic.com>` בקומיטים של אפריל-יוני.
   - `27ad142` "persist local agent settings" — שימור הגדרות agent.
2. **Cursor** — 21 commits עם `Co-authored-by: Cursor <cursoragent@cursor.com>`.
3. **תיקיית `.cursor/`** קיימת בשורש (תאריך 2026-05-25).

### תרומה ניכרת לתהליך (לפי ראיות בקוד)
- **שיטת sprint-end הסדרתית** (Code Review → QA → A11y → Security) נשענת ישירות על ה-skills של Claude Code. דוחות תקופתיים אוטומטיים מ-Sprint 1 ועד 13.
- **UI/UX ב-3 אופציות לכל מסך** — חובה שיטתית ב-CLAUDE.md: skill `ui-ux-designer` יוצר 3 prototypes חיים ב-HTML והמשתמש בוחר אחד לפני שנכתב קוד (14 קבצים ב-`docs/designs/`).
- **Pre-Sprint audits** — `docs/qa-report-sprint-3-pre.md`, `docs/security-report-sprint-3-pre.md`, `docs/accessibility-report-sprint-3-pre.md` — סבב QA/SEC/A11y לפני שספרינט מתחיל.
- **תיעוד מובנה אוטומטי** — דוחות release לכל ספרינט (`sprint-N-release-report.md`), `sprint-log.md` ו-`progress.md` מתועדים בזמן אמת.
- **זיכרון של פרויקט** מתוך `MEMORY.md` של המשתמש — תוכניות Sprint 13 ו-14 הוכנו מראש ככניסות זיכרון לפני שהקוד נכתב.

### חיסכון הזמן הספציפי / מה הפתיע
**לא תועד בריפו** — אין retro פנימי שמכמת חיסכון או מתאר חוויית עבודה עם הסוכן.

---

## 8. סטטוס נוכחי וצעדים הבאים

### מה עובד היום (לפי `progress.md` + git tags)
- **גרסאות תויגו:** v0.1.0 (Sprint 1) → v1.0.0 (Sprint 6) → v0.13.0 (Sprint 13).
- **14 ספרינטים סגורים**, האחרון: Sprint 14 — Reviewer Checklist.
- **בפרודקשן ב-JCT:** Azure App Service + דומיין `ethics-net-api.jct.ac.il`. הוטמע מאז 2026-05-19. תקלת SSO האחרונה נפתרה ב-2026-06-02.
- **Sprint 14 כולל KPI חדש:** `progress.md` מציין "Reports KPI — checklist analytics" מוכן.

### מה בבדיקה / שינוי כיוון אחרון
- **Per-Field Review (`ad52413`, 2026-06-01):** מחליף את ה-checklist הסטטי של Sprint 14 בסקירה דינמית לפי שדה. נראה כצעד בעקבות פידבק שימוש.
- `docs/post-launch-deferred-items.md` ו-`docs/post-launch-operations-checklist.md` מצביעים על אייטמים שנדחו לאחרי השקה — תוכן ספציפי **לא נסקר במסמך הזה**.

### Pipeline & הפצה
- E2E ב-Playwright פעיל ב-CI עם strict preflight על secrets של תפקידים.
- Drills תקופתיים: rollback (`sprint-10-runtime-rollback-drill.md`) ו-backup/restore (`sprint-10-backup-restore-drill.md`) עם RTO/RPO מדודים.

### מתוכנן (מתועד)
- **Sprint 14** עדיין פתוח לפי `sprint-log.md` (Reviewer Checklist Dynamic) — Phase 4 לא מצוין כסגור.
- **תוכניות הבאות**: לא ראיתי מסמך Sprint 15 או roadmap קדימה. **לא תועד בריפו.**

---

## פערים למילוי ידני

(שאלות שעלו מהריפו אבל התשובה לא נמצאת בו — צריך לענות עליהן לפני שכותבים פוסט.)

1. **למה התחלת את הפרויקט?** מה היה הטריגר הספציפי — בקשה של ועדת אתיקה ב-JCT, פרויקט גמר, התלהבות אישית, או יוזמה עסקית?
2. **איך עבד התהליך "לפני"?** דוגמה ספציפית: כמה זמן לקח למזכירה לטפל בבקשה, איפה נשמרו פרוטוקולים, מה השתבש הכי הרבה?
3. **למה דווקא אתיקה מחקרית?** למה לא נושא אחר?
4. **למה לבד?** כל 157 הקומיטים שלך — האם זו הייתה החלטה, או שמתישהו ניסית לצרף עוד אנשים?
5. **רגע התסכול הכי גדול:** מה זה היה? (תועדו רמזים: PDF עברי, CORS ב-Railway, login של ה-12 לאפריל, AADSTS50011 ב-prod — אבל מה *הרגיש* הכי גרוע?)
6. **רגע ה"וואו":** הפעם הראשונה שמישהו אמיתי השתמש במערכת ועבד? איך זה היה?
7. **מה הכי הפתיע בעבודה עם Claude Code / Cursor?** האם הם עשו משהו טוב יותר ממה שציפית? פחות טוב? איפה הייתם רוצים להחליף אותם?
8. **שיטת sprint-end (Code Review → QA → A11y → Security) — מאיפה הגיעה?** למה דווקא הסדר הזה? היא חסכה זמן או הוסיפה זמן?
9. **שיטת 3 אופציות עיצוב לפני קוד — האם פעם בחרת A, אחר כך גילית שהיא לא עובדת ועברת ל-B?**
10. **למה Azure ולא Railway?** רמז ב-git: Railway היה ניסיון אפריל, Azure נכנס במאי. מה דחף את המעבר?
11. **EthicFlow → Ethic-Net — מי דרש את השינוי? איך הרגיש?**
12. **JCT כלקוח ראשון — איך זה קרה? מה הם דרשו ספציפית שעיצב את הפרויקט?** (יש רמזים: SSO ל-Entra, דומיין `ethics-net-api.jct.ac.il`, normalization `acad.jct.ac.il → jct.ac.il`.)
13. **מספר המשתמשים בפועל בפרודקשן היום:** כמה חוקרים? כמה הגשות בחודש?
14. **רגע שגררת הלילה אחורה (revert / hotfix דחוף):** היה כזה? לא מצאתי revert formali ב-git log.
15. **המחיר/מודל עסקי:** האם זה SaaS שאתה מוכר? פתוח? פנים-JCT? לא תועד.
16. **מה הלאה?** איזה fearure הבא הכי מסקרן אותך לבנות?
17. **שלב האפיון — כמה זמן ארך?** ה-`spec.md` + `work-breakdown.md` + `gantt.md` נכתבו לפני commit `090e6c6` (2026-03-29). כמה ימים/שבועות זה לקח? איך נראה היום-יום באפיון (האם זה היה איתך מול דף לבן, עם Claude כתסריטאי, מול לקוח, או שילוב)?
18. **התכנון מול המציאות — מה השתנה?** התכנון המקורי דיבר על 6 ספרינטים, 22 שבועות, v1.0 בסוף. בפועל יצאו 14 ספרינטים ושינוי שם בסוף. מה הספרינטים שלא תכננת מראש (7–14) — נולדו כי הלקוח (JCT) דרש, כי גילית פערים, או כי המוצר התרחב מעצמו?
19. **שיטת "3 אופציות עיצוב לפני קוד" — האם זו הייתה החלטה אישית או הצעה של Claude?** ומה היחס בין הזמן שהושקע בעיצובים שלא נבחרו לתועלת בסוף?
20. **שיטת Pre-Sprint Audit (תיקון באגים מספרינט קודם לפני שמתחילים חדש) — איך הגעת אליה?** האם זה בא אחרי שספרינט "התקלקל" באמצע, או שהיה שם מהיום הראשון?
