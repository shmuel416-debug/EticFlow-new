# Code Review — Sprint 2
**Date:** 2026-04-09
**Reviewer:** Senior Engineer (15 yr)

## Summary
| Severity | Count |
|----------|-------|
| 🔴 Critical | 5 |
| 🟡 Warning  | 8 |
| 🟢 Pass     | 22 |

---

## Findings

### 🔴 Critical (must fix before merge)

#### CR-001 — SubmitPage: Wrong API response shape when loading active form (FIXED)
**File:** `frontend/src/pages/researcher/SubmitPage.jsx` line 149
**Issue:** `setFormMeta(data[0] ?? null)` treats the API response as an array. The `/api/forms/active` endpoint returns `{ form: {...} }`, not an array. This caused `formMeta` to always be `null`, completely breaking the submit flow.
**Fix applied:** Changed to `setFormMeta(data.form ?? null)`.

#### CR-002 — SubmitPage: Wrong field names in submission POST payload (FIXED)
**File:** `frontend/src/pages/researcher/SubmitPage.jsx` lines 199-200
**Issue:** Payload used `formId` (instead of `formConfigId`) and `answers` (instead of `dataJson`). The Zod schema on the backend expects `formConfigId` (UUID) and `dataJson`. This caused every submission to fail with `VALIDATION_ERROR`.
**Fix applied:** Corrected both field names to `formConfigId` and `dataJson`.

#### CR-003 — SubmitPage: Hardcoded Hebrew UI string (FIXED)
**File:** `frontend/src/pages/researcher/SubmitPage.jsx` line 62
**Issue:** `"שגיאות"` hardcoded inside `SummarySidebar` — violates the no-hardcoded-strings rule.
**Fix applied:** Replaced with `t('submission.submit.errorsTitle')`. Keys added to both locale files.

#### CR-004 — SubmitPage: Hardcoded Hebrew section fallback title (FIXED)
**File:** `frontend/src/pages/researcher/SubmitPage.jsx` line 296
**Issue:** Fallback section title `` `חלק ${idx + 1}` `` is hardcoded Hebrew.
**Fix applied:** Replaced with `t('submission.submit.sectionFallback', { num: idx + 1 })`. Keys added.

#### CR-005 — Backend: Hardcoded Hebrew in submissions.controller.js (FIXED)
**File:** `backend/src/controllers/submissions.controller.js` line 293
**Issue:** `title: \`המשך — ${original.title}\`` — backend must never produce Hebrew strings directly. The title prefix is hardcoded Hebrew, violating the "English only in code" rule. Frontend i18n must handle display text.
**Fix applied:** Changed to `"Continuation — ${original.title}"`.

---

### 🟡 Warnings (fix in next sprint)

#### CR-W01 — FieldSettingsPanel: Hardcoded mixed-language heading (FIXED inline)
**File:** `frontend/src/components/formBuilder/FieldSettingsPanel.jsx` line 131
**Issue:** `"ולידציה / Validation"` is partially hardcoded. Although low severity as it is in a dev-only panel, it still violates the i18n rule.
**Fix applied:** Replaced with `t('secretary.formBuilder.settingsValidationTitle')`.

#### CR-W02 — FieldSettingsPanel: Required switch aria-label has hardcoded Hebrew (FIXED inline)
**File:** `frontend/src/components/formBuilder/FieldSettingsPanel.jsx` line 117
**Issue:** `draft.required ? 'מופעל' : 'כבוי'` — hardcoded Hebrew in aria-label.
**Fix applied:** Added `switchOn`/`switchOff` i18n keys, replaced with `t()`.

#### CR-W03 — FormCanvas: Language toggle buttons have no onClick handler
**File:** `frontend/src/components/formBuilder/FormCanvas.jsx` lines 39-54
**Issue:** The language toggle renders correctly but `previewLang` state is managed by `useFormBuilder` in the parent. The canvas receives `previewLang` as a read-only prop — there is no `onLangChange` prop or handler, so clicking the buttons does nothing. The working language toggle is in the toolbar (desktop parent), so this is a UX inconsistency.
**Recommendation:** Either wire up a `onLangChange` prop from `FormBuilderPage`, or remove the toggle from `FormCanvas` to avoid confusion.

