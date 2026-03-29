# EthicFlow — Ethics Committee Management System

## Project Overview
Standalone SaaS system for managing ethics approval requests in academic research. Supports 5 roles: Researcher, Secretary, Reviewer, Chairman, Admin. Zero institutional dependency — sellable to any academic institution.

## Tech Stack
- **Frontend:** React 18 + Vite + TailwindCSS
- **i18n:** react-i18next (Hebrew + English, RTL/LTR auto-switch)
- **Responsive:** Mobile-first design, all screens work on desktop + mobile
- **Backend:** Node.js + Express
- **Database:** PostgreSQL 16 + Prisma ORM
- **Auth:** JWT + bcrypt (standalone, no SSO dependency)
- **AI:** Google Gemini API (pluggable — mock in dev)
- **Email:** Nodemailer (pluggable — console in dev)
- **DevOps:** Docker Compose

## Architecture
```
frontend/           → React SPA (:5173)
backend/
  src/routes/       → Express route definitions
  src/controllers/  → Business logic per resource
  src/services/     → Pluggable: AI, Email, PDF, Storage, SLA
  src/middleware/    → auth.js, role.js, audit.js
  src/jobs/         → Cron: SLA checker (midnight)
  prisma/           → schema.prisma, migrations/, seed.js
```

## Commands
```bash
# DEV environment
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d   # DB + pgAdmin
cd backend && npm run dev                                               # API (:5000)
cd frontend && npm run dev                                              # App (:5173)

# PROD environment
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d  # Everything

# Database
npx prisma migrate dev --name <name>    # New migration (dev)
npx prisma migrate deploy               # Apply migrations (prod)
npx prisma db seed                       # Seed test data
npx prisma studio                        # Visual DB browser

# Quality
npm test                                 # Run tests
npm run lint && npm run format           # Lint + format

# New institution
chmod +x setup.sh && ./setup.sh          # Interactive setup wizard
```

## Coding Rules — YOU MUST FOLLOW THESE
- All code, comments, variables, functions: **English**
- **NEVER hardcode UI text.** All user-facing strings go through i18n: `t('key')`
- Translation files: `frontend/src/locales/he.json` + `en.json`
- ES Modules only (import/export). NEVER use require()
- Functional React components with hooks only
- async/await only. No raw .then() chains
- **EVERY function** must have JSDoc: purpose, @param, @returns
- **EVERY file** must have a header comment explaining its role
- Max 30 lines per function — extract helpers if longer
- Prisma for ALL DB access — never raw SQL
- Zod validation on every API endpoint input
- Error format: `{ error: string, code: string, details?: object }`
- REST convention: GET/POST/PUT/DELETE on /api/<resource>
- All sensitive actions → audit middleware log

## i18n Rules — IMPORTANT
- Use `react-i18next` with `useTranslation()` hook
- Translation keys: dot notation by page → `researcher.dashboard.title`
- Hebrew is DEFAULT language. English is secondary.
- Direction auto-switches: Hebrew = RTL, English = LTR
- `<html dir={lang === 'he' ? 'rtl' : 'ltr'} lang={lang}>`
- Date formats: Hebrew = dd/MM/yyyy, English = MM/dd/yyyy
- Backend error messages: return error CODE, frontend translates to display text

## Responsive Design Rules — IMPORTANT
- **Mobile-first:** design for mobile, then expand for desktop
- Use Tailwind responsive prefixes: default = mobile, `md:` = tablet, `lg:` = desktop
- Sidebar: collapsible drawer on mobile, fixed on desktop
- Tables: horizontal scroll on mobile, or switch to card layout
- Forms: single column on mobile, multi-column on desktop
- Minimum touch target: 44x44px on mobile
- Test every screen at 375px (mobile), 768px (tablet), 1280px (desktop)

## Git Workflow
- Feature branches: `feature/<name>`, `fix/<name>`, `hotfix/<name>`
- Commit format: `feat: add login endpoint` | `fix: SLA calc` | `docs: update readme`
- Never commit to main directly

## Key Architecture Decisions
- Services are **pluggable** via env: AI_PROVIDER, EMAIL_PROVIDER, STORAGE_PROVIDER, CALENDAR_PROVIDER
- Form schemas = JSON in DB → runtime rendering (no hardcoded forms)
- Submission versions = JSON snapshots for diff comparison
- SLA = business days only (excluding Shabbat + configurable holidays)
- Auth = standalone JWT. SSO = pluggable option (Microsoft Entra / Google)
- **Users table ALWAYS exists** — even with SSO. SSO = authentication, our table = authorization
- User.password_hash is **nullable** (NULL for SSO users, filled for local users)
- User.auth_provider: "local" | "microsoft" | "google" — determines login method
- User.external_id: SSO provider's Object ID (for sync). NULL for local users
- Mixed mode supported: SSO users + local users in same institution
- AI = advisory only — never blocks or decides
- Calendar = internal by default. Optional: Microsoft/Google Calendar sync
- Documents stored via STORAGE_PROVIDER: local (dev) / S3 / Azure Blob (prod)

## Document Storage — IMPORTANT
Two categories of documents in the system:
1. **Uploaded docs** (by researchers): protocols, GCP certs, consent forms, questionnaires
   - Stored in: `STORAGE_PROVIDER` (local/S3) under `uploads/submissions/{subId}/`
   - DB reference: `documents` table (filename, path, size, mime, uploadedBy)
   - Max file: 20MB, allowed: PDF, DOC, DOCX, JPG, PNG, XLSX
   - Validated: magic bytes check (not just extension), virus scan (future)
2. **Generated docs** (by system): approval letters, signed protocols, export reports
   - Stored in: `STORAGE_PROVIDER` under `generated/{type}/{id}/`
   - DB reference: same `documents` table with `source: 'system'`
   - Formats: PDF (approval letters, protocols), XLSX (reports)
   - Immutable: once generated, never modified (audit trail)

## Sprint Tracking
- @docs/progress.md — current sprint status
- @docs/sprint-log.md — completed tasks log

## Context Management
- `/compact` at 50% context. `/clear` between unrelated tasks
- When compacting, PRESERVE: file change list, task status, test results
