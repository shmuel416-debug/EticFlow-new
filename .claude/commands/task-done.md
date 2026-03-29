---
name: task-done
description: Quick quality check after completing a single task. Lighter than sprint-end — just code review on changed files + basic QA on the feature.
---

# Task Completion Check

Run this after completing any task (before committing).

## Steps

1. **Quick Code Review** on changed files only:
   ```bash
   git diff --name-only
   ```
   Check these files for:
   - JSDoc on all functions
   - File header comments
   - No functions > 30 lines
   - Zod validation on new endpoints
   - i18n: no hardcoded strings
   - Responsive: Tailwind prefixes used

2. **Quick Functional Check:**
   - Does the new feature work? (manually verify in browser/Postman)
   - Does it break existing features? (smoke test)

3. **Update Docs:**
   - Mark task done in docs/progress.md
   - Add row to docs/sprint-log.md

4. **Suggest Commit:**
   ```
   git add .
   git commit -m "<type>: <description>"
   ```

If issues found → fix → re-run /task-done.
If clean → commit and move to next task.
