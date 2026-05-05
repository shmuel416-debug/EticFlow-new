## Accessibility Audit Report — Sprint current — 2026-05-05

### Summary
- WCAG target: 2.2 AA
- Scope: lifecycle/status feature changes across researcher + secretary + reviewer + chairman detail pages
- Overall: Partial (automated scan partially blocked, code-level audit completed)

### Automated Checks
- Attempted `axe` scan on `http://localhost:5173/login`
  - Initial run failed due Chrome/ChromeDriver mismatch
  - Retried with matched local browser/driver binaries
  - Final run still timed out (`script timeout`)
- Code search checks completed for:
  - `img` usage (no missing alt in sampled results for changed areas)
  - lifecycle component interactive semantics (no non-interactive click handlers)

### Findings
#### High
1. Automated axe runtime scan did not complete, so dynamic WCAG assertions remain unverified by tool.
   - Impact: cannot claim full automated WCAG coverage for this sprint.
   - Action: run axe in CI container with known browser-driver pairing.

#### Medium
1. `frontend/src/components/submissions/SubmissionLifecycle.jsx` uses progress animation without reduced-motion guard.
   - Impact: may affect users with motion sensitivity.
   - Action: add `motion-reduce` fallback.

2. Progress bar directionality in RTL is not explicitly mirrored.
   - Impact: in Hebrew UI, visual direction may feel inconsistent with reading direction.
   - Action: apply RTL-aware fill direction for progress bar.

### Positive Checks
- Timeline items use list semantics (`role=\"list\"`, `role=\"listitem\"`).
- Current step uses `aria-current=\"step\"`.
- Progress indicator includes `role=\"progressbar\"` + value attributes.
- Status meaning is conveyed by text, not color alone.

### Recommendation
⚠️ Accessibility sign-off is conditional:  
complete one successful runtime axe pass and apply reduced-motion + RTL progress polish before final release signoff.
