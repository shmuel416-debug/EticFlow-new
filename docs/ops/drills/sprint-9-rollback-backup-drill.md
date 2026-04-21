# Sprint 9 Ops Drill Report — Rollback + Backup/Restore

Date: 2026-04-21
Owner: AI Agent (Sprint 9 execution)
Environment: Local clone (`c:/EticFlow`) as staging-preflight surrogate

## Drill Scope
1. Rollback readiness drill (compose + release command validation)
2. Backup/restore drill runbook validation (DB + uploads)

## Execution Log

### A) Rollback readiness
- Command: `docker compose -f docker-compose.yml -f docker-compose.prod.yml config -q`
- Result: PASS (compose definition valid)
- Note: warning found in `docker-compose.prod.yml` (`version` is obsolete)

### B) Runtime rollback simulation
- Command: `docker compose -f docker-compose.yml -f docker-compose.prod.yml ps`
- Result: BLOCKED
- Blocker: Docker daemon unavailable on this workstation (`dockerDesktopLinuxEngine` pipe not found)
- Impact: Full live rollback simulation could not run in this local environment

### C) Backup/restore drill steps (validated as runbook)
Validated procedure for staging/clone execution:
1. DB backup: `docker compose exec db pg_dump -U ethicflow ethicflow > backup_YYYYMMDD.sql`
2. DB restore: `cat backup_YYYYMMDD.sql | docker compose exec -T db psql -U ethicflow ethicflow`
3. Uploads backup: `tar czf uploads_YYYYMMDD.tar.gz uploads/`
4. Uploads restore: `tar xzf uploads_YYYYMMDD.tar.gz`
5. Health validation: `curl https://<domain>/api/health`

## Decision
- Preflight and runbook status: PASS
- Full runtime drill status: PARTIAL (blocked locally by Docker daemon)
- Action required: execute same sequence on active staging/clone host with running daemon and attach outputs.

## Evidence
- Commands executed in session logs (Sprint 9 implementation run)
- Updated operational runbook in `docs/DEPLOYMENT.md`
