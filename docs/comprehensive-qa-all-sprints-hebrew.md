# 🧪 תוכנית בדיקה קומפרהנסיבית — כל Sprints (1-8)
## בדיקה מלאה של EthicFlow מהתחלה עד סוף

**תאריך:** 19 באפריל 2026  
**סביבה:** Production (frontend-eticflow-dev.up.railway.app)  
**סטטוס:** תוכנית - ממתינה לתיקון Auth

---

## 📋 מפת Sprints ו-Features

```
Sprint 1: Infrastructure ✅ (v0.1.0)
├── Docker + Database
├── Backend Foundation
├── Auth System
└── Frontend Shell

Sprint 2: Dynamic Forms ✅ (v0.2.0)
├── Forms CRUD Backend
├── Form Builder UI (D&D)
├── Form Library + Preview
└── Form Renderer + Submission

Sprint 3: Review Workflow ✅ (v0.3.0)
├── Secretary - Submission List
├── Reviewer - Review Form
├── Chairman - Decisions
└── Notifications + Polish

Sprint 4: SLA + Documents + AI ✅ (v0.4.0)
├── Researcher Dashboard
├── SLA Engine
├── Document Upload
├── PDF Approval Letter
└── AI Mock Integration

Sprint 5: Secretary Dashboard + Meetings ✅ (v0.5.0)
├── Admin Users CRUD
├── Admin Impersonation
├── Secretary Dashboard
├── Meeting Management
└── Chairman Dashboard

Sprint 6: Protocols + Statistics + Settings ✅ (v1.0.0)
├── Protocol System Backend
├── Protocol Pages Frontend
├── Statistics + Export
├── Institution Settings
└── Production Readiness

Sprint 7: Microsoft Integration ✅ (v0.7.0)
├── Microsoft Email Provider
├── Microsoft Calendar Provider
├── Microsoft SSO (Entra ID)
└── SsoCallbackPage

Sprint 8: Google Integration 🔄 (v0.8.0)
├── Google Calendar Provider
├── Gmail Email Provider
├── Google SSO
├── Attendee Management (NEW)
└── Calendar Sync Display (NEW)
```

---

## 🎯 בדיקה לפי Role + Sprint

### 1️⃣ RESEARCHER (ד״ר דנה כהן)

#### Sprint 1: Infrastructure
- [ ] התחברות בעברית ✅
- [ ] דשבורד בטעינה
- [ ] Language toggle עברית/EN
- [ ] Responsive design (mobile/tablet/desktop)

#### Sprint 2: Forms
- [ ] צפיית טפסים זמינים
- [ ] בחירת טופס פעיל
- [ ] **מילוי טופס:**
  - [ ] Text fields בעברית
  - [ ] Dropdowns עובדים
  - [ ] Radio buttons/checkboxes
  - [ ] Validation feedback
- [ ] **הגשת בקשה:**
  - [ ] Summary page
  - [ ] Confirmation ✅
  - [ ] Application ID מתקבל

#### Sprint 3: Review Workflow
- [ ] צפיית בקשותיי
- [ ] סטטוס tracking:
  - [ ] SUBMITTED → IN_TRIAGE
  - [ ] IN_TRIAGE → ASSIGNED
  - [ ] ASSIGNED → IN_REVIEW
  - [ ] IN_REVIEW → APPROVED/REJECTED/PENDING_REVISION

#### Sprint 4: SLA + Documents
- [ ] **Researcher Dashboard:**
  - [ ] List של בקשותיי
  - [ ] SLA indicator (🟢/🟡/🔴)
  - [ ] עמודה של תאריך סיום
- [ ] **Submission Status Page:**
  - [ ] Timeline visualization
  - [ ] Tab: תשובות
  - [ ] Tab: הערות (comments)
  - [ ] Tab: מסמכים
- [ ] **Document Upload:**
  - [ ] בחירת קובץ (PDF/DOC)
  - [ ] Drag-and-drop (אם קיים)
  - [ ] Upload בהצלחה
  - [ ] Download קובץ
- [ ] **Approval Letter:**
  - [ ] לאחר אישור — PDF download זמין
  - [ ] PDF מכיל פרטי בקשה

#### Sprint 5: Meetings
- [ ] צפיית פגישות (קולח מנהלים בלבד)
- [ ] עדכון סטטוס בקשה (קולח משלחי אבל לא שיפוט)

#### Sprint 6: Protocols
- [ ] צפיית פרוטוקולים (קולח עם הרשאה בעלבד)
- [ ] הורדת PDF (אם יש)

