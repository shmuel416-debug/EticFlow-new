# דוח Sprint 11 — הרחבת UI E2E

תאריך סגירה: 2026-04-21  
סטטוס: הושלם (עם סגירת פערי אימות מותני-סודות)

## מטרות הספרינט
- הרחבת בדיקות E2E מתרחישי API-centric לזרימות UI מלאות (Browser-based).
- בניית תשתית fixtures/helpers יציבה ומודולרית ל-Playwright.
- הקשחת CI עם artifacts מלאים (HTML/JUnit/trace/video/screenshot).
- יצירת בסיס triage לפלייקים ודו"ח תפעולי מלווה.

## תוצרים מרכזיים

### 1) מטריצת כיסוי וסידור סוויטות
- פורסמה מטריצת כיסוי: `docs/e2e-ui-coverage-matrix-sprint-11-hebrew.md`.
- תיקיית `frontend/e2e` אורגנה לפי תחומים:
  - `auth`, `researcher`, `secretary`, `reviewer`, `meetings`, `rbac`, `i18n`, `support`.
- נוצרו helpers/fixtures משותפים:
  - `frontend/e2e/support/fixtures.js`
  - `frontend/e2e/support/api-helpers.js`
  - `frontend/e2e/support/ui-helpers.js`
  - `frontend/e2e/support/credentials.js`

### 2) הרחבת כיסוי UI E2E
- נוספו תרחישים חדשים:
  - `frontend/e2e/auth/login-ui.spec.js`
  - `frontend/e2e/researcher/submission-flow.spec.js`
  - `frontend/e2e/secretary/review-workflow.spec.js`
  - `frontend/e2e/reviewer/review-diff-ui.spec.js`
  - `frontend/e2e/meetings/calendar-and-list.spec.js`
  - `frontend/e2e/rbac/rbac-negative-ui.spec.js`
  - `frontend/e2e/i18n/i18n-rtl-smoke.spec.js`
- הוסר התרחיש הישן API-only:
  - `frontend/e2e/core-flows.spec.js`

### 3) יציבות selectors במסכים קריטיים
- הוספו/יוצבו `data-testid` במסכים ורכיבי ליבה:
  - התחברות: `frontend/src/pages/LoginPage.jsx`
  - טופס דינמי: `frontend/src/components/formRenderer/FormRenderer.jsx`
  - Submit flow: `frontend/src/pages/researcher/SubmitPage.jsx`
  - Meetings list/calendar: `frontend/src/pages/meetings/MeetingsPage.jsx`, `frontend/src/pages/meetings/MeetingsCalendarPage.jsx`
  - Reviewer diff/review: `frontend/src/pages/reviewer/ReviewDiffPage.jsx`, `frontend/src/components/submissions/ReviewForm.jsx`
  - Secretary/Chairman workflow: `frontend/src/components/submissions/ReviewerSelect.jsx`, `frontend/src/components/submissions/StatusTransitionPanel.jsx`, `frontend/src/pages/secretary/SubmissionsListPage.jsx`, `frontend/src/pages/secretary/SubmissionDetailPage.jsx`, `frontend/src/pages/chairman/ChairmanQueuePage.jsx`, `frontend/src/pages/chairman/SubmissionDecisionPage.jsx`, `frontend/src/pages/reviewer/ReviewDetailPage.jsx`

### 4) הקשחת CI וארטיפקטים
- Playwright config הורחב:
  - `outputDir=test-results`
  - `retries` ו-`workers` מותאמי CI
  - `trace/video/screenshot` on failure
  - `junit` reporter
  - `webServer` להרצת frontend מקומי בתהליך ה-E2E
- עדכון workflow:
  - `frontend/package.json` — script חדש: `e2e:ci`
  - `.github/workflows/quality-gates.yml` — שימוש ב-`e2e:ci`, הוספת `E2E_API_URL`, והעלאת `test-results` artifact נוסף
- עדכון lint ignores ל-artifacts:
  - `frontend/eslint.config.js` (ignore `playwright-report`, `test-results`)

## תוצאות הרצות

### איכות קוד
- `frontend npm run lint` — PASS

### E2E — ריצה מלאה מקומית
- `npm run e2e` — PASS ברמת pipeline מקומית עם guardים:
  - 2 passed
  - 13 skipped (עקב היעדר credentials מקומיים עבור role-based flows)

### E2E — Stability baseline (repeat-each)
- `npx playwright test ... --repeat-each=3 --workers=1` על smoke tests ללא תלות credentials:
  - 6 passed / 0 failed

## החלטת Go/No-Go פנימית (לספרינט הבא)
- **GO מותנה**:
  1. ריצת CI מלאה עם כל `E2E_*` secrets זמינים.
  2. אישור שכל role-based UI flows אינם skipped ב-CI (כלומר credentials מוזנים).
  3. מעבר מלא של `e2e:ci` עם artifacts תקינים.

## פערים פתוחים וסיכונים
- בסביבה מקומית ללא secrets לא ניתן לאמת end-to-end מלא לכל התפקידים.
- זרימות cross-role מסומנות `skip` כאשר credentials חסרים (התנהגות מכוונת למניעת false failures).

## המלצות Sprint 12
1. להוסיף nightly CI run ייעודי ל-E2E עם trend pass-rate שבועי.
2. להוסיף alerting אוטומטי על עליה ב-flaky retries.
3. להרחיב smoke i18n למסכים נוספים מעבר ל-login/calendar/diff.

## עדכון סגירה תפעולית — 2026-04-22
- בוצעה ריצת `npm run e2e:ci` מקומית:
  - 2 עברו, 13 דולגו (credential-dependent role flows).
- כדי למנוע מצב CI "ירוק חלקי" עם skips שקטים, נוסף preflight קשיח:
  - קובץ חדש: `frontend/scripts/verify-e2e-env.mjs`
  - סקריפט חדש: `frontend/package.json` → `e2e:ci:strict`
  - workflow עודכן: `.github/workflows/quality-gates.yml` מריץ `npm run e2e:ci:strict`
- תוצאה תפעולית: ב-CI, כל חוסר ב-`E2E_RESEARCHER_*`, `E2E_SECRETARY_*`, `E2E_REVIEWER_*`, `E2E_CHAIRMAN_*`, `E2E_ADMIN_*` יכשיל את ה-job מיידית לפני Playwright.
