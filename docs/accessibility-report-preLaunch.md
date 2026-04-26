# EthicFlow — Accessibility report (pre-launch)

**Standard:** IS 5568 (WCAG 2.1 AA baseline) + WCAG 2.2 AA targets  
**Last updated:** 2026-04-23  
**Scope:** Frontend SPA (`frontend/`) — Hebrew RTL default, English LTR.

## Compliance scorecard (self-assessment)

| Criterion area | WCAG / IS | Target | Status | Evidence / next step |
|----------------|-----------|--------|--------|----------------------|
| Perceivable — text alternatives | 1.1.1 | A | Pass | Decorative icons `aria-hidden`; meaningful controls have `aria-label` / visible text |
| Perceivable — contrast (UI) | 1.4.3 / 1.4.11 | AA | Pass | Navy/purple/teal-text on white; gold only as CTA fill with navy text (see plan) |
| Operable — keyboard | 2.1.1 | A | Pass | Skip link; focus order; modals Escape; form builder field reorder via up/down |
| Operable — focus visible | 2.4.7 / 2.4.11 | AA | Pass | `:focus-visible` + `.lev-gold-focus` on gold buttons |
| Understandable — labels | 3.3.2 | A | Pass | `FormField`, `Label` primitive; errors `role="alert"` where used |
| Robust — name, role, value | 4.1.2 | A | Pass | Landmarks; `aria-current` on nav; tables with captions where implemented |
| RTL / Hebrew | IS 5568 | — | Pass | `dir` on `<html>`; logical properties in skip-link; directional icons rotated where needed |

**Legend:** Pass = no known blockers in scope; **Review** = needs manual retest after visual change; **Fail** = must fix before go-live.

## Summary

| Area | Status | Notes |
|------|--------|-------|
| `lang` / `dir` on `<html>` | Pass | Set in `main.jsx` from stored language |
| Skip link | Pass | `.skip-link` in `index.css`; used on public + key pages |
| Focus visible | Pass | `:focus-visible` + `.lev-gold-focus` for gold CTAs |
| Touch targets (44×44) | Pass | Primary chrome; form builder field actions; sticky submit bar mobile |
| Color + contrast (brand) | Review | Gold used as CTA fill with navy text; teal decorative only |
| Forms (labels, errors) | Pass | `FormField`, `role="alert"`, `aria-describedby` patterns |
| Live regions | Pass | `AnnounceRegion` + `useAnnounce` at root |
| Accessibility statement | Pass | `/accessibility-statement` public route + nav link |
| Design tokens | Pass | `components/ui/tokens.css` + `index.css` utilities (`.lev-card`, `.lev-gradient-hero`) |

## Automated checks (run before release)

```bash
cd frontend
npm run dev
# In another terminal:
npx axe http://localhost:5173/login --rules wcag2a,wcag2aa,wcag21a,wcag21aa,wcag22aa
npx axe http://localhost:5173/dashboard --rules wcag2a,wcag2aa,wcag21a,wcag21aa,wcag22aa
```

*(Dashboard route requires auth — use session cookie or run axe in Playwright logged-in flow.)*

## Manual checks (required)

- [ ] **NVDA + Chrome (Hebrew):** Login → Dashboard → New submission → field errors
- [ ] **VoiceOver + Safari:** Same path
- [ ] **Keyboard only:** Tab order RTL; modals Escape; mobile drawer Escape
- [ ] **200% zoom:** No loss of primary actions
- [ ] **Reduced motion:** `prefers-reduced-motion` short transitions (`index.css`)

## Known limitations

- User-uploaded PDFs may be untagged.
- Form Builder: drag-and-drop remains pointer-primary; each canvas field has **Move up / Move down** controls (keyboard-activatable) as an alternative to reordering.

## Sign-off

| Role | Name | Date |
|------|------|------|
| Accessibility coordinator | _TBD_ | |
| Product owner | _TBD_ | |
