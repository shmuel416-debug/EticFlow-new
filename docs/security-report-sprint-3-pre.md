# 🔒 Security Audit Report — Sprint 3 Pre-Sprint — 2026-04-09

## Executive Summary

| Metric | Value |
|--------|-------|
| Total tests performed | 38 |
| 🔴 Critical | 0 |
| 🟠 High | 1 |
| 🟡 Medium | 3 |
| 🔵 Low / Info | 3 |
| Overall risk level | 🟡 Medium |

**Decision: ✅ Safe to continue Sprint 3 development — no critical vulnerabilities.**  
Medium findings must be addressed before production deployment.

---

## ✅ Security Controls — Verified Working

| Control | Test | Result |
|---------|------|--------|
| JWT alg:none attack | Sent token with `"alg":"none"` | ✅ Rejected (401) |
| JWT signature tampering | Modified payload, kept header+sig | ✅ Rejected (401) |
| JWT expiry enforcement | Token with past `exp` field | ✅ Rejected (401) |
| Password hash in response | Checked login + register response | ✅ Never exposed |
| RBAC — vertical escalation | Researcher → POST /api/forms | ✅ 403 Forbidden |
| RBAC — horizontal escalation | Reviewer → PUT researcher submission | ✅ 403 Forbidden |
| Self-registration role | Register with `role: "ADMIN"` | ✅ Always RESEARCHER |
| Rate limiting — login | 6 attempts, 5th blocked | ✅ 429 on attempt 6+ |
| Rate limiting — forgot-password | 6 attempts, 5th blocked | ✅ 429 on attempt 6+ |
| Rate limiting — global API | 100 req/min threshold | ✅ Configured |
| SQL injection | `' OR '1'='1` in email field | ✅ Zod rejects |
| Object injection | `{"email":{"$gt":""}}` | ✅ Zod type-checks |
| Error info leakage | 404, invalid JSON, bad token | ✅ No stack traces, no paths |
| Security headers — CSP | Helmet default-src 'self' | ✅ Present |
| Security headers — HSTS | max-age=15552000 | ✅ Present |
| Security headers — X-Frame-Options | SAMEORIGIN | ✅ Present |
| Security headers — X-Content-Type | nosniff | ✅ Present |
| Security headers — Server | No Server header | ✅ Not exposed |
| Security headers — X-Powered-By | Not present | ✅ Not exposed |
| CORS origin lockdown | Origin: evil-site.com | ✅ Reflects localhost:5173 only |
| CORS credentials | `Access-Control-Allow-Credentials: true` | ✅ Only for trusted origin |
| Reset token — SHA-256 hashed | Code review | ✅ Never stored plain-text |
| Reset token — 1-hour expiry | Code review | ✅ `Date.now() + 60*60*1000` |
| Reset token — cleared after use | Code review | ✅ Nulled on password change |
| Bcrypt rounds | Config review | ✅ 12 rounds (strong) |
| Timing attack prevention | Dummy hash for unknown emails | ✅ Constant-time always |
| Token storage — frontend | Code review | ✅ In-memory only (not localStorage) |
| .env not committed | .gitignore check | ✅ `.env` in .gitignore |
| Frontend Vite CVEs | `npm audit fix` | ✅ 0 vulnerabilities after fix |

---

## 🟠 High Vulnerabilities

### SEC-H01 — Nodemailer: 4 High CVEs (GHSA)
| Field | Value |
|-------|-------|
| **Package** | `nodemailer ^6.9.14` (backend) |
| **CVEs** | GHSA-mm7p-fcc7-pg87, GHSA-rcmh-qjqh-p98v, GHSA-c7w3-x93f-qmm8, GHSA-vvjj-xcjg-gr5g |
| **Impact** | SMTP command injection via CRLF in envelope params; DoS via addressparser recursion; Email routing to unintended domain |
| **Affected in dev?** | Low — using `EMAIL_PROVIDER=console`, nodemailer not sending real emails |
| **Affected in prod?** | Yes — if SMTP provider configured |
| **Remediation** | `cd backend && npm install nodemailer@latest` (v8.0.5+). Check breaking changes in sendMail() call signature. |

---

## 🟡 Medium Vulnerabilities

### SEC-M01 — No password complexity policy (dictionary attacks)
| Field | Value |
|-------|-------|
| **File** | `backend/src/routes/auth.routes.js:22` |
| **Issue** | Password validation: `z.string().min(8)` only. "password1", "12345678", "aaaaaaaa" all accepted. |
| **Impact** | Dictionary/credential stuffing attacks succeed against users with weak passwords |
| **Remediation** | Add regex: `z.string().min(8).regex(/(?=.*[A-Z])(?=.*[0-9])/, 'Password must contain uppercase + number')` — or use zxcvbn score ≥ 2 |