#### Sprint 7-8: SSO + Google
- [ ] התחברות עם Microsoft (אם קיים)
- [ ] התחברות עם Google (אם קיים)

---

### 2️⃣ SECRETARY (מיכל לוי)

#### Sprint 1: Infrastructure
- [ ] התחברות בהצלחה ✅
- [ ] דשבורד עולה עם KPI cards
- [ ] Sidebar + navigation

#### Sprint 2: Forms
- [ ] **Form Builder:**
  - [ ] Create new form
  - [ ] Add fields (drag & drop)
  - [ ] Set field properties
  - [ ] Save draft
  - [ ] Publish form
- [ ] **Form Library:**
  - [ ] רשימת טפסים
  - [ ] Filter (ACTIVE/DRAFT/ARCHIVED)
  - [ ] Search טפסים
  - [ ] Stats bar
- [ ] **Form Preview:**
  - [ ] Preview לפני הוצאה לפעולה
  - [ ] Validation display

#### Sprint 3: Review Workflow
- [ ] **Submissions List:**
  - [ ] Filter by status
  - [ ] Search by name
  - [ ] Pagination
  - [ ] SLA dots (red/yellow/green)
- [ ] **Submission Detail:**
  - [ ] View answers
  - [ ] Add comment
  - [ ] Assign reviewer (dropdown)
  - [ ] Change status
- [ ] **Status Transitions:**
  - [ ] SUBMITTED → IN_TRIAGE
  - [ ] IN_TRIAGE → ASSIGNED
  - [ ] ASSIGNED → IN_REVIEW

#### Sprint 4: SLA + Documents
- [ ] **Secretary Dashboard:**
  - [ ] KPI cards (count of submissions, etc.)
  - [ ] Recent submissions table
- [ ] **SLA Tracking:**
  - [ ] Submissions with SLA indicators
  - [ ] Missed deadline alerts

#### Sprint 5: Meetings
- [ ] **Meetings List:**
  - [ ] Filter tabs (upcoming/past/all)
  - [ ] Search meetings
  - [ ] Create new meeting:
    - [ ] Name
    - [ ] Date/time
    - [ ] Location
    - [ ] Online meeting link
    - [ ] Duration (minutes) — NEW Sprint 8
    - [ ] Multi-select attendees — NEW Sprint 8
- [ ] **Meeting Detail:** (NEW Sprint 8 critical!)
  - [ ] Agenda tab
  - [ ] Attendance tab
  - [ ] **Attendees tab** ← NEW
    - [ ] List of attendees
    - [ ] Add attendee button
    - [ ] Remove attendee button
    - [ ] Calendar sync badge (📆)
  - [ ] Update meeting
  - [ ] Cancel meeting

#### Sprint 6: Protocols
- [ ] **Protocols List:**
  - [ ] Create new protocol
  - [ ] Filter (DRAFT/PENDING/SIGNED/ARCHIVED)
  - [ ] Signature progress bar
- [ ] **Protocol Detail:**
  - [ ] Edit sections
  - [ ] Finalize protocol
  - [ ] Request signatures
  - [ ] Download PDF

#### Sprint 6: Settings
- [ ] Access settings page
- [ ] Update institution settings (SLA, email, etc.)
- [ ] Save changes ✅

#### Sprint 7-8: Microsoft + Google
- [ ] Calendar sync (Microsoft) — if enabled
- [ ] Calendar sync (Google) — if enabled
- [ ] Email provider (Microsoft/Gmail) — if configured

---

### 3️⃣ REVIEWER (פרופ׳ אבי גולן)

#### Sprint 1: Infrastructure
- [ ] התחברות בהצלחה
- [ ] Dashboard עבור Reviewer

#### Sprint 3: Review Workflow
- [ ] **Assignments Page:**
  - [ ] List של בקשות שהוקצו לי
- [ ] **Review Form:**
  - [ ] View submission answers
  - [ ] Score 1-5 (stars)
  - [ ] Recommendation (radio buttons)
  - [ ] Comments textarea
  - [ ] Submit review ✅

#### Sprint 4: AI
- [ ] **AI Panel (if enabled):**
  - [ ] Risk assessment badge
  - [ ] Score bar
  - [ ] Flags/suggestions
  - [ ] AI recommendations

---

### 4️⃣ CHAIRMAN (פרופ׳ שרה מזרחי)

#### Sprint 1: Infrastructure
- [ ] התחברות בהצלחה
- [ ] Dashboard עבור Chairman

#### Sprint 3: Review Workflow
- [ ] **Chairman Queue:**
  - [ ] Kanban board (IN_REVIEW/APPROVED/REJECTED)
  - [ ] Submissions awaiting decision

