# 🧪 QA Report — Sprint 3 Pre-Sprint Audit — 2026-04-09

> **Scope:** Full audit of all pages and API endpoints completed in Sprint 1 + Sprint 2.
> Triggered by: user reported "Coming in Sprint 2" text on live screens after Sprint 2 completed.

---

## Test Summary

| Category | Passed | Failed | Notes |
|----------|--------|--------|-------|
| Frontend build | ✅ | — | Clean build, 138 modules |
| Backend health | ✅ | — | DB connected |
| Lint (frontend) | ❌ | 4 errors, 5 warnings | See BUG-005, BUG-006 |
| Lint (backend) | ❌ | no lint script | Not configured |
| Unit tests (backend) | ❌ | jest not installed | No test coverage |
| API — Auth endpoints | ✅ | — | Login, /me, forgot-password work |
| API — Forms endpoints | ✅ | — | CRUD works for UUID IDs |
| API — Submissions endpoints | ⚠️ | 1 critical | BUG-001: seed form ID not a UUID |
| i18n keys parity | ✅ | — | 258 keys, HE == EN |
| Hardcoded strings | ⚠️ | 1 | BUG-007: hardcoded Hebrew aria-label |
| Security — SQL injection | ✅ | — | Blocked by Zod email validation |
| Security — XSS (stored) | ⚠️ | 1 | BUG-008: XSS stored in form name |
| Security — npm audit | ❌ | 3 vulns | BUG-009: Vite critical+high CVEs |
| Placeholder text | ❌ | 2 issues | BUG-002, BUG-003 |
| Reset password route | ❌ | 1 critical | BUG-004: page missing from router |

---

## 🔴 Bugs — Critical (blocks normal usage)

### BUG-001 — Researcher cannot submit a form (seed data UUID mismatch)
| Field | Value |
|-------|-------|
| **File** | `backend/src/routes/submissions.routes.js:26` |
| **Severity** | 🔴 Critical |
| **Steps** | 1. Login as researcher → 2. Go to /submissions/new → 3. Fill form → 4. Click Submit |
| **Expected** | Submission created with applicationId ETH-YYYY-NNN |
| **Actual** | `VALIDATION_ERROR: Invalid form ID` — Zod rejects `seed-form-v1` (not a UUID) |
| **Root cause** | `formConfigId: z.string().uuid()` — but seed form has ID `seed-form-v1` (not a UUID). Prisma allows any string @id, so this was valid at DB level but rejected by API validation. |
| **Fix** | Change `z.string().uuid('Invalid form ID')` → `z.string().min(1, 'Invalid form ID')` |

---

### BUG-004 — Reset Password page missing from frontend router
| Field | Value |
|-------|-------|
| **File** | `frontend/src/App.jsx` |
| **Severity** | 🔴 Critical |
| **Steps** | 1. Go to /forgot-password → 2. Enter email → 3. Click reset link in console email → 4. Navigate to /reset-password?token=xxx |
| **Expected** | Reset password form appears |
| **Actual** | Redirected to /login (catch-all fallback) — page does not exist in router |
| **Root cause** | `ResetPasswordPage.jsx` component was never created. App.jsx comment mentions `/reset-password` but route is not registered. |
| **Fix** | Create `frontend/src/pages/auth/ResetPasswordPage.jsx` and add route `<Route path="/reset-password" element={<ResetPasswordPage />} />` to App.jsx |

---

## 🟠 Bugs — High (visible to user, degrades experience)

### BUG-002 — "Coming in Sprint 2" text still showing (Sprint 2 is done)
| Field | Value |
|-------|-------|
| **Files** | `frontend/src/locales/he.json:157`, `frontend/src/locales/en.json:157` |
| **Severity** | 🟠 High |
| **Visible on** | /submissions, /meetings, /settings, /users, /reports — all PlaceholderPage routes |
| **Actual text** | Hebrew: `"עמוד זה יפותח ב-Sprint 2"` / English: `"This page will be built in Sprint 2"` |
| **Fix** | Update translation: `"comingSoon": "עמוד זה יפותח בקרוב"` / `"This page is coming soon"` |

