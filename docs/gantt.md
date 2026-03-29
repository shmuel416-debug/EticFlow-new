# EthicFlow — Project Gantt / Timeline

## Overview
- **Total Duration:** ~22 weeks (6 sprints)
- **Team:** Claude Code + 1 developer
- **Methodology:** Sprint-based, task-gated (no code before plan approval)

---

## Sprint 1 — Infrastructure (Weeks 1-4)
```
Week 1  ████████ Docker + PostgreSQL + Prisma Schema + Migrations + Seed
Week 2  ████████ Express setup + Middleware (CORS, Helmet, Auth, Audit)
Week 3  ████████ Auth API (register, login, forgot/reset password, JWT, RBAC)
Week 4  ████████ React shell + Layout + Sidebar + Login + Routing per role
```
**Deliverable:** Login works, each role sees different dashboard placeholder.

## Sprint 2 — Dynamic Forms (Weeks 5-8)
```
Week 5  ████████ Form Builder UI (Drag & Drop, field types)
Week 6  ████████ Conditional logic + required fields + form preview
Week 7  ████████ Form library (CRUD, versioning, publish/archive)
Week 8  ████████ FormRenderer (JSON → dynamic form) + Submissions CRUD
```
**Deliverable:** Secretary builds forms, Researcher fills and submits.

## Sprint 3 — Researcher Portal + Versioning (Weeks 9-11)
```
Week 9  ████████ Multi-step submission wizard + file upload
Week 10 ████████ Submission versioning (JSON snapshots) + Diff view
Week 11 ████████ Researcher dashboard (cards, SLA badge, progress bar)
```
**Deliverable:** Researcher submits, sees status, corrects per comments.

## Sprint 4 — Reviewers + AI (Weeks 12-14)
```
Week 12 ████████ Split Screen reviewer UI + Inline comments
Week 13 ████████ AI service (Gemini) — 7 protocol checks + sensitivities
Week 14 ████████ Secretary Triage + Reviewer assignment + Notifications
```
**Deliverable:** Full review cycle works with AI assistance.

## Sprint 5 — SLA + Committee Management (Weeks 15-18)
```
Week 15 ████████ SLA engine (business days, holidays, traffic light)
Week 16 ████████ Cron job (midnight SLA check) + email alerts + escalation
Week 17 ████████ Meeting management (create, agenda, invitations, calendar)
Week 18 ████████ Meeting execution (attendance, decisions per submission)
```
**Deliverable:** Full committee workflow with SLA enforcement.

## Sprint 6 — Outputs + QA (Weeks 19-22)
```
Week 19 ████████ Protocol editor + auto-generation from meeting data
Week 20 ████████ Digital signatures + signature tracking + PDF generation
Week 21 ████████ Protocol archive + Statistics dashboard + Excel export
Week 22 ████████ setup.sh + Docker prod + Security audit + UAT
```
**Deliverable:** Production-ready product. Installable by any institution.

---

## Token Budget Strategy
Each sprint task should be completable in 1-2 Claude Code sessions.
- Start each session: read CLAUDE.md + /sprint-plan
- Mid-session: /compact at 50%
- End session: /review → commit → update sprint-log
- Between tasks: /clear

## Risk Mitigation
- If a task takes 2x longer than planned → simplify scope, ship MVP version
- If context gets messy → /clear and restart fresh with plan
- If tests fail → fix before moving to next task (never skip)
