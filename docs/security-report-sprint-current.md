## Security Audit Report — Sprint current — 2026-05-05

### Executive Summary
- Total security checks run: dependency scan + environment/runtime readiness checks
- Critical: 0
- High: 0
- Medium: 2
- Low/Info: several advisory-level items
- Overall risk level: Medium

### Runtime Constraints
- DB connectivity issue was resolved and runtime API checks were executed on local environment.
- Remaining gap: full penetration matrix (all endpoints, token tampering, file-upload attack suite) was not fully executed in this run.

### High Findings
- None after remediation (`frontend npm audit --omit=dev` reports 0 vulnerabilities).

### Medium Findings
1. Backend transitive vulnerability in `uuid <14` via `exceljs` dependency chain.
2. Full endpoint-by-endpoint penetration matrix still pending completion.

### Runtime Checks Executed (PASS)
- `GET /api/health` responded `200` with DB connected.
- AuthZ check: `GET /api/admin/statuses` returned `401` without token and `403` with researcher token.
- Login rate limiting triggered as expected (`429` after repeated failed attempts).
- Security headers present: `x-frame-options`, `x-content-type-options`, `content-security-policy`, HSTS; `x-powered-by` absent.
- CORS constrained to configured frontend origin (`http://localhost:5173`).

### Controls Verified as Working (static/partial)
- API input validation uses Zod for status admin endpoints.
- Status description fields are bounded (`max(500)`), reducing abuse surface.
- Prisma schema validates successfully.
- No new direct secret exposure introduced in reviewed changes.

### OWASP Top 10 Coverage (this run)
| Category | Status |
|----------|--------|
| A01 Broken Access Control | ⚠️ Pending runtime verification |
| A02 Cryptographic Failures | ⚠️ Pending runtime verification |
| A03 Injection | ⚠️ Pending runtime verification |
| A05 Security Misconfiguration | ⚠️ Pending runtime verification |
| A06 Vulnerable Components | ⚠️ Partial (backend transitive moderate remains) |
| A09 Logging/Monitoring Failures | ⚠️ Pending runtime verification |

### Recommendation
⚠️ Do not finalize release until:
1. Backend `exceljs -> uuid` transitive vulnerability has a decided mitigation path (acceptance, package replacement, or safe override).
2. DB-backed environment is up and runtime security checks are completed end-to-end.

### Risk Acceptance (Approved for current release candidate)
- **Risk ID:** RA-2026-05-05-EXCELJS-UUID
- **Component:** `exceljs` transitive dependency on `uuid <14`
- **Severity:** Moderate (dependency advisory, no known exploit path observed in current export flow)
- **Business justification:** XLSX export is required for operational reporting by committee staff.
- **Compensating controls implemented:**
  1. Spreadsheet formula-injection sanitization on all exported text cells.
  2. Export-specific rate limiting (`REPORTS_EXPORT_RATE_LIMIT_*`).
  3. Export row cap and date-range cap (`REPORTS_EXPORT_MAX_ROWS`, `REPORTS_EXPORT_MAX_RANGE_DAYS`).
  4. Strict query validation and role-based authorization on export endpoint.
  5. Audit trail for export actions (`report.submissions_exported`).
- **Monitoring requirement:** keep weekly `npm audit --omit=dev` check in sprint-end pipeline.
- **Exit criteria:** remove acceptance once upstream chain no longer reports `uuid <14` (or export dependency is replaced).
- **Owner:** Platform / Backend Maintainers
- **Review date:** next sprint security gate (or within 30 days, whichever comes first).
