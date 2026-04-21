# מטריצת כיסוי UI E2E — Sprint 11

תאריך: 2026-04-21  
סטטוס: Draft לביצוע ספרינט (יעודכן ל-Final בסגירת ספרינט)

## מטרה
למפות את כל הזרימות הקריטיות למערכת EthicFlow, לפי תפקידים, לרמת בדיקות UI מקצה לקצה (Browser-based) עם Playwright.

## היקף תפקידים
- RESEARCHER
- SECRETARY
- REVIEWER
- CHAIRMAN
- ADMIN

## מטריצת כיסוי
| מזהה | תפקיד | זרימה עסקית | מסכים עיקריים | סוג בדיקה | עדיפות |
|---|---|---|---|---|---|
| UI-AUTH-01 | כל התפקידים | Login + נחיתה למסך מוגן | `/login`, `/dashboard` | חיובית | P0 |
| UI-AUTH-02 | כל התפקידים | שגיאת התחברות קרדנצ'לים | `/login` | שלילית | P1 |
| UI-RSH-01 | RESEARCHER | יצירה והגשה של submission | `/submissions/new` | חיובית | P0 |
| UI-RSH-02 | RESEARCHER | שמירת Draft + עדכון | `/submissions/new`, `/submissions/:id/edit` | חיובית | P1 |
| UI-SEC-01 | SECRETARY | מעבר ל-IN_TRIAGE והקצאת Reviewer | `/secretary/submissions`, `/secretary/submissions/:id` | חיובית | P0 |
| UI-REV-01 | REVIEWER | צפייה בהקצאות והגשת review | `/reviewer/assignments`, `/reviewer/assignments/:id` | חיובית | P0 |
| UI-REV-02 | REVIEWER | Diff V2 — סינון/קיבוץ/חיפוש | `/reviewer/assignments/:id/diff` | חיובית | P0 |
| UI-CHR-01 | CHAIRMAN | החלטה סופית (Approve/Reject/Revision) | `/chairman/queue`, `/chairman/queue/:id` | חיובית | P0 |
| UI-MTG-01 | SECRETARY | יצירת meeting חדש ממסך רשימה | `/meetings` | חיובית | P1 |
| UI-MTG-02 | SECRETARY/CHAIRMAN/ADMIN | Calendar V2 — filters/day drill-down | `/meetings/calendar` | חיובית | P0 |
| UI-RBAC-01 | RESEARCHER | חסימת גישה למסכי Admin/Reports/Meetings | direct routes | שלילית | P0 |
| UI-RBAC-02 | REVIEWER | חסימת גישה למסכי Secretary/Admin | direct routes | שלילית | P0 |
| UI-RBAC-03 | CHAIRMAN | חסימת גישה למסכי Admin בלבד | direct routes | שלילית | P1 |
| UI-I18N-01 | תפקידי מפתח | החלפת he/en וכיווניות RTL/LTR | `/login`, `/meetings/calendar`, `/reviewer/.../diff` | smoke | P1 |

## מיפוי ל-Suites מתוכננות
- `e2e/auth/login-ui.spec.js` → UI-AUTH-01, UI-AUTH-02
- `e2e/researcher/submission-flow.spec.js` → UI-RSH-01, UI-RSH-02
- `e2e/secretary/review-workflow.spec.js` → UI-SEC-01
- `e2e/reviewer/review-and-diff.spec.js` → UI-REV-01, UI-REV-02
- `e2e/chairman/decision-flow.spec.js` → UI-CHR-01
- `e2e/meetings/calendar-and-list.spec.js` → UI-MTG-01, UI-MTG-02
- `e2e/rbac/rbac-negative-ui.spec.js` → UI-RBAC-01, UI-RBAC-02, UI-RBAC-03
- `e2e/i18n/i18n-rtl-smoke.spec.js` → UI-I18N-01

## הערות יציבות (Anti-Flaky)
- כל זיהוי רכיבים יתבסס קודם על `data-testid`, ורק אחר כך על role/text.
- אין שימוש ב-`waitForTimeout` קשיח בזרימות ליבה.
- כל תרחיש עצמאי עם יצירת נתונים ייחודית (`Date.now()`), ללא תלות בסדר ריצות.
- ריצות CI ישמרו `html report`, `trace`, ו-`video` בכשל.
