# ♿ Accessibility Audit Report — Sprint 3 Pre-Sprint — 2026-04-09

**Standard:** WCAG 2.2 AA + IS 5568 (Israeli Accessibility Law)
**Scope:** All pages built in Sprint 1 + Sprint 2

---

## Summary

| Metric | Value |
|--------|-------|
| Tests performed | 52 |
| 🔴 Critical | 0 |
| 🟠 High | 1 |
| 🟡 Medium | 3 |
| 🔵 Low | 4 |
| **Overall** | ⚠️ Partial — fix medium issues before sprint end |

---

## 🟠 High Issues

### A11Y-H01 — FieldFeedback `<p>` missing `id` — broken aria-describedby (WCAG 1.3.1 / 4.1.3)
| Field | Value |
|-------|-------|
| **File** | `frontend/src/components/formRenderer/FormRenderer.jsx:47,71` |
| **Issue** | `aria-describedby={hasErr ? \`${id}-err\` : undefined}` references `id="${id}-err"` but `<FieldFeedback>` renders `<p role="alert">` with NO id attribute. The programmatic link is broken — screen readers don't associate error text with the field. |
| **Impact** | Screen reader users don't hear the error message when navigating the field. They see "field required" but don't hear WHY it failed. |
| **Fix** | Add `id` prop to FieldFeedback and render `<p id={id}>` |

---

## 🟡 Medium Issues

### A11Y-M01 — Static page title (WCAG 2.4.2)
| Field | Value |
|-------|-------|
| **File** | `frontend/index.html:7` + all pages |
| **Issue** | `<title>EthicFlow — ועדת האתיקה</title>` is always the same. Screen reader users and keyboard-only users rely on page titles to orient themselves. Dashboard, Form Builder, Submit — all have identical browser tab titles. |
| **Impact** | Disorienting for screen reader users navigating multiple tabs. |
| **Fix** | Add `document.title = t('pageTitles.dashboard')` in each page component's useEffect (or use react-helmet-async) |

### A11Y-M02 — SubmitPage: no mobile progress indicator (WCAG 1.3.1 / 2.4.8)
| Field | Value |
|-------|-------|
| **File** | `frontend/src/pages/researcher/SubmitPage.jsx` |
| **Issue** | Summary sidebar (showing filled/remaining count) is `hidden md:hidden` equivalent — desktop only. On mobile, researchers have no indication of how many required fields are left. |
| **Impact** | Mobile users can't gauge completion progress — may submit incomplete forms or not know where errors are. |
| **Fix** | Add compact mobile progress bar: `X / Y שדות חובה מולאו` pinned above submit button. Role="progressbar" with aria-valuenow/aria-valuemax. |

### A11Y-M03 — PublishDialog: incomplete focus trap (WCAG 2.1.2)
| Field | Value |
|-------|-------|
| **File** | `frontend/src/components/formBuilder/PublishDialog.jsx` |
| **Issue** | Focus moves to "Confirm" on open ✅ and Escape closes ✅, but Tab/Shift-Tab can escape the modal into the background page. Partial focus trap only. |
| **Impact** | Keyboard users can navigate behind the modal and interact with disabled background content. |
| **Fix** | Implement full Tab cycle: trap focus within modal (2 buttons: Cancel + Confirm). Use refs array + keydown handler cycling between first/last focusable. |

---

## 🔵 Low / Best Practice

### A11Y-L01 — aria-required missing on fieldset for radio/checkbox groups (WCAG 1.3.1)
| Field | Value |
|-------|-------|
| **File** | `frontend/src/components/formRenderer/FormRenderer.jsx` |
| **Issue** | Radio/checkbox groups use `<fieldset>` but `aria-required` is not on the `<fieldset>` element. Individual `<input>` elements have `aria-required` (correct), but some screen readers rely on group-level required. |
| **Fix** | Add `aria-required={field.required}` to `<fieldset>` in radio and checkbox groups. |

### A11Y-L02 — Notification count hardcoded (WCAG 4.1.3)
| Field | Value |
|-------|-------|
| **File** | `frontend/src/components/layout/AppLayout.jsx:54` |
| **Issue** | `aria-label={\`${t('common.notifications')} — 3\`}` has hardcoded "3". Not a real feature yet (no notifications API). |
| **Fix** | When notifications are built in Sprint 4: make count dynamic and use `aria-live="polite"` on the badge for real-time announcements. |

### A11Y-L03 — FieldSettingsPanel "Add Condition" button has no action (WCAG 4.1.2)
| Field | Value |
|-------|-------|
| **File** | `frontend/src/components/formBuilder/FieldSettingsPanel.jsx:157` |
| **Issue** | `<button>+ הוסף תנאי</button>` has no `onClick`. Pressing it does nothing — no feedback to the user. |
| **Fix** | Add `disabled` attribute + `title={t('secretary.formBuilder.conditionalComingSoon')}` until feature is implemented in Sprint 3. |

