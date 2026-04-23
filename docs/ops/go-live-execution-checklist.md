# EthicFlow Go-Live Execution Checklist

Use this checklist to execute production launch end-to-end.

## 1) Infrastructure (Azure baseline)

- [ ] Provision VM baseline using Terraform:
  - `cd infra/azure/terraform`
  - `cp terraform.tfvars.example terraform.tfvars`
  - `terraform init && terraform plan && terraform apply`
- [ ] Confirm inbound ports: 22, 80, 443 only.
- [ ] SSH to host and install/deploy app stack.

## 2) Domain + SSL

- [ ] Purchase/assign production domain (example: `ethics.<institution>.ac.il`).
- [ ] DNS A record points to VM public IP.
- [ ] Install Nginx + Certbot on host.
- [ ] Issue certificate:
  - `sudo certbot --nginx -d ethics.<institution>.ac.il -d api.ethics.<institution>.ac.il`
- [ ] Verify HTTPS on both frontend and API domains.

## 3) Secrets + Production Env

- [ ] Generate strong secrets:
  - `pwsh ./ops/scripts/generate-prod-secrets.ps1 -FrontendUrl "https://ethics.<institution>.ac.il"`
- [ ] Fill `.env` from `.env.prod.example`.
- [ ] Store secrets in cloud secret manager (do not keep plaintext in git).

## 4) Microsoft Integrations (SSO + Calendar + Mail)

- [ ] Create Azure app registrations and permissions:
  - `pwsh ./ops/scripts/setup-microsoft-integrations.ps1 -TenantId "<tenant-id>" -BaseUrl "https://ethics.<institution>.ac.il" -OrganizerEmail "ethics@<institution>.ac.il"`
- [ ] Verify Graph admin consent granted for all created apps.
- [ ] Paste produced env values into production secret store.

## 5) Google Personal Calendar OAuth

- [ ] Enable Google Calendar API in target project:
  - `pwsh ./ops/scripts/setup-google-personal-calendar.ps1 -ProjectId "<gcp-project-id>" -BaseUrl "https://ethics.<institution>.ac.il"`
- [ ] Complete OAuth consent + Web Client in Google Console.
- [ ] Add generated Google OAuth credentials to `.env` / secret store.

## 6) Database Bootstrap

- [ ] Run migrations + seed + admin password rotation:
  - `cd backend`
  - `ADMIN_EMAIL=admin@<institution>.ac.il ADMIN_PASSWORD="<strong-password>" npm run bootstrap:prod`
- [ ] Verify admin login with rotated password.

## 7) Repository Hygiene + Quality Gates

- [ ] Remove root `tmp_*.*` artifacts from release branch.
- [ ] Ensure Playwright artifacts are ignored.
- [ ] Run all required checks:
  - `cd backend && npm test`
  - `cd backend && npx prisma validate`
  - `cd frontend && npm run lint && npm run build`
  - `cd backend && npm audit --audit-level=high`
  - `cd frontend && npm audit --audit-level=high`
  - `cd frontend && npx playwright test`

## 8) Launch Smoke

- [ ] Microsoft SSO smoke:
  - Login success
  - One-time exchange works once
  - Replay fails
  - Expired exchange fails
- [ ] Personal calendar smoke:
  - Connect Google calendar from `/settings`
  - Create meeting and verify calendar event
  - Repeat for Microsoft personal calendar
  - Disconnect and verify sync disabled

## 9) Backup + Rollback Drill

- [ ] DB backup and restore drill in clone environment.
- [ ] Runtime rollback drill using previous image revision.
- [ ] Capture evidence in `docs/ops/drills/`.

## 10) Launch Decision

- [ ] Decide placeholder screens (`Calendar`, `Diff`) handling:
  - Defer to post-launch sprint (recommended), or
  - Block launch and complete before go-live.
- [ ] Product + Engineering + QA sign-off complete.
