# Accessibility Design Review — Status Management

Date: 2026-04-22  
Scope: `docs/designs/status-management-design.html` (pre-implementation review)

## Summary
- Target: WCAG 2.2 AA + Israeli accessibility requirements
- Preferred option: **Option B (Bold & Structured)** after small adjustments
- Overall: **Compliant after implementation checks** (no blocking design issues)

## Findings Before Coding

### High Priority
1. Tab buttons in the prototype need semantic tabs in production (`role="tablist"`, `role="tab`, `aria-selected`, keyboard arrow navigation).
2. Color swatches must include visible text labels and not rely on color-only meaning.
3. Action buttons must keep 44x44 minimum touch target across desktop/mobile.

### Medium Priority
1. Dense grid view (Option C) may cause keyboard fatigue and reading-order ambiguity on mobile.
2. Status rows should preserve visible focus ring and row heading semantics.

## Recommended Implementation Rules
- Use native `<button>`, `<table>`, and `<label>` controls for all editable cells.
- Keep tab order: header actions → tabs → active panel controls → save.
- Add `aria-live="polite"` on save result banner.
- Keep color contrast at AA minimum (text >= 4.5:1, UI elements >= 3:1).
- Ensure status changes and permission toggles are fully keyboard-operable.

## Decision
- Build **Option B** for `StatusManagementPage`:
  - Strong hierarchy for secretary/admin workflows.
  - Better mobile adaptation than split panels.
  - Clear action grouping for statuses/transitions/permissions.