### A11Y-L04 — FormFieldPreview aria-label Hebrew hardcoded (WCAG 3.1.2)
| Field | Value |
|-------|-------|
| **File** | `frontend/src/components/formBuilder/FormFieldPreview.jsx:114` |
| **Issue** | `<span aria-label="שדה חובה">*</span>` — hardcoded Hebrew `aria-label` in a preview component. When the UI is in English mode, this label remains Hebrew. |
| **Fix** | Replace with `aria-label={t('secretary.formPreview.requiredField')}` |

---

## ✅ What's Working Well

| Control | Status |
|---------|--------|
| Skip links on all pages (`#main-content`) | ✅ |
| `<html lang>` + `dir` set + switches with language | ✅ |
| `<title>` set (static — see A11Y-M01) | ⚠️ |
| All images have `alt` (logo, decorative SVGs aria-hidden) | ✅ |
| All interactive buttons have `aria-label` | ✅ |
| Focus visible ring: 3px solid #1E2A72 | ✅ |
| 44px touch targets on mobile | ✅ |
| `aria-live="assertive"` on error banners | ✅ |
| `aria-live="polite"` on success / status regions | ✅ |
| `role="alert"` on error messages | ✅ |
| Form fields: `aria-required` + `aria-invalid` + `aria-describedby` | ⚠️ (id broken — A11Y-H01) |
| Radio/checkbox in `<fieldset>` with `<legend>` | ✅ |
| Tables: `<th scope="col">` | ✅ |
| PublishDialog: `role="alertdialog"`, `aria-modal`, focus on open, Escape to close | ✅ |
| Language toggle: `aria-pressed` | ✅ |
| Form Builder fields: `aria-label` with field name | ✅ |
| Drag & drop alternative: click-to-add in FieldPalette | ✅ |
| Color contrast — Navy #1E2A72: 12.8:1 | ✅ |
| Color contrast — Purple #7B2D6E: 8.6:1 | ✅ |
| Color contrast — Teal text #006680: 6.52:1 | ✅ |
| Status badges: text + color (not color alone) | ✅ |
| No `onClick` on non-interactive `<div>/<span>` | ✅ |
| Heading hierarchy: h1 → h2 → h3 (no skips) | ✅ |
| Landmark regions: `<nav>`, `<main>`, `<header>`, `<aside>` | ✅ |
| Sidebar: `aria-label` on `<nav>` | ✅ |
| Section-based form: `aria-labelledby` on each section | ✅ |
| Loading states: `role="status"` | ✅ |

---

## 📊 WCAG 2.2 AA Scorecard

| Principle | Criteria Checked | Passed | Failed |
|-----------|-----------------|--------|--------|
| 1. Perceivable | 14 | 13 | 1 (A11Y-L04) |
| 2. Operable | 16 | 14 | 2 (A11Y-M02, A11Y-M03) |
| 3. Understandable | 12 | 11 | 1 (A11Y-M01) |
| 4. Robust | 10 | 8 | 2 (A11Y-H01, A11Y-L03) |
| **Total** | **52** | **46** | **6** |

---

## 🇮🇱 Israeli Law Compliance (IS 5568 / תקנת נגישות שירות)

| Requirement | Status | Notes |
|-------------|--------|-------|
| WCAG 2.0 AA (minimum legal) | ⚠️ | Mostly compliant, A11Y-H01 must fix |
| WCAG 2.2 AA (target) | ⚠️ | 6 issues outstanding |
| Accessibility statement page | ❌ | Not built yet — required for production |
| Contact method for a11y issues | ❌ | Not built yet |
| Font size zoom (200%) | ✅ | Tested — no broken layouts |
| High contrast mode | ✅ | CSS vars respond to system contrast |
| RTL layout correct | ✅ | dir="rtl", logical CSS properties used |
| Hebrew is default language | ✅ | DEFAULT_LANGUAGE=he in .env |
| Skip to main content | ✅ | Present on all pages |
| Session timeout warning | ⚠️ | JWT expires in 8h, no warning before logout |

---

## Fix Plan for Sprint 3

| Priority | Issue | File | Effort |
|----------|-------|------|--------|
| 🟠 P1 | A11Y-H01 — FieldFeedback missing id | FormRenderer.jsx:45 | 3 min |
| 🟡 P2 | A11Y-M01 — Dynamic page titles | All pages | 20 min |
| 🟡 P2 | A11Y-M02 — Mobile progress in SubmitPage | SubmitPage.jsx | 30 min |
| 🟡 P3 | A11Y-M03 — Full focus trap in PublishDialog | PublishDialog.jsx | 15 min |
| 🔵 P4 | A11Y-L01 — fieldset aria-required | FormRenderer.jsx | 2 min |
| 🔵 P4 | A11Y-L03 — "Add Condition" disabled | FieldSettingsPanel.jsx | 2 min |
| 🔵 P4 | A11Y-L04 — hardcoded aria-label | FormFieldPreview.jsx | 2 min |
| 🔵 P5 | Accessibility statement page | New page | Sprint 4 |
