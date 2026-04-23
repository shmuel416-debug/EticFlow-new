# EthicFlow — Accessibility report (pre-launch)

**Standard:** IS 5568 (WCAG 2.1 AA baseline) + WCAG 2.2 AA targets  
**Last updated:** 2026-04-23  
**Scope:** Frontend SPA (`frontend/`) — Hebrew RTL default, English LTR.

## Summary

| Area | Status | Notes |
|------|--------|--------|
| `lang` / `dir` on `<html>` | Pass | Set in `main.jsx` from stored language |
| Skip link | Pass | `.skip-link` in `index.css`; used on public + key pages |
| Focus visible | Pass | `:focus-visible` + `.lev-gold-focus` for gold CTAs |
| Touch targets (44×44) | Pass | Enforced on primary chrome; Form Builder toolbar 36px — desktop-first |
| Color + contrast (brand) | Review | Gold used as CTA fill with navy text; teal decorative only |
| Forms (labels, errors) | Pass | `FormField`, `role="alert"`, `aria-describedby` patterns |
| Live regions | Pass | `AnnounceRegion` + `useAnnounce` at root |
| Accessibility statement | Pass | `/accessibility-statement` public route + nav link |

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

## Known limitations (see accessibility statement page)

- User-uploaded PDFs may be untagged.
- Form Builder drag-and-drop is pointer-first; keyboard alternatives exist for reorder (up/down) where implemented.

## Sign-off

| Role | Name | Date |
|------|------|------|
| Accessibility coordinator | _TBD_ | |
| Product owner | _TBD_ | |
