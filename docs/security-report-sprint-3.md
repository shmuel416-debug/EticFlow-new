# Security Audit Report — Sprint 3 — 2026-04-13

### Executive Summary
- Total tests performed: 28
- Critical vulnerabilities: 0
- High: 0 | Medium: 1 (resolved in QA) | Low: 1 | Info: 2
- Overall risk level: 🟢 Low

---

### 🔴 Critical Vulnerabilities
**None found.**

---

### 🟠 High Vulnerabilities
**None found.**

---

### 🟡 Medium Vulnerabilities (resolved)

| # | OWASP | Description | Status |
|---|-------|-------------|--------|
| SEC-M01 | A03:Injection | XSS in `/submissions/:id/comments` content field — `stripHtml` missing | ✅ Fixed in QA phase |
| SEC-M02 | A03:Injection | XSS in review comments and decision notes — `stripHtml` missing | ✅ Fixed in QA phase |
| SEC-M03 | A06:Vulnerable Components | nodemailer <=8.0.4 — 4 SMTP injection CVEs | ✅ Updated to 8.0.5 in QA phase |

---

### 🔵 Low / Informational

| # | Category | Description | Recommendation |
|---|----------|-------------|----------------|
| INFO-01 | A07:Auth Failures | JWT expiry is 8h — no refresh token mechanism | Acceptable for now; add refresh tokens in Sprint 5 |
| INFO-02 | A09:Logging | No structured logging (using console.log via morgan) | Add structured logger (pino/winston) in Sprint 5 |

---

### ✅ Security Controls Verified

**Authentication:**
- JWT HS256 algorithm — no `alg:none` attack possible (returns 401) ✅
- JWT payload tampering rejected (signature verification) ✅
- Password hash never returned in API responses ✅
- bcrypt 12 rounds for all password operations ✅
- Reset tokens SHA-256 hashed in DB, expire after 1 hour ✅
- Constant-time login comparison (DUMMY_BCRYPT_HASH prevents email enumeration) ✅

**Authorization:**
- All new routes require `authenticate` middleware ✅
- RBAC enforced: researcher→FORBIDDEN on status/assign/review/decision ✅
- Reviewer ownership check: `sub.reviewerId !== req.user.id` → FORBIDDEN ✅
- Horizontal isolation: all queries scoped by `roleFilter` (authorId/reviewerId) ✅
- Audit logs have no DELETE endpoint — cannot be tampered ✅

**Rate Limiting:**
- Login: 5 attempts / 15min (attempt 6 → HTTP 429) ✅

**Input Validation:**
- All new endpoints validate with Zod before processing ✅
- XSS strip (`stripHtml`) on: title, comments, review comments, decision notes ✅
- SQL injection: Prisma parameterized queries, no raw SQL ✅
- Invalid JSON body → 400 INVALID_JSON (not 500) ✅

**Headers:**
- `X-Frame-Options: SAMEORIGIN` ✅
- `X-Content-Type-Options: nosniff` ✅
- `Content-Security-Policy` present ✅
- No `X-Powered-By` / `Server` headers ✅

**CORS:**
- Allows only `http://localhost:5173` (dev) or `FRONTEND_URL` (prod) ✅
- Rejected `Origin: https://evil-site.com` — response omits ACAO header ✅

**Error Handling:**
- No stack traces in error responses ✅
- No file paths, SQL queries, or internal IPs leaked ✅
- Generic 404/500 messages in production mode ✅

---

### 📊 OWASP Top 10 Coverage

| # | Category | Status |
|---|----------|--------|
| A01 | Broken Access Control | ✅ roleFilter + authorize middleware |
| A02 | Cryptographic Failures | ✅ bcrypt 12 rounds, SHA-256 tokens, HS256 JWT |
| A03 | Injection | ✅ Prisma + Zod + stripHtml on all inputs |
| A04 | Insecure Design | ✅ Transition matrix server-enforced, reviewer ownership check |
| A05 | Security Misconfiguration | ✅ Helmet headers, CORS locked |
| A06 | Vulnerable Components | ✅ 0 vulnerabilities (nodemailer updated) |
| A07 | Auth Failures | ✅ Rate limiting, JWT validation, constant-time compare |
| A08 | Data Integrity Failures | ✅ Audit log immutable, Zod input validation |
| A09 | Logging & Monitoring | ⚠️ Morgan logs requests; no structured security logger |
| A10 | Server-Side Request Forgery | ✅ No SSRF vectors in Sprint 3 features |

---

### Recommendations for Next Sprint
1. Add structured logger (pino) with log levels — replace morgan for security events
2. Implement JWT refresh tokens — currently tokens are valid for 8h with no revocation
3. Add accessibility statement page (required by Israeli law)
4. Rate limit `PATCH /submissions/:id/status` — prevent status transition spam

---

### Decision
✅ **APPROVED FOR MERGE** — No critical or high vulnerabilities found.
All medium issues resolved during QA phase.
