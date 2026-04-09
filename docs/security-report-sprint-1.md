# 🔒 Security Audit Report — Sprint 1 — 2026-03-30

## Executive Summary
- **Tests performed:** 38
- **Critical vulnerabilities:** 0
- **High:** 3 (all fixed in-place)
- **Medium:** 5 (2 deferred to Sprint 2, 3 informational)
- **Low / Info:** 4
- **Overall risk level:** 🟢 Low (after fixes applied)

---

## 🟠 High Vulnerabilities — All Fixed During Audit

### H1 — Timing Attack: Email Enumeration via Login Response Time
| Field | Detail |
|-------|--------|
| **OWASP** | A07: Identification and Authentication Failures |
| **File** | `backend/src/controllers/auth.controller.js:94-99` |
| **Verified** | ✅ Confirmed: 701ms (valid email) vs 144ms (missing email) — 560ms gap |
| **Impact** | Attacker can enumerate all valid email addresses by measuring response time |
| **Root cause** | `user ? await bcrypt.compare(...) : false` — skips bcrypt for missing users |
| **Fix applied** | Always runs bcrypt with `DUMMY_BCRYPT_HASH` fallback — both paths now 740-780ms ✅ |

**Before:**
```js
const validPassword = user ? await bcrypt.compare(password, user.passwordHash ?? '') : false
```
**After:**
```js
// Always run bcrypt — constant-time, prevents email enumeration
const DUMMY_BCRYPT_HASH = '$2b$12$Z8nII1EDprDhFMZYH2.BVOhjlIjGBtStf/OgyisITv/gZJaXF6Y8y'
const validPassword = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_BCRYPT_HASH)
```

---

### H2 — No Rate Limiting on `POST /api/auth/forgot-password`
| Field | Detail |
|-------|--------|
| **OWASP** | A07: Authentication Failures / A04: Insecure Design |
| **File** | `backend/src/routes/auth.routes.js` |
| **Verified** | ✅ Confirmed: 6 consecutive requests all returned HTTP 200 |
| **Impact** | Attacker can flood victim's inbox via email bombing (100 emails/min via general limiter) |
| **Fix applied** | Added `forgotPasswordLimiter` (5 requests / 15 min per IP) ✅ |

---

### H3 — No Rate Limiting on `POST /api/auth/register`
| Field | Detail |
|-------|--------|
| **OWASP** | A04: Insecure Design |
| **File** | `backend/src/routes/auth.routes.js` |
| **Impact** | Account creation spam — up to 100 fake accounts/min via general limiter |
| **Fix applied** | Added `registerLimiter` (10 registrations / hour per IP) ✅ |

---

## 🟡 Medium Vulnerabilities

### M1 — nodemailer 3× HIGH CVEs (CVE dormant — console provider only)
| Field | Detail |
|-------|--------|
| **OWASP** | A06: Vulnerable and Outdated Components |
| **CVEs** | GHSA-mm7p-fcc7-pg87 (domain misrouting), GHSA-rcmh-qjqh-p98v (DoS), GHSA-c7w3-x93f-qmm8 (SMTP injection) |
| **Current risk** | LOW — only `console` provider is active; SMTP code is not called |
| **Becomes HIGH when** | SMTP provider is enabled in Sprint 2 |
| **Remediation** | Run `npm install nodemailer@latest` before enabling SMTP in Sprint 2. Breaking change in v8.x — review API changes. |

### M2 — node-tar 6× HIGH CVEs (devDependency of Prisma)
| Field | Detail |
|-------|--------|
| **OWASP** | A06: Vulnerable and Outdated Components |
| **Path** | `prisma` → `@mapbox/node-pre-gyp` → `tar` ≤7.5.10 |
| **Current risk** | LOW — `tar` is only used during `npm install` (build time), not at runtime |
| **Remediation** | `npm audit fix` resolves this without breaking changes |

### M3 — No Password Complexity Policy (beyond minimum length)
| Field | Detail |
|-------|--------|
| **OWASP** | A07: Authentication Failures |
| **File** | `backend/src/routes/auth.routes.js:22` |
| **Current** | `z.string().min(8)` — accepts "aaaaaaaa", "12345678", etc. |
| **Remediation** | Add in Sprint 2: `.regex(/[A-Z]/).regex(/[0-9]/).max(128)` or use zxcvbn strength check |

### M4 — JSON Body Limit 10MB on All Routes
| Field | Detail |
|-------|--------|
| **OWASP** | A04: Insecure Design (DoS vector) |
| **File** | `backend/src/index.js:34` |
| **Impact** | Attacker can send 10MB JSON payloads to any endpoint, consuming memory per request |
| **Remediation** | Reduce to `1kb` for auth routes; keep 10MB only for file upload routes (Sprint 2) |

### M5 — CSP `style-src 'unsafe-inline'` (Helmet default)
| Field | Detail |
|-------|--------|
| **OWASP** | A05: Security Misconfiguration |
| **File** | `backend/src/index.js:25` (helmet defaults) |
| **Impact** | CSS injection possible if user-controlled content is ever reflected in HTML |
| **Remediation** | Override helmet's CSP with explicit `style-src` nonces or hash-based SRI in Sprint 2 |

