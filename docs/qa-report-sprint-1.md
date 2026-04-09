# 🧪 QA Report — Sprint 1 — 2026-03-30

## Summary
- **Tester:** Senior QA Engineer
- **Scope:** All Sprint 1 API endpoints + frontend flows
- **Tests executed:** 23
- **Passed:** 22 | **Failed:** 1 (fixed) | **Blocked:** 0
- **Overall:** ✅ Approved (after bug fix)

---

## Backend API Tests

### Auth — Registration (`POST /api/auth/register`)

| # | Test | Expected | Result |
|---|------|----------|--------|
| 1 | Valid registration | 201 + JWT + user (no passwordHash) | ✅ Pass |
| 2 | Duplicate email | 409 CONFLICT | ✅ Pass |
| 3 | Missing email | 400 VALIDATION_ERROR | ✅ Pass |
| 4 | Password < 8 chars | 400 VALIDATION_ERROR | ✅ Pass |
| 5 | Invalid email format | 400 VALIDATION_ERROR | ✅ Pass |
| 6 | XSS in fullName | Stored as-is, React auto-escapes | ✅ Pass (React prevents XSS) |
| 7 | SQL injection in email | 400 VALIDATION_ERROR (Zod rejects) | ✅ Pass |

### Auth — Login (`POST /api/auth/login`)

| # | Test | Expected | Result |
|---|------|----------|--------|
| 8 | Valid credentials | 200 + JWT + user | ✅ Pass |
| 9 | Wrong password | 401 INVALID_CREDENTIALS | ✅ Pass |
| 10 | Non-existent email | 401 INVALID_CREDENTIALS (same msg) | ✅ Pass |
| 11 | Inactive user | 401 INVALID_CREDENTIALS | ✅ Pass |
| 12 | Rate limiting (6th attempt) | 429 RATE_LIMITED | ✅ Pass |
| 13 | **Invalid JSON body** | **500 INTERNAL_ERROR** | ❌ **Bug #1** |

### Auth — Current User (`GET /api/auth/me`)

| # | Test | Expected | Result |
|---|------|----------|--------|
| 14 | Valid token | 200 + user (no passwordHash) | ✅ Pass |
| 15 | No token | 401 UNAUTHORIZED | ✅ Pass |
| 16 | Expired/invalid token | 401 UNAUTHORIZED | ✅ Pass |

### Auth — Forgot Password (`POST /api/auth/forgot-password`)

| # | Test | Expected | Result |
|---|------|----------|--------|
| 17 | Existing email | 200 (email sent to console) | ✅ Pass |
| 18 | Non-existent email | 200 (no enumeration) | ✅ Pass |
| 19 | Invalid email format | 400 VALIDATION_ERROR | ✅ Pass |

### Auth — Reset Password (`POST /api/auth/reset-password`)

| # | Test | Expected | Result |
|---|------|----------|--------|
| 20 | Valid token + new password | 200 + password updated | ✅ Pass |
| 21 | Invalid/expired token | 400 INVALID_TOKEN | ✅ Pass |
| 22 | Password < 8 chars | 400 VALIDATION_ERROR | ✅ Pass |

### Health Check (`GET /api/health`)

| # | Test | Expected | Result |
|---|------|----------|--------|
| 23 | Health endpoint | 200 + DB status | ✅ Pass |

---

## Bug Found and Fixed

### Bug #1 — Invalid JSON Body Returns 500 Instead of 400
**Severity:** Medium
**Endpoint:** All endpoints (any POST with malformed JSON body)
**Steps to reproduce:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{invalid json}'
# Before fix: 500 INTERNAL_ERROR
# After fix:  400 INVALID_JSON
```
**Root cause:** Express's `json()` body-parser throws a `SyntaxError` that fell through to the unknown error handler (returned 500).
**Fix applied:** Added `SyntaxError` check in `backend/src/middleware/error.js`:
```js
if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
  return res.status(400).json({ error: 'Invalid JSON body', code: 'INVALID_JSON' })
}
```

---

## Frontend Smoke Tests

| # | Flow | Result |
|---|------|--------|
| F1 | Login with valid credentials → redirect to dashboard | ✅ |
| F2 | Login with wrong password → error message displayed | ✅ |
| F3 | Language switch HE→EN → full UI translates, dir flips to LTR | ✅ |
| F4 | Language switch EN→HE → full UI translates, dir flips to RTL | ✅ |
| F5 | Navigate to `/dashboard` unauthenticated → redirect to `/login` | ✅ |
| F6 | RESEARCHER role → ResearcherDashboard shown | ✅ |
| F7 | SECRETARY role → SecretaryDashboard shown | ✅ |
| F8 | Forgot Password → always shows success (no enumeration) | ✅ |
| F9 | Mobile 375px — sidebar hidden, hamburger visible | ✅ |
| F10 | Desktop 1280px — sidebar fixed, full nav visible | ✅ |

---

## Notes

- **Rate limit during testing:** loginLimiter (5/15min) blocked tests 9–12. Workaround: wait for window or test from different IP.
- **Console email output:** Forgot-password emails print to terminal with To/Subject/body. Console provider working as designed.
- **passwordHash never exposed:** Verified across register (201), login (200), and /me (200) — none include `passwordHash` in response.