#### CR-W04 — SubmitPage: "Save Draft" button has no onClick handler
**File:** `frontend/src/pages/researcher/SubmitPage.jsx` line 311
**Issue:** `<button type="button" disabled={submitting}` — the "Save Draft" button has no `onClick`. It is visually present but completely non-functional. Sprint note says drafts are in scope for S2.4.
**Recommendation:** Wire `onClick={handleSaveDraft}` or mark button `disabled` with a tooltip explaining feature is coming.

#### CR-W05 — fieldTypes.js: `createField` uses `Math.random()` for IDs
**File:** `frontend/src/components/formBuilder/fieldTypes.js` line 69
**Issue:** `Math.random().toString(36).slice(2, 10)` is not collision-safe for large forms (birthday problem at ~7 chars base-36). Low probability in practice but should use `crypto.randomUUID()` or `nanoid`.
**Recommendation:** Replace with `crypto.randomUUID()` (available in all modern browsers and Node 18+).

#### CR-W06 — submissions.controller.js: generateApplicationId() is not race-safe
**File:** `backend/src/controllers/submissions.controller.js` lines 37-50
**Issue:** The function comments already note this. Under concurrent load two requests in the same millisecond will both read the same `last` record and produce duplicate `applicationId` values. This is a data integrity issue in production.
**Recommendation:** Use a DB sequence or a `SERIALIZABLE` transaction for ID generation in Sprint 3.

#### CR-W07 — FormLibraryPage: handleRestore sends wrong payload
**File:** `frontend/src/pages/secretary/FormLibraryPage.jsx` line 178
**Issue:** `api.put('/forms/${id}', { isActive: true })` — the `updateSchema` Zod schema only accepts `name`, `nameEn`, and `schemaJson`. Sending `isActive` will either be silently stripped or cause a validation error. There is no restore endpoint defined.
**Recommendation:** Add `POST /api/forms/:id/restore` endpoint in Sprint 3, or expose `isActive` in the update schema with appropriate guards.

#### CR-W08 — FormPreviewPage: loads form data via `data` without unwrapping form key
**File:** `frontend/src/pages/secretary/FormPreviewPage.jsx` line 34
**Issue:** `setForm(data)` — the API returns `{ form: {...} }` so `data` is the wrapper object. `form.schemaJson` would then be undefined. The component reads `form.schemaJson?.fields ?? []` which would silently return an empty array.
**Recommendation:** Change to `setForm(data.form)`.

---

### ✅ Passed checks

- All backend files use ES Modules (`import`/`export`) — no `require()` found
- All controllers use `async`/`await` — no `.then()` chains
- All controllers have file-level JSDoc header comments
- All exported functions have JSDoc with `@param` and `@returns`
- All DB access goes through Prisma — no raw SQL
- Zod validation present on all POST/PUT endpoints in forms and submissions routes
- Query param validation (`validateQuery`) correctly applied on `GET /api/submissions`
- `formStatus()` and `withStatus()` helpers are clean, single-responsibility functions
- `roleFilter()` correctly encapsulates role-based query logic
- `paginate()` helper is clean and reusable
- `$transaction` used correctly for multi-step creates (submission + version + SLA)
- `useFormBuilder` hook correctly uses `useCallback` for all action handlers
- React functional components used throughout — no class components
- `useEffect` cleanup via `cancelled` flag prevents setState on unmounted components
- `PublishDialog` correctly traps focus on open and closes on Escape
- `FormRenderer` properly handles all 12 field types (text, textarea, date, number, email, phone, select, radio, checkbox, file, declaration, signature)
- `FieldPalette` correctly uses `role="button"` with keyboard handler
- `CanvasField` uses `useSortable` correctly and has accessible keyboard events
- `FormCard` uses `<article>` semantic element with proper `aria-label`
- `Sidebar` uses `NavLink` with `aria-current` correctly
- Route protection in `App.jsx` correctly nests role checks
- `StatsBar`, `FilterTabs`, `EmptyState` all use `t()` for display strings (after fixes)
- `FormBuilderPage` correctly handles new vs edit route (routeId presence)
- Error handling pattern `{ error, code, details }` followed in all backend controllers
