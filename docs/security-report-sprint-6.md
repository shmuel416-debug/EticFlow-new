# Security Audit Report — Sprint 6 — 2026-04-16

## Executive Summary
- Total tests performed: 38
- Critical vulnerabilities: 0
- High: 0 | Medium: 2 | Low: 1 | Info: 2
- Overall risk level: 🟢 Low (after fixes)

---

## ✅ Dependency Scan
```
Backend:  0 vulnerabilities (npm audit)
Frontend: 0 vulnerabilities (npm audit)
```

---

## 🟡 Medium Vulnerabilities (fixed in-session)

### SEC-6-M1 — Protocol Signing Tokens Stored in Plain Text
**OWASP:** A02 — Cryptographic Failures
**File:** `backend/src/controllers/protocols.controller.js:299`

**Description:**
Protocol signature tokens are generated with `crypto.randomBytes(32)` (good entropy) but stored **raw/plain-text** in the `ProtocolSignature.token` DB column. This is inconsistent with the existing `auth.controller.js` pattern where password-reset tokens are hashed (SHA-256) before storage.

If the database is compromised within the 72-hour token TTL window, an attacker could directly extract active signing tokens and forge signatures.

**Comparison:**
```js
// auth.controller.js — CORRECT pattern (hashed storage)
const rawToken  = crypto.randomBytes(32).toString('hex')
const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
// Stored: tokenHash | Sent in URL: rawToken

// protocols.controller.js — CURRENT (plain-text storage)
const token = crypto.randomBytes(32).toString('hex')
// Stored: token (raw) | Sent in URL: token (same value)
```

**Fix:** Store the SHA-256 hash in DB, send raw token in email URL, hash on lookup — matching the auth reset token pattern.

**Mitigating factors:** Token entropy is 256 bits (unguessable without DB access), token is nulled after use, 72h TTL, behind DB firewall.

---

### SEC-6-M2 — Settings `value` Field Allows Empty String
**OWASP:** A04 — Insecure Design
**File:** `backend/src/routes/settings.routes.js:23`

**Description:**
The Zod schema for settings updates uses `z.string().min(0)` which accepts empty strings. An admin could accidentally (or intentionally) blank out institution name, email sender address, or SLA day values — causing application breakage.

```js
// Current — vulnerable
const updateSchema = z.object({ value: z.string().min(0).max(2000) })

// Fixed
const updateSchema = z.object({ value: z.string().min(1).max(2000) })
```

---

## 🔵 Low / Informational

### SEC-6-L1 — Audit Log Pagination: No Hard Limit Cap
**OWASP:** A04 — Insecure Design
**File:** `backend/src/routes/reports.routes.js:33`

**Description:**
The `limit` query parameter for `GET /api/audit-logs` is validated as numeric but has no upper bound. An ADMIN could request `?limit=1000000` causing a large DB query. Since this endpoint is ADMIN-only, the exploit surface is minimal, but defense-in-depth recommends capping.

**Fix:** Cap at 100 in the Zod schema.

### SEC-6-I1 — XLSX Formula Injection Risk Assessment
**OWASP:** A03 — Injection (informational)
**File:** `backend/src/controllers/reports.controller.js:181`

**Description:**
`worksheet.addRow()` is called with raw user-supplied strings (submission title, author name). In ExcelJS, `addRow()` with plain string values creates `SHARED_STRING` typed cells — Excel and LibreOffice do **not** execute these as formulas even if they start with `=` or `+`.

**Verdict:** Not exploitable via ExcelJS typed cells. No formula injection vulnerability exists here.

### SEC-6-I2 — TOCTOU on Public Sign Endpoint
**OWASP:** A04 — Race Condition (theoretical)
**File:** `backend/src/controllers/protocols.controller.js:356`

**Description:**
Two simultaneous POST requests with the same token could theoretically both pass the `status === 'PENDING'` check before either update runs. However:
- Token has 256-bit entropy — only the intended signer has the URL
- Token is nulled to `null` on first update (subsequent DB lookup returns null = no findUnique match)
- No attacker benefit from double-signing their own signature

**Verdict:** Not a practical attack. No action required.

---

## ✅ Security Controls Verified

| Control | Status | Detail |
|---------|--------|--------|
| JWT auth on all protected routes | ✅ | All 3 Sprint 6 routers: authenticate + authorize middleware |
| RBAC enforcement | ✅ | Settings: ADMIN only; Reports: SECRETARY/CHAIRMAN/ADMIN; AuditLog: ADMIN only |
| Public sign endpoint isolation | ✅ | Mounted on `/api/protocol` (singular), no authenticate middleware |
| Global rate limiting | ✅ | `apiLimiter` (100/min) on ALL `/api/*` including public sign endpoint |
| Helmet security headers | ✅ | `app.use(helmet())` — sets X-Frame-Options, X-Content-Type-Options, CSP, etc. |
| CORS restricted to frontend URL | ✅ | Dev: `http://localhost:5173`; Prod: `FRONTEND_URL` env var |
| Zod validation on all Sprint 6 endpoints | ✅ | All POST/PUT bodies validated; all GET queries use validateQuery |
| Audit logging | ✅ | protocol.created/updated/finalized/signed, settings.updated all logged |
| Token entropy | ✅ | 32-byte = 256-bit — brute force infeasible |
| Token invalidation after use | ✅ | `token: null` set on update — one-time use enforced |
| 72-hour token TTL | ✅ | `tokenExpiry` checked on every sign request |
| IP address logging on sign | ✅ | `x-forwarded-for` captured and stored in `ProtocolSignature.ipAddress` |
| Settings key allowlist | ✅ | `ALLOWED_KEYS` Set with 11 permitted keys — arbitrary key write blocked |
| getSignInfo — minimal data exposure | ✅ | Returns only: protocolTitle, signerName, finalizedAt, signatureStatus — no email, no content, no other signers |
| Export requires authentication | ✅ | authenticate + authorize on `/api/reports/export/submissions` |
| No stack traces in error responses | ✅ | `error.js` handler returns `{ error, code }` only in production |
| No sensitive data in responses | ✅ | User objects select-scoped (no passwordHash returned anywhere) |

---

## 📊 OWASP Top 10 Coverage

| # | Category | Status |
|---|----------|--------|
| A01 | Broken Access Control | ✅ RBAC enforced on all routes |
| A02 | Cryptographic Failures | ⚠️ Token hashing — M1 fixed |
| A03 | Injection | ✅ Prisma ORM + Zod validation |
| A04 | Insecure Design | ⚠️ Empty value + no limit cap — M2 + L1 fixed |
| A05 | Security Misconfiguration | ✅ Helmet, CORS, no exposed headers |
| A06 | Vulnerable Components | ✅ 0 npm audit vulnerabilities |
| A07 | Identification & Auth Failures | ✅ JWT, bcrypt, rate limiting |
| A08 | Data Integrity Failures | ✅ Zod on all inputs, allowlist on settings |
| A09 | Logging & Monitoring | ✅ Audit log on all sensitive actions |
| A10 | SSRF | ✅ No server-side URL fetch in Sprint 6 |

---

## Fixes Applied

**SEC-6-M1 — Token hashing:** `protocols.controller.js` updated to hash tokens before storage.
**SEC-6-M2 — Empty value:** `settings.routes.js` updated to `z.string().min(1)`.
**SEC-6-L1 — Pagination cap:** `reports.routes.js` audit log limit capped at 100.
