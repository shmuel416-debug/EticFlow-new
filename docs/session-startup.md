# Session Startup Instructions
# Paste this at the start of each Claude Code session

Read the following files before doing anything:
@CLAUDE.md
@docs/progress.md
@docs/sprint-log.md

Rules for this session:

1. PLAN FIRST: Show a checkbox plan before writing any code. Wait for my approval.

2. CODE QUALITY: Every function must have JSDoc. Every file must have a header comment.
   Max 30 lines per function. English code, Hebrew UI.

3. TESTING: After completing code, verify it works (run relevant tests or manual check).

4. LOGGING: After every completed task, update docs/progress.md and docs/sprint-log.md.

5. GIT: Create feature branch per task. Commit with descriptive message (feat:/fix:/docs:).

6. TOKENS: Run /compact when context reaches 50%. Run /clear between unrelated tasks.

7. REVIEW: Before committing, run /review to check code quality.

Confirm you have read all files and understood the rules before we continue.
