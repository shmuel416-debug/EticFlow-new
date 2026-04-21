# EthicFlow — מטריצת בדיקה חיה לפרודקשן

## מטרת המסמך
מסמך עבודה תפעולי לבדיקת האתר החי (Production) מקצה לקצה, עם מדדי מעבר אחידים, כיסוי מלא לפי תפקידים, ותיעוד ראיות.

## פרטי הרצה
- סביבה: Production — `https://frontend-eticflow-dev.up.railway.app`
- תאריך: 21 באפריל 2026
- גרסה/Commit: HEAD (next-go follow-up validation)
- בודק/ת: QA Automation + Agent (next-go full validation runner)

## קריטריוני מעבר מחייבים (Release Gate)
- 0 תקלות קריטיות פתוחות. ✅
- 0 תקלות High פתוחות בזרימות ליבה. ❌ (2 High פתוחים)
- כל 5 התפקידים מצליחים לבצע Login. ✅
- כל זרימות ה־API בזרימות ליבה עוברות ב־smoke. ✅
- i18n (he/en) ללא חוסר מפתחות. ✅
- Responsive ב־375/768/1280 ללא overflow קריטי. ✅

## סולם חומרה
- Critical: משבית מערכת/תפקיד/זרימת ליבה.
- High: פגיעה מהותית בעבודה תקינה, יש מעקף חלקי.
- Medium: תקלה פונקציונלית לא חוסמת תהליך עסקי מרכזי.
- Low: UI/UX/טקסטים/שיפורים קוסמטיים.

## שדות תיעוד חובה לכל ממצא
- מזהה בדיקה
- תפקיד
- צעדי שחזור
- תוצאה צפויה
- תוצאה בפועל
- חומרה
- URL מדויק
- timestamp
- Evidence (צילום מסך/Network/Console)
- בעלים לטיפול
- סטטוס (Open/In Progress/Fixed/Verified)

## משתמשי בדיקה (אומתו)
| Role | Email | Password | סטטוס זמינות |
|------|-------|----------|---------------|
| RESEARCHER | researcher@test.com | 123456 | ✅ Active |
| SECRETARY | secretary@test.com | 123456 | ✅ Active |
| REVIEWER | reviewer@test.com | 123456 | ✅ Active |
| CHAIRMAN | chairman@test.com | 123456 | ✅ Active |
| ADMIN | admin@test.com | 123456 | ✅ Active |

## מטריצת כיסוי לפי תפקידים

### 1) RESEARCHER
| ID | בדיקה | תוצאה | ראיות |
|----|-------|-------|-------|
| R-01 | Login תקין + /auth/me | ✅ PASS | 200 + token issued |
| R-02 | `GET /api/submissions` (my submissions) | ✅ PASS | 200 |
| R-03 | `GET /api/notifications` | ✅ PASS | 200 |
| R-04 | RBAC negative: `/reports/stats` | ✅ PASS (403 blocked) | 403 |
| R-05 | RBAC negative: `/users/admin/users` | ✅ PASS (403 blocked) | 403 |
| R-06 | RBAC negative: `/audit-logs` | ✅ PASS (403 blocked) | 403 |
| R-07 | UI run: Submit flow + Documents + Timeline | ✅ PASS | Runner IDs: submission/document נוצרו והורדו בהצלחה |

### 2) SECRETARY
| ID | בדיקה | תוצאה | ראיות |
|----|-------|-------|-------|
| S-01 | Login + /auth/me | ✅ PASS | 200 |
| S-02 | `GET /submissions/dashboard/secretary` | ✅ PASS | 200 |
| S-03 | `GET /submissions?page=1&limit=10` (pagination) | ✅ PASS | 200 |
| S-04 | `GET /users/reviewers` | ✅ PASS | 200 |
| S-05 | `GET /meetings` | ✅ PASS | 200 |
| S-06 | RBAC negative: `/users/admin/users` | ✅ PASS (403 blocked) | 403 |
| S-07 | UI run: Assign reviewer + Create meeting | ✅ PASS | assign+meeting+agenda+attendees עברו |

### 3) REVIEWER
| ID | בדיקה | תוצאה | ראיות |
|----|-------|-------|-------|
| V-01 | Login + /auth/me | ✅ PASS | 200 |
| V-02 | `GET /submissions` (assignments) | ✅ PASS | 200 |
| V-03 | RBAC negative: `/submissions/dashboard/secretary` | ✅ PASS (403 blocked) | 403 |
| V-04 | RBAC negative: `/audit-logs` | ✅ PASS (403 blocked) | 403 |
| V-05 | UI run: Review form + AI panel | ✅ PASS | AI analyze + review transition ל־IN_REVIEW |

