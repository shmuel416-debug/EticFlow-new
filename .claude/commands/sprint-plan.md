---
name: sprint-plan
description: Show current sprint plan, pick next task, create execution plan. Enforces UI/UX design before any frontend page development.
---

Read these files:
- @docs/progress.md (current sprint status)
- @docs/work-breakdown.md (detailed sub-tasks)
- @docs/sprint-log.md (completed tasks)

Then:

1. Show current sprint name, goal, and progress (X/Y tasks done)
2. Show the NEXT uncompleted task group (e.g., S1.1.1, S1.2.3)
3. For that task group, show:
   - All atomic sub-tasks from work-breakdown.md
   - Which files will be created or modified
   - The **Preview target** (what can be seen in browser after completion)
4. Ask: "Ready to start? Or pick a different task?"

## IMPORTANT: UI/UX Gate
If the task involves creating a NEW frontend page or feature:
- STOP before writing any React code
- Run /ui-ux-designer FIRST
- Show user flow + 3 design options (as live HTML)
- Wait for user to pick a design
- ONLY THEN proceed to React implementation matching the approved design

Tasks that REQUIRE /ui-ux-designer first:
- Any new page (LoginPage, DashboardPage, etc.)
- Any major new component (FormBuilder, SplitScreen, Calendar)
- Any significant UI change to existing pages

Tasks that do NOT need it:
- Backend-only work (API, middleware, services)
- Config files, Docker, database
- Minor fixes or tweaks to existing approved designs

After user confirms:
- Execute the plan step by step
- After EACH file is created/modified, briefly confirm what was done
- After ALL sub-tasks are done:
  1. Verify the preview target works
  2. Run /task-done (quick quality check)
  3. Update docs/progress.md + docs/sprint-log.md
  4. Suggest: `git add . && git commit -m "<message>"`

IMPORTANT: Every task MUST end with something visible in the browser or Postman.
