<div dir="rtl">

# אפיון: התאמת תהליך העבודה לדרישות המשתמשים — ניתוח פערים ומפרט פיתוח

> מסמך זה בודק את התהליך שתואר ("החוקר מגיש → סוקרים → ועדה → יו״ר → אישור/תיקון") מול הקוד הקיים במערכת Ethic-Net, מסמן מה ממומש / חלקי / חסר, ומפרט את הפיתוח הנדרש לכל פער.
>
> **תאריך:** 10/06/2026
> **סטטוס:** טיוטה לאישור · אפיון לפני פיתוח

---

## 1. תקציר מנהלים

המערכת בנויה היטב מבחינת תשתית: מנוע סטטוסים דינמי (`SubmissionStatus` / `StatusTransition` / `StatusPermission`), שני סוקרים (`reviewerId` + `secondaryReviewerId`), צ׳קליסט סוקר פר-שדה, גרסאות הגשה להשוואה, הצבעות ועדה (`SubmissionVote`), פגישות וסדר-יום, ומכתבי החלטה ב-PDF. רוב "השלד" של התהליך קיים.

עם זאת, נמצאו **חמישה פערים שמונעים מהתהליך לעבוד מקצה-לקצה כפי שתואר**, ושלושה פערים משניים:

| # | דרישה | מצב | חומרה |
|---|-------|------|--------|
| 1 | החוקר רואה באיזה שלב הבקשה | ✅ ממומש | — |
| 2 | אין SLA אחרי אישור | ✅ ממומש | — |
| 3 | סוקרים רואים את כל הבקשות (שלי / כללי) | 🟡 חלקי | בינונית |
| 4 | סוקר ראשי רואה ב"הקצאות שלי", השאר ב"רשימה כללית" | ✅ ממומש | — |
| 5 | אותו דבר לסוקר שני | ✅ ממומש | — |
| 6 | כל חברי הוועדה רואים את בדיקות סוקר 1 ו-2 | 🔴 חסר | **גבוהה** |
| 7 | שני מסלולי אישור (ועדה + חתימת יו״ר / ללא ועדה) ומכתב שונה לכל אחד | 🟡 חלקי | **גבוהה** |
| 8 | חברי ועדה בפגישה מאשרים/דוחים/מבקשים תיקון; ואז היו״ר מחליט | 🟡 חלקי | בינונית |
| 9 | תיקון → חוזר לחוקר → בחירת סוקרים מחדש → רואים מי היה הסוקר בסבב הקודם → אפשר להחליף → השוואת גרסאות | 🔴 חסר ברובו | **קריטית** |
| 10 | לא לייצר מסמך מחדש בכל צפייה/הורדה — לשרת קובץ קיים | 🟡 חלקי | בינונית |

