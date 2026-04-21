# EthicFlow — Production Stability Playbook (Sprint 9)

## Purpose
Operational playbook for post-production stability: daily smoke, SLO tracking, incident handling, and escalation.

## Daily Checklist (15-20 min)
1. Run daily smoke:
   - `node backend/tests/manual/daily-production-smoke.mjs`
2. Validate health:
   - `GET /api/health` returns `200` and `database=connected`.
3. Review error trend:
   - no new spikes in `5xx` for core endpoints.
4. Verify approval PDF path:
   - `approval-letter?lang=he|en` remains healthy.
5. Verify reports export path:
   - `/api/reports/export/submissions` returns XLSX.

## Core Endpoints (SLO Scope)
- `/api/health`
- `/api/auth/login`
- `/api/auth/me`
- `/api/submissions`
- `/api/submissions/:id/approval-letter`
- `/api/reports/export/submissions`

## 14-day SLO Targets
- API availability (health): >= 99.5%
- Core endpoint success rate (2xx/3xx): >= 99.0%
- 5xx rate on core endpoints: <= 0.5%
- P95 latency:
  - `/api/auth/login`: <= 800ms
  - `/api/submissions`: <= 1200ms
  - `/api/submissions/:id/approval-letter`: <= 3000ms

## Alert Thresholds
- Critical:
  - health check down > 3 minutes
  - `approval-letter` failing (>= 3 consecutive 5xx)
- High:
  - core endpoint 5xx > 1% for 10 minutes
- Medium:
  - P95 latency breach for 30+ minutes

## Escalation Matrix
- L1: On-call engineer (triage, rollback decision)
- L2: Tech lead (root cause + mitigation)
- L3: Product owner (customer comms if impact is user-visible)

## Immediate Actions by Severity
- Critical:
  1) Open incident bridge
  2) freeze deployments
  3) rollback if no fix in 15 minutes
- High:
  1) assign owner and ETA
  2) hotfix branch
  3) targeted retest + smoke
- Medium:
  1) add to next sprint board
  2) monitor trend

## Evidence Files
- Daily smoke output archive: `docs/ops/smoke-history/`
- Incident records: `docs/ops/incidents/`
- Drill reports: `docs/ops/drills/`