---

## 🔵 Low / Informational

### L1 — `x-forwarded-for` IP can be spoofed
| Field | Detail |
|-------|--------|
| **File** | `backend/src/middleware/audit.js:15-20` |
| **Impact** | In dev (no proxy), clients can spoof their IP in audit logs via `X-Forwarded-For` header |
| **Remediation** | Set `app.set('trust proxy', 1)` when deployed behind a reverse proxy (nginx/AWS ALB) |

### L2 — Seed users have 6-character passwords (below registration policy)
| Field | Detail |
|-------|--------|
| **File** | `backend/prisma/seed.js` |
| **Impact** | Dev seed bypasses Zod validation — users exist with password "123456" (weak) |
| **Remediation** | Document that seed is dev-only. Production setup wizard (`setup.sh`) should prompt for real passwords. |

### L3 — No JWT refresh token endpoint
| Field | Detail |
|-------|--------|
| **Impact** | Token expires in 8h with no silent renewal — users get logged out mid-session |
| **Remediation** | Add `POST /api/auth/refresh` with `refreshToken` (7d) in Sprint 2 |

### L4 — Israeli Privacy Protection Act (PPA) / GDPR compliance gaps
| Field | Detail |
|-------|--------|
| **Impact** | No right-to-erasure endpoint, no data retention policy, no consent logging |
| **Remediation** | Implement in Sprint 3 (Legal & Compliance module): `DELETE /api/users/me`, audit log retention policy, consent timestamps on user records |

---

## ✅ Security Controls Verified Working

| Control | Status | Evidence |
|---------|--------|----------|
| JWT authentication on all protected routes | ✅ | No token → 401, wrong token → 401 |
| bcrypt 12 rounds for password hashing | ✅ | `authConfig.bcryptRounds = 12`, response time ~600ms |
| `passwordHash` never returned in API responses | ✅ | `safeUser()` strips all sensitive fields |
| Zod validation on all endpoints | ✅ | SQL injection attempts → 400 VALIDATION_ERROR |
| Prisma ORM — no raw SQL | ✅ | All DB access via Prisma client |
| Login rate limiting: 5 attempts / 15 min | ✅ | 6th attempt → HTTP 429 |
| No user enumeration via error message | ✅ | Same `INVALID_CREDENTIALS` for both cases |
| No user enumeration via timing (after fix) | ✅ | 742ms vs 779ms — within 40ms of each other |
| Reset token: SHA-256 hashed in DB, 1h expiry | ✅ | `crypto.createHash('sha256')`, `+60*60*1000` |
| CORS restricted to known origin | ✅ | `evil-site.com` → no CORS headers returned |
| Helmet security headers | ✅ | CSP, X-Frame, X-Content-Type-Options present |
| `.env` excluded from git | ✅ | Only `.env.example` in git history |
| JWT stored in memory (not localStorage) | ✅ | `api.js` uses module-level `_token` variable |
| Sensitive actions logged to audit table | ✅ | register, login, reset-password → audit logs |
| Invalid JSON → 400 not 500 | ✅ | Fixed in QA phase (SyntaxError handler) |

---

## 📊 OWASP Top 10 Coverage

| # | Category | Status | Notes |
|---|----------|--------|-------|
| A01 | Broken Access Control | ✅ | RBAC middleware, role-filtered nav, ProtectedRoute |
| A02 | Cryptographic Failures | ✅ | bcrypt 12, SHA-256 tokens, HTTPS recommended for prod |
| A03 | Injection | ✅ | Zod validation, Prisma ORM, no raw SQL |
| A04 | Insecure Design | ⚠️ | Rate limiting added; body limit issue noted (M4) |
| A05 | Security Misconfiguration | ⚠️ | Helmet present; CSP `unsafe-inline` noted (M5) |
| A06 | Vulnerable Components | ⚠️ | nodemailer + tar HIGH CVEs (dormant for now) |
| A07 | Auth Failures | ✅ | Timing attack fixed; rate limits on all auth routes |
| A08 | Data Integrity Failures | ✅ | Audit logs, bcrypt, SHA-256 token hashing |
| A09 | Logging & Monitoring | ✅ | Morgan + audit table; console errors for failures |
| A10 | Server-Side Request Forgery | ✅ | No user-controlled URL fetching in Sprint 1 |

---

## Fixes Applied (3 security fixes)

1. **`auth.controller.js`** — Constant-time login: always run bcrypt even for missing users
2. **`rateLimit.js`** — Added `forgotPasswordLimiter` (5/15min) and `registerLimiter` (10/hr)
3. **`auth.routes.js`** — Applied new limiters to `/register` and `/forgot-password`

## Recommendation

✅ **Approved for release** — No critical or high vulnerabilities remaining. Medium items (nodemailer, tar CVEs, password policy, body limit) to be addressed in Sprint 2 before SMTP is enabled.

**Before enabling SMTP in Sprint 2:** `npm install nodemailer@latest` is mandatory.
