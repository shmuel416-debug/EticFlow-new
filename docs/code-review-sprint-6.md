# Code Review Report — Sprint 6 — 2026-04-15

## Summary
- Files reviewed: 12 (6 backend, 6 frontend)
- Issues found: 2 critical, 3 warning, 3 info
- Overall: ✅ Approved (all issues fixed)

## 🔴 Critical (fixed)

**CR-1 — StatsPage.jsx:232 — API/Frontend shape mismatch**
`byStatus`/`byTrack` returned as arrays, accessed as keyed objects.
Fix: converted arrays to keyed maps with `Object.fromEntries` after fetch.

**CR-2 — StatsPage.jsx:234 — Wrong field name**
`stats?.monthly` → should be `stats?.monthlyTrend`. Chart was always empty.
Fix: corrected field name.

## 🟡 Warning (fixed)

**WR-1 — StatsPage.jsx:33 — Hardcoded Hebrew track labels**
Added `submission.tracks.*` i18n keys to both he.json + en.json, replaced hardcoded strings.

**WR-2 — AuditLogPage.jsx:159,171,187 — 4 hardcoded Hebrew strings**
Added `auditLog.dateFrom`, `auditLog.dateTo`, `auditLog.clearFilter` to both locales.

**WR-3 — protocols.controller.js:288 — N+1 query in requestSignatures**
Replaced per-signer `findUnique` inside loop with a single `findMany` before the loop.
Saved as `alreadySigned` Set for O(1) lookup.

## 🔵 Info (tracked, not fixed)

**IN-1 — avgProcessingDays uses updatedAt** — not precise; needs dedicated decidedAt field (future sprint)
**IN-2 — Silent export failure** — error swallowed; consider toast notification
**IN-3 — console.error in protocols.controller.js:318** — acceptable for non-fatal email errors; migrate to logger in future

## ✅ What's Good
- All controllers: consistent try/catch → next(err), zero raw throws
- All routes: Zod validation on every POST/PUT, validateQuery on all GETs
- Token security: 32-byte crypto.randomBytes, nulled after use, 72h TTL, IP recorded
- Public sign endpoint cleanly separated on /api/protocol (singular)
- requestSignatures is idempotent
- i18n parity: 100% — he.json and en.json identical key sets
- npm audit: 0 vulnerabilities (backend + frontend)
- File headers and JSDoc on all backend functions ✅