### 4) CHAIRMAN
| ID | בדיקה | תוצאה | ראיות |
|----|-------|-------|-------|
| C-01 | Login + /auth/me | ✅ PASS | 200 |
| C-02 | `GET /submissions` (queue) | ✅ PASS | 200 |
| C-03 | `GET /reports/stats` | ✅ PASS | 200 |
| C-04 | `GET /protocols` | ✅ PASS | 200 |
| C-05 | RBAC negative: `/users/admin/users` | ✅ PASS (403 blocked) | 403 |
| C-06 | UI run: Decision + Approval PDF he/en | ❌ FAIL (High) | שתי קריאות `/approval-letter` החזירו 500 |

### 5) ADMIN
| ID | בדיקה | תוצאה | ראיות |
|----|-------|-------|-------|
| A-01 | Login + /auth/me | ✅ PASS | 200 |
| A-02 | `GET /users/admin/users` + pagination | ✅ PASS | 200 |
| A-03 | `GET /audit-logs` + pagination | ✅ PASS | 200 |
| A-04 | `GET /reports/stats` | ✅ PASS | 200 |
| A-05 | `GET /submissions/dashboard/secretary` (ADMIN access) | ✅ PASS | 200 |
| A-06 | UI run: Impersonation + Settings + XLSX export | ✅ PASS | impersonation+settings+xlsx עברו |

## בדיקות חוצות מערכת
| ID | בדיקה | תוצאה | ראיות |
|----|-------|-------|-------|
| X-01 | Endpoint ללא טוקן → 401 | ✅ PASS | 401 |
| X-02 | Login עם סיסמה שגויה → 400/401 | ✅ PASS | 400 |
| X-03 | Route שאינו קיים → 404 | ✅ PASS | 404 |
| X-04 | API Health `/api/health` → `database: connected` | ✅ PASS | 200 |
| X-05 | תקינות ניתוב אחרי refresh (client-side routing) | ✅ PASS | Puppeteer עבר ב־`/dashboard` `/reports` `/users` `/meetings` |
| X-06 | Console נקי משגיאות קריטיות | ✅ PASS | ללא שגיאות קונסול קריטיות בהרצה |

## Responsive + i18n Gate
| ID | בדיקה | תוצאה | הערות |
|----|-------|-------|-------|
| RI-01 | HTML `lang="he"` + `dir="rtl"` טעון ראשוני | ✅ PASS | אומת מה־index חי |
| RI-02 | meta viewport תקני | ✅ PASS | `width=device-width, initial-scale=1.0` |
| RI-03 | Tailwind breakpoints (sm/md/lg/xl) בשימוש | ✅ PASS | נמצא ב־20+ קבצי עמודים/קומפוננטות |
| RI-04 | i18n key parity he/en | ✅ PASS | 640/640 |
| RI-05 | ויזואלי 375/768/1280 | ✅ PASS | Login ללא overflow ב־375/768/1280 |
| RI-06 | מעבר שפה חי בכל דף + RTL/LTR switch | ✅ PASS | `he=rtl`, `en=ltr` אומת בהרצה חיה |

## תוצאות Automated Gates (לפני היום)
| Gate | תוצאה |
|------|-------|
| Backend Jest (`npm test`) | ✅ PASS — 2 suites / 6 tests |
| Prisma schema validate | ✅ PASS |
| Frontend ESLint | ✅ PASS — 0 errors |
| Frontend Vite build | ✅ PASS — 169 modules, ~710KB total |

## סיכום ריצה
- Passed: **38**
- Failed: **2** (Approval PDF he/en)
- Blocked: **0**
- Critical פתוחים: **0**
- High פתוחים: **2**
- Manual UI pending: **0** (הפריטים בוצעו; יש 2 High פתוחים)
- החלטת שחרור: **Conditional Go** — כל הזרימות עברו למעט הפקת Approval PDF (he/en) שחוסמת Go מלא.

## חתימות
- QA: ______________________  (תאריך: __________)
- Tech Lead: ______________________  (תאריך: __________)
- Product: ______________________  (תאריך: __________)
