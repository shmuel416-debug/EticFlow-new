# QA Testing Report — Sprint 2
**Date:** 2026-04-09
**Reviewer:** Senior QA Engineer

## Summary
| Severity | Count |
|----------|-------|
| 🔴 Critical | 3 |
| 🟡 Warning  | 6 |
| 🟢 Pass     | 19 |

---

## Findings

### 🔴 Critical (must fix before merge)

#### QA-001 — SubmitPage: Active form never loaded (FIXED)
**Scenario:** Researcher navigates to `/submissions/new`.
**Expected:** Form fields from the active published form appear.
**Actual:** `setFormMeta(data[0] ?? null)` parsed the `{ form: {...} }` response as an array, so `data[0]` was `undefined`. Page would always show "No active form" error.
**Status:** FIXED — changed to `data.form`.

#### QA-002 — SubmitPage: Submission POST fails with VALIDATION_ERROR (FIXED)
**Scenario:** Researcher fills in form and clicks "Submit Request".
**Expected:** POST `/api/submissions` succeeds, returns `applicationId`.
**Actual:** Backend Zod schema expects `formConfigId` and `dataJson`. Frontend was sending `formId` and `answers`. The submission always failed validation.
**Status:** FIXED — corrected field names.

#### QA-003 — FormPreviewPage: Form fields never render (not fixed — logged as CR-W08)
**Scenario:** Secretary clicks "Preview" on a saved form.
**Expected:** Fields from the form schema render in preview mode.
**Actual:** `setForm(data)` stores the `{ form: {...} }` wrapper. `form.schemaJson?.fields` is then `undefined`, so an empty array is used and the preview shows "Form is empty" even with saved fields.
**Status:** NOT FIXED in this sprint — logged as warning CR-W08 for immediate follow-up.

---

### 🟡 Warnings (fix in next sprint)

#### QA-W01 — FormLibraryPage: Restore sends wrong payload, will silently fail
**Scenario:** Secretary clicks "Restore" on an archived form.
**Expected:** Form status changes to `draft`, card updates.
**Actual:** `PUT /forms/:id` with `{ isActive: true }` — the Zod `updateSchema` only accepts `name`, `nameEn`, `schemaJson`. The `isActive` key is stripped by Zod. No error thrown, but nothing changes in the DB. UI optimistically updates to `draft` but it's misleading.
**Recommendation:** Add `POST /api/forms/:id/restore` endpoint in Sprint 3.

#### QA-W02 — "Save Draft" button does nothing
**Scenario:** Researcher fills partial form and clicks "Save Draft".
**Expected:** Draft submission saved to DB with current data.
**Actual:** Button has no `onClick` handler. Completely non-functional.
**Recommendation:** Wire or disable with explanation pending Sprint 3 implementation.

#### QA-W03 — FormCanvas language toggle buttons have no effect
**Scenario:** User clicks "EN" toggle in the FormCanvas sub-toolbar while building a form.
**Expected:** Field labels switch to English preview.
**Actual:** No `onClick` is wired — `previewLang` state lives in `useFormBuilder`, not passed back from canvas. The working language toggle is in the toolbar (Toolbar component). The canvas buttons are dead UI.

#### QA-W04 — Form publish/archive lifecycle: no confirmation for archive from FormCard
**Scenario:** Secretary clicks archive button from Form Library.
**Expected:** `window.confirm()` fires, then archive API called.
**Actual:** `window.confirm()` IS correctly called before archive. PASS on archive. However, there is no success notification after archive — `setError` is not used for success states, and no toast/snackbar system exists yet.

#### QA-W05 — SubmitPage: title field uses first field value, which may be a file or checkbox
**Scenario:** Form where the first field is a `file` or `checkbox` type.
**Expected:** Meaningful submission title.
**Actual:** `values[fields[0]?.id]` would be a filename string or an array — neither is a good title. Fallback to `t('submission.submit.pageTitle')` is acceptable but not ideal.

#### QA-W06 — applicationId generation is not race-safe (duplicate IDs possible)
**Scenario:** Two researchers submit simultaneously in the same year.
**Expected:** Unique IDs like ETH-2026-004 and ETH-2026-005.
**Actual:** Both could read the same `last` record and generate identical IDs, causing a DB unique constraint violation (500 error) or silent duplication if no constraint exists.

---

### ✅ Passed checks

**API endpoints — HTTP methods and paths:**
- `GET /api/forms` — correct, returns 200 + array
- `GET /api/forms/active` — `/active` declared before `/:id` — no route conflict
- `GET /api/forms/:id` — correct
- `POST /api/forms` — creates draft, returns 201
- `PUT /api/forms/:id` — update draft, blocked if published
- `POST /api/forms/:id/publish` — locks form, sets publishedAt
- `POST /api/forms/:id/archive` — soft delete (isActive=false)
- `GET /api/submissions` — role-filtered, paginated
- `GET /api/submissions/:id` — returns versions + comments, hides internal from RESEARCHER
- `POST /api/submissions` — creates + version 1 + SLA in transaction
- `PUT /api/submissions/:id` — versioning on update
- `POST /api/submissions/:id/continue` — only from APPROVED, clones data

**Role-based access:**
- SECRETARY cannot access researcher routes (no secretary routes in researcher nav)
- RESEARCHER cannot create forms (route `/secretary/forms/new` requires SECRETARY/ADMIN role)
- RESEARCHER cannot see all submissions — `roleFilter` correctly scopes by `authorId`
- REVIEWER sees only assigned submissions — `roleFilter` scopes by `reviewerId`
- GET `/api/submissions/:id` enforces role filter — researcher cannot access other's submission by guessing ID

**Form CRUD lifecycle:**
- Draft created by POST — status derived as `draft` (isPublished=false, isActive=true)
- Published by POST `/publish` — blocked if already published, blocked if archived
- Archived by POST `/archive` — blocked if already archived
- Cannot edit published form — `update` controller rejects with `FORM_LOCKED`
- Cannot edit archived form — `update` controller rejects with `FORM_ARCHIVED`

**Submission lifecycle:**
- POST creates `SubmissionVersion` v1 and `SLATracking` in same transaction
- PUT creates new version snapshot — version number increments from last
- RESEARCHER blocked from editing non-DRAFT submissions
- Only APPROVED submissions can be continued — `continueSubmission` checks status

**Frontend loading/error/empty states:**
- FormBuilderPage: loading spinner shown while fetching existing form
- FormLibraryPage: skeleton cards during load, error banner, empty state with context-aware message
- SubmitPage: loading spinner, error state with back button, success screen with applicationId
- FormPreviewPage: loading spinner, error state with back button

**i18n: all user-facing strings use t()** (after fixes applied)

**Mobile-first:**
- FormBuilderPage: 3-tab mobile layout (fields/canvas/settings)
- FormLibraryPage: single column on mobile (`grid-cols-1`), 2 on tablet, 3 on desktop
- SubmitPage: single-column form, sidebar hidden on mobile
- FormCanvas: sub-toolbar wraps on small screens
- All Tailwind responsive prefixes used (`md:`, `lg:`, `sm:`)

**FormRenderer: all 12 field types covered:**
- text, email, phone, number (input variants) ✅
- textarea ✅
- date ✅
- select ✅
- radio (fieldset + legend) ✅
- checkbox (fieldset + legend, multi-value array) ✅
- file (drop-zone label + hidden input) ✅
- declaration (checkbox + legal text) ✅
- signature (placeholder div) ✅
