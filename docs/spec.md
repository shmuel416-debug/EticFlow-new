# EthicFlow — Specification Summary

## System Purpose
Digital platform replacing manual (email/Excel) ethics approval process. Manages full lifecycle: submission → review → committee → approval → signed PDF.

## 5 Roles (RBAC)
| Role | Key Actions |
|------|-------------|
| Researcher | Submit, edit, track status, continue research |
| Secretary | Triage, assign reviewer, Form Builder, meetings, protocols, SLA |
| Reviewer | Review (split screen), inline comments, AI insights, sign protocols |
| Chairman | Control dashboard, final approval, generate signed PDF |
| Admin | User management, audit log, impersonation, institution settings |

## 16 Database Tables
**Core (9):** users, submissions, form_configs, submission_versions, comments, sla_tracking, ai_analyses, audit_logs, institution_settings
**Meetings (3):** meetings, meeting_agenda_items, meeting_attendees
**Protocols (2):** protocols, protocol_signatures
**Documents (1):** documents ← NEW
**System (1):** notifications

## 27 Screens
- Auth: 2 (Login, ForgotPassword)
- Researcher: 5 (Dashboard, Submit, Edit, Continue, Status)
- Secretary: 12 (Dashboard, Triage, FormBuilder, FormLibrary, Preview, SLA, Meetings, Calendar, Protocol Editor, Signatures, Archive, Stats)
- Reviewer: 4 (SplitScreen, MyRequests, Diff, SignProtocol)
- Chairman: 2 (ControlDashboard, Approve+PDF)
- Admin: 4 (Users, AuditLog, Impersonate, Settings)

## Submission Statuses (Implemented Model)
DRAFT → SUBMITTED → IN_TRIAGE → ASSIGNED → IN_REVIEW → PENDING_REVISION → APPROVED/REJECTED/WITHDRAWN/CONTINUED

Notes:
- `ASSIGNED` represents reviewer assignment after triage.
- `PENDING_REVISION` represents reviewer/chairman request to revise.
- `WITHDRAWN` and `CONTINUED` are supported by backend and database enums.

## SLA Rules
- Triage: 3 business days
- Review: 14 business days
- Researcher fix: 30 calendar days (then freeze)
- Chairman approval: 5 business days
- Traffic light: 🟢 on time | 🟡 48h warning | 🔴 breached → escalation

## AI Module (Gemini, pluggable)
- Pre-check: 7 protocol sections, track consistency
- For committee: executive summary (Hebrew), sensitivity flags (modesty, Shabbat, minors, medical)
- Advisory only — never blocks or decides

## Pluggable Services (swap via .env)
| Service | Dev | Prod Options |
|---------|-----|-------------|
| AI | mock | gemini / openai / azure_openai |
| Email | console (prints to terminal) | SMTP / Microsoft Graph / Gmail API |
| Storage | local (./uploads) | S3 / Azure Blob / GCS |
| Calendar | internal (built-in) | Microsoft Outlook / Google Calendar |
| Auth | JWT standalone | JWT + optional SSO (Entra/Google) |

## Authentication Model (SSO-Ready)
Users table ALWAYS exists — even with SSO. Microsoft/Google handles authentication (who are you?), our system handles authorization (what can you do?).

| Field | Standalone | With SSO | Notes |
|-------|-----------|----------|-------|
| id | UUID (ours) | UUID (ours) | Always internal ID |
| email | from registration | from SSO provider | Unique key |
| password_hash | bcrypt hash | **NULL** | Not needed with SSO |
| full_name | from registration | synced from provider | Can override locally |
| role | set by admin | set by admin | **Only we know this** |
| department | set by admin | synced or manual | |
| auth_provider | "local" | "microsoft" / "google" | How user logs in |
| external_id | NULL | Provider Object ID | For sync |

Login flow with SSO:
1. User clicks "Login with Microsoft" → redirected to Microsoft
2. Microsoft confirms identity → returns to our app with token
3. Our app checks: does this email exist in users table?
4. YES → pull role, create our JWT | NO → reject (or auto-create as RESEARCHER)
5. From here on: same as standalone (our JWT, our RBAC)

Mixed mode: same institution can have SSO users + local users (external researchers without institutional account)

## Document Storage
Two categories:
| Type | Who Creates | Stored Where | Examples |
|------|------------|--------------|---------|
| **Uploaded** | Researcher | uploads/submissions/{subId}/ | Protocol, GCP cert, consent form, questionnaire |
| **Generated** | System | generated/{type}/{id}/ | Approval letter PDF, signed protocol PDF, Excel report |

Rules:
- Max 20MB per file, 50MB total per submission
- Allowed: PDF, DOC, DOCX, JPG, PNG, XLSX
- Magic bytes validation (not just extension)
- Generated docs are **immutable** (never modified after creation)
- All files tracked in `documents` DB table with metadata
- DEV: saved to local ./uploads/ folder
- PROD: S3/Azure Blob/GCS — swap via STORAGE_PROVIDER env var

## Email System (18 automated/manual emails)
| Category | Emails | Trigger |
|----------|--------|---------|
| Auth (3) | Reset password, New user, Password changed | User action |
| Submissions (7) | Submitted, Assigned, Revision needed, Version updated, Approved+PDF, Rejected, Frozen | Status change |
| SLA (3) | Yellow warning (48h), Red breach, Escalation | Cron midnight |
| Meetings (3) | Invitation, Reminder (24h), Summary | Secretary / Cron |
| Protocols (2) | Sign request, Sign reminder (48h) | Secretary / Cron |

## Calendar Integration (optional)
- Default: internal calendar (built-in, no external dependency)
- Optional: sync to Microsoft Outlook / Google Calendar
- When enabled: creating a meeting also creates calendar event for all attendees
- One-directional: system → calendar (not calendar → system)

## i18n (Bilingual)
- Hebrew (default, RTL) + English (LTR)
- react-i18next — all UI text via t('key'), never hardcoded
- Language switcher in header, persisted in localStorage
- Auto dir switch: Hebrew = RTL, English = LTR
- Dates, numbers formatted per locale

## Responsive Design
- Mobile-first (all 27 screens work on mobile + desktop)
- Tailwind breakpoints: default = mobile, md: = tablet, lg: = desktop
- Sidebar: drawer on mobile, fixed on desktop
- Tables: card layout on mobile, table on desktop
