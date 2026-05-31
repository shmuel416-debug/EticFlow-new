# Ethic-Net Go-Live Execution Checklist

Use this checklist to execute production launch end-to-end.

## 1) Infrastructure (Azure App Service baseline)

- [ ] Provision baseline with Bicep:
  - `cd infra/azure/appservice`
  - `cp parameters.example.json parameters.prod.json`
  - `az group create --name "rg-ethic-net-prod" --location "westeurope"`
  - `az deployment group create --resource-group "rg-ethic-net-prod" --template-file "main.bicep" --parameters "@parameters.prod.json"`
- [ ] Verify resources were created:
  - App Service Plan (PremiumV3)
  - `app-ethic-net-web-*`
  - `app-ethic-net-api-*`
  - PostgreSQL Flexible Server (private networking)
  - Key Vault, ACR, Storage, App Insights
- [ ] Confirm API app has health check path `/api/health` and Always On enabled.

## 2) Domain + SSL

- [ ] Purchase/assign production domain (example: `ethics.<institution>.ac.il`).
- [ ] DNS CNAME records point to App Service hostnames:
  - `ethics.<institution>.ac.il` -> frontend app
  - `api.ethics.<institution>.ac.il` -> api app
- [ ] Complete App Service domain ownership validation (`asuid` records).
- [ ] Enable App Service Managed Certificates on both custom domains.
- [ ] Verify HTTPS on both frontend and API domains.

## 3) Secrets + Production Env (Key Vault first)

- [ ] Generate strong secrets:
  - `pwsh ./ops/scripts/generate-prod-secrets.ps1 -FrontendUrl "https://ethics.<institution>.ac.il"`
- [ ] Store generated values in Key Vault (do not keep plaintext in git).
- [ ] Configure API App Settings with Key Vault references:
  - `DATABASE_URL`
  - `JWT_SECRET_CURRENT`
  - `CALENDAR_TOKEN_ENCRYPTION_KEY`
  - Microsoft client secrets
- [ ] Set non-secret App Settings (`AUTH_PROVIDER`, `EMAIL_PROVIDER`, `CALENDAR_PROVIDER`, `FRONTEND_URL`, `MICROSOFT_*_TENANT_ID`).

## 4) Microsoft Integrations (SSO + Calendar + Mail)

- [ ] Create Azure app registrations and permissions:
  - `pwsh ./ops/scripts/setup-microsoft-integrations.ps1 -TenantId "<tenant-id>" -BaseUrl "https://api.ethics.<institution>.ac.il" -OrganizerEmail "ethics@<institution>.ac.il" -FrontendLogoutUrl "https://ethics.<institution>.ac.il/login" -KeyVaultName "kv-ethic-net-prod"`
- [ ] Verify Graph admin consent granted for all created apps.
- [ ] Ensure SSO app is single-tenant (`AzureADMyOrg`) and callback is on API domain.
- [ ] Confirm mailbox used by `SMTP_FROM` and organizer is licensed in Microsoft 365.

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
- [ ] Verify PostgreSQL public access is disabled and private DNS resolves from API app.

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
  - `SMOKE_BASE_URL=https://api.ethics.<institution>.ac.il SMOKE_ASSERT=1 npm run smoke:sso`
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
- [ ] Runtime rollback drill using deployment slots (swap back from production to previous slot).
- [ ] Recommended automation:
  - `pwsh ./ops/scripts/run-azure-slot-rollback-drill.ps1 -ResourceGroupName "<rg>" -ApiAppName "<api-app>" -WebAppName "<web-app>" -ApiHealthUrl "https://api.ethics.<institution>.ac.il/api/health"`
- [ ] Capture evidence in `docs/ops/drills/`.

## 10) Launch Decision

- [ ] Slot strategy:
  - Deploy to `staging` slot (`auto_swap=false` in workflow)
  - Run smoke checks
  - Swap `staging` -> `production`
- [ ] Decide placeholder screens (`Calendar`, `Diff`) handling:
  - Defer to post-launch sprint (recommended), or
  - Block launch and complete before go-live.
- [ ] Product + Engineering + QA sign-off complete.