הפער הקריטי ביותר הוא **לולאת התיקון (#9)**: היום חוקר אינו יכול לערוך בקשה שאינה `DRAFT`, ולסוקר אין מנגנון "סבב חדש" — לכן ביקורת חוזרת פשוט שבורה. גם שיתוף ביקורות בין הסוקרים (#6) ושני מסלולי האישור (#7) דורשים פיתוח ממשי.

---

## 2. שיטת הבדיקה

נבדקו הקבצים: `schema.prisma`, `status.service.js`, `submissions.controller.js`, `submissions.status.controller.js`, `reviewerChecklist.service.js` / `.controller.js`, `submissions.routes.js`, `reviewerChecklist.routes.js`, וכן ה-Frontend (`App.jsx`, `Sidebar.jsx`, דפי reviewer/secretary/chairman/researcher). ההפניות לקוד במסמך מצביעות על המיקום המדויק של כל ממצא.

---

## 3. ניתוח פער מפורט לפי דרישה

### דרישה 1 — החוקר רואה באיזה שלב הבקשה ✅

**ממומש.** קיים `SubmissionStatusPage.jsx` + רכיב `SubmissionLifecycle.jsx`, ולכל סטטוס יש `descriptionHe` / `labelHe` (`status.service.js`, `DEFAULT_STATUS_CONFIG`). החוקר מקבל גם התראות בשינוי סטטוס.

**הערה קטנה:** הסטטוסים `ASSIGNED` / `ASSIGNED_SECONDARY` / `IN_TRIAGE` חושפים פרטים פנימיים (הקצאת סוקר) לחוקר. כדאי למפות אותם לתצוגה אחת מצומצמת לחוקר ("בבדיקה מקצועית") כדי לא לחשוף את ניהול הסוקרים. לא חוסם — שיפור בלבד.

---

### דרישה 2 — אין SLA אחרי אישור ✅

**ממומש.** `APPROVED` מוגדר `isTerminal: true`, `slaPhase: COMPLETED`. עם המעבר לסטטוס terminal לא נקבעים תאריכי יעד חדשים. תקין.

---

### דרישה 3 — כל הסוקרים רואים את כל הבקשות (משלב הגשה עד אישור) 🟡

**מצב:** קיים מנגנון "נראוּת עמיתים" אך הוא **כבוי כברירת מחדל ותלוי הגדרה**.

ב-`submissions.controller.js` (`roleFilter` / `buildReviewerPeerClause`):
- סוקר רואה כברירת מחדל **רק** בקשות שמוקצות אליו (`reviewerId` / `secondaryReviewerId`).
- רק אם ההגדרה `reviewer_peer_visibility = 'true'` פעילה — הוא רואה גם בקשות של עמיתים (`status: { not: 'DRAFT' }`, בכפוף לסינון ניגוד עניינים).

**פערים מול הדרישה:**
1. הדרישה היא שזו התנהגות **ברירת מחדל** ("כל חברי הוועדה אמורים לראות"), בעוד הקוד מצריך הפעלת הגדרה.
2. הטווח הנוכחי `status != DRAFT` כולל גם `REJECTED` / `WITHDRAWN` / `CONTINUED` — רחב מהמבוקש ("מהגשה ועד אישור כולל"). לא מזיק, אך לא מדויק.
3. ה-UI: בסיידבר הסוקר יש "כל ההגשות" (`allSubmissions → /submissions`) — קיים. אך הוא יציג תוצאות רק אם ההגדרה פעילה.

**מפרט פיתוח (3):**
- להחליט במדיניות: ברירת מחדל `reviewer_peer_visibility = true` ב-seed של `InstitutionSetting` (וניתן לכיבוי בהגדרות).
- לדייק את `buildReviewerPeerClause` כך שטווח הנראות יהיה הסטטוסים ה"פעילים" בלבד (כל מה שאינו `DRAFT` ואינו terminal, פלוס `APPROVED`). מומלץ להפיק את הרשימה דרך `status.service.getNonTerminalCodes()` + הוספת `APPROVED`, במקום קוד קשיח.
- בדיקת קצה: לוודא שסינון ניגוד-עניינים (`buildReviewerConflictExclusion`) ממשיך לחול.

קבצים: `backend/src/controllers/submissions.controller.js`, `backend/prisma/seed.js`.

---

### דרישה 4 + 5 — "הקצאות שלי" מול "רשימה כללית", לסוקר ראשי ולמשני ✅

**ממומש.** מבנה הנראות תומך בשני הסוקרים:
- "הקצאות שלי": `AssignmentsPage.jsx` קורא `?assignedToMe=true` ו-`roleFilter` מסנן `OR: [{reviewerId}, {secondaryReviewerId}]` — כך גם סוקר ראשי וגם משני רואים בקשה שמשויכת אליהם.
- "רשימה כללית": `/submissions` (תלוי דרישה 3).

תקין. השלמת דרישה 3 תסגור גם את "השאר ברשימה הכללית".

---

### דרישה 6 — כל חברי הוועדה רואים את בדיקות סוקר 1 ו-2 🔴

**מצב: חסר עבור תפקיד REVIEWER.** זהו פער משמעותי.

- צפייה בכל הביקורות מתבצעת ב-`GET /api/submissions/:id/reviews` (`listSubmissionReviewsForStaff`), אך ה-route מורשה רק ל-`SECRETARY, CHAIRMAN, ADMIN` (`submissions.routes.js:371`). **סוקר (REVIEWER) אינו מורשה.**
- סוקר ניגש רק ל-`GET /:id/checklist` שמחזיר **אך ורק את הביקורת של עצמו** (`getOrCreateReview` עם בדיקת `reviewerId === user`).
- ב-`ReviewDetailPage.jsx` מוצג רק `FieldReviewGrid` (הטופס של הסוקר עצמו) — אין `FieldReviewSummary` (שמרכז את כל הביקורות), בניגוד ל-`SubmissionDetailPage` של המזכירה.

**תוצאה:** סוקר 1 לא רואה את בדיקת סוקר 2 ולהפך, וחבר ועדה (סוקר לא-משויך) לא רואה כלל את הביקורות — בניגוד מפורש לדרישה.

**מפרט פיתוח (6):**
1. **הרשאת API:** להוסיף `REVIEWER` ל-route של `/:id/reviews`. כיוון שזה חושף ביקורות של עמיתים, להתנות זאת בכך שהבקשה כבר עברה את שלב הביקורת (סטטוס ≥ `IN_REVIEW`) או לכל הפחות שהביקורות שמוחזרות הן בסטטוס `SUBMITTED` בלבד — כדי לא לחשוף טיוטות סוקר.
   - בקובץ `reviewerChecklist.service.js` → `listSubmissionReviewsForStaff`: להוסיף פרמטר/וריאנט `submittedOnly` שמסנן `status: 'SUBMITTED'` עבור קוראים מסוג REVIEWER.
2. **כיבוד ניגוד עניינים:** אם לסוקר הקורא יש COI על הבקשה — לחסום, באותו מנגנון של `buildReviewerConflictExclusion`.
3. **UI:** ב-`ReviewDetailPage.jsx` להוסיף את `FieldReviewSummary` (לקריאה בלבד) המציג את ביקורות **כל** הסוקרים שכבר הוגשו, כולל שם הסוקר, סטטוס פר-שדה, הערות, המלצה (`recommendation`) והתרשמות (`impression`).
4. להחליט מדיניות תזמון: האם להראות ביקורת עמית עוד לפני שהסוקר עצמו הגיש (סיכון "עיגון"/הטיה). מומלץ להציג ביקורות עמיתים רק אחרי שהסוקר הנוכחי הגיש את שלו, או רק מסטטוס `IN_REVIEW`.

קבצים: `backend/src/routes/submissions.routes.js`, `backend/src/services/reviewerChecklist.service.js`, `backend/src/controllers/reviewerChecklist.controller.js`, `frontend/src/pages/reviewer/ReviewDetailPage.jsx`, `frontend/src/components/submissions/FieldReviewSummary.jsx`.

---

### דרישה 7 — שני מסלולי אישור (ועדה + חתימת יו״ר / ללא ועדה) ומכתב שונה 🟡

**מצב: חלקי.** קיים מנגנון "האם נדרשת ועדה", אך לא קיימים שני סוגי אישור מובחנים עם מכתב/חתימה נפרדים.

מה שקיים (`submissions.status.controller.js → recordDecision`):
- דגל `requiresCommittee` + הגדרה `decision_model` (`IRB_FULL`).
- כאשר `requiresCommittee=true`: אכיפת קוורום (`committee_quorum_min_votes`) ורוב קולות לפני אישור.
- כאשר `false` (מסלול מקוצר/פטור): אישור ישיר על-ידי יו״ר ללא הצבעות.

מה שחסר מול הדרישה:
1. **מכתב אישור אחיד בלבד.** קיים תבנית אחת (`approvalTemplate.js`) + מכתב דחייה. ה-`track` (FULL/EXPEDITED/EXEMPT) מופיע רק כתווית טקסט במכתב — אין **שני מסמכי אישור מובחנים** ("אישור ועדה מלאה" מול "אישור במסלול מקוצר/פטור").
2. **חתימת יו״ר.** מכתב האישור מטמיע תמונת חתימה שמורה (`getStoredChairmanSignature`) — תמיד, ללא קשר למסלול. אין שלב חתימה אקטיבי/מאומת של היו״ר עבור מסלול ועדה (`ProtocolSignature` קיים אך משויך לפרוטוקול פגישה, לא להחלטת בקשה בודדת).
3. אין הבחנה במצב הבקשה בין "אושר ע״י ועדה" ל"אושר במסלול מקוצר" — שניהם `APPROVED`.

**מפרט פיתוח (7):**
- **מודל:** להוסיף ל-`Submission` שדה `approvalRoute` (enum: `COMMITTEE` | `EXPEDITED`) או להישען על `track` + תיעוד ההחלטה. מומלץ שדה ייעודי כדי לא לעמיס על `track`.
- **מכתבים:** להוסיף וריאנט תבנית שני ב-`pdf.service.js` (לדוגמה `buildHeHtml` עם `templateVariant`), כך שיופק מכתב מנוסח שונה לכל מסלול. לבחור ב-`recordDecision` את הוריאנט לפי `approvalRoute`/`requiresCommittee`.
- **חתימה (מסלול ועדה):** להגדיר מדיניות —
  - אופציה א׳ (מינימלית): מכתב מסלול-ועדה משובץ בחתימת היו״ר השמורה רק לאחר שהיו״ר ביצע `recordDecision` בעצמו (כבר נאכף: `RECORD_DECISION` ל-CHAIRMAN/ADMIN). מספיק לרוב המוסדות.
  - אופציה ב׳ (מלאה): שלב חתימה אקטיבי — להרחיב `ProtocolSignature`/מודל חתימה גם להחלטת בקשה, עם סטטוס ביניים `PENDING_CHAIR_SIGNATURE` לפני `APPROVED`.
  להחליט עם המשתמש איזו רמה נדרשת לפני פיתוח.
- **UI:** במסך ההחלטה של היו״ר — בורר מפורש "מסלול אישור" (ועדה / מקוצר), ובהתאם הצגת דרישת הקוורום או דילוג עליה.

קבצים: `backend/prisma/schema.prisma` (+migration), `backend/src/controllers/submissions.status.controller.js`, `backend/src/services/pdf.service.js`, `backend/src/constants/approvalTemplate.js`, `frontend/src/pages/chairman/SubmissionDecisionPage.jsx`.

---

### דרישה 8 — חברי ועדה בפגישה מאשרים/דוחים/מבקשים תיקון; ואז היו״ר מחליט 🟡

**מצב: חלקי.** מנגנון ההצבעה קיים אך אינו קשור לפגישה/לסדר-היום/לנוכחות.

מה שקיים:
- `recordVote` (`POST /:id/votes`): כל REVIEWER יכול להצביע `APPROVED/REJECTED/REVISION_REQUIRED/ABSTAIN` כאשר הסטטוס `IN_REVIEW` או `PENDING_REVISION`.
- `recordDecision` ע״י היו״ר אוכף קוורום+רוב כשנדרשת ועדה. תקין כתהליך "הצבעה ואז החלטה".

מה שחסר/לא עקבי מול הדרישה ("כשהם נכנסים לבקשה שנמצאת בסדר היום של הוועדה"):
1. ההצבעה **אינה כרוכה בהיות הבקשה בסדר-יום של פגישה** ולא בנוכחות (`MeetingAttendee`). כל סוקר יכול להצביע בכל עת בסטטוס המתאים.
2. קיימים **שני מנגנוני החלטה מקבילים שאינם מחוברים**: `MeetingAgendaItem.decision` (החלטה פר-פריט בסדר-יום) מול `SubmissionVote` (הצבעות) — אין סנכרון ביניהם.
3. אין אכיפה ש"רק חברים שהשתתפו בפגישה" רשאים להצביע.

**מפרט פיתוח (8):**
- **קישור הצבעה לפגישה:** ב-`recordVote` לאמת (אופציונלי-קונפיגורבילי) שהבקשה נמצאת ב-`MeetingAgendaItem` של פגישה פעילה (`SCHEDULED`/`IN_PROGRESS`) ושהמצביע הוא `MeetingAttendee` עם `attended=true` (או משתתף מוזמן).
- **איחוד מקורות ההחלטה:** להחליט שמקור האמת להחלטת הוועדה הוא `SubmissionVote` (tally), ושדה `MeetingAgendaItem.decision` ייגזר ממנו או יסומן ידנית ע״י המזכירה כסיכום. לתעד את הקשר (להוסיף `meetingId` ל-vote, או לחשב tally מסונן לפי הפגישה).
- **UI פגישה:** ב-`MeetingDetailPage` — לכל פריט בסדר-יום: פאנל הצבעה (`CommitteeVotePanel`) + סיכום קולות, וכפתור "החלטת יו״ר" שזמין רק לאחר עמידה בקוורום.

קבצים: `backend/src/controllers/submissions.status.controller.js`, `backend/src/controllers/meetings.controller.js`, `backend/prisma/schema.prisma` (אופציונלי `meetingId` ב-`SubmissionVote`), `frontend/src/pages/meetings/MeetingDetailPage.jsx`.

> הערה: יש להחליט אם אכיפת "רק משתתפי פגישה מצביעים" היא חובה או רכה (הגדרה). מומלץ רכה (`enforce_meeting_voting` בהגדרות) כדי לא לשבור מוסדות שעובדים אסינכרונית.

---

### דרישה 9 — לולאת התיקון: חוזר לחוקר → תיקון → בחירת סוקרים מחדש → היסטוריית סוקר → החלפה → השוואת גרסאות 🔴

**מצב: שבור ברובו.** זהו הפער הקריטי. נפרק לרכיביו:

#### 9א. החוקר אינו יכול לתקן בקשה שב-`PENDING_REVISION`
ב-`submissions.controller.js → update`:
```
if (activeRole === 'RESEARCHER' && existing.status !== 'DRAFT')
   → שגיאה SUBMISSION_NOT_DRAFT
```
כלומר חוקר יכול לערוך **רק טיוטה**. כשהבקשה ב-`PENDING_REVISION` הוא **חסום**. בנוסף, המעבר `PENDING_REVISION → SUBMITTED` מוגדר ל-`SECRETARY/ADMIN` בלבד (`status.service.js`), לא לחוקר, ואין מעבר `PENDING_REVISION → DRAFT`. **המשמעות: אין מסלול שבו החוקר באמת מתקן ומגיש מחדש.**

**מפרט:**
- להוסיף סטטוס/מעבר ייעודי לתיקון. שתי אפשרויות:
  - **א׳ (מומלץ):** מעבר `PENDING_REVISION → DRAFT` (או סטטוס חדש `REVISION_DRAFT`) המותר לחוקר, שמאפשר לו עריכה (יצירת `SubmissionVersion` חדשה) ואז `submit` חוזר. לשמר `parentId`/הקשר הסבב.
  - **ב׳:** להתיר ל-RESEARCHER לערוך גם בסטטוס `PENDING_REVISION` ולהוסיף לו מעבר `PENDING_REVISION → SUBMITTED`.
- בכל מקרה: כל תיקון יוצר `SubmissionVersion` חדשה (כבר נתמך ב-`update`), עם `changeNote`.

#### 9ב. אין מושג "סבב ביקורת" — ביקורת חוזרת חסומה טכנית
`ReviewerChecklistReview` הוא `@@unique([submissionId, reviewerId])` — **ביקורת אחת בלבד לכל סוקר לכל בקשה, לכל החיים**. לכן:
- `getOrCreateReview` יחזיר את הביקורת הישנה שכבר `SUBMITTED`; `saveDraft`/`submitReview` יזרקו `ALREADY_SUBMITTED`.
- בסבב שני, גם אם משייכים סוקר מחדש, הוא לא יכול למלא ביקורת חדשה.
- גם `submitReview` דורש סטטוס `ASSIGNED`/`ASSIGNED_SECONDARY` — ויש לוודא שהבקשה חוזרת לשם בסבב חדש.

**מפרט (ליבת הפתרון):**
- להוסיף מושג **סבב (round)**. שתי גישות:
  - **גישה מינימלית — שדה `round` על הביקורת:** לשנות את ה-unique ל-`@@unique([submissionId, reviewerId, round])` ולהוסיף `round Int @default(1)`. `getOrCreateReview` יקבל/יחשב את הסבב הנוכחי של הבקשה.
  - **גישה מלאה — מודל `ReviewRound`:** טבלה `ReviewRound { id, submissionId, roundNum, primaryReviewerId, secondaryReviewerId, openedAt, closedAt }`, וכל `ReviewerChecklistReview`/`SubmissionVersion` משויכים ל-round. יתרון: היסטוריית סוקרים מלאה (ר׳ 9ג) "בחינם".
- להוסיף שדה `currentRound Int @default(1)` ל-`Submission`, שמוגדל בכל חזרה מ-`PENDING_REVISION` למסלול ביקורת.
- בעת פתיחת סבב חדש: לאפס את שיוך הסוקרים (או לשמר כברירת מחדל לבחירה), ולהעביר את הבקשה חזרה ל-`IN_TRIAGE`/`ASSIGNED` לפי המדיניות.

#### 9ג. "לראות מי היה הסוקר בסבב הקודם" — אין היסטוריה
`Submission.reviewerId` / `secondaryReviewerId` הם שדות נוכחיים בלבד; שיוך מחדש **דורס** את הקודם. אין טבלת היסטוריית הקצאות.

**מפרט:**
- אם נבחרת גישת `ReviewRound` (9ב מלאה) — ההיסטוריה מובנית: כל round שומר את הסוקרים שלו.
- אחרת — להוסיף טבלה `ReviewerAssignmentHistory { submissionId, round, reviewerId, role(PRIMARY/SECONDARY), assignedAt, assignedBy }`, ולכתוב אליה בכל `assignReviewer`/`assignSecondaryReviewer`.
- **UI:** במסך ההקצאה (מזכירה) להציג "סוקרים בסבב הקודם: …", עם כפתור "שייך שוב את אותם סוקרים" / "החלף".

#### 9ד. החלפת סוקרים בסבב חדש ✅ (חלקית)
שיוך מחדש עצמו אפשרי (`assignReviewer`), אך תלוי בפתרון 9ב/9ג כדי שהביקורת החדשה תיפתח כראוי.

#### 9ה. השוואת גרסאות ✅
**ממומש.** `SubmissionVersion` נשמר בכל עדכון; קיים `ReviewDiffPage.jsx`. לאחר תיקון החוקר ייווצר snapshot חדש וההשוואה תעבוד. רצוי רק לוודא שה-diff ברירת-המחדל משווה את הגרסה האחרונה לגרסה שנבדקה בסבב הקודם.

**קבצים מושפעים (9):** `backend/prisma/schema.prisma` (+migration), `backend/src/controllers/submissions.controller.js`, `backend/src/controllers/submissions.status.controller.js`, `backend/src/services/reviewerChecklist.service.js`, `backend/src/services/status.service.js` (מעברים/סטטוס תיקון), `frontend/src/pages/researcher/*`, `frontend/src/pages/secretary/SubmissionDetailPage.jsx`, `frontend/src/pages/reviewer/ReviewDiffPage.jsx`.

---

### דרישה 10 — קאשינג בהפקת מסמכים: לא לייצר מחדש מסמך שכבר נוצר 🟡

**מצב: קאשינג קיים אך לא עמיד בכל סוגי הפריסה.** היום, בכל לחיצה על "צפייה" או "הורדה" המערכת לעיתים מפיקה את ה-PDF מחדש (Puppeteer) במקום לשרת את הקובץ הקיים.

**מה קיים (`backend/src/services/pdf.service.js`):**
- `generateApprovalLetter` / `generateRejectionLetter` / `generateBilingualApprovalLetter` כבר בודקים מטמון לפני הפקה דרך `findCachedGeneratedDoc({ absPath, storagePath, submissionId })` — אם הקובץ קיים ויש רשומת `Document` פעילה, מוחזר הקובץ הקיים ללא הפקה.
- ה-route ב-`submissions.routes.js` (`approval-letter` / `rejection-letter`) מפיק רק כש-`force=1` נשלח, ו-`getForceFlag` מתיר `force` רק לתפקידי ועדה. ה-Frontend **אינו** שולח `force` (אומת ב-`SubmissionStatusPage.jsx` ו-`secretary/SubmissionDetailPage.jsx`), כך שבמסלול הרגיל אמור לחזור מטמון.
- המכתב מופק פעם אחת אוטומטית ברגע ההחלטה ב-`recordDecision` (`submissions.status.controller.js`).

**למה זה בכל זאת מפיק מחדש — שורש הבעיה:**
1. **בדיקת המטמון מבוססת מערכת קבצים מקומית.** `findCachedGeneratedDoc` עושה `fs.access(absPath)` על נתיב מקומי (`uploads/generated/...`, מתוך `GENERATED_DIR` ב-`pdf.service.js`). ההפקה גם כותבת ישירות ל-fs המקומי ב-`renderHtmlToPdf(html, absPath)` — ולא דרך `STORAGE_PROVIDER`.
   - בפריסת Docker/פרודקשן עם volume לא-persistent, ריסטארט של הקונטיינר, או **כמה רפליקות** מאחורי load balancer — הקובץ שנכתב על מכונה אחת לא קיים על האחרת/אחרי ריסטארט → `fs.access` נכשל → הפקה מחדש בכל פעם. רשומת ה-`Document` ב-DB נשמרת, אבל הקובץ הפיזי "נעלם".
2. **חוויית משתמש מטעה.** ה-endpoint הוא POST ותמיד מציג ספינר "מפיק מסמך…" גם כשמוחזר מטמון — מה שגורם לתחושה שמופק מחדש בכל פעם.

**מפרט פיתוח (10) — איזה קובץ לשנות:**

המוקד: `backend/src/services/pdf.service.js` + `backend/src/services/storage.service.js` + `backend/src/routes/submissions.routes.js`.

1. **לנתב את המסמכים המופקים דרך `STORAGE_PROVIDER` במקום fs מקומי.** ב-`pdf.service.js`:
   - לכתוב את ה-PDF דרך `storage.service` (write/put) במקום `renderHtmlToPdf(html, absPath)` ישירות ל-`uploads/`.
   - לשנות את `findCachedGeneratedDoc` כך שבדיקת הקיום תהיה דרך `storage.service.exists(storagePath)` (לא `fs.access` מקומי), כך שהמטמון עמיד לריסטארט/רפליקות/אחסון ענן (S3/Azure).
   - חלופה מינימלית אם נשארים על אחסון מקומי בלבד: לוודא ש-`uploads/` הוא volume persistent ב-`docker-compose.prod.yml`, ושיש רפליקה אחת בלבד או אחסון משותף.
2. **להפריד "קבלה" מ"הפקה".** עדיף ש-`recordDecision` יהיה ה**מקום היחיד** שמפיק את המכתב (פעם אחת, ברגע ההחלטה), ואילו ה-route של הצפייה/הורדה רק **ישרת** את הקובץ הקיים:
   - להפוך את צינור הצפייה/הורדה ל-`GET` שמחזיר מ-`storage.service`, ומפיק רק כ-fallback אם הקובץ חסר (lazy, פעם אחת).
   - להשאיר `force=1` (לתפקידי ועדה) ככלי מפורש לרענון יזום אחרי שינוי תבנית/חתימה.
3. **אינvalidציה של מטמון (להפך מהבעיה).** כשהתבנית/החתימה/פרטי הבקשה משתנים, יש לבטל את המסמך הקיים (`Document.isActive = false` או מחיקת הקובץ) כדי שיופק מחדש בפעם הבאה. נקודות הביטול: עדכון `approval_template_*` / `approval_chairman_signature` ב-`settings.controller.js`, וכל מעבר שמייצר החלטה חדשה.
4. **Frontend (ליטוש):** להציג את הספינר רק כשבאמת מתבצעת הפקה (למשל לפי כותרת תגובה `X-Generated: fresh|cached`), כדי שהמשתמש לא יחשוב שכל לחיצה מפיקה מחדש. קבצים: `frontend/src/pages/researcher/SubmissionStatusPage.jsx`, `frontend/src/pages/secretary/SubmissionDetailPage.jsx`.

> **שורה תחתונה לפיתוח ב-Cursor:** הקובץ המרכזי לתיקון הוא **`backend/src/services/pdf.service.js`** (פונקציות `findCachedGeneratedDoc`, `generateApprovalLetter`, `generateRejectionLetter`, `generateBilingualApprovalLetter`, והקבועים `GENERATED_DIR` / `GENERATED_REJECTION_DIR`), יחד עם **`backend/src/services/storage.service.js`** (להוסיף/להשתמש ב-`exists` + `write`), ו-**`backend/src/routes/submissions.routes.js`** (route ה-`approval-letter`/`rejection-letter`).

---

## 4. סיכום הפיתוח הנדרש — לפי קבצים

| תחום | Backend | Frontend | Migration |
|------|---------|----------|-----------|
| 3 — נראות סוקרים | `submissions.controller.js`, `seed.js` | — | לא |
| 6 — שיתוף ביקורות | `submissions.routes.js`, `reviewerChecklist.service.js/.controller.js` | `ReviewDetailPage.jsx` | לא |
| 7 — מסלולי אישור + מכתב | `submissions.status.controller.js`, `pdf.service.js`, `approvalTemplate.js` | `SubmissionDecisionPage.jsx` | כן (`approvalRoute`) |
| 8 — הצבעה בפגישה | `submissions.status.controller.js`, `meetings.controller.js` | `MeetingDetailPage.jsx` | אופציונלי (`meetingId` ב-vote) |
| 9 — לולאת תיקון + סבבים | `submissions.controller.js`, `submissions.status.controller.js`, `reviewerChecklist.service.js`, `status.service.js` | `researcher/*`, `SubmissionDetailPage.jsx` | **כן** (`round`, `currentRound`, היסטוריה) |
| 10 — קאשינג מסמכים | `pdf.service.js`, `storage.service.js`, `submissions.routes.js`, `settings.controller.js` | `SubmissionStatusPage.jsx`, `secretary/SubmissionDetailPage.jsx` | לא |

---

## 5. סדר פיתוח מוצע (פאזות)

מסודר לפי תלות וערך, כל פאזה ניתנת לשחרור עצמאי:

**פאזה 1 — לולאת התיקון (#9א + 9ב + 9ג).** קריטית; בלעדיה ביקורת חוזרת לא עובדת. כוללת migration לסבבים והיסטוריית סוקרים, פתיחת עריכה לחוקר, ותיקון `getOrCreateReview`/`submitReview` לסבב נוכחי.

**פאזה 2 — שיתוף ביקורות בין סוקרים (#6).** ערך גבוה, מאמץ נמוך-בינוני, ללא migration.

**פאזה 3 — מסלולי אישור ומכתב נפרד (#7).** דורש החלטת מדיניות חתימה לפני פיתוח.

**פאזה 4 — הצבעה מקושרת לפגישה (#8).** שיפור עקביות; רך/קונפיגורבילי.

**פאזה 5 — דיוק נראות סוקרים (#3) + הסתרת שלבים פנימיים מהחוקר (#1).** ליטוש.

**פאזה 6 — קאשינג בהפקת מסמכים (#10).** עצמאית, ללא migration; מומלץ לבצע יחד עם מעבר לאחסון persistent/ענן. ערך גבוה אם הפריסה היא Docker/מרובת-רפליקות.

---

## 6. החלטות מדיניות שצריך לקבל לפני/תוך כדי פיתוח

1. **חתימת יו״ר (#7):** חתימה שמורה מוטמעת (מינימלי) או שלב חתימה אקטיבי מאומת (מלא)?
2. **סבבי ביקורת (#9ב):** גישה מינימלית (`round` על הביקורת) או מודל `ReviewRound` מלא?
3. **נראות עמיתים (#3, #6):** ברירת מחדל פתוחה לכל הסוקרים, או מבוקרת בהגדרה? והאם להציג ביקורת עמית לפני שהסוקר הגיש את שלו?
4. **הצבעה בפגישה (#8):** אכיפה קשה (רק משתתפים) או רכה (הגדרה)?
5. **תיקון חוזר (#9א):** חזרה ל-`DRAFT` או סטטוס ייעודי `REVISION_DRAFT` (לשמירת מטא-דאטה של הסבב)?

</div>