### SEC-M02 — XSS in submission title (stored, not yet exploitable)
| Field | Value |
|-------|-------|
| **File** | `backend/src/routes/submissions.routes.js:25` |
| **Issue** | `title: z.string().min(2)` — no HTML stripping. `<script>alert(1)</script>` stored as-is. |
| **Impact** | Not currently exploitable (React JSX escapes HTML). Becomes exploitable if: PDF generation uses title directly, or any dangerouslySetInnerHTML is added. |
| **Remediation** | Add `.transform(stripHtml)` to title field (same pattern as form name fix in this sprint) |

### SEC-M03 — No maximum length on submission title / dataJson fields
| Field | Value |
|-------|-------|
| **File** | `backend/src/routes/submissions.routes.js:25,27` |
| **Issue** | Title has no `.max()`. dataJson is unbounded. A malicious user could submit a 100MB JSON blob. |
| **Impact** | Storage DoS — fills DB disk. Server may slow under large JSON parsing. |
| **Remediation** | Add `title: z.string().min(2).max(500)`. Express body limit already 10MB (`express.json({ limit: '10mb' })`), so dataJson is bounded at 10MB but should be lower (e.g., 1MB). |

---

## 🔵 Low / Informational

### SEC-L01 — Dev JWT_SECRET too short and predictable
| Field | Value |
|-------|-------|
| **File** | `backend/.env` |
| **Issue** | `JWT_SECRET=dev_jwt_secret_ethicflow_2024_not_for_production_use_only` (47 chars, dictionary words). Code validates min 32 chars. |
| **Impact** | In dev only. For production: use 64+ random bytes (`openssl rand -hex 64`). .env.example should document this requirement. |
| **Remediation** | Already labeled "not for production". Document in .env.example: `JWT_SECRET=<run: openssl rand -hex 64>` |

### SEC-L02 — tar package: 6 High CVEs (transitive dev dependency)
| Field | Value |
|-------|-------|
| **Package** | `tar` (transitive, via `@mapbox/node-pre-gyp`) |
| **Impact** | Path traversal via hardlinks/symlinks during npm install. Not exploitable at runtime. Dev-only risk. |
| **Remediation** | `npm audit fix` — but requires breaking changes. Low priority for dev environment. |

### SEC-L03 — No token revocation / blacklist
| Field | Value |
|-------|-------|
| **Issue** | After logout, the JWT is still valid until expiry (8h). No refresh token rotation. |
| **Impact** | Stolen token remains valid for up to 8 hours after logout. |
| **Remediation** | Sprint 3+: Implement Redis-based token blacklist on logout, or use short-lived access tokens (15min) + refresh tokens. |

---

## 📊 OWASP Top 10 Coverage

| # | Category | Status | Notes |
|---|----------|--------|-------|
| A01 | Broken Access Control | ✅ | RBAC enforced, no IDOR found |
| A02 | Cryptographic Failures | ✅ | bcrypt 12r, SHA-256 reset, HTTPS-ready |
| A03 | Injection | ⚠️ | SQL ✅, XSS in title ⚠️ (SEC-M02) |
| A04 | Insecure Design | ⚠️ | No password policy (SEC-M01), no token revocation (SEC-L03) |
| A05 | Security Misconfiguration | ✅ | Helmet headers, CORS locked, no stack traces |
| A06 | Vulnerable Components | ⚠️ | nodemailer 4 CVEs (SEC-H01) |
| A07 | Authentication Failures | ✅ | Rate limiting, timing attack protection, alg:none blocked |
| A08 | Data Integrity Failures | ✅ | JWT signature verified, audit log immutable via API |
| A09 | Logging & Monitoring | ✅ | Audit middleware logs all sensitive actions |
| A10 | SSRF | ✅ | No user-controlled URL fetching in current scope |

---

## Fix Plan for Sprint 3

| Priority | Finding | Effort | Sprint |
|----------|---------|--------|--------|
| 🟠 P1 | SEC-H01 — Update nodemailer | 15min | Start of S3 |
| 🟡 P2 | SEC-M02 — XSS in title (add stripHtml) | 2min | S3.0 fixes |
| 🟡 P2 | SEC-M03 — Add max length on title | 2min | S3.0 fixes |
| 🟡 P3 | SEC-M01 — Password complexity policy | 10min | S3 backend work |
| 🔵 P4 | SEC-L01 — JWT_SECRET docs in .env.example | 5min | Before prod deploy |
| 🔵 P4 | SEC-L03 — Token revocation | 2h | Sprint 4+ |