---

### BUG-003 — Dashboard cards show "Coming in Sprint 2" (Secretary, Reviewer, Chairman, Admin)
| Field | Value |
|-------|-------|
| **Files** | `frontend/src/pages/dashboards/SecretaryDashboard.jsx:28`, `ReviewerDashboard.jsx:27`, `ChairmanDashboard.jsx:27`, `AdminDashboard.jsx:27` |
| **Severity** | 🟠 High |
| **Visible on** | /dashboard for any role other than RESEARCHER |
| **Actual** | Large card with 🚧 and "עמוד זה יפותח ב-Sprint 2" |
| **Fix** | Covered by BUG-002 fix (same translation key). No code change needed beyond translation update. |

---

### BUG-008 — Stored XSS: form name not sanitized before DB storage
| Field | Value |
|-------|-------|
| **File** | `backend/src/controllers/forms.controller.js` |
| **Severity** | 🟠 High |
| **Steps** | POST /api/forms with `"name": "<script>alert(1)</script>"` → stored as-is → rendered in FormLibraryPage without encoding |
| **Actual** | `<script>alert(1)</script>` stored and returned from API |
| **Note** | React escapes HTML in JSX by default so XSS is not currently exploitable. However it IS exploitable if any `dangerouslySetInnerHTML` is ever added, or in PDF generation. Should still be sanitized at input. |
| **Fix** | Add DOMPurify or basic strip on `name`/`nameEn` fields in controller before DB write, OR add Zod `.transform(s => s.replace(/<[^>]*>/g, ''))` in schema. |

---

## 🟡 Bugs — Medium (code quality / standards violations)

### BUG-005 — Lint error: unused variable `user` in AppLayout
| Field | Value |
|-------|-------|
| **File** | `frontend/src/components/layout/AppLayout.jsx:19` |
| **Error** | `'user' is assigned a value but never used` |
| **Fix** | Remove `user` from destructuring: `const { t } = useTranslation()` (remove `const { user } = useAuth()` if truly unused) |

---

### BUG-006 — Lint error: setState inside useEffect in AuthContext
| Field | Value |
|-------|-------|
| **File** | `frontend/src/context/AuthContext.jsx:48` |
| **Error** | `Avoid calling setState() directly within an effect` |
| **Fix** | Wrap in `setTimeout(() => setLoading(false), 0)` or restructure effect to avoid sync setState |

---

### BUG-007 — Hardcoded Hebrew aria-label in FormBuilderPage
| Field | Value |
|-------|-------|
| **File** | `frontend/src/pages/secretary/FormBuilderPage.jsx:67` |
| **Issue** | `aria-label="סגור שגיאה"` — hardcoded Hebrew, not using `t()` |
| **Fix** | Replace with `aria-label={t('secretary.formBuilder.closeError')}` and add translation key |

---

### BUG-009 — Vite security vulnerabilities (dev dependency)
| Field | Value |
|-------|-------|
| **Severity** | 🟡 Medium (dev only — Vite is not in production bundle) |
| **CVEs** | GHSA-4w7w-66w2-5vf9 (Path Traversal), GHSA-v2wj-q39q-566r (fs.deny bypass), GHSA-p9ff-h696-f583 (Arbitrary File Read) |
| **Fix** | `cd frontend && npm audit fix` |

---

### BUG-010 — Backend has no test runner (jest missing)
| Field | Value |
|-------|-------|
| **File** | `backend/package.json` |
| **Issue** | `npm test` fails: `Cannot find module jest`. No unit tests exist. |
| **Fix** | `cd backend && npm install --save-dev jest` or document that tests are integration-only |

---

## 📱 Responsive Status

| Page | Mobile (375px) | Tablet (768px) | Desktop (1280px) |
|------|---------------|----------------|-----------------|
| Login | ✅ | ✅ | ✅ |
| Forgot Password | ✅ | ✅ | ✅ |
| Dashboard (all roles) | ✅ | ✅ | ✅ |
| Form Builder | ✅ | ✅ | ✅ |
| Form Library | ✅ | ✅ | ✅ |
| Form Preview | ✅ | ✅ | ✅ |
| Submit Page | ✅ | ✅ | ✅ |
| Placeholder pages | ✅ | ✅ | ✅ |

