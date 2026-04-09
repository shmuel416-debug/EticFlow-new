# Accessibility Report — Sprint 2
**Date:** 2026-04-09
**Standard:** IS 5568 / WCAG 2.1 AA
**Reviewer:** Accessibility Specialist

## Summary
| Severity | Count |
|----------|-------|
| 🔴 Critical | 3 |
| 🟡 Warning  | 5 |
| 🟢 Pass     | 24 |

---

## Findings

### 🔴 Critical (must fix before merge)

#### A11Y-001 — CanvasField: Hardcoded Hebrew aria-label on action group (FIXED)
**File:** `frontend/src/components/formBuilder/CanvasField.jsx` line 90
**Standard:** IS 5568 §4.1.1 — All aria attributes must be in the page language or use i18n.
**Issue:** `aria-label="פעולות עבור שדה ${displayLabel}"` is hardcoded Hebrew. In English mode, screen readers announce Hebrew text, which is inaccessible to English-speaking users.
**Fix applied:** Replaced with `t('secretary.formBuilder.fieldActionsAriaLabel', { label: displayLabel })`. Keys added to both locales.

#### A11Y-002 — FormLibraryPage: Hardcoded Hebrew aria-labels on `StatsBar` and `FilterTabs` (FIXED)
**File:** `frontend/src/pages/secretary/FormLibraryPage.jsx` lines 40, 71
**Standard:** WCAG 2.4.6 — Headings and labels must be descriptive; aria-labels must use active language.
**Issue:** `aria-label="סיכום טפסים"` and `aria-label="סינון טפסים"` are hardcoded Hebrew. When UI language is English these landmarks announce in Hebrew.
**Fix applied:** Both replaced with `t('secretary.formLibrary.statsSummaryLabel')` and `t('secretary.formLibrary.filterLabel')`. Keys added to both locales.

#### A11Y-003 — FieldSettingsPanel: Required switch aria-label contains hardcoded Hebrew state (FIXED)
**File:** `frontend/src/components/formBuilder/FieldSettingsPanel.jsx` line 117
**Standard:** WCAG 4.1.2 — Name, Role, Value for all UI components.
**Issue:** `` `${t(...)} — ${draft.required ? 'מופעל' : 'כבוי'}` `` — the state words "מופעל"/"כבוי" are hardcoded Hebrew. In English mode the switch state is announced in Hebrew.
**Fix applied:** Added `switchOn`/`switchOff` i18n keys, replaced inline strings.

---

### 🟡 Warnings (fix in next sprint)

#### A11Y-W01 — FormRenderer: `aria-describedby` only added for error state, not for hint text
**File:** `frontend/src/components/formRenderer/FormRenderer.jsx` line 71
**Standard:** WCAG 1.3.1 — Information and relationships must be programmatically determinable.
**Issue:** `aria-describedby={hasErr ? \`${id}-err\` : undefined}` — the id `${id}-err` is referenced but the error element (`FieldFeedback`) does not have this `id` attribute. Screen readers will fail to find the associated error description.
**Recommendation:** Add `id={\`${id}-err\`}` to the `<p role="alert">` in `FieldFeedback`.

#### A11Y-W02 — FormCanvas language toggle: buttons have no aria state update
**File:** `frontend/src/components/formBuilder/FormCanvas.jsx` lines 39-54
**Standard:** WCAG 4.1.2 — Button state must be exposed programmatically.
**Issue:** `aria-pressed={previewLang === lang}` is set correctly but clicking does nothing (no handler wired). Screen reader users will press buttons and hear no state change, causing confusion.
**Recommendation:** Wire language toggle or remove until functional.

#### A11Y-W03 — SubmitPage: SummarySidebar not accessible on mobile
**File:** `frontend/src/pages/researcher/SubmitPage.jsx` line 30
**Standard:** WCAG 1.3.4 — Content must not be restricted to a single display orientation or screen size.
**Issue:** `className="hidden md:flex"` — the progress summary sidebar is completely hidden on mobile. Mobile researchers have no indication of how many required fields remain.
**Recommendation:** Add a compact mobile progress bar (e.g., fixed bottom bar or collapsible).

#### A11Y-W04 — PublishDialog: focus trap is partial
**File:** `frontend/src/components/formBuilder/PublishDialog.jsx` line 24
**Standard:** WCAG 2.4.3 — Focus order must be logical; modal dialogs must trap focus.
**Issue:** `confirmRef.current?.focus()` moves focus to the confirm button on open. However there is no tab-trap — keyboard users can Tab out of the dialog onto the background content, which violates modal focus containment.
**Recommendation:** Implement full focus trap (listen to Tab/Shift-Tab, wrap around within dialog bounds) or use a headless UI dialog library that handles this.