#### Sprint 5: Meetings
- [ ] צפיית פגישות (Chairman can see)

#### Sprint 6: Protocols
- [ ] צפיית פרוטוקולים
- [ ] Request signatures
- [ ] Approve protocols

---

### 5️⃣ ADMIN (יוסי ברק)

#### Sprint 1: Infrastructure
- [ ] התחברות בהצלחה
- [ ] Full dashboard

#### Sprint 5: Admin Users
- [ ] **User Management:**
  - [ ] List all users
  - [ ] Create user
  - [ ] Edit user
  - [ ] Activate/Deactivate
  - [ ] Impersonation:
    - [ ] Start impersonation
    - [ ] Impersonation banner ✅
    - [ ] Stop impersonation
- [ ] **Impersonation Banner:**
  - [ ] Amber/orange color
  - [ ] Stop button
  - [ ] Indicator in sidebar

#### Sprint 6: Settings + Statistics
- [ ] **System Settings:**
  - [ ] Institution settings
  - [ ] SLA settings
  - [ ] File upload settings
  - [ ] Email settings
- [ ] **Statistics Page:**
  - [ ] KPI cards
  - [ ] Charts (bar, line)
  - [ ] Export to XLSX
  - [ ] Monthly trend
- [ ] **Audit Log:**
  - [ ] List of all actions
  - [ ] Filter by date/user
  - [ ] Paginate results

#### Sprint 5-8: Full Access
- [ ] כל features עבור כל roles

---

## 🌐 בדיקה משותפת (All Roles)

### Localization (i18n)
```
כל משתמש יבדוק:
- [ ] Login page עברית
- [ ] Dashboard עברית
- [ ] Switch to English → כל משתנה
- [ ] Switch back to Hebrew → כל משתנה
- [ ] RTL ↔ LTR direction
- [ ] Numbers format (he: 12/03/2026, en: 03/12/2026)
- [ ] Error messages translated
```

### Responsive Design
```
כל משתמש יבדוק בגדלים:
- [ ] 375px (Mobile - iPhone SE/14)
  - Sidebar collapse/drawer
  - Tables → Cards
  - Buttons full-width
  - No horizontal scroll
  - Touch targets ≥ 44px
  
- [ ] 768px (Tablet - iPad)
  - 2-column layouts
  - Navigation still visible
  
- [ ] 1280px (Desktop)
  - Full features
  - Sidebar fixed
```

### Performance & Quality
```
כל משתמש יבדוק:
- [ ] DevTools Console → 0 errors
- [ ] Network tab → no 401/403 (after auth fix)
- [ ] Loading spinners show
- [ ] Error messages display
- [ ] Success toasts show
- [ ] No lag/freezing
```

---

## 🔍 בדיקה מפורטת לכל Feature

### Sprint 2: Form Builder
```
- [ ] Create new form
- [ ] Add field (text, email, phone, textarea, select, radio, checkbox, date, number, file)
- [ ] Edit field (label, required, validation)
- [ ] Delete field
- [ ] Reorder fields (D&D)
- [ ] Set form name (Hebrew + English)
- [ ] Preview form
- [ ] Publish form ✅
- [ ] Archive form
- [ ] Restore form
```

### Sprint 3: Review Workflow
```
- [ ] Secretary assigns reviewer to submission
- [ ] Reviewer sees assignment in dashboard
- [ ] Reviewer submits review (score + recommendation)
- [ ] Secretary sees review
- [ ] Secretary moves to IN_REVIEW status
- [ ] Chairman sees submission
- [ ] Chairman makes decision (Approve/Reject/Revision)
- [ ] Status updated automatically ✅
```

### Sprint 4: SLA Engine
```
- [ ] Submission created → SLA date calculated
- [ ] Submission viewed → SLA progress tracked
- [ ] SLA due soon → Yellow indicator 🟡
- [ ] SLA breached → Red indicator 🔴
- [ ] Email notification sent → Check console
- [ ] Approval letter generated → PDF downloadable
```

### Sprint 5: Meetings + Attendees (Sprint 8 NEW!)
```
- [ ] Create meeting with attendees
- [ ] View meeting details
- [ ] Attendees tab shows list
- [ ] Add attendee → appears in list
- [ ] Remove attendee → removed from list
- [ ] Calendar sync badge (📆 if synced)
- [ ] Sync to Google Calendar (if configured)
- [ ] Sync to Microsoft Calendar (if configured)
- [ ] Duration field works
- [ ] Attendee validation
```

