# EthicFlow Privacy Baseline (ROPA + Registry)

## Purpose

This document provides a minimum privacy baseline for production usage in Israel, including:

- Records of Processing Activities (ROPA)
- Privacy database registration readiness checklist
- Data-subject rights process (access/erasure)

## ROPA Baseline

| Processing Activity | Data Subjects | Data Types | Legal Basis | Retention | Recipients |
|---|---|---|---|---|---|
| Account management | Researchers, committee staff | Name, email, phone, role, auth metadata | Contract / Legitimate interest | Active account + 7 years audit trail | Internal admins |
| Submission handling | Researchers | Submission forms, attachments, comments, decisions | Legal obligation / Public interest research governance | Per institutional policy | Ethics committee roles |
| Notifications | Researchers, staff | Notification metadata and timestamps | Legitimate interest | 24 months | Internal app users |
| Audit logging | All authenticated users | User IDs, actions, IP/user-agent | Legal obligation / Security | 7 years | Security/admin team |
| Privacy rights handling | Requesting users | Consent records, DSR requests | Legal obligation | 7 years | DPO / privacy officer |

## Privacy Registry Readiness (Israel)

- [ ] Confirm whether the production deployment requires privacy database registration under local law.
- [ ] Assign a data owner and DPO/privacy contact.
- [ ] Maintain this ROPA with each release.
- [ ] Keep subprocessors list and DPAs (cloud/email/calendar/AI vendors).
- [ ] Document cross-border transfers and safeguards.

## Operational Process

1. User submits ACCESS/ERASURE request in-app (`/api/privacy/request`).
2. Privacy officer reviews request and marks status in back-office workflow.
3. ACCESS requests: provide export from `/api/privacy/export`.
4. ERASURE requests: perform legal review, apply deletions where allowed, record resolution.
5. Keep evidence in audit logs and ticketing system.