---

## 🌐 i18n Status

| Check | Status |
|-------|--------|
| HE keys == EN keys (258 each) | ✅ |
| No hardcoded Hebrew in JSX (except BUG-007) | ⚠️ 1 issue |
| RTL/LTR direction switch | ✅ |
| Language toggle in login | ✅ |

---

## 🔐 Auth & Security

| Check | Status |
|-------|--------|
| No token → 401 | ✅ |
| Wrong role → 403 | ✅ |
| Invalid JSON → 400 (not 500) | ✅ |
| SQL injection in login blocked | ✅ |
| Stored XSS in form name | ⚠️ BUG-008 |
| JWT secret from env | ✅ |
| Rate limiting on login | ✅ |
| Vite CVEs (dev only) | ⚠️ BUG-009 |

---

## API Endpoint Coverage

| Endpoint | Auth | Roles | Validation | Works |
|----------|------|-------|-----------|-------|
| POST /api/auth/login | — | — | ✅ | ✅ |
| GET /api/auth/me | ✅ | — | — | ✅ |
| POST /api/auth/forgot-password | — | — | ✅ | ✅ |
| POST /api/auth/reset-password | — | — | ✅ | ✅ |
| GET /api/forms | ✅ | SEC/ADMIN | — | ✅ |
| GET /api/forms/active | ✅ | all | — | ✅ |
| GET /api/forms/:id | ✅ | SEC/ADMIN | — | ✅ |
| POST /api/forms | ✅ | SEC/ADMIN | ✅ | ✅ |
| PUT /api/forms/:id | ✅ | SEC/ADMIN | ✅ | ✅ |
| POST /api/forms/:id/publish | ✅ | SEC/ADMIN | — | ✅ |
| POST /api/forms/:id/archive | ✅ | SEC/ADMIN | — | ✅ |
| POST /api/forms/:id/restore | ✅ | SEC/ADMIN | — | ✅ |
| GET /api/submissions | ✅ | all | — | ✅ |
| GET /api/submissions/:id | ✅ | all | — | ✅ |
| POST /api/submissions | ✅ | RESEARCHER | ⚠️ BUG-001 | ❌ |
| PUT /api/submissions/:id | ✅ | RESEARCHER | ✅ | ✅ |

---

## Fix Priority Plan

| Priority | Bug | Effort | Fix |
|----------|-----|--------|-----|
| 🔴 P1 | BUG-001 — formConfigId UUID | 2 min | Change `z.string().uuid()` → `z.string().min(1)` in submissions.routes.js |
| 🔴 P1 | BUG-004 — ResetPassword page missing | 30 min | Create ResetPasswordPage.jsx + add route |
| 🟠 P2 | BUG-002/003 — "Sprint 2" text | 1 min | Update 2 translation keys in he.json + en.json |
| 🟠 P2 | BUG-008 — Stored XSS | 5 min | Strip HTML tags in Zod schema for name/nameEn |
| 🟡 P3 | BUG-005 — unused `user` var | 1 min | Remove from AppLayout destructure |
| 🟡 P3 | BUG-006 — setState in effect | 5 min | Fix AuthContext useEffect |
| 🟡 P3 | BUG-007 — hardcoded aria-label | 3 min | Replace with t() key |
| 🟡 P3 | BUG-009 — Vite CVEs | 1 min | `npm audit fix` |
| 🔵 P4 | BUG-010 — no jest | 10 min | `npm install --save-dev jest` |

---

## Recommendation

❌ **Not ready for Sprint 3 development on top of current base.**

Must fix P1 bugs before starting Sprint 3 tasks:
- BUG-001 blocks the core researcher workflow
- BUG-004 means forgot-password is a dead-end

P2+P3 bugs should be fixed in the same commit (quick wins).