### Sprint 6: Protocols
```
- [ ] Create protocol for meeting
- [ ] Add sections
- [ ] Edit sections
- [ ] Finalize protocol
- [ ] Request signatures
- [ ] Public sign page (token link)
- [ ] Sign protocol (name + date)
- [ ] Download PDF ✅
```

### Sprint 7-8: Microsoft + Google Integration
```
Microsoft (Sprint 7):
- [ ] Microsoft SSO button on login
- [ ] Click → Microsoft login page
- [ ] Return → logged in ✅
- [ ] Email sent via Microsoft (check console)
- [ ] Calendar event synced (if enabled)

Google (Sprint 8):
- [ ] Google SSO button on login
- [ ] Click → Google login page
- [ ] Return → logged in ✅
- [ ] Email sent via Gmail (check console)
- [ ] Calendar event synced (if enabled)
- [ ] Attendee management works
```

---

## 📊 טבלת בדיקה לכל Sprint

| Sprint | Feature | RESEARCHER | SECRETARY | REVIEWER | CHAIRMAN | ADMIN | Status |
|--------|---------|------------|-----------|----------|----------|-------|--------|
| 1 | Login | ✅ | ✅ | ✅ | ✅ | ✅ | ⏸️ |
| 1 | Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ⏸️ |
| 2 | Form Builder | ❌ | ✅ | ❌ | ❌ | ✅ | ⏸️ |
| 2 | Form Submission | ✅ | ❌ | ❌ | ❌ | ❌ | ⏸️ |
| 3 | Submissions List | ❌ | ✅ | ✅ | ✅ | ✅ | ⏸️ |
| 3 | Assign Reviewer | ❌ | ✅ | ❌ | ❌ | ✅ | ⏸️ |
| 3 | Review Form | ❌ | ❌ | ✅ | ❌ | ❌ | ⏸️ |
| 3 | Chairman Decision | ❌ | ❌ | ❌ | ✅ | ✅ | ⏸️ |
| 4 | SLA Tracking | ✅ | ✅ | ❌ | ❌ | ✅ | ⏸️ |
| 4 | Documents | ✅ | ✅ | ❌ | ❌ | ✅ | ⏸️ |
| 4 | PDF Letter | ✅ | ❌ | ❌ | ✅ | ✅ | ⏸️ |
| 5 | Meetings | ❌ | ✅ | ❌ | ✅ | ✅ | ⏸️ |
| 5 | Attendees | ❌ | ✅ | ❌ | ❌ | ✅ | 🔴 |
| 6 | Protocols | ❌ | ✅ | ❌ | ✅ | ✅ | ⏸️ |
| 6 | Statistics | ❌ | ❌ | ❌ | ❌ | ✅ | ⏸️ |
| 6 | Settings | ❌ | ❌ | ❌ | ❌ | ✅ | ⏸️ |
| 7 | Microsoft SSO | ✅ | ✅ | ✅ | ✅ | ✅ | ⏸️ |
| 8 | Google SSO | ✅ | ✅ | ✅ | ✅ | ✅ | ⏸️ |
| 8 | Google Calendar | ❌ | ✅ | ❌ | ❌ | ✅ | ⏸️ |
| 8 | Gmail | ❌ | ✅ | ❌ | ❌ | ✅ | ⏸️ |
| 8 | Attendee Mgmt | ❌ | ✅ | ❌ | ❌ | ✅ | 🔴 |

**Legend:**
- ✅ = User should have access
- ❌ = User should NOT have access
- ⏸️ = Blocked by auth issues
- 🔴 = Critical new feature (Sprint 8)

---

## ⏱️ זמן משוער לבדיקה מלאה

| Phase | Duration |
|-------|----------|
| 1. Fix Auth Issues | 2-3 hours |
| 2. RESEARCHER workflows | 20 minutes |
| 3. SECRETARY workflows | 30 minutes |
| 4. REVIEWER workflows | 15 minutes |
| 5. CHAIRMAN workflows | 15 minutes |
| 6. ADMIN features | 25 minutes |
| 7. Responsive + i18n | 20 minutes |
| 8. Final QA sign-off | 10 minutes |
| **TOTAL** | **~3.5 hours** |

---

## 🚀 צעדים הבאים

1. ✅ **תוכנית בדיקה כתובה** (זה הדוח הזה)
2. ⏳ **תיקון Auth issues** (login form, token)
3. ⏳ **בדיקה מלאה של כל Sprints**
4. ⏳ **QA sign-off סופי**
5. ⏳ **Release v0.8.0**

---

**דוח זה:** Comprehensive testing plan covering all 8 Sprints  
**שפה:** עברית 🇮🇱  
**סטטוס:** ממתינה לתיקון Auth

