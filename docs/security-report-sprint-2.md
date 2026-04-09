# Security Audit — Sprint 2
**Date:** 2026-04-09
**Reviewer:** Security Auditor

## Summary
| Severity | Count |
|----------|-------|
| 🔴 Critical | 0 |
| 🟡 Warning  | 5 |
| 🟢 Pass     | 18 |

---

## Findings

### 🔴 Critical (must fix before merge)

None found.

---

### 🟡 Warnings (fix in next sprint)

#### SEC-W01 — applicationId generation is race-unsafe (potential duplicate IDs)
**File:** `backend/src/controllers/submissions.controller.js` lines 37-50
**Issue:** `generateApplicationId()` reads the highest existing ID, increments, and returns — outside of any transaction lock. Under concurrent load two requests will read the same `last` record and generate duplicate `applicationId` values. If a unique DB constraint exists this causes a 500 crash; if not, IDs collide silently.
**Risk:** Data integrity, potential DoS under load.
**Recommendation:** Use a PostgreSQL `SEQUENCE` or wrap ID generation in a `SERIALIZABLE` transaction with a unique constraint that forces a retry.

#### SEC-W02 — REVIEWER role can access any submission detail by guessing an ID
**File:** `backend/src/controllers/submissions.controller.js` line 122-127
**Issue:** `roleFilter` for REVIEWER scopes to `reviewerId: user.id`. However `GET /api/submissions/:id` uses `findFirst` with the combined filter. A REVIEWER can only see their own assigned submissions — this is correct. BUT: there is no check preventing a REVIEWER from calling `GET /api/submissions` and seeing a paginated list of all submissions assigned to them (correct), then from calling `GET /api/submissions/<unassigned-id>` which will return 404 (correct behavior). The role filter is applied correctly. This is informational only — no fix needed. Logged to confirm correct review.
**Status:** No fix needed — behavior is correct. Listed for audit trail completeness.

#### SEC-W03 — No rate limiting on form mutations (POST/PUT forms, POST submissions)
**File:** `backend/src/routes/forms.routes.js`, `backend/src/routes/submissions.routes.js`
**Issue:** The global `apiLimiter` (100 req/min) applies to all `/api/*` routes, but there is no specific stricter limiter for write operations. A malicious authenticated user could flood form creation or submission creation.
**Risk:** Resource exhaustion, DB spam.
**Recommendation:** Apply a tighter `writeLimiter` (e.g., 10/min) specifically on POST/PUT routes for forms and submissions.

#### SEC-W04 — No validation of `formConfigId` UUID format in forms controller
**File:** `backend/src/controllers/forms.controller.js` lines 86-94
**Issue:** `GET /api/forms/:id` and all `/:id` routes do not validate that `:id` is a valid UUID before passing it to Prisma. Passing a malformed string (e.g., a SQL injection attempt in non-Prisma code, or a very long string) to `findUnique` will cause Prisma to throw an unhandled error.
**Risk:** Low — Prisma handles type errors gracefully, but the error message could leak internal schema details in non-production environments.
**Recommendation:** Add a Zod/regex check on route params for UUID format, or use a global param validator middleware.

#### SEC-W05 — File upload field in FormRenderer: no backend validation wired
**File:** `frontend/src/components/formRenderer/FormRenderer.jsx` lines 171-188
**Issue:** The file upload field collects files but the `onChange` handler only stores the filename string: `onChange(field.id, e.target.files?.[0]?.name || '')`. The submission `POST /api/submissions` sends `dataJson` with a filename, not an actual file binary. There is no actual file upload endpoint, no magic bytes check, no MIME type validation, and no file stored. The field is effectively a fake file picker.
**Risk:** When file uploads are implemented in a later sprint, this pattern must not be naively extended — a proper multipart endpoint with server-side validation is required.
**Recommendation:** For Sprint 3+: implement a dedicated `POST /api/submissions/:id/documents` endpoint with multer, magic bytes check, MIME whitelist, and 20MB size limit as per CLAUDE.md.

---

### ✅ Passed checks

**Zod validation on all backend inputs:**
- `POST /api/forms` — `createSchema` validates `name` (min 2), `nameEn` (min 2), `schemaJson` ✅
- `PUT /api/forms/:id` — `updateSchema` validates optional fields ✅
- `POST /api/submissions` — `createSchema` validates UUID `formConfigId`, `title`, `track` enum ✅
- `PUT /api/submissions/:id` — `updateSchema` applied ✅
- `GET /api/submissions` — `listQuerySchema` validates query params including status enum ✅
- `POST /api/forms/:id/publish` and `/archive` — no body expected, no schema needed ✅
- `POST /api/submissions/:id/continue` — no body expected, no schema needed ✅

**JWT authentication on all protected routes:**
- All forms routes use `authenticate` middleware ✅
- All submissions routes use `authenticate` middleware ✅
- `GET /api/forms/active` requires authentication (no public access) ✅

**RBAC — correct roles on each endpoint:**
- `GET /api/forms` — SECRETARY, ADMIN only ✅
- `GET /api/forms/:id` — SECRETARY, ADMIN only ✅
- `POST /api/forms` — SECRETARY, ADMIN only ✅
- `PUT /api/forms/:id` — SECRETARY, ADMIN only ✅
- `POST /api/forms/:id/publish` — SECRETARY, ADMIN only ✅
- `POST /api/forms/:id/archive` — SECRETARY, ADMIN only ✅
- `GET /api/forms/active` — all authenticated roles ✅
- `POST /api/submissions` — RESEARCHER only ✅
- `PUT /api/submissions/:id` — RESEARCHER, SECRETARY, ADMIN only ✅
- `POST /api/submissions/:id/continue` — RESEARCHER only ✅
- Frontend route protection: `/secretary/forms/*` requires SECRETARY or ADMIN in `ProtectedRoute` ✅

**No raw SQL — Prisma only:**
- All queries use Prisma `findMany`, `findFirst`, `findUnique`, `create`, `update` ✅
- No `$queryRaw` or `$executeRaw` calls found ✅

**No secrets in code:**
- No JWT secrets, API keys, or passwords hardcoded ✅
- All secrets via `process.env.*` ✅
- No `.env` file committed ✅

**Rate limiting applied:**
- Global `apiLimiter` (100 req/min) applied on all `/api/*` routes ✅
- `loginLimiter` (5/15min) on login route from Sprint 1 ✅

**Error messages don't leak internals:**
- `errorHandler` middleware returns `{ error, code }` format ✅
- Prisma errors mapped to safe messages — no stack traces to client ✅
- `AppError.notFound('Form')` returns `"Form not found"` not internal details ✅

**window.confirm() for destructive frontend actions:**
- FormLibraryPage archive: `window.confirm(t(...))` before API call ✅
- FormLibraryPage restore: `window.confirm(t(...))` before API call ✅

**CORS configured correctly:**
- Production: only `FRONTEND_URL` env var allowed ✅
- Development: only `http://localhost:5173` ✅

**Helmet middleware active:**
- `app.use(helmet())` — sets security headers (X-Content-Type-Options, X-Frame-Options, etc.) ✅

**Audit logging:**
- `form.create`, `form.update`, `form.publish`, `form.archive` audit events registered ✅
- `submission.create`, `submission.update`, `submission.continue` audit events registered ✅

**Submission ownership enforced on update:**
- `update` controller checks `isOwner || canEdit` before allowing modification ✅
- `continueSubmission` verifies `authorId === req.user.id` ✅

**Submission status protection:**
- RESEARCHER blocked from editing non-DRAFT submissions ✅
- `continueSubmission` only allowed from APPROVED status ✅
