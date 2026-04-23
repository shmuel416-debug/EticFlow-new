# EthicFlow Post-Launch Operations Checklist

## Monitoring

- [ ] Health probe monitor on `/api/health` every 60 seconds.
- [ ] Alert when health check fails for 3 consecutive runs.
- [ ] Track API 5xx rate for core endpoints:
  - `/api/auth/login`
  - `/api/auth/me`
  - `/api/submissions`
  - `/api/submissions/:id/approval-letter`
- [ ] Track p95 latency for login, submissions list, and approval letter generation.

## Logging

- [ ] Centralize backend logs (Grafana Cloud / Azure Log Analytics / ELK).
- [ ] Add alert on repeated SSO exchange-code failures.
- [ ] Confirm no sensitive tokens appear in logs.

## Compliance (Israel)

- [ ] Publish privacy notice (Hebrew + English).
- [ ] Publish accessibility statement (IS 5568 / WCAG 2.1 AA).
- [ ] Keep evidence of accessibility and security reports in release package.

## Operational Cadence

- [ ] Run daily smoke via `backend/tests/manual/daily-production-smoke.mjs`.
- [ ] Weekly backup restore verification.
- [ ] Monthly rollback drill and incident tabletop simulation.
