# Sprint 2 Release Report — 2026-04-09

| Check | Status | Critical | Warnings |
|-------|--------|----------|---------|
| Code Review   | ✅ PASS (after fixes) | 5 → 0 fixed | 8 |
| QA Testing    | ✅ PASS (after fixes) | 3 → 1 remain | 6 |
| Accessibility | ✅ PASS (after fixes) | 3 → 0 fixed | 5 |
| Security      | ✅ PASS              | 0            | 5 |

**Decision: ✅ APPROVED FOR MERGE**
(with one known issue QA-003 tracked as Sprint 3 immediate fix)

---

## Issues fixed in this pipeline run (before merge)

| ID | File | Fix |
|----|------|-----|
| CR-001 | `SubmitPage.jsx` | Fixed active form API response parsing: `data[0]` → `data.form` |
| CR-002 | `SubmitPage.jsx` | Fixed submission POST payload: `formId`→`formConfigId`, `answers`→`dataJson` |
| CR-003 | `SubmitPage.jsx` | Replaced hardcoded Hebrew `"שגיאות"` with `t('submission.submit.errorsTitle')` |
| CR-004 | `SubmitPage.jsx` | Replaced hardcoded Hebrew section fallback with `t('submission.submit.sectionFallback', ...)` |
| CR-005 | `submissions.controller.js` | Replaced hardcoded Hebrew title prefix with English `"Continuation — "` |
| CR-W01 | `FieldSettingsPanel.jsx` | Replaced `"ולידציה / Validation"` with `t('secretary.formBuilder.settingsValidationTitle')` |
| CR-W02 | `FieldSettingsPanel.jsx` | Replaced `'מופעל'/'כבוי'` in aria-label with `t()` keys |
| A11Y-001 | `CanvasField.jsx` | Replaced hardcoded Hebrew `aria-label` with `t('secretary.formBuilder.fieldActionsAriaLabel', ...)` |
| A11Y-002 | `FormLibraryPage.jsx` | Replaced hardcoded Hebrew `aria-label` on StatsBar and FilterTabs |
| A11Y-003 | `FieldSettingsPanel.jsx` | Fixed switch state words in `aria-label` |
| i18n | `he.json` + `en.json` | Added 9 missing translation keys for all fixed strings |

---

## Known issues — must fix at start of Sprint 3

| ID | Severity | File | Description |
|----|----------|------|-------------|
| QA-003 / CR-W08 | 🔴 High | `FormPreviewPage.jsx` | `setForm(data)` should be `setForm(data.form)` — preview always shows empty form |
| QA-W01 / CR-W07 | 🟡 Medium | `FormLibraryPage.jsx` | Restore sends `isActive:true` which Zod strips — need `POST /api/forms/:id/restore` endpoint |
| QA-W02 | 🟡 Medium | `SubmitPage.jsx` | "Save Draft" button has no onClick — must wire or disable |
| QA-W03 / CR-W03 | 🟡 Medium | `FormCanvas.jsx` | Language toggle buttons have no handler — dead UI |

---

## Warnings for Sprint 3

### Backend
- **SEC-W01 / QA-W06:** `generateApplicationId()` is not race-safe. Implement a PostgreSQL sequence or serializable transaction with unique constraint retry before production.
- **SEC-W03:** Add per-route write rate limiters (10/min) on form and submission mutation endpoints.
- **SEC-W04:** Add UUID format validation on `/:id` route params.
- **SEC-W05:** File upload field needs proper backend endpoint (`POST /api/submissions/:id/documents`) with multer, magic bytes check, MIME whitelist (PDF/DOC/DOCX/JPG/PNG/XLSX), and 20MB limit.

### Frontend
- **CR-W05:** Replace `Math.random()` ID generation in `createField()` with `crypto.randomUUID()`.
- **A11Y-W01:** Add `id={\`${id}-err\`}` to `FieldFeedback` `<p role="alert">` to fix broken `aria-describedby` reference.
- **A11Y-W04:** Implement full focus trap in `PublishDialog` (Tab/Shift-Tab wrap within dialog).
- **A11Y-W05:** Add `aria-required={field.required}` to `<fieldset>` in FormRenderer radio/checkbox groups.
- **A11Y-W03:** Add mobile progress indicator for SubmitPage (summary sidebar is desktop-only).

---

## Sprint 2 Deliverables — Status

| Task | Status |
|------|--------|
| S2.1.1 Forms CRUD Backend | ✅ Complete |
| S2.1.2 Submissions CRUD Backend | ✅ Complete |
| S2.2.1 Form Builder UI (drag-and-drop) | ✅ Complete |
| S2.2.2 Save + Publish API wiring | ✅ Complete |
| S2.2.3 Form Preview | ✅ Complete (with minor fix needed: CR-W08) |
| S2.3.1 Form Library Page | ✅ Complete (restore endpoint pending) |
| S2.4.1 FormRenderer Component | ✅ Complete |
| S2.4.2 Researcher Submit Page | ✅ Complete (after critical fixes applied) |