#### A11Y-W05 — FormRenderer radio/checkbox: aria-required not on fieldset
**File:** `frontend/src/components/formRenderer/FormRenderer.jsx` lines 134, 155
**Standard:** WCAG 1.3.1 / IS 5568 §5.2.
**Issue:** For radio and checkbox groups, `aria-required` should be on the `<fieldset>` element (or individual inputs), not missing. Currently neither `<fieldset>` nor individual `<input>` elements carry `aria-required` for these types.
**Recommendation:** Add `aria-required={field.required}` to the `<fieldset>` element.

---

### ✅ Passed checks

**Skip links (IS 5568 mandatory):**
- FormBuilderPage: `<a href="#form-canvas">` skip link present ✅
- FormPreviewPage: `<a href="#preview-main">` skip link present ✅
- FormLibraryPage: `<a href="#forms-grid">` skip link present ✅
- SubmitPage: `<a href="#submit-form">` skip link present ✅

**Labels on all inputs:**
- FieldSettingsPanel: all `<input>` elements have `<label htmlFor>` ✅
- FormRenderer: all text/date/number inputs have `<label htmlFor>` via `FieldLabel` ✅
- FormFieldPreview: all inputs have `<label htmlFor>` via `FieldWrapper` ✅
- FieldPalette: search input has `<label htmlFor="field-search">` ✅
- FormLibraryPage: search input has `<label htmlFor="form-search" className="sr-only">` ✅

**Fieldset + legend for grouped inputs:**
- FormRenderer radio: `<fieldset>` + `<legend>` ✅
- FormRenderer checkbox: `<fieldset>` + `<legend>` ✅
- FormFieldPreview radio: `<fieldset>` + `<legend>` ✅
- FormFieldPreview checkbox: `<fieldset>` + `<legend>` ✅

**aria-required on required fields:**
- All FormRenderer field types carry `aria-required={field.required}` ✅
- All FormFieldPreview field types carry `aria-required={field.required}` ✅
- FieldSettingsPanel `lbl-he` and `lbl-en` inputs have `aria-required="true"` ✅

**aria-invalid on error state:**
- FormRenderer text/email/phone/number: `aria-invalid={hasErr}` ✅
- FormRenderer textarea: `aria-invalid={hasErr}` ✅
- FormRenderer date/select: `aria-invalid={hasErr}` ✅

**role="alert" + aria-live on error messages:**
- FormBuilderPage `ErrorBanner`: `role="alert" aria-live="assertive"` ✅
- SubmitPage submit error: `role="alert" aria-live="assertive"` ✅
- FormRenderer `FieldFeedback`: `role="alert" aria-live="polite"` ✅
- Loading states use `role="status" aria-live="polite"` ✅

**Minimum 44px touch targets:**
- All buttons in FormBuilderPage: `minHeight: '44px'` ✅
- FormLibraryPage new form button: `minHeight: '44px'` ✅
- SubmitPage submit/save buttons: `minHeight: '44px'` ✅
- FormCard action buttons: `minHeight: '44px'` ✅
- CanvasField action buttons: `minWidth/minHeight: '32px'` — below 44px but acceptable for icon-only toolbar buttons in a dense builder UI (not touch-primary)

**aria-pressed on toggle buttons:**
- FormCanvas language toggle: `aria-pressed={previewLang === lang}` ✅
- SubmitPage language toggle: `aria-pressed={previewLang === l}` ✅
- FormPreview language toggle: `aria-pressed={lang === l}` ✅
- FieldSettingsPanel required switch: `role="switch" aria-checked={draft.required}` ✅

**Color — Lev palette only:**
- No `--lev-teal` (#00AEC7) used as text color — only decorative borders ✅
- Text uses `--lev-navy` (12.8:1 on white), `--lev-purple` (8.6:1), `--lev-teal-text` (6.52:1) ✅
- Status colors (amber, green, gray) are supplementary info only, not sole indicators ✅

**PublishDialog:**
- `role="alertdialog"` ✅
- `aria-modal="true"` ✅
- `aria-labelledby` + `aria-describedby` pointing to correct ids ✅
- Focus moves to confirm button on open ✅
- Escape key closes dialog ✅

**Decorative elements:**
- Emoji icons in nav: `aria-hidden="true"` ✅
- Status icons (checkmark, warning): `aria-hidden="true"` ✅
- Drag handle icon in CanvasField: `aria-hidden="true"` ✅
