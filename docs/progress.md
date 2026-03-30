# EthicFlow — Progress Tracker

## Current Sprint: Sprint 1 — Infrastructure
**Status:** Not Started | **Duration:** 4 weeks | **Tag:** v0.1.0

### S1.1 — Docker + Database (Days 1-2)
- [x] S1.1.1 Docker Compose (PostgreSQL + pgAdmin)
- [x] S1.1.2 Prisma Schema (15 tables)
- [x] S1.1.3 Seed Data (users, forms, submissions)
🔍 **Preview:** pgAdmin at localhost:5050 → see tables + data

### S1.2 — Backend Foundation (Days 3-5)
- [x] S1.2.1 Express Setup + health endpoint
- [x] S1.2.2 Config files (DB, Auth, Services)
- [x] S1.2.3 Middleware (validate, error, audit)
- [x] S1.2.4 Rate Limiting
🔍 **Preview:** localhost:5000/api/health → JSON response

### S1.3 — Auth System (Days 6-9)
- [ ] S1.3.1 Register + Login endpoints
- [ ] S1.3.2 JWT + RBAC Middleware
- [ ] S1.3.3 Forgot/Reset Password + Email console
🔍 **Preview:** Postman → login → get JWT → /me works

### S1.4 — Frontend Shell (Days 10-17)
- [ ] S1.4.1 React + Vite + Tailwind setup
- [ ] S1.4.2 i18n (he.json + en.json)
- [ ] S1.4.3 Auth Context + API service
- [ ] S1.4.4 Login Page (responsive + bilingual)
- [ ] S1.4.5 Forgot Password Page
- [ ] S1.4.6 Layout + Sidebar (responsive)
- [ ] S1.4.7 Protected Routes + role routing
- [ ] S1.4.8 Placeholder Dashboards (5 roles)
- [ ] S1.4.9 Sprint wrap-up + tests + tag

🔍 **Preview:** localhost:5173 → Login → Dashboard per role, he/en, mobile/desktop
