# Sprint 13 — Deployment Checklist
**Researcher Questionnaire + Instructions + Form Duplication**
**Date: 2026-04-28 | Version: v1.3.0**

---

## Pre-Deployment (Dev/Staging)

### Database
- [ ] **Backup production database** (if applicable)
  ```bash
  pg_dump ethicflow_prod > backup_2026-04-28.sql
  ```
- [ ] **Test migration on staging DB** (in isolation worktree if needed)
  ```bash
  npx prisma migrate deploy
  ```
- [ ] Verify migration success: check `form_configs` table for new columns
  ```sql
  SELECT * FROM form_configs LIMIT 1 \gx
  ```
- [ ] Run seed in staging to create researcher questionnaire (draft status)
  ```bash
  npx prisma db seed
  ```

### Backend
- [ ] Build backend: `npm run build` (or manual test with `npm run dev`)
- [ ] Test new endpoints in Postman:
  - `POST /api/forms/:id/duplicate` with researcher questionnaire ID
  - `PUT /api/forms/:id/instructions` on same form
  - Verify RBAC: SECRETARY/ADMIN only, non-authorized users get 403
- [ ] Check audit logs for new actions: `form.duplicate`, `form.updateInstructions`

### Frontend
- [ ] Build frontend: `npm run build` — should pass with 0 errors
- [ ] Manual testing in staging:
  - Navigate to /secretary/forms → see researcher questionnaire draft
  - Click "שכפל" button → dialog appears
  - Duplicate with/without instructions → new form appears at top
  - Navigate to /submissions/new → accordion visible
  - Expand accordion → markdown instructions render correctly
  - Both Hebrew and English work (RTL/LTR correct)
- [ ] Mobile testing (375px viewport):
  - Accordion expands without layout break
  - Buttons wrap correctly
  - No overflow on attachment list

### API Documentation
- [ ] Updated `/docs/API.md` or Postman collection with:
  - `POST /api/forms/:id/duplicate` endpoint
  - `PUT /api/forms/:id/instructions` endpoint
  - Request/response examples

---

## Production Deployment

### Pre-Flight (1 hour before)
- [ ] Notify users: "Scheduled maintenance 2026-04-28 14:00-15:00 UTC+2"
- [ ] Verify all tests pass locally: `npm test` (backend)
- [ ] Run E2E smoke tests: `npm run e2e:smoke`
- [ ] Check deployment pipeline green (GitHub Actions)

### Rollout
- [ ] Deploy backend (if using Docker/K8s):
  ```bash
  docker compose -f docker-compose.prod.yml up -d
  ```
  Or push to cloud (Heroku, Railway, etc.)
  
- [ ] Run migration on production DB:
  ```bash
  npx prisma migrate deploy
  ```
  ⚠️ **Critical**: This is idempotent and adds columns. If it fails, rollback DB snapshot and investigate.

- [ ] Seed researcher questionnaire form (once only):
  ```bash
  npx prisma db seed
  # Check: researcher-questionnaire form created as draft
  ```

- [ ] Deploy frontend:
  ```bash
  npm run build && deploy to CDN/S3/etc.
  ```

- [ ] Smoke test in production:
  - Login as secretary: check form library loads
  - See researcher questionnaire (draft status)
  - Try duplicate → success
  - Login as researcher: new form with instructions visible

### Post-Deployment (30 min)
- [ ] Monitor for errors:
  - Check application logs (backend)
  - Check browser console (no JS errors)
  - Monitor API error rates (Sentry, DataDog, etc.)
  
- [ ] Verify key flows:
  - Form duplication completes without errors
  - Instructions display on submit page
  - Status transitions work (no regression)
  - Email notifications send (no regression)

- [ ] Notify users: "Deployment complete. New feature available: Form duplication + form instructions."

---

## Rollback Plan (if needed)

### Option A: Quick Rollback (if frontend only issue)
1. Revert frontend to previous version
2. Clear browser cache (`Ctrl+Shift+Delete`)
3. Redeploy backend if needed

### Option B: Database Rollback (if migration issue)
1. Restore from backup:
   ```bash
   psql ethicflow_prod < backup_2026-04-28.sql
   ```
2. Revert backend code
3. Redeploy

### Option C: Partial Rollback (disable feature flag)
**Not applicable** — feature has no flag. To disable:
1. Secretary role loses "شكпل" button (remove from FormCard)
2. Researchers don't see accordion (remove from SubmitPage)
3. Requires frontend redeploy only

---

## Post-Deployment Tasks

- [ ] Create user guide (see: `sprint-13-user-guide.md`)
- [ ] Update CHANGELOG.md: "v1.3.0: Researcher questionnaire form + form duplication + instructions editor"
- [ ] Schedule training for secretary team (15 min walkthrough video)
- [ ] Monitor for 24 hours: error rates, performance, user feedback

---

## Success Criteria

✅ All tests pass (unit + E2E + staging smoke)
✅ Migration runs without errors
✅ Researcher questionnaire form visible as draft
✅ Secretary can duplicate forms
✅ Researcher sees instructions on submit page
✅ No regressions in existing features (status transitions, notifications, etc.)
✅ Performance: page load times unchanged (< 2s)
✅ Mobile: responsive at 375px, 768px, 1280px

---

## Rollback Criteria

🔴 Database migration fails → rollback immediately
🔴 Form submission broken (can't create new submission) → rollback immediately
🔴 Frontend 404 / JS error prevents login → rollback immediately
⚠️ Minor UI issue or typo → fix in hotfix, don't rollback
