---
name: sprint-end
description: End-of-sprint pipeline — Code Review → QA → Accessibility → Security → Merge. ALL must pass.
argument-hint: "[sprint number]"
---

# Sprint End Pipeline

Full quality gate before merging. 4 checks IN ORDER. Each must pass before the next.

## Pipeline

```
┌─────────────────────┐
│  1. CODE REVIEW     │  /code-review all
└────────┬────────────┘
         │ No critical issues
         ▼
┌─────────────────────┐
│  2. QA TESTING      │  /qa-senior current
└────────┬────────────┘
         │ No critical bugs
         ▼
┌─────────────────────┐
│  3. ACCESSIBILITY   │  /accessibility-expert all
└────────┬────────────┘
         │ WCAG 2.2 AA compliant
         ▼
┌─────────────────────┐
│  4. SECURITY AUDIT  │  /security-audit current
└────────┬────────────┘
         │ No critical vulnerabilities
         ▼
┌─────────────────────┐
│  ✅ MERGE TO MAIN   │
│  git tag vX.Y.Z     │
└─────────────────────┘
```

## Rules
- 🔴 ANY critical finding in ANY check = ❌ NO MERGE
- Fix → re-run the failed check → continue pipeline
- All 4 reports saved in docs/ for audit trail
- Generate combined `docs/sprint-{X}-release-report.md`

## Combined Report Format
```
# Sprint [X] Release Report — [date]

| Check | Status | Critical | Warnings | Report |
|-------|--------|----------|----------|--------|
| Code Review | ✅/❌ | X | X | docs/code-review-sprint-X.md |
| QA Testing | ✅/❌ | X | X | docs/qa-report-sprint-X.md |
| Accessibility | ✅/❌ | X | X | docs/accessibility-report-sprint-X.md |
| Security | ✅/❌ | X | X | docs/security-report-sprint-X.md |

Decision: ✅ APPROVED / ❌ BLOCKED
```
